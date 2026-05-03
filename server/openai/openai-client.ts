/**
 * Pura AI — OpenAI client. **SERVER-ONLY.**
 *
 * This file imports `openai`, which means it pulls in Node-only
 * resources (streams, http internals, fs for some helpers) that
 * Metro cannot resolve when bundling the React Native app. It MUST
 * NOT be imported by any code under `src/`. The only legitimate
 * consumers are:
 *
 *   • `server/aiProxy.ts`          (HTTP proxy entrypoint)
 *   • `server/lib/handlers.ts`     (per-method handlers)
 *   • `metro.config.js`            (loads handlers in-process at dev)
 *   • Other files under `server/`
 *
 * The Expo client reaches OpenAI exclusively through HTTP fetch to
 * the proxy server (see `src/ai/aiGateway.ts`). The client never
 * instantiates the SDK and never sees `OPENAI_API_KEY`.
 *
 * Design rules:
 *   • Every flow that produces structured output uses Chat
 *     Completions `response_format: { type: 'json_schema', strict:
 *     true }`. The same JSON schemas the legacy Anthropic client
 *     used (defined in `src/ai/ai-contracts.ts`) are passed
 *     through after a small `oneOf → anyOf` transform — strict
 *     mode is otherwise satisfied by every existing schema.
 *   • The freeform assistant flow uses GPT-5 freeform Chat
 *     Completions and returns the model's text content.
 *   • Vision flows attach the image as a base-64 data URI in the
 *     same `messages.content` array as the text instruction.
 *   • All prompt logic lives here. UI never composes prompts.
 *   • API keys are read from `process.env.OPENAI_API_KEY` only.
 *     The constructor accepts an explicit key for testability but
 *     never logs it.
 */

import OpenAI from 'openai';
import type {
  AssistantContext,
  BarcodeLookupResult,
  BarcodeResolution,
  FaceScanAnalysis,
  LiveProductLookupResult,
  ProductIdentity,
  ProductMatchResult,
  ProgressExplanation,
  RoutineRecommendation,
  ScanPreflightResult,
  SearchSuggestionResult,
  SkinScoreExplanation,
  SupportedImageMediaType,
  JsonSchema,
} from '../../src/ai/ai-contracts';
import {
  AI_DEFAULTS,
  AI_MODELS,
  BARCODE_RESOLUTION_SCHEMA,
  FACE_SCAN_ANALYSIS_SCHEMA,
  LIVE_PRODUCT_LOOKUP_SCHEMA,
  PRODUCT_IDENTITY_SCHEMA,
  PRODUCT_MATCH_RESULT_SCHEMA,
  PROGRESS_EXPLANATION_SCHEMA,
  ROUTINE_RECOMMENDATION_SCHEMA,
  SCAN_PREFLIGHT_RESULT_SCHEMA,
  SEARCH_SUGGESTION_RESULT_SCHEMA,
  SKIN_SCORE_EXPLANATION_SCHEMA,
} from '../../src/ai/ai-contracts';

// Re-export for server consumers that previously reached these from
// the legacy Claude client path.
export type { BarcodeLookupResult, SupportedImageMediaType };

// ----------------------------------------------------------------------------
// Public types.
// ----------------------------------------------------------------------------

export interface OpenAIClientConfig {
  apiKey: string;
}

/**
 * v18.8 — typed AI error reasons. Surfaced from runStrictStructured
 * when both retry attempts fail. Lets the handler map each cause to
 * a clean HTTP status + a structured client message instead of a
 * generic 500.
 */
export type AIErrorReason =
  | 'empty_content'
  | 'length_cap'
  | 'parse_failed';

export class AIError extends Error {
  constructor(
    public reason: AIErrorReason,
    public schemaName: string,
    public finishReason: string | null = null
  ) {
    super(
      `OpenAIClient: ${reason} for ${schemaName}` +
        (finishReason ? ` (finish_reason=${finishReason})` : '')
    );
    this.name = 'AIError';
  }
}

// ----------------------------------------------------------------------------
// Schema transform — OpenAI strict-mode adjustments.
// ----------------------------------------------------------------------------

/**
 * OpenAI strict mode rejects `oneOf` at any depth and prefers
 * `anyOf`. The pre-existing JSON schemas in `ai-contracts.ts` use
 * `oneOf` for nullable-object fields (e.g. primary_concern). This
 * transform recursively rewrites `oneOf` → `anyOf` and otherwise
 * leaves the schema intact.
 *
 * We do this at runtime rather than rewriting `ai-contracts.ts` so
 * the contracts file stays a clean JSON-Schema canonical and any
 * other validator (Ajv, Zod schemas, etc.) keeps working.
 */
function toStrictSchema(input: JsonSchema): JsonSchema {
  if (Array.isArray(input)) {
    return (input as unknown as unknown[]).map((v) =>
      typeof v === 'object' && v !== null
        ? toStrictSchema(v as JsonSchema)
        : v
    ) as unknown as JsonSchema;
  }
  if (input === null || typeof input !== 'object') return input;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    const key = k === 'oneOf' ? 'anyOf' : k;
    if (Array.isArray(v)) {
      out[key] = v.map((item) =>
        typeof item === 'object' && item !== null
          ? toStrictSchema(item as JsonSchema)
          : item
      );
    } else if (typeof v === 'object' && v !== null) {
      out[key] = toStrictSchema(v as JsonSchema);
    } else {
      out[key] = v;
    }
  }
  return out as JsonSchema;
}

// ----------------------------------------------------------------------------
// OpenAIClient.
// ----------------------------------------------------------------------------

export class OpenAIClient {
  private openai: OpenAI;

  constructor(config: OpenAIClientConfig) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new Error(
        'OpenAIClient: apiKey is required and must be non-empty.'
      );
    }
    this.openai = new OpenAI({ apiKey: config.apiKey });
  }

  // --------------------------------------------------------------------------
  // Private helpers.
  // --------------------------------------------------------------------------

  /**
   * Build the user-message content array carrying an image + a
   * text instruction. Returns the array so callers may concatenate
   * additional context blocks before sending.
   */
  private buildImageUserContent(
    imageBase64: string,
    mediaType: SupportedImageMediaType,
    instruction: string
  ): OpenAI.Chat.Completions.ChatCompletionContentPart[] {
    return [
      {
        type: 'image_url',
        image_url: {
          url: `data:${mediaType};base64,${imageBase64}`,
          detail: 'auto',
        },
      },
      {
        type: 'text',
        text: instruction,
      },
    ];
  }

  /**
   * Run a strict structured-output call: one user message,
   * `response_format: json_schema (strict)`. Returns the parsed JSON
   * cast to T. Throws a typed AIError if the model returned non-JSON
   * or the content was empty.
   *
   * v18.8 — retries ONCE on empty-content failures. The model
   * occasionally returns finish_reason="length" + empty content
   * when the reasoning budget eats the output cap; on retry with
   * a doubled cap it almost always succeeds. Limits to one retry
   * to avoid runaway loops.
   */
  private async runStrictStructured<T>(params: {
    system: string;
    userContent:
      | string
      | OpenAI.Chat.Completions.ChatCompletionContentPart[];
    schemaName: string;
    schema: JsonSchema;
    model?: string;
    /** Override max output tokens; defaults to extraction default. */
    maxTokens?: number;
  }): Promise<T> {
    const baseMaxTokens =
      params.maxTokens ?? AI_DEFAULTS.extraction.max_tokens;

    const attempt = async (
      maxTokens: number,
      attemptIndex: number
    ): Promise<{ ok: true; value: T } | { ok: false; reason: AIErrorReason; finish: string | null }> => {
      const response = await this.openai.chat.completions.create({
        model: params.model ?? AI_MODELS.extraction,
        max_completion_tokens: maxTokens,
        messages: [
          { role: 'system', content: params.system },
          {
            role: 'user',
            content:
              typeof params.userContent === 'string'
                ? params.userContent
                : params.userContent,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: params.schemaName,
            strict: true,
            schema: toStrictSchema(params.schema) as Record<string, unknown>,
          },
        },
      });

      const choice = response.choices[0];
      const text = choice?.message?.content;
      const finish = choice?.finish_reason ?? null;
      if (typeof text !== 'string' || text.length === 0) {
        return {
          ok: false,
          reason:
            finish === 'length' ? 'length_cap' : 'empty_content',
          finish,
        };
      }
      try {
        return { ok: true, value: JSON.parse(text) as T };
      } catch {
        return { ok: false, reason: 'parse_failed', finish };
      }
    };

    // First attempt at the requested cap.
    const first = await attempt(baseMaxTokens, 0);
    if (first.ok) return first.value;

    // v18.8 — retry once. If the failure mode is `length_cap`
    // (reasoning ate the output budget), double the cap; otherwise
    // (likely transient empty-content), keep the same cap and just
    // try again.
    const secondCap =
      first.reason === 'length_cap'
        ? Math.min(baseMaxTokens * 2, 8192)
        : baseMaxTokens;
    const second = await attempt(secondCap, 1);
    if (second.ok) return second.value;

    // Both attempts failed — surface a typed error so handlers can
    // map it to a stable HTTP status + clean client message.
    throw new AIError(second.reason, params.schemaName, second.finish);
  }

  // --------------------------------------------------------------------------
  // 0. Scan preflight (v11.7).
  //
  // Fast vision call that runs IMMEDIATELY after capture, before
  // analyzeFaceScan. Returns a tight structured judgement on whether
  // the photo is usable for the expensive analysis pass. Saves
  // tokens on obviously bad captures and powers the smart
  // condition-aware error UI in Expo Go (where we can't truthfully
  // pre-validate before capture).
  // --------------------------------------------------------------------------

  async validateScanPreflight(params: {
    imageBase64: string;
    mediaType: SupportedImageMediaType;
  }): Promise<ScanPreflightResult> {
    const system =
      'You are the face-scan preflight validator for Pura AI. Your ' +
      'job is fast: look at the supplied photo and decide whether it ' +
      'is usable for a structured skin analysis. You return EXACTLY ' +
      'the JSON object specified by the schema. No prose.\n\n' +
      'Hard rules:\n' +
      '• face_present — true if a human face is clearly visible.\n' +
      '• full_face_visible — true only if forehead, both cheeks, and ' +
      'chin are all inside the frame. False if any of those is cut ' +
      'off at an edge.\n' +
      '• centered_enough — true if the face center is within roughly ' +
      'the middle third of both axes.\n' +
      '• lighting_ok — true if the face is evenly lit and skin ' +
      'features are readable. False if too dark, too bright, or ' +
      'heavily shadowed.\n' +
      '• blur_ok — true if facial features are sharp enough to read ' +
      'skin texture. False if the photo is motion-blurred or ' +
      'out of focus.\n' +
      '• face_box — when face_present is true, return the face ' +
      'bounding box normalised to [0, 1] over the photo width/height. ' +
      'When false, return null.\n' +
      '• reason — pick the SINGLE most-actionable failure, in this ' +
      'priority order: no_face → partial_face → too_dark → ' +
      'too_blurry → not_centered → unknown. Use "ok" only when every ' +
      'other field above is true.\n' +
      '• retry_message — one short, calm, premium sentence the user ' +
      'reads on the retry screen ("Try again with your full face ' +
      'centered in the frame."). Empty string when reason is "ok".\n' +
      '• Be conservative on lighting_ok / blur_ok: only fail when a ' +
      'human would also struggle to read the photo. The downstream ' +
      'analyzer is robust to mild conditions.';

    const userContent = this.buildImageUserContent(
      params.imageBase64,
      params.mediaType,
      'Validate this photo for a face-scan analysis and return the ' +
        'structured ScanPreflightResult.'
    );

    return this.runStrictStructured<ScanPreflightResult>({
      system,
      userContent,
      schemaName: 'scan_preflight_result',
      schema: SCAN_PREFLIGHT_RESULT_SCHEMA,
      // v18.8 — bumped 400 → 1500. The previous 400 cap repeatedly
      // hit `finish_reason="length"` because GPT-5-mini's internal
      // reasoning tokens count against the same budget as output.
      // 1500 leaves enough head-room for reasoning + the small
      // structured payload, eliminating empty-content responses
      // on this path.
      maxTokens: 1500,
    });
  }

  // --------------------------------------------------------------------------
  // 1. Face scan analysis.
  // --------------------------------------------------------------------------

  async analyzeFaceScan(params: {
    imageBase64: string;
    mediaType: SupportedImageMediaType;
    scanId: string;
    previousSummary?: string;
    userProfileSummary: string;
  }): Promise<FaceScanAnalysis> {
    const system =
      'You are the face scan analysis engine for Pura AI, a premium ' +
      'consumer skincare app. You read a single user-uploaded face ' +
      'photograph and return a structured, CONSERVATIVE skin reading.\n\n' +
      'You are not a medical device. You only describe visible cosmetic ' +
      'signals. When in doubt, surface less, never more.\n\n' +
      'Output rules:\n' +
      '• Return EXACTLY the JSON object specified by the schema.\n' +
      '• ALWAYS echo the `scan_id` value from the user message into ' +
      'the output exactly as given. Set `analyzed_at_iso` to the ' +
      'current UTC time in ISO-8601.\n' +
      '• When previous_summary is "none", set delta_vs_previous and ' +
      'delta_vs_baseline to null.\n' +
      '• score_factors must be 0..100 integers calibrated to the ' +
      'overall skin_score.value. Default toward 70-80 for a normal ' +
      'photo with no clearly visible problem on that axis.\n' +
      '\n' +
      'IMAGE-ANCHORED OVERLAY DATA (v17.0):\n' +
      'You MUST return `face_overlay` and per-finding ' +
      '`region_polygon` arrays. All coordinates are normalized 0..1 ' +
      'against the captured image dimensions (NOT against the face ' +
      'bounding box). Use top-left = (0,0), bottom-right = (1,1).\n' +
      '• face_overlay.face_box: bounding box of the face in the ' +
      'image. Tight crop, not loose. If the face takes ~60% of the ' +
      'frame width centered, the box might be roughly ' +
      '{x: 0.20, y: 0.15, width: 0.60, height: 0.70}.\n' +
      '• face_overlay.landmarks: real coordinates of the eyes (left, ' +
      'right), nose tip, mouth center, chin tip, and forehead center. ' +
      'Be accurate — these anchor the entire skin map. The ' +
      'forehead_center sits roughly halfway between the brows and ' +
      'the hairline.\n' +
      '• Each finding MUST include a `region_polygon` array of 4-12 ' +
      'normalized {x,y} points outlining where you actually OBSERVE ' +
      'this concern in the image. Trace the visible region. For ' +
      'redness across the cheeks, draw a polygon over the affected ' +
      'cheek area. For breakouts, draw a small polygon clustering ' +
      'the visible spots. The polygon does NOT have to match the ' +
      'whole face_region enum — it can be tighter.\n' +
      '• If a finding has no visually localizable region (e.g. an ' +
      'overall hydration impression), return a polygon covering the ' +
      'face area where the impression applies. Never return an empty ' +
      'array.\n' +
      '• Polygons should be CLOCKWISE order from top-left.\n' +
      '\n' +
      '• SCORE DISCIPLINE: skin_score.value should sit in 72-86 for ' +
      'an ordinary clear photo with no obvious concerns. Reserve ' +
      'scores below 65 for photos with multiple high-confidence ' +
      'visible issues. Reserve scores above 90 for photos where the ' +
      'skin reads as exceptionally clear with no visible texture, ' +
      'redness, breakouts, or marks of any kind. Do not produce ' +
      'wide swings on routine photos.\n\n' +
      'CONSERVATISM (the most important rule set):\n' +
      '• Only return a finding when the photograph SHOWS the issue. ' +
      'Do not infer from age, demographics, lighting, or generic ' +
      'expectations. If you cannot point to visible pixels supporting ' +
      'the finding, do not return it.\n' +
      '• If a region looks ordinary, the correct severity is "none" ' +
      'or "low" — NOT "mild". "Mild" already means there is something ' +
      'visible.\n' +
      '• Confidence must reflect the visual evidence strength, not ' +
      'your classification certainty. A faint, hard-to-see signal is ' +
      'low confidence even if you are sure of its category.\n' +
      '• If image_quality is poor (blurry / low light / angled / ' +
      'partial / occluded), CAP every per-finding confidence at 0.55 ' +
      'and prefer severity "low" or "mild" over higher tiers.\n' +
      '• When unsure, return fewer findings rather than more. A clean ' +
      'photo with no clear concerns can return zero findings.\n' +
      '• marker_priority MUST be 0 (do not surface) for any finding ' +
      'with confidence < 0.55. Reserve 1 (primary) for the single ' +
      'highest-confidence visible concern.\n\n' +
      'TONE (consumer copy, not clinical):\n' +
      '• user_summary is ONE short sentence in calm, plain English. ' +
      'No medical framing. Examples: "Mild texture is visible across ' +
      'the forehead." / "Skin reads generally calm in this photo." / ' +
      '"Some congestion is faintly visible along the chin."\n' +
      '• Use hedged language ("appears", "looks", "is visible") for ' +
      'mild findings. Reserve direct phrasing for moderate+ findings.\n' +
      '• Never use clinical terms (acne, comedones, papules, ' +
      'inflammation, post-inflammatory hyperpigmentation). Use ' +
      'breakout / congestion / texture / dark mark / redness instead.\n' +
      '• why_line is plain, ≤ 12 words: "Skin looks generally calm." ' +
      'or "Mild texture across the forehead." It sits under the score.\n' +
      '• explanation is ONE concise sentence that supports the why_line ' +
      'without repeating it.\n' +
      '• clinician_style_summary stays factual but ALSO consumer-safe ' +
      '("faint texture, low confidence" / "no visible concerns").\n\n' +
      'NEXT_FOCUS COPY:\n' +
      '• next_focus.tonight is an array of 1–4 short, human-readable ' +
      'imperative sentences. NEVER return raw tokens or snake_case ' +
      'identifiers. Examples: "Apply a light hydrating serum." / ' +
      '"Use a gentle chemical exfoliant 1–2 nights per week." / ' +
      '"Spot-treat new blemishes only as they appear."\n' +
      '• next_focus.avoid is the same — short, complete sentences. ' +
      '"Skip retinol tonight." / "Avoid abrasive scrubs while skin ' +
      'is sensitive."';

    const userContent = this.buildImageUserContent(
      params.imageBase64,
      params.mediaType,
      [
        `scan_id: ${params.scanId}`,
        `user_profile: ${params.userProfileSummary}`,
        `previous_summary: ${params.previousSummary ?? 'none'}`,
        '',
        'Analyze this face image and return the structured skincare analysis.',
      ].join('\n')
    );

    return this.runStrictStructured<FaceScanAnalysis>({
      system,
      userContent,
      schemaName: 'face_scan_analysis',
      schema: FACE_SCAN_ANALYSIS_SCHEMA,
    });
  }

  // --------------------------------------------------------------------------
  // 2. Product image identification.
  // --------------------------------------------------------------------------

  async identifyProductFromImage(params: {
    imageBase64: string;
    mediaType: SupportedImageMediaType;
  }): Promise<ProductIdentity> {
    const system =
      'You are the product image identification engine for Pura AI. ' +
      'Your job is to look at a photograph of a skincare product (the ' +
      'bottle, tube, jar, or carton) and resolve its identity as ' +
      'specifically as possible from visible packaging.\n\n' +
      'Hard rules:\n' +
      '• Return EXACTLY the JSON object specified by the schema.\n' +
      '• Resolve as specifically as possible from visible text and ' +
      'design cues: brand wordmark, product name, claims, sizing, ' +
      'colour scheme.\n' +
      '• If the exact identity is uncertain, set resolved=false but ' +
      'still return the strongest structured identity you can — ' +
      'partial brand, category guess, observed claims.\n' +
      '• Set source="image" (this method never sees a barcode).\n' +
      '• Do not hallucinate barcode_value — set it to null unless a ' +
      'barcode is clearly visible AND fully legible in the photo.\n' +
      '• product_category should be the best fit; use "unknown" only ' +
      'when the image gives no signal.\n' +
      '• likely_concerns_supported should reflect claims actually on ' +
      'the packaging (e.g. "salicylic acid" → breakouts; "ceramides" → ' +
      'sensitivity), not aspirational claims.\n' +
      '• packaging_notes is free-text observations: colour, language, ' +
      'visible warnings, partial-text fragments.';

    const userContent = this.buildImageUserContent(
      params.imageBase64,
      params.mediaType,
      'Identify this product as specifically as the visible packaging ' +
        'allows and return the structured identity.'
    );

    return this.runStrictStructured<ProductIdentity>({
      system,
      userContent,
      schemaName: 'product_identity',
      schema: PRODUCT_IDENTITY_SCHEMA,
    });
  }

  // --------------------------------------------------------------------------
  // 3. Barcode resolution.
  //
  // Simpler than the legacy two-step tool loop: the server already
  // owns `lookupBarcode` (Open Beauty Facts + local catalog) so we
  // do that lookup synchronously in TypeScript and pass the result
  // straight to the model for normalization. One round-trip total.
  // --------------------------------------------------------------------------

  async normalizeBarcodeResolution(params: {
    barcodeValue: string;
    lookupBarcode: (
      barcodeValue: string
    ) => Promise<BarcodeLookupResult | null>;
  }): Promise<BarcodeResolution> {
    let lookupResult: BarcodeLookupResult | null = null;
    try {
      lookupResult = await params.lookupBarcode(params.barcodeValue);
    } catch {
      lookupResult = null;
    }

    const system =
      'You are the barcode normalization engine for Pura AI. Convert ' +
      'the lookup output into a canonical BarcodeResolution object.\n\n' +
      'Hard rules:\n' +
      '• Return EXACTLY the JSON object specified by the schema.\n' +
      '• If the lookup failed (lookup_result is null), set ' +
      'fallback_needed=true, found=false, identity=null, and ' +
      'matched_catalog_product_id=null. Preserve the original ' +
      'barcode_value as supplied.\n' +
      '• If the lookup succeeded, set found=true and build a complete ' +
      'ProductIdentity object with source="barcode" and ' +
      'confidence=0.95 unless the lookup is partial — in which case ' +
      'lower confidence and set fallback_needed=true.\n' +
      '• Never invent data not present in the lookup. If the lookup ' +
      'omitted brand or product_name, leave those null.\n' +
      '• Echo the original barcode_value exactly.';

    const userText = [
      `barcode_value: ${params.barcodeValue}`,
      `lookup_succeeded: ${lookupResult !== null}`,
      'lookup_result:',
      lookupResult ? JSON.stringify(lookupResult, null, 2) : 'null',
      '',
      'Return the canonical BarcodeResolution.',
    ].join('\n');

    return this.runStrictStructured<BarcodeResolution>({
      system,
      userContent: userText,
      schemaName: 'barcode_resolution',
      schema: BARCODE_RESOLUTION_SCHEMA,
    });
  }

  // --------------------------------------------------------------------------
  // 4. Product matching.
  // --------------------------------------------------------------------------

  async matchProductsForUser(params: {
    userId: string;
    basedOnScanId: string | null;
    skinStateSummary: string;
    candidateProductsJson: string;
  }): Promise<ProductMatchResult> {
    const system =
      'You are the product matching engine for Pura AI. You rank a ' +
      'fixed candidate set of skincare products against a single ' +
      "user's current skin state.\n\n" +
      'Hard rules:\n' +
      '• Return EXACTLY the JSON object specified by the schema.\n' +
      '• Rank ONLY the candidate products provided in ' +
      'candidate_products_json. Do not invent products. Every ' +
      'product_id you emit must exist in the candidate set.\n' +
      "• Use the user's skin state, sensitivities, and routine fit. " +
      'A product that conflicts with a user sensitivity must score ' +
      'low and surface in avoid_if_tags.\n' +
      '• match_score must be an integer 0..100 calibrated within the ' +
      'candidate set: the best fit lands near 100, the worst near 20.\n' +
      '• match_band ("excellent" / "strong" / "fair" / "weak") must ' +
      'follow match_score thresholds: ≥85 excellent, 70-84 strong, ' +
      '50-69 fair, <50 weak.\n' +
      '• primary_reasons: 1–3 short bullet phrases the UI surfaces on ' +
      'cards. Each reason names a concrete tie to the user state.\n' +
      '• top_pick_product_id is the highest-scoring product in matches.\n' +
      '• alternatives is a small set (≤5) of next-best candidates the ' +
      'user might prefer if they decline the top picks.';

    const userContent = [
      `user_id: ${params.userId}`,
      `based_on_scan_id: ${params.basedOnScanId ?? 'null'}`,
      'skin_state_summary:',
      params.skinStateSummary,
      '',
      'candidate_products_json:',
      params.candidateProductsJson,
      '',
      'Rank the candidates and return the structured ProductMatchResult.',
    ].join('\n');

    return this.runStrictStructured<ProductMatchResult>({
      system,
      userContent,
      schemaName: 'product_match_result',
      schema: PRODUCT_MATCH_RESULT_SCHEMA,
    });
  }

  // --------------------------------------------------------------------------
  // 5. Routine recommendation.
  // --------------------------------------------------------------------------

  async generateRoutineRecommendation(params: {
    scanSummary: string;
    matchedProductsJson: string;
    existingRoutineJson: string;
    basedOnScanId: string | null;
  }): Promise<RoutineRecommendation> {
    const system =
      'You are the routine planning engine for Pura AI. Build a ' +
      "concise, actionable routine grounded in the user's real scan " +
      'findings and the products that have been matched to them.\n\n' +
      'Hard rules:\n' +
      '• Return EXACTLY the JSON object specified by the schema.\n' +
      '• Do NOT recommend any product that is not present in ' +
      'matched_products_json. linked_product_id must reference a ' +
      'product in that JSON, or be null for steps that are not tied to ' +
      'a specific product (e.g. "rinse with lukewarm water").\n' +
      '• Use the three slots correctly: morning is daytime defence ' +
      '(SPF closes the slot), evening is the repair window, ' +
      'saved_for_later is products the user might add later.\n' +
      '• step_order is 1-indexed within each slot and reflects the ' +
      'real application sequence (cleanser → serum → moisturizer → SPF).\n' +
      '• tonight_focus is one short sentence the TODAY card surfaces ' +
      "(e.g. \"Skip actives tonight, calm the chin.\")\n" +
      '• headline is short ("Tonight: barrier repair, no actives.").\n' +
      '• reminder_recommended=true when the user has at least one ' +
      'meaningful evening step that benefits from consistency.\n' +
      "• Respect existing_routine_json: if the user already uses a " +
      'product, prefer keeping it over swapping unless the scan ' +
      'directly contradicts it.';

    const userContent = [
      `based_on_scan_id: ${params.basedOnScanId ?? 'null'}`,
      'scan_summary:',
      params.scanSummary,
      '',
      'matched_products_json:',
      params.matchedProductsJson,
      '',
      'existing_routine_json:',
      params.existingRoutineJson,
      '',
      'Return the structured RoutineRecommendation.',
    ].join('\n');

    return this.runStrictStructured<RoutineRecommendation>({
      system,
      userContent,
      schemaName: 'routine_recommendation',
      schema: ROUTINE_RECOMMENDATION_SCHEMA,
    });
  }

  // --------------------------------------------------------------------------
  // 6. Skin score explanation.
  // --------------------------------------------------------------------------

  async explainSkinScore(params: {
    score: number;
    deltaReference: 'previous_scan' | 'baseline' | 'none';
    deltaValue: number | null;
    concernMovementsJson: string;
  }): Promise<SkinScoreExplanation> {
    const system =
      'You are the Skin Score explanation engine for Pura AI. Take a ' +
      'numeric score, the change since either the previous scan or the ' +
      "baseline, and the user's concern movements, and return a " +
      'plain-English explanation.\n\n' +
      'Hard rules:\n' +
      '• Return EXACTLY the JSON object specified by the schema.\n' +
      '• ALWAYS echo the `score`, `delta_reference`, and `delta_value` ' +
      'values from the user message into the output exactly as given.\n' +
      '• Never return a naked number without a reason. why_line names ' +
      "the concrete concern that moved (\"Breakouts calming, hydration " +
      'still needs work.").\n' +
      '• short_status is ≤ 5 words ("Up 4 from your last scan.").\n' +
      '• coach_line is one short imperative sentence the user can ' +
      'act on tonight.\n' +
      '• band must follow the score thresholds: 85+ great, 70-84 good, ' +
      '55-69 fair, <55 poor.\n' +
      '• If delta_reference is "none", set delta_value to null and ' +
      'short_status to "Your first reading."';

    const userContent = [
      `score: ${params.score}`,
      `delta_reference: ${params.deltaReference}`,
      `delta_value: ${params.deltaValue ?? 'null'}`,
      'concern_movements_json:',
      params.concernMovementsJson,
      '',
      'Return the structured SkinScoreExplanation.',
    ].join('\n');

    return this.runStrictStructured<SkinScoreExplanation>({
      system,
      userContent,
      schemaName: 'skin_score_explanation',
      schema: SKIN_SCORE_EXPLANATION_SCHEMA,
    });
  }

  // --------------------------------------------------------------------------
  // 7. Progress explanation.
  // --------------------------------------------------------------------------

  async explainProgress(params: {
    baselineSummary: string;
    latestSummary: string;
    concernMovementsJson: string;
  }): Promise<ProgressExplanation> {
    const system =
      'You are the progress interpretation engine for Pura AI. ' +
      "Compare a user's day-1 baseline against their latest scan and " +
      'return a user-facing summary of what improved, what worsened, ' +
      'and what stayed the same.\n\n' +
      'Hard rules:\n' +
      '• Return EXACTLY the JSON object specified by the schema.\n' +
      "• Be specific. Don't say \"things are improving\" when you can " +
      'say "Breakouts moved from moderate to mild."\n' +
      '• strongest_improvement names a single concrete win.\n' +
      '• strongest_regression names the worst regression OR is null if ' +
      "nothing regressed.\n" +
      '• unchanged_summary names the categories holding steady in one ' +
      'short sentence.\n' +
      '• short_narrative is 2–3 sentences for the Progress hero.\n' +
      '• compare_caption is a short caption shown over the day-1-vs-' +
      'today compare slider ("DAY 1 → DAY 14: clearer chin, brighter ' +
      'cheeks.").';

    const userContent = [
      'baseline_summary:',
      params.baselineSummary,
      '',
      'latest_summary:',
      params.latestSummary,
      '',
      'concern_movements_json:',
      params.concernMovementsJson,
      '',
      'Return the structured ProgressExplanation.',
    ].join('\n');

    return this.runStrictStructured<ProgressExplanation>({
      system,
      userContent,
      schemaName: 'progress_explanation',
      schema: PROGRESS_EXPLANATION_SCHEMA,
    });
  }

  // --------------------------------------------------------------------------
  // 8. Search suggestions.
  // --------------------------------------------------------------------------

  async buildSearchSuggestions(params: {
    latestScanSummary: string | null;
    routineSummary: string;
    pageContext: 'products' | 'assistant';
  }): Promise<SearchSuggestionResult> {
    const system =
      'You generate AI-powered search suggestions for the Pura AI app. ' +
      'You return a short prefill placeholder, a small set of ' +
      'tap-to-search suggestion chips, and a small set of refinement ' +
      'chips, all grounded in the user’s current state.\n\n' +
      'Hard rules:\n' +
      '• Return EXACTLY the JSON object specified by the schema.\n' +
      '• Suggestions must reflect the supplied context — do not ' +
      'produce generic filler ("best moisturizer", "skincare 101").\n' +
      '• Each chip is a short search phrase (≤ 4 words), not a ' +
      'sentence.\n' +
      '• prefill_placeholder reads naturally inside an empty search ' +
      "field (\"Try: gentle exfoliant for chin\").\n" +
      '• page_context controls voice: on "products" the chips lead the ' +
      'user toward catalog filters; on "assistant" they lead toward ' +
      'questions the user might ask.\n' +
      '• 3–5 suggestion_chips, 2–4 refinement_chips. No duplicates ' +
      'between the two arrays.';

    const userContent = [
      `page_context: ${params.pageContext}`,
      'latest_scan_summary:',
      params.latestScanSummary ?? 'none',
      '',
      'routine_summary:',
      params.routineSummary,
      '',
      'Return the structured SearchSuggestionResult.',
    ].join('\n');

    return this.runStrictStructured<SearchSuggestionResult>({
      system,
      userContent,
      schemaName: 'search_suggestion_result',
      schema: SEARCH_SUGGESTION_RESULT_SCHEMA,
    });
  }

  // --------------------------------------------------------------------------
  // 8b. v18.0 — Live product retrieval.
  //
  // Replaces the seed-catalog-as-primary-inventory pattern. This
  // method asks GPT to recommend REAL named skincare products for
  // either a free-text query or a scan-derived concern context.
  // GPT's training data IS the inventory — major brands, real
  // product names, real ingredient lists, claimed benefits. The
  // structured-output schema forces brand+name+category+reason on
  // every candidate so the client can render it with confidence.
  //
  // The model is INSTRUCTED to never fabricate URLs or prices when
  // it isn't confident — it must return null for those fields. The
  // client then renders a brand-wordmark placeholder + a search-on-
  // merchant CTA, never a fabricated brand site.
  // --------------------------------------------------------------------------

  async lookupLiveProducts(params: {
    /** Free text or AI-shaped query ("for redness on cheeks", etc.) */
    query: string;
    /** Optional structured scan context — when present the model
     *  prefers products for the user's actual concerns and severity. */
    scanContext?: {
      primary_concern: string | null;
      secondary_concerns: string[];
      severity_band: string;
      regions: string[];
      skin_type: string;
      sensitivities: string[];
    };
    /** How many candidates to return (default 8). The model still
     *  picks fewer if it can't honestly fill the slot. */
    count?: number;
  }): Promise<LiveProductLookupResult> {
    const count = Math.max(1, Math.min(12, params.count ?? 8));
    const system =
      'You are Pura AI\'s live product retrieval engine. Given a ' +
      'query and optional scan context, you return real, named, ' +
      'commercially available skincare products that fit the ask. ' +
      'You are NOT ranking a fixed catalog — you are choosing real ' +
      'products from your knowledge of the global skincare market.\n\n' +
      'Hard rules (v18.0):\n' +
      '• Return EXACTLY the JSON object specified by the schema.\n' +
      '• Every product must be a REAL product made by a REAL brand. ' +
      'No fabricated names, no "Brand X" placeholders, no fictional ' +
      'SKUs. If you would be guessing, leave the slot out.\n' +
      `• Aim for ${count} candidates ranked by fit. Return fewer when ` +
      'you cannot honestly fill the slot at high confidence.\n' +
      '• `id` must be a stable, lowercase, hyphenated slug derived ' +
      'from brand+name (e.g. "the-ordinary-niacinamide-10-zinc-1"). ' +
      'No spaces, no special characters except hyphens.\n' +
      '• `category` must be one of: cleanser, toner, serum, ' +
      'moisturizer, spot_treatment, spf, mask, unknown. Pick the best ' +
      'fit; never invent categories.\n' +
      '• `concernTags` must use the canonical concern enum: ' +
      'breakouts, hydration, texture, dark_marks, redness, oiliness, ' +
      'sensitivity, pores. Pick the 1–4 concerns the product is ' +
      'genuinely formulated for.\n' +
      '• `ingredientsHighlights`: 2–5 hero actives with strength when ' +
      'known ("salicylic acid 2%", "niacinamide 10%", "ceramide-3"). ' +
      'No filler.\n' +
      '• `price`: provide your best estimate of the typical recent ' +
      'US retail price as a number (e.g. 16, 32.99). Skincare retail ' +
      'prices are public knowledge for major brands — use it. Only ' +
      'return null when you genuinely have no idea (rare/niche brand). ' +
      'Do NOT round to obvious dummy values like 10, 20, 50.\n' +
      '• `currency`: "USD" by default; use the merchant\'s currency ' +
      'when you cite a non-US merchant.\n' +
      '• `merchantName` + `productUrl`: ALWAYS populate these. Pick ' +
      'the most credible commerce destination for this product, in ' +
      'this priority order:\n' +
      '   1. Brand DTC site for the major brands you reliably know — ' +
      'e.g. The Ordinary → theordinary.com, CeraVe → cerave.com, ' +
      'La Roche-Posay → laroche-posay.us, Paula\'s Choice → ' +
      'paulaschoice.com, COSRX → cosrx.com, Beauty of Joseon → ' +
      'beautyofjoseon.com, Kiehl\'s → kiehls.com, Supergoop → ' +
      'supergoop.com, Naturium → naturium.com, Glow Recipe → ' +
      'glowrecipe.com, Youth To The People → youthtothepeople.com.\n' +
      '   2. A Sephora search URL when the brand is sold at Sephora: ' +
      'https://www.sephora.com/search?keyword={brand}+{product}\n' +
      '   3. An Ulta search URL when the brand is more drugstore-side: ' +
      'https://www.ulta.com/shop?Ntt={brand}+{product}\n' +
      '   4. An Amazon search URL as a last resort: ' +
      'https://www.amazon.com/s?k={brand}+{product}\n' +
      'Only return null for productUrl when you genuinely cannot ' +
      'name any plausible retailer. merchantName must match the host ' +
      '("Brand DTC", "Sephora", "Ulta", "Amazon").\n' +
      '• `imageUrl`: include a real product image URL when you reliably ' +
      'know it (e.g. an Open Beauty Facts image, an official brand ' +
      'CDN, a known retailer CDN). Otherwise null is fine — the app ' +
      'has a quiet brand-wordmark fallback.\n' +
      '• `imageSource` ("merchant" | "brand" | "obf" | "none") must ' +
      'match where imageUrl came from. Use "none" when imageUrl is null.\n' +
      '• `shortDescription`: ≤ 120 chars, plain English. What the ' +
      'product does, not marketing fluff.\n' +
      '• `matchReason`: ≤ 100 chars, names the specific tie to the ' +
      'user\'s concern (or query). "Targets clustered breakouts on ' +
      'oily skin via 2% salicylic acid" beats "great product".\n' +
      '• `availability`: "available" only when you are confident the ' +
      'product is currently on shelves; otherwise "unknown".\n' +
      '• `matchScore`: integer 0..100 calibrated within YOUR result ' +
      'set. Best fit ≈ 95, weakest fit ≈ 65. Reserve scores below 60 ' +
      'for results that barely fit and shouldn\'t be top picks.\n' +
      '• Return `confidence` honestly: "high" when the query was ' +
      'clear and you found strong matches, "medium" when the picks ' +
      'are reasonable but not perfect, "low" when the query was vague ' +
      'or the matches are speculative.\n\n' +
      'Editorial bias:\n' +
      '• Prefer products from established brands a US/UK shopper would ' +
      'recognize (CeraVe, La Roche-Posay, The Ordinary, Beauty of ' +
      'Joseon, Paula\'s Choice, Kiehl\'s, COSRX, Supergoop, Naturium, ' +
      'Glow Recipe, Youth To The People, etc.) over niche-only brands ' +
      'when both fit. The user must be able to actually buy what you ' +
      'recommend.\n' +
      '• Avoid duplicates — never two products from the same brand in ' +
      'the same category.\n' +
      '• Honor sensitivities: skip fragranced or actives-heavy picks ' +
      'when the user is flagged sensitive.';

    const userContent = JSON.stringify({
      query: params.query,
      scan_context: params.scanContext ?? null,
      requested_count: count,
    });

    return this.runStrictStructured<LiveProductLookupResult>({
      system,
      userContent,
      schemaName: 'live_product_lookup',
      schema: LIVE_PRODUCT_LOOKUP_SCHEMA,
    });
  }

  // --------------------------------------------------------------------------
  // 9. Assistant freeform answer.
  //
  // Uses the stronger reasoning model for grounded answers. NOT
  // structured output — the assistant returns plain prose. The
  // entire assistant_context is JSON-stringified into the user
  // message so the model has the full grounding surface.
  // --------------------------------------------------------------------------

  async answerAssistant(params: {
    context: AssistantContext;
    userQuestion: string;
  }): Promise<string> {
    const system =
      'You are the in-app AI skincare assistant for Pura AI. You ' +
      "answer the user's questions using the structured context they " +
      'have provided about their latest scan, routine, products, and ' +
      'progress.\n\n' +
      'Format (v14.1, mobile chat surface — TIGHTER than v11.3):\n' +
      '• Lead with the answer in ONE short sentence (≤ 18 words).\n' +
      '• Then AT MOST 2 short bullets, ≤ 12 words each. Use a leading ' +
      '"• " on its own line.\n' +
      '• Hard cap: ~50 words total. Only exceed when the user explicitly ' +
      'asked for depth ("explain", "walk me through", "in detail").\n' +
      '• If the question is product-shaped ("what should I add", ' +
      '"best moisturizer", "what helps redness", a question that ' +
      'mentions an ingredient or product category), output ONE short ' +
      'lead sentence ONLY. Hard cap: ≤ 22 words. No bullets, no ' +
      'second sentence, no list. The app renders real product cards ' +
      'with brand, name, match %, price, and Shop button directly ' +
      'under your text — your job is the lead-in only, not the recap. ' +
      'Name the type of product (e.g. "a salicylic acid serum" or ' +
      '"a barrier-repair moisturizer") tied to the user\'s actual ' +
      'concern from latest_scan if present. Never name specific ' +
      'brands or product names — the cards do that.\n' +
      '• No greetings, no "Great question", no preamble. Lead with the ' +
      'answer.\n' +
      '• No headings, no markdown bold, no code fences, no JSON.\n\n' +
      'Voice:\n' +
      '• Specific to the latest scan, routine, products, and progress ' +
      'in the context. Reference at least one concrete piece of that ' +
      'context (a zone, product, or score) by name.\n' +
      '• If a piece of context is missing, say so briefly ' +
      "(\"I don't have a recent scan yet — \") and continue " +
      'helpfully with what you do have.\n' +
      '• Do not invent products that are not in top_matches or ' +
      'active_product_identity. When asked for general options, name ' +
      'categories ("a salicylic acid cleanser") rather than fictional ' +
      'specific products.';

    const payload = {
      assistant_context: params.context,
      user_question: params.userQuestion,
    };

    const response = await this.openai.chat.completions.create({
      model: AI_MODELS.assistant,
      max_completion_tokens: AI_DEFAULTS.assistant.max_tokens,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: JSON.stringify(payload),
        },
      ],
    });

    const text = response.choices[0]?.message?.content;
    return typeof text === 'string' ? text : '';
  }

  // --------------------------------------------------------------------------
  // 10. Composite — analyse a scanned product against the current user.
  // --------------------------------------------------------------------------

  async analyzeScannedProductAgainstUser(params: {
    imageBase64: string;
    mediaType: SupportedImageMediaType;
    userContextSummary: string;
  }): Promise<{ identity: ProductIdentity; fit: ProductMatchResult }> {
    const identity = await this.identifyProductFromImage({
      imageBase64: params.imageBase64,
      mediaType: params.mediaType,
    });

    const candidate = {
      product_id:
        identity.catalog_lookup_key ??
        identity.canonical_title ??
        'scanned-product',
      brand: identity.brand,
      product_name: identity.product_name,
      canonical_title: identity.canonical_title,
      product_category: identity.product_category,
      likely_concerns_supported: identity.likely_concerns_supported,
      key_claims: identity.key_claims,
      packaging_notes: identity.packaging_notes,
    };

    const candidateProductsJson = JSON.stringify([candidate]);

    const fit = await this.matchProductsForUser({
      userId: 'current_user',
      basedOnScanId: null,
      skinStateSummary: params.userContextSummary,
      candidateProductsJson,
    });

    return { identity, fit };
  }

  // --------------------------------------------------------------------------
  // 11. Composite — full scan → plan bundle.
  // --------------------------------------------------------------------------

  async buildFullScanToPlanBundle(params: {
    imageBase64: string;
    mediaType: SupportedImageMediaType;
    scanId: string;
    previousSummary?: string;
    userProfileSummary: string;
    candidateProductsJson: string;
    existingRoutineJson: string;
  }): Promise<{
    analysis: FaceScanAnalysis;
    matches: ProductMatchResult;
    routine: RoutineRecommendation;
    score: SkinScoreExplanation;
  }> {
    const analysis = await this.analyzeFaceScan({
      imageBase64: params.imageBase64,
      mediaType: params.mediaType,
      scanId: params.scanId,
      previousSummary: params.previousSummary,
      userProfileSummary: params.userProfileSummary,
    });

    const skinStateSummary = JSON.stringify({
      skin_score: analysis.skin_score,
      primary_concern: analysis.primary_concern,
      secondary_concerns: analysis.secondary_concerns,
      findings: analysis.findings,
      score_factors: analysis.score_factors,
      plan_inputs: analysis.plan_inputs,
    });

    const concernMovementsJson = JSON.stringify({
      findings: analysis.findings.map((f) => ({
        concern: f.concern,
        severity: f.severity,
        direction_vs_previous: f.direction_vs_previous,
      })),
      score_factors: analysis.score_factors,
    });

    const [matches, score] = await Promise.all([
      this.matchProductsForUser({
        userId: 'current_user',
        basedOnScanId: analysis.scan_id,
        skinStateSummary,
        candidateProductsJson: params.candidateProductsJson,
      }),
      this.explainSkinScore({
        score: analysis.skin_score.value,
        deltaReference:
          analysis.skin_score.delta_vs_previous !== null
            ? 'previous_scan'
            : analysis.skin_score.delta_vs_baseline !== null
            ? 'baseline'
            : 'none',
        deltaValue:
          analysis.skin_score.delta_vs_previous ??
          analysis.skin_score.delta_vs_baseline ??
          null,
        concernMovementsJson,
      }),
    ]);

    const matchedProductsJson = JSON.stringify({
      top_pick_product_id: matches.top_pick_product_id,
      matches: matches.matches,
      alternatives: matches.alternatives,
    });

    const routine = await this.generateRoutineRecommendation({
      scanSummary: skinStateSummary,
      matchedProductsJson,
      existingRoutineJson: params.existingRoutineJson,
      basedOnScanId: analysis.scan_id,
    });

    return { analysis, matches, routine, score };
  }

  // --------------------------------------------------------------------------
  // 12. Composite — progress bundle.
  // --------------------------------------------------------------------------

  async buildProgressBundle(params: {
    baselineSummary: string;
    latestSummary: string;
    concernMovementsJson: string;
    score: number;
    deltaValue: number | null;
  }): Promise<{
    progress: ProgressExplanation;
    score: SkinScoreExplanation;
  }> {
    const [progress, score] = await Promise.all([
      this.explainProgress({
        baselineSummary: params.baselineSummary,
        latestSummary: params.latestSummary,
        concernMovementsJson: params.concernMovementsJson,
      }),
      this.explainSkinScore({
        score: params.score,
        deltaReference:
          params.deltaValue !== null ? 'baseline' : 'none',
        deltaValue: params.deltaValue,
        concernMovementsJson: params.concernMovementsJson,
      }),
    ]);

    return { progress, score };
  }
}

// ----------------------------------------------------------------------------
// Factory.
// ----------------------------------------------------------------------------

/**
 * Read OPENAI_API_KEY from the environment and return a configured
 * OpenAIClient. Throws if the env var is missing or blank.
 *
 * Runs in Node only. RN screens reach OpenAI through the proxy.
 */
export function createOpenAIClientFromEnv(): OpenAIClient {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      'createOpenAIClientFromEnv: OPENAI_API_KEY is missing or blank.'
    );
  }
  return new OpenAIClient({ apiKey });
}

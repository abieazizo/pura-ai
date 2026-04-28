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
  ProductIdentity,
  ProductMatchResult,
  ProgressExplanation,
  RoutineRecommendation,
  SearchSuggestionResult,
  SkinScoreExplanation,
  SupportedImageMediaType,
  JsonSchema,
} from '../../src/ai/ai-contracts';
import {
  BARCODE_RESOLUTION_SCHEMA,
  CLAUDE_DEFAULTS as AI_DEFAULTS,
  CLAUDE_MODELS as AI_MODELS,
  FACE_SCAN_ANALYSIS_SCHEMA,
  PRODUCT_IDENTITY_SCHEMA,
  PRODUCT_MATCH_RESULT_SCHEMA,
  PROGRESS_EXPLANATION_SCHEMA,
  ROUTINE_RECOMMENDATION_SCHEMA,
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
   * cast to T. Throws if the model returned non-JSON or the
   * content was empty.
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
    const userContent: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: 'user',
      content:
        typeof params.userContent === 'string'
          ? params.userContent
          : params.userContent,
    };

    const response = await this.openai.chat.completions.create({
      model: params.model ?? AI_MODELS.extraction,
      max_completion_tokens:
        params.maxTokens ?? AI_DEFAULTS.extraction.max_tokens,
      messages: [
        { role: 'system', content: params.system },
        userContent,
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

    const message = response.choices[0]?.message;
    const text = message?.content;
    if (typeof text !== 'string' || text.length === 0) {
      throw new Error(
        `OpenAIClient: empty content for ${params.schemaName} ` +
          `(finish_reason=${response.choices[0]?.finish_reason ?? 'unknown'})`
      );
    }
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      throw new Error(
        `OpenAIClient: JSON parse failed for ${params.schemaName}: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
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
      'You are the face scan analysis engine for Pura AI, a premium AI ' +
      'skincare product. Your job is to read a single user-uploaded ' +
      'face photograph and return a structured skin analysis.\n\n' +
      'Hard rules:\n' +
      '• Return EXACTLY the JSON object specified by the schema.\n' +
      '• ALWAYS echo the `scan_id` value from the user message into ' +
      'the output exactly as given. Set `analyzed_at_iso` to the ' +
      'current UTC time in ISO-8601.\n' +
      '• Be conservative. Only flag concerns the image visually ' +
      'supports — never invent breakouts, redness, or marks that are ' +
      'not visible.\n' +
      '• Be concise. user_summary is one short sentence; ' +
      'clinician_style_summary is one short factual phrase.\n' +
      '• why_line must be plain English and short ' +
      '("Breakouts calming. Hydration still needs work."). It is ' +
      'displayed under the dial on the result screen.\n' +
      '• explanation must be one concise sentence elaborating on the ' +
      'why_line.\n' +
      '• If the image quality is poor (blurry, low light, partial ' +
      'face, occluded), reflect that in image_quality.issues, set ' +
      'image_quality.confidence low, and lower per-finding confidence ' +
      'accordingly. Still return the structured object.\n' +
      '• score_factors must be 0..100 integers calibrated to the ' +
      'overall skin_score.value.\n' +
      '• When previous_summary is "none", set delta_vs_previous and ' +
      'delta_vs_baseline to null.';

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
      'Voice:\n' +
      '• Concise. Useful. Grounded.\n' +
      '• Specific to the latest scan, routine, products, and progress ' +
      'in the context.\n' +
      '• Never start with "Great question" or other filler. Lead with ' +
      'the answer.\n' +
      '• If the context is missing a piece you need, say so briefly ' +
      "(\"I don't have a recent scan yet — \") and continue " +
      'helpfully with what you do have.\n' +
      '• Do not invent products that are not in top_matches or ' +
      'active_product_identity. When asked for general options, name ' +
      'categories ("a salicylic acid cleanser") rather than fictional ' +
      'specific products.\n' +
      '• Keep answers under ~160 words unless the user asked for ' +
      'depth.\n' +
      '• Output plain prose. No JSON. No code fences.';

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

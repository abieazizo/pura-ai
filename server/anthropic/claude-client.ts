/**
 * Pura AI — Claude client. **SERVER-ONLY.**
 *
 * This file imports `@anthropic-ai/sdk`, which means it pulls in
 * Node-only resources and beta resource paths that Metro cannot
 * resolve. It MUST NOT be imported by any code under `src/` (the
 * Expo / React Native bundle). The only legitimate consumers are:
 *
 *   • `server/aiProxy.ts`          (HTTP proxy entrypoint)
 *   • `server/lib/handlers.ts`     (per-method handlers)
 *   • Other files under `server/`
 *
 * The client app reaches Claude exclusively through HTTP fetch to
 * the proxy server (see `src/ai/aiGateway.ts`). The client never
 * instantiates the SDK and never sees the API key.
 *
 * Design rules:
 *   • Every flow that produces structured output uses tool_use with a
 *     strict input_schema, temperature 0, disable_parallel_tool_use,
 *     and tool_choice forcing exactly one tool call. Thinking is
 *     never enabled when a tool is forced.
 *   • The freeform assistant flow uses temperature 0.2, no forced
 *     tool, and returns the first text block as a string.
 *   • Every method takes a top-level `system` prompt (not a system
 *     message in the array) so prompt logic stays out of the message
 *     content channel.
 *   • All prompt logic lives here. UI never composes prompts.
 */

import Anthropic from '@anthropic-ai/sdk';
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
  BARCODE_LOOKUP_TOOL_SCHEMA,
  BARCODE_RESOLUTION_SCHEMA,
  CLAUDE_DEFAULTS,
  CLAUDE_MODELS,
  FACE_SCAN_ANALYSIS_SCHEMA,
  PRODUCT_IDENTITY_SCHEMA,
  PRODUCT_MATCH_RESULT_SCHEMA,
  PROGRESS_EXPLANATION_SCHEMA,
  ROUTINE_RECOMMENDATION_SCHEMA,
  SEARCH_SUGGESTION_RESULT_SCHEMA,
  SKIN_SCORE_EXPLANATION_SCHEMA,
} from '../../src/ai/ai-contracts';

// Re-export for server consumers that still want to reach these from
// `claude-client.ts` rather than the contracts file.
export type { BarcodeLookupResult, SupportedImageMediaType };

// ----------------------------------------------------------------------------
// Local SDK aliases.
// ----------------------------------------------------------------------------
//
// The Anthropic SDK exposes everything under `Anthropic.Messages.*`. We
// alias the few types we touch so the call sites read cleanly and so a
// future SDK reorganisation is one find-and-replace away.

type SdkMessage = Anthropic.Messages.Message;
type SdkContentBlock = Anthropic.Messages.ContentBlock;
type SdkToolUseBlock = Anthropic.Messages.ToolUseBlock;
type SdkMessageParam = Anthropic.Messages.MessageParam;
type SdkContentBlockParam = Anthropic.Messages.ContentBlockParam;
type SdkTool = Anthropic.Messages.Tool;
type SdkToolInputSchema = Anthropic.Messages.Tool.InputSchema;

// ----------------------------------------------------------------------------
// Public types.
// ----------------------------------------------------------------------------

export interface ClaudeClientConfig {
  apiKey: string;
}

// ----------------------------------------------------------------------------
// ClaudeClient.
// ----------------------------------------------------------------------------

export class ClaudeClient {
  private anthropic: Anthropic;

  constructor(config: ClaudeClientConfig) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new Error(
        'ClaudeClient: apiKey is required and must be non-empty.'
      );
    }
    this.anthropic = new Anthropic({ apiKey: config.apiKey });
  }

  // --------------------------------------------------------------------------
  // Private helpers.
  // --------------------------------------------------------------------------

  /**
   * Build a user message content array carrying an image + a text
   * instruction. Returns the array so it can be embedded inside a full
   * message (callers may concatenate additional context blocks).
   */
  private buildImageUserContent(
    imageBase64: string,
    mediaType: SupportedImageMediaType,
    instruction: string
  ): SdkContentBlockParam[] {
    return [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: imageBase64,
        },
      },
      {
        type: 'text',
        text: instruction,
      },
    ];
  }

  /**
   * Walk an Anthropic message's content blocks looking for a single
   * tool_use block matching `toolName`, and return its `input` cast to
   * the requested type. Throws if zero or multiple matching blocks are
   * present (the latter should be impossible with
   * disable_parallel_tool_use, but we defend against it).
   */
  private assertSingleToolResult<T>(
    response: SdkMessage,
    toolName: string
  ): T {
    const blocks = response.content.filter(
      (b: SdkContentBlock): b is SdkToolUseBlock =>
        b.type === 'tool_use' && b.name === toolName
    );
    if (blocks.length === 0) {
      throw new Error(
        `ClaudeClient: expected a tool_use block for "${toolName}" but found none. ` +
          `stop_reason=${response.stop_reason ?? 'unknown'}`
      );
    }
    if (blocks.length > 1) {
      throw new Error(
        `ClaudeClient: received ${blocks.length} tool_use blocks for "${toolName}"; ` +
          `expected exactly one. disable_parallel_tool_use must be set.`
      );
    }
    return blocks[0].input as T;
  }

  /**
   * Run a strict structured-output call: one user message, exactly one
   * tool registered, tool_choice forced to that tool by name,
   * temperature 0, parallel tool use disabled. Returns the parsed tool
   * input as T.
   *
   * `userContent` may be a plain string (a single text block is
   * synthesised) or a pre-assembled array of content blocks (e.g. an
   * image + text pair from `buildImageUserContent`).
   */
  private async runStrictTool<T>(params: {
    system: string;
    userContent: string | SdkContentBlockParam[];
    toolName: string;
    toolDescription: string;
    inputSchema: JsonSchema;
    /** Override max_tokens; defaults to extraction default. */
    maxTokens?: number;
  }): Promise<T> {
    const tool: SdkTool = {
      name: params.toolName,
      description: params.toolDescription,
      input_schema: params.inputSchema as SdkToolInputSchema,
    };

    const messages: SdkMessageParam[] = [
      {
        role: 'user',
        content:
          typeof params.userContent === 'string'
            ? [{ type: 'text', text: params.userContent }]
            : params.userContent,
      },
    ];

    const response = await this.anthropic.messages.create({
      model: CLAUDE_MODELS.extraction,
      max_tokens: params.maxTokens ?? CLAUDE_DEFAULTS.extraction.max_tokens,
      temperature: CLAUDE_DEFAULTS.extraction.temperature,
      system: params.system,
      tools: [tool],
      tool_choice: {
        type: 'tool',
        name: params.toolName,
        disable_parallel_tool_use:
          CLAUDE_DEFAULTS.extraction.disable_parallel_tool_use,
      },
      messages,
    });

    return this.assertSingleToolResult<T>(response, params.toolName);
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
      '• Return EXACTLY ONE tool call to "return_face_scan_analysis".\n' +
      '• Use only the provided schema. Do not invent fields.\n' +
      '• Do not write prose outside the tool. No preamble, no apology.\n' +
      '• ALWAYS echo the `scan_id` value from the user message into ' +
      'the tool output exactly as given. Set `analyzed_at_iso` to ' +
      'the current UTC time in ISO-8601.\n' +
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
        'Analyze this face image and return the exact structured ' +
          'skincare analysis via the return_face_scan_analysis tool.',
      ].join('\n')
    );

    return this.runStrictTool<FaceScanAnalysis>({
      system,
      userContent,
      toolName: 'return_face_scan_analysis',
      toolDescription:
        'Return the full structured face scan analysis for the user-uploaded photo.',
      inputSchema: FACE_SCAN_ANALYSIS_SCHEMA,
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
      '• Return EXACTLY ONE tool call to "return_product_identity".\n' +
      '• Use only the provided schema. Do not write prose outside the ' +
      'tool.\n' +
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
        'allows and return the structured identity via the ' +
        'return_product_identity tool.'
    );

    return this.runStrictTool<ProductIdentity>({
      system,
      userContent,
      toolName: 'return_product_identity',
      toolDescription:
        'Return a structured identity for the product photographed.',
      inputSchema: PRODUCT_IDENTITY_SCHEMA,
    });
  }

  // --------------------------------------------------------------------------
  // 3. Barcode resolution — two-step tool loop.
  // --------------------------------------------------------------------------

  async normalizeBarcodeResolution(params: {
    barcodeValue: string;
    lookupBarcode: (
      barcodeValue: string
    ) => Promise<BarcodeLookupResult | null>;
  }): Promise<BarcodeResolution> {
    // ---- First call: register lookup_barcode tool, allow tool_choice "any". ----
    const firstSystem =
      'You are the barcode resolution engine for Pura AI. The user ' +
      'just scanned a barcode and you must resolve which product it ' +
      'is.\n\n' +
      'Hard rules:\n' +
      '• Always call the lookup_barcode tool first with the supplied ' +
      'barcode_value. Do not answer directly before tool use.\n' +
      '• Pass through the exact barcode_value you were given — do not ' +
      'modify, pad, or strip digits.';

    const lookupTool: SdkTool = {
      name: 'lookup_barcode',
      description:
        'Look the barcode value up against the host catalog and return ' +
        'whatever the lookup yields (or null if nothing matches).',
      input_schema: BARCODE_LOOKUP_TOOL_SCHEMA as SdkToolInputSchema,
    };

    const firstUserMessage: SdkMessageParam = {
      role: 'user',
      content: [
        {
          type: 'text',
          text:
            `barcode_value: ${params.barcodeValue}\n\n` +
            'Resolve this barcode by calling the lookup_barcode tool ' +
            'with the exact barcode_value above.',
        },
      ],
    };

    const firstResponse = await this.anthropic.messages.create({
      model: CLAUDE_MODELS.extraction,
      max_tokens: CLAUDE_DEFAULTS.extraction.max_tokens,
      temperature: CLAUDE_DEFAULTS.extraction.temperature,
      system: firstSystem,
      tools: [lookupTool],
      tool_choice: {
        type: 'any',
        disable_parallel_tool_use:
          CLAUDE_DEFAULTS.extraction.disable_parallel_tool_use,
      },
      messages: [firstUserMessage],
    });

    const lookupCall = firstResponse.content.find(
      (b: SdkContentBlock): b is SdkToolUseBlock =>
        b.type === 'tool_use' && b.name === 'lookup_barcode'
    );

    if (!lookupCall) {
      // Claude declined to call the tool. Fall back to a normalisation-
      // only flow with a null lookup so the second call still produces
      // a canonical resolution shape.
      return this.normalizeBarcodeWithLookup(params.barcodeValue, null, null);
    }

    const requestedBarcodeRaw = (lookupCall.input as { barcode_value?: unknown })
      .barcode_value;
    const requestedBarcode =
      typeof requestedBarcodeRaw === 'string' && requestedBarcodeRaw.length > 0
        ? requestedBarcodeRaw
        : params.barcodeValue;

    let lookupResult: BarcodeLookupResult | null = null;
    try {
      lookupResult = await params.lookupBarcode(requestedBarcode);
    } catch {
      // Lookup failure is treated as "no result" — the normalisation
      // call below will mark fallback_needed=true and identity=null.
      lookupResult = null;
    }

    return this.normalizeBarcodeWithLookup(
      params.barcodeValue,
      lookupCall.id,
      lookupResult
    );
  }

  /**
   * Second leg of the barcode resolution loop. Given the lookup result
   * (or null), force Claude to emit the canonical BarcodeResolution
   * via return_barcode_resolution.
   *
   * `firstCallToolUseId` is the id of the first call's lookup_barcode
   * tool_use block; it's stitched back as a tool_result so Claude has
   * the lookup output in conversation. When the first call never
   * produced a lookup (Claude declined), we send a synthetic
   * "no lookup performed" user message instead.
   */
  private async normalizeBarcodeWithLookup(
    barcodeValue: string,
    firstCallToolUseId: string | null,
    lookupResult: BarcodeLookupResult | null
  ): Promise<BarcodeResolution> {
    const secondSystem =
      'You are the barcode normalization engine for Pura AI. Convert ' +
      'the lookup output into a canonical BarcodeResolution object.\n\n' +
      'Hard rules:\n' +
      '• Return EXACTLY ONE tool call to "return_barcode_resolution".\n' +
      '• Use only the provided schema. Do not write prose outside the ' +
      'tool.\n' +
      '• If the lookup failed (no result returned), set ' +
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

    const lookupSerialized = lookupResult
      ? JSON.stringify(lookupResult)
      : 'null';

    let secondMessages: SdkMessageParam[];

    if (firstCallToolUseId) {
      secondMessages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `barcode_value: ${barcodeValue}\n\n` +
                'Resolve this barcode by calling the lookup_barcode ' +
                'tool with the exact barcode_value above.',
            },
          ],
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: firstCallToolUseId,
              name: 'lookup_barcode',
              input: { barcode_value: barcodeValue },
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: firstCallToolUseId,
              content: lookupSerialized,
            },
            {
              type: 'text',
              text:
                `original_barcode_value: ${barcodeValue}\n` +
                `lookup_succeeded: ${lookupResult !== null}\n\n` +
                'Now return the canonical BarcodeResolution via the ' +
                'return_barcode_resolution tool.',
            },
          ],
        },
      ];
    } else {
      // Claude never called the lookup tool in step 1. Synthesise a
      // single user message describing the situation so the strict
      // tool call still has the data it needs.
      secondMessages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `barcode_value: ${barcodeValue}\n` +
                'lookup_succeeded: false\n' +
                'lookup_result: null\n\n' +
                'Return the canonical BarcodeResolution via the ' +
                'return_barcode_resolution tool. Mark ' +
                'fallback_needed=true and identity=null.',
            },
          ],
        },
      ];
    }

    const tool: SdkTool = {
      name: 'return_barcode_resolution',
      description:
        'Return the canonical structured BarcodeResolution after the host has performed the lookup.',
      input_schema: BARCODE_RESOLUTION_SCHEMA as SdkToolInputSchema,
    };

    const response = await this.anthropic.messages.create({
      model: CLAUDE_MODELS.extraction,
      max_tokens: CLAUDE_DEFAULTS.extraction.max_tokens,
      temperature: CLAUDE_DEFAULTS.extraction.temperature,
      system: secondSystem,
      tools: [tool],
      tool_choice: {
        type: 'tool',
        name: 'return_barcode_resolution',
        disable_parallel_tool_use:
          CLAUDE_DEFAULTS.extraction.disable_parallel_tool_use,
      },
      messages: secondMessages,
    });

    return this.assertSingleToolResult<BarcodeResolution>(
      response,
      'return_barcode_resolution'
    );
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
      '• Return EXACTLY ONE tool call to "return_product_match_result".\n' +
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
      'Rank the candidates and return the structured ProductMatchResult ' +
        'via the return_product_match_result tool.',
    ].join('\n');

    return this.runStrictTool<ProductMatchResult>({
      system,
      userContent,
      toolName: 'return_product_match_result',
      toolDescription:
        'Return the ranked product match result for this user against the candidate set.',
      inputSchema: PRODUCT_MATCH_RESULT_SCHEMA,
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
      '• Return EXACTLY ONE tool call to "return_routine_recommendation".\n' +
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
      'meaningful evening step that benefits from consistency ' +
      '(prescription-style actives, daily SPF reinforcement).\n' +
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
      'Return the structured RoutineRecommendation via the ' +
        'return_routine_recommendation tool.',
    ].join('\n');

    return this.runStrictTool<RoutineRecommendation>({
      system,
      userContent,
      toolName: 'return_routine_recommendation',
      toolDescription:
        'Return the structured routine recommendation tied to the scan and matched products.',
      inputSchema: ROUTINE_RECOMMENDATION_SCHEMA,
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
      '• Return EXACTLY ONE tool call to "return_skin_score_explanation".\n' +
      '• ALWAYS echo the `score`, `delta_reference`, and `delta_value` ' +
      'values from the user message into the tool output exactly as ' +
      'given. The schema requires them — do not omit them.\n' +
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
      'Return the structured SkinScoreExplanation via the ' +
        'return_skin_score_explanation tool.',
    ].join('\n');

    return this.runStrictTool<SkinScoreExplanation>({
      system,
      userContent,
      toolName: 'return_skin_score_explanation',
      toolDescription:
        'Return the plain-English explanation of the user’s current Skin Score.',
      inputSchema: SKIN_SCORE_EXPLANATION_SCHEMA,
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
      '• Return EXACTLY ONE tool call to "return_progress_explanation".\n' +
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
      'Return the structured ProgressExplanation via the ' +
        'return_progress_explanation tool.',
    ].join('\n');

    return this.runStrictTool<ProgressExplanation>({
      system,
      userContent,
      toolName: 'return_progress_explanation',
      toolDescription:
        'Return the structured progress explanation for the Progress destination.',
      inputSchema: PROGRESS_EXPLANATION_SCHEMA,
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
      '• Return EXACTLY ONE tool call to "return_search_suggestions".\n' +
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
      'Return the structured SearchSuggestionResult via the ' +
        'return_search_suggestions tool.',
    ].join('\n');

    return this.runStrictTool<SearchSuggestionResult>({
      system,
      userContent,
      toolName: 'return_search_suggestions',
      toolDescription:
        'Return contextual search suggestions for the current page and user state.',
      inputSchema: SEARCH_SUGGESTION_RESULT_SCHEMA,
    });
  }

  // --------------------------------------------------------------------------
  // 9. Assistant freeform answer.
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
      'active_product_identity, unless the user explicitly asks for ' +
      'general options. When asked for general options, name ' +
      'categories ("a salicylic acid cleanser") rather than fictional ' +
      'specific products.\n' +
      '• Keep answers under ~160 words unless the user asked for ' +
      'depth.\n' +
      '• Output plain prose. No tool calls. No JSON. No code fences.';

    const payload = {
      assistant_context: params.context,
      user_question: params.userQuestion,
    };

    // v10.40 — `claude-opus-4-7` rejects the `temperature` parameter
    // ("`temperature` is deprecated for this model.") and returns 400
    // invalid_request_error. The model bakes its own temperature in
    // via internal reasoning, so we must omit the field entirely for
    // opus-4-7+. This was the root cause of the v10.39 assistant
    // failures the user kept hitting in production.
    const usesDeprecatedTemperature = /^claude-opus-4-/.test(
      CLAUDE_MODELS.assistant
    );
    const requestParams: Anthropic.Messages.MessageCreateParamsNonStreaming = {
      model: CLAUDE_MODELS.assistant,
      max_tokens: CLAUDE_DEFAULTS.assistant.max_tokens,
      system,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: JSON.stringify(payload),
            },
          ],
        },
      ],
    };
    if (!usesDeprecatedTemperature) {
      requestParams.temperature = CLAUDE_DEFAULTS.assistant.temperature;
    }
    const response = await this.anthropic.messages.create(requestParams);

    const firstText = response.content.find(
      (b: SdkContentBlock): b is Anthropic.Messages.TextBlock =>
        b.type === 'text'
    );
    return firstText ? firstText.text : '';
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
 * Read ANTHROPIC_API_KEY from the environment and return a configured
 * ClaudeClient. Throws if the env var is missing or blank.
 *
 * The expectation is that this runs in a Node environment (server,
 * Expo dev tools, etc.). React Native screens should not call this
 * directly — they should hit a backend that proxies to ClaudeClient.
 */
export function createClaudeClientFromEnv(): ClaudeClient {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      'createClaudeClientFromEnv: ANTHROPIC_API_KEY is missing or blank.'
    );
  }
  return new ClaudeClient({ apiKey });
}

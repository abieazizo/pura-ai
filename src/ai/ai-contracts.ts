/**
 * Pura AI — central AI contract layer.
 *
 * This file is **client-safe**. It contains nothing but TypeScript
 * types, JSON schema literals, and configuration constants. It does
 * NOT import any provider SDK or Node-only module, so it can be
 * bundled by Metro into the React Native app and re-imported by the
 * server-only `openai-client.ts` at the same time.
 *
 * It defines:
 *   1. The user-facing TypeScript types every consumer reads.
 *   2. The strict JSON schemas the AI provider returns under
 *      structured-output / response_format=json_schema.
 *   3. The model + decoding configuration each flow uses.
 *
 * No prompt logic lives here — only contracts. The prompts and the
 * actual API calls live in `server/openai/openai-client.ts` (server-
 * only). UI screens and stores never see the OpenAI SDK; they go
 * through `src/ai/aiGateway.ts` which talks to the proxy via fetch.
 *
 * Keep schemas and TS types in lockstep — every required field on a
 * schema must have a matching field on the corresponding interface,
 * and vice versa.
 */

// ============================================================================
// Primitive enums — shared across face scan, product, routine, progress.
// ============================================================================

export type ConcernType =
  | 'breakouts'
  | 'hydration'
  | 'texture'
  | 'dark_marks'
  | 'redness'
  | 'oiliness'
  | 'sensitivity'
  | 'pores';

export type Severity = 'none' | 'low' | 'mild' | 'moderate' | 'high';

export type Direction = 'better' | 'same' | 'worse' | 'new';

export type FaceRegion =
  | 'forehead'
  | 't_zone'
  | 'left_cheek'
  | 'right_cheek'
  | 'nose'
  | 'chin'
  | 'jawline'
  | 'under_eyes'
  | 'across_face';

export type ProductCategory =
  | 'cleanser'
  | 'serum'
  | 'moisturizer'
  | 'spot_treatment'
  | 'toner'
  | 'spf'
  | 'mask'
  | 'unknown';

export type RoutineSlot = 'morning' | 'evening' | 'saved';

/** Shape of a JSON Schema document. Bag-of-keys to keep schema literals
 *  ergonomic; cast at SDK boundaries. */
export type JsonSchema = Record<string, unknown>;

// ============================================================================
// Face scan analysis — the upstream of every other AI flow.
// ============================================================================

export interface FaceConcernFinding {
  concern: ConcernType;
  severity: Severity;
  direction_vs_previous: Direction;
  /** 0..1 model confidence in this finding. */
  confidence: number;
  regions: FaceRegion[];
  /** Plain English, ≤ 1 short sentence. */
  user_summary: string;
  /** Drier clinical phrasing for advanced surfaces / assistant context. */
  clinician_style_summary: string;
  /** 0 = do not surface, 1 = primary, 2 = secondary, 3 = supporting. */
  marker_priority: 0 | 1 | 2 | 3;
}

export interface FaceScanAnalysis {
  scan_id: string;
  analyzed_at_iso: string;
  image_quality: {
    usable: boolean;
    issues: Array<'blurry' | 'low_light' | 'angled' | 'partial_face' | 'occluded'>;
    confidence: number;
  };
  skin_score: {
    /** Integer 0..100. */
    value: number;
    band: 'poor' | 'fair' | 'good' | 'great';
    /** Integer change vs previous scan; null on first scan. */
    delta_vs_previous: number | null;
    /** Integer change vs day-1 baseline; null on first scan. */
    delta_vs_baseline: number | null;
    /** Short why: "Breakouts calming. Hydration still needs work." */
    why_line: string;
    /** One concise sentence elaborating on the why. */
    explanation: string;
  };
  primary_concern: ConcernType | null;
  secondary_concerns: ConcernType[];
  findings: FaceConcernFinding[];
  /** 0..100 sub-scores per concern axis. Drives the dial fill colour
   *  and feeds structured summaries into the matching engine. */
  score_factors: {
    breakouts: number;
    hydration: number;
    texture: number;
    dark_marks: number;
    redness: number;
    oiliness: number;
    sensitivity: number;
    pores: number;
  };
  next_focus: {
    tonight: string[];
    avoid: string[];
  };
  plan_inputs: {
    target_concerns: ConcernType[];
    preferred_product_categories: Exclude<ProductCategory, 'unknown'>[];
    contraindication_tags: string[];
  };
}

// ============================================================================
// Product identity — image scan and barcode resolution converge here.
// ============================================================================

export interface ProductIdentity {
  source: 'barcode' | 'image' | 'hybrid';
  /** 0..1 confidence in the resolved identity. */
  confidence: number;
  /** True only when both brand AND product_name resolved with confidence. */
  resolved: boolean;
  brand: string | null;
  product_name: string | null;
  /** "{Brand} {Product Name}" canonicalised for catalog lookup. */
  canonical_title: string | null;
  product_category: ProductCategory;
  likely_concerns_supported: ConcernType[];
  /** Marketing-style claims surfaced from packaging ("salicylic acid 2%"). */
  key_claims: string[];
  barcode_value: string | null;
  /** Slug-style key for an internal catalog: "cerave-foaming-cleanser". */
  catalog_lookup_key: string | null;
  /** Free-text observations about the package (colour, language, etc.). */
  packaging_notes: string;
}

export interface BarcodeResolution {
  barcode_value: string;
  found: boolean;
  matched_catalog_product_id: string | null;
  identity: ProductIdentity | null;
  /** True when the AI couldn't confidently confirm identity from the
   *  lookup data — caller should prompt the user or take an image. */
  fallback_needed: boolean;
}

// ============================================================================
// Product matching — ranks a set of candidate products against the user.
// ============================================================================

export interface ProductMatch {
  product_id: string;
  /** Integer 0..100, calibrated within the candidate set. */
  match_score: number;
  match_band: 'weak' | 'fair' | 'strong' | 'excellent';
  /** Up to ~3 short bullet reasons surfaced on cards. */
  primary_reasons: string[];
  target_concerns: ConcernType[];
  recommended_slot: RoutineSlot;
  /** True for clean / natural / fragrance-free picks. */
  natural_option: boolean;
  /** Tags the user should avoid this product if they have. */
  avoid_if_tags: string[];
}

export interface ProductMatchResult {
  for_user_id: string;
  based_on_scan_id: string | null;
  top_pick_product_id: string | null;
  matches: ProductMatch[];
  alternatives: ProductMatch[];
}

// ============================================================================
// Routine — the action layer attached to matched products.
// ============================================================================

export interface RoutineAction {
  slot: RoutineSlot;
  /** 1-indexed step within the slot. */
  step_order: number;
  /** Headline-form: "Calming gel on chin". */
  title: string;
  /** Imperative sentence the user reads in the row detail. */
  instruction: string;
  linked_product_id: string | null;
  /** Why this step exists, grounded in scan findings. */
  reason: string;
}

export interface RoutineRecommendation {
  based_on_scan_id: string | null;
  /** "Tonight: barrier repair, no actives." */
  headline: string;
  /** One sentence the TODAY focus card surfaces. */
  tonight_focus: string;
  morning: RoutineAction[];
  evening: RoutineAction[];
  saved_for_later: RoutineAction[];
  /** True when a daily reminder would meaningfully help adherence. */
  reminder_recommended: boolean;
}

// ============================================================================
// Score + progress — explanation engines.
// ============================================================================

export interface SkinScoreExplanation {
  /** Integer 0..100. */
  score: number;
  band: 'poor' | 'fair' | 'good' | 'great';
  /** Which baseline the delta_value compares against. */
  delta_reference: 'previous_scan' | 'baseline' | 'none';
  delta_value: number | null;
  /** ≤ 5 words: "Up 4 from your last scan." */
  short_status: string;
  /** ≤ 1 short sentence naming what moved. */
  why_line: string;
  /** One coaching sentence the user can act on. */
  coach_line: string;
}

export interface ProgressExplanation {
  /** "Breakouts moved from moderate to mild." */
  strongest_improvement: string;
  /** "Hydration slipped to moderate." — null when nothing regressed. */
  strongest_regression: string | null;
  /** "Texture and dark marks are holding steady." */
  unchanged_summary: string;
  /** Two-three sentence editorial paragraph for the Progress hero. */
  short_narrative: string;
  /** Caption for the day-1-vs-today compare slider. */
  compare_caption: string;
}

// ============================================================================
// Assistant context — every grounding signal the assistant needs.
// ============================================================================

export interface AssistantContext {
  user_profile: {
    skin_type: 'dry' | 'oily' | 'combination' | 'sensitive' | 'normal' | 'unknown';
    top_goals: string[];
    sensitivities: string[];
  };
  latest_scan: FaceScanAnalysis | null;
  latest_score: SkinScoreExplanation | null;
  routine_snapshot: {
    morning_product_ids: string[];
    evening_product_ids: string[];
    saved_product_ids: string[];
  };
  progress_snapshot: ProgressExplanation | null;
  top_matches: ProductMatch[];
  active_product_identity: ProductIdentity | null;
}

// ============================================================================
// Search suggestions — the AISearchBar's intelligent prefill + chips.
// ============================================================================

export interface SearchSuggestionResult {
  /** Placeholder rotated through the search field. */
  prefill_placeholder: string;
  /** Tap-to-search chips above the results list. */
  suggestion_chips: string[];
  /** Refinement chips shown after a query lands. */
  refinement_chips: string[];
}

// ============================================================================
// Model + decoding configuration.
// ============================================================================

/**
 * Provider model configuration.
 *
 * v11.1 — legacy `CLAUDE_*` aliases removed. Single source of truth
 * is now `AI_MODELS` / `AI_DEFAULTS`. Any future provider swap
 * happens here in one place; no shim layer hides which provider is
 * actually live.
 *
 * Model strategy:
 *   • `extraction` (gpt-5-mini) — fast, vision-capable, cheap, runs
 *     every structured workflow (face scan, product image, barcode
 *     normalization, product matching, routine, skin score, progress,
 *     search suggestions). Strict JSON-schema response_format keeps
 *     output validated.
 *   • `assistant` (gpt-5) — strongest reasoning for the freeform
 *     grounded assistant answers. NOTE: gpt-5 rejects the
 *     `temperature` parameter (it bakes its own internal reasoning
 *     temperature in), so the OpenAI client omits it for that model.
 */
export interface AIModelConfig {
  extraction: 'gpt-5-mini';
  assistant: 'gpt-5';
}

export const AI_MODELS: AIModelConfig = {
  extraction: 'gpt-5-mini',
  assistant: 'gpt-5',
};

export const AI_DEFAULTS = {
  extraction: {
    temperature: 0,
    max_tokens: 4096,
    /**
     * Carried over for parity with the legacy interface. Not used by
     * the OpenAI client — strict json_schema response_format implies
     * single-call structured output. Kept on the type so existing
     * server-side handlers that read it still compile.
     */
    disable_parallel_tool_use: true,
  },
  assistant: {
    temperature: 0.2,
    max_tokens: 1500,
  },
} as const;

// ============================================================================
// JSON schemas — strict tool input contracts.
//
// Every required field on a schema below maps 1:1 to a required field on
// the corresponding TS interface above. Nullable fields use the JSON
// Schema array-type form ("type": ["string", "null"]) for primitives or
// "oneOf" with a "null" branch for objects. Every object uses
// additionalProperties: false so Claude can't smuggle in unknown keys.
// ============================================================================

const CONCERN_TYPE_ENUM: readonly ConcernType[] = [
  'breakouts',
  'hydration',
  'texture',
  'dark_marks',
  'redness',
  'oiliness',
  'sensitivity',
  'pores',
];

const SEVERITY_ENUM: readonly Severity[] = [
  'none',
  'low',
  'mild',
  'moderate',
  'high',
];

const DIRECTION_ENUM: readonly Direction[] = [
  'better',
  'same',
  'worse',
  'new',
];

const FACE_REGION_ENUM: readonly FaceRegion[] = [
  'forehead',
  't_zone',
  'left_cheek',
  'right_cheek',
  'nose',
  'chin',
  'jawline',
  'under_eyes',
  'across_face',
];

const PRODUCT_CATEGORY_ENUM: readonly ProductCategory[] = [
  'cleanser',
  'serum',
  'moisturizer',
  'spot_treatment',
  'toner',
  'spf',
  'mask',
  'unknown',
];

const PRODUCT_CATEGORY_NON_UNKNOWN_ENUM: readonly Exclude<
  ProductCategory,
  'unknown'
>[] = [
  'cleanser',
  'serum',
  'moisturizer',
  'spot_treatment',
  'toner',
  'spf',
  'mask',
];

const ROUTINE_SLOT_ENUM: readonly RoutineSlot[] = [
  'morning',
  'evening',
  'saved',
];

const SCORE_BAND_ENUM = ['poor', 'fair', 'good', 'great'] as const;

const MATCH_BAND_ENUM = ['weak', 'fair', 'strong', 'excellent'] as const;

const IMAGE_QUALITY_ISSUE_ENUM = [
  'blurry',
  'low_light',
  'angled',
  'partial_face',
  'occluded',
] as const;

const DELTA_REFERENCE_ENUM = ['previous_scan', 'baseline', 'none'] as const;

// ----------------------------------------------------------------------------
// Face scan analysis schema.
// ----------------------------------------------------------------------------

export const FACE_SCAN_ANALYSIS_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'scan_id',
    'analyzed_at_iso',
    'image_quality',
    'skin_score',
    'primary_concern',
    'secondary_concerns',
    'findings',
    'score_factors',
    'next_focus',
    'plan_inputs',
  ],
  properties: {
    scan_id: { type: 'string' },
    analyzed_at_iso: {
      type: 'string',
      description: 'ISO 8601 timestamp the analysis was produced at.',
    },
    image_quality: {
      type: 'object',
      additionalProperties: false,
      required: ['usable', 'issues', 'confidence'],
      properties: {
        usable: { type: 'boolean' },
        issues: {
          type: 'array',
          items: { type: 'string', enum: [...IMAGE_QUALITY_ISSUE_ENUM] },
        },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
    skin_score: {
      type: 'object',
      additionalProperties: false,
      required: [
        'value',
        'band',
        'delta_vs_previous',
        'delta_vs_baseline',
        'why_line',
        'explanation',
      ],
      properties: {
        value: { type: 'integer', minimum: 0, maximum: 100 },
        band: { type: 'string', enum: [...SCORE_BAND_ENUM] },
        delta_vs_previous: { type: ['integer', 'null'] },
        delta_vs_baseline: { type: ['integer', 'null'] },
        why_line: { type: 'string' },
        explanation: { type: 'string' },
      },
    },
    primary_concern: {
      oneOf: [
        { type: 'string', enum: [...CONCERN_TYPE_ENUM] },
        { type: 'null' },
      ],
    },
    secondary_concerns: {
      type: 'array',
      items: { type: 'string', enum: [...CONCERN_TYPE_ENUM] },
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'concern',
          'severity',
          'direction_vs_previous',
          'confidence',
          'regions',
          'user_summary',
          'clinician_style_summary',
          'marker_priority',
        ],
        properties: {
          concern: { type: 'string', enum: [...CONCERN_TYPE_ENUM] },
          severity: { type: 'string', enum: [...SEVERITY_ENUM] },
          direction_vs_previous: {
            type: 'string',
            enum: [...DIRECTION_ENUM],
          },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          regions: {
            type: 'array',
            items: { type: 'string', enum: [...FACE_REGION_ENUM] },
          },
          user_summary: { type: 'string' },
          clinician_style_summary: { type: 'string' },
          marker_priority: { type: 'integer', enum: [0, 1, 2, 3] },
        },
      },
    },
    score_factors: {
      type: 'object',
      additionalProperties: false,
      required: [
        'breakouts',
        'hydration',
        'texture',
        'dark_marks',
        'redness',
        'oiliness',
        'sensitivity',
        'pores',
      ],
      properties: {
        breakouts: { type: 'integer', minimum: 0, maximum: 100 },
        hydration: { type: 'integer', minimum: 0, maximum: 100 },
        texture: { type: 'integer', minimum: 0, maximum: 100 },
        dark_marks: { type: 'integer', minimum: 0, maximum: 100 },
        redness: { type: 'integer', minimum: 0, maximum: 100 },
        oiliness: { type: 'integer', minimum: 0, maximum: 100 },
        sensitivity: { type: 'integer', minimum: 0, maximum: 100 },
        pores: { type: 'integer', minimum: 0, maximum: 100 },
      },
    },
    next_focus: {
      type: 'object',
      additionalProperties: false,
      required: ['tonight', 'avoid'],
      properties: {
        tonight: {
          type: 'array',
          items: { type: 'string' },
        },
        avoid: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    plan_inputs: {
      type: 'object',
      additionalProperties: false,
      required: [
        'target_concerns',
        'preferred_product_categories',
        'contraindication_tags',
      ],
      properties: {
        target_concerns: {
          type: 'array',
          items: { type: 'string', enum: [...CONCERN_TYPE_ENUM] },
        },
        preferred_product_categories: {
          type: 'array',
          items: {
            type: 'string',
            enum: [...PRODUCT_CATEGORY_NON_UNKNOWN_ENUM],
          },
        },
        contraindication_tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  },
};

// ----------------------------------------------------------------------------
// Product identity schema.
// ----------------------------------------------------------------------------

export const PRODUCT_IDENTITY_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'source',
    'confidence',
    'resolved',
    'brand',
    'product_name',
    'canonical_title',
    'product_category',
    'likely_concerns_supported',
    'key_claims',
    'barcode_value',
    'catalog_lookup_key',
    'packaging_notes',
  ],
  properties: {
    source: { type: 'string', enum: ['barcode', 'image', 'hybrid'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    resolved: { type: 'boolean' },
    brand: { type: ['string', 'null'] },
    product_name: { type: ['string', 'null'] },
    canonical_title: { type: ['string', 'null'] },
    product_category: { type: 'string', enum: [...PRODUCT_CATEGORY_ENUM] },
    likely_concerns_supported: {
      type: 'array',
      items: { type: 'string', enum: [...CONCERN_TYPE_ENUM] },
    },
    key_claims: {
      type: 'array',
      items: { type: 'string' },
    },
    barcode_value: { type: ['string', 'null'] },
    catalog_lookup_key: { type: ['string', 'null'] },
    packaging_notes: { type: 'string' },
  },
};

// ----------------------------------------------------------------------------
// Barcode lookup tool schema (the tool Claude calls out to during the
// barcode resolution loop) + barcode resolution result schema.
// ----------------------------------------------------------------------------

export const BARCODE_LOOKUP_TOOL_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['barcode_value'],
  properties: {
    barcode_value: {
      type: 'string',
      description: 'The raw barcode digits the user scanned.',
    },
  },
};

export const BARCODE_RESOLUTION_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'barcode_value',
    'found',
    'matched_catalog_product_id',
    'identity',
    'fallback_needed',
  ],
  properties: {
    barcode_value: { type: 'string' },
    found: { type: 'boolean' },
    matched_catalog_product_id: { type: ['string', 'null'] },
    identity: {
      oneOf: [PRODUCT_IDENTITY_SCHEMA, { type: 'null' }],
    },
    fallback_needed: { type: 'boolean' },
  },
};

// ----------------------------------------------------------------------------
// Product matching result schema.
// ----------------------------------------------------------------------------

const PRODUCT_MATCH_ITEM_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'product_id',
    'match_score',
    'match_band',
    'primary_reasons',
    'target_concerns',
    'recommended_slot',
    'natural_option',
    'avoid_if_tags',
  ],
  properties: {
    product_id: { type: 'string' },
    match_score: { type: 'integer', minimum: 0, maximum: 100 },
    match_band: { type: 'string', enum: [...MATCH_BAND_ENUM] },
    primary_reasons: {
      type: 'array',
      items: { type: 'string' },
    },
    target_concerns: {
      type: 'array',
      items: { type: 'string', enum: [...CONCERN_TYPE_ENUM] },
    },
    recommended_slot: { type: 'string', enum: [...ROUTINE_SLOT_ENUM] },
    natural_option: { type: 'boolean' },
    avoid_if_tags: {
      type: 'array',
      items: { type: 'string' },
    },
  },
};

export const PRODUCT_MATCH_RESULT_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'for_user_id',
    'based_on_scan_id',
    'top_pick_product_id',
    'matches',
    'alternatives',
  ],
  properties: {
    for_user_id: { type: 'string' },
    based_on_scan_id: { type: ['string', 'null'] },
    top_pick_product_id: { type: ['string', 'null'] },
    matches: {
      type: 'array',
      items: PRODUCT_MATCH_ITEM_SCHEMA,
    },
    alternatives: {
      type: 'array',
      items: PRODUCT_MATCH_ITEM_SCHEMA,
    },
  },
};

// ----------------------------------------------------------------------------
// Routine recommendation schema.
// ----------------------------------------------------------------------------

const ROUTINE_ACTION_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'slot',
    'step_order',
    'title',
    'instruction',
    'linked_product_id',
    'reason',
  ],
  properties: {
    slot: { type: 'string', enum: [...ROUTINE_SLOT_ENUM] },
    step_order: { type: 'integer', minimum: 1 },
    title: { type: 'string' },
    instruction: { type: 'string' },
    linked_product_id: { type: ['string', 'null'] },
    reason: { type: 'string' },
  },
};

export const ROUTINE_RECOMMENDATION_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'based_on_scan_id',
    'headline',
    'tonight_focus',
    'morning',
    'evening',
    'saved_for_later',
    'reminder_recommended',
  ],
  properties: {
    based_on_scan_id: { type: ['string', 'null'] },
    headline: { type: 'string' },
    tonight_focus: { type: 'string' },
    morning: { type: 'array', items: ROUTINE_ACTION_SCHEMA },
    evening: { type: 'array', items: ROUTINE_ACTION_SCHEMA },
    saved_for_later: { type: 'array', items: ROUTINE_ACTION_SCHEMA },
    reminder_recommended: { type: 'boolean' },
  },
};

// ----------------------------------------------------------------------------
// Skin score explanation schema.
// ----------------------------------------------------------------------------

export const SKIN_SCORE_EXPLANATION_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'score',
    'band',
    'delta_reference',
    'delta_value',
    'short_status',
    'why_line',
    'coach_line',
  ],
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 100 },
    band: { type: 'string', enum: [...SCORE_BAND_ENUM] },
    delta_reference: { type: 'string', enum: [...DELTA_REFERENCE_ENUM] },
    delta_value: { type: ['integer', 'null'] },
    short_status: { type: 'string' },
    why_line: { type: 'string' },
    coach_line: { type: 'string' },
  },
};

// ----------------------------------------------------------------------------
// Progress explanation schema.
// ----------------------------------------------------------------------------

export const PROGRESS_EXPLANATION_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'strongest_improvement',
    'strongest_regression',
    'unchanged_summary',
    'short_narrative',
    'compare_caption',
  ],
  properties: {
    strongest_improvement: { type: 'string' },
    strongest_regression: { type: ['string', 'null'] },
    unchanged_summary: { type: 'string' },
    short_narrative: { type: 'string' },
    compare_caption: { type: 'string' },
  },
};

// ----------------------------------------------------------------------------
// Search suggestion schema.
// ----------------------------------------------------------------------------

export const SEARCH_SUGGESTION_RESULT_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['prefill_placeholder', 'suggestion_chips', 'refinement_chips'],
  properties: {
    prefill_placeholder: { type: 'string' },
    suggestion_chips: {
      type: 'array',
      items: { type: 'string' },
    },
    refinement_chips: {
      type: 'array',
      items: { type: 'string' },
    },
  },
};

// ============================================================================
// Aggregate map — every named schema indexed by its variable name. Useful
// for telemetry, debugging, and any consumer that needs to enumerate
// schemas (e.g. a dev console "show all AI schemas" panel).
// ============================================================================

export interface AIStructuredSchemas {
  FACE_SCAN_ANALYSIS_SCHEMA: JsonSchema;
  PRODUCT_IDENTITY_SCHEMA: JsonSchema;
  BARCODE_LOOKUP_TOOL_SCHEMA: JsonSchema;
  BARCODE_RESOLUTION_SCHEMA: JsonSchema;
  PRODUCT_MATCH_RESULT_SCHEMA: JsonSchema;
  ROUTINE_RECOMMENDATION_SCHEMA: JsonSchema;
  SKIN_SCORE_EXPLANATION_SCHEMA: JsonSchema;
  PROGRESS_EXPLANATION_SCHEMA: JsonSchema;
  SEARCH_SUGGESTION_RESULT_SCHEMA: JsonSchema;
}

export const AI_STRUCTURED_SCHEMAS: AIStructuredSchemas = {
  FACE_SCAN_ANALYSIS_SCHEMA,
  PRODUCT_IDENTITY_SCHEMA,
  BARCODE_LOOKUP_TOOL_SCHEMA,
  BARCODE_RESOLUTION_SCHEMA,
  PRODUCT_MATCH_RESULT_SCHEMA,
  ROUTINE_RECOMMENDATION_SCHEMA,
  SKIN_SCORE_EXPLANATION_SCHEMA,
  PROGRESS_EXPLANATION_SCHEMA,
  SEARCH_SUGGESTION_RESULT_SCHEMA,
};

// v11.1 — legacy `Claude*` schema aliases removed.

// ============================================================================
// Cross-boundary shared types — used by both client gateway (proxy
// request shapes) and server openai-client. Defined here because they
// describe wire-level data, not SDK-specific shapes.
// ============================================================================

/** Image MIME types supported by the AI image-bearing methods. */
export type SupportedImageMediaType = 'image/jpeg' | 'image/png';

/**
 * Result the host's barcode lookup function returns to the AI
 * inside `normalizeBarcodeResolution`. Lives in this file (not in
 * the provider client) because both the server proxy's
 * `lib/barcodeLookup.ts` and the validators here reference it.
 */
export interface BarcodeLookupResult {
  matched_catalog_product_id: string | null;
  brand: string | null;
  product_name: string | null;
  canonical_title: string | null;
  product_category: Exclude<ProductCategory, 'unknown'> | 'unknown';
  likely_concerns_supported: ConcernType[];
  key_claims: string[];
  barcode_value: string;
  catalog_lookup_key: string | null;
  packaging_notes: string;
}

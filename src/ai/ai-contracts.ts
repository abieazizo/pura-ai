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
  /**
   * v17.0 — image-anchored polygon for this finding.
   *
   * Coordinates are normalised 0..1 against the captured image
   * dimensions (NOT against the face_box). 3-12 points outlining
   * where the model VISUALLY observes this concern in the captured
   * image. Used by the FaceSkinMap component to render an overlay
   * on the actual photo, not on a generic anatomical template.
   *
   * Optional because old persisted scans don't have this field.
   * New AI runs always populate it (the schema requires it).
   */
  region_polygon?: Array<{ x: number; y: number }>;
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
  /**
   * v17.0 — image-anchored face overlay.
   *
   * The AI returns the actual face bounding box + facial landmarks
   * normalised 0..1 against the captured image dimensions. The
   * FaceSkinMap component uses these to anchor concern overlays
   * onto the user's REAL face in the photo, not a generic
   * anatomical template.
   *
   * Optional because old persisted scans don't have it. New AI
   * runs always populate it.
   */
  face_overlay?: {
    face_box: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    landmarks: {
      left_eye: { x: number; y: number };
      right_eye: { x: number; y: number };
      nose_tip: { x: number; y: number };
      mouth_center: { x: number; y: number };
      chin: { x: number; y: number };
      forehead_center: { x: number; y: number };
    };
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
// v11.7 — Scan preflight.
//
// Expo Go cannot do real-time face detection (no native ML-Kit / no
// vision-camera in Expo Go). Instead of pretending to know face
// alignment BEFORE capture, the app captures, then runs a fast
// vision call to validate the photo BEFORE spending tokens on the
// full FaceScanAnalysis path. If the preflight rejects the photo,
// the UI surfaces a smart condition-aware error instead of running
// the expensive analysis on a known-bad capture.
// ============================================================================

export type ScanPreflightReason =
  | 'ok'
  | 'no_face'
  | 'partial_face'
  | 'too_dark'
  | 'too_blurry'
  | 'not_centered'
  | 'unknown';

export interface ScanPreflightResult {
  /** Whether a face is visible at all in the captured photo. */
  face_present: boolean;
  /** Whether the visible face has all key features (forehead, both
   *  cheeks, chin) inside the frame. False = cropped at an edge. */
  full_face_visible: boolean;
  /** Whether the face is roughly centered (center within the
   *  middle third of both axes). False = significantly off-center. */
  centered_enough: boolean;
  /** Whether the photo's lighting is acceptable for analysis. */
  lighting_ok: boolean;
  /** Whether the photo is sharp enough to read skin texture from. */
  blur_ok: boolean;
  /** Face bounds normalised to [0, 1] of the photo's natural width
   *  and height. Null when no face was detected. The analyzing
   *  screen uses this to anchor region overlays (cheeks, chin, etc)
   *  to the actual face position. */
  face_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  /** Single most-actionable reason. UI maps this to copy. */
  reason: ScanPreflightReason;
  /** Short user-facing retry message — already friendly + premium. */
  retry_message: string;
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
    /**
     * v19.11 — saved display name from onboarding (null when the
     * user hasn't entered one). The assistant uses this to answer
     * profile-aware questions like "What's my name?". When null,
     * the assistant must say it has no saved name on file rather
     * than inventing one.
     */
    display_name: string | null;
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
    // v19.5 — bumped 1500 → 4096. GPT-5's reasoning tokens count
    // against the same budget as output content. The 1500 cap was
    // regularly producing finish_reason="length" + empty content,
    // which then failed validateAssistantAnswer and surfaced as
    // "answerAssistant returned a payload that failed structural
    // validation". 4096 leaves enough head-room for reasoning +
    // a real assistant reply.
    max_tokens: 4096,
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
    'face_overlay',
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
          'region_polygon',
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
          // v17.0 — image-anchored polygon outlining where the model
          // visually observes this concern. Coordinates normalized
          // 0..1 against the captured image dimensions.
          region_polygon: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['x', 'y'],
              properties: {
                x: { type: 'number', minimum: 0, maximum: 1 },
                y: { type: 'number', minimum: 0, maximum: 1 },
              },
            },
          },
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
    // v17.0 — image-anchored face overlay (real face_box +
    // landmarks). All coordinates normalized 0..1 against the
    // captured image. Drives the FaceSkinMap component.
    face_overlay: {
      type: 'object',
      additionalProperties: false,
      required: ['face_box', 'landmarks'],
      properties: {
        face_box: {
          type: 'object',
          additionalProperties: false,
          required: ['x', 'y', 'width', 'height'],
          properties: {
            x: { type: 'number', minimum: 0, maximum: 1 },
            y: { type: 'number', minimum: 0, maximum: 1 },
            width: { type: 'number', minimum: 0, maximum: 1 },
            height: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
        landmarks: {
          type: 'object',
          additionalProperties: false,
          required: [
            'left_eye',
            'right_eye',
            'nose_tip',
            'mouth_center',
            'chin',
            'forehead_center',
          ],
          properties: {
            left_eye: pointSchema(),
            right_eye: pointSchema(),
            nose_tip: pointSchema(),
            mouth_center: pointSchema(),
            chin: pointSchema(),
            forehead_center: pointSchema(),
          },
        },
      },
    },
  },
};

// Helper for the repeated {x, y} normalized point schema.
function pointSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['x', 'y'],
    properties: {
      x: { type: 'number', minimum: 0, maximum: 1 },
      y: { type: 'number', minimum: 0, maximum: 1 },
    },
  };
}

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
// v11.7 — Scan preflight schema.
// Strict JSON schema for the fast vision call that validates a
// captured photo before the expensive FaceScanAnalysis fires.
// ----------------------------------------------------------------------------

const PREFLIGHT_REASON_ENUM: readonly ScanPreflightReason[] = [
  'ok',
  'no_face',
  'partial_face',
  'too_dark',
  'too_blurry',
  'not_centered',
  'unknown',
];

export const SCAN_PREFLIGHT_RESULT_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'face_present',
    'full_face_visible',
    'centered_enough',
    'lighting_ok',
    'blur_ok',
    'face_box',
    'reason',
    'retry_message',
  ],
  properties: {
    face_present: { type: 'boolean' },
    full_face_visible: { type: 'boolean' },
    centered_enough: { type: 'boolean' },
    lighting_ok: { type: 'boolean' },
    blur_ok: { type: 'boolean' },
    face_box: {
      oneOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['x', 'y', 'width', 'height'],
          properties: {
            x: { type: 'number', minimum: 0, maximum: 1 },
            y: { type: 'number', minimum: 0, maximum: 1 },
            width: { type: 'number', minimum: 0, maximum: 1 },
            height: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
        { type: 'null' },
      ],
    },
    reason: { type: 'string', enum: [...PREFLIGHT_REASON_ENUM] },
    retry_message: { type: 'string' },
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

// ----------------------------------------------------------------------------
// v18.0 — Live product retrieval contract.
//
// Replaces the v7.6 seed-catalog-as-primary-inventory pattern. The
// AI is asked to recommend real, named products tied to either a
// scan-driven concern context or an explicit search query. Results
// flow into the same UI surfaces (scan results hero/alternatives,
// product search, assistant inline cards) as the live source of
// truth; the seed catalog is reduced to a quiet emergency fallback
// for users who have never been online with the proxy reachable.
//
// Why "live" works under Expo Go: the AI is the inventory. GPT
// knows the world's skincare products by brand + name + ingredients
// + claimed benefits. A structured-output call produces a vetted
// list of real picks for the user's actual concern, ranked, with
// "why this product" reasoning attached. Image / price / merchant
// URL are best-effort: when the AI knows them confidently they're
// returned; when it doesn't the client renders the brand wordmark
// placeholder + a search-on-merchant CTA.
// ----------------------------------------------------------------------------

export interface LiveProductCandidate {
  /** Stable id derived from brand+name (slug). */
  id: string;
  brand: string;
  name: string;
  category: ProductCategory;
  /** Concerns this product is intended to address, AI-tagged. */
  concernTags: ConcernType[];
  /** Skin-type fitness ("oily", "dry", "sensitive", "combination",
   *  "normal", "all"). Free-form lowercase strings. */
  skinTypeTags: string[];
  /** 2-5 hero ingredients ("salicylic acid 2%", "niacinamide 10%"). */
  ingredientsHighlights: string[];
  /** Best-effort retail price the AI is confident about. Null when
   *  the AI didn't know — the card hides the price, never invents. */
  price: number | null;
  /** ISO 4217 currency code: "USD", "GBP", "EUR". Default "USD". */
  currency: string;
  /** Merchant the productUrl points at ("Sephora", "Brand DTC"). */
  merchantName: string | null;
  /** Direct URL to a real merchant or brand product page. Null is
   *  honest — never fabricate a URL. */
  productUrl: string | null;
  /** Best-effort packshot URL. Null is honest. */
  imageUrl: string | null;
  imageSource: 'merchant' | 'brand' | 'obf' | 'none';
  /**
   * v19.40 — image quality tier carried through from the backend.
   * `null` when no usable image was selected. The card prefers
   * higher tiers; `imageCompleteness` in the trust scorer reads
   * the tier so packshot-quality images outrank thumb-only.
   */
  imageQuality?: 'high' | 'medium' | 'low' | null;
  /** Short reason describing the imageQuality tier. */
  imageQualityReason?: string;
  shortDescription: string;
  /** Why this product matches the user's specific concern. */
  matchReason: string;
  /** "available" when the AI is confident the product is actively
   *  sold; "unknown" otherwise. */
  availability: 'available' | 'unknown';
  /** ISO timestamp of when the AI returned this candidate — used to
   *  age the client cache. */
  sourceTimestamp: string;
  /** 0..100 ranked confidence within the result set. */
  matchScore: number;
}

export interface LiveProductLookupResult {
  /** The query that produced this set, echoed back. Either a free
   *  query string or a structured concern-derived prompt. */
  query: string;
  /** Sorted by matchScore desc. */
  candidates: LiveProductCandidate[];
  /** Server-side hint: did the AI feel it had enough context to
   *  answer well? Drives client UI ("we found 8 strong matches"
   *  vs "you may want to refine the query"). */
  confidence: 'high' | 'medium' | 'low';
}

const LIVE_PRODUCT_CANDIDATE_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'brand',
    'name',
    'category',
    'concernTags',
    'skinTypeTags',
    'ingredientsHighlights',
    'price',
    'currency',
    'merchantName',
    'productUrl',
    'imageUrl',
    'imageSource',
    'shortDescription',
    'matchReason',
    'availability',
    'matchScore',
  ],
  properties: {
    id: { type: 'string' },
    brand: { type: 'string' },
    name: { type: 'string' },
    category: { type: 'string', enum: [...PRODUCT_CATEGORY_ENUM] },
    concernTags: {
      type: 'array',
      items: { type: 'string', enum: [...CONCERN_TYPE_ENUM] },
    },
    skinTypeTags: {
      type: 'array',
      items: { type: 'string' },
    },
    ingredientsHighlights: {
      type: 'array',
      items: { type: 'string' },
    },
    price: { type: ['number', 'null'] },
    currency: { type: 'string' },
    merchantName: { type: ['string', 'null'] },
    productUrl: { type: ['string', 'null'] },
    imageUrl: { type: ['string', 'null'] },
    imageSource: {
      type: 'string',
      enum: ['merchant', 'brand', 'obf', 'none'],
    },
    shortDescription: { type: 'string' },
    matchReason: { type: 'string' },
    availability: { type: 'string', enum: ['available', 'unknown'] },
    matchScore: { type: 'integer', minimum: 0, maximum: 100 },
  },
};

export const LIVE_PRODUCT_LOOKUP_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['query', 'candidates', 'confidence'],
  properties: {
    query: { type: 'string' },
    candidates: {
      type: 'array',
      items: LIVE_PRODUCT_CANDIDATE_SCHEMA,
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
};

// ----------------------------------------------------------------------------
// v19.9 — LEAN live product schema for the AI call.
//
// Why a separate schema: the original LIVE_PRODUCT_CANDIDATE_SCHEMA forces
// the model to emit 16 strict-required fields per candidate. Four of them
// (merchantName, productUrl, imageUrl, imageSource) are 100% deterministic
// — they're filled in by `sanitizeAndEnrich` from a small brand→DTC table
// + a Sephora-search fallback. Asking GPT-5-mini to synthesise them adds
// ~150 lines of system prompt explaining URL precedence and ~25% to every
// candidate's output token count, both of which it just gets wrong often
// enough that we have to sanitise them anyway.
//
// The lean schema asks the model for ONLY the fields it adds value for:
//   id, brand, name, category, concernTags, ingredientsHighlights,
//   price, shortDescription, matchReason, matchScore
//
// Everything else is filled in deterministically server-side:
//   • currency       → "USD"
//   • availability   → "unknown"
//   • skinTypeTags   → []
//   • merchantName   → BRAND_DTC table or merchantNameForHost
//   • productUrl     → BRAND_DTC `https://...` or sephoraSearchUrl
//   • imageUrl       → null  (handled by client placeholder)
//   • imageSource    → 'none' / 'brand' (when DTC matched)
//   • sourceTimestamp→ ISO now() (server stamps)
//
// Effect: per-candidate output tokens 280→140; first-attempt budget
// 6144→2048; system prompt ~3000 tokens→~600 tokens. End-to-end normal
// case 30-60s → 5-15s.
// ----------------------------------------------------------------------------

export interface LiveProductCandidateLean {
  id: string;
  brand: string;
  name: string;
  category: ProductCategory;
  concernTags: ConcernType[];
  ingredientsHighlights: string[];
  price: number | null;
  shortDescription: string;
  matchReason: string;
  matchScore: number;
}

export interface LiveProductLookupResultLean {
  query: string;
  candidates: LiveProductCandidateLean[];
  confidence: 'high' | 'medium' | 'low';
}

const LIVE_PRODUCT_CANDIDATE_LEAN_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'brand',
    'name',
    'category',
    'concernTags',
    'ingredientsHighlights',
    'price',
    'shortDescription',
    'matchReason',
    'matchScore',
  ],
  properties: {
    id: { type: 'string' },
    brand: { type: 'string' },
    name: { type: 'string' },
    category: { type: 'string', enum: [...PRODUCT_CATEGORY_ENUM] },
    concernTags: {
      type: 'array',
      items: { type: 'string', enum: [...CONCERN_TYPE_ENUM] },
    },
    ingredientsHighlights: {
      type: 'array',
      items: { type: 'string' },
    },
    price: { type: ['number', 'null'] },
    shortDescription: { type: 'string' },
    matchReason: { type: 'string' },
    matchScore: { type: 'integer', minimum: 0, maximum: 100 },
  },
};

export const LIVE_PRODUCT_LOOKUP_LEAN_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['query', 'candidates', 'confidence'],
  properties: {
    query: { type: 'string' },
    candidates: {
      type: 'array',
      items: LIVE_PRODUCT_CANDIDATE_LEAN_SCHEMA,
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
};

// ----------------------------------------------------------------------------
// v19.18 — AI rerank Step F.
//
// The deterministic seed retrieval + local scorer (v19.17) handles
// candidate generation and ranking. AI is now reserved for ONE small
// optional step: take the top N deterministic candidates and return
// `{ heroId, alternativeIds, whyHeroFits }`. AI does NOT generate any
// product fields — it only chooses ordering + writes one explanation
// sentence.
//
// Rules:
//   • heroId MUST be one of the candidate ids (or null when AI
//     declines to pick).
//   • alternativeIds MUST all be candidate ids; no duplicates with
//     heroId.
//   • whyHeroFits is ≤ 100 chars, plain English, never a paragraph.
//
// The output is intentionally tiny (~30-50 tokens) so the rerank
// call completes in 1-3 seconds and never blocks the deterministic
// pipeline. If the call fails, the deterministic order wins.
// ----------------------------------------------------------------------------

export interface AIRerankResult {
  heroId: string | null;
  alternativeIds: string[];
  whyHeroFits: string | null;
  /**
   * v19.27 — short list of what-to-avoid strings the AI
   * generates when the user's profile flags ingredients /
   * categories that conflict with the candidates. Always
   * present (may be empty array). Each string ≤ 60 chars.
   */
  whatToAvoid: string[];
}

export const PRODUCT_RERANK_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['heroId', 'alternativeIds', 'whyHeroFits', 'whatToAvoid'],
  properties: {
    heroId: { type: ['string', 'null'] },
    alternativeIds: {
      type: 'array',
      items: { type: 'string' },
    },
    whyHeroFits: { type: ['string', 'null'] },
    whatToAvoid: {
      type: 'array',
      items: { type: 'string' },
    },
  },
};

// ============================================================================
// v19.43 — AI-FIRST PRODUCT RECOMMENDATION PLAN.
//
// AI is no longer just a reranker. The planner now decides WHAT KINDS
// of products this user should be shown (per-slot productType + signals
// + search queries). Retrieval then enriches each slot into a real
// product card with images + merchant info + metadata. AI drives the
// recommendation; retrieval enriches it.
// ============================================================================

// v21.0 — recommendationMode trimmed to the two modes the spec
// requires. concern_focused_search collapses into query_driven_search
// (the planner can still recognize concern-shaped queries; mode
// distinction is no longer needed for downstream wiring).
export type ProductRecommendationMode =
  | 'best_for_you'
  | 'query_driven_search';

export type SlotQueryFamily =
  | 'moisturizer'
  | 'serum_texture'
  | 'chemical_exfoliant'
  | 'blemish_support'
  | 'spf'
  | 'cleanser'
  | 'other';

export interface ProductRecommendationSlot {
  /** Stable slot key the selector references back ("slot_1" / "moisturizer"). */
  slotKey: string;
  /** Short user-facing label ("Lightweight gel moisturizer"). */
  slotLabel: string;
  /** v21.0 — canonical query family the slot targets. */
  queryFamily: SlotQueryFamily;
  /** Plain-English target need this slot addresses for THIS user. */
  targetNeed: string;
  /** Ingredient / texture / safety signals the slot should favor. */
  mustHaveSignals: string[];
  /** Signals the slot should avoid. */
  avoidSignals: string[];
  /** Retrieval queries the engine will run for this slot. */
  searchQueries: string[];
  /** Plain-English reason this slot matters to THIS user. */
  whyThisSlotMatters: string;
}

export interface ProductRecommendationPlan {
  recommendationMode: ProductRecommendationMode;
  /** One-line plain-English statement of the user's dominant need. */
  userNeedSummary: string;
  /** v21.0 — dominant concern label (or null when none dominates). */
  dominantConcern: string | null;
  /** Ordered slots (strongest first). 1-4 entries. */
  slots: ProductRecommendationSlot[];
}

export const PRODUCT_RECOMMENDATION_PLAN_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'recommendationMode',
    'userNeedSummary',
    'dominantConcern',
    'slots',
  ],
  properties: {
    recommendationMode: {
      type: 'string',
      enum: ['best_for_you', 'query_driven_search'],
    },
    userNeedSummary: { type: 'string' },
    dominantConcern: { type: ['string', 'null'] },
    slots: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'slotKey',
          'slotLabel',
          'queryFamily',
          'targetNeed',
          'mustHaveSignals',
          'avoidSignals',
          'searchQueries',
          'whyThisSlotMatters',
        ],
        properties: {
          slotKey: { type: 'string' },
          slotLabel: { type: 'string' },
          queryFamily: {
            type: 'string',
            enum: [
              'moisturizer',
              'serum_texture',
              'chemical_exfoliant',
              'blemish_support',
              'spf',
              'cleanser',
              'other',
            ],
          },
          targetNeed: { type: 'string' },
          mustHaveSignals: { type: 'array', items: { type: 'string' } },
          avoidSignals: { type: 'array', items: { type: 'string' } },
          searchQueries: { type: 'array', items: { type: 'string' } },
          whyThisSlotMatters: { type: 'string' },
        },
      },
    },
  },
};

// ============================================================================
// v21.0 — SLOT SELECTOR.
// AI picks the best real candidate per slot from an already-retrieved
// shortlist. Does NOT invent products. Returns one SlotSelection per
// slot, each referencing a real candidate id.
// ============================================================================

export interface SlotSelection {
  slotKey: string;
  /** Id of the chosen candidate (must exist in the shortlist), or null when no candidate fits. */
  selectedCandidateId: string | null;
  /** User-aware specific reason this candidate was picked. */
  whyPicked: string;
  /** Short reason why the other candidates lost. */
  whyNotOthersShort: string;
}

export interface SlotSelectionResult {
  selections: SlotSelection[];
  /** One short overall sentence for the list of picks. */
  listReason: string;
}

export const SLOT_SELECTION_RESULT_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['selections', 'listReason'],
  properties: {
    selections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['slotKey', 'selectedCandidateId', 'whyPicked', 'whyNotOthersShort'],
        properties: {
          slotKey: { type: 'string' },
          selectedCandidateId: { type: ['string', 'null'] },
          whyPicked: { type: 'string' },
          whyNotOthersShort: { type: 'string' },
        },
      },
    },
    listReason: { type: 'string' },
  },
};

// ============================================================================
// v22.1 — TYPED-SEARCH-ONLY AI CONTRACT.
//
// DEDICATED to typed search. NOT a slot planner. NOT a routine builder.
// Returns ONE dominant product family + a flat single-family search plan.
// The engine uses this for getRecommendationContextFromQuery; the
// slot planner (recommendProductsForUser) remains in use ONLY for
// getRecommendationContextForScan (best-for-you).
// ============================================================================

export interface SearchIntentPlan {
  recommendationMode: 'typed_search';
  rawQuery: string;
  normalizedQuery: string;
  searchIntentLabel: string;
  dominantProductFamily: SlotQueryFamily;
  userNeedSummary: string;
  mustHaveSignals: string[];
  avoidSignals: string[];
  preferredTextures: string[];
  searchQueries: string[];
  rankingPriorities: string[];
}

export const SEARCH_INTENT_PLAN_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'recommendationMode',
    'rawQuery',
    'normalizedQuery',
    'searchIntentLabel',
    'dominantProductFamily',
    'userNeedSummary',
    'mustHaveSignals',
    'avoidSignals',
    'preferredTextures',
    'searchQueries',
    'rankingPriorities',
  ],
  properties: {
    recommendationMode: { type: 'string', enum: ['typed_search'] },
    rawQuery: { type: 'string' },
    normalizedQuery: { type: 'string' },
    searchIntentLabel: { type: 'string' },
    dominantProductFamily: {
      type: 'string',
      enum: [
        'moisturizer',
        'serum_texture',
        'chemical_exfoliant',
        'blemish_support',
        'spf',
        'cleanser',
        'other',
      ],
    },
    userNeedSummary: { type: 'string' },
    mustHaveSignals: { type: 'array', items: { type: 'string' } },
    avoidSignals: { type: 'array', items: { type: 'string' } },
    preferredTextures: { type: 'array', items: { type: 'string' } },
    searchQueries: { type: 'array', items: { type: 'string' } },
    rankingPriorities: { type: 'array', items: { type: 'string' } },
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
  SCAN_PREFLIGHT_RESULT_SCHEMA: JsonSchema;
  PRODUCT_MATCH_RESULT_SCHEMA: JsonSchema;
  ROUTINE_RECOMMENDATION_SCHEMA: JsonSchema;
  SKIN_SCORE_EXPLANATION_SCHEMA: JsonSchema;
  PROGRESS_EXPLANATION_SCHEMA: JsonSchema;
  SEARCH_SUGGESTION_RESULT_SCHEMA: JsonSchema;
  LIVE_PRODUCT_LOOKUP_SCHEMA: JsonSchema;
  LIVE_PRODUCT_LOOKUP_LEAN_SCHEMA: JsonSchema;
  PRODUCT_RERANK_SCHEMA: JsonSchema;
  PRODUCT_RECOMMENDATION_PLAN_SCHEMA: JsonSchema;
  SLOT_SELECTION_RESULT_SCHEMA: JsonSchema;
  SEARCH_INTENT_PLAN_SCHEMA: JsonSchema;
}

export const AI_STRUCTURED_SCHEMAS: AIStructuredSchemas = {
  FACE_SCAN_ANALYSIS_SCHEMA,
  PRODUCT_IDENTITY_SCHEMA,
  BARCODE_LOOKUP_TOOL_SCHEMA,
  BARCODE_RESOLUTION_SCHEMA,
  SCAN_PREFLIGHT_RESULT_SCHEMA,
  PRODUCT_MATCH_RESULT_SCHEMA,
  ROUTINE_RECOMMENDATION_SCHEMA,
  SKIN_SCORE_EXPLANATION_SCHEMA,
  PROGRESS_EXPLANATION_SCHEMA,
  SEARCH_SUGGESTION_RESULT_SCHEMA,
  LIVE_PRODUCT_LOOKUP_SCHEMA,
  LIVE_PRODUCT_LOOKUP_LEAN_SCHEMA,
  PRODUCT_RERANK_SCHEMA,
  PRODUCT_RECOMMENDATION_PLAN_SCHEMA,
  SLOT_SELECTION_RESULT_SCHEMA,
  SEARCH_INTENT_PLAN_SCHEMA,
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

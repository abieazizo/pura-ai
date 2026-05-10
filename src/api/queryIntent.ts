/**
 * Pura AI — generalized search-intent interpreter (v19.27).
 *
 * Pure deterministic interpretation of a free-text query OR a
 * "Suggested-for-you" chip into a structured `InterpretedIntent`
 * the rest of the personalized search pipeline (live retrieval,
 * server soft-sort, AI rerank) can use to reason about what the
 * user actually wants.
 *
 * Critically, the interpretation is USER-AWARE: the SAME query
 * resolves to different intent for different users:
 *   • "best for my skin" → infers concern from the user's
 *     latest scan + goals
 *   • "chemical exfoliant" → adds avoidanceConstraints when the
 *     user's sensitivities flag retinoid / fragrance / etc.
 *   • "smoothing serum" for a user with redness vs a user with
 *     texture surfaces different concern weighting
 *
 * No AI dependency. No async work. Pure function over (query,
 * profile, skinState).
 */

import type { ConcernType } from '@/ai/ai-contracts';
import type { SkinState, UserProfileContext } from '@/types/canonical';

// ---------------------------------------------------------------------------
// Public types.
// ---------------------------------------------------------------------------

export type SearchIntentMode =
  | 'concern_search'
  | 'product_type_search'
  | 'best_for_my_skin'
  | 'vague_query';

export type ProductTypeIntent =
  | 'cleanser'
  | 'toner'
  | 'serum'
  | 'moisturizer'
  | 'spf'
  | 'mask'
  | 'spot_treatment'
  | 'exfoliant'
  | 'eye_cream'
  | null;

export interface InterpretedIntent {
  mode: SearchIntentMode;
  interpretedConcern: ConcernType | null;
  interpretedProductType: ProductTypeIntent;
  /**
   * Tokens the live retrieval + AI rerank should bias AGAINST.
   * Derived from the query's wording AND the user's
   * sensitivities. e.g. "chemical exfoliant" + user sensitivity
   * "fragrance" → ['fragrance']. Or "gentle cleanser" →
   * ['sulfate', 'alcohol'] regardless of profile.
   */
  avoidanceConstraints: string[];
  /**
   * `true` when the query alone doesn't carry enough signal and
   * the engine should weight profile + scan more heavily. Used
   * by the AI rerank prompt construction to lean on user data.
   */
  isVague: boolean;
  /**
   * Short human label for diagnostics + the AI prompt
   * ("Best for your skin", "Texture-resurfacing serum",
   * "Gentle cleanser"). Never empty.
   */
  intentLabel: string;
}

// ---------------------------------------------------------------------------
// Vocabulary.
// ---------------------------------------------------------------------------

/**
 * Concern keywords. Each ConcernType has multiple surface forms
 * a user might type. Order doesn't matter — first matching
 * concern wins in `inferConcern`.
 */
const CONCERN_VOCAB: Record<ConcernType, readonly string[]> = {
  breakouts: [
    'breakouts',
    'breakout',
    'acne',
    'pimple',
    'pimples',
    'spot',
    'spots',
    'blemish',
    'blemishes',
    'congestion',
    'clog',
    'clogged',
    'whitehead',
    'blackhead',
  ],
  redness: [
    'redness',
    'red',
    'rosacea',
    'flush',
    'flushing',
    'irritation',
    'inflam',
    'calm',
    'calming',
    'soothing',
    'soothe',
    'centella',
    'cica',
  ],
  hydration: [
    'hydrat',
    'dry',
    'dryness',
    'moistur',
    'plump',
    'thirsty',
    'flak',
    'parch',
  ],
  texture: [
    'texture',
    'smooth',
    'smoothing',
    'rough',
    'bumpy',
    'resurfac',
    'refine',
    'fine line',
    'lines',
    'wrinkle',
    'wrinkles',
    'aging',
    'anti-aging',
    'anti aging',
  ],
  dark_marks: [
    'dark spot',
    'dark mark',
    'dark marks',
    'pigment',
    'discolor',
    'brighten',
    'brightening',
    'even tone',
    'even out',
    'pih',
    'sun damage',
  ],
  oiliness: [
    'oily',
    'oil',
    'oiliness',
    'shiny',
    'mattif',
    'shine',
    'sebum',
    'greasy',
  ],
  sensitivity: [
    'sensitive',
    'sensitiv',
    'gentle',
    'mild',
    'reactive',
    'fragrance free',
    'fragrance-free',
    'barrier',
  ],
  pores: [
    'pore',
    'pores',
    'large pore',
    'visible pore',
    'minimiz',
    'tightening',
  ],
};

/**
 * Product-type keywords. Each `ProductTypeIntent` has a small
 * set of phrases the user might type.
 */
const PRODUCT_TYPE_VOCAB: Record<NonNullable<ProductTypeIntent>, readonly string[]> = {
  cleanser: ['cleanser', 'cleansing', 'face wash', 'wash', 'foam', 'gel cleanser'],
  toner: ['toner', 'tonic', 'astringent', 'essence'],
  serum: ['serum', 'ampoule', 'booster', 'concentrate'],
  moisturizer: [
    'moisturi',
    'moistur',
    'cream',
    'lotion',
    'emulsion',
    'face cream',
  ],
  spf: ['sunscreen', 'spf', 'sunblock', 'sun cream', 'uv protect'],
  mask: ['mask', 'masque', 'sheet mask', 'overnight mask'],
  spot_treatment: ['spot treatment', 'pimple patch', 'patches'],
  exfoliant: [
    'exfoliant',
    'exfoliator',
    'exfoliating',
    'aha',
    'bha',
    'pha',
    'glycolic',
    'lactic',
    'salicylic',
    'mandelic',
    'chemical exfoli',
    'peel',
    'acid toner',
  ],
  eye_cream: ['eye cream', 'under eye', 'undereye', 'eye serum', 'eye care'],
};

/**
 * Common avoidance phrasings in queries. e.g. "fragrance-free
 * cleanser" → user is asking for fragrance-free items.
 */
const QUERY_AVOIDANCE_VOCAB: Array<[RegExp, string]> = [
  [/\bfragrance[- ]?free\b/i, 'fragrance'],
  [/\balcohol[- ]?free\b/i, 'alcohol'],
  [/\bsulfate[- ]?free\b/i, 'sulfate'],
  [/\bsilicone[- ]?free\b/i, 'silicone'],
  [/\bparaben[- ]?free\b/i, 'paraben'],
  [/\bnon[- ]?comedogenic\b/i, 'comedogenic'],
];

/**
 * "Best for me / my skin / for my routine" — the canonical
 * vague query that should pull intent entirely from the user's
 * profile + scan.
 */
const BEST_FOR_ME_PATTERNS: RegExp[] = [
  /\bbest for me\b/i,
  /\bbest for my skin\b/i,
  /\bbest for me\b/i,
  /\bfor my skin\b/i,
  /\bwhat should i (use|try|buy|get)\b/i,
  /\bwhat works for me\b/i,
  /\brecommend\b/i,
  /\bmatched for me\b/i,
  /\bmatched to me\b/i,
];

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function inferConcern(text: string): ConcernType | null {
  const norm = normalize(text);
  for (const concern of Object.keys(CONCERN_VOCAB) as ConcernType[]) {
    for (const kw of CONCERN_VOCAB[concern]) {
      if (norm.includes(kw)) return concern;
    }
  }
  return null;
}

function inferProductType(text: string): ProductTypeIntent {
  const norm = normalize(text);
  for (const ptype of Object.keys(
    PRODUCT_TYPE_VOCAB
  ) as NonNullable<ProductTypeIntent>[]) {
    for (const kw of PRODUCT_TYPE_VOCAB[ptype]) {
      if (norm.includes(kw)) return ptype;
    }
  }
  return null;
}

function deriveAvoidanceFromQuery(query: string): string[] {
  const out: string[] = [];
  for (const [re, tag] of QUERY_AVOIDANCE_VOCAB) {
    if (re.test(query)) out.push(tag);
  }
  return out;
}

function deriveAvoidanceFromProfile(
  profile: UserProfileContext
): string[] {
  // Profile sensitivities are free-form strings. Normalize a few
  // known shapes to canonical avoidance tokens.
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of profile.sensitivities ?? []) {
    const norm = normalize(raw);
    if (norm.includes('fragrance')) out.push('fragrance');
    if (norm.includes('alcohol')) out.push('alcohol');
    if (norm.includes('retinoid') || norm.includes('retinol')) {
      out.push('retinoid');
    }
    if (norm.includes('acid') && norm.includes('avoid')) out.push('acid');
    if (norm.includes('comedogenic')) out.push('comedogenic');
    if (norm.includes('sulfate')) out.push('sulfate');
    if (norm.includes('silicone')) out.push('silicone');
    // generic fallback: keep the original normalized token if it
    // looks like an ingredient name and wasn't matched above.
    if (
      out.length === 0 &&
      /^[a-z][a-z0-9 -]+$/i.test(norm) &&
      norm.length < 30
    ) {
      out.push(norm.replace(/^avoid[: -]+/i, '').trim());
    }
  }
  return Array.from(new Set(out.filter((t) => !seen.has(t) && (seen.add(t), true))));
}

/**
 * For "exfoliant" / "exfoliating" queries, automatically add a
 * sensitivity-flag-driven safety constraint. A sensitive user
 * asking for an exfoliant should bias toward gentle PHAs/lactic,
 * not aggressive glycolic.
 */
function exfoliantSafetyAdjustment(
  productType: ProductTypeIntent,
  profile: UserProfileContext
): string[] {
  if (productType !== 'exfoliant') return [];
  if (profile.skinType === 'sensitive') return ['high_strength_acid'];
  if (
    profile.sensitivities?.some(
      (s) => /sensitiv|barrier|reactive/i.test(s)
    )
  ) {
    return ['high_strength_acid'];
  }
  return [];
}

function buildIntentLabel(args: {
  mode: SearchIntentMode;
  concern: ConcernType | null;
  productType: ProductTypeIntent;
  query: string;
}): string {
  const { mode, concern, productType, query } = args;
  if (mode === 'best_for_my_skin') return 'Best for your skin';
  const concernLabel = concern ? concern.replace(/_/g, ' ') : null;
  const ptLabel = productType ? productType.replace(/_/g, ' ') : null;
  if (concernLabel && ptLabel) return `${concernLabel} ${ptLabel}`;
  if (ptLabel) return ptLabel;
  if (concernLabel) return concernLabel;
  // Last-resort: echo the raw query (truncated).
  const trimmed = query.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 40) : 'Personalized search';
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

export interface InterpretSearchOpts {
  /** Optional explicit chip the user tapped (`'redness'`, etc.). */
  chipIntent?: string | null;
}

/**
 * Interpret a free-text query (or chip intent) into an
 * `InterpretedIntent` using the user's profile + latest scan.
 *
 * Pure deterministic. Same inputs → same output.
 */
export function interpretSearchIntent(
  query: string,
  profile: UserProfileContext,
  skinState: SkinState | null,
  opts: InterpretSearchOpts = {}
): InterpretedIntent {
  // Chip intent — when the user tapped a chip — overrides the
  // free-text query for keyword matching but the canonical
  // `query` field still gets the chip text.
  const chipText = opts.chipIntent?.trim() ?? '';
  const queryText = query.trim();
  const interpretSrc = chipText.length > 0 ? chipText : queryText;
  const norm = normalize(interpretSrc);

  // Branch 1: "best for me" — vague, profile/scan-driven.
  if (BEST_FOR_ME_PATTERNS.some((re) => re.test(interpretSrc))) {
    const top = skinState?.topConcerns?.[0]?.concern ?? null;
    const productType = inferProductType(interpretSrc);
    return {
      mode: 'best_for_my_skin',
      interpretedConcern: top,
      interpretedProductType: productType,
      avoidanceConstraints: [
        ...deriveAvoidanceFromProfile(profile),
        ...exfoliantSafetyAdjustment(productType, profile),
      ],
      isVague: true,
      intentLabel: buildIntentLabel({
        mode: 'best_for_my_skin',
        concern: top,
        productType,
        query: interpretSrc,
      }),
    };
  }

  const concern = inferConcern(interpretSrc);
  const productType = inferProductType(interpretSrc);
  const avoidanceFromQuery = deriveAvoidanceFromQuery(interpretSrc);
  const avoidanceFromProfile = deriveAvoidanceFromProfile(profile);
  const avoidanceFromSafety = exfoliantSafetyAdjustment(productType, profile);
  const avoidanceConstraints = Array.from(
    new Set([
      ...avoidanceFromQuery,
      ...avoidanceFromProfile,
      ...avoidanceFromSafety,
    ])
  );

  // Branch 2: product-type wins if found (with optional concern).
  if (productType) {
    const mode: SearchIntentMode = 'product_type_search';
    return {
      mode,
      interpretedConcern: concern,
      interpretedProductType: productType,
      avoidanceConstraints,
      isVague: false,
      intentLabel: buildIntentLabel({
        mode,
        concern,
        productType,
        query: interpretSrc,
      }),
    };
  }

  // Branch 3: concern-only.
  if (concern) {
    return {
      mode: 'concern_search',
      interpretedConcern: concern,
      interpretedProductType: null,
      avoidanceConstraints,
      isVague: false,
      intentLabel: buildIntentLabel({
        mode: 'concern_search',
        concern,
        productType: null,
        query: interpretSrc,
      }),
    };
  }

  // Branch 4: vague — short query without concern/product hits.
  // The pipeline should lean on profile + scan signals.
  const vague = norm.length === 0 || norm.split(/\s+/).length <= 2;
  return {
    mode: vague ? 'vague_query' : 'concern_search',
    interpretedConcern: skinState?.topConcerns?.[0]?.concern ?? null,
    interpretedProductType: null,
    avoidanceConstraints,
    isVague: true,
    intentLabel: buildIntentLabel({
      mode: vague ? 'vague_query' : 'concern_search',
      concern: skinState?.topConcerns?.[0]?.concern ?? null,
      productType: null,
      query: interpretSrc,
    }),
  };
}

/**
 * Build a backend OBF query string from an `InterpretedIntent`.
 * The server uses OBF's keyword index, so a richer query string
 * fetches a better candidate set.
 *
 *   • product_type + concern → "{concern} {productType}"
 *     ("redness serum", "smoothing serum", "gentle cleanser")
 *   • product_type only      → "{productType}"
 *   • concern only           → "{concern} skincare"
 *   • best_for_my_skin       → "{topConcern} {productType?}"
 *                              or just "skincare" when nothing is known
 *   • vague                  → echoed query verbatim (best effort)
 */
export function buildBackendQueryFromIntent(
  rawQuery: string,
  intent: InterpretedIntent
): string {
  const productType = intent.interpretedProductType;
  const concern = intent.interpretedConcern;

  if (intent.mode === 'best_for_my_skin') {
    if (concern && productType) {
      return `${concern.replace(/_/g, ' ')} ${productType.replace(/_/g, ' ')}`;
    }
    if (productType) return productType.replace(/_/g, ' ');
    if (concern) return `${concern.replace(/_/g, ' ')} skincare`;
    return 'skincare';
  }

  if (productType && concern) {
    return `${concern.replace(/_/g, ' ')} ${productType.replace(/_/g, ' ')}`;
  }
  if (productType) {
    // Boost product-type queries with concern hints when we have
    // them — gives OBF a richer keyword set.
    if (intent.isVague && concern) {
      return `${concern.replace(/_/g, ' ')} ${productType.replace(/_/g, ' ')}`;
    }
    return productType.replace(/_/g, ' ');
  }
  if (concern) {
    return `${concern.replace(/_/g, ' ')} skincare`;
  }
  // Echo the raw query for vague free-text searches the
  // interpreter couldn't categorize.
  const trimmed = rawQuery.trim();
  return trimmed.length > 0 ? trimmed : 'skincare';
}

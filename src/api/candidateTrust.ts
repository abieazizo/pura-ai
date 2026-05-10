/**
 * Pura AI — candidate trust scoring (v19.29).
 *
 * Pure deterministic per-candidate quality score that runs
 * BEFORE AI rerank. Decides which candidates are believable
 * enough to reach hero / alternatives selection at all.
 *
 * The contract:
 *   • every signal is bounded and inspectable
 *   • image-backed candidates score materially higher than
 *     no-image candidates
 *   • product-type + concern alignment with the user's
 *     interpreted intent is the largest single signal
 *   • a candidate that survives is one we'd be willing to
 *     show a real user
 *
 * The engine uses two thresholds:
 *   HERO_TRUST_THRESHOLD       (e.g. 65)
 *   ALTERNATIVE_TRUST_THRESHOLD (e.g. 50)
 * Below ALT threshold → dropped before hero selection.
 * Above ALT but below HERO → eligible only as alternative.
 * At/above HERO → eligible as hero.
 */

import type { ConcernType, LiveProductCandidate } from '@/ai/ai-contracts';
import type { SkinState, UserProfileContext } from '@/types/canonical';
import type { InterpretedIntent } from './queryIntent';

// ---------------------------------------------------------------------------
// Public types.
// ---------------------------------------------------------------------------

export interface CandidateTrustScore {
  /** Sum of components, clamped to [0, 100]. */
  total: number;
  productTypeFit: number;     // 0..25
  concernFit: number;         // 0..20
  safetyFit: number;          // 0..15
  probeSupport: number;       // 0..15
  metadataCompleteness: number; // 0..10
  imageCompleteness: number;  // 0..15
  noisePenalty: number;       // negative; subtracted from total
}

export interface ScoredCandidate {
  candidate: LiveProductCandidate;
  score: CandidateTrustScore;
  /** Cached at score time so the engine doesn't recompute. */
  hasImage: boolean;
  /**
   * v19.28+ matchedProbes annotation surfaced by the backend
   * when the request used multi-probe fan-out. Empty when the
   * legacy single-query path was used.
   */
  matchedProbes: string[];
}

export const HERO_TRUST_THRESHOLD = 60;
export const ALTERNATIVE_TRUST_THRESHOLD = 45;

// ---------------------------------------------------------------------------
// v19.36 — inferred skin-profile axes.
//
// One small helper used by probePlan (moisturizer probe shape),
// candidateTrust (skin-fit boosts/penalties), liveProducts (hero-pool
// filter), and openai-client (AI rerank payload). Pure function over
// (profile, skinState) — no new type system, no async, no plumbing.
//
// Each axis is a DERIVED boolean. A user can register on multiple
// axes (e.g. dry AND sensitive). The downstream filter applies them
// in priority order (acne > sensitive > dry > combo) so we don't
// give an oily/acne-prone user a heavy barrier cream.
// ---------------------------------------------------------------------------

export interface InferredSkinProfile {
  isOily: boolean;
  isAcneProne: boolean;
  isDry: boolean;
  isBarrier: boolean;
  isSensitive: boolean;
  isCombo: boolean;
  /** Single short label for the trace + AI prompt. */
  label: string;
}

const ACNE_HINTS =
  /breakout|acne|pimple|congest|clog|blemish|spots?\b/i;
const BARRIER_HINTS =
  /barrier|reactive|rosacea|eczema|dermatitis|psoriasis/i;

export function inferSkinProfile(
  profile: UserProfileContext,
  skinState: SkinState | null
): InferredSkinProfile {
  const sensitivities = profile.sensitivities ?? [];
  const goals = profile.goals ?? [];
  const concernSet = new Set<string>(
    (skinState?.topConcerns ?? []).map((c) => c.concern as string)
  );

  const isOily =
    profile.skinType === 'oily' ||
    sensitivities.some((s) => /\boily|sebum|shine|greasy/i.test(s)) ||
    concernSet.has('oiliness');

  const isAcneProne =
    concernSet.has('breakouts') ||
    sensitivities.some((s) => ACNE_HINTS.test(s)) ||
    goals.some((g) => ACNE_HINTS.test(g));

  const isDry =
    profile.skinType === 'dry' ||
    sensitivities.some((s) => /\bdry|dehydrat|flak|parch/i.test(s)) ||
    concernSet.has('hydration');

  const isBarrier =
    sensitivities.some((s) => BARRIER_HINTS.test(s)) ||
    goals.some((g) => BARRIER_HINTS.test(g));

  const isSensitive =
    profile.skinType === 'sensitive' ||
    sensitivities.some((s) =>
      /sensitiv|fragrance|reactive|rosacea|redness|safety_bias:moderate|safety_bias:high/i.test(
        s
      )
    ) ||
    concernSet.has('sensitivity') ||
    concernSet.has('redness');

  const isCombo =
    profile.skinType === 'combination' ||
    (isOily && isDry);

  // Single label for the trace + AI prompt. Priority order:
  // acne > sensitive > dry/barrier > oily > combo > unknown.
  let label = 'unknown';
  if (isAcneProne) label = 'acne-prone';
  else if (isSensitive) label = 'sensitive';
  else if (isBarrier) label = 'barrier-compromised';
  else if (isDry) label = 'dry';
  else if (isOily) label = 'oily';
  else if (isCombo) label = 'combination';

  return {
    isOily,
    isAcneProne,
    isDry,
    isBarrier,
    isSensitive,
    isCombo,
    label,
  };
}

// ---------------------------------------------------------------------------
// Component scorers.
// ---------------------------------------------------------------------------

/**
 * Product-type fit. 0..25. The biggest single signal — if the
 * user asked for a "serum" we strongly prefer items whose
 * category is `serum`.
 */
function scoreProductTypeFit(
  c: LiveProductCandidate,
  intent: InterpretedIntent
): number {
  const wanted = intent.interpretedProductType;
  if (!wanted) {
    // No explicit product type asked for — give partial credit
    // when the candidate has a known category, zero when it
    // doesn't.
    if (c.category && c.category !== 'unknown') return 12;
    return 6;
  }
  // Direct category match.
  const wantedNorm = wanted.toLowerCase();
  if (c.category === wantedNorm) return 25;
  // Soft match via shortDescription / name when category is
  // unknown / blank.
  const corpus = `${c.name} ${c.shortDescription}`.toLowerCase();
  if (corpus.includes(wantedNorm)) return 18;
  // v19.35 — synonym-soft-match for product-type families. OBF
  // metadata frequently labels a moisturizer as "cream"/"lotion"
  // and an exfoliant as "peeling"/"toner with acid"; the literal
  // wantedNorm token isn't in the name but the candidate is still
  // strongly product-type-shaped. Each family lists the synonyms
  // we trust for soft-match credit.
  const FAMILY_SYNONYMS: Record<string, RegExp> = {
    moisturizer: /\b(moisturi[sz]er|cream|lotion|emulsion|barrier)\b/i,
    cleanser: /\b(cleanser|wash|foam|gel cleanser|micellar)\b/i,
    serum: /\b(serum|essence|ampoule|booster|concentrate)\b/i,
    toner: /\b(toner|tonique|astringent|essence)\b/i,
    spf: /\b(sunscreen|spf|sunblock|sun cream|uv)\b/i,
    mask: /\b(mask|masque|sheet mask)\b/i,
    spot_treatment: /\b(spot treatment|patch|pimple patch)\b/i,
    exfoliant: /\b(exfoli|aha|bha|pha|peel|glycolic|lactic|salicylic|mandelic)\b/i,
    eye_cream: /\b(eye cream|eye serum|under ?eye)\b/i,
  };
  const syn = FAMILY_SYNONYMS[wantedNorm];
  if (syn && syn.test(corpus)) return 16;
  // Hard mismatch (different known category) → low.
  if (c.category && c.category !== 'unknown') return 4;
  return 8;
}

/**
 * Concern fit. 0..20. How well the candidate's concernTags line
 * up with the interpreted concern + the user's top concerns.
 *
 * Regression guard: do not zero generic moisturizer candidates
 * just because concernTags is empty (v19.31 fix preserved).
 *
 * History:
 *   • Pre-v19.31 the function returned 0 when concernTags was empty,
 *     which killed every valid moisturizer / cleanser / cream candidate
 *     whose OBF metadata didn't carry our concern taxonomy. v19.31
 *     replaced that with a tiered baseline. v19.32 / v19.33 added
 *     instrumentation infrastructure WITHOUT touching this function;
 *     v19.34 swapped probe-plan branch order WITHOUT touching this
 *     function. v19.35 explicitly guards the fix with this comment +
 *     a moisturizer-family-aware allowance below.
 */
function scoreConcernFit(
  c: LiveProductCandidate,
  intent: InterpretedIntent,
  skinState: SkinState | null
): number {
  // Regression guard: do not zero generic moisturizer candidates
  // just because concernTags is empty (v19.31 fix preserved).
  // When NO concern is in play (intent didn't extract one AND user
  // has no scan-driven topConcerns), the query is a pure product-type
  // query like "moisturizer" or "cleanser". We must NOT punish
  // candidates for lacking concern tags — the user didn't ask
  // about a concern. Return a neutral baseline (12 of 20 max ≈ 60%
  // credit) so the trust total doesn't drop just because OBF
  // metadata is sparse.
  const noConcernInPlay =
    !intent.interpretedConcern &&
    (!skinState?.topConcerns || skinState.topConcerns.length === 0);
  if (noConcernInPlay) return 12;

  const concernTags = c.concernTags ?? [];
  if (concernTags.length === 0) {
    // v19.35 — moisturizer-family allowance. When the user asked
    // for a moisturizer (productType set OR query contains
    // moisturizer/cream/lotion in name) AND the candidate's name
    // strongly matches a moisturizer-family product type, give a
    // baseline 8/20 credit even though concernTags is empty. This
    // preserves the v19.31 spirit (don't kill obvious moisturizers
    // for sparse metadata) more aggressively when the intent is
    // explicitly product-type-shaped.
    const wantsMoisturizerFamily =
      intent.interpretedProductType === 'moisturizer';
    const candidateLooksMoisturizer = /moisturi[sz]er|cream|lotion|emulsion|barrier/i.test(
      `${c.name ?? ''} ${c.shortDescription ?? ''} ${c.category ?? ''}`
    );
    if (wantsMoisturizerFamily && candidateLooksMoisturizer) {
      return 8;
    }
    // Concern IS in play but candidate has no tags — small partial
    // credit (4) instead of zero. Tag-less candidates with weak OBF
    // metadata can still be valid skincare; the AI rerank step
    // makes the final call.
    return 4;
  }
  let s = 0;
  if (
    intent.interpretedConcern &&
    concernTags.includes(intent.interpretedConcern)
  ) {
    s += 12;
  }
  if (skinState?.topConcerns) {
    for (let i = 0; i < skinState.topConcerns.length; i++) {
      if (concernTags.includes(skinState.topConcerns[i].concern as ConcernType)) {
        s += Math.max(2, 4 - i);
      }
    }
  }
  // Soft baseline of 4 even when no tag matched, so a candidate
  // with concern tags + concern-in-play still scores something
  // when the specific concerns happen to differ.
  return Math.min(20, Math.max(s, 4));
}

/**
 * Safety fit. 0..15. Boost when the candidate's safetyTags
 * align with the interpreted intent's avoidanceConstraints
 * (e.g. user wants `fragrance`-avoiding → product has
 * `fragrance_free`). Penalize when the candidate's
 * concernTags signal a category the user has flagged as
 * avoidance.
 */
// v19.36 — moisturizer-family fit patterns for safety boost.
const MOIST_GEL_PATTERNS: RegExp[] =
  [/gel moisturizer/i, /oil[- ]?free/i, /lightweight/i, /non[- ]?comedogenic/i, /gel cream/i];
const MOIST_BARRIER_PATTERNS: RegExp[] =
  [/barrier/i, /ceramide/i, /repair/i, /rich moistur/i, /shea butter/i];
const MOIST_CALMING_PATTERNS: RegExp[] =
  [/fragrance[- ]?free/i, /\bcica\b/i, /centella/i, /soothing/i, /calming/i, /panthenol/i];

function scoreSafetyFit(
  c: LiveProductCandidate,
  intent: InterpretedIntent,
  profile: UserProfileContext,
  skinFit: InferredSkinProfile | null
): number {
  let s = 5; // baseline (no signal in either direction)
  const corpus = `${c.name} ${c.shortDescription} ${c.ingredientsHighlights?.join(' ') ?? ''}`.toLowerCase();
  for (const av of intent.avoidanceConstraints) {
    const tag = `${av}_free`;
    if (corpus.includes(tag.replace('_', '-')) || corpus.includes(tag)) s += 2;
    if (corpus.includes(av) && !corpus.includes(`${av}-free`) && !corpus.includes(`${av} free`)) {
      s -= 2;
    }
  }
  // Sensitive-skin baseline boost.
  if (profile.skinType === 'sensitive') {
    if (
      /gentle|cica|centella|panthenol|fragrance[- ]?free/i.test(corpus)
    ) {
      s += 3;
    }
  }
  // v19.36 — moisturizer-family skin-profile-aligned boost. Mirror
  // image of the conflict penalties in scoreNoisePenalty: a
  // candidate that visibly aligns with the user's skin axes earns
  // up to +6 here on top of the base safety signal.
  const wantsMoisturizer = intent.interpretedProductType === 'moisturizer';
  if (wantsMoisturizer && skinFit) {
    if (
      (skinFit.isOily || skinFit.isAcneProne) &&
      MOIST_GEL_PATTERNS.some((re) => re.test(corpus))
    ) {
      s += 6;
    }
    if (
      (skinFit.isDry || skinFit.isBarrier) &&
      MOIST_BARRIER_PATTERNS.some((re) => re.test(corpus))
    ) {
      s += 6;
    }
    if (
      skinFit.isSensitive &&
      MOIST_CALMING_PATTERNS.some((re) => re.test(corpus))
    ) {
      s += 6;
    }
  }
  return Math.max(0, Math.min(15, s));
}

/**
 * Probe support. 0..15. Higher when multiple probes surfaced
 * this candidate — that's strong evidence the candidate is
 * actually relevant to the query (not just a noisy single
 * keyword match). Backend annotates `matchedProbes` on each
 * candidate when multi-probe fan-out was used.
 */
function scoreProbeSupport(matchedProbes: string[]): number {
  const n = matchedProbes.length;
  if (n === 0) return 5; // legacy single-query path; assume neutral
  if (n === 1) return 8;
  if (n === 2) return 12;
  return 15;
}

/**
 * Metadata completeness. 0..10. Real products on a major
 * retailer have brand + name + category + price + ingredients
 * populated. OBF entries are volunteer-curated and patchy;
 * incomplete metadata is a soft trust signal.
 */
function scoreMetadataCompleteness(c: LiveProductCandidate): number {
  let s = 0;
  if (c.brand && c.brand.trim().length >= 2) s += 2;
  if (c.name && c.name.trim().length >= 6) s += 2;
  if (c.category && c.category !== 'unknown') s += 2;
  if (c.shortDescription && c.shortDescription.trim().length >= 20) s += 2;
  if (
    c.ingredientsHighlights &&
    c.ingredientsHighlights.length >= 1
  ) {
    s += 2;
  }
  return Math.min(10, s);
}

/**
 * Image completeness. 0..15. Big boost for candidates with a
 * usable image; real product cards SHOULD show a packshot.
 *
 * v19.40 — also scales by `imageQuality` tier when the backend
 * supplied one. High-tier (clean packshot) gets the full source-
 * specific score; medium drops by 3; low drops by 6. This makes
 * scoreImageCompleteness reflect VISUAL quality, not just URL
 * presence.
 */
function scoreImageCompleteness(c: LiveProductCandidate): number {
  if (!c.imageUrl || c.imageUrl.trim().length === 0) return 0;
  // Filter out obvious junk URL shapes.
  if (!/^https?:\/\//i.test(c.imageUrl)) return 0;
  // Trust higher when imageSource is 'merchant' or 'brand'.
  let base: number;
  if (c.imageSource === 'merchant') base = 15;
  else if (c.imageSource === 'brand') base = 13;
  else if (c.imageSource === 'obf') base = 11;
  else base = 9; // present but unknown source
  // v19.40 — quality tier adjustment.
  if (c.imageQuality === 'medium') base -= 3;
  else if (c.imageQuality === 'low') base -= 6;
  return Math.max(0, base);
}

/**
 * Noise penalty. Negative score subtracted from the total.
 * Catches candidates that look like food/non-skincare leaking
 * through the loosened cosmetic filter, or extremely short
 * names that read as parsing errors.
 *
 * v19.36 — adds skin-profile-conflict penalties for moisturizer-
 * family queries. A moisturizer that conflicts with the user's
 * skin axes (heavy occlusive cream for an oily/acne user; ultra-
 * light gel-only for a dry/barrier user; fragranced for a
 * sensitive user) takes a HARD noise penalty so it can't sneak
 * into the hero pool just because OBF returned it. The penalties
 * are scoped to moisturizer-family queries — for serums and
 * exfoliants, these adjectives don't conflict the same way.
 */
const NON_SKINCARE_PATTERNS: RegExp[] = [
  /candy|chocolate|gum|drink|juice|cocoa|coffee|tea|cookie|cake/i,
  /toothpaste|deodorant/i,
  /pet|dog|cat food/i,
];

// v19.36 — skin-profile-conflict patterns for moisturizer queries.
const MOIST_HEAVY_PATTERNS: RegExp[] =
  [/rich cream/i, /heavy cream/i, /\bbalm\b/i, /ointment/i, /occlusive/i, /body lotion/i];
const MOIST_ULTRALIGHT_PATTERNS: RegExp[] =
  [/oil[- ]?free gel/i, /\bgel only\b/i, /ultra[- ]?light/i, /matte gel/i];
const MOIST_FRAGRANCED_PATTERNS: RegExp[] =
  [/perfum/i, /fragranced/i, /\bscented\b/i, /\bessential oil/i, /parfum/i];
const MOIST_HARSH_ACTIVE_PATTERNS: RegExp[] =
  [/retinol moisturizer/i, /exfoliating moisturizer/i, /aha moisturizer/i, /bha moisturizer/i];

// v19.40 — concrete-ingredient signals. A "filler" candidate is
// one that names no concrete active ingredient AND has weak metadata.
// Strong candidates name something specific the user can recognize:
// "ceramide", "niacinamide", "salicylic", "hyaluronic", etc.
const CONCRETE_INGREDIENT_PATTERNS: RegExp[] = [
  /ceramide/i,
  /niacinamide/i,
  /salicylic|glycolic|lactic|mandelic|azelaic/i,
  /hyaluronic|sodium hyaluronate/i,
  /retinol|retinal|tretinoin|bakuchiol/i,
  /vitamin c|ascorbic/i,
  /panthenol/i,
  /squalane/i,
  /centella|cica/i,
  /peptide/i,
  /tranexamic/i,
  /alpha arbutin/i,
  /benzoyl peroxide/i,
  /sulfur/i,
  /\bspf\b|sunscreen|tinosorb|avobenzone|zinc oxide|titanium dioxide/i,
];

function scoreNoisePenalty(
  c: LiveProductCandidate,
  intent: InterpretedIntent,
  skinFit: InferredSkinProfile | null
): number {
  let p = 0;
  const corpus = `${c.name} ${c.shortDescription} ${c.category}`;
  const corpusLower = corpus.toLowerCase();
  const ingredientsCorpus = (c.ingredientsHighlights ?? []).join(' ').toLowerCase();
  for (const re of NON_SKINCARE_PATTERNS) {
    if (re.test(corpus)) {
      p += 30; // hard penalty — non-skincare leak
    }
  }
  if ((c.name ?? '').length < 4) p += 10;
  if ((c.brand ?? '').length < 2) p += 10;

  // v19.40 — FILLER PENALTY. A candidate that names no concrete
  // active ingredient AND has no concrete short description AND
  // would only "loosely match the category" is filler. The exact
  // GPT prompt v19.40-exact is instructed to lose to non-filler.
  // The deterministic side enforces the same rule via this penalty
  // so the deterministic-fallback hero (when AI is unavailable)
  // also rejects filler.
  const namesIngredient =
    CONCRETE_INGREDIENT_PATTERNS.some((re) => re.test(corpus)) ||
    CONCRETE_INGREDIENT_PATTERNS.some((re) => re.test(ingredientsCorpus));
  const hasShortDescription =
    !!c.shortDescription && c.shortDescription.trim().length >= 20;
  const hasIngredientsList =
    Array.isArray(c.ingredientsHighlights) &&
    c.ingredientsHighlights.length >= 1;
  if (!namesIngredient && !hasShortDescription && !hasIngredientsList) {
    p += 15; // filler penalty — generic, no concrete differentiator
  } else if (!namesIngredient && !hasIngredientsList) {
    p += 8; // soft filler — has shortDescription but no real ingredient signal
  }

  // v19.36 — moisturizer-family skin-profile-conflict penalties.
  // Skip when no skin profile is supplied (legacy callers) or when
  // the query isn't moisturizer-family.
  const wantsMoisturizer = intent.interpretedProductType === 'moisturizer';
  if (wantsMoisturizer && skinFit) {
    if (
      (skinFit.isOily || skinFit.isAcneProne) &&
      MOIST_HEAVY_PATTERNS.some((re) => re.test(corpusLower))
    ) {
      p += 35; // heavy/occlusive cream conflicts with oily/acne — hard drop
    }
    if (
      (skinFit.isDry || skinFit.isBarrier) &&
      MOIST_ULTRALIGHT_PATTERNS.some((re) => re.test(corpusLower))
    ) {
      p += 30;
    }
    if (
      skinFit.isSensitive &&
      MOIST_FRAGRANCED_PATTERNS.some((re) => re.test(corpusLower))
    ) {
      p += 30;
    }
    if (
      skinFit.isSensitive &&
      MOIST_HARSH_ACTIVE_PATTERNS.some((re) => re.test(corpusLower))
    ) {
      p += 25;
    }
  }
  return p;
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

export function scoreTrustForCandidate(args: {
  candidate: LiveProductCandidate;
  intent: InterpretedIntent;
  profile: UserProfileContext;
  skinState: SkinState | null;
  matchedProbes?: string[];
}): ScoredCandidate {
  const { candidate, intent, profile, skinState } = args;
  const matchedProbes = args.matchedProbes ?? [];
  // v19.36 — derive skin-profile axes once. Threaded into safety
  // and noise-penalty scorers so moisturizer-family conflicts get
  // a hard penalty and aligned candidates get a boost.
  const skinFit = inferSkinProfile(profile, skinState);

  const productTypeFit = scoreProductTypeFit(candidate, intent);
  const concernFit = scoreConcernFit(candidate, intent, skinState);
  const safetyFit = scoreSafetyFit(candidate, intent, profile, skinFit);
  const probeSupport = scoreProbeSupport(matchedProbes);
  const metadataCompleteness = scoreMetadataCompleteness(candidate);
  const imageCompleteness = scoreImageCompleteness(candidate);
  const noisePenalty = scoreNoisePenalty(candidate, intent, skinFit);

  const total = Math.max(
    0,
    Math.min(
      100,
      productTypeFit +
        concernFit +
        safetyFit +
        probeSupport +
        metadataCompleteness +
        imageCompleteness -
        noisePenalty
    )
  );

  const hasImage =
    !!candidate.imageUrl &&
    candidate.imageUrl.trim().length > 0 &&
    /^https?:\/\//i.test(candidate.imageUrl);

  return {
    candidate,
    score: {
      total,
      productTypeFit,
      concernFit,
      safetyFit,
      probeSupport,
      metadataCompleteness,
      imageCompleteness,
      noisePenalty,
    },
    hasImage,
    matchedProbes,
  };
}

/**
 * Apply trust thresholds. Returns three arrays:
 *   • heroPool       — eligible to become hero (score ≥ HERO)
 *   • alternativePool — eligible as alternative (score ≥ ALT)
 *   • dropped        — too weak; not shown
 *
 * Sort each pool by score desc so the deterministic baseline
 * (when AI rerank is skipped or fails) still picks the best
 * candidate. Image-backed candidates outrank no-image when
 * scores tie.
 */
export function partitionByTrust(
  scored: ScoredCandidate[]
): {
  heroPool: ScoredCandidate[];
  alternativePool: ScoredCandidate[];
  dropped: ScoredCandidate[];
} {
  const heroPool: ScoredCandidate[] = [];
  const alternativePool: ScoredCandidate[] = [];
  const dropped: ScoredCandidate[] = [];

  for (const s of scored) {
    if (s.score.total >= HERO_TRUST_THRESHOLD) {
      heroPool.push(s);
      alternativePool.push(s);
    } else if (s.score.total >= ALTERNATIVE_TRUST_THRESHOLD) {
      alternativePool.push(s);
    } else {
      dropped.push(s);
    }
  }

  const cmp = (a: ScoredCandidate, b: ScoredCandidate) => {
    // Image-backed candidates win ties.
    if (b.score.total !== a.score.total) {
      return b.score.total - a.score.total;
    }
    if (a.hasImage !== b.hasImage) {
      return a.hasImage ? -1 : 1;
    }
    return 0;
  };
  heroPool.sort(cmp);
  alternativePool.sort(cmp);
  dropped.sort(cmp);

  return { heroPool, alternativePool, dropped };
}

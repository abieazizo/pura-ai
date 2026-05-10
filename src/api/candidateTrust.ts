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
  // Hard mismatch (different known category) → low.
  if (c.category && c.category !== 'unknown') return 4;
  return 8;
}

/**
 * Concern fit. 0..20. How well the candidate's concernTags line
 * up with the interpreted concern + the user's top concerns.
 */
function scoreConcernFit(
  c: LiveProductCandidate,
  intent: InterpretedIntent,
  skinState: SkinState | null
): number {
  let s = 0;
  const concernTags = c.concernTags ?? [];
  if (concernTags.length === 0) return 0;
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
  return Math.min(20, s);
}

/**
 * Safety fit. 0..15. Boost when the candidate's safetyTags
 * align with the interpreted intent's avoidanceConstraints
 * (e.g. user wants `fragrance`-avoiding → product has
 * `fragrance_free`). Penalize when the candidate's
 * concernTags signal a category the user has flagged as
 * avoidance.
 */
function scoreSafetyFit(
  c: LiveProductCandidate,
  intent: InterpretedIntent,
  profile: UserProfileContext
): number {
  let s = 5; // baseline (no signal in either direction)
  // Pull safetyTags from the wire shape if present (v19.28
  // BackendProductCandidate has `safetyTags`; the canonical
  // LiveProductCandidate doesn't carry it directly, but the
  // adapter places equivalent info under `skinTypeTags` /
  // `concernTags`. Treat the candidate's `concernTags` as a
  // proxy when explicit safety tags aren't surfaced).
  // We use a corpus check on the description as a fallback
  // safety signal.
  const corpus = `${c.shortDescription} ${c.ingredientsHighlights?.join(' ') ?? ''}`.toLowerCase();
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
 */
function scoreImageCompleteness(c: LiveProductCandidate): number {
  if (!c.imageUrl || c.imageUrl.trim().length === 0) return 0;
  // Filter out obvious junk URL shapes.
  if (!/^https?:\/\//i.test(c.imageUrl)) return 0;
  // Trust higher when imageSource is 'merchant' or 'brand'.
  if (c.imageSource === 'merchant') return 15;
  if (c.imageSource === 'brand') return 13;
  if (c.imageSource === 'obf') return 11;
  return 9; // present but unknown source
}

/**
 * Noise penalty. Negative score subtracted from the total.
 * Catches candidates that look like food/non-skincare leaking
 * through the loosened cosmetic filter, or extremely short
 * names that read as parsing errors.
 */
const NON_SKINCARE_PATTERNS: RegExp[] = [
  /candy|chocolate|gum|drink|juice|cocoa|coffee|tea|cookie|cake/i,
  /toothpaste|deodorant/i,
  /pet|dog|cat food/i,
];

function scoreNoisePenalty(c: LiveProductCandidate): number {
  let p = 0;
  const corpus = `${c.name} ${c.shortDescription} ${c.category}`;
  for (const re of NON_SKINCARE_PATTERNS) {
    if (re.test(corpus)) {
      p += 30; // hard penalty — non-skincare leak
    }
  }
  if ((c.name ?? '').length < 4) p += 10;
  if ((c.brand ?? '').length < 2) p += 10;
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

  const productTypeFit = scoreProductTypeFit(candidate, intent);
  const concernFit = scoreConcernFit(candidate, intent, skinState);
  const safetyFit = scoreSafetyFit(candidate, intent, profile);
  const probeSupport = scoreProbeSupport(matchedProbes);
  const metadataCompleteness = scoreMetadataCompleteness(candidate);
  const imageCompleteness = scoreImageCompleteness(candidate);
  const noisePenalty = scoreNoisePenalty(candidate);

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

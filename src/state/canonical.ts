/**
 * Pura AI — canonical state SELECTORS (v19.15).
 *
 * Type CONTRACTS live in `src/types/canonical.ts` (existing file).
 * This module provides the pure, deterministic SELECTORS that
 * produce those canonical objects from existing scattered state:
 *
 *   • selectSkinState(scan, prev, scans)        → SkinState | null
 *   • selectUserProfileContext(state)           → UserProfileContext
 *   • buildRecommendationContext(args)          → RecommendationContext
 *   • scoreCandidateLocal(candidate, profile, skinState) → 0..100
 *
 * Design rules:
 *   • Pure functions. No store imports — callers pass state in.
 *   • Confidence-weighted: every inference carries 0..1 confidence.
 *   • Trust-first: low-confidence findings are dropped from the
 *     primary surface (topConcerns, nextStepCategory).
 *   • Recovery-resilient: every selector accepts partial inputs
 *     and returns a sane default.
 *   • Single source of truth: every assistant / result / map /
 *     recommendation surface should consume these selectors
 *     instead of recomposing the same logic inline.
 */

import type {
  ConcernType,
  FaceScanAnalysis,
  LiveProductCandidate,
  ProductCategory,
  Severity as AiSeverity,
} from '@/ai/ai-contracts';
import type {
  CandidateScore,
  ConfidenceTier,
  RecommendationAvailability,
  RecommendationContext,
  RecommendationIntent,
  RetrievalAttempt,
  SkinConcernSummary,
  SkinScoreBand,
  SkinState,
  SkinZoneFinding,
  UserProfileContext,
} from '@/types/canonical';
import type { Scan } from '@/types';
import type { AppState } from '@/store/useAppStore';
import { computeSkinScore } from '@/utils/skinScore';
import { getConcerns } from '@/utils/concerns';
import { buildSafetyProfile } from '@/utils/safetyProfile';

// ============================================================================
// A. SkinState selector
// ============================================================================

const SEVERITY_RANK: Record<AiSeverity, number> = {
  none: 0,
  low: 1,
  mild: 2,
  moderate: 3,
  high: 4,
};

function scoreBand(score: number): SkinScoreBand {
  if (score >= 85) return 'great';
  if (score >= 70) return 'good';
  if (score >= 55) return 'fair';
  return 'poor';
}

function tier(confidence: number): ConfidenceTier {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

/**
 * Map an app-side severity tier (`'calm' | 'mild' | 'moderate' |
 * 'needs-attention'`) onto the AI's severity enum so deterministic
 * fallbacks slot into a SkinState that uses `AiSeverity` everywhere.
 */
function appSeverityToAi(
  s: 'calm' | 'mild' | 'moderate' | 'needs-attention'
): AiSeverity {
  switch (s) {
    case 'calm':
      return 'none';
    case 'mild':
      return 'mild';
    case 'moderate':
      return 'moderate';
    case 'needs-attention':
      return 'high';
  }
}

/**
 * Pick the worst severity per ConcernType across all findings.
 * Returns a Partial map (only concerns with at least one
 * non-`none` finding present).
 */
function rollupSeverity(
  ai: FaceScanAnalysis | undefined
): Partial<Record<ConcernType, AiSeverity>> {
  const out: Partial<Record<ConcernType, AiSeverity>> = {};
  if (!ai) return out;
  for (const f of ai.findings) {
    const cur = out[f.concern];
    if (!cur || SEVERITY_RANK[f.severity] > SEVERITY_RANK[cur]) {
      out[f.concern] = f.severity;
    }
  }
  return out;
}

function rollupConfidence(
  ai: FaceScanAnalysis | undefined
): Partial<Record<ConcernType, number>> {
  const out: Partial<Record<ConcernType, number>> = {};
  if (!ai) return out;
  for (const f of ai.findings) {
    const cur = out[f.concern] ?? 0;
    if (f.confidence > cur) out[f.concern] = f.confidence;
  }
  return out;
}

function nextProductCategoryFor(
  primary: ConcernType | null
): ProductCategory | null {
  switch (primary) {
    case 'breakouts':
      return 'spot_treatment';
    case 'redness':
    case 'sensitivity':
    case 'hydration':
      return 'moisturizer';
    case 'texture':
    case 'pores':
      return 'serum';
    case 'dark_marks':
      return 'serum';
    case 'oiliness':
      return 'cleanser';
    default:
      return null;
  }
}

/**
 * Compose a canonical SkinState from a scan + its previous scan +
 * the full scans history (for trend). Returns null when scan is
 * not provided.
 */
export function selectSkinState(
  scan: Scan | undefined,
  previous: Scan | undefined,
  scans: Scan[]
): SkinState | null {
  if (!scan) return null;
  const ai = scan.aiAnalysis;
  const concerns = getConcerns(scan, previous);
  const score = computeSkinScore(scans);

  // Rollup AI signals into per-concern maps. Falls back to
  // deterministic concern fallback when AI is missing.
  const severityByConcern: Partial<Record<ConcernType, AiSeverity>> = ai
    ? rollupSeverity(ai)
    : (() => {
        const out: Partial<Record<ConcernType, AiSeverity>> = {};
        for (const c of concerns) {
          if (c.severity === 'calm') continue;
          // Map ConcernCategory → ConcernType (best-effort).
          const ct: ConcernType =
            c.category === 'breakouts'
              ? 'breakouts'
              : c.category === 'hydration'
              ? 'hydration'
              : c.category === 'texture'
              ? 'texture'
              : 'dark_marks';
          out[ct] = appSeverityToAi(c.severity);
        }
        return out;
      })();
  const confidenceByConcern: Partial<Record<ConcernType, number>> = ai
    ? rollupConfidence(ai)
    : (() => {
        const out: Partial<Record<ConcernType, number>> = {};
        for (const c of concerns) {
          if (c.severity === 'calm') continue;
          const ct: ConcernType =
            c.category === 'breakouts'
              ? 'breakouts'
              : c.category === 'hydration'
              ? 'hydration'
              : c.category === 'texture'
              ? 'texture'
              : 'dark_marks';
          out[ct] = 0.5;
        }
        return out;
      })();

  // Build top concerns: prefer AI findings sorted by severity then
  // confidence; cap at 4. Filter out severity=none/low and very low
  // confidence (< 0.4) to avoid overclaiming.
  const topConcerns: SkinConcernSummary[] = [];
  if (ai) {
    const ranked = [...ai.findings]
      .filter(
        (f) =>
          f.severity !== 'none' &&
          f.severity !== 'low' &&
          f.confidence >= 0.4
      )
      .sort((a, b) => {
        const sevDiff =
          SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
        if (sevDiff !== 0) return sevDiff;
        return b.confidence - a.confidence;
      })
      .slice(0, 4);
    ranked.forEach((f, i) => {
      const rank: 1 | 2 | 3 = i === 0 ? 1 : i === 1 ? 2 : 3;
      topConcerns.push({
        concern: f.concern,
        severity: f.severity,
        rank,
        confidence: f.confidence,
        regions: f.regions.map((r) => r.replace(/_/g, ' ')),
        summary: f.user_summary,
        direction: f.direction_vs_previous,
      });
    });
  } else {
    concerns
      .filter((c) => c.severity !== 'calm')
      .slice(0, 4)
      .forEach((c, i) => {
        const ct: ConcernType =
          c.category === 'breakouts'
            ? 'breakouts'
            : c.category === 'hydration'
            ? 'hydration'
            : c.category === 'texture'
            ? 'texture'
            : 'dark_marks';
        const rank: 1 | 2 | 3 = i === 0 ? 1 : i === 1 ? 2 : 3;
        topConcerns.push({
          concern: ct,
          severity: appSeverityToAi(c.severity),
          rank,
          confidence: 0.5,
          regions: [c.region],
          summary: c.finding,
          direction:
            c.trend === 'improved'
              ? 'better'
              : c.trend === 'worsened'
              ? 'worse'
              : c.trend === 'new'
              ? 'new'
              : 'same',
        });
      });
  }

  // Zone findings — confidence-aware. Suppress < 0.4 confidence
  // findings entirely so the skin map never overclaims.
  const zoneFindings: SkinZoneFinding[] = [];
  if (ai) {
    for (const f of ai.findings) {
      if (f.severity === 'none' || f.severity === 'low') continue;
      if (f.confidence < 0.4) continue;
      zoneFindings.push({
        zone: (f.regions[0] ?? 'across_face').replace(/_/g, ' '),
        concern: f.concern,
        severity: f.severity,
        confidence: f.confidence,
        polygon: f.region_polygon ?? undefined,
      });
    }
  } else {
    for (const c of concerns) {
      if (c.severity === 'calm') continue;
      const ct: ConcernType =
        c.category === 'breakouts'
          ? 'breakouts'
          : c.category === 'hydration'
          ? 'hydration'
          : c.category === 'texture'
          ? 'texture'
          : 'dark_marks';
      zoneFindings.push({
        zone: c.region,
        concern: ct,
        severity: appSeverityToAi(c.severity),
        confidence: 0.5,
      });
    }
  }

  // Trend summary — uses cross-scan delta. Null on first scan.
  const trendSummary =
    score.deltaSinceLast === null
      ? null
      : {
          direction:
            score.deltaSinceLast > 1
              ? ('improving' as const)
              : score.deltaSinceLast < -1
              ? ('sliding' as const)
              : ('holding' as const),
          deltaSinceFirst:
            score.deltaSinceFirst ?? score.deltaSinceLast ?? 0,
        };

  const scoreValue = ai ? ai.skin_score.value : scan.overallScore;
  const summaryHeadline =
    ai?.skin_score.why_line ?? scan.summaryHeadline ?? 'Skin reads steady.';
  const summaryBody =
    ai?.skin_score.explanation ??
    scan.summaryBody ??
    'No standout concerns in this photo.';

  // routineHints: prefer AI's tonight focus when present.
  const routineHints = (
    ai?.next_focus.tonight.filter((s) => s.trim().length > 0) ??
    concerns.filter((c) => c.severity !== 'calm').map((c) => c.nextStep)
  ).slice(0, 3);

  // riskFlags from AI image_quality + scan-level signals.
  const riskFlags: string[] = [];
  if (ai && !ai.image_quality.usable) {
    riskFlags.push('image_unusable');
  } else if (ai && ai.image_quality.confidence < 0.5) {
    riskFlags.push('image_low_confidence');
  }
  for (const issue of ai?.image_quality.issues ?? []) {
    if (issue.length > 0) riskFlags.push(`quality_${issue}`);
  }

  // Image quality — passes the AI shape through unchanged when
  // present; otherwise synthesises a conservative default.
  const imageQuality = ai
    ? {
        usable: ai.image_quality.usable,
        confidence: ai.image_quality.confidence,
        issues: ai.image_quality.issues,
      }
    : { usable: true, confidence: 0.4, issues: [] };

  // Aggregate confidence tier. Collapses image quality + best
  // per-concern confidence into one signal so the UI has one
  // gate ("if low, say less, never more").
  const bestConcernConfidence = Object.values(confidenceByConcern).reduce(
    (m: number, v) => Math.max(m, v ?? 0),
    0
  );
  const overallConfidenceScore = Math.min(
    imageQuality.confidence,
    bestConcernConfidence > 0 ? bestConcernConfidence : imageQuality.confidence
  );
  const overallConfidence = tier(overallConfidenceScore);

  // Next step category — pick the worst topConcern with confidence
  // ≥ 0.5 and map to a product category.
  const primary = topConcerns.find((c) => c.confidence >= 0.5)?.concern ?? null;
  const nextStepCategory = nextProductCategoryFor(primary);

  return {
    scanId: scan.id,
    createdAt: scan.capturedAt,
    imageQuality,
    score: scoreValue,
    scoreBand: scoreBand(scoreValue),
    scoreDelta: score.deltaSinceLast,
    summaryHeadline,
    summaryBody,
    topConcerns,
    severityByConcern,
    zoneFindings,
    confidenceByConcern,
    trendSummary,
    nextStepCategory,
    routineHints,
    riskFlags,
    overallConfidence,
    source: ai ? 'ai' : 'deterministic',
  };
}

// ============================================================================
// B. UserProfileContext selector
// ============================================================================

const GOAL_PHRASE: Record<NonNullable<AppState['goal']>, string> = {
  clear: 'clear breakouts',
  calm: 'calm sensitivity',
  bright: 'brighten dark marks',
};

function mapSensitivityToTags(s: AppState['sensitivity']): string[] {
  switch (s) {
    case 'very':
      return ['fragrance', 'high-strength actives', 'physical scrubs'];
    case 'somewhat':
      return ['fragrance'];
    default:
      return [];
  }
}

/**
 * Compose UserProfileContext from the persisted app state. Pure
 * function — caller passes a snapshot of `useAppStore.getState()`.
 */
export function selectUserProfileContext(
  state: AppState
): UserProfileContext {
  const safety = buildSafetyProfile({
    skinType: state.skinType,
    sensitivity: state.sensitivity,
    skinConditions: state.skinConditions,
    prescriptionFlag: state.prescriptionFlag,
    fragranceSensitive: state.fragranceSensitive,
    activeIrritation: state.activeIrritation,
    pregnancyCaution: state.pregnancyCaution,
    avoidIngredients: state.avoidIngredients,
  });

  const sensitivityTags: string[] = [...mapSensitivityToTags(state.sensitivity)];
  if (safety.hasSignal) {
    sensitivityTags.push(`safety_bias:${safety.bias}`);
    for (const c of safety.conditions) sensitivityTags.push(`condition:${c}`);
    for (const a of safety.avoidCategories)
      sensitivityTags.push(`avoid_category:${a}`);
    for (const ing of safety.avoidIngredients)
      sensitivityTags.push(`avoid_ingredient:${ing}`);
    sensitivityTags.push(`safety_summary:${safety.promptSummary}`);
  }

  // Display name: trimmed, empty-string-collapsed → null.
  const rawName =
    (state.user?.name && state.user.name.trim().length > 0
      ? state.user.name
      : state.name && state.name.trim().length > 0
      ? state.name
      : null) ?? null;
  const displayName = rawName ? rawName.trim() : null;

  const goals = state.goal ? [GOAL_PHRASE[state.goal]] : [];

  const knownProducts = Array.from(
    new Set([
      ...state.userRoutineMorning,
      ...state.userRoutineEvening,
      ...state.wishlist,
    ])
  );

  const latestScan: Scan | undefined =
    state.scans.length > 0
      ? state.scans[state.scans.length - 1]
      : undefined;
  const latestScanSummary = latestScan
    ? `${latestScan.summaryHeadline}${
        latestScan.summaryBody ? ` ${latestScan.summaryBody}` : ''
      }`.trim()
    : null;

  return {
    displayName,
    skinType:
      state.skinType === 'oily' ||
      state.skinType === 'dry' ||
      state.skinType === 'combination' ||
      state.skinType === 'sensitive'
        ? state.skinType
        : 'unknown',
    sensitivities: sensitivityTags,
    goals,
    routinePreferences: state.effort ?? 'unknown',
    budgetPreference: state.priceTier ?? 'unknown',
    knownProducts,
    latestScanId: latestScan?.id ?? null,
    latestScore: latestScan?.overallScore ?? null,
    latestRecommendationId: null,
    latestScanSummary,
    onboardingComplete: state.onboardingComplete === true,
  };
}

// ============================================================================
// C. RecommendationContext builder
// ============================================================================

const CONCERN_TYPE_TO_CONCERN_FIELD: Record<ConcernType, ConcernType> = {
  breakouts: 'breakouts',
  hydration: 'hydration',
  texture: 'texture',
  dark_marks: 'dark_marks',
  redness: 'redness',
  oiliness: 'oiliness',
  sensitivity: 'sensitivity',
  pores: 'pores',
};

/**
 * Deterministic local scorer. Takes a candidate + the user's
 * profile + (optional) skin state and returns a 0..100 score.
 *
 *   + concern alignment with topConcerns
 *   + skin-type fit
 *   + budget alignment
 *   - safety penalties (avoid_ingredient hits, condition mismatch)
 *
 * This is the core of "deterministic first, AI second": the
 * candidate set comes from AI, but the FINAL ordering is decided
 * by code we control.
 */
export function scoreCandidateLocal(
  candidate: LiveProductCandidate,
  profile: UserProfileContext,
  skinState: SkinState | null
): number {
  let score = candidate.matchScore ?? 60;

  // Safety: avoid_ingredient is a hard "do not give me this" signal.
  const avoidIngredients = profile.sensitivities
    .filter((t) => t.startsWith('avoid_ingredient:'))
    .map((t) => t.slice('avoid_ingredient:'.length).trim().toLowerCase())
    .filter((t) => t.length > 0);
  for (const ing of candidate.ingredientsHighlights) {
    const norm = ing.toLowerCase();
    if (avoidIngredients.some((a) => norm.includes(a))) {
      score -= 35;
      break;
    }
  }

  // avoid_category: heuristic ingredient-text matching.
  const avoidCategories = profile.sensitivities
    .filter((t) => t.startsWith('avoid_category:'))
    .map((t) => t.slice('avoid_category:'.length).trim().toLowerCase());
  if (avoidCategories.length > 0) {
    const ingredientText = candidate.ingredientsHighlights
      .join(' ')
      .toLowerCase();
    for (const cat of avoidCategories) {
      if (cat.includes('acid') && /acid/.test(ingredientText)) score -= 15;
      if (
        cat.includes('retinoid') &&
        /retinol|retinal|tretinoin/.test(ingredientText)
      )
        score -= 18;
      if (
        cat.includes('fragrance') &&
        /fragrance|parfum|essential oil/.test(ingredientText)
      )
        score -= 12;
    }
  }

  // Concern alignment: each topConcern the candidate covers is +5.
  if (skinState) {
    const topTypes = skinState.topConcerns.map(
      (c) => CONCERN_TYPE_TO_CONCERN_FIELD[c.concern]
    );
    const matches = candidate.concernTags.filter((t) => topTypes.includes(t))
      .length;
    score += matches * 5;
  }

  // Skin-type fit: small bonus when the description mentions it.
  if (profile.skinType !== 'unknown') {
    if (candidate.shortDescription.toLowerCase().includes(profile.skinType)) {
      score += 3;
    }
  }

  // Budget alignment.
  if (profile.budgetPreference !== 'unknown' && candidate.price !== null) {
    const tierFor =
      candidate.price < 25
        ? 'drugstore'
        : candidate.price < 60
        ? 'mid'
        : 'prestige';
    if (tierFor === profile.budgetPreference) score += 3;
  }

  return Math.max(0, Math.min(100, score));
}

function genRecommendationId(): string {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
  return `rec-${t}-${r}`;
}

/**
 * Compose a canonical RecommendationContext from a candidate set
 * + the current canonical user profile + (optional) canonical
 * skin state.
 *
 * v19.18 — when `rerankResult` is provided, the AI's choice for
 * heroId / alternativeIds / whyHeroFits OVERRIDES the deterministic
 * local-score order. When omitted, the deterministic order wins
 * (hero = highest localScore; alternatives = next 4). This is the
 * "AI-second" gate: the deterministic pipeline can ALWAYS produce
 * a hero on its own; AI rerank is purely refinement.
 */
export function buildRecommendationContext(args: {
  intent: RecommendationIntent;
  candidates: LiveProductCandidate[];
  profile: UserProfileContext;
  skinState: SkinState | null;
  state?: RecommendationAvailability;
  failureReason?: string;
  /**
   * v19.18 — optional AI rerank output. When present, hero +
   * alternatives + whyHeroFits come from the AI. When absent, the
   * deterministic local-score order is used.
   */
  rerankResult?: {
    heroId: string | null;
    alternativeIds: string[];
    whyHeroFits: string | null;
    /**
     * v19.27 — optional `whatToAvoid` from the AI rerank. When
     * present, overrides the deterministic
     * `deriveWhatToAvoid(profile)` so the user sees AI-curated
     * avoidance guidance for the current context.
     */
    whatToAvoid?: string[];
  } | null;
  /**
   * v19.21 — legacy retrieval-source tag.
   */
  retrievalSource?: 'live' | 'fallback' | 'empty' | 'unknown';
  /**
   * v19.24 — hard retrieval attempt contract. Required for every
   * call from the engine entry points; defaults are provided here
   * only so legacy callers don't fail to typecheck during the
   * migration window.
   */
  attempt?: RetrievalAttempt;
  /**
   * v19.24 — recent attempts (newest first), cap 5. The engine
   * threads this through so diagnostics can show "last few user
   * actions and which path served them."
   */
  attemptHistory?: readonly RetrievalAttempt[];
  /**
   * v19.33 — interpreted intent label from the query interpreter
   * (e.g. "product_type:moisturizer"). Threaded onto the canonical
   * RecommendationContext so the ProductUiTrace can show *why* the
   * engine fired the probes it did.
   */
  interpretedIntentLabel?: string | null;
  /**
   * v19.33 — ordered list of probe queries actually fired against
   * retrieval (live + seed-fallback). Empty when retrieval was
   * bypassed (cached/empty input).
   */
  probeQueries?: readonly string[];
}): RecommendationContext {
  const {
    intent,
    candidates,
    profile,
    skinState,
    state = 'available',
    failureReason,
    rerankResult,
    retrievalSource = 'unknown',
    attempt,
    attemptHistory,
    interpretedIntentLabel = null,
    probeQueries = [],
  } = args;
  const lastAttempt: RetrievalAttempt = attempt ?? {
    id: genRecommendationId(),
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    trigger: 'background',
    query: null,
    source:
      retrievalSource === 'live'
        ? 'obf_live'
        : retrievalSource === 'fallback'
        ? 'seed_fallback'
        : retrievalSource === 'empty'
        ? 'empty'
        : 'error',
    success: candidates.length > 0,
    failureReason: failureReason ?? null,
  };
  const attempts: readonly RetrievalAttempt[] =
    attemptHistory ?? [lastAttempt];
  const id = genRecommendationId();
  const generatedAt = new Date().toISOString();

  if (state === 'loading' || state === 'unavailable') {
    return {
      id,
      generatedAt,
      intent,
      availabilityState: state,
      candidateProducts: [],
      localScores: [],
      rerankScores: [],
      heroProduct: null,
      alternatives: [],
      whyHeroFits: null,
      whatToAvoid:
        rerankResult?.whatToAvoid && rerankResult.whatToAvoid.length > 0
          ? rerankResult.whatToAvoid
          : deriveWhatToAvoid(profile),
      failureReason: failureReason ?? null,
      source: 'deterministic',
      retrievalSource,
      lastAttempt,
      attempts,
      interpretedIntentLabel,
      probeQueries,
    };
  }

  if (candidates.length === 0) {
    return {
      id,
      generatedAt,
      intent,
      availabilityState: 'empty',
      candidateProducts: [],
      localScores: [],
      rerankScores: [],
      heroProduct: null,
      alternatives: [],
      whyHeroFits: null,
      whatToAvoid:
        rerankResult?.whatToAvoid && rerankResult.whatToAvoid.length > 0
          ? rerankResult.whatToAvoid
          : deriveWhatToAvoid(profile),
      failureReason: failureReason ?? null,
      source: 'deterministic',
      retrievalSource: 'empty',
      lastAttempt,
      attempts,
      interpretedIntentLabel,
      probeQueries,
    };
  }

  // Local rerank — always runs. This is the deterministic baseline.
  const localScores: CandidateScore[] = candidates.map((c) => ({
    candidateId: c.id,
    localScore: scoreCandidateLocal(c, profile, skinState),
    rerankScore: c.matchScore ?? null,
  }));
  const scoreMap = new Map(localScores.map((s) => [s.candidateId, s.localScore]));
  const localSorted = [...candidates].sort(
    (a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0)
  );

  // v19.18 — apply the AI rerank when present, else use the
  // deterministic order. The AI rerank only chooses ordering +
  // writes whyHeroFits; it cannot inject new candidates and any
  // unknown id is silently dropped.
  let hero: LiveProductCandidate | null = null;
  let alternatives: LiveProductCandidate[] = [];
  let whyHeroFits: string | null = null;
  let source: 'deterministic' | 'ai-rerank' = 'deterministic';

  const byId = new Map(candidates.map((c) => [c.id, c]));
  if (rerankResult && rerankResult.heroId && byId.has(rerankResult.heroId)) {
    hero = byId.get(rerankResult.heroId) ?? null;
    const heroId = rerankResult.heroId;
    alternatives = rerankResult.alternativeIds
      .filter((id) => id !== heroId && byId.has(id))
      .slice(0, 4)
      .map((id) => byId.get(id) as LiveProductCandidate);
    // If rerank gave fewer alternatives than 4, top-up from local
    // sort (preserving "deterministic value preserved when AI is
    // imperfect" guarantee).
    if (alternatives.length < 4) {
      const seen = new Set<string>([heroId, ...alternatives.map((a) => a.id)]);
      for (const c of localSorted) {
        if (alternatives.length >= 4) break;
        if (!seen.has(c.id)) {
          alternatives.push(c);
          seen.add(c.id);
        }
      }
    }
    whyHeroFits = hero
      ? rerankResult.whyHeroFits?.trim() ||
        buildWhyHeroFits(hero, profile, skinState)
      : null;
    source = 'ai-rerank';
  } else {
    // Deterministic fallback — no rerank or rerank returned an
    // unknown heroId. The deterministic local-score order wins.
    hero = localSorted[0] ?? null;
    alternatives = localSorted
      .filter((c) => c.id !== hero?.id)
      .slice(0, 4);
    whyHeroFits = hero ? buildWhyHeroFits(hero, profile, skinState) : null;
    source = 'deterministic';
  }

  // Update rerankScores so consumers can inspect the AI's choice.
  // When source === 'ai-rerank', positions in alternativeIds get
  // their localScore as rerankScore plus a rank-position bonus
  // so the AI's order is reflected without inventing numbers.
  const rerankScores: CandidateScore[] =
    source === 'ai-rerank' && hero
      ? localScores.map((s) => {
          if (s.candidateId === hero!.id) {
            return { ...s, rerankScore: 100 };
          }
          const altIdx = alternatives.findIndex(
            (a) => a.id === s.candidateId
          );
          if (altIdx >= 0) {
            return { ...s, rerankScore: 90 - altIdx * 5 };
          }
          return { ...s, rerankScore: null };
        })
      : localScores;

  return {
    id,
    generatedAt,
    intent,
    availabilityState: 'available',
    candidateProducts: localSorted,
    localScores,
    rerankScores,
    heroProduct: hero,
    alternatives,
    whyHeroFits,
    whatToAvoid:
      rerankResult?.whatToAvoid && rerankResult.whatToAvoid.length > 0
        ? rerankResult.whatToAvoid
        : deriveWhatToAvoid(profile),
    failureReason: failureReason ?? null,
    source,
    retrievalSource,
    lastAttempt,
    attempts,
    interpretedIntentLabel,
    probeQueries,
  };
}

function buildWhyHeroFits(
  hero: LiveProductCandidate,
  profile: UserProfileContext,
  skinState: SkinState | null
): string {
  const primary = skinState?.topConcerns[0]?.concern ?? null;
  if (primary && hero.concernTags.includes(primary)) {
    const reason = hero.matchReason?.trim();
    if (reason && reason.length > 0) {
      return `For ${primary.replace(/_/g, ' ')} — ${reason}`;
    }
    return `Targets ${primary.replace(/_/g, ' ')} based on visible signals from your scan.`;
  }
  if (hero.matchReason?.trim()) return hero.matchReason.trim();
  if (profile.skinType !== 'unknown') {
    return `A balanced pick for ${profile.skinType} skin.`;
  }
  return 'A clean, well-reviewed pick for daily use.';
}

function deriveWhatToAvoid(profile: UserProfileContext): string[] {
  const out: string[] = [];
  for (const t of profile.sensitivities) {
    if (t === 'safety_bias:high') {
      out.push('Skip strong acids and high-strength retinoids tonight.');
    } else if (t === 'safety_bias:moderate') {
      out.push('Keep actives gentle while skin settles.');
    } else if (t === 'avoid_category:fragrance') {
      out.push('Avoid fragranced products.');
    } else if (t === 'avoid_category:physical_scrubs') {
      out.push('Skip physical scrubs.');
    } else if (t === 'avoid_category:denatured_alcohol') {
      out.push('Avoid drying alcohols.');
    }
  }
  return Array.from(new Set(out)).slice(0, 3);
}

// ============================================================================
// Convenience: full canonical bundle.
// ============================================================================

export function selectCanonicalBundle(args: {
  state: AppState;
  scan?: Scan;
  previousScan?: Scan;
  candidates?: LiveProductCandidate[];
  intent?: RecommendationIntent;
  recommendationState?: RecommendationAvailability;
}): {
  skinState: SkinState | null;
  profile: UserProfileContext;
  recommendation: RecommendationContext | null;
} {
  const skinState = selectSkinState(
    args.scan,
    args.previousScan,
    args.state.scans
  );
  const profile = selectUserProfileContext(args.state);
  let recommendation: RecommendationContext | null = null;
  if (args.candidates && args.intent) {
    recommendation = buildRecommendationContext({
      intent: args.intent,
      candidates: args.candidates,
      profile,
      skinState,
      state: args.recommendationState ?? 'available',
    });
  }
  return { skinState, profile, recommendation };
}

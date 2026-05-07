/**
 * Canonical state contracts.
 *
 * Three objects every important screen and AI call should read instead of
 * reaching past the store for raw scattered fields:
 *
 *   • SkinState            — post-scan truth (what we observed about the skin)
 *   • UserProfileContext   — user grounding (who the user is)
 *   • RecommendationContext — recommendation output (what to buy / avoid)
 *
 * These are *derived* shapes — built from existing fragmented state by
 * selectors in `src/store/canonicalSelectors.ts`. Adding them is additive: no
 * existing screen has to change for the types to land. New screens (or
 * refactored ones) bind to these instead of raw `useAppStore(s => s.scans)`.
 *
 * Two non-negotiable rules these types encode:
 *
 *   1. Observed facts and inferred beliefs are distinct. Anything the model
 *      told us has a `confidence` (0..1) attached at the field level. The UI
 *      decides what to surface based on that — never pretending precision the
 *      data doesn't have.
 *   2. Failure shapes are first-class. `RecommendationContext.availabilityState`
 *      is the one place the UI checks; `failureReason` is a real value when
 *      retrieval fails, never silently empty.
 *
 * Field names follow the product spec (`Pura AI Build Spec`). Where the spec
 * named a field but the AI contract has a richer equivalent (e.g. the spec's
 * `imageQuality` vs. contract's `image_quality { usable, issues, confidence }`),
 * the canonical type carries the richer object so the UI can be confidence-
 * aware.
 */

import type {
  ConcernType,
  FaceScanAnalysis,
  LiveProductCandidate,
  ProductCategory,
  ProductMatch,
  RoutineRecommendation,
  Severity as AiSeverity,
} from '@/ai/ai-contracts';

// ============================================================================
// SkinState — canonical post-scan truth.
// ============================================================================

export type SkinScoreBand = 'poor' | 'fair' | 'good' | 'great';

export type ConfidenceTier = 'low' | 'medium' | 'high';

/**
 * Image-quality slice carried directly from the AI analysis when present, or
 * synthesised conservatively from a deterministic capture (`usable: true,
 * confidence: 0.4`). When `usable === false`, the UI must say less, not more.
 */
export interface SkinImageQuality {
  usable: boolean;
  confidence: number;
  issues: Array<'blurry' | 'low_light' | 'angled' | 'partial_face' | 'occluded'>;
}

/**
 * One row in the SkinState's concern-centric view. Pulls together the model's
 * structured finding with the deterministic concern fallback so UI consumers
 * never have to choose between `aiAnalysis.findings[]` and `scan.concerns[]`.
 */
export interface SkinConcernSummary {
  concern: ConcernType;
  severity: AiSeverity;
  /** 1 = primary, 2 = secondary, 3 = supporting; 0 = present but not surfaced. */
  rank: 0 | 1 | 2 | 3;
  /** 0..1 model confidence in this finding. */
  confidence: number;
  /** Plain-English regions: ["chin"], ["forehead", "left_cheek"]. */
  regions: string[];
  /** One-sentence user-facing summary. */
  summary: string;
  /** Movement vs the previous scan. */
  direction: 'better' | 'same' | 'worse' | 'new';
}

/**
 * Per-zone finding suitable for face-map overlays. Coordinates remain
 * normalised 0..1 against the captured photo — never against a generic
 * anatomical template — so the UI can clip to face bounds and avoid hair /
 * clothes / background.
 */
export interface SkinZoneFinding {
  zone: string;
  concern: ConcernType;
  severity: AiSeverity;
  confidence: number;
  /** 3-12 points outlining the observed area in the captured image. */
  polygon?: Array<{ x: number; y: number }>;
}

export interface SkinState {
  scanId: string;
  /** ISO 8601. */
  createdAt: string;
  imageQuality: SkinImageQuality;

  /** Integer 0..100. */
  score: number;
  scoreBand: SkinScoreBand;
  /** Integer change vs previous scan; null on first scan. */
  scoreDelta: number | null;

  summaryHeadline: string;
  summaryBody: string;

  /** Up to 4 concerns ranked 1→4 by what to tackle first. */
  topConcerns: SkinConcernSummary[];
  /** Severity per concern axis the AI surfaced; absent concerns omitted. */
  severityByConcern: Partial<Record<ConcernType, AiSeverity>>;
  zoneFindings: SkinZoneFinding[];
  /** Aggregate confidence per concern (max of per-finding confidence). */
  confidenceByConcern: Partial<Record<ConcernType, number>>;

  /** Aggregate trend across history: "improving", "holding", "sliding", or null
   *  when there's no second scan to compare against. */
  trendSummary:
    | { direction: 'improving' | 'holding' | 'sliding'; deltaSinceFirst: number }
    | null;

  /** What the user should look at next: a single product category, not a list. */
  nextStepCategory: ProductCategory | null;
  /** 1-3 short hints the Tonight Plan card surfaces. */
  routineHints: string[];
  /** Things the user should avoid tonight: ingredients, behaviours, categories. */
  riskFlags: string[];

  /** Overall confidence tier — collapses imageQuality + per-concern signals so
   *  the UI has one easy gate ("if low, say less"). */
  overallConfidence: ConfidenceTier;

  /** Was this SkinState built from a real AI run, or synthesised from a
   *  deterministic fallback? UI badges and assistant grounding both check it. */
  source: 'ai' | 'deterministic';
}

// ============================================================================
// UserProfileContext — canonical user grounding.
// ============================================================================

export type AppSkinType = 'oily' | 'dry' | 'combination' | 'sensitive' | 'unknown';

export type RoutineEffort = 'minimal' | 'moderate' | 'enthusiast' | 'decide-for-me' | 'unknown';

export type BudgetPreference = 'drugstore' | 'mid' | 'prestige' | 'unknown';

export interface UserProfileContext {
  /** Trimmed display name, or null when not set. The assistant must NEVER
   *  invent a name when this is null. */
  displayName: string | null;
  skinType: AppSkinType;
  /** Free-form tags the user opted into: "fragrance", "rosacea",
   *  "avoid_ingredient:retinol", "safety_bias:moderate", etc. */
  sensitivities: string[];
  /** "clear breakouts", "calm sensitivity", "brighten dark marks". */
  goals: string[];
  routinePreferences: RoutineEffort;
  budgetPreference: BudgetPreference;
  /** Product ids known to the user — morning + evening + saved (deduped). */
  knownProducts: string[];

  /** Latest scan id, or null when no scan has been run. */
  latestScanId: string | null;
  /** Latest skin score (0..100) or null. */
  latestScore: number | null;
  /** Stable id for the last recommendation context produced for this user. */
  latestRecommendationId: string | null;
  /** Short headline from the latest scan — what to ground assistant replies in. */
  latestScanSummary: string | null;

  /** Has the user completed onboarding well enough to take action on advice? */
  onboardingComplete: boolean;
}

// ============================================================================
// RecommendationContext — canonical recommendation output.
// ============================================================================

/**
 * `available` — at least one candidate passed every filter and we have a hero.
 * `empty`     — pipeline ran successfully but nothing matched (rare).
 * `unavailable` — retrieval / network / proxy failed; show the LiveProductsUnavailable state.
 * `loading`   — a request is in flight; render skeleton, never fake products.
 */
export type RecommendationAvailability =
  | 'available'
  | 'empty'
  | 'unavailable'
  | 'loading';

/** What kicked off the pipeline: scan-driven, free-text query, or concern-only. */
export type RecommendationIntent =
  | { kind: 'scan'; scanId: string; primaryConcern: ConcernType | null }
  | { kind: 'query'; text: string }
  | { kind: 'concern'; concern: ConcernType };

/**
 * Per-candidate score breakdown produced by the deterministic pre-rank step.
 * `localScore` is the deterministic ranking input; `rerankScore` is what the
 * AI did with it (or null when the AI was bypassed). Keeping both means the
 * UI can show *why* a hero won without reading the AI's mind.
 */
export interface CandidateScore {
  candidateId: string;
  /** Deterministic 0..100, derived from concern overlap, safety bias, prior preference. */
  localScore: number;
  /** AI rerank 0..100 within the candidate set, or null when AI was bypassed. */
  rerankScore: number | null;
}

export interface RecommendationContext {
  /** Stable id so the UI / assistant can reference a specific run. */
  id: string;
  generatedAt: string;
  intent: RecommendationIntent;
  availabilityState: RecommendationAvailability;

  /** Full candidate set after dedupe + filtering. */
  candidateProducts: LiveProductCandidate[];
  localScores: CandidateScore[];
  rerankScores: CandidateScore[];

  /** Top pick — null when availabilityState !== 'available'. */
  heroProduct: LiveProductCandidate | null;
  alternatives: LiveProductCandidate[];

  /** One concise sentence explaining why the hero fits *this* user *today*. */
  whyHeroFits: string | null;
  /** Ingredients / categories / behaviours the user should avoid alongside it. */
  whatToAvoid: string[];

  /** Honest reason when `availabilityState !== 'available'`. */
  failureReason: string | null;

  /** Was the rerank step done by the AI, or skipped? */
  source: 'ai-rerank' | 'deterministic';
}

// ============================================================================
// Convenience type aliases.
// ============================================================================

export type { ProductMatch, RoutineRecommendation, FaceScanAnalysis };

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

  /**
   * v19.21 — explicit retrieval-source tag (legacy four-way enum).
   * Kept for backward-compat with v19.21–v19.23 callers that read
   * this. New consumers should read `lastAttempt.source` (the hard
   * v19.24 contract below) which has stricter values and richer
   * trigger metadata.
   */
  retrievalSource: 'live' | 'fallback' | 'empty' | 'unknown';

  /**
   * v19.24 — hard retrieval attempt contract. EVERY call to
   * `getRecommendationContext*` records exactly one attempt and
   * stamps it here. Diagnostics, the UI, and telemetry all read
   * this. There is no `'unknown'` value: every successful or
   * failed retrieval has an explicit `RetrievalSource`.
   *
   * Combined with `RecommendationContext.attempts` (the bounded
   * history below), this lets diagnostics prove which path the
   * actual user-visible action used, not just what diagnostics
   * itself ran.
   */
  lastAttempt: RetrievalAttempt;

  /**
   * v19.24 — bounded history of recent attempts (newest first,
   * cap 5). Lets diagnostics show the chain
   * "initial_load → seed_fallback → retry → obf_live" so the user
   * can see exactly what the last few user actions did.
   */
  attempts: readonly RetrievalAttempt[];

  /**
   * v19.33 — interpreted intent label (e.g. "product_type:moisturizer",
   * "concern:hydration", "best_for_my_skin"). Surfaces the structured
   * decision that drove probe expansion so the diagnostics + ProductUiTrace
   * can show *why* the engine fired the probes it did. `null` when no
   * intent interpretation ran.
   */
  interpretedIntentLabel: string | null;

  /**
   * v19.33 — the probe queries actually fired against retrieval, in
   * weight order. Empty when retrieval was bypassed (e.g. cached
   * result, no query). The ProductUiTrace replays this so the user
   * can verify on-device exactly which probes the engine sent.
   */
  probeQueries: readonly string[];

  /**
   * v19.36 — resolved query family. Set to the
   * `TARGET_QUERY_FAMILIES` label (e.g. `family:moisturizer`)
   * when the engine matched a hard-coded family; null otherwise.
   * Surfaces on the trace so the user can see "this is being
   * treated as moisturizer-family" vs generic.
   */
  queryFamily: string | null;
  /**
   * v19.36 — single skin-axis label the engine resolved for this
   * fetch (e.g. `oily`, `sensitive`, `dry`, `unknown`). Anchors
   * the personalization the AI rerank applied.
   */
  skinFitReason: string | null;
  /**
   * v19.36 — composite skin-fit score for the hero candidate
   * (0..100). Higher = better match for the user's skin axes.
   * `null` when no hero was selected.
   */
  heroSkinFitScore: number | null;
  /**
   * v19.36 — candidates dropped from the hero pool by the
   * skin-fit filter, with a short human-readable reason. The
   * truth panel renders these so the user can see WHY a random
   * heavy cream didn't become hero for an oily/acne user.
   */
  excludedFromHero: ReadonlyArray<{
    id: string;
    name: string;
    reason: string;
  }>;

  /**
   * v19.42 — explicit AI rerank status. Replaces the previous
   * fuzzy "source: 'ai-rerank' | 'deterministic'" tag which
   * collapsed many distinct failure modes into one label and
   * showed up as gray/silent in the diagnostics panel. The
   * RerankStatus records every step from "attempted" through
   * "applied" with explicit reasons for each negative branch.
   * The dev truth panel surfaces this so the user can see
   * exactly WHY the hero is what it is.
   */
  rerankStatus: RerankStatus;

  /**
   * v19.43 — AI-FIRST PRODUCT RECOMMENDATION STATUS. The planner
   * stage runs BEFORE retrieval and produces a structured plan
   * (mode + slots + searchQueries). Retrieval then enriches each
   * slot into a real product card. The status records every step
   * so the dev panel can never be gray and `productSourceMode`
   * tells the user exactly which path produced the visible
   * result:
   *
   *   • `ai_first`             — AI planner returned a plan and
   *                              retrieval enriched it; visible
   *                              products come from the AI's
   *                              chosen slots.
   *   • `ai_failed_fallback`   — AI planner was attempted but
   *                              failed (proxy down / timeout /
   *                              invalid plan); visible products
   *                              come from the legacy retrieval +
   *                              rerank pipeline.
   *   • `deterministic_only`   — AI planner was deliberately not
   *                              attempted (e.g. background
   *                              trigger); visible products come
   *                              from retrieval + rerank only.
   */
  recommendationStatus: ProductRecommendationStatus;
}

/**
 * v21.0 — AI-first product recommendation status with explicit
 * planner + selector breakdown. Replaces the v19.43 fields
 * (aiRecommendationAttempted/Returned/Applied/Reason) with the
 * required v21.0 names (aiPlan-prefixed and aiSelect-prefixed) so
 * the dev panel can distinguish planner failures from selector
 * failures.
 */
export interface ProductRecommendationStatus {
  /** Which mode the planner targeted. */
  recommendationMode: 'best_for_you' | 'query_driven_search' | null;
  /** Dominant concern label inferred by the planner (null when none). */
  dominantConcern: string | null;
  /** Planner stage. */
  aiPlanAttempted: boolean;
  aiPlanReturned: boolean;
  aiPlanApplied: boolean;
  aiPlanReason: string | null;
  /** Selector stage (only meaningful when planner succeeded). */
  aiSelectAttempted: boolean;
  aiSelectReturned: boolean;
  aiSelectApplied: boolean;
  aiSelectReason: string | null;
  /** One-line plain-English user-need summary from the planner. */
  userNeedSummary: string | null;
  /** Short reason explaining why this slot fits THIS user (from selector). */
  whyTheseProducts: string | null;
  /**
   * Which path produced the visible result. Three discrete states;
   * gray/unknown is forbidden.
   */
  productSourceMode: 'ai_first' | 'ai_failed_fallback' | 'deterministic_only';
  /** Number of slots in the AI plan (0 when no plan). */
  slotCount: number;
  /** Slot labels for the truth panel. */
  slotLabels: readonly string[];
  /** Version markers so the device test can confirm v21.0 is running. */
  plannerVersion: string | null;
  selectorVersion: string | null;
  /**
   * v21.2 — which visible result model the engine produced.
   *   `best_for_you_slots` — multi-slot routine layout (each slot
   *      can be a different product type).
   *   `typed_search_list`  — flat same-intent ranked list (6 first,
   *      same dominant family).
   */
  /**
   * v22.1 — `typed_search_flat` is the new flat single-family
   * typed-search mode (planTypedSearch -> retrieval -> flat rank).
   * `typed_search_list` was the v21.2 slot-flatten hack and is no
   * longer produced by the engine; kept in the type for backwards-
   * compat with any saved trace fixtures.
   */
  resultMode:
    | 'best_for_you_slots'
    | 'typed_search_list'
    | 'typed_search_flat'
    | null;
  /** v21.2 — dominant queryFamily resolved for typed-search mode. */
  dominantSearchFamily: string | null;
  /** v21.2 — total candidates the engine produced (visible + scroll). */
  resultCountTotal: number;
  /**
   * v21.2 — what the top-right AISourceBadge should display for the
   * products feature. Computed by the engine; the badge reads it
   * instead of the generic feature-source telemetry that defaulted
   * to IDLE.
   */
  badgeMode: 'ai_on' | 'fallback' | 'pending' | 'idle';
}

/**
 * v19.42 — explicit AI rerank execution status. Every fetch on
 * the user-facing product path produces one of these.
 *
 * `source` resolves to:
 *   • 'ai_rerank'              — AI rerank ran and was applied
 *   • 'deterministic_fallback' — AI rerank was deliberately not
 *                                attempted (e.g. background trigger,
 *                                empty candidate pool), so the
 *                                deterministic skin-fit hero won
 *   • 'ai_failed_fallback'     — AI rerank was attempted but failed
 *                                (proxy down / race timeout / null /
 *                                invalid output), so the deterministic
 *                                skin-fit hero won
 */
export interface RerankStatus {
  attempted: boolean;
  skipped: boolean;
  skipReason: string | null;
  returned: boolean;
  returnReason: string | null;
  applied: boolean;
  appliedReason: string | null;
  heroBeforeRerank: string | null;
  heroAfterRerank: string | null;
  alternativeIdsBeforeRerank: readonly string[];
  alternativeIdsAfterRerank: readonly string[];
  source: 'ai_rerank' | 'deterministic_fallback' | 'ai_failed_fallback';
}

// ============================================================================
// v19.24 — Hard retrieval contract.
//
// Every fetch attempt against the recommendation engine produces
// exactly one `RetrievalAttempt`. The contract makes the truth
// unambiguous: there is no fuzzy 'unknown' value, every attempt
// carries a strict source, a trigger label, timing, and explicit
// success/failure shape.
// ============================================================================

export type RetrievalSource =
  | 'ai_proxy'      // legacy AI gateway lookup (must not be used in v19.x+)
  | 'obf_live'      // Open Beauty Facts live search (the v19.23 path)
  | 'seed_fallback' // bundled deterministic seed catalog
  | 'empty'         // both live and fallback returned zero candidates
  | 'error';        // catastrophic failure before any path resolved

export type RetrievalTrigger =
  | 'initial_load'
  | 'retry'
  | 'chip_press'
  | 'search'
  | 'assistant'
  | 'background';

export interface RetrievalAttempt {
  /** Stable id, generated at attempt start. */
  id: string;
  /** ISO timestamp when the engine entry point was invoked. */
  startedAt: string;
  /** ISO timestamp when the engine returned. `null` while in flight. */
  completedAt: string | null;
  /** What action triggered this attempt. */
  trigger: RetrievalTrigger;
  /** The query text or scan id that drove the attempt. */
  query: string | null;
  /** The path that ultimately served the candidates. */
  source: RetrievalSource;
  /**
   * `true` when `source !== 'empty' && source !== 'error'` AND
   * candidates were returned. The engine sets this explicitly so
   * UI consumers don't have to derive it from string comparisons.
   */
  success: boolean;
  /** Human-readable reason on failure, or `null` on success. */
  failureReason: string | null;
}

// ============================================================================
// Convenience type aliases.
// ============================================================================

export type { ProductMatch, RoutineRecommendation, FaceScanAnalysis };

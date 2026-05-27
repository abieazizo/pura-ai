/**
 * Pura Routine — canonical types.
 *
 * The routine domain is small but strict: every screen reads from a
 * typed lifecycle state, never from raw AI output and never from
 * scattered store fields. The lifecycle is the contract the UI binds
 * to; nothing else.
 *
 * Three rules baked into the shapes:
 *   1. Product availability is explicit. The user cannot start a step
 *      whose product is `recommended` or `missing` — only `owned`,
 *      `not_required`, or explicitly `skipped` steps may execute.
 *   2. Routine sourcing is traceable. Every routine carries the
 *      scanId that produced it; persistence keys off it.
 *   3. Build progress is grounded. The builder reports concrete
 *      stages; the UI percentage is derived from real milestones.
 */

import type { ConcernType } from '@/types/scanResults';

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export type RoutineLifecycleState =
  | 'no_scan'
  | 'scan_available'
  | 'building'
  | 'ready_to_review'
  | 'confirming_products'
  | 'active'
  | 'session_in_progress'
  | 'session_complete'
  | 'build_failed';

export type RoutineTimeOfDay = 'morning' | 'evening';

export type RoutineStepType = 'cleanse' | 'treat' | 'hydrate' | 'protect';

// ---------------------------------------------------------------------------
// Product / availability
// ---------------------------------------------------------------------------

/**
 * `owned` — user has confirmed (or shelf shows) they already own this.
 * `recommended` — matched from catalog, awaiting confirmation.
 * `needs_confirmation` — user must respond before the step can be started.
 * `ordered` — user purchased; treated as available once delivered.
 * `missing` — required category with no match yet; routes to Shop.
 * `skipped` — user opted out of this step.
 * `not_required` — step is optional and disabled.
 */
export type ProductAvailability =
  | 'owned'
  | 'recommended'
  | 'needs_confirmation'
  | 'ordered'
  | 'missing'
  | 'skipped'
  | 'not_required';

export interface RoutineProduct {
  id: string;
  brand: string;
  name: string;
  imageUrl?: string;
  imageAsset?: number;
  productType: RoutineStepType;
  /** Recommendation reason — short, plain English. Never a fake match %. */
  whyMatched?: string;
  availability: ProductAvailability;
}

// ---------------------------------------------------------------------------
// Step
// ---------------------------------------------------------------------------

export interface RoutineStep {
  id: string;
  order: number;
  type: RoutineStepType;
  title: string;
  purpose: string;
  directions: string;
  timing: RoutineTimeOfDay | 'both';
  /** "Daily", "2× weekly", "Morning only" — short label. */
  frequency: string;
  optional: boolean;
  /** Findings (scan finding ids) this step targets. */
  relatedFocusAreaIds: string[];
  product?: RoutineProduct;
  availability: ProductAvailability;
  /** ISO of the most recent completion, scoped to the active session. */
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Full custom routine
// ---------------------------------------------------------------------------

export interface CustomRoutine {
  id: string;
  scanId: string;
  createdAt: string;
  status: RoutineLifecycleState;
  morningSteps: RoutineStep[];
  eveningSteps: RoutineStep[];
  /** 1-3 short reasons surfaced on the Ready / Review screens. */
  explanation: string[];
  /** Findings the routine deliberately excluded actives for. */
  excludedDirections?: string[];
  /** Computed: at least one required morning step is `owned`. */
  canStartMorning: boolean;
  /** Computed: at least one required evening step is `owned`. */
  canStartEvening: boolean;
  /** True when the routine is reduced because the scan was partial. */
  limitedByScan: boolean;
}

// ---------------------------------------------------------------------------
// Build progress (grounded in actual service milestones)
// ---------------------------------------------------------------------------

export type RoutineBuildStage =
  | 'reading_focus_areas'
  | 'matching_step_types'
  | 'checking_shelf'
  | 'matching_products'
  | 'finalizing_plan'
  | 'complete';

/**
 * Visual product-step phases the UI walks through during a build.
 * One per step type (cleanse/treat/moisturize/protect). The
 * orchestrator advances activeProductStep as it picks each product;
 * the visual layer shows the active phase as expanded and the others
 * as pending/complete.
 */
export type RoutineBuildProductStep =
  | 'cleanse'
  | 'treat'
  | 'moisturize'
  | 'protect';

export type RoutineBuildSubPhase =
  | 'selecting_step'
  | 'finding_best_match'
  | 'checking_compatibility';

export interface RoutineBuildProgress {
  scanId: string;
  percent: number;
  activeStage: RoutineBuildStage;
  completedStages: RoutineBuildStage[];
  /** Which product step the build is currently choosing. Null while
   *  reading the scan and after the full plan has been finalized. */
  activeProductStep: RoutineBuildProductStep | null;
  /** Sub-phase within the active product step. */
  activeSubPhase: RoutineBuildSubPhase;
  /** Steps already chosen (in order). */
  completedProductSteps: RoutineBuildProductStep[];
  startedAt: string;
}

/**
 * Display-only stage list used by the build screen — keeps the four
 * displayed stages in one place so the UI doesn't drift from the
 * service's reported stages.
 */
export const ROUTINE_BUILD_STAGES: Array<{
  key: RoutineBuildStage;
  label: string;
}> = [
  { key: 'reading_focus_areas', label: 'Reading scan' },
  { key: 'matching_step_types', label: 'Choosing steps' },
  { key: 'checking_shelf', label: 'Checking products' },
  { key: 'finalizing_plan', label: 'Finalizing plan' },
];

export const ROUTINE_BUILD_PERCENT_BY_STAGE: Record<RoutineBuildStage, number> = {
  reading_focus_areas: 18,
  matching_step_types: 38,
  checking_shelf: 58,
  matching_products: 78,
  finalizing_plan: 94,
  complete: 100,
};

// ---------------------------------------------------------------------------
// Session (a single morning or evening execution)
// ---------------------------------------------------------------------------

export interface RoutineSessionRecord {
  routineId: string;
  scanId: string;
  /** Local date key, e.g. "2026-05-26". */
  dateKey: string;
  timeOfDay: RoutineTimeOfDay;
  startedAt: string;
  completedAt?: string;
  completedStepIds: string[];
  skippedStepIds: string[];
  status: 'in_progress' | 'complete' | 'abandoned';
}

// ---------------------------------------------------------------------------
// Build request / response (service contract)
// ---------------------------------------------------------------------------

export interface RoutineBuildRequest {
  scanId: string;
  findings: Array<{
    id: string;
    type: ConcernType;
    priority: 'high' | 'medium' | 'low';
    shortFinding: string;
    recommendedDirection: string;
  }>;
  scanQuality: {
    status: 'excellent' | 'usable' | 'partial';
    confidence: number;
  };
  shelfProducts: RoutineProduct[];
}

export interface GeneratedRoutineStep {
  id: string;
  order: number;
  type: RoutineStepType;
  title: string;
  purpose: string;
  directions: string;
  timing: RoutineTimeOfDay | 'both';
  frequency: string;
  optional: boolean;
  relatedFocusAreaIds: string[];
  requiredProductCategory: RoutineStepType;
  /** Catalog ids the matcher should consider for this slot. */
  compatibleProductIds?: string[];
}

export interface RoutineBuildResponse {
  routineId: string;
  explanation: string[];
  morningSteps: GeneratedRoutineStep[];
  eveningSteps: GeneratedRoutineStep[];
  excludedDirections?: string[];
  limitedByScan: boolean;
}

// ---------------------------------------------------------------------------
// Progress comparison
// ---------------------------------------------------------------------------

export type ProgressComparabilityReason =
  | 'no_scan'
  | 'one_scan_only'
  | 'insufficient_quality'
  | 'awaiting_next_consistent_scan';

export interface ProgressComparison {
  /** True only when at least two comparable scans exist. */
  canCompare: boolean;
  reason?: ProgressComparabilityReason;
  /** Score delta vs previous comparable scan, only when canCompare. */
  overallImprovementPercent?: number;
  /** Compared-against label, e.g. "your previous scan", "Week of May 19". */
  comparedAgainstLabel?: string;
  /** Series of points to render the trend line, only when canCompare. */
  trendPoints?: Array<{ label: string; score: number }>;
  /** Qualitative per-focus-area row only — no fake quantitative deltas. */
  focusAreaRows: Array<{
    label: string;
    status: 'improving' | 'little_change' | 'still_active' | 'measuring';
  }>;
  /** This week's completed-vs-target sessions. */
  consistency: {
    completedThisWeek: number;
    targetThisWeek: number;
  };
  /** Total reliable scans counted toward comparison. */
  reliableScanCount: number;
}

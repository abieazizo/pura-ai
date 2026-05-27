/**
 * Home night-state contract (v26).
 *
 * Discriminated union the redesigned Home screen renders against. Built
 * deterministically from `scans` by `selectHomeNightState` in
 * `src/state/homeNight.ts`. The home screen never reads raw scan output
 * or raw AI fields directly; it only reads from this object.
 *
 * Trust rule: pre-scan states never describe tonight's skin. Fresh
 * states only describe what the scan actually showed. Edit phrasing is
 * always appearance-based ("looks", "appears"), never diagnostic.
 */

export type HomeNightStateKind =
  | 'no_baseline'
  | 'stale_pre_scan'
  | 'next_night_after_recovery'
  | 'fresh_recovery_night'
  | 'fresh_hydration_edit'
  | 'fresh_stable_night'
  | 'tonight_complete';

/**
 * The classification of the *last* edit Pura applied — used to phrase
 * the historical note on stale screens without claiming current truth.
 */
export type PreviousEditKind =
  | 'recovery'
  | 'hydration'
  | 'stable'
  | 'unknown';

export interface PreviousEditMemory {
  kind: PreviousEditKind;
  /** Plain English region phrase ("chin", "cheeks", "across the face"). */
  region: string | null;
  /** The single product step that was paused, if any. */
  pausedStepName: string | null;
}

export interface NoBaselineState {
  kind: 'no_baseline';
}

export interface StalePreScanState {
  kind: 'stale_pre_scan';
  /** Full nights elapsed since the last scan. Min 1. */
  nightsSinceLastScan: number;
  previousEdit: PreviousEditMemory;
}

export interface NextNightAfterRecoveryState {
  kind: 'next_night_after_recovery';
  nightsSinceLastScan: number;
  previousEdit: PreviousEditMemory;
}

export interface FreshRecoveryNightState {
  kind: 'fresh_recovery_night';
  scanId: string;
  /** Where visible sensitivity appears ("chin", "cheeks", "across the face"). */
  region: string;
  /** The step Pura is pausing tonight. */
  pausedStepName: string;
}

export interface FreshHydrationEditState {
  kind: 'fresh_hydration_edit';
  scanId: string;
  region: string;
}

export interface FreshStableNightState {
  kind: 'fresh_stable_night';
  scanId: string;
}

/**
 * The user has completed tonight's routine. Home becomes a closing
 * state — quiet acknowledgement, no further CTAs, no upsell. Persists
 * until the calendar day rolls over (the selector treats a completion
 * stamp older than the current day as no longer applicable).
 */
export interface TonightCompleteState {
  kind: 'tonight_complete';
  completedAt: string;
}

export type HomeNightState =
  | NoBaselineState
  | StalePreScanState
  | NextNightAfterRecoveryState
  | FreshRecoveryNightState
  | FreshHydrationEditState
  | FreshStableNightState
  | TonightCompleteState;

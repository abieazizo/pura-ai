/**
 * pura27 — Shared typed session contracts for the nightly experience.
 *
 * These shapes are the *only* contract the three nightly screens (Home,
 * Products, Routine) and their shared UI primitives consume. Today they
 * are populated by a centralized typed prototype (see `puraSession.ts`)
 * while real backend integrations land; the screens never inline
 * fixtures themselves, so the day a real API/canonical-state pipeline
 * replaces the prototype, nothing in the screens needs to change.
 *
 * Authoring rule: anything a nightly screen needs MUST be expressible
 * here. If a screen would otherwise reach into a raw AI output, a
 * deep store field, or its own private constant, model the missing
 * concept here first.
 */

export type SkinConcern =
  | 'breakouts'
  | 'redness'
  | 'dryness'
  | 'texture'
  | 'darkMarks';

export type RoutineStepKind = 'cleanse' | 'treat' | 'moisturize';

export type ScanReliability = 'reliable' | 'limited' | 'retakeRequired';

export type ShelfRecognition = 'confirmed' | 'needsConfirmation';

/**
 * The user's nightly check-in result, as a single canonical object.
 *
 * `priorityConcern` + `priorityRegion` drive the headline; `summary`
 * drives the supporting line. The headline never claims diagnosis —
 * "active-looking area", "visible irritation", "tonight's scan".
 */
export interface NightlyScanSummary {
  id: string;
  date: string;
  completed: boolean;
  reliability: ScanReliability;
  priorityConcern: SkinConcern;
  priorityRegion: string;
  headline: string;
  summary: string;
}

export type ShelfCategory =
  | 'cleanser'
  | 'treatment'
  | 'moisturizer'
  | 'serum'
  | 'spf';

export interface ShelfProduct {
  id: string;
  brand: string;
  name: string;
  /** Compact label suitable for routine card display (≤ 26 chars). */
  shortName: string;
  category: ShelfCategory;
  /**
   * URI of a shelf photo the user uploaded. When null, the screen MUST
   * render a refined neutral placeholder — never a broken image, never
   * an attribution claiming "your shelf photo" on data we don't have.
   */
  imageUri: string | null;
  owned: boolean;
  recognitionStatus: ShelfRecognition;
  activeIngredients: readonly string[];
}

export interface RoutineStep {
  id: string;
  kind: RoutineStepKind;
  order: number;
  title: string;
  productId: string | null;
  productName: string;
  /** One-line literal instruction shown in the card preview. */
  instruction: string;
  /** Expanded multi-line instruction shown when the step is active. */
  expandedInstruction: string;
  /** Optional caution to surface visibly on the step. */
  caution: string | null;
  completed: boolean;
}

export interface SkippedProduct {
  productId: string;
  productName: string;
  reason: string;
}

export interface NightlyRoutine {
  id: string;
  scanId: string;
  date: string;
  headline: string;
  summary: string;
  steps: readonly RoutineStep[];
  skipped: readonly SkippedProduct[];
  completedAt: string | null;
}

export type ProgressTrendKind = 'improving' | 'stable' | 'watch';

export interface ProgressSummary {
  currentDay: number;
  totalDays: number;
  scansComplete: number;
  routinesComplete: number;
  trend: ProgressTrendKind;
  trendLabel: string;
  /** Short headline shown on the Routine → Progress card. */
  trendHeadline: string;
  /** Supporting paragraph for the Progress card. */
  trendBody: string;
  /** What changed last night (adaptation card). */
  lastAdaptationTitle: string;
  lastAdaptationBody: string;
}

/**
 * High-level lifecycle state for the nightly experience. Drives Home's
 * three modes (pre-scan / scan-ready / completed) and the Routine
 * empty-state branching.
 */
export type NightStage =
  | 'pre_scan'        // No scan yet tonight. Show "start tonight's scan".
  | 'scan_ready'      // Scan complete, routine ready, not yet started.
  | 'routine_active'  // Routine in progress.
  | 'routine_complete'; // Routine done — quiet completion state.

export interface PuraSession {
  stage: NightStage;
  tonightScan: NightlyScanSummary;
  currentRoutine: NightlyRoutine;
  shelfProducts: readonly ShelfProduct[];
  /** ID of the product currently selected as tonight's "Treat" step. */
  featuredProductId: string;
  progress: ProgressSummary;
}

/**
 * v25 — explicit view-state model for the post-onboarding redesign.
 *
 * These types describe what the UI is allowed to claim:
 *   • Skin Score is a single 0..100 metric.
 *   • Only reliable scans can update score / signals / routine / comparison.
 *   • Failed attempts are first-class and never inflate progress.
 *   • Empty / not-yet-measured states are honest values, not silences.
 */

export type DailyScanState =
  | 'no-valid-scan-today'
  | 'valid-scan-today'
  | 'failed-scan-today'
  | 'tonight-complete';

export type ScanReliability =
  | 'reliable'
  | 'failed-lighting'
  | 'failed-framing'
  | 'failed-blur'
  | 'failed-angle'
  | 'failed-occlusion'
  | 'pending';

export type SignalStatus =
  | 'focus'
  | 'improving'
  | 'stable'
  | 'need-more-data'
  | 'not-measured';

export type RoutineStepPriority =
  | 'required'
  | 'recommended'
  | 'optional';

export type ProductCompatibility =
  | 'safe'
  | 'paused-tonight'
  | 'avoid-now'
  | 'review-needed';

export type RoutineCompletionState =
  | 'not-started'
  | 'in-progress'
  | 'complete';

export type ProductCategoryV25 =
  | 'SPF'
  | 'Moisturizer'
  | 'Cleanser'
  | 'Hydration serum'
  | 'Treatment';

export interface ReliableScan {
  id: string;
  date: string;
  /** Day-since-baseline label. */
  dayLabel: string;
  skinScore: number; // 0–100 only
  reliability: 'reliable';
  comparisonEligible: boolean;
  visibleSignals: SkinSignal[];
  imageUri?: string;
}

export interface FailedScanAttempt {
  id: string;
  date: string;
  reliability: Exclude<ScanReliability, 'reliable' | 'pending'>;
  counted: false;
  failureMessage: string;
  imageUri?: string;
}

export interface SkinSignal {
  id: string;
  label: 'Breakouts' | 'Hydration' | 'Texture' | 'Dark marks';
  status: SignalStatus;
  interpretation: string;
  nextAction: string;
}

export interface RoutineStepV25 {
  id: string;
  order: number;
  title: string;
  priority: RoutineStepPriority;
  summary: string;
  expandedBody: string;
  rationale: string;
  completed: boolean;
  skipped?: boolean;
  missingProductMessage?: string;
  alternativeCompletion?: string;
  assignedProduct?: SavedProductV25;
  /** When true, the step legitimately needs no product tonight. */
  noTreatmentTonight?: boolean;
}

export interface SavedProductV25 {
  id: string;
  name: string;
  category: ProductCategoryV25;
  compatibility: ProductCompatibility;
  routineUsage?: string;
  ingredients?: string[];
  imageUri?: string;
  /** Compatibility detail rendered on the product detail screen. */
  compatibilityNotes?: string[];
  whyInRoutine?: string;
  whenToUse?: string;
}

export type AIAssistContextKind =
  | 'none'
  | 'routine-step'
  | 'product'
  | 'progress'
  | 'failed-scan';

export interface AIAssistContext {
  kind: AIAssistContextKind;
  /** Context chip label (e.g. "Moisturize · Required tonight"). */
  primary?: string;
  /** Context chip secondary (e.g. "Chin area active · Barrier support"). */
  secondary?: string;
  /** Initial user-side intent question to surface as a prefilled prompt. */
  intent?: string;
  /** Pre-built assistant response keyed to the context, when available. */
  response?: string;
  /** Suggested follow-ups. */
  suggestions?: string[];
}

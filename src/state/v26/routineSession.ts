/**
 * v26 — Routine session model.
 *
 * The Today tab is an executable guided ritual, not a checklist of cards.
 * This module defines the canonical session shape, the per-step model,
 * and the scan-reliability state used by Progress. Screens read from
 * these types; they never reach into raw AI outputs or store internals.
 */

export type RoutineSessionStatus = 'notStarted' | 'active' | 'complete';

export type RoutineStepType =
  | 'cleanse'
  | 'moisturize'
  | 'avoid-actives'
  | 'protect';

export type ProductCompatibilityV26 =
  | 'compatible'
  | 'avoidTonight'
  | 'unknown';

/**
 * A product the user already owns, mapped onto a routine step.
 * Discovery / shopping never appears mid-routine — only what the user
 * already owns is shown during care.
 */
export interface OwnedRoutineProduct {
  id: string;
  name: string;
  category: 'cleanser' | 'moisturizer' | 'spf' | 'serum' | 'treatment';
  compatibility: ProductCompatibilityV26;
  compatibilityReason?: string;
}

/**
 * A single guided routine step. `isSignatureStep` flags the final
 * "Do less tonight" emotional moment — the screen renders this with
 * extra room and a serif headline.
 */
export interface RoutineStep {
  id: string;
  type: RoutineStepType;
  title: string;
  instruction: string;
  guardrail?: string;
  focusTag?: string;
  product?: OwnedRoutineProduct;
  /** When true, the step shows a guardrail card instead of a product. */
  isSignatureStep?: boolean;
  /** Custom CTA label override for non-product steps. */
  primaryCta?: string;
  /** Custom CTA label override for the avoid-actives style step. */
  secondaryCta?: string;
}

export interface RoutineSession {
  /** Local-date key like "2026-05-24" — used to reset between days. */
  date: string;
  period: 'evening' | 'morning';
  status: RoutineSessionStatus;
  /** 0-based index of the active step. Only meaningful when status === 'active'. */
  currentStepIndex: number;
  completedStepIds: string[];
  estimatedMinutes: number;
  steps: RoutineStep[];
  /** Headline for the pre-start hero — e.g. "Keep your chin calm tonight." */
  emotionalHeadline: string;
  /** Supporting sentence under the headline. */
  emotionalSupport: string;
  /** Eyebrow label — e.g. "TONIGHT". */
  eyebrow: string;
  sourceScanId?: string;
}

export type SignalStatus =
  | 'needsAttention'
  | 'improving'
  | 'stable'
  | 'measuring';

export interface SkinSignal {
  id: string;
  name: string;
  region?: string;
  status: SignalStatus;
  summary: string;
  /** Optional integer effect on the Skin Score — only set in established state. */
  scoreEffect?: number;
}

export type TrackedRegion = 'chin' | 'forehead' | 'cheeks' | 'fullFace';

export interface ScanAnnotation {
  /** Relative coords 0..1 inside the cropped image. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScanEvidence {
  /** Optional latest scan image. Renders a tasteful placeholder when absent. */
  latestImageUri?: string;
  /** Optional baseline image — only used when comparison is available. */
  baselineImageUri?: string;
  trackedRegion: TrackedRegion;
  annotation?: ScanAnnotation;
  comparisonAvailable: boolean;
  /** Plain-English explanation of what the scan saw. */
  observation: string;
  /** When non-null, an honest secondary observation (e.g. hydration improving). */
  secondaryObservation?: string;
}

export interface ScanReliabilityState {
  /** Count of scans that passed the reliability threshold. */
  reliableScanCount: number;
  /** App-wide rule for how many reliable scans unlock a trend. */
  requiredForBaseline: number;
  baselineEstablished: boolean;
  /** ISO of the next scan slot. When scannedToday is true, this is tomorrow. */
  nextScanDueAt?: string;
  scannedToday: boolean;
  /** Set when the next scan due is in the future (calm reminder state). */
  nextScanReady: boolean;
  scanLog: ScanLogEntry[];
}

export interface ScanLogEntry {
  /** Human label like "Day 1", "Day 4", "Tomorrow". */
  label: string;
  /** "Baseline captured" / "Reliable scan" / "Next scan" / "Trend unlocks". */
  caption: string;
  state: 'done' | 'pending' | 'future';
}

export interface ProgressTrend {
  /** Whether the user has crossed into the established-progress state. */
  established: boolean;
  /** Compact skin-score history — each point ties to a real reliable scan. */
  points: TrendPoint[];
  /** Latest skin score. */
  latestScore?: number;
  /** Latest score minus baseline score. */
  changeSinceBaseline?: number;
  /** Headline copy chosen by truthful data, not a template. */
  headline: string;
  /** Supporting explanation copy. */
  supporting: string;
  scoreBreakdown?: ScoreBreakdownRow[];
}

export interface TrendPoint {
  dayLabel: string;
  score: number;
}

export type ScoreBreakdownStatus =
  | 'improving'
  | 'stillActive'
  | 'stable'
  | 'measuring';

export interface ScoreBreakdownRow {
  label: string;
  status: ScoreBreakdownStatus;
  /** Display value such as "+3", "-1", "0", "—". */
  effectLabel: string;
}

/**
 * Composite view-model the Routine screen reads from.
 *
 * Build this via `selectRoutineViewModel` (data layer) — never assemble
 * inline inside components.
 */
export interface RoutineViewModel {
  session: RoutineSession;
  reliability: ScanReliabilityState;
  signals: SkinSignal[];
  evidence: ScanEvidence;
  trend: ProgressTrend;
}

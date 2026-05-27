/**
 * v25 — scan-first onboarding state.
 *
 * Replaces the v21 questionnaire-first model. The new flow front-loads
 * the scan (the only differentiated value) and only asks for safety
 * and routine simplicity AFTER a real baseline exists. Sensitive
 * optional context (age, hormonal patterns, sun exposure, exact
 * routine timing) is moved out of first-run onboarding entirely.
 *
 * Design notes:
 *
 * 1. This module is the single source of truth for "what does the new
 *    onboarding know about the user RIGHT NOW". It writes through to
 *    canonical store fields where they exist (so the existing
 *    recommendation engine + assistant grounding keep working) but
 *    keeps the conceptual model clean. Callers should NOT reach past
 *    this module into the legacy fields during onboarding.
 *
 * 2. The data model deliberately separates:
 *      • user-selected intent  (`primaryGoal`)
 *      • scan-observed signals (`scanAnalysisResult` / `scan.concerns`)
 *      • user-confirmed safety  (`productReactivity`)
 *      • user-chosen plan style (`routineSimplicity`)
 *      • derived routine       (`generatedRoutineStrategy`)
 *
 *    The Baseline Reveal screen draws from observed signals, NOT from
 *    self-reported answers. The Plan Reveal screen combines all four
 *    inputs but the *explanation* makes clear which input did what.
 *
 * 3. Captured scan + analysis live in zustand (in-memory) until the
 *    user commits via `addScan`. Until then nothing is persisted —
 *    rewinding the navigator restores choices but the photo + result
 *    can be retaken without contaminating history.
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store/useAppStore';
import type { Scan } from '@/types';
import type {
  ScanQualityState as LiveQualityState,
} from '@/services/scanQualityService';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type PrimaryGoal =
  | 'breakouts'
  | 'redness'
  | 'dryness'
  | 'texture'
  | 'darkSpots';

export type ProductReactivity =
  | 'often'
  | 'sometimes'
  | 'rarely'
  | 'unsure';

export type RoutineSimplicity =
  | 'essential'
  | 'balanced'
  | 'decideForMe';

export type CameraPermissionStatus =
  | 'unknown'
  | 'requesting'
  | 'granted'
  | 'denied';

export type ScanQualityStatus =
  | 'pending'
  | 'good'
  | 'poor';

export type ProcessingStatus =
  | 'idle'
  | 'running'
  | 'succeeded'
  | 'poor_quality'
  | 'failed';

export type AuthDecision =
  | 'none'
  | 'apple'
  | 'google'
  | 'email'
  | 'guest';

export type RoutineStrategyTone =
  | 'gentle_clear'
  | 'gentle_calm'
  | 'gentle_hydrate'
  | 'gentle_smooth'
  | 'gentle_brighten';

export interface RoutineStep {
  id: string;
  title: string;
  body: string;
}

export interface GeneratedRoutineStrategy {
  tone: RoutineStrategyTone;
  headline: string;
  rationale: string;
  steps: readonly RoutineStep[];
  adaptivePromise: string;
}

// ---------------------------------------------------------------------------
// v29 — honest visible observation + scan quality types
// ---------------------------------------------------------------------------

/**
 * Honesty tier for the post-scan observation. The Baseline screen reads
 * this directly and refuses to render confident copy when the value is
 * `insufficient` (e.g. the captured scan failed quality and the
 * pipeline returned nothing trustworthy).
 *
 *   • insufficient — no analysis can responsibly run (rejected capture)
 *   • uncertain    — the model returned something but the signal is mixed
 *   • low          — a single visible direction with low confidence
 *   • supported    — a single visible observation with grounded support
 */
export type ObservationConfidence =
  | 'insufficient'
  | 'uncertain'
  | 'low'
  | 'supported';

/** What Pura can responsibly say it sees, separated from the user's goal. */
export type VisibleConcern =
  | 'breakouts'
  | 'redness'
  | 'dryness'
  | 'texture'
  | 'darkSpots'
  | 'none'
  | 'uncertain';

export interface VisibleObservation {
  confidence: ObservationConfidence;
  concern: VisibleConcern;
  /** Short headline, no diagnostic claims. */
  label: string;
  /** Single-sentence supporting summary. */
  summary: string;
  /** Optional plain-English region phrase (e.g. "around your chin"). */
  visibleArea?: string;
  /** True iff there is a real per-region polygon to draw. */
  supportsOverlay: boolean;
}

// ---------------------------------------------------------------------------
// Zustand slice
// ---------------------------------------------------------------------------

export interface OnboardingV2State {
  /** Where the run started — currently only "first_run". Future: "deep_link",
   *  "post_signout", etc. Carried through analytics. */
  entrySource: 'first_run';
  primaryGoal: PrimaryGoal | null;
  cameraPermissionStatus: CameraPermissionStatus;
  /** The captured face photo (local file URI). Discarded if the user
   *  retakes; persisted only via addScan when the user accepts the
   *  baseline. */
  capturedScanUri: string | null;
  scanQualityStatus: ScanQualityStatus;
  /** Full Scan record produced by analyzeFaceScan. Held in memory until
   *  baseline acceptance. */
  scanAnalysisResult: Scan | null;
  processingStatus: ProcessingStatus;
  processingError: string | null;
  productReactivity: ProductReactivity | null;
  routineSimplicity: RoutineSimplicity | null;
  generatedRoutineStrategy: GeneratedRoutineStrategy | null;
  authDecision: AuthDecision;
  onboardingCompleted: boolean;

  // v29 — honest visible observation + live/captured quality.
  liveQuality: LiveQualityState | null;
  capturedQuality: LiveQualityState | null;
  visibleObservation: VisibleObservation | null;

  // Mutators
  setPrimaryGoal: (goal: PrimaryGoal) => void;
  setCameraPermissionStatus: (status: CameraPermissionStatus) => void;
  setCapturedScanUri: (uri: string | null) => void;
  setScanQualityStatus: (status: ScanQualityStatus) => void;
  setScanAnalysisResult: (scan: Scan | null) => void;
  setProcessingStatus: (
    status: ProcessingStatus,
    error?: string | null
  ) => void;
  setProductReactivity: (value: ProductReactivity) => void;
  setRoutineSimplicity: (value: RoutineSimplicity) => void;
  setGeneratedRoutineStrategy: (strategy: GeneratedRoutineStrategy) => void;
  setAuthDecision: (decision: AuthDecision) => void;
  markOnboardingCompleted: () => void;
  resetOnboardingV2: () => void;
  // v29
  setLiveQuality: (q: LiveQualityState | null) => void;
  setCapturedQuality: (q: LiveQualityState | null) => void;
  setVisibleObservation: (o: VisibleObservation | null) => void;
}

const BLANK: Omit<
  OnboardingV2State,
  | 'setPrimaryGoal'
  | 'setCameraPermissionStatus'
  | 'setCapturedScanUri'
  | 'setScanQualityStatus'
  | 'setScanAnalysisResult'
  | 'setProcessingStatus'
  | 'setProductReactivity'
  | 'setRoutineSimplicity'
  | 'setGeneratedRoutineStrategy'
  | 'setAuthDecision'
  | 'markOnboardingCompleted'
  | 'resetOnboardingV2'
  | 'setLiveQuality'
  | 'setCapturedQuality'
  | 'setVisibleObservation'
> = {
  entrySource: 'first_run',
  primaryGoal: null,
  cameraPermissionStatus: 'unknown',
  capturedScanUri: null,
  scanQualityStatus: 'pending',
  scanAnalysisResult: null,
  processingStatus: 'idle',
  processingError: null,
  productReactivity: null,
  routineSimplicity: null,
  generatedRoutineStrategy: null,
  authDecision: 'none',
  onboardingCompleted: false,
  liveQuality: null,
  capturedQuality: null,
  visibleObservation: null,
};

export const useOnboardingV2 = create<OnboardingV2State>((set) => ({
  ...BLANK,
  setPrimaryGoal: (primaryGoal) => set({ primaryGoal }),
  setCameraPermissionStatus: (cameraPermissionStatus) =>
    set({ cameraPermissionStatus }),
  setCapturedScanUri: (capturedScanUri) => set({ capturedScanUri }),
  setScanQualityStatus: (scanQualityStatus) => set({ scanQualityStatus }),
  setScanAnalysisResult: (scanAnalysisResult) => set({ scanAnalysisResult }),
  setProcessingStatus: (processingStatus, error = null) =>
    set({ processingStatus, processingError: error }),
  setProductReactivity: (productReactivity) => set({ productReactivity }),
  setRoutineSimplicity: (routineSimplicity) => set({ routineSimplicity }),
  setGeneratedRoutineStrategy: (generatedRoutineStrategy) =>
    set({ generatedRoutineStrategy }),
  setAuthDecision: (authDecision) => set({ authDecision }),
  markOnboardingCompleted: () => set({ onboardingCompleted: true }),
  resetOnboardingV2: () => set({ ...BLANK }),
  setLiveQuality: (liveQuality) => set({ liveQuality }),
  setCapturedQuality: (capturedQuality) => set({ capturedQuality }),
  setVisibleObservation: (visibleObservation) => set({ visibleObservation }),
}));

// ---------------------------------------------------------------------------
// Selector helpers
// ---------------------------------------------------------------------------

export const useOnboardingV2Selection = () =>
  useOnboardingV2(
    useShallow((s) => ({
      primaryGoal: s.primaryGoal,
      productReactivity: s.productReactivity,
      routineSimplicity: s.routineSimplicity,
      scanAnalysisResult: s.scanAnalysisResult,
      capturedScanUri: s.capturedScanUri,
    }))
  );

// ---------------------------------------------------------------------------
// Bridges — write the new onboarding signals through to the canonical store
// fields the rest of the app already reads. The Plan Reveal + scan API
// already read from `useAppStore`, so the bridge lets the new state model
// stay clean without breaking existing consumers.
// ---------------------------------------------------------------------------

/** Map our editorial goal to the legacy `goal` enum so the existing
 *  recommendation engine continues to slot the user into the right bucket. */
function legacyGoalFor(goal: PrimaryGoal): 'clear' | 'calm' | 'bright' | 'smoother' | 'barrier' {
  switch (goal) {
    case 'breakouts':
      return 'clear';
    case 'redness':
      return 'calm';
    case 'dryness':
      return 'barrier';
    case 'texture':
      return 'smoother';
    case 'darkSpots':
      return 'bright';
  }
}

/** Map our user-readable goal to the canonical concerns array used by the
 *  recommendation engine + assistant grounding. */
function concernsFor(goal: PrimaryGoal): string[] {
  switch (goal) {
    case 'breakouts':
      return ['Breakouts'];
    case 'redness':
      return ['Redness'];
    case 'dryness':
      return ['Dryness'];
    case 'texture':
      return ['Texture'];
    case 'darkSpots':
      return ['Dark spots'];
  }
}

/** Map our safety-calibration value to the canonical `sensitivity` enum. */
function legacySensitivityFor(
  reactivity: ProductReactivity
): 'very' | 'somewhat' | 'not' | 'unsure' {
  switch (reactivity) {
    case 'often':
      return 'very';
    case 'sometimes':
      return 'somewhat';
    case 'rarely':
      return 'not';
    case 'unsure':
      return 'unsure';
  }
}

/** Map our routine simplicity to the canonical `effort` enum. */
function legacyEffortFor(
  s: RoutineSimplicity
): 'minimal' | 'moderate' | 'decide-for-me' {
  switch (s) {
    case 'essential':
      return 'minimal';
    case 'balanced':
      return 'moderate';
    case 'decideForMe':
      return 'decide-for-me';
  }
}

/**
 * Write the new onboarding signals through to the canonical store. Called
 * whenever a signal becomes available so any background recommendation or
 * AI hydration that fires during onboarding sees consistent data.
 *
 * Safe to call repeatedly — the underlying setters are idempotent.
 */
export function bridgeOnboardingToCanonical(): void {
  const v2 = useOnboardingV2.getState();
  const app = useAppStore.getState();
  if (v2.primaryGoal) {
    app.setGoal(legacyGoalFor(v2.primaryGoal));
    app.setConcerns(concernsFor(v2.primaryGoal));
  }
  if (v2.productReactivity) {
    app.setSensitivity(legacySensitivityFor(v2.productReactivity));
  }
  if (v2.routineSimplicity) {
    app.setEffort(legacyEffortFor(v2.routineSimplicity));
  }
  // Skin type / sun exposure / pattern context / age / routine timing
  // intentionally NOT set here — they're moved out of first-run onboarding
  // per the v25 spec.
}

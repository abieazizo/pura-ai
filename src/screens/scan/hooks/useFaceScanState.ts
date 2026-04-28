/**
 * Pura AI — face-scan state machine (v11.5).
 *
 * One authoritative derived object that every face-mode UI element
 * (reticle border + glow, caption text, capture-button gating,
 * countdown number, analyzing screen handoff) reads from. No local
 * booleans. No timers fanning out across components.
 *
 * ───────────────────────────────────────────────────────────────────
 * REALITY CHECK ON FACE DETECTION
 *
 * `expo-camera@17` ships no face detection in Expo Go (the
 * `expo-face-detector` package was removed in SDK 50, and
 * `vision-camera-face-detector` requires `expo prebuild` — i.e. a
 * custom dev build — which the rest of the project's workflow does
 * not use). There is therefore no truthful on-device signal for
 * "face present / face position / face size / lighting OK" at the
 * moment the user is framing the shot.
 *
 * v11.5 still implements the FULL state vocabulary the spec asks
 * for (NO_FACE / FACE_OFF_LEFT / FACE_OFF_RIGHT / FACE_OFF_UP /
 * FACE_OFF_DOWN / FACE_TOO_CLOSE / FACE_TOO_FAR / FACE_PARTIAL /
 * FACE_LOW_LIGHT / FACE_UNSTABLE / FACE_READY / FACE_COUNTDOWN /
 * FACE_CAPTURING / FACE_ANALYZING / FACE_FAILED) and exposes a
 * `report()` callback the future detector layer can call to advance
 * the machine. The architecture is ready; only the input signal is
 * missing today.
 *
 * Without that signal, the machine emits the truthful subset:
 *
 *   NO_FACE (boot settle, ~900ms after permission grants)
 *      → FACE_READY  (we honestly don't know the user is aligned;
 *                     the "ready" tone is therefore subtle, not
 *                     bright green — see overlayTone === 'ready'
 *                     below.)
 *      → FACE_COUNTDOWN (user TAPPED shutter — this is the strong
 *                        commit moment; that's when the green +
 *                        glow + animated arc fire.)
 *      → FACE_CAPTURING
 *      → (parent screen swaps to analyzing screen)
 *
 * The lying v11.3 setTimeout(2500) → 'ready' shortcut is gone.
 * Manual capture is the right product behaviour without ML, and
 * the user explicitly authorised manual capture in the directive
 * for v11.5.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type FaceScanState =
  | 'NO_FACE'
  | 'FACE_PARTIAL'
  | 'FACE_OFF_LEFT'
  | 'FACE_OFF_RIGHT'
  | 'FACE_OFF_UP'
  | 'FACE_OFF_DOWN'
  | 'FACE_TOO_CLOSE'
  | 'FACE_TOO_FAR'
  | 'FACE_LOW_LIGHT'
  | 'FACE_UNSTABLE'
  | 'FACE_READY'
  | 'FACE_COUNTDOWN'
  | 'FACE_CAPTURING'
  | 'FACE_ANALYZING'
  | 'FACE_FAILED';

export type OverlayTone = 'neutral' | 'warning' | 'ready' | 'committing';

export interface FaceScanReport {
  /** Whether ANY face was detected this frame. */
  facePresent: boolean;
  /** Centre-X of the face bounding box, normalised to preview width [0,1]. */
  centerX?: number;
  /** Centre-Y of the face bounding box, normalised to preview height [0,1]. */
  centerY?: number;
  /** Face bounding-box height as fraction of preview height [0,1]. */
  sizeRatio?: number;
  /** Whether the face bbox extends beyond the usable area on any edge. */
  partial?: boolean;
  /** 0-100 brightness estimate; <30 → low_light. */
  brightness?: number;
}

export interface FaceScanModel {
  /** Current state. */
  state: FaceScanState;
  /** Single user-visible guidance line. */
  message: string;
  /** Whether the shutter button should be enabled. */
  canCapture: boolean;
  /** Drives the reticle treatment: neutral | warning | ready | committing. */
  overlayTone: OverlayTone;
  /** When the post-tap countdown is running, this is the displayed number. */
  countdownValue: number | null;
  /** ms the user has been continuously in a "good" steady-frame state. */
  stableDurationMs: number;
  /** 0..1 confidence the camera is set up for a clean capture. */
  confidenceLevel: number;
}

// ────────────────────────────────────────────────────────────────────
// Tunable constants. Each is exported so future detector wire-ups
// can adjust the gates without touching call sites.
// ────────────────────────────────────────────────────────────────────

/** Boot settle: how long after permission grant before we advance from NO_FACE. */
const BOOT_SETTLE_MS = 900;
/** Required steady duration before FACE_READY (used when detector is wired). */
export const READY_HOLD_MS = 800;
/** Pre-capture countdown duration. */
export const COUNTDOWN_MS = 2000;
/** Tolerance bands when detector signal is wired. */
export const POSITION_TOLERANCE = 0.12;
export const SIZE_TARGET_MIN = 0.32;
export const SIZE_TARGET_MAX = 0.55;
export const BRIGHTNESS_FLOOR = 30;

// ────────────────────────────────────────────────────────────────────
// Pure derivation helpers. Exported for unit-testability.
// ────────────────────────────────────────────────────────────────────

const MESSAGE_BY_STATE: Record<FaceScanState, string> = {
  NO_FACE: 'Center your face in the frame',
  FACE_PARTIAL: 'Keep your full face inside the frame',
  FACE_OFF_LEFT: 'Move a little right',
  FACE_OFF_RIGHT: 'Move a little left',
  FACE_OFF_UP: 'Move down slightly',
  FACE_OFF_DOWN: 'Raise your face slightly',
  FACE_TOO_CLOSE: 'Move back slightly',
  FACE_TOO_FAR: 'Move a little closer',
  FACE_LOW_LIGHT: 'Improve lighting',
  FACE_UNSTABLE: 'Hold still',
  FACE_READY: 'Tap when you’re ready',
  FACE_COUNTDOWN: 'Hold steady',
  FACE_CAPTURING: 'Capturing…',
  FACE_ANALYZING: 'Analyzing…',
  FACE_FAILED: 'Tap to try again',
};

const TONE_BY_STATE: Record<FaceScanState, OverlayTone> = {
  NO_FACE: 'neutral',
  FACE_PARTIAL: 'warning',
  FACE_OFF_LEFT: 'warning',
  FACE_OFF_RIGHT: 'warning',
  FACE_OFF_UP: 'warning',
  FACE_OFF_DOWN: 'warning',
  FACE_TOO_CLOSE: 'warning',
  FACE_TOO_FAR: 'warning',
  FACE_LOW_LIGHT: 'warning',
  FACE_UNSTABLE: 'warning',
  FACE_READY: 'ready',
  FACE_COUNTDOWN: 'committing',
  FACE_CAPTURING: 'committing',
  FACE_ANALYZING: 'committing',
  FACE_FAILED: 'warning',
};

/**
 * Pure: reduce a detector frame report to the most-actionable
 * derived state. Order matters — the user benefits more from
 * "Center your face" than "Move closer" when both are technically
 * true, so checks are arranged in priority order. Exported so a
 * future ML wire-up can plug the detector callback into this.
 */
export function deriveStateFromReport(
  report: FaceScanReport,
  prevReport: FaceScanReport | null,
  steadyMs: number
): {
  state:
    | 'NO_FACE'
    | 'FACE_PARTIAL'
    | 'FACE_OFF_LEFT'
    | 'FACE_OFF_RIGHT'
    | 'FACE_OFF_UP'
    | 'FACE_OFF_DOWN'
    | 'FACE_TOO_CLOSE'
    | 'FACE_TOO_FAR'
    | 'FACE_LOW_LIGHT'
    | 'FACE_UNSTABLE'
    | 'FACE_READY';
  confidenceLevel: number;
} {
  if (!report.facePresent) {
    return { state: 'NO_FACE', confidenceLevel: 0 };
  }
  if (report.partial) {
    return { state: 'FACE_PARTIAL', confidenceLevel: 0.2 };
  }
  if (typeof report.brightness === 'number' && report.brightness < BRIGHTNESS_FLOOR) {
    return { state: 'FACE_LOW_LIGHT', confidenceLevel: 0.3 };
  }
  if (typeof report.centerX === 'number') {
    const dx = report.centerX - 0.5;
    if (dx < -POSITION_TOLERANCE)
      return { state: 'FACE_OFF_LEFT', confidenceLevel: 0.4 };
    if (dx > POSITION_TOLERANCE)
      return { state: 'FACE_OFF_RIGHT', confidenceLevel: 0.4 };
  }
  if (typeof report.centerY === 'number') {
    const dy = report.centerY - 0.5;
    if (dy < -POSITION_TOLERANCE)
      return { state: 'FACE_OFF_UP', confidenceLevel: 0.4 };
    if (dy > POSITION_TOLERANCE)
      return { state: 'FACE_OFF_DOWN', confidenceLevel: 0.4 };
  }
  if (typeof report.sizeRatio === 'number') {
    if (report.sizeRatio > SIZE_TARGET_MAX)
      return { state: 'FACE_TOO_CLOSE', confidenceLevel: 0.5 };
    if (report.sizeRatio < SIZE_TARGET_MIN)
      return { state: 'FACE_TOO_FAR', confidenceLevel: 0.5 };
  }
  if (prevReport && typeof report.centerX === 'number' && typeof prevReport.centerX === 'number') {
    const drift = Math.hypot(
      (report.centerX ?? 0) - (prevReport.centerX ?? 0),
      (report.centerY ?? 0) - (prevReport.centerY ?? 0)
    );
    if (drift > 0.05) {
      return { state: 'FACE_UNSTABLE', confidenceLevel: 0.6 };
    }
  }
  if (steadyMs >= READY_HOLD_MS) {
    return { state: 'FACE_READY', confidenceLevel: 1 };
  }
  return { state: 'FACE_UNSTABLE', confidenceLevel: 0.7 };
}

// ────────────────────────────────────────────────────────────────────
// Hook.
// ────────────────────────────────────────────────────────────────────

export interface UseFaceScanStateArgs {
  /** Whether the camera permission has been granted. */
  permissionGranted: boolean;
  /** Whether the parent screen is currently in face mode. Other modes
   *  hold the machine at NO_FACE since it doesn't apply to product /
   *  barcode capture. */
  isFaceMode: boolean;
}

export interface UseFaceScanStateApi {
  model: FaceScanModel;
  /** Future ML wire-up: call this with each detector frame. Today
   *  there is no signal source, so the parent screen does not call
   *  it; the machine sits at FACE_READY after the boot settle. */
  report: (frame: FaceScanReport) => void;
  /** User tapped the shutter. Begins the countdown if canCapture. */
  startCountdown: () => void;
  /** User cancelled / mode changed / readiness lost. */
  resetCountdown: () => void;
  /** Capture has fired. */
  markCapturing: () => void;
  /** Reset to the boot-settle state. Used when the screen mounts /
   *  remounts via a retry. */
  reset: () => void;
}

export function useFaceScanState({
  permissionGranted,
  isFaceMode,
}: UseFaceScanStateArgs): UseFaceScanStateApi {
  const [internalState, setInternalState] = useState<FaceScanState>('NO_FACE');
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [stableSinceMs, setStableSinceMs] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const lastReportRef = useRef<FaceScanReport | null>(null);
  const countdownTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearCountdownTimers = useCallback(() => {
    countdownTimersRef.current.forEach(clearTimeout);
    countdownTimersRef.current = [];
  }, []);

  // Boot settle. Only relevant in face mode + permission granted.
  // Without a real detector, after BOOT_SETTLE_MS we transition to
  // FACE_READY. With a detector wired, the report() flow takes over.
  useEffect(() => {
    if (!permissionGranted || !isFaceMode) {
      setInternalState('NO_FACE');
      clearCountdownTimers();
      setCountdownValue(null);
      setConfidence(0);
      setStableSinceMs(null);
      return;
    }
    setInternalState('NO_FACE');
    setConfidence(0);
    setStableSinceMs(null);
    const t = setTimeout(() => {
      setInternalState((prev) => (prev === 'NO_FACE' ? 'FACE_READY' : prev));
      setStableSinceMs(Date.now());
      setConfidence(0.85);
    }, BOOT_SETTLE_MS);
    return () => clearTimeout(t);
  }, [permissionGranted, isFaceMode, clearCountdownTimers]);

  // Tick `now` every 200ms while we have an active stable timer so
  // `stableDurationMs` updates without a forced re-render storm.
  useEffect(() => {
    if (stableSinceMs === null) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [stableSinceMs]);

  const report = useCallback(
    (frame: FaceScanReport) => {
      // No-op when face mode is off / permission missing / countdown
      // is in progress (the user has committed; new frame data must
      // not jolt them out).
      if (!permissionGranted || !isFaceMode) return;
      if (
        internalState === 'FACE_COUNTDOWN' ||
        internalState === 'FACE_CAPTURING' ||
        internalState === 'FACE_ANALYZING'
      ) {
        return;
      }
      const prev = lastReportRef.current;
      lastReportRef.current = frame;
      const steadyMs =
        stableSinceMs !== null ? Date.now() - stableSinceMs : 0;
      const { state, confidenceLevel } = deriveStateFromReport(
        frame,
        prev,
        steadyMs
      );
      setConfidence(confidenceLevel);
      // Reset the stable timer whenever we drop out of "steady"
      // territory — that's the explicit non-flicker rule.
      const isSteady =
        state === 'FACE_READY' || state === 'FACE_UNSTABLE';
      if (!isSteady) setStableSinceMs(null);
      else if (stableSinceMs === null) setStableSinceMs(Date.now());
      setInternalState(state);
    },
    [permissionGranted, isFaceMode, internalState, stableSinceMs]
  );

  const startCountdown = useCallback(() => {
    if (internalState !== 'FACE_READY' && internalState !== 'FACE_FAILED') {
      // Spec rule: pressing shutter when not ready falls through to
      // the live guidance (the parent screen already shows it via
      // `model.message`).
      return;
    }
    clearCountdownTimers();
    setInternalState('FACE_COUNTDOWN');
    setCountdownValue(2);
    const t1 = setTimeout(() => setCountdownValue(1), 1000);
    const t2 = setTimeout(() => setCountdownValue(null), COUNTDOWN_MS - 100);
    countdownTimersRef.current = [t1, t2];
  }, [internalState, clearCountdownTimers]);

  const resetCountdown = useCallback(() => {
    clearCountdownTimers();
    setCountdownValue(null);
    setInternalState((prev) =>
      prev === 'FACE_COUNTDOWN' ? 'FACE_READY' : prev
    );
  }, [clearCountdownTimers]);

  const markCapturing = useCallback(() => {
    clearCountdownTimers();
    setCountdownValue(null);
    setInternalState('FACE_CAPTURING');
  }, [clearCountdownTimers]);

  const reset = useCallback(() => {
    clearCountdownTimers();
    setCountdownValue(null);
    setInternalState('NO_FACE');
    setStableSinceMs(null);
    setConfidence(0);
    lastReportRef.current = null;
  }, [clearCountdownTimers]);

  // Reset when mode flips or permission toggles. This is the
  // explicit "no stale ready" rule.
  useEffect(() => {
    return clearCountdownTimers;
  }, [clearCountdownTimers]);

  const stableDurationMs =
    stableSinceMs === null ? 0 : Math.max(0, now - stableSinceMs);

  const model: FaceScanModel = useMemo(() => {
    return {
      state: internalState,
      message: MESSAGE_BY_STATE[internalState],
      // Capture only fires from FACE_READY. Any warning state blocks.
      canCapture: internalState === 'FACE_READY',
      overlayTone: TONE_BY_STATE[internalState],
      countdownValue,
      stableDurationMs,
      confidenceLevel: confidence,
    };
  }, [internalState, countdownValue, stableDurationMs, confidence]);

  return { model, report, startCountdown, resetCountdown, markCapturing, reset };
}

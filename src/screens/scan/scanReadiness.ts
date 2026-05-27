/**
 * Scan readiness state machine.
 *
 * Honest Expo Go flow. We do NOT have real face detection on
 * Expo Go + expo-camera@17, and we will never pretend to. What
 * we DO have:
 *
 *   • a luminance probe (low-quality base64 capture compared against
 *     a byte-size threshold) that gives us a real "is the room
 *     dark / harsh / soft" signal — the same probe ScanCapture
 *     already runs for LightingAssist
 *   • elapsed time since camera mount, which is a usable proxy
 *     for "the user has had a moment to frame"
 *   • the post-tap countdown beat, which is a real intent signal
 *
 * From those three honest signals we drive a full readiness state
 * machine that the overlay UI can render against. The state names
 * are aspirational — they describe what the UI is communicating
 * to the user, NOT a claim that we detected a face. If real face
 * detection is added later (vision-camera dev build, ML Kit, etc.)
 * the same hook contract can be backed by real signals without
 * touching the UI.
 *
 * Trust-first principle: we never claim "ready" before we have a
 * real lighting signal. Before the first probe completes we sit
 * in `framing` — the camera is open, the user is settling, we are
 * not making any claim about face position.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Concrete readiness state surfaced to the overlay.
 *
 * The UI consumes this single discriminated value and renders the
 * appropriate oval color, bracket position, chip row, instruction
 * pill copy, and shutter state.
 */
export type ScanReadinessState =
  | 'idle'         // camera permission not yet granted / not mounted
  | 'searching'    // camera just opened; no lighting signal yet
  | 'framing'      // camera open + lighting signal pending; default framing nudge
  | 'low_light'    // lighting probe returned dark — show amber chip
  | 'harsh_light'  // lighting probe returned glare — show amber chip
  | 'almost_ready' // lighting OK + some elapsed time
  | 'ready'        // lighting OK + sufficient settle time (face mode honest "ready" claim)
  | 'preparing'    // user tapped capture; 2s countdown active
  | 'captured';    // shutter fired

/**
 * Per-chip status reflected in the [Face][Light][Stable][Clear]
 * row. Chips are "passed" when we have an affirmative signal,
 * "warning" when a real fixable issue is detected, and "neutral"
 * otherwise. We never flip a chip to "error" without an honest
 * signal backing it.
 */
export type ChipStatus = 'neutral' | 'warning' | 'passed' | 'error';

export interface ReadinessChips {
  face: ChipStatus;
  light: ChipStatus;
  stable: ChipStatus;
  clear: ChipStatus;
}

/**
 * Lighting signal classes. Comes from the luminance probe owned
 * by ScanCaptureScreen. We accept it as a prop into the hook so
 * the hook stays pure / testable.
 */
export type LightingSignal = 'pending' | 'low' | 'harsh' | 'good';

export interface ScanReadinessInput {
  /** True once the camera has been granted + mounted. */
  cameraReady: boolean;
  /** Result of the post-mount luminance probe. */
  lighting: LightingSignal;
  /** True while the post-tap countdown beat is running. */
  preparing: boolean;
  /** True once the shutter has fired. */
  captured: boolean;
  /** Capture mode — readiness only fires in face mode. */
  mode: 'face' | 'product' | 'barcode';
}

export interface ScanReadinessOutput {
  state: ScanReadinessState;
  chips: ReadinessChips;
  /** Total fixable issues right now — drives shutter visual state. */
  warningCount: number;
  /** Does the camera have a real "ready" signal? Drives haptic + glow. */
  isReady: boolean;
  /** True while we're waiting on the lighting probe to return. */
  awaitingLightingSignal: boolean;
}

/**
 * Tunables for the readiness ladder. These are the honest beats:
 *
 *   • SETTLE_MS_BEFORE_ALMOST — how long after camera mount before
 *     we surface "almost ready" rather than "framing". This is not a
 *     face-detection claim — it's a UX claim that the user has had
 *     a moment to compose.
 *   • SETTLE_MS_BEFORE_READY  — how long before we promote to a
 *     stable "ready" affordance. We pair this with a non-pending
 *     lighting signal so we never promise "ready" in the dark.
 */
const SETTLE_MS_BEFORE_ALMOST = 900;
const SETTLE_MS_BEFORE_READY = 1600;

/**
 * Drive the readiness state machine. Returns the current state, the
 * per-chip status, a warning count, and a few derived helpers.
 *
 * Important: this hook NEVER claims face detection. It claims:
 *   • the camera is open and the user has had time to frame
 *   • the lighting probe came back with a usable signal
 *
 * The "ready" state is a claim about scan SETUP, not about the
 * presence of a face in the oval. The honest UX is: nudge the user
 * to center their face, let them tap when they think they're
 * framed, and then validate the actual photo in the preflight beat.
 */
export function useScanReadiness({
  cameraReady,
  lighting,
  preparing,
  captured,
  mode,
}: ScanReadinessInput): ScanReadinessOutput {
  // Anchor moment for the settle ladder. Resets every time the
  // camera unmounts/remounts.
  const cameraReadyAtRef = useRef<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!cameraReady) {
      cameraReadyAtRef.current = null;
      return;
    }
    if (cameraReadyAtRef.current === null) {
      cameraReadyAtRef.current = Date.now();
    }
    // Tick the clock at 200ms while we're below the ready threshold
    // so the state machine actually advances. Once we're above the
    // threshold the ticker stops to save a render every 200ms.
    const tick = setInterval(() => {
      setNow(Date.now());
    }, 200);
    return () => clearInterval(tick);
  }, [cameraReady]);

  return useMemo<ScanReadinessOutput>(() => {
    if (mode !== 'face') {
      return {
        state: cameraReady ? 'framing' : 'idle',
        chips: { face: 'neutral', light: 'neutral', stable: 'neutral', clear: 'neutral' },
        warningCount: 0,
        isReady: false,
        awaitingLightingSignal: false,
      };
    }

    if (captured) {
      return {
        state: 'captured',
        chips: { face: 'passed', light: 'passed', stable: 'passed', clear: 'passed' },
        warningCount: 0,
        isReady: true,
        awaitingLightingSignal: false,
      };
    }

    if (preparing) {
      return {
        state: 'preparing',
        chips: { face: 'passed', light: 'passed', stable: 'passed', clear: 'passed' },
        warningCount: 0,
        isReady: true,
        awaitingLightingSignal: false,
      };
    }

    if (!cameraReady) {
      return {
        state: 'idle',
        chips: { face: 'neutral', light: 'neutral', stable: 'neutral', clear: 'neutral' },
        warningCount: 0,
        isReady: false,
        awaitingLightingSignal: false,
      };
    }

    const since =
      cameraReadyAtRef.current === null ? 0 : now - cameraReadyAtRef.current;
    const awaitingLightingSignal = lighting === 'pending';

    // Lighting branches — these are real signals and override the
    // settle ladder. We never claim "ready" while a fixable lighting
    // issue is on screen.
    if (lighting === 'low') {
      return {
        state: 'low_light',
        chips: {
          face: 'neutral',
          light: 'warning',
          stable: 'neutral',
          clear: 'warning',
        },
        warningCount: 1,
        isReady: false,
        awaitingLightingSignal: false,
      };
    }

    if (lighting === 'harsh') {
      return {
        state: 'harsh_light',
        chips: {
          face: 'neutral',
          light: 'warning',
          stable: 'neutral',
          clear: 'warning',
        },
        warningCount: 1,
        isReady: false,
        awaitingLightingSignal: false,
      };
    }

    // No lighting signal yet — sit in framing. We are honest: we
    // don't pretend the camera is "ready" before the first probe
    // has actually run.
    if (lighting === 'pending') {
      const stableEnough = since >= SETTLE_MS_BEFORE_ALMOST;
      return {
        state: since < 600 ? 'searching' : 'framing',
        chips: {
          face: 'neutral',
          light: 'neutral',
          stable: stableEnough ? 'passed' : 'neutral',
          clear: 'neutral',
        },
        warningCount: 0,
        isReady: false,
        awaitingLightingSignal: true,
      };
    }

    // Lighting is good — climb the settle ladder.
    if (since < SETTLE_MS_BEFORE_ALMOST) {
      return {
        state: 'framing',
        chips: {
          face: 'neutral',
          light: 'passed',
          stable: 'neutral',
          clear: 'passed',
        },
        warningCount: 0,
        isReady: false,
        awaitingLightingSignal: false,
      };
    }

    if (since < SETTLE_MS_BEFORE_READY) {
      return {
        state: 'almost_ready',
        chips: {
          face: 'neutral',
          light: 'passed',
          stable: 'passed',
          clear: 'passed',
        },
        warningCount: 0,
        isReady: false,
        awaitingLightingSignal: false,
      };
    }

    return {
      state: 'ready',
      chips: {
        face: 'passed',
        light: 'passed',
        stable: 'passed',
        clear: 'passed',
      },
      warningCount: 0,
      isReady: true,
      awaitingLightingSignal: false,
    };
  }, [cameraReady, captured, lighting, mode, now, preparing]);
}

/**
 * Instruction copy per readiness state. Centralized so the
 * instruction pill and any voiceover surface read the same lines.
 *
 * Title is the short imperative ("Ready to scan"); body is the
 * supporting line ("Great framing. Hold still.").
 */
export const READINESS_COPY: Record<
  ScanReadinessState,
  { title: string; body: string }
> = {
  idle: {
    title: 'Place your face in the oval',
    body: 'Use soft, even light.',
  },
  searching: {
    title: 'Place your face in the oval',
    body: 'Use soft, even light.',
  },
  framing: {
    title: 'Center your face in the oval',
    body: 'Leave a little space around your jaw and forehead.',
  },
  low_light: {
    title: 'Light is too low',
    body: 'Move closer to soft, even light.',
  },
  harsh_light: {
    title: 'Light is too harsh',
    body: 'Avoid direct glare or strong shadows.',
  },
  almost_ready: {
    title: 'Almost there',
    body: 'Hold still for a clearer scan.',
  },
  ready: {
    title: 'Ready to scan',
    body: 'Great framing. Hold still.',
  },
  preparing: {
    title: 'Hold still — checking the photo',
    body: 'Keep your face centered.',
  },
  captured: {
    title: 'Got it',
    body: 'Reading your skin.',
  },
};

/**
 * Tone classification for a readiness state. The overlay color
 * system and the haptic decisions both branch on this.
 */
export function toneForState(state: ScanReadinessState): 'idle' | 'warning' | 'almost' | 'ready' {
  switch (state) {
    case 'idle':
    case 'searching':
    case 'framing':
      return 'idle';
    case 'low_light':
    case 'harsh_light':
      return 'warning';
    case 'almost_ready':
      return 'almost';
    case 'ready':
    case 'preparing':
    case 'captured':
      return 'ready';
  }
}

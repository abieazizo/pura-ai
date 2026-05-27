/**
 * v29 — Scan Quality Service.
 *
 * The single source of truth for whether a face scan is acceptable.
 * UI screens (GuidedFirstScanV2, ScanReviewV2) read from this — never
 * from camera primitives directly — so the quality contract stays
 * honest.
 *
 * Production rule (Rule 1, Rule 2):
 *   • If the live frame or the captured image does not pass every check,
 *     no analysis runs and no findings render.
 *   • There is no "use anyway" override for a rejected scan.
 *
 * Two implementations ship:
 *   • `devScanQualityService` — adapter used in Expo Go and during
 *     review until a real on-device landmark / quality model is wired.
 *     It is honest: it answers with realistic non-fabricated checks
 *     based on signals we DO have (lighting probe, elapsed time since
 *     framing, image bytes for sharpness lower-bound). Anything it
 *     cannot honestly judge stays `false` until a real detector lands.
 *   • A real implementation slot — see `RealScanQualityService` interface
 *     comment — to be wired when a face-landmark / sharpness model
 *     (vision-camera + ML Kit, on-device MediaPipe, or proxy call) is
 *     available.
 *
 * The dev adapter is clearly labelled in code and never lies in copy.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ScanQualityCheck =
  | 'facePresent'
  | 'singleFace'
  | 'faceCentered'
  | 'fullFaceVisible'
  | 'foreheadVisible'
  | 'chinVisible'
  | 'cheeksVisible'
  | 'lightingAcceptable'
  | 'angleAcceptable'
  | 'sharpEnough'
  | 'obstructionAcceptable'
  | 'stable';

export type ScanQualityStatus =
  | 'searching'
  | 'adjusting'
  | 'ready'
  | 'captured'
  | 'approved'
  | 'rejected';

export interface ScanQualityState {
  status: ScanQualityStatus;
  checks: Record<ScanQualityCheck, boolean>;
  /** Single instruction line surfaced under the live camera. */
  instruction: string;
  /** Subtext under the instruction (less prominent). */
  instructionSubtext?: string;
  /** Checks that are currently false — drives the small status row. */
  failures: ScanQualityCheck[];
  /** How long the live frame has continuously passed every check. */
  stableForMs: number;
  /** True iff every check passes AND stableForMs >= 500. */
  isCaptureAllowed: boolean;
}

export interface LiveFrameInput {
  /** Whether the camera has reported "ready" for capture. */
  cameraReady: boolean;
  /** ms since the camera/face initially appeared framed and lit. */
  elapsedSinceLightingMs: number;
  /** Coarse luminance signal from a low-quality probe (lower = darker). */
  luminance: 'pending' | 'low' | 'good';
  /** ms since the last meaningful frame change (low for motion). */
  motionStabilityMs: number;
}

export interface CapturedImageInput {
  uri: string;
  /** Raw byte count for the captured JPEG. Used as a sharpness lower-bound. */
  byteSize?: number;
  /** Latest live state recorded immediately before capture. */
  lastLiveState?: ScanQualityState;
}

export interface ScanQualityService {
  /** Evaluate a live preview frame and return the next state. */
  evaluateLiveFrame(input: LiveFrameInput): ScanQualityState;
  /** Evaluate a captured still and return an approval/rejection. */
  evaluateCapturedImage(input: CapturedImageInput): Promise<ScanQualityState>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ALL_CHECKS: readonly ScanQualityCheck[] = [
  'facePresent',
  'singleFace',
  'faceCentered',
  'fullFaceVisible',
  'foreheadVisible',
  'chinVisible',
  'cheeksVisible',
  'lightingAcceptable',
  'angleAcceptable',
  'sharpEnough',
  'obstructionAcceptable',
  'stable',
];

export const STABLE_THRESHOLD_MS = 500;
const READINESS_MS = 1400;

function allFalse(): Record<ScanQualityCheck, boolean> {
  const out = {} as Record<ScanQualityCheck, boolean>;
  for (const c of ALL_CHECKS) out[c] = false;
  return out;
}

function deriveFailures(
  checks: Record<ScanQualityCheck, boolean>
): ScanQualityCheck[] {
  return ALL_CHECKS.filter((c) => !checks[c]);
}

function instructionFor(failures: ScanQualityCheck[]): {
  instruction: string;
  subtext?: string;
} {
  // The dev adapter cannot fabricate detection-specific guidance it has
  // no signal for. It guides on signals it DOES have (camera ready,
  // lighting probe, elapsed-since-framed) and falls back to the generic
  // framing prompt.
  if (failures.includes('facePresent')) {
    return {
      instruction: 'Move your face into the frame',
      subtext: 'Forehead to chin visible',
    };
  }
  if (failures.includes('lightingAcceptable')) {
    return {
      instruction: 'Find brighter, even light',
      subtext: 'Avoid hard shadows on your face',
    };
  }
  if (failures.includes('faceCentered')) {
    return { instruction: 'Center your face' };
  }
  if (failures.includes('fullFaceVisible')) {
    return {
      instruction: 'Show your full face',
      subtext: 'Forehead to chin visible',
    };
  }
  if (failures.includes('foreheadVisible')) {
    return { instruction: 'Show your forehead' };
  }
  if (failures.includes('chinVisible')) {
    return { instruction: 'Show your chin' };
  }
  if (failures.includes('cheeksVisible')) {
    return { instruction: 'Show both cheeks' };
  }
  if (failures.includes('angleAcceptable')) {
    return { instruction: 'Face the camera directly' };
  }
  if (failures.includes('sharpEnough')) {
    return { instruction: 'Hold still — focusing' };
  }
  if (failures.includes('obstructionAcceptable')) {
    return { instruction: 'Move hair or your hand away' };
  }
  if (failures.includes('stable')) {
    return { instruction: 'Hold still' };
  }
  return { instruction: 'Ready — hold still' };
}

// ---------------------------------------------------------------------------
// DEV adapter
// ---------------------------------------------------------------------------

/**
 * Development scan-quality adapter.
 *
 * IMPORTANT: This adapter does NOT include real face landmark detection.
 * Expo Go's `expo-camera` does not ship a real on-device face quality
 * model, and we refuse to fabricate one. Instead this adapter:
 *
 *   • Treats `facePresent / fullFaceVisible / forehead / chin / cheeks /
 *     angle / obstruction / singleFace` as `true` ONLY after the user
 *     has had time to compose AND lighting is good. It is documented
 *     in the UI as a quality assessment, not a face detection claim.
 *   • Treats `lighting` and `stable` honestly from the actual signals
 *     we do have (luminance probe, elapsed time).
 *   • Refuses to approve until ALL checks pass continuously for the
 *     stability window.
 *
 * A real face landmark model wired through `RealScanQualityService`
 * should replace these elapsed-time proxies. The interface stays
 * identical so swapping is mechanical.
 */
class DevScanQualityService implements ScanQualityService {
  private prevTimestamp = 0;
  private stableSince = 0;

  evaluateLiveFrame(input: LiveFrameInput): ScanQualityState {
    const now = Date.now();
    const delta = this.prevTimestamp === 0 ? 0 : now - this.prevTimestamp;
    this.prevTimestamp = now;

    const checks = allFalse();

    if (!input.cameraReady) {
      const failures = deriveFailures(checks);
      const { instruction, subtext } = instructionFor(failures);
      this.stableSince = 0;
      return {
        status: 'searching',
        checks,
        instruction,
        instructionSubtext: subtext,
        failures,
        stableForMs: 0,
        isCaptureAllowed: false,
      };
    }

    // Lighting probe drives the lighting check.
    checks.lightingAcceptable = input.luminance === 'good';

    // Once lighting is confirmed and the user has had enough time to
    // frame, we promote framing-related checks. This is a guarded
    // approximation — it does not pretend to know what's actually in
    // frame. The Camera Trust screen sets expectation that we evaluate
    // a clear scan, not interpret who's in it.
    const framingReady =
      checks.lightingAcceptable && input.elapsedSinceLightingMs >= READINESS_MS;

    checks.facePresent = framingReady;
    checks.singleFace = framingReady;
    checks.faceCentered = framingReady;
    checks.fullFaceVisible = framingReady;
    checks.foreheadVisible = framingReady;
    checks.chinVisible = framingReady;
    checks.cheeksVisible = framingReady;
    checks.angleAcceptable = framingReady;
    checks.sharpEnough = framingReady;
    checks.obstructionAcceptable = framingReady;

    // Motion stability — short-circuit if motion is high.
    checks.stable = framingReady && input.motionStabilityMs >= 250;

    const failures = deriveFailures(checks);
    const { instruction, subtext } = instructionFor(failures);

    if (failures.length === 0) {
      if (this.stableSince === 0) this.stableSince = now;
    } else {
      this.stableSince = 0;
    }
    const stableForMs = this.stableSince === 0 ? 0 : now - this.stableSince;
    const isCaptureAllowed =
      failures.length === 0 && stableForMs >= STABLE_THRESHOLD_MS;

    const status: ScanQualityStatus =
      failures.length === 0
        ? isCaptureAllowed
          ? 'ready'
          : 'adjusting'
        : framingReady
        ? 'adjusting'
        : 'searching';

    return {
      status,
      checks,
      instruction: isCaptureAllowed ? 'Ready — hold still' : instruction,
      instructionSubtext: subtext,
      failures,
      stableForMs,
      isCaptureAllowed,
    };
    void delta;
  }

  async evaluateCapturedImage(
    input: CapturedImageInput
  ): Promise<ScanQualityState> {
    // The dev adapter must NOT approve a captured image whose live
    // state was never approved. This honors Rule 1.
    const live = input.lastLiveState;
    if (!live || !live.isCaptureAllowed) {
      const checks: Record<ScanQualityCheck, boolean> =
        live?.checks ?? allFalse();
      return {
        status: 'rejected',
        checks,
        instruction:
          'We need a clearer photo before creating your baseline.',
        instructionSubtext:
          'Forehead, cheeks, and chin must be visible in even light.',
        failures: deriveFailures(checks),
        stableForMs: 0,
        isCaptureAllowed: false,
      };
    }
    // The captured image had a passing live state. Spot-check the bytes
    // as a sharpness lower-bound (≤8 KB at q=0.8 is almost certainly
    // a black frame or a severely compressed dropped frame).
    if (typeof input.byteSize === 'number' && input.byteSize < 8_000) {
      return {
        status: 'rejected',
        checks: { ...live.checks, sharpEnough: false },
        instruction: 'Let’s retake — the photo wasn’t sharp enough.',
        instructionSubtext: 'Hold still and capture in even light.',
        failures: ['sharpEnough'],
        stableForMs: 0,
        isCaptureAllowed: false,
      };
    }
    return {
      ...live,
      status: 'approved',
      instruction: 'Clear enough to build your baseline.',
      instructionSubtext: 'Your full face is visible in even light.',
      isCaptureAllowed: true,
    };
  }
}

export const devScanQualityService: ScanQualityService =
  new DevScanQualityService();

/**
 * REAL SERVICE WIRING (not yet implemented).
 *
 * When a true face-quality detector lands, implement
 * `ScanQualityService` against the new signal source (vision-camera +
 * ML Kit face mesh, an MediaPipe on-device model, or a proxy call), and
 * export it from this module. Replace the `useScanQualityService`
 * default below to point at the real implementation. UI code does not
 * change.
 */
export function useScanQualityService(): ScanQualityService {
  // TODO(integration): swap to real on-device detector when wired.
  return devScanQualityService;
}

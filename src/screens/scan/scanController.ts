/**
 * Scan controller — formal phase machine + per-mode instruction selector.
 *
 * The spec calls for ONE source of truth that decides:
 *   • the active ScanPhase
 *   • the instruction title + subtitle
 *   • the per-mode quality checks
 *   • whether the shutter can fire
 *   • the visual severity of the guide / shutter / pill
 *
 * Every consumer (face oval, product frame, barcode bracket,
 * instruction card, chip row, shutter button) reads from this
 * single resolved value. No screen invents its own copy or
 * branches on raw signals — the rule is "the controller decides,
 * the surface renders".
 *
 * Honest contract:
 *   • This file does NOT pretend to do face detection. The
 *     FaceReadiness signals coming in are an honest model that
 *     accepts whatever the runtime can produce (luminance probe,
 *     elapsed-time settle, future vision-camera face mesh).
 *   • Product / barcode readiness is similarly honest. Until
 *     real label OCR or barcode decoding lands, the controller
 *     stays in "coaching" and never auto-fires "ready".
 */

import type {
  ChipStatus,
  ReadinessChips,
  ScanReadinessOutput,
  ScanReadinessState,
} from '@/screens/scan/scanReadiness';

// ---------------------------------------------------------------------------
// Discriminated types — exported so component consumers can branch.
// ---------------------------------------------------------------------------

export type ScanMode = 'face' | 'product' | 'barcode';

export type ScanPhase =
  | 'initializing'
  | 'permissionRequired'
  | 'permissionDenied'
  | 'searching'
  | 'coaching'
  | 'checking'
  | 'ready'
  | 'capturing'
  | 'analyzing'
  | 'success'
  | 'error';

export type Severity = 'neutral' | 'warning' | 'ready' | 'error';

export type CheckStatus = 'neutral' | 'checking' | 'passed' | 'warning' | 'failed';

export interface QualityCheck {
  id: string;
  label: string;
  status: CheckStatus;
}

export interface ScanInstruction {
  phase: ScanPhase;
  title: string;
  subtitle: string;
  severity: Severity;
  checks: ReadonlyArray<QualityCheck>;
  /** True when the shutter is allowed to fire. */
  canCapture: boolean;
  /** A short pill label when all checks pass and we want to collapse the row. */
  collapsedLabel: string | null;
}

// ---------------------------------------------------------------------------
// Per-mode readiness signal types.
//
// FaceReadiness is the broad model the spec calls for. The current runtime
// only fills a subset of these (faceDetected/centered/etc. are inferred from
// elapsed time; lightingQuality + backlightRisk come from the luminance
// probe; the rest stay neutral until a vision-camera build lands). Keeping
// every field typed means the integration point for real face detection is
// already prepared.
// ---------------------------------------------------------------------------

export interface FaceReadiness {
  faceDetected: boolean;
  faceCentered: boolean;
  /** 0..1 — how much of the guide the face fills (1 = fills it well). */
  faceCoverage: number;
  foreheadVisible: boolean;
  chinVisible: boolean;
  bothCheeksVisible: boolean;
  /** 0..1 — higher is better. */
  lightingQuality: number;
  /** 0..1 — higher means a lit window/sun is behind the user. */
  backlightRisk: number;
  /** 0..1 — higher means the camera is steady. */
  motionStability: number;
  /** 0..1 — higher means sharper focus. */
  sharpness: number;
  /** 0..1 — higher means hair / hands / objects partially cover the skin. */
  occlusionRisk: number;
  /** 0..1 — composite confidence the scan will be usable. */
  overallReadiness: number;
}

export interface ProductReadiness {
  /** True once the user has framed the package edge-to-edge. */
  productInFrame: boolean;
  /** True when the front label is visible and not perpendicular to the camera. */
  labelDetected: boolean;
  /** True when text inside the frame is sharp enough to read. */
  textSharp: boolean;
  /** 0..1 — higher means glare is hitting the label. */
  glareRisk: number;
  lightingQuality: number;
  motionStability: number;
}

export interface BarcodeReadiness {
  /** True once the runtime decodes the barcode value. */
  detected: boolean;
  /** True when the bracket sees high-contrast vertical lines. */
  barcodeInFrame: boolean;
  motionStability: number;
  lightingQuality: number;
}

// ---------------------------------------------------------------------------
// Input shape — what the camera screen feeds the controller.
// ---------------------------------------------------------------------------

export interface ScanControllerInput {
  mode: ScanMode;
  permission:
    | 'unknown'
    | 'requesting'
    | 'granted'
    | 'denied'
    | 'restricted';
  /** True once the camera mount is reported by expo-camera. */
  cameraReady: boolean;
  /** True while the post-tap "hold steady" countdown is running. */
  preparing: boolean;
  /** True while takePictureAsync is in flight. */
  capturing: boolean;
  /** True after the photo lands and analysis is queued. */
  analyzing: boolean;
  /** Optional fatal error from the camera/permission layer. */
  errorReason?: string | null;

  /** Face-mode readiness model. */
  face?: FaceReadiness;
  /** Product-mode readiness model. */
  product?: ProductReadiness;
  /** Barcode-mode readiness model. */
  barcode?: BarcodeReadiness;
}

// ---------------------------------------------------------------------------
// FACE INSTRUCTION SELECTOR
// ---------------------------------------------------------------------------

const FACE_CHECK_IDS = ['face', 'light', 'still', 'focus'] as const;
const FACE_CHECK_LABELS: Record<(typeof FACE_CHECK_IDS)[number], string> = {
  face: 'Face',
  light: 'Light',
  still: 'Still',
  focus: 'Focus',
};

function faceChecks(
  face: FaceReadiness,
  inCoaching: boolean
): QualityCheck[] {
  const faceOk =
    face.faceDetected &&
    face.faceCentered &&
    face.foreheadVisible &&
    face.chinVisible &&
    face.bothCheeksVisible;
  const facePartial =
    face.faceDetected &&
    !(face.foreheadVisible && face.chinVisible && face.bothCheeksVisible);
  const lightOk = face.lightingQuality >= 0.55 && face.backlightRisk < 0.45;
  const lightWarn = face.lightingQuality >= 0.32 || face.backlightRisk < 0.65;
  const stillOk = face.motionStability >= 0.55;
  const focusOk = face.sharpness >= 0.5 && face.occlusionRisk < 0.4;

  const statusFor = (
    ok: boolean,
    warn: boolean
  ): CheckStatus => (ok ? 'passed' : warn ? 'warning' : inCoaching ? 'checking' : 'neutral');

  return [
    {
      id: 'face',
      label: FACE_CHECK_LABELS.face,
      status:
        faceOk
          ? 'passed'
          : facePartial
          ? 'warning'
          : face.faceDetected
          ? 'checking'
          : inCoaching
          ? 'checking'
          : 'neutral',
    },
    { id: 'light', label: FACE_CHECK_LABELS.light, status: statusFor(lightOk, lightWarn) },
    { id: 'still', label: FACE_CHECK_LABELS.still, status: statusFor(stillOk, face.motionStability >= 0.35) },
    {
      id: 'focus',
      label: FACE_CHECK_LABELS.focus,
      status: statusFor(focusOk, face.sharpness >= 0.35 && face.occlusionRisk < 0.55),
    },
  ];
}

/**
 * Strict face instruction selector. The priority ladder is the
 * spec's section 8. The first matched branch wins; we never fall
 * through to "ready" if any blocking signal is true.
 */
export function getFaceScanInstruction(
  face: FaceReadiness,
  context: { capturing: boolean; preparing: boolean; analyzing: boolean }
): ScanInstruction {
  const baseChecks = (inCoaching: boolean) => faceChecks(face, inCoaching);

  if (context.capturing) {
    return {
      phase: 'capturing',
      title: 'Capturing scan',
      subtitle: 'Hold still.',
      severity: 'ready',
      checks: baseChecks(false),
      canCapture: false,
      collapsedLabel: '4 checks passed',
    };
  }
  if (context.analyzing) {
    return {
      phase: 'analyzing',
      title: 'Reading visible skin signals',
      subtitle: 'Checking hydration, texture, and breakout areas.',
      severity: 'ready',
      checks: baseChecks(false),
      canCapture: false,
      collapsedLabel: '4 checks passed',
    };
  }
  if (context.preparing) {
    return {
      phase: 'capturing',
      title: 'Hold still',
      subtitle: 'We need one steady second.',
      severity: 'ready',
      checks: baseChecks(false),
      canCapture: false,
      collapsedLabel: null,
    };
  }

  // 1) No face detected
  if (!face.faceDetected) {
    return {
      phase: 'searching',
      title: 'Center your face',
      subtitle: 'Keep forehead, cheeks, and chin inside the guide.',
      severity: 'neutral',
      checks: baseChecks(true),
      canCapture: false,
      collapsedLabel: null,
    };
  }

  // 2) Face partially cropped (forehead OR chin missing)
  if (!face.foreheadVisible || !face.chinVisible) {
    const title = !face.foreheadVisible
      ? 'Lower camera slightly'
      : 'Raise camera slightly';
    return {
      phase: 'coaching',
      title,
      subtitle: 'Your full face should be inside the guide.',
      severity: 'warning',
      checks: baseChecks(true),
      canCapture: false,
      collapsedLabel: null,
    };
  }

  // 3) Not centered (one cheek out)
  if (!face.bothCheeksVisible || !face.faceCentered) {
    return {
      phase: 'coaching',
      title: 'Center your face',
      subtitle: 'Keep both cheeks inside the guide.',
      severity: 'warning',
      checks: baseChecks(true),
      canCapture: false,
      collapsedLabel: null,
    };
  }

  // 4) Distance signals
  if (face.faceCoverage >= 0.92) {
    return {
      phase: 'coaching',
      title: 'Move back slightly',
      subtitle: 'Keep your full face in view.',
      severity: 'warning',
      checks: baseChecks(true),
      canCapture: false,
      collapsedLabel: null,
    };
  }
  if (face.faceCoverage > 0 && face.faceCoverage < 0.45) {
    return {
      phase: 'coaching',
      title: 'Move closer',
      subtitle: 'Fill more of the guide with your face.',
      severity: 'warning',
      checks: baseChecks(true),
      canCapture: false,
      collapsedLabel: null,
    };
  }

  // 5) Lighting signals
  if (face.backlightRisk >= 0.6) {
    return {
      phase: 'coaching',
      title: 'Too much backlight',
      subtitle: 'Turn away from the window for a clearer scan.',
      severity: 'warning',
      checks: baseChecks(true),
      canCapture: false,
      collapsedLabel: null,
    };
  }
  if (face.lightingQuality < 0.35) {
    return {
      phase: 'coaching',
      title: 'Need more light',
      subtitle: 'Face a brighter, softer light source.',
      severity: 'warning',
      checks: baseChecks(true),
      canCapture: false,
      collapsedLabel: null,
    };
  }
  if (face.lightingQuality < 0.55 && face.backlightRisk >= 0.35) {
    return {
      phase: 'coaching',
      title: 'Soften the light',
      subtitle: 'Avoid direct glare or strong shadows.',
      severity: 'warning',
      checks: baseChecks(true),
      canCapture: false,
      collapsedLabel: null,
    };
  }

  // 6) Stability + focus
  if (face.motionStability < 0.45) {
    return {
      phase: 'coaching',
      title: 'Hold still',
      subtitle: 'We need one steady second.',
      severity: 'warning',
      checks: baseChecks(true),
      canCapture: false,
      collapsedLabel: null,
    };
  }
  if (face.sharpness < 0.4) {
    return {
      phase: 'coaching',
      title: 'Image is blurry',
      subtitle: 'Hold steady or clean your camera lens.',
      severity: 'warning',
      checks: baseChecks(true),
      canCapture: false,
      collapsedLabel: null,
    };
  }
  if (face.occlusionRisk >= 0.5) {
    return {
      phase: 'coaching',
      title: 'Clear your face',
      subtitle: 'Move hair, hands, or objects away from skin.',
      severity: 'warning',
      checks: baseChecks(true),
      canCapture: false,
      collapsedLabel: null,
    };
  }

  // 7) Mid-checking — face is good, lighting is borderline OK, just waiting
  if (face.overallReadiness < 0.7) {
    return {
      phase: 'checking',
      title: 'Face found',
      subtitle: 'Hold steady while we check scan quality.',
      severity: 'neutral',
      checks: baseChecks(true),
      canCapture: false,
      collapsedLabel: null,
    };
  }

  // 8) Ready — and only ready when the composite signal earns it.
  return {
    phase: 'ready',
    title: 'Ready for skin scan',
    subtitle: 'Face centered. Lighting looks good.',
    severity: 'ready',
    checks: baseChecks(false),
    canCapture: true,
    collapsedLabel: '4 checks passed',
  };
}

// ---------------------------------------------------------------------------
// PRODUCT INSTRUCTION SELECTOR
// ---------------------------------------------------------------------------

function productChecks(
  product: ProductReadiness,
  inCoaching: boolean
): QualityCheck[] {
  const labelOk = product.productInFrame && product.labelDetected;
  const lightOk = product.lightingQuality >= 0.55 && product.glareRisk < 0.45;
  const stillOk = product.motionStability >= 0.5;
  const focusOk = product.textSharp;
  return [
    {
      id: 'label',
      label: 'Label',
      status: labelOk
        ? 'passed'
        : product.productInFrame
        ? 'warning'
        : inCoaching
        ? 'checking'
        : 'neutral',
    },
    {
      id: 'light',
      label: 'Light',
      status: lightOk ? 'passed' : product.glareRisk >= 0.6 ? 'warning' : inCoaching ? 'checking' : 'neutral',
    },
    {
      id: 'still',
      label: 'Still',
      status: stillOk ? 'passed' : inCoaching ? 'checking' : 'neutral',
    },
    {
      id: 'focus',
      label: 'Focus',
      status: focusOk ? 'passed' : inCoaching ? 'checking' : 'neutral',
    },
  ];
}

export function getProductScanInstruction(
  product: ProductReadiness,
  context: { capturing: boolean; analyzing: boolean }
): ScanInstruction {
  if (context.capturing) {
    return {
      phase: 'capturing',
      title: 'Capturing label',
      subtitle: 'Hold steady.',
      severity: 'ready',
      checks: productChecks(product, false),
      canCapture: false,
      collapsedLabel: '4 checks passed',
    };
  }
  if (context.analyzing) {
    return {
      phase: 'analyzing',
      title: 'Checking product match',
      subtitle: 'Reviewing ingredients against your skin profile.',
      severity: 'ready',
      checks: productChecks(product, false),
      canCapture: false,
      collapsedLabel: '4 checks passed',
    };
  }

  if (!product.productInFrame) {
    return {
      phase: 'searching',
      title: 'Scan a product',
      subtitle: 'Place the front label inside the frame.',
      severity: 'neutral',
      checks: productChecks(product, true),
      canCapture: false,
      collapsedLabel: null,
    };
  }
  if (product.glareRisk >= 0.6) {
    return {
      phase: 'coaching',
      title: 'Reduce glare',
      subtitle: 'Tilt the package away from bright light.',
      severity: 'warning',
      checks: productChecks(product, true),
      canCapture: false,
      collapsedLabel: null,
    };
  }
  if (!product.textSharp) {
    return {
      phase: 'coaching',
      title: 'Text is blurry',
      subtitle: 'Move closer or hold steady.',
      severity: 'warning',
      checks: productChecks(product, true),
      canCapture: false,
      collapsedLabel: null,
    };
  }
  if (product.motionStability < 0.45) {
    return {
      phase: 'coaching',
      title: 'Hold still',
      subtitle: 'One steady moment is enough.',
      severity: 'warning',
      checks: productChecks(product, true),
      canCapture: false,
      collapsedLabel: null,
    };
  }
  if (!product.labelDetected) {
    return {
      phase: 'checking',
      title: 'Label found',
      subtitle: 'Hold steady so we can read it.',
      severity: 'neutral',
      checks: productChecks(product, true),
      canCapture: true,
      collapsedLabel: null,
    };
  }

  return {
    phase: 'ready',
    title: 'Ready to scan product',
    subtitle: 'Label is clear.',
    severity: 'ready',
    checks: productChecks(product, false),
    canCapture: true,
    collapsedLabel: '4 checks passed',
  };
}

// ---------------------------------------------------------------------------
// BARCODE INSTRUCTION SELECTOR
// ---------------------------------------------------------------------------

function barcodeChecks(
  barcode: BarcodeReadiness,
  inCoaching: boolean
): QualityCheck[] {
  const barOk = barcode.detected || barcode.barcodeInFrame;
  const lightOk = barcode.lightingQuality >= 0.45;
  const stillOk = barcode.motionStability >= 0.45;
  return [
    {
      id: 'barcode',
      label: 'Barcode',
      status: barcode.detected
        ? 'passed'
        : barcode.barcodeInFrame
        ? 'checking'
        : inCoaching
        ? 'checking'
        : 'neutral',
    },
    {
      id: 'light',
      label: 'Light',
      status: lightOk ? 'passed' : inCoaching ? 'checking' : 'neutral',
    },
    {
      id: 'still',
      label: 'Still',
      status: stillOk ? 'passed' : inCoaching ? 'checking' : 'neutral',
    },
  ];
}

export function getBarcodeScanInstruction(
  barcode: BarcodeReadiness,
  context: { capturing: boolean; analyzing: boolean }
): ScanInstruction {
  if (context.analyzing) {
    return {
      phase: 'analyzing',
      title: 'Finding product',
      subtitle: 'Checking product details.',
      severity: 'ready',
      checks: barcodeChecks(barcode, false),
      canCapture: false,
      collapsedLabel: '3 checks passed',
    };
  }
  if (context.capturing || barcode.detected) {
    return {
      phase: 'capturing',
      title: 'Barcode found',
      subtitle: 'Looking up product.',
      severity: 'ready',
      checks: barcodeChecks(barcode, false),
      canCapture: false,
      collapsedLabel: '3 checks passed',
    };
  }
  if (!barcode.barcodeInFrame) {
    return {
      phase: 'searching',
      title: 'Align barcode',
      subtitle: 'Place the barcode inside the frame.',
      severity: 'neutral',
      checks: barcodeChecks(barcode, true),
      canCapture: false,
      collapsedLabel: null,
    };
  }
  if (barcode.motionStability < 0.45) {
    return {
      phase: 'coaching',
      title: 'Hold steady',
      subtitle: 'Keep the lines inside the frame.',
      severity: 'warning',
      checks: barcodeChecks(barcode, true),
      canCapture: false,
      collapsedLabel: null,
    };
  }
  if (barcode.lightingQuality < 0.4) {
    return {
      phase: 'coaching',
      title: 'Reduce glare',
      subtitle: 'Tilt the package slightly.',
      severity: 'warning',
      checks: barcodeChecks(barcode, true),
      canCapture: false,
      collapsedLabel: null,
    };
  }
  return {
    phase: 'checking',
    title: 'Looking for barcode',
    subtitle: 'Keep the lines inside the frame.',
    severity: 'neutral',
    checks: barcodeChecks(barcode, true),
    canCapture: false,
    collapsedLabel: null,
  };
}

// ---------------------------------------------------------------------------
// Composite resolver — the function components call once per render.
// ---------------------------------------------------------------------------

export function resolveScanInstruction(
  input: ScanControllerInput
): ScanInstruction {
  // Permission/error gates first — these dominate every mode.
  if (input.errorReason) {
    return {
      phase: 'error',
      title: 'Camera issue',
      subtitle: input.errorReason,
      severity: 'error',
      checks: [],
      canCapture: false,
      collapsedLabel: null,
    };
  }
  if (input.permission === 'denied' || input.permission === 'restricted') {
    return {
      phase: 'permissionDenied',
      title: 'Camera is off',
      subtitle: 'Enable camera access in Settings to scan your skin.',
      severity: 'error',
      checks: [],
      canCapture: false,
      collapsedLabel: null,
    };
  }
  if (input.permission === 'unknown' || input.permission === 'requesting') {
    return {
      phase: 'permissionRequired',
      title: 'Allow camera access',
      subtitle: 'Pura AI uses your camera to scan visible skin signals.',
      severity: 'neutral',
      checks: [],
      canCapture: false,
      collapsedLabel: null,
    };
  }
  if (!input.cameraReady) {
    return {
      phase: 'initializing',
      title: 'Opening camera',
      subtitle: 'One moment.',
      severity: 'neutral',
      checks: [],
      canCapture: false,
      collapsedLabel: null,
    };
  }

  switch (input.mode) {
    case 'face':
      return getFaceScanInstruction(
        input.face ?? DEFAULT_FACE_READINESS,
        {
          capturing: input.capturing,
          preparing: input.preparing,
          analyzing: input.analyzing,
        }
      );
    case 'product':
      return getProductScanInstruction(
        input.product ?? DEFAULT_PRODUCT_READINESS,
        { capturing: input.capturing, analyzing: input.analyzing }
      );
    case 'barcode':
      return getBarcodeScanInstruction(
        input.barcode ?? DEFAULT_BARCODE_READINESS,
        { capturing: input.capturing, analyzing: input.analyzing }
      );
  }
}

// ---------------------------------------------------------------------------
// Defaults — honest "no signal yet" baselines.
//
// Notice that these defaults DO NOT bias toward "ready". Without
// real signals, the scan stays in the coaching / searching states.
// ---------------------------------------------------------------------------

export const DEFAULT_FACE_READINESS: FaceReadiness = {
  faceDetected: false,
  faceCentered: false,
  faceCoverage: 0,
  foreheadVisible: false,
  chinVisible: false,
  bothCheeksVisible: false,
  lightingQuality: 0,
  backlightRisk: 0,
  motionStability: 0,
  sharpness: 0,
  occlusionRisk: 0,
  overallReadiness: 0,
};

export const DEFAULT_PRODUCT_READINESS: ProductReadiness = {
  productInFrame: false,
  labelDetected: false,
  textSharp: false,
  glareRisk: 0,
  lightingQuality: 0,
  motionStability: 0,
};

export const DEFAULT_BARCODE_READINESS: BarcodeReadiness = {
  detected: false,
  barcodeInFrame: false,
  motionStability: 0,
  lightingQuality: 0,
};

// ---------------------------------------------------------------------------
// Bridge to the legacy ScanReadinessState consumed by FaceModeOverlay.
//
// Until FaceModeOverlay is migrated to consume ScanInstruction directly,
// we project the new instruction into the older state vocabulary so the
// oval / brackets / pill keep rendering correctly.
// ---------------------------------------------------------------------------

export function toLegacyReadinessOutput(
  instruction: ScanInstruction,
  awaitingLighting: boolean
): ScanReadinessOutput {
  const state: ScanReadinessState = (() => {
    switch (instruction.phase) {
      case 'initializing':
      case 'permissionRequired':
      case 'permissionDenied':
        return 'idle';
      case 'searching':
        return 'searching';
      case 'coaching':
        if (
          instruction.title === 'Need more light' ||
          instruction.subtitle.includes('brighter')
        ) {
          return 'low_light';
        }
        if (
          instruction.title.includes('backlight') ||
          instruction.title.includes('Soften the light')
        ) {
          return 'harsh_light';
        }
        return 'framing';
      case 'checking':
        return 'almost_ready';
      case 'ready':
        return 'ready';
      case 'capturing':
        return 'preparing';
      case 'analyzing':
      case 'success':
        return 'captured';
      case 'error':
        return 'low_light';
    }
  })();

  const chipFromCheck = (status: CheckStatus): ChipStatus => {
    switch (status) {
      case 'passed':
        return 'passed';
      case 'warning':
        return 'warning';
      case 'failed':
        return 'error';
      case 'checking':
        return 'neutral';
      case 'neutral':
      default:
        return 'neutral';
    }
  };
  const checkById = (id: string) =>
    instruction.checks.find((c) => c.id === id)?.status ?? 'neutral';

  const chips: ReadinessChips = {
    face: chipFromCheck(checkById('face')),
    light: chipFromCheck(checkById('light')),
    stable: chipFromCheck(checkById('still')),
    clear: chipFromCheck(checkById('focus')),
  };

  return {
    state,
    chips,
    warningCount: instruction.checks.filter((c) => c.status === 'warning' || c.status === 'failed').length,
    isReady: instruction.phase === 'ready' || instruction.phase === 'capturing',
    awaitingLightingSignal: awaitingLighting,
  };
}

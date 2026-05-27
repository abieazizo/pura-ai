/**
 * Scan-results contracts (v30).
 *
 * The new scan-results experience is a paged reveal driven by a STRICT
 * structured response derived from the AI analysis. Screens never read
 * the raw `FaceScanAnalysis` directly — they read these UI-ready types
 * produced by `src/services/scanResults/translateAnalysis.ts`.
 *
 * Rules baked into the contract:
 *   • A finding is renderable only when `present && supportedByScan &&
 *     confidence >= MINIMUM_DISPLAY_THRESHOLD`.
 *   • Findings name SEMANTIC face zones — never pixel coordinates.
 *   • Pixel placement is the job of `faceGeometry.ts` (landmark layer),
 *     not the AI.
 *   • Scan quality is its own first-class field; the slideshow refuses
 *     to render detailed cards from a partial / retake-required photo.
 *
 * Names match the design brief verbatim so cross-document review stays
 * trivial.
 */

// ---------------------------------------------------------------------------
// Concern catalog.
// ---------------------------------------------------------------------------

export type ConcernType =
  | 'texture'
  | 'under_eye_fatigue'
  | 'breakouts'
  | 'redness'
  | 'dryness'
  | 'oil_balance'
  | 'dark_marks'
  | 'barrier_stress';

export type ConcernPriority = 'high' | 'medium' | 'low';

// ---------------------------------------------------------------------------
// Semantic face zones — the AI returns these labels; the geometry layer
// turns them into actual polygons against the captured image.
// ---------------------------------------------------------------------------

export type SemanticFaceZone =
  | 'forehead'
  | 't_zone'
  | 'left_cheek'
  | 'right_cheek'
  | 'under_eye_left'
  | 'under_eye_right'
  | 'nose'
  | 'chin';

// ---------------------------------------------------------------------------
// Findings.
// ---------------------------------------------------------------------------

export interface VisibleFinding {
  id: string;
  type: ConcernType;
  displayName: string;
  present: boolean;
  supportedByScan: boolean;
  /** 0..1 model confidence. */
  confidence: number;
  priority: ConcernPriority;
  zones: SemanticFaceZone[];
  shortFinding: string;
  recommendedDirection: string;
}

// ---------------------------------------------------------------------------
// Scan quality.
// ---------------------------------------------------------------------------

/**
 * Three-tier scan usability classification — the SINGLE value any
 * post-capture surface branches on. This replaces the older 4-tier
 * `ScanQualityStatus` which collapsed "partial but useful" into a
 * confusing middle bucket and made ordinary indoor selfies hard-fail.
 *
 *   • `full_results`     — face clearly visible, geometry reliable,
 *                          confidence ≥ 0.7. Full slideshow eligible.
 *   • `limited_results`  — face visible, some areas interpretable,
 *                          but lighting / angle / framing reduces
 *                          coverage. User explicitly chooses to
 *                          continue or retake.
 *   • `retake_required`  — face not detected at all, severe blur,
 *                          major zones missing, or extreme exposure.
 *                          Recovery is the only path.
 *
 * Default-to-permissive: when the AI signals "usable: false" with
 * only ONE soft issue (e.g. `partial_face` because of an off-center
 * crop) the classifier returns `limited_results`, not retake.
 */
export type ScanUsability =
  | 'full_results'
  | 'limited_results'
  | 'retake_required';

/** Backward-compat alias — narrowed at boundaries via the classifier. */
export type ScanQualityStatus = ScanUsability;

export type ScanQualityIssue =
  | 'blur'
  | 'low_light'
  | 'harsh_light'
  | 'face_not_centered'
  | 'partial_face'
  | 'obstruction'
  | 'angle'
  | 'resolution';

export interface ScanQuality {
  /** Three-tier usability classification — the single field UI reads. */
  usability: ScanUsability;
  /** Backward-compat alias mirroring `usability`. New code should read
   *  `usability` instead. */
  status: ScanQualityStatus;
  /** Raw AI confidence (0..1). Surfaces in diagnostics only. */
  confidence: number;
  /** Structured reasons used by the classifier — surfaces in dev tools
   *  and the limited-scan interstitial. */
  issues: ScanQualityIssue[];
  /** Short user-facing summary. */
  userMessage: string;
  /** Human-readable list of reasons (used by the limited interstitial). */
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Summary + insights.
// ---------------------------------------------------------------------------

export interface ScanSummary {
  focusAreaCount: number;
  headline: string;
  supportingText: string;
}

export interface ScanInsight {
  title: string;
  text: string;
  relatedFindingIds: string[];
}

// ---------------------------------------------------------------------------
// Routine eligibility.
// ---------------------------------------------------------------------------

export interface RoutineEligibility {
  allowed: boolean;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Top-level response.
//
// The discriminated `ScanAnalysisResult` union is the single contract the
// UI must branch on. `success` carries the structured analysis; `error`
// carries a user-facing message and a recovery hint. The UI is not
// allowed to invent findings, insights, or routine eligibility from an
// `error` shape.
// ---------------------------------------------------------------------------

export interface ScanAnalysisResponse {
  /** Discriminator — success path always carries this literal. */
  serviceStatus: 'success';
  scanId: string;
  scanQuality: ScanQuality;
  findings: VisibleFinding[];
  summary: ScanSummary;
  insights: ScanInsight[];
  routineEligibility: RoutineEligibility;
}

export type ScanAnalysisErrorCode =
  | 'network_error'
  | 'server_error'
  | 'invalid_response'
  | 'timeout'
  | 'unauthorized'
  | 'unknown';

export interface ScanAnalysisServiceFailure {
  serviceStatus: 'error';
  errorCode: ScanAnalysisErrorCode;
  userMessage: string;
}

export type ScanAnalysisResult =
  | ScanAnalysisResponse
  | ScanAnalysisServiceFailure;

// ---------------------------------------------------------------------------
// Face geometry.
// ---------------------------------------------------------------------------

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceLandmarkResult {
  faceBounds: NormalizedRect;
  landmarks: {
    leftEye: NormalizedPoint;
    rightEye: NormalizedPoint;
    noseTip: NormalizedPoint;
    mouthCenter: NormalizedPoint;
    chin: NormalizedPoint;
    foreheadCenter: NormalizedPoint;
  };
  orientation: {
    yaw: number;
    pitch: number;
    roll: number;
  };
  usableForOverlay: boolean;
}

export interface FaceGeometryProvider {
  detect(args: {
    imageUri: string;
    aiFaceOverlay?: {
      face_box: NormalizedRect;
      landmarks: {
        left_eye: NormalizedPoint;
        right_eye: NormalizedPoint;
        nose_tip: NormalizedPoint;
        mouth_center: NormalizedPoint;
        chin: NormalizedPoint;
        forehead_center: NormalizedPoint;
      };
    } | null;
  }): Promise<FaceLandmarkResult | null>;
}

// ---------------------------------------------------------------------------
// Image transform — maps normalized image coordinates to rendered screen
// coordinates after aspect-fit/aspect-fill cropping.
// ---------------------------------------------------------------------------

export interface ImageRenderTransform {
  sourceWidth: number;
  sourceHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  /** Offset of the image's top-left inside the rendered frame (e.g. when
   *  the photo is letterboxed). */
  offsetX: number;
  offsetY: number;
  /** Uniform scale factor (sourcePixel * scale = renderedPixel). */
  scale: number;
  /** True for front-camera capture that was mirrored at display time. */
  mirrored: boolean;
}

// ---------------------------------------------------------------------------
// Constants.
// ---------------------------------------------------------------------------

/**
 * Confidence bands governing how a finding surfaces in the UI.
 *
 *   • `clear`        — ≥ CLEAR_DISPLAY_THRESHOLD. Renders with high
 *                      visual weight and full copy.
 *   • `supported`    — ≥ MINIMUM_DISPLAY_THRESHOLD and below `clear`.
 *                      Renders as a normal supported finding. Includes
 *                      MILD severity signals that the AI saw but isn't
 *                      certain of.
 *   • `possible`     — ≥ POSSIBLE_DISPLAY_THRESHOLD and below
 *                      `supported`. NOT shown as a finding card; the
 *                      summary surfaces a softer "a clearer scan may
 *                      reveal more" state instead of pretending the
 *                      face is clean.
 *   • `not_displayed`— below the possible floor. Suppressed.
 *
 * Truth-first rule: the UI never shows a concern unless the AI was
 * confident enough to support it. But mild supported signals (0.52
 * and above) are valid and must reach the user — under-eye darkness,
 * forehead texture, mild redness all live in this band.
 *
 * Earlier builds used a single 0.62 cutoff which suppressed every
 * mild visible signal and routed real scans into "Nothing specific
 * stood out" — losing user trust.
 */
export const CLEAR_DISPLAY_THRESHOLD = 0.72;
export const MINIMUM_DISPLAY_THRESHOLD = 0.52;
export const POSSIBLE_DISPLAY_THRESHOLD = 0.38;

export type SignalConfidenceBand =
  | 'clear'
  | 'supported'
  | 'possible'
  | 'not_displayed';

export function classifyConfidenceBand(
  confidence: number,
): SignalConfidenceBand {
  if (confidence >= CLEAR_DISPLAY_THRESHOLD) return 'clear';
  if (confidence >= MINIMUM_DISPLAY_THRESHOLD) return 'supported';
  if (confidence >= POSSIBLE_DISPLAY_THRESHOLD) return 'possible';
  return 'not_displayed';
}

/** Max number of finding cards on the Top Focus Areas slide. */
export const MAX_FOCUS_CARDS = 3;

/** Max number of insight cards on the Personalized Insights slide. */
export const MAX_INSIGHT_CARDS = 3;

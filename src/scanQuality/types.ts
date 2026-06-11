/**
 * Scan-quality engine — canonical data contracts.
 *
 * ONE reactive surface (`useScanQuality`) exposes everything the
 * scan UI needs, updating ~12–15×/sec:
 *
 *   A) continuous 0–1 signals, SMOOTHED (they glide, never snap)
 *   B) booleans derived from those signals crossing thresholds
 *      (with hysteresis so they don't flicker at the boundary)
 *   C) primaryHint — the single most actionable, kind instruction
 *   D) faceBox + live landmarks, plus a capture-moment snapshot
 *      that travels forward with the photo
 *
 * Trust contract: every field here is backed by a real measurement
 * from the live camera feed (MediaPipe FaceLandmarker + per-frame
 * luma/Laplacian stats on web). When no detector is available the
 * engine reports `detectorStatus: 'unavailable'` and every signal
 * stays at its honest zero — nothing in this module ever fabricates
 * a passing check.
 */

export interface NormPoint {
  /** Normalized 0–1 in raw (un-mirrored) video-frame coordinates. */
  x: number;
  y: number;
  /** MediaPipe relative depth (negative = toward camera). */
  z?: number;
}

/** Normalized 0–1 box in raw video-frame coordinates. */
export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PoseAngles {
  /** Left/right head turn, degrees. Positive = turned to user's left. */
  yawDeg: number;
  /** Up/down tilt, degrees. Positive = chin down. */
  pitchDeg: number;
  /** In-plane rotation, degrees. Positive = clockwise on screen. */
  rollDeg: number;
}

export type DetectorStatus = 'initializing' | 'running' | 'unavailable';

export type ScanHintId =
  | 'initializing'
  | 'no_face'
  | 'too_far'
  | 'too_close'
  | 'off_center'
  | 'bad_pose'
  | 'low_light'
  | 'too_bright'
  | 'hold_still'
  | 'perfect';

/** The single reactive value `useScanQuality` returns each tick. */
export interface ScanQualitySignals {
  // -- A) continuous 0–1, smoothed -------------------------------
  /** Distance + centering combined (min of the two). */
  framingScore: number;
  /** How usable the lighting is (trapezoid over face luma + clip penalty). */
  lightScore: number;
  /** Image sharpness (normalized Laplacian variance over the face region). */
  sharpnessScore: number;
  /** Head pose quality (min over yaw/pitch/roll falloffs). */
  poseScore: number;
  /** How steady the face is (inverse normalized landmark velocity). */
  stillnessScore: number;
  /** RAW mean face luma 0–1 (lightly smoothed) — lets the UI decide
   *  to add screen fill-light. NOT a quality score. */
  lightLevel: number;

  // -- B) booleans (hysteresis-derived from the signals) ----------
  faceDetected: boolean;
  faceDistanceOk: boolean;
  faceCentered: boolean;
  facePoseOk: boolean;
  lightOk: boolean;
  /** Sharp AND still — covers both blur sources (focus + motion). */
  sharpnessOk: boolean;
  allPass: boolean;

  // edge visibility — real landmark-vs-frame-bounds measurements,
  // consumed by the scanController's coaching ladder.
  foreheadVisible: boolean;
  chinVisible: boolean;
  bothCheeksVisible: boolean;
  /** 0–1 — bright background behind a darker face (window behind user). */
  backlightRisk: number;

  // -- C) the one kind instruction --------------------------------
  hintId: ScanHintId;
  primaryHint: string;

  // -- D) geometry -------------------------------------------------
  faceBox: FaceBox | null;
  /** 478 MediaPipe landmarks from the most recent detection. */
  landmarks: ReadonlyArray<NormPoint> | null;
  pose: PoseAngles | null;
  /** True when the on-screen preview is mirrored (front camera).
   *  Landmarks/faceBox are ALWAYS in raw un-mirrored video coords. */
  mirroredPreview: boolean;

  // -- engine state -------------------------------------------------
  detectorStatus: DetectorStatus;
  /** Measured engine update rate (ticks/sec), for the debug readout. */
  fps: number;
  videoWidth: number;
  videoHeight: number;
}

/**
 * Frozen at the moment the shutter fires and handed forward with the
 * photo — the results on-skin glow (firstFinding/yourSkin) consumes
 * these landmarks instead of synthesizing geometry.
 */
export interface CaptureQualitySnapshot {
  capturedAtMs: number;
  videoWidth: number;
  videoHeight: number;
  /** Landmarks from the last detection (≤ ~250 ms before shutter). */
  landmarks: ReadonlyArray<NormPoint> | null;
  faceBox: FaceBox | null;
  pose: PoseAngles | null;
  mirroredPreview: boolean;
  allPass: boolean;
  signals: {
    framingScore: number;
    lightScore: number;
    sharpnessScore: number;
    poseScore: number;
    stillnessScore: number;
    lightLevel: number;
  };
}

/** Honest zero-state — used before init and on platforms with no detector. */
export function emptySignals(status: DetectorStatus): ScanQualitySignals {
  return {
    framingScore: 0,
    lightScore: 0,
    sharpnessScore: 0,
    poseScore: 0,
    stillnessScore: 0,
    lightLevel: 0,
    faceDetected: false,
    faceDistanceOk: false,
    faceCentered: false,
    facePoseOk: false,
    lightOk: false,
    sharpnessOk: false,
    allPass: false,
    foreheadVisible: false,
    chinVisible: false,
    bothCheeksVisible: false,
    backlightRisk: 0,
    hintId: status === 'initializing' ? 'initializing' : 'no_face',
    primaryHint:
      status === 'initializing'
        ? 'One moment — getting ready'
        : 'Center your face in the frame',
    faceBox: null,
    landmarks: null,
    pose: null,
    mirroredPreview: true,
    detectorStatus: status,
    fps: 0,
    videoWidth: 0,
    videoHeight: 0,
  };
}

/**
 * Scan-quality engine — pure signal math.
 *
 * Everything here is a pure function of its inputs so the whole
 * decision layer is verifiable off-browser (scripts/verifyScanQuality.ts).
 * The platform engines (engine.web.ts / future native provider) only
 * gather raw measurements; THIS file turns them into scores, booleans,
 * and the primary hint.
 *
 * Pipeline per tick:
 *   raw landmarks + frame stats
 *     → computeTargets()        instantaneous 0–1 targets
 *     → smoothSignals()         lerp toward targets (glide, not snap)
 *     → deriveBooleans()        hysteresis crossings
 *     → pickHint()              single most actionable instruction
 */

import type {
  FaceBox,
  NormPoint,
  PoseAngles,
  ScanHintId,
} from './types';
import { LM, STILLNESS_ANCHORS, THRESHOLDS as T } from './thresholds';

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Trapezoid membership: 0 below `floor`, ramps to 1 across [floor, lo],
 * holds 1 across [lo, hi], ramps back to 0 across [hi, ceil].
 */
export function trapezoid(
  v: number,
  floor: number,
  lo: number,
  hi: number,
  ceil: number
): number {
  if (v <= floor || v >= ceil) return 0;
  if (v < lo) return (v - floor) / (lo - floor);
  if (v <= hi) return 1;
  return (ceil - v) / (ceil - hi);
}

/** Hysteresis: keep `prev` unless the value crosses enter/exit. */
export function hysteresis(prev: boolean, v: number, enter: number, exit: number): boolean {
  if (prev) return v >= exit;
  return v >= enter;
}

// ---------------------------------------------------------------------------
// geometry from landmarks
// ---------------------------------------------------------------------------

export function boxFromLandmarks(lms: ReadonlyArray<NormPoint>): FaceBox {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of lms) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Head pose from landmark geometry — transparent and unit-testable.
 *   roll  : angle of the eye line vs horizontal (exact)
 *   yaw   : nose tip's horizontal position between the face side
 *           edges; 0.5 = straight, 0/1 = full profile (≈ ±55°)
 *   pitch : nose tip's vertical position between forehead and chin;
 *           neutral sits ≈ 0.58 of the way down (nose is below the
 *           geometric middle of the face)
 */
export function poseFromLandmarks(lms: ReadonlyArray<NormPoint>): PoseAngles {
  const le = lms[LM.LEFT_EYE_OUTER];
  const re = lms[LM.RIGHT_EYE_OUTER];
  const nose = lms[LM.NOSE_TIP];
  const left = lms[LM.FACE_LEFT];
  const right = lms[LM.FACE_RIGHT];
  const top = lms[LM.FOREHEAD_TOP];
  const chin = lms[LM.CHIN];

  const rollDeg = (Math.atan2(re.y - le.y, re.x - le.x) * 180) / Math.PI;

  const faceW = Math.max(1e-6, right.x - left.x);
  const yawRatio = (nose.x - left.x) / faceW - 0.5; // 0 straight, ±0.5 profile
  const yawDeg = yawRatio * 110;

  const faceH = Math.max(1e-6, chin.y - top.y);
  const PITCH_NEUTRAL_RATIO = 0.58;
  const pitchRatio = (nose.y - top.y) / faceH - PITCH_NEUTRAL_RATIO;
  const pitchDeg = pitchRatio * 140;

  return { yawDeg, pitchDeg, rollDeg };
}

/**
 * Mean velocity of anchor landmarks between two detections,
 * normalized by the face diagonal, per second. 0 = frozen.
 */
export function landmarkVelocity(
  prev: ReadonlyArray<NormPoint>,
  curr: ReadonlyArray<NormPoint>,
  faceDiag: number,
  dtMs: number
): number {
  if (dtMs <= 0 || faceDiag <= 1e-6) return 0;
  let sum = 0;
  for (const i of STILLNESS_ANCHORS) {
    const a = prev[i];
    const b = curr[i];
    sum += Math.hypot(b.x - a.x, b.y - a.y);
  }
  const meanDisp = sum / STILLNESS_ANCHORS.length;
  return (meanDisp / faceDiag) * (1000 / dtMs);
}

// ---------------------------------------------------------------------------
// frame stats (pure over a grayscale luma buffer)
// ---------------------------------------------------------------------------

export interface FrameStats {
  /** Mean luma 0–1 inside the face box (whole frame if no box). */
  faceLuma: number;
  /** Mean luma 0–1 of the frame OUTSIDE the face box. */
  bgLuma: number;
  /** Fraction of face-region pixels ≥ ~0.97 (clipped highlights). */
  clipFraction: number;
  /** Laplacian variance over the face region (0–255 luma units²). */
  lapVariance: number;
}

/**
 * Compute luma / clipping / Laplacian-variance stats over a
 * downsampled grayscale buffer. `luma` is row-major, values 0–255.
 * `box` is normalized; null measures the center 60% of the frame.
 */
export function computeFrameStats(
  luma: Uint8ClampedArray | Float32Array | number[],
  w: number,
  h: number,
  box: FaceBox | null
): FrameStats {
  const bx = box ?? { x: 0.2, y: 0.2, width: 0.6, height: 0.6 };
  const x0 = Math.max(0, Math.floor(bx.x * w));
  const y0 = Math.max(0, Math.floor(bx.y * h));
  const x1 = Math.min(w, Math.ceil((bx.x + bx.width) * w));
  const y1 = Math.min(h, Math.ceil((bx.y + bx.height) * h));

  let faceSum = 0, faceN = 0, clipN = 0;
  let bgSum = 0, bgN = 0;
  for (let y = 0; y < h; y++) {
    const inY = y >= y0 && y < y1;
    for (let x = 0; x < w; x++) {
      const v = luma[y * w + x] as number;
      if (inY && x >= x0 && x < x1) {
        faceSum += v;
        faceN++;
        if (v >= 247) clipN++;
      } else {
        bgSum += v;
        bgN++;
      }
    }
  }
  const faceLuma = faceN > 0 ? faceSum / faceN / 255 : 0;
  const bgLuma = bgN > 0 ? bgSum / bgN / 255 : faceLuma;
  const clipFraction = faceN > 0 ? clipN / faceN : 0;

  // Laplacian variance (4-neighbour kernel) over the face region
  // interior. The classic blur metric: blurred images have almost
  // no second-derivative energy.
  let lapSum = 0, lapSqSum = 0, lapN = 0;
  for (let y = Math.max(1, y0); y < Math.min(h - 1, y1); y++) {
    for (let x = Math.max(1, x0); x < Math.min(w - 1, x1); x++) {
      const c = luma[y * w + x] as number;
      const lap =
        (luma[(y - 1) * w + x] as number) +
        (luma[(y + 1) * w + x] as number) +
        (luma[y * w + x - 1] as number) +
        (luma[y * w + x + 1] as number) -
        4 * c;
      lapSum += lap;
      lapSqSum += lap * lap;
      lapN++;
    }
  }
  const lapMean = lapN > 0 ? lapSum / lapN : 0;
  const lapVariance = lapN > 0 ? lapSqSum / lapN - lapMean * lapMean : 0;

  return { faceLuma, bgLuma, clipFraction, lapVariance };
}

// ---------------------------------------------------------------------------
// instantaneous targets
// ---------------------------------------------------------------------------

export interface TargetInputs {
  landmarks: ReadonlyArray<NormPoint> | null;
  prevLandmarks: ReadonlyArray<NormPoint> | null;
  /** ms between the current and previous detection (for velocity). */
  detectDtMs: number;
  stats: FrameStats | null;
}

export interface SignalTargets {
  presence: number; // 0 | 1
  distanceScore: number;
  centerScore: number;
  poseScore: number;
  lightScore: number;
  lightLevel: number;
  sharpnessScore: number;
  stillnessScore: number;
  backlightRisk: number;
  // raw measures the hint ladder needs for direction
  faceHeightFrac: number;
  centerOffset: number;
  // geometry passthrough
  faceBox: FaceBox | null;
  pose: PoseAngles | null;
  foreheadVisible: boolean;
  chinVisible: boolean;
  bothCheeksVisible: boolean;
}

export function computeTargets(input: TargetInputs): SignalTargets {
  const { landmarks, prevLandmarks, detectDtMs, stats } = input;

  const lightLevel = stats ? stats.faceLuma : 0;
  const backlightRisk = stats
    ? clamp01(
        (stats.bgLuma - stats.faceLuma - T.BACKLIGHT_DELTA_MIN) /
          (T.BACKLIGHT_DELTA_MAX - T.BACKLIGHT_DELTA_MIN)
      )
    : 0;
  const clipPenalty = stats
    ? clamp01(1 - stats.clipFraction / T.LIGHT_CLIP_FRAC_MAX)
    : 1;
  const lightScore = stats
    ? trapezoid(
        stats.faceLuma,
        T.LIGHT_DARK_FLOOR,
        T.LIGHT_GOOD_LO,
        T.LIGHT_GOOD_HI,
        T.LIGHT_BRIGHT_CEIL
      ) * clipPenalty
    : 0;
  const sharpnessScore = stats
    ? clamp01((stats.lapVariance - T.SHARP_VAR_MIN) / (T.SHARP_VAR_FULL - T.SHARP_VAR_MIN))
    : 0;

  if (!landmarks) {
    return {
      presence: 0,
      distanceScore: 0,
      centerScore: 0,
      poseScore: 0,
      lightScore,
      lightLevel,
      sharpnessScore,
      stillnessScore: 0,
      backlightRisk,
      faceHeightFrac: 0,
      centerOffset: 1,
      faceBox: null,
      pose: null,
      foreheadVisible: false,
      chinVisible: false,
      bothCheeksVisible: false,
    };
  }

  const box = boxFromLandmarks(landmarks);
  const pose = poseFromLandmarks(landmarks);

  const faceHeightFrac = box.height;
  const distanceScore = trapezoid(
    faceHeightFrac,
    T.DIST_FAR_MIN,
    T.DIST_IDEAL_LO,
    T.DIST_IDEAL_HI,
    T.DIST_CLOSE_MAX
  );

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const centerOffset = Math.hypot(cx - 0.5, cy - 0.5);
  const centerScore = clamp01(
    1 - Math.max(0, centerOffset - T.CENTER_DEAD_ZONE) / (T.CENTER_MAX_OFFSET - T.CENTER_DEAD_ZONE)
  );

  const axisScore = (deg: number, ok: number) => clamp01(1 - Math.abs(deg) / (2 * ok));
  const poseScore = Math.min(
    axisScore(pose.yawDeg, T.YAW_OK_DEG),
    axisScore(pose.pitchDeg, T.PITCH_OK_DEG),
    axisScore(pose.rollDeg, T.ROLL_OK_DEG)
  );

  let stillnessScore: number;
  if (prevLandmarks && detectDtMs > 0) {
    const diag = Math.hypot(box.width, box.height);
    const vel = landmarkVelocity(prevLandmarks, landmarks, diag, detectDtMs);
    stillnessScore = clamp01(
      1 - (vel - T.MOTION_NONE_PER_S) / (T.MOTION_FULL_PER_S - T.MOTION_NONE_PER_S)
    );
  } else {
    stillnessScore = 0.5; // first detection: neutral, glides from here
  }

  const inX = (p: NormPoint) => p.x >= 0.005 && p.x <= 0.995;
  const inY = (p: NormPoint) => p.y >= 0.005 && p.y <= 0.995;

  return {
    presence: 1,
    distanceScore,
    centerScore,
    poseScore,
    lightScore,
    lightLevel,
    sharpnessScore,
    stillnessScore,
    backlightRisk,
    faceHeightFrac,
    centerOffset,
    faceBox: box,
    pose,
    foreheadVisible: inY(landmarks[LM.FOREHEAD_TOP]),
    chinVisible: inY(landmarks[LM.CHIN]),
    bothCheeksVisible: inX(landmarks[LM.FACE_LEFT]) && inX(landmarks[LM.FACE_RIGHT]),
  };
}

// ---------------------------------------------------------------------------
// smoothing
// ---------------------------------------------------------------------------

export interface SmoothedSignals {
  presence: number;
  distanceScore: number;
  centerScore: number;
  poseScore: number;
  lightScore: number;
  lightLevel: number;
  sharpnessScore: number;
  stillnessScore: number;
  backlightRisk: number;
}

export const INITIAL_SMOOTHED: SmoothedSignals = {
  presence: 0,
  distanceScore: 0,
  centerScore: 0,
  poseScore: 0,
  lightScore: 0,
  lightLevel: 0,
  sharpnessScore: 0,
  stillnessScore: 0,
  backlightRisk: 0,
};

/**
 * Frame-rate-independent exponential glide toward the targets.
 * alpha = 1 − exp(−dt/τ) ≈ 0.31 per tick at 15 Hz with τ=180 ms.
 */
export function smoothSignals(
  prev: SmoothedSignals,
  t: SignalTargets,
  dtMs: number
): SmoothedSignals {
  const alpha = 1 - Math.exp(-Math.max(1, dtMs) / T.SMOOTH_TAU_MS);
  return {
    presence: lerp(prev.presence, t.presence, alpha),
    distanceScore: lerp(prev.distanceScore, t.distanceScore, alpha),
    centerScore: lerp(prev.centerScore, t.centerScore, alpha),
    poseScore: lerp(prev.poseScore, t.poseScore, alpha),
    lightScore: lerp(prev.lightScore, t.lightScore, alpha),
    lightLevel: lerp(prev.lightLevel, t.lightLevel, alpha),
    sharpnessScore: lerp(prev.sharpnessScore, t.sharpnessScore, alpha),
    stillnessScore: lerp(prev.stillnessScore, t.stillnessScore, alpha),
    backlightRisk: lerp(prev.backlightRisk, t.backlightRisk, alpha),
  };
}

// ---------------------------------------------------------------------------
// booleans (hysteresis)
// ---------------------------------------------------------------------------

export interface QualityBooleans {
  faceDetected: boolean;
  faceDistanceOk: boolean;
  faceCentered: boolean;
  facePoseOk: boolean;
  lightOk: boolean;
  sharpnessOk: boolean;
  allPass: boolean;
}

export const INITIAL_BOOLEANS: QualityBooleans = {
  faceDetected: false,
  faceDistanceOk: false,
  faceCentered: false,
  facePoseOk: false,
  lightOk: false,
  sharpnessOk: false,
  allPass: false,
};

/**
 * Derive the gate booleans. `faceDetected` is special-cased on raw
 * presence with a time debounce (PRESENCE_LOST_MS) instead of score
 * hysteresis, so a single dropped detector frame doesn't flicker it.
 */
export function deriveBooleans(
  prev: QualityBooleans,
  s: SmoothedSignals,
  rawPresence: boolean,
  msSinceLastDetection: number
): QualityBooleans {
  const faceDetected = rawPresence
    ? true
    : prev.faceDetected && msSinceLastDetection < T.PRESENCE_LOST_MS;

  const faceDistanceOk =
    faceDetected && hysteresis(prev.faceDistanceOk, s.distanceScore, T.DIST_OK_ENTER, T.DIST_OK_EXIT);
  const faceCentered =
    faceDetected && hysteresis(prev.faceCentered, s.centerScore, T.CENTER_OK_ENTER, T.CENTER_OK_EXIT);
  const facePoseOk =
    faceDetected && hysteresis(prev.facePoseOk, s.poseScore, T.POSE_OK_ENTER, T.POSE_OK_EXIT);
  const lightOk = hysteresis(prev.lightOk, s.lightScore, T.LIGHT_OK_ENTER, T.LIGHT_OK_EXIT);

  // sharp AND still — both blur sources gate the same boolean.
  const sharpEnough = hysteresis(prev.sharpnessOk, s.sharpnessScore, T.SHARP_OK_ENTER, T.SHARP_OK_EXIT);
  const stillEnough = hysteresis(prev.sharpnessOk, s.stillnessScore, T.STILL_OK_ENTER, T.STILL_OK_EXIT);
  const sharpnessOk = faceDetected && sharpEnough && stillEnough;

  const allPass =
    faceDetected && faceDistanceOk && faceCentered && facePoseOk && lightOk && sharpnessOk;

  return { faceDetected, faceDistanceOk, faceCentered, facePoseOk, lightOk, sharpnessOk, allPass };
}

// ---------------------------------------------------------------------------
// the one kind instruction
// ---------------------------------------------------------------------------

export const HINT_TEXT: Record<ScanHintId, string> = {
  initializing: 'One moment — getting ready',
  no_face: 'Center your face in the frame',
  too_far: 'Come a little closer',
  too_close: 'Move back a little',
  off_center: 'Center your face',
  bad_pose: 'Look straight ahead',
  low_light: "A bit more light — I've got you",
  too_bright: 'Less direct light',
  hold_still: 'Almost — hold still',
  perfect: 'Perfect. Hold it.',
};

/**
 * Priority ladder — first failing gate wins, so the user always gets
 * exactly one actionable instruction.
 */
export function pickHint(
  b: QualityBooleans,
  t: Pick<SignalTargets, 'faceHeightFrac' | 'centerOffset'>,
  s: SmoothedSignals
): ScanHintId {
  if (!b.faceDetected) return 'no_face';
  if (!b.faceDistanceOk) {
    const idealMid = (T.DIST_IDEAL_LO + T.DIST_IDEAL_HI) / 2;
    return t.faceHeightFrac < idealMid ? 'too_far' : 'too_close';
  }
  if (!b.faceCentered) return 'off_center';
  if (!b.facePoseOk) return 'bad_pose';
  if (!b.lightOk) {
    const brightMid = (T.LIGHT_GOOD_LO + T.LIGHT_GOOD_HI) / 2;
    return s.lightLevel > brightMid ? 'too_bright' : 'low_light';
  }
  if (!b.sharpnessOk) return 'hold_still';
  return 'perfect';
}

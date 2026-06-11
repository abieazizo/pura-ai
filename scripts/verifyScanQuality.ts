/**
 * verifyScanQuality — proves the scan-quality DECISION layer with
 * synthetic inputs (no browser needed). The live-detection layer is
 * verified separately in the browser with a controllable fake-camera
 * rig (see src/scanQuality/README.md).
 *
 * Run: npx tsx scripts/verifyScanQuality.ts
 */

import {
  boxFromLandmarks,
  computeFrameStats,
  computeTargets,
  deriveBooleans,
  hysteresis,
  pickHint,
  poseFromLandmarks,
  smoothSignals,
  trapezoid,
  INITIAL_BOOLEANS,
  INITIAL_SMOOTHED,
  type SignalTargets,
  type SmoothedSignals,
  type QualityBooleans,
} from '../src/scanQuality/signalMath';
import { LM, THRESHOLDS as T } from '../src/scanQuality/thresholds';
import type { NormPoint } from '../src/scanQuality/types';

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

// ---------------------------------------------------------------------------
// synthetic face builder — 478 points arranged so the key indices
// (nose/eyes/chin/forehead/face-sides) sit where a straight-on face
// puts them, parameterized by center / size / yaw / pitch / roll.
// ---------------------------------------------------------------------------

function syntheticFace(opts: {
  cx?: number;
  cy?: number;
  /** face height as fraction of frame height */
  h?: number;
  yawRatio?: number; // nose offset between face sides, 0 = straight
  pitchRatio?: number; // nose offset between forehead/chin, 0 = neutral
  rollDeg?: number;
}): NormPoint[] {
  const { cx = 0.5, cy = 0.5, h = 0.45, yawRatio = 0, pitchRatio = 0, rollDeg = 0 } = opts;
  const w = h * 0.72; // face aspect
  const pts: NormPoint[] = Array.from({ length: 478 }, (_, i) => {
    // scatter filler points inside the face ellipse, deterministic
    const a = (i * 137.508) % 360;
    const r = ((i * 29) % 100) / 100;
    return {
      x: cx + Math.cos((a * Math.PI) / 180) * (w / 2) * r * 0.9,
      y: cy + Math.sin((a * Math.PI) / 180) * (h / 2) * r * 0.9,
    };
  });
  const place = (i: number, x: number, y: number) => (pts[i] = { x, y });
  place(LM.FOREHEAD_TOP, cx, cy - h / 2);
  place(LM.CHIN, cx, cy + h / 2);
  place(LM.FACE_LEFT, cx - w / 2, cy);
  place(LM.FACE_RIGHT, cx + w / 2, cy);
  place(LM.NOSE_TIP, cx + yawRatio * w, cy + (0.58 - 0.5) * h + pitchRatio * h);
  const eyeY = cy - h * 0.12;
  place(LM.LEFT_EYE_OUTER, cx - w * 0.32, eyeY);
  place(LM.RIGHT_EYE_OUTER, cx + w * 0.32, eyeY);
  place(LM.MOUTH_LEFT, cx - w * 0.18, cy + h * 0.27);
  place(LM.MOUTH_RIGHT, cx + w * 0.18, cy + h * 0.27);
  if (rollDeg !== 0) {
    const rad = (rollDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i].x - cx;
      const dy = pts[i].y - cy;
      pts[i] = { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
    }
  }
  return pts;
}

const goodStats = { faceLuma: 0.48, bgLuma: 0.42, clipFraction: 0, lapVariance: 160 };

function targetsFor(
  lms: NormPoint[] | null,
  stats = goodStats,
  prev: NormPoint[] | null = null,
  dt = 66
): SignalTargets {
  return computeTargets({ landmarks: lms, prevLandmarks: prev, detectDtMs: dt, stats });
}

/** Run targets through smoothing+booleans until they settle (~2s). */
function settle(t: SignalTargets): { s: SmoothedSignals; b: QualityBooleans } {
  let s = INITIAL_SMOOTHED;
  let b = INITIAL_BOOLEANS;
  for (let i = 0; i < 30; i++) {
    s = smoothSignals(s, t, 66);
    b = deriveBooleans(b, s, t.presence === 1, t.presence === 1 ? 0 : 9999);
  }
  return { s, b };
}

// ---------------------------------------------------------------------------

console.log('\n— primitives —');
check('trapezoid below floor = 0', trapezoid(0.1, 0.2, 0.3, 0.6, 0.8) === 0);
check('trapezoid in band = 1', trapezoid(0.45, 0.2, 0.3, 0.6, 0.8) === 1);
check('trapezoid on down-ramp ∈ (0,1)', (() => { const v = trapezoid(0.7, 0.2, 0.3, 0.6, 0.8); return v > 0 && v < 1; })());
check('hysteresis holds between enter/exit', hysteresis(true, 0.48, 0.55, 0.42) === true && hysteresis(false, 0.48, 0.55, 0.42) === false);

console.log('\n— geometry —');
const straight = syntheticFace({});
const box = boxFromLandmarks(straight);
check('box centered', Math.abs(box.x + box.width / 2 - 0.5) < 0.02 && Math.abs(box.y + box.height / 2 - 0.5) < 0.02);
const poseStraight = poseFromLandmarks(straight);
check('straight face ≈ zero pose', Math.abs(poseStraight.yawDeg) < 3 && Math.abs(poseStraight.pitchDeg) < 3 && Math.abs(poseStraight.rollDeg) < 1, JSON.stringify(poseStraight));
const rolled = poseFromLandmarks(syntheticFace({ rollDeg: 25 }));
check('25° roll measured', Math.abs(rolled.rollDeg - 25) < 3, `got ${rolled.rollDeg.toFixed(1)}`);
const yawed = poseFromLandmarks(syntheticFace({ yawRatio: 0.25 }));
check('yawed face → |yaw| > OK threshold', Math.abs(yawed.yawDeg) > T.YAW_OK_DEG, `got ${yawed.yawDeg.toFixed(1)}`);

console.log('\n— frame stats —');
{
  const w = 64, h = 48;
  const dark = new Float32Array(w * h).fill(18);
  const sd = computeFrameStats(dark, w, h, null);
  check('dark frame → low luma', sd.faceLuma < 0.12, `luma ${sd.faceLuma.toFixed(2)}`);
  check('flat frame → ~zero Laplacian variance', sd.lapVariance < 1);
  const noisy = new Float32Array(w * h).map((_, i) => ((i * 7919) % 97 > 48 ? 200 : 60));
  const sn = computeFrameStats(noisy, w, h, null);
  check('textured frame → high Laplacian variance', sn.lapVariance > T.SHARP_VAR_FULL, `var ${sn.lapVariance.toFixed(0)}`);
  const clipped = new Float32Array(w * h).fill(252);
  const sc = computeFrameStats(clipped, w, h, null);
  check('blown-out frame → clipFraction ≈ 1', sc.clipFraction > 0.95);
}

console.log('\n— scenario: well-framed face → allPass —');
{
  // prev = same landmarks one frame ago → zero velocity (a held face),
  // matching what the live engine feeds between consecutive detections.
  const { b } = settle(targetsFor(straight, goodStats, straight, 66));
  check('faceDetected', b.faceDetected);
  check('faceDistanceOk', b.faceDistanceOk);
  check('faceCentered', b.faceCentered);
  check('facePoseOk', b.facePoseOk);
  check('lightOk', b.lightOk);
  check('sharpnessOk', b.sharpnessOk);
  check('allPass', b.allPass);
  const t = targetsFor(straight, goodStats, straight, 66);
  check("hint = 'perfect'", pickHint(b, t, settle(t).s) === 'perfect');
}

console.log('\n— scenario: no face → faceDetected false, hint no_face —');
{
  const t = targetsFor(null);
  const { s, b } = settle(t);
  check('faceDetected false', !b.faceDetected);
  check('allPass false', !b.allPass);
  check('framing target 0', t.distanceScore === 0 && t.centerScore === 0);
  check("hint = 'no_face'", pickHint(b, t, s) === 'no_face');
}

console.log('\n— scenario: too far → faceDistanceOk false, hint too_far —');
{
  const t = targetsFor(syntheticFace({ h: 0.16 }));
  const { s, b } = settle(t);
  check('faceDetected true', b.faceDetected);
  check('faceDistanceOk false', !b.faceDistanceOk);
  check('allPass false', !b.allPass);
  check("hint = 'too_far'", pickHint(b, t, s) === 'too_far');
}

console.log('\n— scenario: too close → hint too_close —');
{
  const t = targetsFor(syntheticFace({ h: 0.95, cy: 0.5 }));
  const { s, b } = settle(t);
  check('faceDistanceOk false', !b.faceDistanceOk);
  check("hint = 'too_close'", pickHint(b, t, s) === 'too_close');
}

console.log('\n— scenario: off-center → faceCentered false, hint off_center —');
{
  const t = targetsFor(syntheticFace({ cx: 0.82 }));
  const { s, b } = settle(t);
  check('faceCentered false', !b.faceCentered, `centerScore ${s.centerScore.toFixed(2)}`);
  check('allPass false', !b.allPass);
  check("hint = 'off_center'", pickHint(b, t, s) === 'off_center');
}

console.log('\n— scenario: tilted head → facePoseOk false, hint bad_pose —');
{
  const t = targetsFor(syntheticFace({ rollDeg: 30 }));
  const { s, b } = settle(t);
  check('facePoseOk false', !b.facePoseOk, `poseScore ${s.poseScore.toFixed(2)}`);
  check("hint = 'bad_pose'", pickHint(b, t, s) === 'bad_pose');
}

console.log('\n— scenario: dim room → lightOk false, hint low_light —');
{
  const t = targetsFor(straight, { ...goodStats, faceLuma: 0.1 });
  const { s, b } = settle(t);
  check('lightOk false', !b.lightOk, `lightScore ${s.lightScore.toFixed(2)}`);
  check('lightLevel tracks raw luma', Math.abs(s.lightLevel - 0.1) < 0.03);
  check("hint = 'low_light'", pickHint(b, t, s) === 'low_light');
}

console.log('\n— scenario: blown out → hint too_bright —');
{
  const t = targetsFor(straight, { ...goodStats, faceLuma: 0.97, clipFraction: 0.5 });
  const { s, b } = settle(t);
  check('lightOk false', !b.lightOk);
  check("hint = 'too_bright'", pickHint(b, t, s) === 'too_bright');
}

console.log('\n— scenario: blurry → sharpnessOk false, hint hold_still —');
{
  const t = targetsFor(straight, { ...goodStats, lapVariance: 6 });
  const { s, b } = settle(t);
  check('sharpnessOk false', !b.sharpnessOk, `sharpness ${s.sharpnessScore.toFixed(2)}`);
  check("hint = 'hold_still'", pickHint(b, t, s) === 'hold_still');
}

console.log('\n— scenario: fast motion → stillness gates sharpnessOk —');
{
  const moved = syntheticFace({ cx: 0.55 }); // 0.05 jump in 66ms = fast
  const t = targetsFor(moved, goodStats, straight, 66);
  const { b } = settle(t);
  check('stillness target low', t.stillnessScore < 0.4, `still ${t.stillnessScore.toFixed(2)}`);
  check('sharpnessOk false under motion', !b.sharpnessOk);
  check('allPass false', !b.allPass);
}

console.log('\n— smoothing glides, never snaps —');
{
  let s = INITIAL_SMOOTHED;
  const t = targetsFor(straight);
  s = smoothSignals(s, t, 66);
  check('one tick moves partway', s.distanceScore > 0.05 && s.distanceScore < 0.65, `got ${s.distanceScore.toFixed(2)}`);
  const s2 = smoothSignals(s, t, 66);
  check('monotonic approach', s2.distanceScore > s.distanceScore && s2.distanceScore <= 1);
}

console.log('\n— hint priority: no_face outranks light; light outranks blur —');
{
  const tDarkNoFace = targetsFor(null, { ...goodStats, faceLuma: 0.05, lapVariance: 4 });
  const r = settle(tDarkNoFace);
  check('covered lens → no_face wins', pickHint(r.b, tDarkNoFace, r.s) === 'no_face');
  const tDarkBlur = targetsFor(straight, { ...goodStats, faceLuma: 0.1, lapVariance: 4 });
  const r2 = settle(tDarkBlur);
  check('dark+blurry → low_light wins', pickHint(r2.b, tDarkBlur, r2.s) === 'low_light');
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);

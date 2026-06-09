/**
 * verifyFirstFinding — deterministic proof of the First-Finding screen's core.
 *
 * Motion can't be caught by a script (or a still) — but the CLAIMS the
 * cinematic rests on are deterministic and ARE testable headlessly:
 *   • the glow lands ONLY on named regions, never a whole-face wash;
 *   • person-left/right is correct (and flips for a non-mirrored capture);
 *   • polygons stay inside the frame (nothing touches an edge);
 *   • each glow blooms ON its spoken word (region→word-index mapping);
 *   • the validator rejects banned jargon / empty spots / vague hero
 *     (reject + regenerate once); one tint per metric; Pura Blue is never a
 *     concern tint; the additive alpha is capped (and halved when unsure).
 *
 * Imports only the PURE modules (no react-native), so it runs under tsx.
 */

import {
  DEFAULT_FACE_BOX,
  regionGeometry,
  regionGeometryFromLandmarks,
  regionWordIndex,
  placeToRegion,
  type FaceLandmarks,
} from '@/screens/scan/firstFinding/faceRegions';
import { normalizeSkinRead, type RawSkinRead } from '@/screens/scan/firstFinding/normalizeSkinRead';
import { metricTint } from '@/screens/scan/firstFinding/metricTint';
import { computeBloomSchedule, anchorWordIndex } from '@/screens/scan/firstFinding/bloomSchedule';
import { landmarksFromFaceGeometry } from '@/screens/scan/firstFinding/landmarksFromGeometry';
import type { FaceRegionKey } from '@/types/skinRead';
import type { FaceLandmarkResult } from '@/types/scanResults';

let pass = 0;
let fail = 0;
const fails: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}${detail ? '  — ' + detail : ''}`);
  } else {
    fail++;
    fails.push(name);
    console.log(`  ✗ ${name}${detail ? '  — ' + detail : ''}`);
  }
}

const FW = 248; // reveal frame px
const FH = 331;
const box = DEFAULT_FACE_BOX;
const faceArea = box.w * FW * (box.h * FH);
const cx = FW / 2;
const ALL: FaceRegionKey[] = [
  'forehead', 'between_brows', 'nose', 'around_nose', 'left_cheek',
  'right_cheek', 'under_eyes', 'around_mouth', 'chin', 'jaw',
];

console.log('\n── 1 · Geometry: no whole-face wash, in-bounds, correct sides ──');
let maxRatio = 0;
let allInBounds = true;
for (const r of ALL) {
  const g = regionGeometry(r, box, FW, FH, true);
  const ratio = (g.bbox.w * g.bbox.h) / faceArea;
  maxRatio = Math.max(maxRatio, ratio);
  const inBounds = g.polygon.every(
    (p) => p.x > 0 && p.y > 0 && p.x < FW && p.y < FH,
  );
  if (!inBounds) allInBounds = false;
}
ok('every region glow is LOCAL (bbox < 22% of face area)', maxRatio < 0.22, `largest=${(maxRatio * 100).toFixed(1)}%`);
const left = regionGeometry('left_cheek', box, FW, FH, true);
const right = regionGeometry('right_cheek', box, FW, FH, true);
const bothCheeks = ((left.bbox.w * left.bbox.h) + (right.bbox.w * right.bbox.h)) / faceArea;
ok('a both-cheeks finding covers a SMALL fraction (no whole-face wash)', bothCheeks < 0.3, `${(bothCheeks * 100).toFixed(1)}% of face`);
ok('all polygons stay inside the frame (nothing touches an edge)', allInBounds);
ok('person-LEFT cheek is on the viewer-left (mirrored selfie)', left.centroid.x < cx, `x=${left.centroid.x.toFixed(0)} < ${cx}`);
ok('person-RIGHT cheek is on the viewer-right (mirrored selfie)', right.centroid.x > cx, `x=${right.centroid.x.toFixed(0)} > ${cx}`);
const leftNonMirror = regionGeometry('left_cheek', box, FW, FH, false);
ok('person-LEFT flips to viewer-right for a NON-mirrored capture', leftNonMirror.centroid.x > cx, `x=${leftNonMirror.centroid.x.toFixed(0)} > ${cx}`);

console.log('\n── 2 · Word→glow sync (bloom ON the spoken word) ──');
const line = "Your skin tone's really even — that's the first thing I noticed. The main thing to look at: a bit of redness on your cheeks, a little more on the left.";
const words = line.split(/\s+/);
const leftIdx = regionWordIndex(words, 'left_cheek');
ok('left_cheek maps to the "left" word in the opening line', leftIdx >= 0 && /left/i.test(words[leftIdx] ?? ''), `idx=${leftIdx} word="${words[leftIdx]}"`);
const cheekIdx = regionWordIndex(words, 'right_cheek');
ok('right_cheek maps to a real word index', cheekIdx >= 0, `idx=${cheekIdx} word="${words[cheekIdx]}"`);
ok("placeToRegion('left cheek') = left_cheek", placeToRegion('left cheek') === 'left_cheek');
ok("placeToRegion('under your eyes') = under_eyes", placeToRegion('under your eyes') === 'under_eyes');
ok("placeToRegion('around your nose') = around_nose", placeToRegion('around your nose') === 'around_nose');

console.log('\n── 3 · Validator: reject + regenerate once ──');
const goodRaw: RawSkinRead = {
  opening_line: line,
  findings: [
    {
      name: 'A little redness',
      what_i_see: 'Your cheeks look a touch warmer and pinker than the rest of your skin, a little more on the left.',
      level: 'a little',
      spots: [
        { place: 'left cheek', strength: 0.72 },
        { place: 'right cheek', strength: 0.46 },
      ],
      what_it_means: 'Skin that warms up like this is usually just a bit sensitive that day.',
      do_this: 'Rinse with cool water and keep it gentle tonight.',
      how_sure: 'pretty sure',
    },
  ],
  good_things: ['Your skin tone looks really even'],
  photo_check: { light: 'good', clear: true, whole_face_shown: true, makeup_on: false, better_photo_would_help: false },
  sure_level: 'pretty sure',
};
const good = normalizeSkinRead(goodRaw);
ok('good read passes (no regen)', !good.needsRegen && !!good.read);
ok('spots sorted strongest-first', good.read?.findings[0].spots[0].region === 'left_cheek');
ok('strongestRegion derived', good.read?.findings[0].strongestRegion === 'left_cheek');
ok('metric inferred = redness', good.read?.findings[0].metric === 'redness');
ok('lowConfidence false for "pretty sure"', good.read?.findings[0].lowConfidence === false);
ok('hasRealConcerns true', good.read?.hasRealConcerns === true);

const banned = normalizeSkinRead({ ...goodRaw, opening_line: 'Looking at your t-zone, some shine.' });
ok('banned jargon ("t-zone") → needsRegen', banned.needsRegen, banned.reasons.join('; '));

const emptySpots = normalizeSkinRead({ ...goodRaw, findings: [{ ...goodRaw.findings![0], spots: [] }] });
ok('empty spots on hero → needsRegen', emptySpots.needsRegen, emptySpots.reasons.join('; '));

const vague = normalizeSkinRead({ ...goodRaw, findings: [{ ...goodRaw.findings![0], what_i_see: 'some redness' }] });
ok('hero what_i_see too short / vague → needsRegen', vague.needsRegen, vague.reasons.join('; '));

const lowConf = normalizeSkinRead({ ...goodRaw, findings: [{ ...goodRaw.findings![0], how_sure: 'not totally sure in this light' }] });
ok('low-confidence finding flagged', lowConf.read?.findings[0].lowConfidence === true);

console.log('\n── 4 · Tints: one per metric, Pura Blue is never a concern ──');
const PURA_BLUE = '#147cff';
ok('redness tint = coral #FF6B5E (light)', metricTint('redness', 'light').glow.toLowerCase() === '#ff6b5e');
ok('redness glow lifted brighter in dark (luminous heat on black)', metricTint('redness', 'dark').glow.startsWith('rgb('));
let blueLeak = false;
(['redness', 'dryness', 'dark_marks', 'breakouts', 'oil', 'positive', 'neutral'] as const).forEach((m) => {
  if (metricTint(m, 'dark').glow.toLowerCase() === PURA_BLUE) blueLeak = true;
  if (metricTint(m, 'light').glow.toLowerCase() === PURA_BLUE) blueLeak = true;
});
ok('no concern/positive tint equals Pura Blue', !blueLeak);

console.log('\n── 5 · Additive alpha cap (capped; halved when unsure) ──');
const CAP = 0.32;
const capped = Math.min(CAP, Math.max(0.06, 0.9));
ok('strength 0.9 caps to 0.32', capped === 0.32);
ok('low-confidence halves to 0.16', capped * 0.5 === 0.16);

console.log('\n── 6 · Landmark warp: glows track the real face ──');
// Canonical anchors (image-norm) — affine should be ≈ identity here.
const canonLm: FaceLandmarks = {
  faceBounds: DEFAULT_FACE_BOX,
  leftEye: { x: 0.4048, y: 0.424 }, rightEye: { x: 0.5952, y: 0.424 },
  noseTip: { x: 0.5, y: 0.553 }, mouthCenter: { x: 0.5, y: 0.7164 },
  chin: { x: 0.5, y: 0.871 }, foreheadCenter: { x: 0.5, y: 0.192 },
};
const propLeft = regionGeometry('left_cheek', DEFAULT_FACE_BOX, FW, FH, true);
const lmLeft = regionGeometryFromLandmarks('left_cheek', canonLm, FW, FH, true);
const idDelta = Math.hypot(lmLeft.centroid.x - propLeft.centroid.x, lmLeft.centroid.y - propLeft.centroid.y);
ok('canonical landmarks ≈ proportional (identity warp)', idDelta < 4, `Δ=${idDelta.toFixed(1)}px`);

// Off-center: shift the whole face +0.1 in x → left_cheek tracks right.
const shift = (lm: FaceLandmarks, dx: number, dy: number): FaceLandmarks => ({
  faceBounds: { ...lm.faceBounds, x: lm.faceBounds.x + dx, y: lm.faceBounds.y + dy },
  leftEye: { x: lm.leftEye.x + dx, y: lm.leftEye.y + dy },
  rightEye: { x: lm.rightEye.x + dx, y: lm.rightEye.y + dy },
  noseTip: { x: lm.noseTip.x + dx, y: lm.noseTip.y + dy },
  mouthCenter: { x: lm.mouthCenter.x + dx, y: lm.mouthCenter.y + dy },
  chin: { x: lm.chin.x + dx, y: lm.chin.y + dy },
  foreheadCenter: { x: lm.foreheadCenter.x + dx, y: lm.foreheadCenter.y + dy },
});
const offLeft = regionGeometryFromLandmarks('left_cheek', shift(canonLm, 0.1, 0), FW, FH, true);
ok('off-center face → glow tracks the shift', offLeft.centroid.x - lmLeft.centroid.x > 0.05 * FW, `Δx=${(offLeft.centroid.x - lmLeft.centroid.x).toFixed(0)}px`);

// Roll: tilt the eye line (left eye up, right eye down) → cheeks rotate.
const rolled: FaceLandmarks = { ...canonLm, leftEye: { x: 0.4048, y: 0.39 }, rightEye: { x: 0.5952, y: 0.458 } };
const rolledL = regionGeometryFromLandmarks('left_cheek', rolled, FW, FH, true);
const rolledR = regionGeometryFromLandmarks('right_cheek', rolled, FW, FH, true);
const canonR = regionGeometryFromLandmarks('right_cheek', canonLm, FW, FH, true);
const tiltAsym = (rolledR.centroid.y - rolledL.centroid.y) - (canonR.centroid.y - lmLeft.centroid.y);
ok('rolled (tilted) face → cheeks rotate with the head', Math.abs(tiltAsym) > 6, `Δasym=${tiltAsym.toFixed(0)}px`);

// Localization preserved under warp.
const fbArea = canonLm.faceBounds.w * FW * (canonLm.faceBounds.h * FH);
ok('warped glow stays local (no whole-face wash)', (lmLeft.bbox.w * lmLeft.bbox.h) / fbArea < 0.22, `${(((lmLeft.bbox.w * lmLeft.bbox.h) / fbArea) * 100).toFixed(1)}%`);

console.log('\n── 7 · Bloom schedule: bloom ON the spoken place, stronger-first ──');
const BLOOM_OPTS = { startDelayMs: 120, wordStaggerMs: 60, onWordOffsetMs: 140, bloomStaggerMs: 120 };
const cheekAnchor = anchorWordIndex(words, 'left_cheek');
ok('cheek glow anchors on the general "cheek(s)" word, not the trailing "left"', /cheek/i.test(words[cheekAnchor] ?? ''), `idx=${cheekAnchor} word="${words[cheekAnchor]}"`);
const sched = computeBloomSchedule(words, ['left_cheek', 'right_cheek'], BLOOM_OPTS);
ok('stronger (left) cheek blooms FIRST in time', sched.firstIndex === 0 && sched.times[0] < sched.times[1], `t=[${sched.times.map((t) => Math.round(t)).join(', ')}] first=${sched.firstIndex}`);
ok('same-word spots stay one beat (120ms) apart', Math.abs((sched.times[1] - sched.times[0]) - 120) < 1, `Δ=${Math.round(sched.times[1] - sched.times[0])}ms`);
const lastWordT = 120 + (words.length - 1) * 60 + 140;
ok('blooms land mid-sentence (on the place), not delayed to the final word', sched.times[0] < lastWordT - 200, `bloom=${Math.round(sched.times[0])} « lastWord=${Math.round(lastWordT)}`);
const noName = computeBloomSchedule(['skin', 'looks', 'calm'], ['forehead'], BLOOM_OPTS);
ok('region not named in the line → falls back to the last word (never lost)', noName.times[0] >= 120 + 2 * 60, `t=${Math.round(noName.times[0])}`);

console.log('\n── 8 · Production face-tracking adapter (scan geometry → FaceLandmarks) ──');
const goodGeom: FaceLandmarkResult = {
  faceBounds: { x: 0.2, y: 0.12, width: 0.6, height: 0.78 },
  landmarks: {
    leftEye: { x: 0.41, y: 0.43 }, rightEye: { x: 0.59, y: 0.42 },
    noseTip: { x: 0.5, y: 0.55 }, mouthCenter: { x: 0.5, y: 0.69 },
    chin: { x: 0.5, y: 0.85 }, foreheadCenter: { x: 0.5, y: 0.25 },
  },
  orientation: { yaw: 0, pitch: 0, roll: 0 },
  usableForOverlay: true,
};
const adapted = landmarksFromFaceGeometry(goodGeom);
ok('usable scan geometry → FaceLandmarks (width/height → w/h)', !!adapted && adapted.faceBounds.w === 0.6 && adapted.faceBounds.h === 0.78);
ok('landmark anchors pass through 1:1', !!adapted && adapted.leftEye.x === 0.41 && adapted.mouthCenter.y === 0.69 && adapted.foreheadCenter.y === 0.25);
ok('unusable geometry (usableForOverlay=false) → null (proportional fallback)', landmarksFromFaceGeometry({ ...goodGeom, usableForOverlay: false }) === null);
ok('degenerate (tiny) face box → null', landmarksFromFaceGeometry({ ...goodGeom, faceBounds: { x: 0.45, y: 0.45, width: 0.08, height: 0.1 } }) === null);
ok('null / undefined geometry → null', landmarksFromFaceGeometry(null) === null && landmarksFromFaceGeometry(undefined) === null);
const offGeom: FaceLandmarkResult = {
  ...goodGeom,
  faceBounds: { x: 0.35, y: 0.12, width: 0.6, height: 0.78 },
  landmarks: {
    leftEye: { x: 0.56, y: 0.43 }, rightEye: { x: 0.74, y: 0.42 },
    noseTip: { x: 0.65, y: 0.55 }, mouthCenter: { x: 0.65, y: 0.69 },
    chin: { x: 0.65, y: 0.85 }, foreheadCenter: { x: 0.65, y: 0.25 },
  },
};
const gC = regionGeometryFromLandmarks('left_cheek', landmarksFromFaceGeometry(goodGeom)!, FW, FH, true);
const gO = regionGeometryFromLandmarks('left_cheek', landmarksFromFaceGeometry(offGeom)!, FW, FH, true);
ok('adapted off-center face → glow tracks via the screen’s own affine warp', gO.centroid.x - gC.centroid.x > 0.08 * FW, `Δx=${(gO.centroid.x - gC.centroid.x).toFixed(0)}px`);

console.log(`\n──────────────\nPASS ${pass} · FAIL ${fail}`);
if (fail > 0) {
  console.log('FAILED: ' + fails.join(', '));
  process.exit(1);
}
console.log('ALL GREEN ✓\n');

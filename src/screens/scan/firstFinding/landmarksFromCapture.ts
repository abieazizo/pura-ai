/**
 * landmarksFromCapture — the CAPTURE-MOMENT face-tracking bridge.
 *
 * The scan-quality engine freezes a `CaptureQualitySnapshot` at the shutter
 * (478 MediaPipe landmarks + faceBox + pose, normalized 0–1 in RAW un-mirrored
 * video-frame coordinates — see src/scanQuality/README.md). This module adapts
 * that snapshot to the results screens' `FaceLandmarks`, so the on-skin glow
 * AFFINE-warps to the REAL face the camera measured — no second detector, no
 * AI `face_overlay` round-trip.
 *
 * Two coordinate facts this adapter owns so callers don't have to:
 *
 *   1. COVER-CROP — the results photo stages render the capture in a 3:4
 *      portrait frame with `contentFit:"cover"`. The raw video frame is
 *      usually a different aspect (4:3 landscape on web), so raw-frame
 *      normalized coords are re-normalized to the visible (center-cropped)
 *      3:4 view. Skipping this would squash the warp ~44% horizontally on a
 *      640×480 capture.
 *   2. MIRRORING — the captured PHOTO matches the raw video frame: it is NOT
 *      mirrored, even though the live preview was (scanQuality README). The
 *      person's left cheek therefore appears on the VIEWER-RIGHT of the photo,
 *      so callers should pass `mirrored={false}` to the region geometry
 *      whenever these landmarks are in play. `leftEye`/`rightEye` below are
 *      VIEWER-ordered (leftEye.x < rightEye.x), matching how
 *      `regionGeometryFromLandmarks` pairs them with its canonical anchors —
 *      the affine never introduces an accidental flip.
 *
 * Honesty: returns `null` whenever the snapshot isn't trustworthy enough to
 * warp glows (no landmarks near the shutter, missing/tiny face box, degenerate
 * dims) — the screens then use their existing proportional synthesis instead
 * of warping onto coordinates we don't trust.
 *
 * Intentionally PURE (no react-native) so it verifies headlessly alongside the
 * rest of the First-Finding contract (scripts/verifyFirstFinding.ts).
 */

import type { CaptureQualitySnapshot } from '@/scanQuality/types';
import type { FaceLandmarks, NormPoint } from './faceRegions';

/**
 * Both results photo stages (FirstFindingScreen + SkinMapCard) render the
 * capture in a 3:4 portrait frame. Keep in sync with `LAYOUT.photoAspect`
 * (motion.ts) — not imported because that module pulls in react-native and
 * this one must stay pure.
 */
export const PHOTO_STAGE_ASPECT = 3 / 4;

/** Trust gates — mirror landmarksFromGeometry's min-box discipline. */
const MIN_FACE_W = 0.12; // of the visible (stage) frame
const MIN_FACE_H = 0.16;
const MIN_INTEROCULAR = 0.04;

// MediaPipe FaceMesh canonical indices (478-point refined mesh). "subject-*"
// is the person's anatomical side; in a raw un-mirrored frame the subject's
// RIGHT side appears on the viewer's LEFT.
const MP = {
  rightIris: 468, // subject-right iris center (refined-landmarks builds only)
  leftIris: 473, // subject-left iris center
  rightEyeOuter: 33, // subject-right eye corners (base 468-point mesh)
  rightEyeInner: 133,
  leftEyeInner: 362,
  leftEyeOuter: 263,
  noseTip: 1,
  upperLip: 13,
  lowerLip: 14,
  chin: 152,
  forehead: 10,
} as const;

/** Map raw-video-normalized coords → coords normalized to the visible
 *  center-cropped `stageAspect` view of that frame (contentFit:"cover"). */
function coverRemap(videoW: number, videoH: number, stageAspect: number) {
  const imageAspect = videoW / videoH;
  if (imageAspect >= stageAspect) {
    // Frame wider than the stage → sides cropped away.
    const visW = stageAspect / imageAspect;
    const offX = (1 - visW) / 2;
    return {
      x: (x: number) => (x - offX) / visW,
      y: (y: number) => y,
    };
  }
  // Frame taller than the stage → top/bottom cropped away.
  const visH = imageAspect / stageAspect;
  const offY = (1 - visH) / 2;
  return {
    x: (x: number) => x,
    y: (y: number) => (y - offY) / visH,
  };
}

/**
 * Adapt the capture-moment snapshot → the results screens' `FaceLandmarks`.
 * Returns `null` when the snapshot isn't trustworthy enough to warp glows
 * (→ the screens' proportional synthesis fallback).
 */
export function landmarksFromCaptureQuality(
  snapshot: CaptureQualitySnapshot | null | undefined,
  stageAspect: number = PHOTO_STAGE_ASPECT,
): FaceLandmarks | null {
  if (!snapshot) return null;
  const { landmarks: mesh, faceBox, videoWidth, videoHeight } = snapshot;
  if (!mesh || mesh.length < 468 || !faceBox) return null;
  if (!(videoWidth > 0) || !(videoHeight > 0) || !(stageAspect > 0)) return null;

  const m = coverRemap(videoWidth, videoHeight, stageAspect);
  const pt = (i: number): NormPoint => ({ x: m.x(mesh[i].x), y: m.y(mesh[i].y) });
  const mid = (a: NormPoint, b: NormPoint): NormPoint => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  // Iris centers when the refined mesh is present, eye-corner midpoints on the
  // base 468-point mesh (the native plan forwards MLKit contours that way).
  const hasIris = mesh.length > MP.leftIris;
  const subjectRightEye = hasIris
    ? pt(MP.rightIris)
    : mid(pt(MP.rightEyeOuter), pt(MP.rightEyeInner));
  const subjectLeftEye = hasIris
    ? pt(MP.leftIris)
    : mid(pt(MP.leftEyeInner), pt(MP.leftEyeOuter));

  // VIEWER-order the eyes (see module doc) — keeps the screens' affine
  // flip-free regardless of source labeling.
  const [leftEye, rightEye] =
    subjectRightEye.x <= subjectLeftEye.x
      ? [subjectRightEye, subjectLeftEye]
      : [subjectLeftEye, subjectRightEye];
  if (rightEye.x - leftEye.x < MIN_INTEROCULAR) return null;

  // Face box through the same remap (w/h scale by the visible fraction).
  const x0 = m.x(faceBox.x);
  const x1 = m.x(faceBox.x + faceBox.width);
  const y0 = m.y(faceBox.y);
  const y1 = m.y(faceBox.y + faceBox.height);
  const faceBounds = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  if (faceBounds.w < MIN_FACE_W || faceBounds.h < MIN_FACE_H) return null;

  return {
    faceBounds,
    leftEye,
    rightEye,
    noseTip: pt(MP.noseTip),
    mouthCenter: mid(pt(MP.upperLip), pt(MP.lowerLip)),
    chin: pt(MP.chin),
    foreheadCenter: pt(MP.forehead),
  };
}

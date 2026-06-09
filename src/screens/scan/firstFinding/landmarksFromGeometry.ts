/**
 * landmarksFromGeometry — the production face-tracking bridge.
 *
 * The First-Finding screen already AFFINE-WARPS its region glows to real face
 * anchors when given `FaceLandmarks` (see faceRegions.regionGeometryFromLandmarks).
 * Without them it falls back to the proportional centered box — fine for a framed
 * selfie, but it does NOT track an off-center or tilted face. The project ALREADY
 * derives real anchors from the AI `face_overlay` via
 * `services/scanResults/faceGeometry.faceGeometryProvider`, producing a
 * `FaceLandmarkResult`. This module is the (near 1:1) adapter from that canonical
 * geometry to the screen's `FaceLandmarks`, so wiring real tracking into the
 * production container is a one-liner — no native ML, no new detector.
 *
 * It is intentionally PURE (no react-native), so it is unit-tested headlessly
 * alongside the rest of the First-Finding contract (scripts/verifyFirstFinding.ts).
 *
 * Honesty: returns `null` when the geometry is NOT usable for an overlay
 * (`usableForOverlay === false`, e.g. the deterministic fallback / a face too
 * small in frame). The screen then uses its proportional fallback rather than
 * warping glows onto coordinates we don't trust.
 */

import type { FaceLandmarkResult } from '@/types/scanResults';
import type { FaceBox, FaceLandmarks } from './faceRegions';

/**
 * Adapt the canonical scan face geometry → the First-Finding `FaceLandmarks`.
 * Returns `null` when the geometry isn't trustworthy enough to warp glows.
 */
export function landmarksFromFaceGeometry(
  geom: FaceLandmarkResult | null | undefined,
): FaceLandmarks | null {
  if (!geom || !geom.usableForOverlay) return null;
  const { faceBounds: fb, landmarks: lm } = geom;
  // Guard against a degenerate box (mirrors faceGeometry's own min-size gate).
  if (!fb || fb.width < 0.12 || fb.height < 0.16) return null;
  const faceBounds: FaceBox = { x: fb.x, y: fb.y, w: fb.width, h: fb.height };
  return {
    faceBounds,
    leftEye: lm.leftEye,
    rightEye: lm.rightEye,
    noseTip: lm.noseTip,
    mouthCenter: lm.mouthCenter,
    chin: lm.chin,
    foreheadCenter: lm.foreheadCenter,
  };
}

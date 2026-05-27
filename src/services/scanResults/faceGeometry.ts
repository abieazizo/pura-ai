/**
 * Face geometry provider — produces a `FaceLandmarkResult` (face
 * bounds + key landmarks + orientation) for a captured image.
 *
 * Strategy:
 *   1. If the AI's `face_overlay` block is present, use it as-is. The
 *      AI vision model returns landmarks normalized 0..1 against the
 *      captured image, which is exactly what the overlay renderer
 *      consumes. No external ML library required.
 *   2. If `face_overlay` is missing (legacy scans, deterministic
 *      fallback), synthesise a conservative geometry: a face centered
 *      in the frame at ~62% width, with default landmark positions.
 *      Overlays drawn against the fallback are softer and the screen
 *      flags scan quality as "partial".
 *
 * The provider intentionally never asks for arbitrary points: only the
 * semantic zone generator (`buildZoneGeometry`) consumes the landmark
 * output, and it produces SOFT, organic shapes per zone — never
 * diagnostic-looking polygons.
 */

import type {
  FaceGeometryProvider,
  FaceLandmarkResult,
  NormalizedPoint,
  NormalizedRect,
  SemanticFaceZone,
} from '@/types/scanResults';

// ---------------------------------------------------------------------------
// Provider implementation.
// ---------------------------------------------------------------------------

const DEFAULT_FACE: FaceLandmarkResult = {
  faceBounds: { x: 0.19, y: 0.16, width: 0.62, height: 0.7 },
  landmarks: {
    leftEye: { x: 0.37, y: 0.4 },
    rightEye: { x: 0.63, y: 0.4 },
    noseTip: { x: 0.5, y: 0.55 },
    mouthCenter: { x: 0.5, y: 0.7 },
    chin: { x: 0.5, y: 0.84 },
    foreheadCenter: { x: 0.5, y: 0.26 },
  },
  orientation: { yaw: 0, pitch: 0, roll: 0 },
  usableForOverlay: true,
};

export const faceGeometryProvider: FaceGeometryProvider = {
  async detect({ aiFaceOverlay }) {
    if (!aiFaceOverlay) {
      // Fallback geometry — usable for soft overlays but the caller
      // should already have decided the quality status separately.
      return { ...DEFAULT_FACE, usableForOverlay: false };
    }
    const bounds = clampRect(aiFaceOverlay.face_box);
    if (bounds.width < 0.18 || bounds.height < 0.22) {
      return { ...DEFAULT_FACE, usableForOverlay: false };
    }
    return {
      faceBounds: bounds,
      landmarks: {
        leftEye: clampPoint(aiFaceOverlay.landmarks.left_eye),
        rightEye: clampPoint(aiFaceOverlay.landmarks.right_eye),
        noseTip: clampPoint(aiFaceOverlay.landmarks.nose_tip),
        mouthCenter: clampPoint(aiFaceOverlay.landmarks.mouth_center),
        chin: clampPoint(aiFaceOverlay.landmarks.chin),
        foreheadCenter: clampPoint(aiFaceOverlay.landmarks.forehead_center),
      },
      orientation: { yaw: 0, pitch: 0, roll: 0 },
      usableForOverlay: true,
    };
  },
};

// ---------------------------------------------------------------------------
// Zone geometry — turns semantic zone labels into normalized polygons /
// ellipse parameters using the landmark layer.
// ---------------------------------------------------------------------------

export type ZoneShape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotation: number }
  | { kind: 'polygon'; points: NormalizedPoint[] };

/**
 * Build a soft, organic shape for the requested zone, anchored against
 * the supplied face landmarks. Shapes stay inside the face bounds so
 * they never bleed onto hair or background.
 */
export function buildZoneGeometry(
  zone: SemanticFaceZone,
  face: FaceLandmarkResult
): ZoneShape {
  const { landmarks: lm, faceBounds: fb } = face;
  const eyeMidX = (lm.leftEye.x + lm.rightEye.x) / 2;
  const eyeY = (lm.leftEye.y + lm.rightEye.y) / 2;
  const interocular = Math.max(0.001, Math.abs(lm.rightEye.x - lm.leftEye.x));
  const faceRight = fb.x + fb.width;
  const faceBottom = fb.y + fb.height;

  switch (zone) {
    case 'forehead': {
      // Curved patch above the brow line, contained inside the face box.
      const cy = (fb.y + eyeY) / 2 - interocular * 0.18;
      const rx = interocular * 1.15;
      const ry = (eyeY - fb.y) * 0.32;
      return {
        kind: 'ellipse',
        cx: eyeMidX,
        cy: clamp(cy, fb.y + ry, eyeY - ry * 0.5),
        rx: Math.min(rx, fb.width * 0.45),
        ry: Math.max(0.02, ry),
        rotation: 0,
      };
    }
    case 't_zone': {
      // Soft narrow region spanning the bridge of the nose + a band
      // across the forehead center.
      const cy = (lm.foreheadCenter.y + lm.noseTip.y) / 2;
      const rx = interocular * 0.36;
      const ry = (lm.noseTip.y - fb.y) * 0.5;
      return {
        kind: 'ellipse',
        cx: eyeMidX,
        cy,
        rx,
        ry,
        rotation: 0,
      };
    }
    case 'nose': {
      const cx = lm.noseTip.x;
      const cy = (eyeY + lm.noseTip.y) / 2;
      const rx = interocular * 0.22;
      const ry = (lm.noseTip.y - eyeY) * 0.65;
      return { kind: 'ellipse', cx, cy, rx, ry, rotation: 0 };
    }
    case 'left_cheek': {
      const cx = (fb.x + lm.leftEye.x) / 2 + interocular * 0.05;
      const cy = (lm.leftEye.y + lm.mouthCenter.y) / 2;
      const rx = interocular * 0.55;
      const ry = (lm.mouthCenter.y - lm.leftEye.y) * 0.55;
      return {
        kind: 'ellipse',
        cx: clamp(cx, fb.x + rx * 0.5, eyeMidX - rx * 0.4),
        cy,
        rx,
        ry,
        rotation: 0,
      };
    }
    case 'right_cheek': {
      const cx = (faceRight + lm.rightEye.x) / 2 - interocular * 0.05;
      const cy = (lm.rightEye.y + lm.mouthCenter.y) / 2;
      const rx = interocular * 0.55;
      const ry = (lm.mouthCenter.y - lm.rightEye.y) * 0.55;
      return {
        kind: 'ellipse',
        cx: clamp(cx, eyeMidX + rx * 0.4, faceRight - rx * 0.5),
        cy,
        rx,
        ry,
        rotation: 0,
      };
    }
    case 'under_eye_left': {
      const cx = lm.leftEye.x;
      const cy = lm.leftEye.y + interocular * 0.32;
      const rx = interocular * 0.34;
      const ry = interocular * 0.16;
      return { kind: 'ellipse', cx, cy, rx, ry, rotation: 0 };
    }
    case 'under_eye_right': {
      const cx = lm.rightEye.x;
      const cy = lm.rightEye.y + interocular * 0.32;
      const rx = interocular * 0.34;
      const ry = interocular * 0.16;
      return { kind: 'ellipse', cx, cy, rx, ry, rotation: 0 };
    }
    case 'chin': {
      const cx = lm.chin.x;
      const cy = (lm.mouthCenter.y + lm.chin.y) / 2 + interocular * 0.05;
      const rx = interocular * 0.65;
      const ry = (faceBottom - lm.mouthCenter.y) * 0.45;
      return {
        kind: 'ellipse',
        cx,
        cy: clamp(cy, lm.mouthCenter.y + ry * 0.4, faceBottom - ry * 0.5),
        rx,
        ry,
        rotation: 0,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Crop helper — derive the focal rect for a single zone so the Top
// Focus Areas slide can crop the original photo to a specific area.
// ---------------------------------------------------------------------------

/**
 * Compute a normalized crop rect tightly enclosing the union of the
 * given zones on the captured image. Used by FocusAreaResultCard to
 * render a tasteful crop of the user's own photo — never a fake
 * macro shot.
 */
export function buildZonesCropRect(
  zones: SemanticFaceZone[],
  face: FaceLandmarkResult,
  padding: number = 0.07
): NormalizedRect | null {
  if (zones.length === 0) return null;
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const zone of zones) {
    const shape = buildZoneGeometry(zone, face);
    if (shape.kind === 'ellipse') {
      minX = Math.min(minX, shape.cx - shape.rx);
      minY = Math.min(minY, shape.cy - shape.ry);
      maxX = Math.max(maxX, shape.cx + shape.rx);
      maxY = Math.max(maxY, shape.cy + shape.ry);
    } else {
      for (const p of shape.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
  }
  const padW = padding;
  const padH = padding;
  const x = clamp(minX - padW, 0, 1);
  const y = clamp(minY - padH, 0, 1);
  const width = clamp(maxX - minX + padW * 2, 0, 1 - x);
  const height = clamp(maxY - minY + padH * 2, 0, 1 - y);
  if (width <= 0.04 || height <= 0.04) return null;
  return { x, y, width, height };
}

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function clampPoint(p: NormalizedPoint): NormalizedPoint {
  return { x: clamp(p.x, 0, 1), y: clamp(p.y, 0, 1) };
}

function clampRect(r: NormalizedRect): NormalizedRect {
  const x = clamp(r.x, 0, 1);
  const y = clamp(r.y, 0, 1);
  return {
    x,
    y,
    width: clamp(r.width, 0, 1 - x),
    height: clamp(r.height, 0, 1 - y),
  };
}

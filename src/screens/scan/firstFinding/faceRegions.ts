/**
 * faceRegions — the geometry layer for the synced glow.
 *
 * The glow must land ONLY on the region the model named (forehead, left cheek,
 * …) and NEVER wash the whole face — that is what makes it read as real on
 * EVERY skin tone. So each `FaceRegionKey` owns a small polygon, expressed in
 * FACE-BOX-LOCAL normalized coordinates (0..1 inside the detected face box).
 * Glows are radial gradients CLIPPED to these polygons.
 *
 * DETECTION (decide-and-justify): the brief calls for on-device landmarks
 * (Apple Vision VNDetectFaceLandmarks / MediaPipe FaceMesh), run ONCE on the
 * captured frame. Those are native, dev-build-only, and absent in Expo Go / web.
 * Following the project's orphan-file discipline (a static native import would
 * break the Metro bundle), this module ships a PROPORTIONAL detector that runs
 * today: it returns a canonical centered face box, and the region polygons are
 * authored from real facial proportions. When a native provider is installed it
 * implements `FaceDetector` and refines the box + (optionally) the polygons; the
 * screen consumes the SAME `RegionGeometry` either way, so it is a drop-in.
 *
 * MIRRORING: the model says the PERSON's "left/right". Front-camera selfies are
 * displayed mirrored, so the person's left cheek appears on the viewer's LEFT —
 * polygons below are authored for that (mirrored) default. For a non-mirrored
 * capture, `mirrored:false` flips left/right at placement so "left cheek" still
 * lands on the person's left.
 */

import type { FaceRegionKey } from '@/types/skinRead';

export interface NormPoint {
  x: number;
  y: number;
}

/** A face box within the FRAME (normalized 0..1 of frame w/h). */
export interface FaceBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PxPoint {
  x: number;
  y: number;
}
export interface PxRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Everything the glow renderer needs for one region, in frame px. */
export interface RegionGeometry {
  region: FaceRegionKey;
  /** Clip polygon, frame px. */
  polygon: PxPoint[];
  /** Polygon centroid, frame px (glow center + chip leader-line target). */
  centroid: PxPoint;
  /** Polygon bounding box, frame px (the per-spot animated sprite lives here). */
  bbox: PxRect;
}

/**
 * Default centered selfie face box (normalized in the 3:4 frame). A framed
 * front selfie fills most of the portrait with the forehead near the top.
 */
export const DEFAULT_FACE_BOX: FaceBox = { x: 0.16, y: 0.08, w: 0.68, h: 0.86 };

// ---------------------------------------------------------------------------
// Region polygons — FACE-BOX-LOCAL normalized (0..1). Authored for a MIRRORED
// selfie (person-left == viewer-left). Anatomically placed + deliberately SMALL
// so a glow never spreads beyond its region.
// ---------------------------------------------------------------------------

const POLY: Record<FaceRegionKey, NormPoint[]> = {
  forehead: [
    { x: 0.3, y: 0.05 }, { x: 0.5, y: 0.02 }, { x: 0.7, y: 0.05 },
    { x: 0.74, y: 0.18 }, { x: 0.5, y: 0.24 }, { x: 0.26, y: 0.18 },
  ],
  between_brows: [
    { x: 0.44, y: 0.27 }, { x: 0.56, y: 0.27 },
    { x: 0.57, y: 0.38 }, { x: 0.5, y: 0.41 }, { x: 0.43, y: 0.38 },
  ],
  nose: [
    { x: 0.45, y: 0.4 }, { x: 0.55, y: 0.4 },
    { x: 0.58, y: 0.58 }, { x: 0.5, y: 0.63 }, { x: 0.42, y: 0.58 },
  ],
  around_nose: [
    { x: 0.38, y: 0.54 }, { x: 0.62, y: 0.54 },
    { x: 0.63, y: 0.63 }, { x: 0.5, y: 0.67 }, { x: 0.37, y: 0.63 },
  ],
  // person-left == viewer-left (mirrored default)
  left_cheek: [
    { x: 0.19, y: 0.44 }, { x: 0.37, y: 0.46 }, { x: 0.39, y: 0.62 },
    { x: 0.29, y: 0.72 }, { x: 0.17, y: 0.6 },
  ],
  right_cheek: [
    { x: 0.81, y: 0.44 }, { x: 0.63, y: 0.46 }, { x: 0.61, y: 0.62 },
    { x: 0.71, y: 0.72 }, { x: 0.83, y: 0.6 },
  ],
  under_eyes: [
    { x: 0.29, y: 0.43 }, { x: 0.45, y: 0.44 }, { x: 0.55, y: 0.44 },
    { x: 0.71, y: 0.43 }, { x: 0.69, y: 0.5 }, { x: 0.31, y: 0.5 },
  ],
  around_mouth: [
    { x: 0.38, y: 0.7 }, { x: 0.62, y: 0.7 },
    { x: 0.6, y: 0.81 }, { x: 0.5, y: 0.84 }, { x: 0.4, y: 0.81 },
  ],
  chin: [
    { x: 0.41, y: 0.84 }, { x: 0.59, y: 0.84 },
    { x: 0.55, y: 0.96 }, { x: 0.5, y: 0.98 }, { x: 0.45, y: 0.96 },
  ],
  jaw: [
    { x: 0.24, y: 0.72 }, { x: 0.5, y: 0.92 }, { x: 0.76, y: 0.72 },
    { x: 0.72, y: 0.82 }, { x: 0.5, y: 0.99 }, { x: 0.28, y: 0.82 },
  ],
};

/** Regions whose person-left/right must flip when the photo is NOT mirrored. */
const SIDE_FLIP: Partial<Record<FaceRegionKey, FaceRegionKey>> = {
  left_cheek: 'right_cheek',
  right_cheek: 'left_cheek',
};

// ---------------------------------------------------------------------------
// Detection provider — proportional today, native-refinable later.
// ---------------------------------------------------------------------------

export interface FaceDetectResult {
  faceBox: FaceBox;
  /** True when a native landmark provider refined the box. */
  refined: boolean;
}

export interface FaceDetector {
  /** Runs ONCE on the captured frame. Returns null → use DEFAULT_FACE_BOX. */
  detect(imageUri: string): Promise<FaceDetectResult | null>;
}

/**
 * The proportional fallback detector. It does not read pixels (honest: no
 * native landmark model is bundled), it returns the canonical centered box so
 * the region polygons are anatomically plausible for a framed selfie.
 */
export const proportionalFaceDetector: FaceDetector = {
  async detect() {
    return { faceBox: DEFAULT_FACE_BOX, refined: false };
  },
};

// ---------------------------------------------------------------------------
// Geometry math.
// ---------------------------------------------------------------------------

function localToFramePx(
  p: NormPoint,
  box: FaceBox,
  frameW: number,
  frameH: number,
): PxPoint {
  return {
    x: (box.x + p.x * box.w) * frameW,
    y: (box.y + p.y * box.h) * frameH,
  };
}

function centroidOf(points: PxPoint[]): PxPoint {
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  const n = Math.max(1, points.length);
  return { x: sx / n, y: sy / n };
}

function bboxOf(points: PxPoint[]): PxRect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * Resolve a region's full geometry (polygon + centroid + bbox) in frame px.
 * `mirrored` (default true = front-selfie) keeps person-left/right correct.
 */
export function regionGeometry(
  region: FaceRegionKey,
  box: FaceBox,
  frameW: number,
  frameH: number,
  mirrored = true,
): RegionGeometry {
  const key = !mirrored && SIDE_FLIP[region] ? SIDE_FLIP[region]! : region;
  const polygon = POLY[key].map((p) => localToFramePx(p, box, frameW, frameH));
  return {
    region,
    polygon,
    centroid: centroidOf(polygon),
    bbox: bboxOf(polygon),
  };
}

// ---------------------------------------------------------------------------
// LANDMARK-DRIVEN geometry — closes the "fixed proportional box" gap. When real
// anchors are available (the project's faceGeometryProvider derives them from
// the AI `face_overlay`), the region polygons are WARPED by an affine fit from
// the canonical face to the detected eyes + mouth, so glows track an off-center
// or tilted (rolled) face — not just a centered box. Degrades to the proportional
// path when anchors are absent (affine ≈ identity).
// ---------------------------------------------------------------------------

export interface FaceLandmarks {
  /** Face box, normalized in the IMAGE (≈ the frame for a 3:4 selfie). */
  faceBounds: FaceBox;
  leftEye: NormPoint;
  rightEye: NormPoint;
  noseTip: NormPoint;
  mouthCenter: NormPoint;
  chin: NormPoint;
  foreheadCenter: NormPoint;
}

// Canonical anchors (face-box-local) — consistent with POLY above, so a face
// detected AT the canonical pose yields the identity transform (== proportional).
const CANON_ANCHORS = {
  leftEye: { x: 0.36, y: 0.4 },
  rightEye: { x: 0.64, y: 0.4 },
  mouthCenter: { x: 0.5, y: 0.74 },
} as const;

interface Affine { a: number; b: number; c: number; d: number; e: number; f: number }

function boxToImg(p: NormPoint, box: FaceBox): NormPoint {
  return { x: box.x + p.x * box.w, y: box.y + p.y * box.h };
}
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
function det3(m: number[][]): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}
/** Solve M·x = r (3×3) by Cramer's rule. */
function solve3(M: number[][], r: number[]): [number, number, number] | null {
  const d = det3(M);
  if (Math.abs(d) < 1e-9) return null;
  const col = (i: number): number[][] =>
    M.map((row, ri) => row.map((v, ci) => (ci === i ? r[ri] : v)));
  return [det3(col(0)) / d, det3(col(1)) / d, det3(col(2)) / d];
}
/** Affine mapping src[3] → dst[3] (image-norm point pairs). */
function fitAffine(src: NormPoint[], dst: NormPoint[]): Affine | null {
  const M = [
    [src[0].x, src[0].y, 1],
    [src[1].x, src[1].y, 1],
    [src[2].x, src[2].y, 1],
  ];
  const rowX = solve3(M, [dst[0].x, dst[1].x, dst[2].x]);
  const rowY = solve3(M, [dst[0].y, dst[1].y, dst[2].y]);
  if (!rowX || !rowY) return null;
  return { a: rowX[0], b: rowX[1], c: rowX[2], d: rowY[0], e: rowY[1], f: rowY[2] };
}
function applyAffine(t: Affine, p: NormPoint): NormPoint {
  return { x: t.a * p.x + t.b * p.y + t.c, y: t.d * p.x + t.e * p.y + t.f };
}

/**
 * Region geometry warped to REAL landmarks. Same output contract as
 * `regionGeometry`, so the glow renderer is unchanged.
 */
export function regionGeometryFromLandmarks(
  region: FaceRegionKey,
  lm: FaceLandmarks,
  frameW: number,
  frameH: number,
  mirrored = true,
): RegionGeometry {
  const key = !mirrored && SIDE_FLIP[region] ? SIDE_FLIP[region]! : region;
  const src = [
    boxToImg(CANON_ANCHORS.leftEye, DEFAULT_FACE_BOX),
    boxToImg(CANON_ANCHORS.rightEye, DEFAULT_FACE_BOX),
    boxToImg(CANON_ANCHORS.mouthCenter, DEFAULT_FACE_BOX),
  ];
  const dst = [lm.leftEye, lm.rightEye, lm.mouthCenter];
  const aff = fitAffine(src, dst);
  const polygon = POLY[key].map((p) => {
    const canonImg = boxToImg(p, DEFAULT_FACE_BOX);
    const img = aff
      ? applyAffine(aff, canonImg)
      : boxToImg(p, lm.faceBounds); // degenerate → place via detected box
    return { x: clamp01(img.x) * frameW, y: clamp01(img.y) * frameH };
  });
  return {
    region,
    polygon,
    centroid: centroidOf(polygon),
    bbox: bboxOf(polygon),
  };
}

/** SVG `points` string for a polygon (frame px). */
export function polygonPointsAttr(points: PxPoint[]): string {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

// ---------------------------------------------------------------------------
// Plain place string → region key. The model speaks the FIXED list; this maps
// any reasonable phrasing onto a key. Returns null when nothing matches (the
// normalizer then drops the spot rather than guess).
// ---------------------------------------------------------------------------

export function placeToRegion(place: string): FaceRegionKey | null {
  const p = place.toLowerCase();
  if (p.includes('forehead')) return 'forehead';
  if (p.includes('between') && p.includes('brow')) return 'between_brows';
  if (p.includes('around') && p.includes('nose')) return 'around_nose';
  if (p.includes('nose')) return 'nose';
  if (p.includes('left') && p.includes('cheek')) return 'left_cheek';
  if (p.includes('right') && p.includes('cheek')) return 'right_cheek';
  if (p.includes('cheek')) return 'left_cheek'; // unspecified side → left
  if (p.includes('under') && p.includes('eye')) return 'under_eyes';
  if (p.includes('eye')) return 'under_eyes';
  if (p.includes('mouth') || p.includes('lip')) return 'around_mouth';
  if (p.includes('chin')) return 'chin';
  if (p.includes('jaw')) return 'jaw';
  if (p.includes('brow')) return 'between_brows';
  return null;
}

/**
 * Find the word index in a tokenized line where a region is NAMED, so the glow
 * can bloom on the spoken word. Returns -1 when the line doesn't name it (the
 * screen then blooms after the last word). Matches the region's salient noun
 * AND, for sided regions, prefers the index where the side word appears.
 */
export function regionWordIndex(words: string[], region: FaceRegionKey): number {
  const lower = words.map((w) => w.toLowerCase().replace(/[^a-z]/g, ''));
  const nounByRegion: Record<FaceRegionKey, string[]> = {
    forehead: ['forehead'],
    between_brows: ['brows', 'eyebrows', 'brow'],
    nose: ['nose'],
    around_nose: ['nose'],
    left_cheek: ['cheek', 'cheeks', 'left'],
    right_cheek: ['cheek', 'cheeks', 'right'],
    under_eyes: ['eyes', 'eye', 'under'],
    around_mouth: ['mouth', 'lips'],
    chin: ['chin'],
    jaw: ['jaw'],
  };
  const nouns = nounByRegion[region];
  // Prefer a side word for sided regions ("…on the left").
  if (region === 'left_cheek' || region === 'right_cheek') {
    const side = region === 'left_cheek' ? 'left' : 'right';
    const si = lower.indexOf(side);
    if (si >= 0) return si;
  }
  for (let i = 0; i < lower.length; i++) {
    if (nouns.includes(lower[i])) return i;
  }
  return -1;
}

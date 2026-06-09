/**
 * coverageGuard — the structural promise that the on-skin glow can NEVER wash a
 * whole face. It is the brief's "coverage-cap guard", expressed as pure,
 * testable geometry (NO Skia, NO React — import-safe everywhere, exercised by
 * scripts/verifyYourSkin.ts).
 *
 * WHY THIS EXISTS: a glow that paints most of the face reads as a filter, not a
 * read, and is exactly how a dark-skinned face gets unfairly "washed". The
 * authored region polygons (faceRegions.POLY) are deliberately small, so honest
 * data passes untouched. But a model can still hallucinate a giant polygon or
 * tag every region at once. This guard makes that impossible to RENDER:
 *
 *   • PER-SPOT cap   — any single spot whose region covers more than
 *                      `PER_SPOT_CAP` of the face box is dropped (a "whole face"
 *                      region masquerading as one spot).
 *   • PER-FINDING cap — if a finding's combined lit area exceeds
 *                      `WHOLE_FACE_CAP` of the face box, the finding is REJECTED
 *                      (its spots are stripped) and flagged so the upstream
 *                      normalizer can re-request a cleaner read ("regenerate").
 *
 * Coverage is measured as a FRACTION of the face box, which is scale-invariant —
 * so the guard needs no frame dimensions and gives the same verdict at any size.
 */

import {
  DEFAULT_FACE_BOX,
  regionGeometry,
  type PxPoint,
} from '../firstFinding/faceRegions';
import type { FaceRegionKey, SkinRead, SkinReadFinding, SkinReadSpot } from '@/types/skinRead';

/** A single spot may not cover more than this fraction of the face box. */
export const PER_SPOT_CAP = 0.18;
/**
 * One finding's combined lit area may not exceed this fraction of the face box.
 * Calibrated to THIS metric: the authored region polygons are small + disjoint,
 * so even tagging every region tops out near ~0.30, while an honest 1–2 region
 * finding stays ≤ ~0.12. 0.22 cleanly separates a multi-region wash from a real
 * finding (verified in scripts/verifyYourSkin.ts).
 */
export const WHOLE_FACE_CAP = 0.22;
/** A single finding located across MORE than this many distinct regions is a
 *  wash regardless of area (the renderer only ever lights 4 spots anyway). */
export const MAX_LIT_REGIONS = 4;

/** Shoelace polygon area (px²), always positive. */
export function polygonAreaPx(points: PxPoint[]): number {
  let a = 0;
  for (let i = 0, n = points.length; i < n; i++) {
    const p = points[i];
    const q = points[(i + 1) % n];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

// A canonical reference frame for scale-invariant fractions. Any size works; we
// divide every area by the SAME face-box area, so the ratio is dimensionless.
const REF = 1000;
const REF_FACE_AREA = DEFAULT_FACE_BOX.w * REF * (DEFAULT_FACE_BOX.h * REF);

/** A region's area as a fraction of the face box (0..1). Memoised per key. */
const _coverageCache: Partial<Record<FaceRegionKey, number>> = {};
export function regionCoverageFraction(region: FaceRegionKey): number {
  const hit = _coverageCache[region];
  if (hit !== undefined) return hit;
  const g = regionGeometry(region, DEFAULT_FACE_BOX, REF, REF, true);
  const frac = polygonAreaPx(g.polygon) / REF_FACE_AREA;
  _coverageCache[region] = frac;
  return frac;
}

export interface FindingCoverage {
  id: string;
  /** Spots kept after the per-spot cap. */
  spots: SkinReadSpot[];
  /** Combined kept coverage as a fraction of the face box. */
  coverage: number;
  /** Spots dropped because a single region was too large. */
  droppedSpots: FaceRegionKey[];
  /** True when the finding's combined area blew the whole-face cap → rejected. */
  wholeFaceRejected: boolean;
}

/** Guard ONE finding. Pure; never mutates the input. */
export function guardFinding(finding: SkinReadFinding): FindingCoverage {
  const droppedSpots: FaceRegionKey[] = [];
  const kept: SkinReadSpot[] = [];
  for (const s of finding.spots) {
    if (regionCoverageFraction(s.region) > PER_SPOT_CAP) {
      droppedSpots.push(s.region);
      continue;
    }
    kept.push(s);
  }
  // Combined coverage uses UNIQUE regions (overlapping tags shouldn't double-count
  // into a false wash).
  const uniqueRegions = Array.from(new Set(kept.map((s) => s.region)));
  const coverage = uniqueRegions.reduce((sum, r) => sum + regionCoverageFraction(r), 0);
  const wholeFaceRejected = coverage > WHOLE_FACE_CAP || uniqueRegions.length > MAX_LIT_REGIONS;
  return {
    id: finding.id,
    spots: wholeFaceRejected ? [] : kept,
    coverage,
    droppedSpots,
    wholeFaceRejected,
  };
}

export interface CoverageReport {
  /** finding id → its coverage verdict. */
  byId: Record<string, FindingCoverage>;
  /** Finding ids that hit the whole-face cap (a wash) and were rejected. */
  rejectedIds: string[];
  /** True when ANY finding was rejected → the normalizer should regenerate. */
  regenerateAdvised: boolean;
}

/**
 * Guard a whole read. Returns sanitized findings (over-cap spots stripped,
 * washed findings emptied) PLUS a report. The screen renders the sanitized
 * findings, so a whole-face wash is structurally impossible to draw; the report
 * carries the regenerate signal for the upstream normalizer / telemetry.
 *
 * Non-destructive on honest data: the authored region polygons are all well
 * under PER_SPOT_CAP, and a realistic multi-spot finding stays well under
 * WHOLE_FACE_CAP — so legitimate reads pass through byte-identical.
 */
export function guardRead(read: SkinRead): { findings: SkinReadFinding[]; report: CoverageReport } {
  const byId: Record<string, FindingCoverage> = {};
  const rejectedIds: string[] = [];
  const findings = read.findings.map((f) => {
    const cov = guardFinding(f);
    byId[f.id] = cov;
    if (cov.wholeFaceRejected) rejectedIds.push(f.id);
    if (cov.spots.length === f.spots.length && !cov.wholeFaceRejected) return f; // untouched
    const strongest = cov.spots.length > 0 ? cov.spots[0].region : null;
    return { ...f, spots: cov.spots, strongestRegion: strongest } as SkinReadFinding;
  });
  return {
    findings,
    report: { byId, rejectedIds, regenerateAdvised: rejectedIds.length > 0 },
  };
}

/** Render-time belt for the glow layer: is this polygon obviously too big to be
 *  a single region (a fraction of the FRAME, not the face box)? Used by
 *  GlowFieldSkia as a last line of defence even if the data guard is bypassed. */
export function spotExceedsFrame(polygon: PxPoint[], frameW: number, frameH: number, frac = 0.3): boolean {
  return polygonAreaPx(polygon) > frameW * frameH * frac;
}

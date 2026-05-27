/**
 * Concern catalog — the bridge between the LEGACY AI concern enum
 * (`src/ai/ai-contracts.ts :: ConcernType`) and the NEW scan-results
 * concern enum (`src/types/scanResults.ts :: ConcernType`).
 *
 * Keeping this mapping in one file means the AI contract can evolve
 * independently of the visual taxonomy and the UI never has to peek
 * at the legacy enum.
 */

import type {
  ConcernType as LegacyConcernType,
  FaceRegion as LegacyFaceRegion,
  Severity as LegacySeverity,
} from '@/ai/ai-contracts';
import type {
  ConcernPriority,
  ConcernType as VisualConcernType,
  SemanticFaceZone,
} from '@/types/scanResults';

// ---------------------------------------------------------------------------
// Default zones per concern type — used when the AI returned a finding
// but didn't tag specific regions.
//
// These are intentionally cosmetic placements (where this concern most
// commonly presents on a face) rather than diagnostic. The overlay
// renderer signals visually that the alignment is approximate when
// fallback zones are used.
// ---------------------------------------------------------------------------

export const DEFAULT_ZONES_BY_CONCERN: Record<
  VisualConcernType,
  SemanticFaceZone[]
> = {
  texture: ['forehead'],
  under_eye_fatigue: ['under_eye_left', 'under_eye_right'],
  breakouts: ['chin', 'forehead'],
  redness: ['left_cheek', 'right_cheek'],
  dryness: ['left_cheek', 'right_cheek'],
  oil_balance: ['forehead', 'nose'],
  dark_marks: ['left_cheek', 'right_cheek'],
  barrier_stress: ['left_cheek', 'right_cheek'],
};

// ---------------------------------------------------------------------------
// Concern enum mapping.
// ---------------------------------------------------------------------------

/**
 * Translate the legacy AI ConcernType to the visual ConcernType the new
 * results UI consumes.
 *
 * Two AI concerns collapse into texture: `texture` itself and `pores`.
 * `sensitivity` becomes `barrier_stress`. `hydration` becomes `dryness`.
 * Dark marks may be re-classed as `under_eye_fatigue` later by the
 * caller if their regions sit under the eyes (see translateAnalysis).
 */
export function mapConcernToVisualType(
  legacy: LegacyConcernType
): VisualConcernType {
  switch (legacy) {
    case 'texture':
      return 'texture';
    case 'pores':
      return 'texture';
    case 'breakouts':
      return 'breakouts';
    case 'redness':
      return 'redness';
    case 'hydration':
      return 'dryness';
    case 'oiliness':
      return 'oil_balance';
    case 'sensitivity':
      return 'barrier_stress';
    case 'dark_marks':
      return 'dark_marks';
  }
}

// ---------------------------------------------------------------------------
// Face region → semantic zone mapping.
// ---------------------------------------------------------------------------

/**
 * Expand a legacy region into the set of semantic zones the new overlay
 * renderer understands. `under_eyes` produces left + right crescents;
 * `t_zone` includes the nose bridge and forehead center; `across_face`
 * spreads across cheeks + forehead.
 */
export function expandRegionToZones(
  region: LegacyFaceRegion
): SemanticFaceZone[] {
  switch (region) {
    case 'forehead':
      return ['forehead'];
    case 't_zone':
      return ['forehead', 'nose'];
    case 'nose':
      return ['nose'];
    case 'left_cheek':
      return ['left_cheek'];
    case 'right_cheek':
      return ['right_cheek'];
    case 'chin':
      return ['chin'];
    case 'jawline':
      return ['chin'];
    case 'under_eyes':
      return ['under_eye_left', 'under_eye_right'];
    case 'across_face':
      return ['forehead', 'left_cheek', 'right_cheek'];
  }
}

// ---------------------------------------------------------------------------
// Severity / marker_priority → display priority.
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<LegacySeverity, number> = {
  none: 0,
  low: 1,
  mild: 2,
  moderate: 3,
  high: 4,
};

/**
 * Resolve the user-facing priority chip ("high / medium / low") from a
 * combination of model severity + marker_priority. Marker_priority 1 is
 * the AI's strongest hint that something should headline the result;
 * we honor it as long as the severity backs it up.
 */
export function resolveDisplayPriority(args: {
  severity: LegacySeverity;
  markerPriority: 0 | 1 | 2 | 3;
}): ConcernPriority {
  const { severity, markerPriority } = args;
  if (markerPriority === 1 && SEVERITY_RANK[severity] >= 3) return 'high';
  if (markerPriority === 1) return 'medium';
  if (markerPriority === 2) {
    return SEVERITY_RANK[severity] >= 3 ? 'high' : 'medium';
  }
  if (markerPriority === 3) return 'low';
  // marker_priority === 0 → don't surface; caller should drop these.
  return SEVERITY_RANK[severity] >= 4 ? 'high' : 'low';
}

/**
 * Numeric weight for priority — used to sort finding cards on the Top
 * Focus Areas slide.
 */
export function priorityWeight(priority: ConcernPriority): number {
  switch (priority) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
  }
}

// ---------------------------------------------------------------------------
// Severity → present flag.
// ---------------------------------------------------------------------------

/**
 * A finding is considered visibly "present" only when the AI assigned
 * it a non-trivial severity tier. `none` and `low` are not surfaced.
 */
export function severityImpliesPresent(severity: LegacySeverity): boolean {
  return SEVERITY_RANK[severity] >= 2;
}

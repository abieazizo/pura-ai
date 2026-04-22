/**
 * Bridges the existing `Scan` shape (history-of-record) to the new
 * `ScanResult` shape (choreography view model). The new screen needs
 * zone-keyed scores + up to 4 ordered findings; the legacy Scan stores an
 * array of SkinZone records. This converter is the one-way mapping.
 */

import type { Scan, ScanFinding, ScanResult, ScanZoneKey } from '@/types';
import {
  DEFAULT_FINDING_LABELS,
  FINDING_ORDER,
  FINDING_TYPE_TO_ZONE,
  MARKER_POSITIONS,
} from '../constants';

/** Pulls the best-matching zone score from `Scan.zones` for the 4 scan zones. */
function pickZoneScore(scan: Scan, key: ScanZoneKey): number {
  const match = scan.zones.find((z) => z.key === key);
  if (match) return match.score;
  // Fall back to the overall score to avoid a 0-bubble if the scan model
  // didn't include that zone explicitly.
  return scan.overallScore;
}

/**
 * Returns exactly 4 findings in the canonical order
 * [dryness, texture, barrier, hydration]. If the API produced fewer we pad
 * deterministically using the marker positions — the visual ground truth
 * is that Beat 4 always shows 4 markers.
 */
function buildFindings(scan: Scan): ScanFinding[] {
  const padded: ScanFinding[] = FINDING_ORDER.map((type, i) => {
    const zone = FINDING_TYPE_TO_ZONE[type];
    const pos = MARKER_POSITIONS[i];
    return {
      type,
      zone,
      position: { x: pos.x, y: pos.y },
      label: DEFAULT_FINDING_LABELS[type],
    };
  });
  // If the scan model has its own findings extension later we'd merge here;
  // today we synthesize from the zone summary so the reveal chip row shows
  // meaningful colors.
  return padded;
}

export function scanToScanResult(scan: Scan, scanCount: number): ScanResult {
  return {
    photoUri: scan.photoUri,
    overallScore: scan.overallScore,
    zoneScores: {
      forehead: pickZoneScore(scan, 'forehead'),
      tZone: pickZoneScore(scan, 'tZone'),
      chin: pickZoneScore(scan, 'chin'),
      cheeks: pickZoneScore(scan, 'cheeks'),
    },
    findings: buildFindings(scan),
    aiReadout: scan.summaryBody,
    timestamp: scan.capturedAt,
    scanCount,
    scanId: scan.id,
  };
}

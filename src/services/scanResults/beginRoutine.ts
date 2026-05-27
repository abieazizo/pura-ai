/**
 * `beginRoutineFromAnalysis` — single canonical gate for transitioning
 * a scan analysis into the Routine builder.
 *
 * Truth-first contract:
 *   • Returns `{ ok: false, reason }` for any analysis that does NOT
 *     satisfy `canGenerateRoutineFromScan`. Callers must not bypass.
 *   • Calls `useRoutineStore.startBuild` only on the success path.
 *   • Does NOT clear or overwrite a prior routine — a stale routine
 *     from an older scan keeps its place; this scan simply does not
 *     supersede it when ineligible.
 */

import type { ScanAnalysisResponse } from '@/types/scanResults';
import {
  canGenerateRoutineFromScan,
  selectVisibleFindings,
} from '@/services/scanResults/translateAnalysis';
import { useRoutineStore } from '@/state/routine/routineStore';

export type BeginRoutineResult =
  | { ok: true; scanId: string; supportedFindingCount: number }
  | {
      ok: false;
      reason:
        | 'retake_required'
        | 'no_supported_findings'
        | 'routine_not_allowed';
    };

export function beginRoutineFromAnalysis(
  analysis: ScanAnalysisResponse
): BeginRoutineResult {
  if (analysis.scanQuality.usability === 'retake_required') {
    return { ok: false, reason: 'retake_required' };
  }

  const supportedFindings = selectVisibleFindings(analysis);
  if (supportedFindings.length === 0) {
    return { ok: false, reason: 'no_supported_findings' };
  }

  if (analysis.routineEligibility.allowed !== true) {
    return { ok: false, reason: 'routine_not_allowed' };
  }

  // Final defensive check — the consolidated predicate.
  if (!canGenerateRoutineFromScan(analysis, supportedFindings)) {
    return { ok: false, reason: 'routine_not_allowed' };
  }

  useRoutineStore.getState().startBuild(analysis.scanId);
  return {
    ok: true,
    scanId: analysis.scanId,
    supportedFindingCount: supportedFindings.length,
  };
}

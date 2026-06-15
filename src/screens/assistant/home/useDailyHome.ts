/**
 * useDailyHome — assembles the canonical store inputs and projects them
 * through `buildDailyHomeModel`. The single store-facing seam: the screen
 * imports this hook and the model type, nothing else from state.
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store/useAppStore';
import { useSkinState } from '@/hooks/useCanonical';
import {
  useRoutineStore,
  selectDailyDoneIds,
  defaultTimeOfDayForNow,
} from '@/state/routine/routineStore';
import { computeSkinScore } from '@/utils/skinScore';
import type { SemanticFaceZone } from '@/types/scanResults';
import { buildDailyHomeModel, type DailyHomeModel } from './dailyHomeModel';
import type { CalmZoneWord } from './homeVoice';

/** Plain words only for zones the greeting can name without sounding odd. */
function zoneWord(zones: SemanticFaceZone[] | undefined): CalmZoneWord | null {
  for (const z of zones ?? []) {
    if (z === 'left_cheek' || z === 'right_cheek') return 'cheeks';
    if (z === 'forehead') return 'forehead';
    if (z === 'chin') return 'chin';
  }
  return null;
}

export function useDailyHome(): DailyHomeModel {
  const skin = useSkinState();
  const scans = useAppStore((s) => s.scans);
  const { lifecycle, routine, dailyChecklist, completionDates } =
    useRoutineStore(
      useShallow((s) => ({
        lifecycle: s.lifecycle,
        routine: s.routine,
        dailyChecklist: s.dailyChecklist,
        completionDates: s.completionDates,
      })),
    );

  const routineActive =
    !!routine &&
    (lifecycle === 'active' ||
      lifecycle === 'session_in_progress' ||
      lifecycle === 'session_complete');

  const now = new Date();
  const timeOfDay = defaultTimeOfDayForNow(now);
  const doneIds = selectDailyDoneIds(dailyChecklist, timeOfDay, now);
  const score = computeSkinScore(Array.isArray(scans) ? scans : []);

  // Whole days since the newest scan (capturedAt is ISO). Defensive against
  // malformed dates: an unparseable timestamp simply contributes nothing.
  const daysSinceLastScan = (() => {
    let newest = Number.NEGATIVE_INFINITY;
    for (const s of Array.isArray(scans) ? scans : []) {
      const t = Date.parse(s.capturedAt);
      if (Number.isFinite(t) && t > newest) newest = t;
    }
    if (!Number.isFinite(newest)) return null;
    return Math.max(0, Math.floor((now.getTime() - newest) / 86_400_000));
  })();
  // The "your cheeks are calmer than your first scan" callback names a SPECIFIC
  // zone — so it may ONLY name a zone whose concern actually IMPROVED
  // (direction 'better'), never just the current top concern (which could have
  // worsened while the overall score rose elsewhere). No improved zone → null,
  // and the greeting falls back to the honest generic "your skin reads calmer".
  const improvedConcern = skin?.topConcerns?.find((c) => c.direction === 'better');
  const calmZone = zoneWord(
    improvedConcern?.regions as SemanticFaceZone[] | undefined,
  );

  return useMemo(
    () =>
      buildDailyHomeModel({
        routine,
        routineActive,
        doneIds,
        completionDates,
        now,
        timeOfDay,
        scanCount: score.scanCount,
        deltaSinceFirst: score.deltaSinceFirst,
        calmZone,
        daysSinceLastScan,
      }),
    // doneIds/completionDates compare by content; `now` re-derives on render,
    // which is fine — the model is pure and cheap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      routine,
      routineActive,
      doneIds.join(','),
      completionDates.length,
      timeOfDay,
      score.scanCount,
      score.deltaSinceFirst,
      calmZone,
      daysSinceLastScan,
    ],
  );
}

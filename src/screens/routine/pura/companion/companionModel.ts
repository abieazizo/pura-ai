/**
 * Companion model — the single derivation the companion surface reads.
 *
 * Given the canonical routine + the day's completion ids for one time of
 * day, this produces the ordered rows, which row owns the hero (the first
 * not-done step), what's upcoming, what's already done, and the
 * completion ratio that drives the vertical progress line. Every zone
 * reads from this one shape so nothing recomputes "which step is current"
 * inline.
 */

import {
  stepTypeToPillarKey,
  type CustomRoutine,
  type PillarKey,
  type RoutineStep,
  type RoutineTimeOfDay,
} from '@/types/routine';
import { PILLAR_IDENTITY } from '@/components/routine/pillarIdentity';

export interface CompanionRow {
  step: RoutineStep;
  pillar: PillarKey;
  label: string;
  /** Position in the full ordered list (0-based) → drives "STEP x OF y". */
  index: number;
  done: boolean;
}

export interface CompanionModel {
  rows: CompanionRow[];
  total: number;
  doneCount: number;
  /** 0..1 — fraction of steps completed for this time of day today. */
  completionRatio: number;
  /** The first not-done row, or null when empty / all complete. */
  heroRow: CompanionRow | null;
  /** Not-done rows after the hero, in order. */
  upcoming: CompanionRow[];
  /** Done rows, in list order. */
  completed: CompanionRow[];
  allComplete: boolean;
  isEmpty: boolean;
}

export function buildCompanionModel(args: {
  routine: CustomRoutine;
  timeOfDay: RoutineTimeOfDay;
  doneIds: string[];
}): CompanionModel {
  const { routine, timeOfDay, doneIds } = args;
  const steps =
    timeOfDay === 'morning' ? routine.morningSteps : routine.eveningSteps;
  const done = new Set(doneIds);

  const rows: CompanionRow[] = steps.map((step, index) => {
    const pillar = stepTypeToPillarKey(step.type);
    return {
      step,
      pillar,
      label: PILLAR_IDENTITY[pillar].label,
      index,
      done: done.has(step.id),
    };
  });

  const total = rows.length;
  const doneCount = rows.filter((r) => r.done).length;
  const notDone = rows.filter((r) => !r.done);
  const heroRow = notDone[0] ?? null;

  return {
    rows,
    total,
    doneCount,
    completionRatio: total === 0 ? 0 : doneCount / total,
    heroRow,
    upcoming: heroRow ? notDone.slice(1) : [],
    completed: rows.filter((r) => r.done),
    allComplete: total > 0 && doneCount === total,
    isEmpty: total === 0,
  };
}

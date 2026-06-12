/**
 * dailyHomeModel — the Home screen's single derived view-model.
 *
 * Data-contract-first (per CLAUDE.md + the no-patch-loops rule): the screen
 * NEVER reads raw routine/scan/store shapes. It reads THIS — a pure,
 * deterministic projection of the canonical inputs into the whole screen:
 * one greeting, one focus, one progress line, one seven-day strip.
 *
 * Pure: every time-dependent input (now, doneIds, completionDates) is passed
 * in, so the same inputs always render the same screen.
 */

import type {
  CustomRoutine,
  RoutineProduct,
  RoutineStep,
  RoutineTimeOfDay,
} from '@/types/routine';
import { todayDateKey } from '@/state/routine/routineStore';
import { doneLanding } from '@/screens/routine/yourRoutine/voice';
import { pickHomeGreeting, RESCAN_NUDGE, type CalmZoneWord } from './homeVoice';

// ---------------------------------------------------------------------------
// Contract — exactly what the screen renders.
// ---------------------------------------------------------------------------

/** The one thing to do next. */
export type DailyHomeFocus =
  | {
      kind: 'step';
      stepId: string;
      /** The step name — "Gentle cleanse". */
      title: string;
      /** Small spec line — the product to pick up. */
      spec: string;
      /** The real product (image resolves through the shop catalog). */
      product: RoutineProduct | null;
      timeOfDay: RoutineTimeOfDay;
    }
  | {
      /** No scan yet — the one next thing IS the first scan. */
      kind: 'first_scan';
      title: string;
      spec: string;
    }
  | {
      /** Scan done, routine not active yet — finish setting it up. */
      kind: 'routine_setup';
      title: string;
      spec: string;
    };

export interface StripDay {
  dateKey: string;
  done: boolean;
  isToday: boolean;
}

export interface DailyHomeModel {
  /** due → the focus card; done → the rest line. */
  state: 'due' | 'done';
  timeOfDay: RoutineTimeOfDay;
  /** Instrument-Serif greeting. Varies by day; callbacks only when true. */
  greeting: string;
  /** Present when state === 'due'. */
  focus: DailyHomeFocus | null;
  /** Present when state === 'done' — rest, not emptiness. */
  restLine: string | null;
  /** The one quiet progress line above the strip. */
  progressLine: string;
  /** Last 7 days, oldest → today. */
  strip: StripDay[];
  /**
   * False before a routine exists — the record (progress line, strip, Full
   * routine link) would reference something that isn't there yet, so Home
   * shows only the greeting and the one next thing.
   */
  showRecord: boolean;
  /** Orb warmth 0→1 — it literally warms as it gets to know the user. */
  familiarity: number;
  /**
   * The ~4-week rescan nudge (habit step 3), or null. Present ONLY when a
   * routine is active AND ≥ RESCAN_NUDGE_DAYS have passed since the last
   * scan — never at one week (too early manufactures disappointment), never
   * for a user who hasn't scanned, never as pressure: the line frames the
   * rescan as the payoff of the work, and misses don't change it.
   */
  rescanLine: string | null;
  /** Two real scans exist → the before/after ("Since Day 1") is reachable. */
  showSinceDayOne: boolean;
}

export interface BuildDailyHomeInput {
  routine: CustomRoutine | null;
  /** Lifecycle is active / session_* — the routine is real and started. */
  routineActive: boolean;
  /** Step ids checked off today for `timeOfDay`. */
  doneIds: string[];
  /** Ledger of YYYY-MM-DD days with ≥1 completion. */
  completionDates: string[];
  now: Date;
  timeOfDay: RoutineTimeOfDay;
  scanCount: number;
  /** Latest score minus first score; null with <2 scans. */
  deltaSinceFirst: number | null;
  /** Plain-word zone of the top concern, when one resolves. */
  calmZone: CalmZoneWord | null;
  /** Whole days since the most recent scan; null when there are no scans. */
  daysSinceLastScan: number | null;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

/** Real improvement vs the first scan — the honest bar for the callback. */
const CALMER_MIN_DELTA = 4;

/** ~4 weeks before the rescan nudge — a horizon skin change can actually
 *  clear. Nudging at one week manufactures disappointment (blueprint §4.13). */
const RESCAN_NUDGE_DAYS = 25;

/** Local day number — increments every local midnight, so greetings rotate. */
function daySeed(now: Date): number {
  return Math.floor(
    new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() /
      86_400_000,
  );
}

/** Steps the user can actually do today for this time of day. */
function actionableSteps(
  routine: CustomRoutine,
  timeOfDay: RoutineTimeOfDay,
): RoutineStep[] {
  const list =
    timeOfDay === 'morning' ? routine.morningSteps : routine.eveningSteps;
  return [...list]
    .filter(
      (s) => s.availability !== 'skipped' && s.availability !== 'not_required',
    )
    .sort((a, b) => a.order - b.order);
}

function stepSpec(step: RoutineStep): string {
  if (step.product) return `${step.product.brand} ${step.product.name}`;
  return step.frequency;
}

const PERIOD_WORD: Record<RoutineTimeOfDay, string> = {
  morning: 'This morning',
  evening: 'Tonight',
};

export function buildDailyHomeModel(input: BuildDailyHomeInput): DailyHomeModel {
  const {
    routine,
    routineActive,
    doneIds,
    completionDates,
    now,
    timeOfDay,
    scanCount,
    deltaSinceFirst,
    calmZone,
    daysSinceLastScan,
  } = input;

  const seed = daySeed(now);
  const calmer =
    scanCount >= 2 &&
    deltaSinceFirst !== null &&
    deltaSinceFirst >= CALMER_MIN_DELTA;

  const greeting = pickHomeGreeting({
    seed,
    timeOfDay,
    hour: now.getHours(),
    calmerSinceFirstScan: calmer,
    calmZone,
    scanCount,
  });

  // The orb's warmth grows with how well it knows this user's skin.
  const familiarity = Math.min(1, scanCount / 3);

  // The ~4-week rescan nudge. NOT at one week — skin doesn't change that
  // fast, and an early rescan manufactures disappointment. The nudge needs a
  // real history (≥1 scan) and an active routine ("keep this up" must refer
  // to something true). Misses never accelerate or change it — it is an
  // invitation to see the payoff, not a chore reminder.
  const rescanLine =
    routineActive &&
    scanCount >= 1 &&
    daysSinceLastScan !== null &&
    daysSinceLastScan >= RESCAN_NUDGE_DAYS
      ? RESCAN_NUDGE
      : null;

  // Seven-day strip, oldest → today, from the persistent completion ledger.
  const done = new Set(completionDates);
  const strip: StripDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = todayDateKey(d);
    strip.push({ dateKey: key, done: done.has(key), isToday: i === 0 });
  }

  // ---- No active routine yet → the one next thing is scan / setup --------
  if (!routineActive || !routine) {
    const focus: DailyHomeFocus =
      scanCount === 0
        ? {
            kind: 'first_scan',
            title: 'Your first scan',
            spec: '30 seconds, in good light.',
          }
        : {
            kind: 'routine_setup',
            title: 'Finish your routine',
            spec: 'A few picks left to confirm.',
          };
    return {
      state: 'due',
      timeOfDay,
      greeting,
      focus,
      restLine: null,
      progressLine: '',
      strip,
      showRecord: false,
      familiarity,
      // No routine yet → "keep this up" would reference nothing. Never shown.
      rescanLine: null,
      showSinceDayOne: scanCount >= 2,
    };
  }

  // ---- Active routine: next undone step, or rest -------------------------
  const steps = actionableSteps(routine, timeOfDay);
  const doneSet = new Set(doneIds);
  const doneCount = steps.filter((s) => doneSet.has(s.id)).length;
  const next = steps.find((s) => !doneSet.has(s.id)) ?? null;
  const period = PERIOD_WORD[timeOfDay];

  if (!next || steps.length === 0) {
    return {
      state: 'done',
      timeOfDay,
      greeting,
      focus: null,
      restLine: doneLanding({ timeOfDay, seed }),
      progressLine: `${period} · all done`,
      strip,
      showRecord: true,
      familiarity,
      rescanLine,
      showSinceDayOne: scanCount >= 2,
    };
  }

  return {
    state: 'due',
    timeOfDay,
    greeting,
    focus: {
      kind: 'step',
      stepId: next.id,
      title: next.title,
      spec: stepSpec(next),
      product: next.product ?? null,
      timeOfDay,
    },
    restLine: null,
    progressLine:
      doneCount > 0
        ? `${period} · ${doneCount} of ${steps.length} done`
        : `${period} · ${steps.length} small ${steps.length === 1 ? 'step' : 'steps'}`,
    strip,
    showRecord: true,
    familiarity,
    rescanLine,
    showSinceDayOne: scanCount >= 2,
  };
}

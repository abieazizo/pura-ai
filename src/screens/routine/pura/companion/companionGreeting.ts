/**
 * Streak-aware greeting (Zone 2). Pure, deterministic copy — NO AI. A
 * single line of Instrument Serif that reads the day's progress and the
 * consecutive-day streak, then says one warm, coach-voiced thing.
 *
 * Priority, highest first:
 *   1. Everything done   → celebrate, naming the streak day once it's ≥2.
 *   2. Partway through   → one clear next nudge.
 *   3. Not started, but
 *      a streak is alive → protect the streak.
 *   4. Fresh start       → time-of-day welcome.
 */

import type { RoutineTimeOfDay } from '@/types/routine';

export interface GreetingInput {
  timeOfDay: RoutineTimeOfDay;
  doneCount: number;
  total: number;
  allComplete: boolean;
  /** Consecutive-day streak from `selectCompletionStreak`. */
  streakCount: number;
  /** Whether today is already counted in that streak. */
  streakIncludesToday: boolean;
}

export function buildCompanionGreeting({
  timeOfDay,
  doneCount,
  total,
  allComplete,
  streakCount,
  streakIncludesToday,
}: GreetingInput): string {
  const morning = timeOfDay === 'morning';

  // 1 — Everything done for this time of day.
  if (allComplete) {
    if (streakIncludesToday && streakCount >= 2) {
      return morning
        ? `Day ${streakCount}. A strong start.`
        : `Day ${streakCount} done. Rest easy.`;
    }
    return morning ? 'Morning routine, done.' : "That's tonight, locked in.";
  }

  // 2 — Partway through. Keep it to one clear next nudge.
  if (doneCount > 0) {
    const remaining = total - doneCount;
    if (remaining === 1) return 'One more to go.';
    return morning ? 'Keep the morning going.' : 'Keep the evening going.';
  }

  // 3 — Nothing yet today, but a prior-day streak is still alive.
  if (!streakIncludesToday && streakCount >= 2) {
    return `${streakCount} days strong — keep it alive.`;
  }
  if (!streakIncludesToday && streakCount === 1) {
    return morning
      ? 'You started yesterday. Keep it going.'
      : 'You started yesterday. Two in a row?';
  }

  // 4 — Fresh start, no streak to protect.
  return morning ? 'Good morning. Let’s begin.' : 'Good evening. Let’s wind down.';
}

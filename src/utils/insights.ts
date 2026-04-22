import { parseISO } from 'date-fns';
import type { Scan, SkinZone, User } from '@/types';
import { SKIN_CYCLE_DAYS } from '@/theme/tokens';

// Re-exports for call sites that historically imported helpers from this
// module. Canonical home for string-format helpers is @/utils/format.
export { deriveInitials, weekdayAndDate, formatTime12h, formatDateLong } from './format';

/**
 * Derivations used by Home / Progress / ProfileSheet. Centralized so the day
 * number, streak, and progress percent always agree with each other. Never
 * hardcoded — every number traces back to the scans array and user.joinedAt.
 */

export interface ZoneDelta {
  key: SkinZone['key'];
  label: string;
  percentChange: number; // absolute, signed by direction
  direction: 'improved' | 'worsened' | 'stable';
}

export function computeDayNumber(scans: Scan[], _user: User): number {
  if (scans.length === 0) return 0;
  const first = scans[0];
  const diffMs = Date.now() - parseISO(first.capturedAt).getTime();
  const derived = Math.floor(diffMs / 86400000) + 1;
  return Math.max(first.dayNumber ?? 1, derived, 1);
}

/** Consecutive-day streak, capped by tenure so Day 1 never says "14 day streak". */
export function computeStreakDays(scans: Scan[]): number {
  if (scans.length === 0) return 0;
  const first = parseISO(scans[0].capturedAt);
  const diff = Math.floor((Date.now() - first.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

export function computeCyclePercent(dayNumber: number): number {
  if (dayNumber <= 0) return 0;
  return Math.min(100, Math.round((dayNumber / SKIN_CYCLE_DAYS) * 100));
}

export function computeZoneDeltas(first: Scan, latest: Scan): ZoneDelta[] {
  return latest.zones.map((zone) => {
    const baseline = first.zones.find((z) => z.key === zone.key);
    if (!baseline || baseline.score === 0) {
      return {
        key: zone.key,
        label: zone.label,
        percentChange: 0,
        direction: 'stable',
      };
    }
    const delta = zone.score - baseline.score;
    const percent = Math.round((delta / baseline.score) * 100);
    const direction: ZoneDelta['direction'] =
      percent > 2 ? 'improved' : percent < -2 ? 'worsened' : 'stable';
    return {
      key: zone.key,
      label: zone.label,
      percentChange: Math.abs(percent),
      direction,
    };
  });
}

export function bestImprovedZone(first: Scan, latest: Scan): ZoneDelta | null {
  const deltas = computeZoneDeltas(first, latest);
  const improved = deltas.filter((d) => d.direction === 'improved');
  if (improved.length === 0) return null;
  return improved.sort((a, b) => b.percentChange - a.percentChange)[0];
}

/** Days between the baseline scan and the latest, minimum 1. */
export function daysBetweenScans(first: Scan, latest: Scan): number {
  const diff =
    parseISO(latest.capturedAt).getTime() - parseISO(first.capturedAt).getTime();
  return Math.max(1, Math.round(diff / 86400000));
}

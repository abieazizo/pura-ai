/**
 * Pure selector — derive the redesigned Home screen's night-state
 * (v26) from the persisted scan history. No store imports; the caller
 * passes scans + the current timestamp so the selector stays trivially
 * testable and deterministic.
 *
 * Trust contract:
 *   - Pre-scan variants describe HISTORY only, never tonight.
 *   - Fresh variants come from a scan captured within the last 4h.
 *   - Edit classification is appearance-based and reads concern
 *     severity + region; it never claims diagnosis.
 */

import type { Scan, Concern } from '@/types';
import type {
  HomeNightState,
  PreviousEditKind,
  PreviousEditMemory,
} from '@/types/homeNight';

/** A scan is treated as "tonight's" if it was captured within this window. */
const FRESH_TONIGHT_WINDOW_MS = 4 * 60 * 60 * 1000;

/** Standard 24h floor for converting elapsed ms to "nights". */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Image-quality gate. A scan whose underlying analysis flagged the
 * image as unusable, or whose confidence falls below this floor, is
 * not trusted to drive a "fresh" home state. This is the trust
 * contract: if Pura can't see well, it does not claim to know
 * tonight's skin. The home falls through to STALE and the user is
 * invited to take a clearer look.
 */
const FRESH_IMAGE_QUALITY_FLOOR = 0.5;

function scanHasUsableQuality(scan: Scan): boolean {
  const q = scan.aiAnalysis?.image_quality;
  if (!q) return true; // deterministic scans don't carry quality — trust them
  if (q.usable === false) return false;
  if (typeof q.confidence === 'number' && q.confidence < FRESH_IMAGE_QUALITY_FLOOR) {
    return false;
  }
  return true;
}

/**
 * Severity that crosses the "tonight, do less" threshold. The home
 * screen only flips to recovery-night when the user's skin shows
 * visible sensitivity, not for every mild observation.
 */
function isRecoveryWorthy(c: Concern): boolean {
  if (c.severity !== 'moderate' && c.severity !== 'needs-attention') return false;
  // Recovery-worthy concerns are the ones we'd actually want to pause
  // active treatment over: breakouts (often inflamed), texture or tone
  // changes that are flaring. Hydration alone is handled separately.
  return (
    c.category === 'breakouts' ||
    c.category === 'texture' ||
    c.category === 'tone'
  );
}

function isHydrationEdit(c: Concern): boolean {
  if (c.category !== 'hydration') return false;
  return c.severity === 'mild' || c.severity === 'moderate';
}

/** Choose the highest-ranked concern (lowest rank number) from the list. */
function topConcern(concerns: readonly Concern[] | undefined): Concern | null {
  if (!concerns || concerns.length === 0) return null;
  const nonCalm = concerns.filter((c) => c.severity !== 'calm');
  if (nonCalm.length === 0) return null;
  return [...nonCalm].sort((a, b) => a.rank - b.rank)[0];
}

function classifyEdit(scan: Scan | undefined): PreviousEditKind {
  if (!scan) return 'unknown';
  const top = topConcern(scan.concerns);
  if (!top) return 'stable';
  if (isRecoveryWorthy(top)) return 'recovery';
  if (isHydrationEdit(top)) return 'hydration';
  return 'stable';
}

/**
 * Plain-English step name Pura would pause given the concern. Mapped
 * conservatively — we only name a step we genuinely deprioritize on a
 * recovery night.
 */
function pausedStepNameFor(concern: Concern | null): string | null {
  if (!concern) return null;
  if (concern.category === 'breakouts') return 'Retinoid serum';
  if (concern.category === 'texture') return 'Exfoliant';
  if (concern.category === 'tone') return 'Active brightener';
  return null;
}

function previousEditMemory(scan: Scan | undefined): PreviousEditMemory {
  const top = topConcern(scan?.concerns);
  return {
    kind: classifyEdit(scan),
    region: top?.region ?? null,
    pausedStepName: pausedStepNameFor(top),
  };
}

function nightsBetween(nowMs: number, capturedAtIso: string): number {
  const capturedMs = new Date(capturedAtIso).getTime();
  const diff = Math.max(0, nowMs - capturedMs);
  return Math.max(1, Math.floor(diff / MS_PER_DAY));
}

export interface SelectHomeNightStateArgs {
  scans: readonly Scan[];
  now: number;
  /**
   * v26 — tonight-completion timestamp (ISO). When the calendar date
   * of this stamp matches the calendar date of `now`, the home enters
   * its quiet closing state ("That is enough for tonight.") — this
   * overrides every other variant, because once the user has closed
   * tonight nothing else should be asking them to do more.
   */
  tonightCompleteAt?: string | null;
}

/**
 * True when an ISO timestamp falls on the same calendar day as `now`
 * (local time). Used to detect whether tonight's completion is still
 * applicable. A stamp from a previous day is treated as cleared.
 */
function isSameLocalDay(iso: string, nowMs: number): boolean {
  const a = new Date(iso);
  const b = new Date(nowMs);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function selectHomeNightState(
  args: SelectHomeNightStateArgs
): HomeNightState {
  const { scans, now, tonightCompleteAt } = args;

  // Completion is the highest-priority variant — once the user has
  // closed tonight, every other prompt is wrong.
  if (tonightCompleteAt && isSameLocalDay(tonightCompleteAt, now)) {
    return { kind: 'tonight_complete', completedAt: tonightCompleteAt };
  }

  if (scans.length === 0) {
    return { kind: 'no_baseline' };
  }
  const latest = scans[scans.length - 1];
  const ageMs = now - new Date(latest.capturedAt).getTime();
  const isFreshTonight =
    ageMs >= 0 &&
    ageMs < FRESH_TONIGHT_WINDOW_MS &&
    scanHasUsableQuality(latest);

  if (isFreshTonight) {
    const top = topConcern(latest.concerns);
    if (top && isRecoveryWorthy(top)) {
      return {
        kind: 'fresh_recovery_night',
        scanId: latest.id,
        region: top.region,
        pausedStepName: pausedStepNameFor(top) ?? 'Active serum',
      };
    }
    if (top && isHydrationEdit(top)) {
      return {
        kind: 'fresh_hydration_edit',
        scanId: latest.id,
        region: top.region,
      };
    }
    return { kind: 'fresh_stable_night', scanId: latest.id };
  }

  const nightsSinceLastScan = nightsBetween(now, latest.capturedAt);
  // v26.2 — TRUST CONTRACT: if Pura can't trust the latest scan's
  // image (unusable / low confidence), it must NOT claim a previous
  // edit was made. Falling back to {kind:'unknown'} keeps the home
  // honest — "we don't know what you did last night" instead of
  // "you did recovery last night" — and prevents the
  // `next_night_after_recovery` branch from firing on phantom data.
  const previousEdit: PreviousEditMemory = scanHasUsableQuality(latest)
    ? previousEditMemory(latest)
    : { kind: 'unknown', region: null, pausedStepName: null };
  if (previousEdit.kind === 'recovery' && nightsSinceLastScan === 1) {
    return {
      kind: 'next_night_after_recovery',
      nightsSinceLastScan,
      previousEdit,
    };
  }
  return {
    kind: 'stale_pre_scan',
    nightsSinceLastScan,
    previousEdit,
  };
}

// ---------------------------------------------------------------------------
// Copy helpers — kept beside the selector so the language stays consistent
// with the truth contract. These return strings the UI renders directly.
// ---------------------------------------------------------------------------

export function nightsPhrase(nights: number): string {
  if (nights <= 1) return 'last night';
  if (nights === 2) return 'two nights ago';
  if (nights === 3) return 'three nights ago';
  if (nights === 4) return 'four nights ago';
  if (nights === 5) return 'five nights ago';
  if (nights === 6) return 'six nights ago';
  if (nights === 7) return 'a week ago';
  return `${nights} nights ago`;
}

const MONTH_SHORT = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

export function formatTonightMeta(now: Date): string {
  const month = MONTH_SHORT[now.getMonth()];
  return `TONIGHT · ${month} ${now.getDate()}`;
}

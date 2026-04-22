/**
 * Skin Score — the app's central product object.
 *
 * Single source of truth for the score number, its deltas, the tier it
 * lives in, and the one-line human headline Home / Progress / Plan all
 * surface. Every screen that talks about "how you're doing" reads from
 * `computeSkinScore(scans)` so the language is consistent everywhere.
 *
 * The shape is deliberately small. Consumers render the fields they need;
 * no screen does its own score-language synthesis.
 */

import type { Scan } from '@/types';

export type SkinScoreTier = 'strong' | 'good' | 'fair' | 'needs-work';

export interface SkinScore {
  /** 0..100 integer. Mirrors `scan.overallScore` on the latest scan. */
  value: number;
  /** Difference vs. the prior scan; null when this is the only scan. */
  deltaSinceLast: number | null;
  /** Difference vs. the very first scan; null when this is the only scan. */
  deltaSinceFirst: number | null;
  /** Label used by the tier chip and in micro-copy. */
  tier: SkinScoreTier;
  /** One short sentence. Concrete, not "gaining ground". */
  headline: string;
  /** Number of scans informing this score (for the "since N days" copy). */
  scanCount: number;
  /** ISO dates used for "since" phrasing. */
  latestAt: string | null;
  firstAt: string | null;
}

const EMPTY: SkinScore = {
  value: 0,
  deltaSinceLast: null,
  deltaSinceFirst: null,
  tier: 'fair',
  headline: 'Take your first scan to see your Skin Score.',
  scanCount: 0,
  latestAt: null,
  firstAt: null,
};

export function computeSkinScore(scans: Scan[]): SkinScore {
  if (scans.length === 0) return EMPTY;

  const latest = scans[scans.length - 1];
  const previous = scans.length >= 2 ? scans[scans.length - 2] : null;
  const first = scans[0];

  const value = Math.max(0, Math.min(100, Math.round(latest.overallScore)));
  const deltaSinceLast = previous ? value - previous.overallScore : null;
  const deltaSinceFirst =
    first && first.id !== latest.id ? value - first.overallScore : null;
  const tier = tierFor(value);
  const headline = buildHeadline(value, deltaSinceLast, tier);

  return {
    value,
    deltaSinceLast,
    deltaSinceFirst,
    tier,
    headline,
    scanCount: scans.length,
    latestAt: latest.capturedAt,
    firstAt: first.capturedAt,
  };
}

export function tierLabel(t: SkinScoreTier): string {
  switch (t) {
    case 'strong':
      return 'Strong';
    case 'good':
      return 'Good';
    case 'fair':
      return 'Fair';
    case 'needs-work':
      return 'Needs work';
  }
}

export function tierFor(value: number): SkinScoreTier {
  if (value >= 85) return 'strong';
  if (value >= 70) return 'good';
  if (value >= 55) return 'fair';
  return 'needs-work';
}

/**
 * Concrete headline. Replaces vague phrases like "gaining ground +6" with
 * language grounded in both the tier AND the direction since last scan.
 *
 * Grid (tier × delta):
 *
 *                 up>=3           up (1-2)       flat (0)            down
 *   strong    "Strongest yet."   "Steady and    "Strong and         "Down a touch, still
 *                                  rising."       stable."            in strong range."
 *   good      "Measurable        "Small lift    "Holding steady     "Slight dip since
 *              improvement."     since last."    in the good range." last scan."
 *   fair      "Turning the       "Small lift."   "Fair and flat."    "Stepped back a bit."
 *              corner."
 *   needs-    "Starting to        "First signs   "Still in rough    "Lower than last
 *    work       recover."         of progress."   water."            scan."
 */
function buildHeadline(
  value: number,
  delta: number | null,
  tier: SkinScoreTier
): string {
  // First scan — no delta context yet.
  if (delta === null) {
    switch (tier) {
      case 'strong':
        return 'Strong starting point.';
      case 'good':
        return 'Solid starting point.';
      case 'fair':
        return 'Plenty of room to improve.';
      case 'needs-work':
        return 'Starting where we are. It only goes up from here.';
    }
  }

  const dir: 'upBig' | 'up' | 'flat' | 'down' =
    delta >= 3 ? 'upBig' : delta >= 1 ? 'up' : delta <= -1 ? 'down' : 'flat';

  if (tier === 'strong') {
    if (dir === 'upBig') return 'Strongest Skin Score yet.';
    if (dir === 'up') return 'Strong and rising.';
    if (dir === 'flat') return 'Strong and holding.';
    return 'Down a touch. Still in strong range.';
  }
  if (tier === 'good') {
    if (dir === 'upBig') return 'Measurable improvement.';
    if (dir === 'up') return 'A small lift since last scan.';
    if (dir === 'flat') return 'Holding steady in the good range.';
    return 'Slight dip since last scan.';
  }
  if (tier === 'fair') {
    if (dir === 'upBig') return 'Turning a corner.';
    if (dir === 'up') return 'Small lift since last scan.';
    if (dir === 'flat') return 'Unchanged since last scan.';
    return 'Stepped back a bit.';
  }
  // needs-work
  if (dir === 'upBig') return 'Starting to recover.';
  if (dir === 'up') return 'First signs of progress.';
  if (dir === 'flat') return 'Rough stretch — still early.';
  return 'Lower than your last scan.';
}

/**
 * Format the delta number for inline use: "+6", "-3", "0". `null` → empty
 * string so callers can conditionally render.
 */
export function formatDelta(delta: number | null): string {
  if (delta === null) return '';
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '0';
}

/**
 * Human "since when" phrasing. "since your first scan" when this is the
 * day-1 → today delta; "since last scan" / "since last week" based on gap.
 */
export function sinceLastPhrase(latestAt: string | null, scanCount: number): string {
  if (!latestAt || scanCount < 2) return '';
  const diffMs = Date.now() - new Date(latestAt).getTime();
  const days = Math.max(0, Math.floor(diffMs / 86400000));
  if (days === 0) return 'since last scan';
  if (days === 1) return 'since yesterday';
  if (days < 7) return `since ${days} days ago`;
  if (days < 14) return 'since last week';
  return `since ${Math.floor(days / 7)} weeks ago`;
}

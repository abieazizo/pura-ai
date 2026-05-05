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
        return 'Clear room to improve.';
      case 'needs-work':
        return 'Starting point set. We build from here.';
    }
  }

  const dir: 'upBig' | 'up' | 'flat' | 'down' =
    delta >= 3 ? 'upBig' : delta >= 1 ? 'up' : delta <= -1 ? 'down' : 'flat';

  // v9.5 copy pass — more concrete, less "gaining ground" vagueness.
  if (tier === 'strong') {
    if (dir === 'upBig') return 'Highest Skin Score yet.';
    if (dir === 'up') return 'Up from last scan. Still strong.';
    if (dir === 'flat') return 'Strong and unchanged.';
    return 'Down from last scan. Still strong.';
  }
  if (tier === 'good') {
    if (dir === 'upBig') return 'Biggest move since last week.';
    if (dir === 'up') return 'Up from last scan.';
    if (dir === 'flat') return 'Unchanged since last scan.';
    return 'Down from last scan.';
  }
  if (tier === 'fair') {
    if (dir === 'upBig') return 'Clear improvement since last scan.';
    if (dir === 'up') return 'Up from last scan.';
    if (dir === 'flat') return 'Unchanged since last scan.';
    return 'Lost ground since last scan.';
  }
  // needs-work
  if (dir === 'upBig') return 'First real move up.';
  if (dir === 'up') return 'Up from last scan.';
  if (dir === 'flat') return 'No change since last scan.';
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
 * v19.0 — premium delta copy.
 *
 * Replaces awkward "0 since last" with calm, human language:
 *   • null            → "First scan"
 *   • 0 or |Δ| ≤ 1    → "Unchanged since last scan"
 *   • +N (N ≥ 2)      → "+N since last scan"
 *   • -N (N ≥ 2)      → "-N since last scan"
 *
 * The ±1 deadband is intentional: scan-to-scan score noise of 1 point
 * should NOT read as a meaningful change to the user.
 */
export function deltaPhrase(delta: number | null): string {
  if (delta === null) return 'First scan';
  if (Math.abs(delta) <= 1) return 'Unchanged since last scan';
  if (delta > 0) return `+${delta} since last scan`;
  return `${delta} since last scan`;
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

/**
 * v10.13 — Skin Score "why" line. Turns the number + delta into
 * something the user can make sense of by naming which concerns moved.
 *
 * v10.22 — when the latest scan carries `aiAnalysis`, the AI's
 * `skin_score.why_line` is preferred verbatim. Every UI surface that
 * already calls this helper (Home, ScanResult, Routine>Progress,
 * SkinScoreHero) transparently inherits the AI voice — no rewiring at
 * the call site. The deterministic fallback below is the documented
 * fallback the brief allows, used only when no AI analysis attached.
 *
 * Examples (deterministic fallback):
 *   "Breakouts calming. Hydration still needs work."
 *   "All four areas trending well."
 *   "Hydration improving. Dark marks holding."
 *   "Your first reading — we'll have movement by scan two."
 */
export function buildSkinScoreWhy(scans: Scan[]): string {
  if (scans.length === 0) {
    return 'Your reading will appear here after your first scan.';
  }
  const latest = scans[scans.length - 1];

  // v10.22 — prefer the AI's structured why-line when present.
  if (latest.aiAnalysis?.skin_score.why_line) {
    return latest.aiAnalysis.skin_score.why_line;
  }

  if (scans.length === 1) {
    return 'First reading set. Movement shows up at scan two.';
  }

  const previous = scans[scans.length - 2];

  type Direction = 'improved' | 'declined' | 'flat';
  const movements: { category: string; direction: Direction }[] = [];

  // Compare zone severities when available; fallback to overallScore tiers.
  if (latest.zones && previous.zones) {
    const prevMap = new Map(previous.zones.map((z) => [z.label, z.status]));
    for (const z of latest.zones) {
      const prevStatus = prevMap.get(z.label);
      if (!prevStatus) continue;
      const prevRank = statusRank(prevStatus);
      const currRank = statusRank(z.status);
      if (currRank < prevRank) movements.push({ category: z.label.toLowerCase(), direction: 'improved' });
      else if (currRank > prevRank) movements.push({ category: z.label.toLowerCase(), direction: 'declined' });
      else movements.push({ category: z.label.toLowerCase(), direction: 'flat' });
    }
  }

  const improved = movements.filter((m) => m.direction === 'improved');
  const declined = movements.filter((m) => m.direction === 'declined');

  if (improved.length === 0 && declined.length === 0) {
    return 'Holding steady across every category.';
  }
  if (improved.length > 0 && declined.length === 0) {
    if (improved.length >= 3) return 'Most areas trending well.';
    if (improved.length === 1) return `${capitalize(improved[0].category)} calming.`;
    return `${capitalize(improved[0].category)} and ${improved[1].category} trending well.`;
  }
  if (declined.length > 0 && improved.length === 0) {
    if (declined.length === 1) return `${capitalize(declined[0].category)} needs a closer look.`;
    return `${capitalize(declined[0].category)} and ${declined[1].category} need attention.`;
  }
  // Mixed — name one of each.
  const up = improved[0];
  const down = declined[0];
  return `${capitalize(up.category)} calming. ${capitalize(down.category)} still needs work.`;
}

function statusRank(status: string): number {
  switch (status) {
    case 'calm':
      return 0;
    case 'monitor':
      return 1;
    case 'active':
      return 2;
    default:
      return 1;
  }
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * rescanCompare/model — the REAL before/after (habit step 4), as a pure model.
 *
 * Honesty contract:
 *   • Change is surfaced at a resolution a phone camera + the analyzer can
 *     actually detect: per-metric `score_factors` (0–100, higher = better)
 *     compared at the codebase's ESTABLISHED ±3 bar (progressRoutineInsight's
 *     'Improved' / 'Needs support' convention) — never invented thresholds,
 *     never percent strings at the user.
 *   • LEAD WITH WINS: improvements order first, steady second, "watch" last.
 *   • No visible change is still a TRUE, motivating message (the exact spec
 *     line) — never a blank, never a manufactured result.
 *   • A metric that reads worse is weather, not failure: noted gently, the
 *     routine doesn't change, no guilt vocabulary anywhere.
 *   • The reorder hint is EARNED: it exists only when wins exist (results,
 *     not urgency), and it is one quiet line.
 *
 * Inputs are the persisted Scan fields (capturedAt, photoUri, overallScore,
 * aiAnalysis.score_factors) — the model never reads stores or raw AI text.
 */

// ── Inputs ─────────────────────────────────────────────────────────────────

/** The slice of a persisted Scan the comparison needs. */
export interface RescanScanInput {
  capturedAt: string;
  /** May be a dead blob: URI on web after a reload — the screen renders
   *  defensively; the model only passes it through. */
  photoUri: string | null;
  overallScore: number | null;
  /** aiAnalysis.score_factors (0–100, higher = better), when the scan has it. */
  factors: Partial<Record<FactorKey, number>> | null;
}

export type FactorKey =
  | 'redness'
  | 'breakouts'
  | 'hydration'
  | 'texture'
  | 'dark_marks'
  | 'oiliness';

export interface RescanCompareInput {
  first: RescanScanInput;
  latest: RescanScanInput;
}

// ── Output ─────────────────────────────────────────────────────────────────

export type ChangeKind = 'win' | 'steady' | 'watch';

export interface FactorChange {
  key: FactorKey | 'overall';
  /** Plain word for the row, e.g. "Redness", "Moisture". */
  label: string;
  kind: ChangeKind;
  /** The full sentence for the row — linted plain language. */
  line: string;
}

export interface RescanCompareModel {
  canCompare: boolean;
  reason: 'none' | 'one_scan' | null;
  /** Whole days between the two scans. */
  daysBetween: number;
  /** "Day 1" / "Today" pair for the side-by-side. */
  photos: { day1: string | null; today: string | null };
  /** Serif headline — leads with the win when there is one. */
  headline: string;
  /** Wins first, steady second, watch last. Never empty when canCompare. */
  changes: FactorChange[];
  winCount: number;
  /** The closing thought under the rows. */
  closingLine: string;
  /** Earned-only quiet restock line (null unless winCount > 0). */
  reorderHint: string | null;
}

// ── The established honest bars (cited, not invented) ──────────────────────

/** ±3 on a 0–100 factor — progressRoutineInsight's Improved/Needs-support bar. */
const FACTOR_BAR = 3;
/** Overall-score fallback: ≥3 is skinScore's "upBig"; ±1 is its noise deadband. */
const OVERALL_WIN = 3;
const OVERALL_DEADBAND = 1;

// ── Voice (linted: plain words, no jargon, no guilt, no digits-at-the-user) ─

const LABEL: Record<FactorKey, string> = {
  redness: 'Redness',
  breakouts: 'Breakouts',
  hydration: 'Moisture',
  texture: 'Texture',
  dark_marks: 'Dark marks',
  oiliness: 'Shine',
};

function winLine(key: FactorKey): string {
  switch (key) {
    case 'redness':
      return 'Your redness reads calmer than Day 1.';
    case 'breakouts':
      return 'Breakouts have settled since Day 1.';
    case 'hydration':
      return 'Your skin is holding more moisture than Day 1.';
    case 'texture':
      return 'Texture reads smoother than Day 1.';
    case 'dark_marks':
      return 'Dark marks have faded a little since Day 1.';
    case 'oiliness':
      return 'Shine is more settled than Day 1.';
  }
}

/** The exact spec line, metric-templated. Steady is WORKING, not failing. */
function steadyLine(key: FactorKey): string {
  const word = LABEL[key].toLowerCase();
  return key === 'redness'
    ? 'Your redness is holding steady — consistency is working, keep going.'
    : `Your ${word} is holding steady — consistency is working, keep going.`;
}

/** Worse today is weather, not a verdict. The routine doesn't change. */
function watchLine(key: FactorKey): string {
  const word = LABEL[key].toLowerCase();
  return `${LABEL[key]} is a touch more visible today — ${word === 'moisture' ? 'skin' : 'it'} varies day to day. The routine doesn’t change.`;
}

const HEADLINE_WINS = 'Look what changed.';
const HEADLINE_STEADY = 'Holding steady is working.';
const CLOSING_WINS = 'Small steps, visible. This is the direction.';
const CLOSING_STEADY =
  'Skin moves slowly — steady weeks like this are exactly how it moves.';
const REORDER_HINT = 'Running low on a step? Restock when you’re ready.';

/** Every static line, for the lint sweep + verifier. */
export function allRescanVoiceLines(): { label: string; text: string }[] {
  const keys = Object.keys(LABEL) as FactorKey[];
  return [
    ...keys.map((k) => ({ label: `rescan.win.${k}`, text: winLine(k) })),
    ...keys.map((k) => ({ label: `rescan.steady.${k}`, text: steadyLine(k) })),
    ...keys.map((k) => ({ label: `rescan.watch.${k}`, text: watchLine(k) })),
    { label: 'rescan.headline.wins', text: HEADLINE_WINS },
    { label: 'rescan.headline.steady', text: HEADLINE_STEADY },
    { label: 'rescan.closing.wins', text: CLOSING_WINS },
    { label: 'rescan.closing.steady', text: CLOSING_STEADY },
    { label: 'rescan.reorder', text: REORDER_HINT },
  ];
}

// ── Build ──────────────────────────────────────────────────────────────────

const FACTOR_ORDER: FactorKey[] = [
  'redness',
  'breakouts',
  'hydration',
  'texture',
  'dark_marks',
  'oiliness',
];

export function buildRescanCompare(
  input: Partial<RescanCompareInput>,
): RescanCompareModel {
  const empty: RescanCompareModel = {
    canCompare: false,
    reason: 'none',
    daysBetween: 0,
    photos: { day1: null, today: null },
    headline: '',
    changes: [],
    winCount: 0,
    closingLine: '',
    reorderHint: null,
  };
  if (!input.first && !input.latest) return empty;
  if (!input.first || !input.latest) return { ...empty, reason: 'one_scan' };

  const { first, latest } = input;
  const t0 = Date.parse(first.capturedAt);
  const t1 = Date.parse(latest.capturedAt);
  const daysBetween =
    Number.isFinite(t0) && Number.isFinite(t1)
      ? Math.max(0, Math.floor((t1 - t0) / 86_400_000))
      : 0;

  const changes: FactorChange[] = [];

  // Per-metric where BOTH scans carry the factor — the honest, located basis.
  for (const key of FACTOR_ORDER) {
    const from = first.factors?.[key];
    const to = latest.factors?.[key];
    if (typeof from !== 'number' || typeof to !== 'number') continue;
    const delta = to - from;
    const kind: ChangeKind =
      delta >= FACTOR_BAR ? 'win' : delta <= -FACTOR_BAR ? 'watch' : 'steady';
    changes.push({
      key,
      label: LABEL[key],
      kind,
      line: kind === 'win' ? winLine(key) : kind === 'watch' ? watchLine(key) : steadyLine(key),
    });
  }

  // Fallback when factors are missing on either side: the overall score at
  // skinScore's bars — one honest row instead of silence.
  if (changes.length === 0) {
    const from = first.overallScore;
    const to = latest.overallScore;
    if (typeof from === 'number' && typeof to === 'number') {
      const delta = to - from;
      const kind: ChangeKind =
        delta >= OVERALL_WIN ? 'win' : delta < -OVERALL_DEADBAND ? 'watch' : 'steady';
      changes.push({
        key: 'overall',
        label: 'Overall',
        kind,
        line:
          kind === 'win'
            ? 'Your skin reads better overall than Day 1.'
            : kind === 'watch'
              ? 'Today reads a touch lower overall — days vary. The routine doesn’t change.'
              : 'Overall, your skin is holding steady — consistency is working, keep going.',
      });
    }
  }

  if (changes.length === 0) {
    // Two scans but no comparable numbers at all — still never a blank.
    changes.push({
      key: 'overall',
      label: 'Overall',
      kind: 'steady',
      line: 'Two scans in — from here on I can start tracking real change.',
    });
  }

  // LEAD WITH WINS: wins → steady → watch, stable within groups.
  const rank: Record<ChangeKind, number> = { win: 0, steady: 1, watch: 2 };
  changes.sort((a, b) => rank[a.kind] - rank[b.kind]);

  const winCount = changes.filter((c) => c.kind === 'win').length;

  return {
    canCompare: true,
    reason: null,
    daysBetween,
    photos: { day1: first.photoUri, today: latest.photoUri },
    headline: winCount > 0 ? HEADLINE_WINS : HEADLINE_STEADY,
    changes,
    winCount,
    closingLine: winCount > 0 ? CLOSING_WINS : CLOSING_STEADY,
    // Earned by results, never urgency: only when something actually moved.
    reorderHint: winCount > 0 ? REORDER_HINT : null,
  };
}

/** Adapter: persisted Scans (oldest reliable + newest) → model input. */
export function rescanInputFromScans(
  scans: Array<{
    capturedAt: string;
    photoUri?: string | null;
    overallScore?: number | null;
    aiAnalysis?: { score_factors?: Partial<Record<FactorKey, number>> } | null;
  }>,
): Partial<RescanCompareInput> {
  const dated = scans
    .filter((s) => Number.isFinite(Date.parse(s.capturedAt)))
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  const toInput = (s: (typeof dated)[number]): RescanScanInput => ({
    capturedAt: s.capturedAt,
    photoUri: s.photoUri ?? null,
    overallScore: typeof s.overallScore === 'number' ? s.overallScore : null,
    factors: s.aiAnalysis?.score_factors ?? null,
  });
  if (dated.length === 0) return {};
  if (dated.length === 1) return { latest: toInput(dated[0]) };
  return { first: toInput(dated[0]), latest: toInput(dated[dated.length - 1]) };
}

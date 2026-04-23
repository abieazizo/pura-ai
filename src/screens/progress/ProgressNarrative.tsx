import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowUp, ArrowDown, Minus } from 'phosphor-react-native';
import { palette } from '@/theme';
import {
  CATEGORY_LABEL,
  getConcerns,
  severityLabel,
} from '@/utils/concerns';
import type { Concern, ConcernCategory, Scan, Severity } from '@/types';

/**
 * ProgressNarrative — v8.2 compressed. One overall headline + a single
 * line per concern showing the tier transition (Day 1 → Today). No prose
 * sentences, no italic-serif editorial paragraphs. The before/after
 * compare + MetricBars that live below this do the deeper work.
 */

export interface ProgressNarrativeProps {
  scans: Scan[];
}

export function ProgressNarrative({ scans }: ProgressNarrativeProps) {
  if (scans.length < 2) return null;

  const first = scans[0];
  const latest = scans[scans.length - 1];

  const firstBy = byCategory(getConcerns(first));
  const latestBy = byCategory(getConcerns(latest, scans[scans.length - 2]));

  const rows: Row[] = (
    ['breakouts', 'hydration', 'texture', 'tone'] as ConcernCategory[]
  ).map((cat) => buildRow(cat, firstBy[cat], latestBy[cat]));

  // v10.2 — celebrate the biggest specific win. The previous aggregate
  // headline ("Two concerns moved up.") read as a tally. A progress page
  // should name the winner: "Breakouts · moderate → mild." The headline
  // falls back gracefully for flat or backwards journeys.
  const biggestWin = pickBiggestMove(rows);
  const days = daysBetween(first.capturedAt, latest.capturedAt);
  const headline = buildNarrativeHeadline(biggestWin, rows);
  const kicker = biggestWin?.direction === 'up' ? 'BIGGEST WIN' : `${days} DAYS IN`;

  return (
    <View style={styles.root}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        {kicker}
      </Text>
      <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
        {headline}
      </Text>
      {biggestWin?.direction === 'up' ? (
        <Text style={styles.headlineSub} maxFontSizeMultiplier={1.15}>
          {`${severityLabel(biggestWin.startSeverity)} \u2192 ${severityLabel(
            biggestWin.endSeverity
          )} over ${days} days.`}
        </Text>
      ) : null}

      <View style={styles.list}>
        {rows.map((r) => (
          <RowView key={r.category} row={r} />
        ))}
      </View>
    </View>
  );
}

/**
 * Pick the single category that moved up the most (severity-rank delta).
 * Ties break toward breakouts → hydration → texture → tone for consistency.
 * Returns null when no category changed.
 */
function pickBiggestMove(rows: Row[]): Row | null {
  const moved = rows.filter((r) => r.direction !== 'flat');
  if (moved.length === 0) return null;
  // Rank delta (positive = up, negative = down). Up wins over down.
  const withDelta = moved.map((r) => ({
    row: r,
    delta:
      (r.direction === 'up' ? 1 : -1) *
      Math.abs(severityRank(r.startSeverity) - severityRank(r.endSeverity)),
  }));
  withDelta.sort((a, b) => b.delta - a.delta);
  return withDelta[0]?.row ?? null;
}

/**
 * Build the hero headline. If a clear winner exists (up direction), name
 * it. Otherwise fall back to a grounded statement about the overall shape.
 */
function buildNarrativeHeadline(win: Row | null, rows: Row[]): string {
  if (win && win.direction === 'up') {
    return `${CATEGORY_LABEL[win.category]} improved the most.`;
  }
  const downs = rows.filter((r) => r.direction === 'down').length;
  const ups = rows.filter((r) => r.direction === 'up').length;
  if (ups > 0 && downs > 0) return 'Mixed picture since day 1.';
  if (downs >= 1) return `${CATEGORY_LABEL[rows.find((r) => r.direction === 'down')!.category]} needs attention.`;
  return 'Holding steady since day 1.';
}

function RowView({ row }: { row: Row }) {
  const { Icon, color } = arrowFor(row.direction);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel} maxFontSizeMultiplier={1.1}>
        {CATEGORY_LABEL[row.category]}
      </Text>
      <View style={{ flex: 1 }} />
      <Text
        style={styles.rowFrom}
        maxFontSizeMultiplier={1.1}
      >
        {severityLabel(row.startSeverity)}
      </Text>
      <Icon size={11} color={color} weight="bold" />
      <Text
        style={[styles.rowTo, { color: palette.ink }]}
        maxFontSizeMultiplier={1.1}
      >
        {severityLabel(row.endSeverity)}
      </Text>
    </View>
  );
}

// ============================================================================
// Helpers
// ============================================================================

type Direction = 'up' | 'down' | 'flat';

interface Row {
  category: ConcernCategory;
  startSeverity: Severity;
  endSeverity: Severity;
  direction: Direction;
}

function byCategory(concerns: Concern[]): Record<ConcernCategory, Concern> {
  return concerns.reduce(
    (acc, c) => {
      acc[c.category] = c;
      return acc;
    },
    {} as Record<ConcernCategory, Concern>
  );
}

function severityRank(s: Severity): number {
  switch (s) {
    case 'needs-attention':
      return 3;
    case 'moderate':
      return 2;
    case 'mild':
      return 1;
    case 'calm':
      return 0;
  }
}

function buildRow(
  cat: ConcernCategory,
  start: Concern | undefined,
  end: Concern | undefined
): Row {
  const startS = start?.severity ?? 'mild';
  const endS = end?.severity ?? 'mild';
  const delta = severityRank(endS) - severityRank(startS);
  const direction: Direction =
    delta < 0 ? 'up' : delta > 0 ? 'down' : 'flat';
  return {
    category: cat,
    startSeverity: startS,
    endSeverity: endS,
    direction,
  };
}

function arrowFor(d: Direction): {
  Icon: typeof ArrowUp;
  color: string;
} {
  if (d === 'up') return { Icon: ArrowUp, color: palette.moss };
  if (d === 'down') return { Icon: ArrowDown, color: palette.rust };
  return { Icon: Minus, color: palette.inkTertiary };
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.max(1, Math.round(Math.abs(b - a) / 86400000));
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  root: {
    marginTop: 8,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: palette.ink,
  },
  // v10.2 — subheadline tier transition line sits under the biggest-win
  // headline in italic serif. Reads as editorial caption, not data.
  headlineSub: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSecondary,
    marginTop: 6,
  },
  list: {
    marginTop: 22,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  rowLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.ink,
  },
  rowFrom: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.inkTertiary,
  },
  rowTo: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: palette.ink,
  },
});

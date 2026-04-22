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

  const ups = rows.filter((r) => r.direction === 'up').length;
  const downs = rows.filter((r) => r.direction === 'down').length;

  const overall =
    ups >= 3
      ? 'Gaining ground.'
      : ups === 2
      ? 'Two areas improving.'
      : ups === 1 && downs === 0
      ? 'One area improving. The rest is holding.'
      : downs >= 2
      ? 'A few things moved the wrong way.'
      : downs === 1
      ? 'Mostly steady. One to watch.'
      : 'Holding steady.';

  const days = daysBetween(first.capturedAt, latest.capturedAt);

  return (
    <View style={styles.root}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        {`${days} DAYS IN`}
      </Text>
      <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
        {overall}
      </Text>

      <View style={styles.list}>
        {rows.map((r) => (
          <RowView key={r.category} row={r} />
        ))}
      </View>
    </View>
  );
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

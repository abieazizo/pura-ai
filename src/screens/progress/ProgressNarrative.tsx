import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowUp, ArrowDown, Minus } from 'phosphor-react-native';
import { palette, statusColor } from '@/theme';
import {
  CATEGORY_LABEL,
  getConcerns,
  severityLabel,
} from '@/utils/concerns';
import type { Concern, ConcernCategory, Scan, Severity } from '@/types';

/**
 * ProgressNarrative — v8.1 concern-centric proof module.
 *
 * Takes the user's scan history and renders a per-concern trend summary:
 * what changed, where, and how (severity tier transition). Each row is a
 * human sentence + a tier transition ("needs attention → moderate") so
 * progress reads as narrative, not dashboard numbers.
 */

export interface ProgressNarrativeProps {
  scans: Scan[];
}

export function ProgressNarrative({ scans }: ProgressNarrativeProps) {
  if (scans.length < 2) return null;

  const first = scans[0];
  const latest = scans[scans.length - 1];

  // Resolve concerns for both endpoints; align by category so we can diff.
  const firstByCat = byCategory(getConcerns(first));
  const latestByCat = byCategory(getConcerns(latest, scans[scans.length - 2]));

  const rows: Array<NarrativeRow> = (
    ['breakouts', 'hydration', 'texture', 'tone'] as ConcernCategory[]
  ).map((cat) => {
    const start = firstByCat[cat];
    const end = latestByCat[cat];
    return buildRow(cat, start, end);
  });

  return (
    <View style={styles.root}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        THE PAST {daysBetween(first.capturedAt, latest.capturedAt)} DAYS
      </Text>
      <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
        {buildOverallNarrative(rows)}
      </Text>

      <View style={styles.list}>
        {rows.map((row) => (
          <NarrativeRowView key={row.category} row={row} />
        ))}
      </View>
    </View>
  );
}

function NarrativeRowView({ row }: { row: NarrativeRow }) {
  const Icon = row.direction === 'up' ? ArrowUp : row.direction === 'down' ? ArrowDown : Minus;
  const iconColor =
    row.direction === 'up'
      ? palette.moss
      : row.direction === 'down'
      ? palette.rust
      : palette.inkTertiary;
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <View style={[styles.bullet, { backgroundColor: iconColor }]} />
        <Text style={styles.rowLabel} maxFontSizeMultiplier={1.1}>
          {CATEGORY_LABEL[row.category]}
        </Text>
      </View>
      <Text style={styles.rowNarrative} maxFontSizeMultiplier={1.2}>
        {row.sentence}
      </Text>
      <View style={styles.rowFoot}>
        <Text style={styles.rowTier} maxFontSizeMultiplier={1.1}>
          Day 1: {severityLabel(row.startSeverity)}
        </Text>
        <Icon size={12} color={iconColor} weight="duotone" />
        <Text
          style={[styles.rowTier, { color: palette.ink }]}
          maxFontSizeMultiplier={1.1}
        >
          Today: {severityLabel(row.endSeverity)}
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// Row building + narrative writing
// ============================================================================

type NarrativeDirection = 'up' | 'down' | 'flat';

interface NarrativeRow {
  category: ConcernCategory;
  startSeverity: Severity;
  endSeverity: Severity;
  direction: NarrativeDirection;
  sentence: string;
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
): NarrativeRow {
  const startSeverity = start?.severity ?? 'mild';
  const endSeverity = end?.severity ?? 'mild';
  const delta = severityRank(endSeverity) - severityRank(startSeverity);
  const direction: NarrativeDirection =
    delta < 0 ? 'up' : delta > 0 ? 'down' : 'flat';
  const sentence = narrativeSentence(cat, startSeverity, endSeverity, direction, end);
  return { category: cat, startSeverity, endSeverity, direction, sentence };
}

function narrativeSentence(
  cat: ConcernCategory,
  startS: Severity,
  endS: Severity,
  dir: NarrativeDirection,
  end: Concern | undefined
): string {
  const region = end?.region ?? 'face';
  switch (cat) {
    case 'breakouts': {
      if (dir === 'up') {
        return `Breakouts on your ${region} have settled since your first scan.`;
      }
      if (dir === 'down') {
        return `More breakouts on your ${region} today than at your first scan.`;
      }
      if (endS === 'calm') {
        return `Your skin has stayed clear through this stretch.`;
      }
      return `Breakouts are unchanged \u2014 slow and steady is still progress.`;
    }
    case 'hydration': {
      if (dir === 'up') {
        return `Hydration is improving, and your ${region} are catching up.`;
      }
      if (dir === 'down') {
        return `Hydration on your ${region} is lower than at day 1.`;
      }
      if (endS === 'calm') {
        return `Hydration has held steady across this window.`;
      }
      return `Hydration hasn\u2019t shifted much yet \u2014 give it another week.`;
    }
    case 'texture': {
      if (dir === 'up') {
        return `Texture on your ${region} is reading smoother.`;
      }
      if (dir === 'down') {
        return `Texture on your ${region} is rougher than at day 1.`;
      }
      if (endS === 'calm') {
        return `Your texture has stayed even across this stretch.`;
      }
      return `Texture looks about the same \u2014 consistency will move this.`;
    }
    case 'tone': {
      if (dir === 'up') {
        return `Dark marks are fading \u2014 slowly, but measurably.`;
      }
      if (dir === 'down') {
        return `A few new dark marks since your first scan.`;
      }
      if (endS === 'calm') {
        return `Your tone is even and holding.`;
      }
      return `Dark marks are still visible \u2014 tone takes time.`;
    }
  }
}

function buildOverallNarrative(rows: NarrativeRow[]): string {
  const ups = rows.filter((r) => r.direction === 'up');
  const downs = rows.filter((r) => r.direction === 'down');

  if (ups.length >= 3) return 'You\u2019re gaining ground across the board.';
  if (ups.length === 2) {
    return `${CATEGORY_LABEL[ups[0].category]} and ${CATEGORY_LABEL[
      ups[1].category
    ].toLowerCase()} are improving.`;
  }
  if (ups.length === 1 && downs.length === 0) {
    return `${CATEGORY_LABEL[ups[0].category]} is improving. The rest is holding.`;
  }
  if (downs.length >= 2) {
    return 'A few things moved in the wrong direction this week \u2014 that happens.';
  }
  if (downs.length === 1) {
    return `${CATEGORY_LABEL[downs[0].category]} is the one to watch.`;
  }
  return 'Steady across the board. Consistency is the work.';
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
    paddingVertical: 22,
    paddingHorizontal: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
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
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: palette.ink,
  },
  list: {
    marginTop: 18,
    gap: 18,
  },
  row: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: palette.inkSecondary,
    textTransform: 'uppercase',
  },
  rowNarrative: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSecondary,
  },
  rowFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  rowTier: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.inkTertiary,
  },
});

/**
 * KeyChangesCard — vertical metric list (never a cramped grid).
 *
 * Each row shows: label · from→to (when known) · status word · plain-English
 * interpretation. Status word is colour-coded but ALWAYS paired with a word
 * for accessibility (no color-only meaning).
 *
 * Honesty rules:
 *   • When a row has no `from`/`to`, the numbers are hidden — interpretation
 *     alone is shipped. Never displays "72 → 70 · increased".
 *   • Status word and number movement direction are guaranteed by the
 *     adapter to agree (the adapter is the only place that mints metrics).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowUp, ArrowDown, Minus } from 'phosphor-react-native';
import { palette } from '@/theme';
import type { InsightMetric } from '@/state/progressRoutineInsight';

interface Props {
  metrics: InsightMetric[];
}

export function KeyChangesCard({ metrics }: Props) {
  if (metrics.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        KEY CHANGES
      </Text>

      <View style={styles.list}>
        {metrics.map((m) => (
          <MetricRow key={m.label} metric={m} />
        ))}
      </View>
    </View>
  );
}

function MetricRow({ metric }: { metric: InsightMetric }) {
  const tone = toneFor(metric.status);
  const Icon =
    metric.status === 'Improved'
      ? ArrowUp
      : metric.status === 'Needs support'
      ? ArrowDown
      : Minus;

  const showNumbers =
    typeof metric.from === 'number' && typeof metric.to === 'number';

  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Text style={styles.label} maxFontSizeMultiplier={1.15}>
          {metric.label}
        </Text>
        {showNumbers ? (
          <View style={styles.numberStack}>
            <Text style={styles.fromTo} maxFontSizeMultiplier={1.1}>
              {metric.from}
              <Text style={styles.arrow}>{' → '}</Text>
              {metric.to}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
          <Icon size={11} color={tone.fg} weight="bold" />
          <Text
            style={[styles.statusText, { color: tone.fg }]}
            maxFontSizeMultiplier={1.1}
          >
            {metric.status}
          </Text>
        </View>
        <Text
          style={styles.interpretation}
          maxFontSizeMultiplier={1.2}
          numberOfLines={2}
        >
          {metric.interpretation}
        </Text>
      </View>
    </View>
  );
}

function toneFor(status: InsightMetric['status']): { bg: string; fg: string } {
  switch (status) {
    case 'Improved':
      return { bg: palette.mossLight, fg: palette.mossDeep };
    case 'Needs support':
      return { bg: palette.rustLight, fg: palette.rust };
    case 'Stable':
      return { bg: palette.bgDeep, fg: palette.inkSecondary };
  }
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  list: {
    gap: 10,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.3,
    color: palette.ink,
  },
  numberStack: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  fromTo: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.inkSecondary,
    fontVariant: ['tabular-nums'],
  },
  arrow: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.inkTertiary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  interpretation: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
  },
});

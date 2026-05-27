/**
 * ScoreBreakdownCard — "What affected your score" with action hints.
 *
 * Replaces the raw `from → to` numerals (e.g. "30 → 18") that the old
 * KeyChangesCard surfaced. Numbers a user can't interpret cleanly are a
 * trust hazard — the new card leans on status + interpretation + a
 * mini direction bar + a concrete action hint per row.
 *
 * Reads only `insight.metrics`, never raw scans.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowUp, ArrowDown, Minus } from 'phosphor-react-native';
import { palette } from '@/theme';
import type { InsightMetric } from '@/state/progressRoutineInsight';

interface Props {
  metrics: InsightMetric[];
}

export function ScoreBreakdownCard({ metrics }: Props) {
  if (metrics.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        WHAT AFFECTED YOUR SCORE
      </Text>
      <View style={styles.list}>
        {metrics.map((m) => (
          <Row key={m.label} metric={m} />
        ))}
      </View>
    </View>
  );
}

function Row({ metric }: { metric: InsightMetric }) {
  const tone = toneFor(metric.status);
  const Icon =
    metric.status === 'Improved'
      ? ArrowUp
      : metric.status === 'Needs support'
      ? ArrowDown
      : Minus;
  const actionHint = actionHintFor(metric);

  // Direction-only delta — never expose the raw 0..100 axis value, which
  // historically read as a mysterious "18" with no anchor.
  const delta =
    typeof metric.from === 'number' && typeof metric.to === 'number'
      ? metric.to - metric.from
      : null;
  const showDelta = delta !== null && Math.abs(delta) >= 1;

  return (
    <View style={styles.row}>
      <View style={styles.headRow}>
        <Text style={styles.label} maxFontSizeMultiplier={1.15}>
          {metric.label}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
          <Icon size={11} color={tone.fg} weight="bold" />
          <Text style={[styles.statusText, { color: tone.fg }]}>
            {metric.status}
          </Text>
        </View>
      </View>

      <Text
        style={styles.interpretation}
        maxFontSizeMultiplier={1.2}
        numberOfLines={3}
      >
        {metric.interpretation}
      </Text>

      <View style={styles.metaRow}>
        {/* Mini direction bar — visual cue for movement without exposing
            raw axis values. Fills toward the "Improved" side or hollows
            toward "Needs support." */}
        <DirectionBar status={metric.status} />
        {showDelta ? (
          <Text style={[styles.deltaText, { color: tone.fg }]}>
            {delta! > 0 ? `+${delta}` : `${delta}`}
          </Text>
        ) : null}
      </View>

      {actionHint ? (
        <View style={[styles.actionRow, { backgroundColor: tone.actionBg }]}>
          <Text style={styles.actionKicker} maxFontSizeMultiplier={1.1}>
            NEXT STEP
          </Text>
          <Text
            style={styles.actionText}
            maxFontSizeMultiplier={1.2}
            numberOfLines={2}
          >
            {actionHint}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function DirectionBar({ status }: { status: InsightMetric['status'] }) {
  const segments: ('on' | 'off')[] =
    status === 'Improved'
      ? ['on', 'on', 'on', 'off', 'off']
      : status === 'Stable'
      ? ['off', 'on', 'on', 'on', 'off']
      : ['off', 'off', 'on', 'on', 'on'];
  const tone = toneFor(status);
  return (
    <View style={styles.barRow}>
      {segments.map((s, i) => (
        <View
          key={i}
          style={[
            styles.barSegment,
            { backgroundColor: s === 'on' ? tone.fg : palette.bgDeep },
          ]}
        />
      ))}
    </View>
  );
}

function toneFor(status: InsightMetric['status']): {
  bg: string;
  fg: string;
  actionBg: string;
} {
  switch (status) {
    case 'Improved':
      return {
        bg: palette.mossLight,
        fg: palette.mossDeep,
        actionBg: palette.mossLight,
      };
    case 'Needs support':
      return {
        bg: palette.rustLight,
        fg: palette.rust,
        actionBg: palette.rustLight,
      };
    case 'Stable':
      return {
        bg: palette.bgDeep,
        fg: palette.inkSecondary,
        actionBg: palette.bgDeep,
      };
  }
}

/**
 * Per-concern action hint. Pure derivation from label + status — never
 * invented from AI prose.
 */
function actionHintFor(metric: InsightMetric): string | null {
  const label = metric.label.toLowerCase();
  if (label.includes('hydration')) {
    return metric.status === 'Needs support'
      ? 'Add hydration and skip strong exfoliating acids today.'
      : metric.status === 'Improved'
      ? 'Keep the hydrating step — it’s doing real work.'
      : 'Hold steady on your moisture step.';
  }
  if (label.includes('breakout')) {
    return metric.status === 'Needs support'
      ? 'Keep products lightweight near the active area. Spot-treat, don’t full-face treat.'
      : metric.status === 'Improved'
      ? 'Don’t over-treat — the gentle approach is winning.'
      : 'Keep products lightweight near the chin.';
  }
  if (label.includes('texture')) {
    return metric.status === 'Needs support'
      ? 'Focus on consistency before adding stronger exfoliating treatments.'
      : metric.status === 'Improved'
      ? 'Stay the course — texture rewards consistency.'
      : 'Texture moves slowly. Stay consistent.';
  }
  if (label.includes('dark') || label.includes('mark')) {
    return 'Daily SPF matters most for fading marks. Don’t skip it.';
  }
  if (label.includes('redness')) {
    return metric.status === 'Needs support'
      ? 'Pull back on acids and lean barrier-first until redness calms.'
      : 'Keep your routine calm — barrier care is the win.';
  }
  if (label.includes('oily') || label.includes('pore')) {
    return 'Lightweight moisturizer beats heavy oil-control products.';
  }
  return null;
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 24,
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
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 10,
  },
  label: {
    flex: 1,
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    letterSpacing: -0.3,
    color: palette.ink,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  interpretation: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  barSegment: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
  },
  deltaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    minWidth: 28,
    textAlign: 'right',
  },
  actionRow: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 10,
  },
  actionKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.2,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  actionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    color: palette.ink,
  },
});

/**
 * ScoreTrendSection — canonical-insight-driven trend module.
 *
 * Replaces every "Score Trend" render path that used to read raw scans
 * directly. Always renders something honest:
 *
 *   • `no-data` (0 scans)     → quiet card with the unlock copy
 *   • `first-scan` (1 scan)   → quiet card with the two-scans-unlock copy
 *   • `improving|holding|sliding` (2+) → compact sparkline + interpretation
 *
 * The chart is drawn with react-native-svg (already in the bundle) to
 * keep this component self-contained and avoid the heavier
 * `SkinScoreTrendCard` chart that re-derives its own delta + peak labels.
 * The interpretation line is `insight.trendSummary.summaryLine` so the
 * trend section can never tell a different story than Today's Skin Read.
 */

import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { palette } from '@/theme';
import type { ProgressRoutineInsight } from '@/state/progressRoutineInsight';

interface Props {
  trend: ProgressRoutineInsight['trendSummary'];
}

const CHART_HEIGHT = 88;
const CHART_PAD_Y = 10;

export function ScoreTrendSection({ trend }: Props) {
  if (trend.direction === 'no-data' || trend.direction === 'first-scan') {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          SCORE TREND
        </Text>
        <Text style={styles.emptyBody} maxFontSizeMultiplier={1.2}>
          {trend.summaryLine}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          SCORE TREND
        </Text>
        {trend.baselineScore !== null && trend.latestScore !== null ? (
          <Text style={styles.endpoints} maxFontSizeMultiplier={1.1}>
            <Text style={styles.endpointLabel}>Day 1 </Text>
            <Text style={styles.endpointValue}>{trend.baselineScore}</Text>
            <Text style={styles.endpointArrow}>{'  →  '}</Text>
            <Text style={styles.endpointLabel}>Today </Text>
            <Text style={[styles.endpointValue, { color: palette.clay }]}>
              {trend.latestScore}
            </Text>
          </Text>
        ) : null}
      </View>

      <Text style={styles.body} maxFontSizeMultiplier={1.2} numberOfLines={2}>
        {trend.summaryLine}
      </Text>

      <Sparkline points={trend.points} />
    </View>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const { width: winW } = useWindowDimensions();
  // Width = parent margin (20) on each side, plus the card's internal
  // horizontal padding (20). Keep in lockstep with the styles below.
  const width = winW - 40 - 40;
  const innerH = CHART_HEIGHT - CHART_PAD_Y * 2;

  // Map points into chart-space. Y is normalised against the actual
  // point range so a small movement still reads visually, but clamped
  // so anything > 100 / < 0 doesn't escape the box.
  const min = Math.max(0, Math.min(...points) - 4);
  const max = Math.min(100, Math.max(...points) + 4);
  const span = Math.max(1, max - min);

  const coords = points.map((v, i) => {
    const x = (i / Math.max(1, points.length - 1)) * width;
    const y = CHART_PAD_Y + (1 - (v - min) / span) * innerH;
    return { x, y };
  });

  const linePath = buildSmoothPath(coords);
  const baselineY = CHART_HEIGHT - CHART_PAD_Y;
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${baselineY} L ${coords[0].x} ${baselineY} Z`;
  const end = coords[coords.length - 1];

  return (
    <View style={styles.chart}>
      <Svg width={width} height={CHART_HEIGHT}>
        <Defs>
          <LinearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.clay} stopOpacity={0.22} />
            <Stop offset="1" stopColor={palette.clay} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#trendArea)" />
        <Path
          d={linePath}
          stroke={palette.clay}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={end.x} cy={end.y} r={8} fill={palette.clay} fillOpacity={0.18} />
        <Circle cx={end.x} cy={end.y} r={3.5} fill={palette.clay} />
      </Svg>
    </View>
  );
}

function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  const tension = 0.18;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dx = (curr.x - prev.x) * tension;
    const c1x = prev.x + dx;
    const c1y = prev.y;
    const c2x = curr.x - dx;
    const c2y = curr.y;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 22,
    marginHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  emptyWrap: {
    marginTop: 22,
    marginHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  endpoints: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: palette.inkSecondary,
    fontVariant: ['tabular-nums'],
  },
  endpointLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  endpointValue: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    letterSpacing: -0.3,
    color: palette.ink,
  },
  endpointArrow: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: palette.inkTertiary,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: palette.ink,
    marginTop: 4,
  },
  chart: {
    marginTop: 6,
    height: CHART_HEIGHT,
  },
});

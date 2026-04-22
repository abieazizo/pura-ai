import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { ArrowUp, ArrowDown, Minus } from 'phosphor-react-native';
import { palette } from '@/theme';
import {
  type SkinScore,
  formatDelta,
  sinceLastPhrase,
  tierLabel,
} from '@/utils/skinScore';
import type { Scan } from '@/types';

const AnimatedLine = Animated.createAnimatedComponent(Line);

/**
 * SkinScoreHero — Progress screen anchor (v9.2).
 *
 * Leads the Progress page with the Skin Score as the dominant object:
 * giant tabular number, delta chip since last scan, tier pill, and a
 * compact sparkline spanning every scan in history. Below the sparkline
 * a single line summarises the improvement since day 1.
 *
 * Replaces the giant "01 / OF 84" treatment that pulled focus from the
 * actual proof. The sparkline is animated on mount — each segment draws
 * in sequence so the trend feels earned rather than static.
 */

export interface SkinScoreHeroProps {
  score: SkinScore;
  scans: Scan[];
}

const TREND_W = 320;
const TREND_H = 62;

export function SkinScoreHero({ score, scans }: SkinScoreHeroProps) {
  const reveal = useSharedValue(0);

  useEffect(() => {
    reveal.value = 0;
    reveal.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [scans.length, reveal]);

  const deltaLast = score.deltaSinceLast ?? 0;
  const deltaFirst = score.deltaSinceFirst ?? 0;

  const DeltaIcon =
    deltaLast > 0 ? ArrowUp : deltaLast < 0 ? ArrowDown : Minus;
  const deltaBg =
    deltaLast > 0
      ? palette.mossLight
      : deltaLast < 0
      ? palette.rustLight
      : palette.bgDeep;
  const deltaFg =
    deltaLast > 0
      ? palette.mossDeep
      : deltaLast < 0
      ? palette.rust
      : palette.inkSecondary;

  // Sparkline layout — map each scan score onto the trend box.
  const pts = scans.map((s) => s.overallScore);
  const hasTrend = pts.length >= 2;
  const min = Math.max(0, Math.min(...pts) - 4);
  const max = Math.min(100, Math.max(...pts) + 4);
  const span = Math.max(1, max - min);
  const xy = pts.map((v, i) => ({
    x: (i / Math.max(1, pts.length - 1)) * (TREND_W - 16) + 8,
    y: TREND_H - ((v - min) / span) * (TREND_H - 10) - 5,
  }));

  const sinceFirstLine =
    deltaFirst > 0
      ? `Up ${deltaFirst} since day 1.`
      : deltaFirst < 0
      ? `Down ${Math.abs(deltaFirst)} since day 1.`
      : scans.length > 1
      ? 'Even with day 1.'
      : 'Your first reading.';

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
            SKIN SCORE
          </Text>
          <View style={styles.valueRow}>
            <Text style={styles.value} maxFontSizeMultiplier={1.1}>
              {score.value}
            </Text>
            <Text style={styles.denom} maxFontSizeMultiplier={1.15}>
              /100
            </Text>
          </View>
        </View>

        <View style={styles.rightCol}>
          <View style={styles.tierPill}>
            <Text style={styles.tierText} maxFontSizeMultiplier={1.1}>
              {tierLabel(score.tier).toUpperCase()}
            </Text>
          </View>
          {score.deltaSinceLast !== null ? (
            <View style={[styles.deltaChip, { backgroundColor: deltaBg }]}>
              <DeltaIcon size={12} color={deltaFg} weight="bold" />
              <Text
                style={[styles.deltaText, { color: deltaFg }]}
                maxFontSizeMultiplier={1.1}
              >
                {formatDelta(deltaLast)}
              </Text>
              <Text
                style={[styles.deltaSince, { color: deltaFg }]}
                maxFontSizeMultiplier={1.1}
              >
                {sinceLastPhrase(score.latestAt, score.scanCount)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
        {score.headline}
      </Text>

      {hasTrend ? (
        <View style={styles.trendWrap}>
          <Svg width={TREND_W} height={TREND_H}>
            {/* Baseline rule at the min value */}
            <Line
              x1={8}
              y1={TREND_H - 5}
              x2={TREND_W - 8}
              y2={TREND_H - 5}
              stroke={palette.hairline}
              strokeWidth={1}
            />
            {/* Sparkline segments — each animates in as `reveal` progresses. */}
            {xy.slice(1).map((b, i) => {
              const a = xy[i];
              return (
                <AnimatedSegment
                  key={i}
                  ax={a.x}
                  ay={a.y}
                  bx={b.x}
                  by={b.y}
                  reveal={reveal}
                  index={i}
                  total={xy.length - 1}
                />
              );
            })}
            {/* End dot */}
            <Circle
              cx={xy[xy.length - 1].x}
              cy={xy[xy.length - 1].y}
              r={3.5}
              fill={palette.clay}
            />
          </Svg>
          <View style={styles.trendFooter}>
            <Text style={styles.trendLabel} maxFontSizeMultiplier={1.1}>
              {`Day 1 · ${pts[0]}`}
            </Text>
            <Text style={styles.trendFootLine} maxFontSizeMultiplier={1.15}>
              {sinceFirstLine}
            </Text>
            <Text style={styles.trendLabel} maxFontSizeMultiplier={1.1}>
              {`Today · ${pts[pts.length - 1]}`}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function AnimatedSegment({
  ax,
  ay,
  bx,
  by,
  reveal,
  index,
  total,
}: {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  reveal: SharedValue<number>;
  index: number;
  total: number;
}) {
  // Each segment reveals in turn: segment `i` begins when reveal ≥ i/total
  // and completes by (i+1)/total. Worklet computes interpolated endpoint.
  const animatedProps = useAnimatedProps(() => {
    'worklet';
    const start = index / total;
    const end = (index + 1) / total;
    const p = Math.max(0, Math.min(1, (reveal.value - start) / (end - start)));
    const x = ax + (bx - ax) * p;
    const y = ay + (by - ay) * p;
    return { x2: x, y2: y };
  });
  return (
    <AnimatedLine
      x1={ax}
      y1={ay}
      stroke={palette.clay}
      strokeWidth={2}
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 24,
    paddingHorizontal: 22,
    borderRadius: 22,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 88,
    lineHeight: 88,
    letterSpacing: -3,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  denom: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 20,
    lineHeight: 28,
    color: palette.inkTertiary,
    marginBottom: 10,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 8,
    paddingBottom: 10,
  },
  tierPill: {
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.inkSecondary,
  },
  deltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  deltaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  deltaSince: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  headline: {
    marginTop: 16,
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: palette.ink,
  },
  trendWrap: {
    marginTop: 22,
  },
  trendFooter: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  trendLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: palette.inkTertiary,
    fontVariant: ['tabular-nums'],
  },
  trendFootLine: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 13,
    color: palette.inkSecondary,
  },
});

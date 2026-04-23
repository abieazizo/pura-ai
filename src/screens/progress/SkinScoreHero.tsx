import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Line,
  LinearGradient,
  Defs,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { ArrowUp, ArrowDown, Minus } from 'phosphor-react-native';
import { palette } from '@/theme';
import { SkinScoreDial } from '@/components/SkinScoreDial';
import {
  type SkinScore,
  formatDelta,
  sinceLastPhrase,
} from '@/utils/skinScore';
import type { Scan } from '@/types';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * SkinScoreHero — v9.3 Progress page hero.
 *
 * Leads the Progress screen with two dominant objects stacked:
 *
 *   1. <SkinScoreDial> at hero size — the score as an iconic ring gauge
 *      (shared with Home so the score reads the same across the app)
 *   2. An area chart below — every scan's score plotted as a line +
 *      area fill, with gridlines at 40/60/80, the endpoint marked with
 *      a dot, and day labels below
 *
 * The animated area path + animated line draw in together over 1100ms
 * ease-out, staggered 200ms after the dial begins filling.
 */

export interface SkinScoreHeroProps {
  score: SkinScore;
  scans: Scan[];
}

const CHART_H = 160;
const CHART_V_PAD = 16; // top + bottom padding inside chart box
const Y_MIN = 0;
const Y_MAX = 100;
const GRID_VALUES = [40, 60, 80];

export function SkinScoreHero({ score, scans }: SkinScoreHeroProps) {
  const { width } = useWindowDimensions();
  const chartW = width - 40 - 44; // full minus outer page padding + inset
  const reveal = useSharedValue(0);

  // Peak + low annotations — compute the best and lowest scan scores so
  // the chart can surface them. Dates format as short MMM DD.
  const peak = useMemo(() => {
    if (scans.length === 0) return null;
    let bestIdx = 0;
    for (let i = 1; i < scans.length; i++) {
      if (scans[i].overallScore > scans[bestIdx].overallScore) bestIdx = i;
    }
    const s = scans[bestIdx];
    return {
      score: s.overallScore,
      label: formatShortDate(s.capturedAt),
      index: bestIdx,
    };
  }, [scans]);

  useEffect(() => {
    reveal.value = 0;
    reveal.value = withDelay(
      320,
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })
    );
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

  const pts = scans.map((s) => s.overallScore);
  const hasTrend = pts.length >= 2;

  const sinceFirstLine =
    deltaFirst > 0
      ? `Up ${deltaFirst} points since day 1.`
      : deltaFirst < 0
      ? `Down ${Math.abs(deltaFirst)} points since day 1.`
      : scans.length > 1
      ? 'Holding your day-1 score.'
      : 'Your first reading.';

  // v10.4 — celebration banner. When the journey-since-day-1 delta is
  // positive, the page now leads with the win itself: a big moss-tinted
  // card showing "+12" in giant serif with "POINTS SINCE DAY 1" kicker
  // and a "14-day journey" caption. The dial moves below as supporting
  // context. This flips Progress from "analytics view" to "proof view."
  const showCelebration =
    deltaFirst > 0 && scans.length >= 2;

  return (
    <View style={styles.wrap}>
      {showCelebration ? (
        <CelebrationHero
          delta={deltaFirst}
          scanCount={scans.length}
          firstAt={score.firstAt}
          latestAt={score.latestAt}
        />
      ) : null}

      {/* ── Dial hero ───────────────────────────────────────────── */}
      <View style={styles.dialWrap}>
        <SkinScoreDial
          value={score.value}
          size={220}
          previousValue={
            scans.length >= 2
              ? scans[scans.length - 2].overallScore
              : null
          }
          deltaCaption={
            score.deltaSinceLast !== null
              ? `${formatDelta(score.deltaSinceLast)} since last scan`
              : 'first reading'
          }
        />
      </View>

      {/* ── Kicker + delta chip ─────────────────────────────────── */}
      <View style={styles.metaRow}>
        <Text style={styles.metaKicker} maxFontSizeMultiplier={1.1}>
          SKIN SCORE
        </Text>
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

      <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
        {score.headline}
      </Text>

      {/* ── Area chart ──────────────────────────────────────────── */}
      {hasTrend ? (
        <ScoreAreaChart
          pts={pts}
          width={chartW}
          reveal={reveal}
          label={sinceFirstLine}
          firstScore={pts[0]}
          lastScore={pts[pts.length - 1]}
          peak={peak}
        />
      ) : null}
    </View>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================================
// CelebrationHero — v10.4
//
// Promotes a positive day-1 delta from a chart footer caption to a real
// moment. Moss-tinted card with a 3pt left rail, "POINTS SINCE DAY 1"
// kicker, a giant serif "+N" in moss-deep, and a journey caption that
// names the duration. Only renders when deltaFirst > 0 and at least two
// scans exist — otherwise the dial leads, as before.
// ============================================================================

function CelebrationHero({
  delta,
  scanCount,
  firstAt,
  latestAt,
}: {
  delta: number;
  scanCount: number;
  firstAt: string | null;
  latestAt: string | null;
}) {
  const days = journeyDays(firstAt, latestAt);
  const sub =
    days > 0
      ? `${days}-day journey \u00B7 ${scanCount} scans`
      : `${scanCount} scans`;
  return (
    <View style={celebration.wrap}>
      <View style={celebration.rail} pointerEvents="none" />
      <View style={{ flex: 1 }}>
        <Text style={celebration.kicker} maxFontSizeMultiplier={1.1}>
          POINTS SINCE DAY 1
        </Text>
        <View style={celebration.valueRow}>
          <Text style={celebration.deltaText} maxFontSizeMultiplier={1.1}>
            {`+${delta}`}
          </Text>
          <Text style={celebration.unit} maxFontSizeMultiplier={1.1}>
            points
          </Text>
        </View>
        <Text style={celebration.sub} maxFontSizeMultiplier={1.15}>
          {sub}
        </Text>
      </View>
    </View>
  );
}

function journeyDays(firstAt: string | null, latestAt: string | null): number {
  if (!firstAt || !latestAt) return 0;
  const a = new Date(firstAt).getTime();
  const b = new Date(latestAt).getTime();
  return Math.max(0, Math.round(Math.abs(b - a) / 86400000));
}

// ============================================================================
// Area chart
// ============================================================================

function ScoreAreaChart({
  pts,
  width,
  reveal,
  label,
  firstScore,
  lastScore,
  peak,
}: {
  pts: number[];
  width: number;
  reveal: SharedValue<number>;
  label: string;
  firstScore: number;
  lastScore: number;
  peak: { score: number; label: string; index: number } | null;
}) {
  const H = CHART_H;
  const innerH = H - CHART_V_PAD * 2;
  const leftGutter = 28; // for y-axis labels
  const rightPad = 10;
  const chartInnerW = width - leftGutter - rightPad;

  const xyFor = (v: number, i: number) => {
    const x = leftGutter + (i / Math.max(1, pts.length - 1)) * chartInnerW;
    const y = CHART_V_PAD + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * innerH;
    return { x, y };
  };

  const points = pts.map((v, i) => xyFor(v, i));

  // Smoothed line path — cubic bezier between each pair of points using a
  // simple control-point rule (horizontal control points) so the chart
  // reads organic but not wild.
  const linePath = useMemo(
    () => buildSmoothPath(points),
    [points]
  );

  // Area path = smoothed line + drop to baseline.
  const baselineY = H - CHART_V_PAD;
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

  // Animated reveal — each path's visible length is interpolated by `reveal`
  // via stroke-dasharray. Area fills opacity with the same curve.
  // Approximate total path length for dash math.
  const approxLen = useMemo(() => {
    let len = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      len += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return Math.max(1, len * 1.2); // +20% safety for bezier curves
  }, [points]);

  const lineAnimatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: approxLen * (1 - reveal.value),
    };
  });
  const areaAnimatedProps = useAnimatedProps(() => {
    return {
      opacity: reveal.value * 0.9,
    };
  });
  const endDotAnimatedProps = useAnimatedProps(() => {
    // only appear once the reveal reaches the end
    return {
      opacity: Math.max(0, (reveal.value - 0.85) / 0.15),
    };
  });

  const end = points[points.length - 1];

  return (
    <View style={chart.wrap}>
      <Svg width={width} height={H}>
        <Defs>
          <LinearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.clay} stopOpacity={0.28} />
            <Stop offset="1" stopColor={palette.clay} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {/* Tier-zone backdrop bands — very translucent rectangles showing
            the four tier regions (0-55 / 55-70 / 70-85 / 85-100). Reads
            as "where am I in the tier landscape" at a glance. */}
        {[
          { from: 0,  to: 55, color: palette.rust },
          { from: 55, to: 70, color: palette.amber },
          { from: 70, to: 85, color: palette.clay },
          { from: 85, to: 100, color: palette.moss },
        ].map((band, i) => {
          const yTop = CHART_V_PAD + (1 - band.to / 100) * innerH;
          const yBot = CHART_V_PAD + (1 - band.from / 100) * innerH;
          return (
            <Rect
              key={i}
              x={leftGutter}
              y={yTop}
              width={width - rightPad - leftGutter}
              height={yBot - yTop}
              fill={band.color}
              fillOpacity={0.045}
            />
          );
        })}

        {/* Gridlines + y-axis labels at 40 / 60 / 80 */}
        {GRID_VALUES.map((gv) => {
          const gy = CHART_V_PAD + (1 - (gv - Y_MIN) / (Y_MAX - Y_MIN)) * innerH;
          return (
            <React.Fragment key={gv}>
              <Line
                x1={leftGutter}
                y1={gy}
                x2={width - rightPad}
                y2={gy}
                stroke={palette.hairline}
                strokeOpacity={0.7}
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              <SvgText
                x={leftGutter - 6}
                y={gy + 3}
                fill={palette.inkTertiary}
                fontFamily="Inter-SemiBold"
                fontSize={9}
                textAnchor="end"
              >
                {gv}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Baseline rule */}
        <Line
          x1={leftGutter}
          y1={baselineY}
          x2={width - rightPad}
          y2={baselineY}
          stroke={palette.hairline}
          strokeWidth={1}
        />

        {/* Area fill — animated opacity */}
        <AnimatedPath
          d={areaPath}
          fill="url(#chartArea)"
          animatedProps={areaAnimatedProps}
        />

        {/* Line — animated stroke reveal */}
        <AnimatedPath
          d={linePath}
          stroke={palette.clay}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={approxLen}
          animatedProps={lineAnimatedProps}
        />

        {/* Peak annotation — small label above the peak scan point. */}
        {peak &&
        peak.index !== pts.length - 1 &&
        peak.index !== 0 ? (
          <>
            <Circle
              cx={points[peak.index].x}
              cy={points[peak.index].y}
              r={3}
              fill={palette.moss}
            />
            <Circle
              cx={points[peak.index].x}
              cy={points[peak.index].y}
              r={7}
              fill={palette.moss}
              fillOpacity={0.16}
            />
            <SvgText
              x={points[peak.index].x}
              y={Math.max(10, points[peak.index].y - 12)}
              fill={palette.mossDeep}
              fontFamily="Inter-SemiBold"
              fontSize={9}
              letterSpacing={0.3}
              textAnchor="middle"
            >
              BEST
            </SvgText>
          </>
        ) : null}

        {/* Endpoint dot — pulses in at the end */}
        <AnimatedCircleWrap
          cx={end.x}
          cy={end.y}
          animatedProps={endDotAnimatedProps}
        />
      </Svg>

      <View style={chart.footer}>
        <View style={chart.footerCol}>
          <Text style={chart.footerKicker} maxFontSizeMultiplier={1.1}>
            DAY 1
          </Text>
          <Text style={chart.footerValue} maxFontSizeMultiplier={1.1}>
            {firstScore}
          </Text>
        </View>
        <Text style={chart.footerMiddle} maxFontSizeMultiplier={1.15}>
          {label}
        </Text>
        <View style={chart.footerCol}>
          <Text style={chart.footerKicker} maxFontSizeMultiplier={1.1}>
            TODAY
          </Text>
          <Text
            style={[chart.footerValue, { color: palette.clay }]}
            maxFontSizeMultiplier={1.1}
          >
            {lastScore}
          </Text>
        </View>
      </View>
    </View>
  );
}

function AnimatedCircleWrap({
  cx,
  cy,
  animatedProps,
}: {
  cx: number;
  cy: number;
  animatedProps: ReturnType<typeof useAnimatedProps>;
}) {
  // Halo + core painted separately; both share the fade-in via the passed
  // animated opacity.
  return (
    <>
      <AnimatedCircleRaw
        cx={cx}
        cy={cy}
        r={9}
        fill={palette.clay}
        fillOpacity={0.18}
        animatedProps={animatedProps}
      />
      <AnimatedCircleRaw
        cx={cx}
        cy={cy}
        r={4}
        fill={palette.clay}
        animatedProps={animatedProps}
      />
    </>
  );
}

const AnimatedCircleRaw = Animated.createAnimatedComponent(Circle);

// Build a smoothed path across points using cubic beziers. Horizontal-only
// control points keeps the curve tame (no wild overshoot at edges).
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

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 24,
    paddingHorizontal: 22,
    borderRadius: 24,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  dialWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  metaKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
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
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  deltaSince: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  headline: {
    marginTop: 12,
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: palette.ink,
  },
});

// v10.4 — celebration hero styles. Moss-tinted card (palette.mossLight) +
// 3pt moss rail + giant serif delta in palette.mossDeep. Lives above the
// dial when deltaFirst > 0.
const celebration = StyleSheet.create({
  wrap: {
    marginTop: -6,
    marginBottom: 18,
    paddingVertical: 18,
    paddingLeft: 19,
    paddingRight: 16,
    borderRadius: 18,
    backgroundColor: palette.mossLight,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: palette.moss,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.mossDeep,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  deltaText: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1.6,
    color: palette.mossDeep,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    color: palette.mossDeep,
    opacity: 0.75,
  },
  sub: {
    marginTop: 4,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    letterSpacing: 0.1,
    color: palette.mossDeep,
    opacity: 0.85,
  },
});

const chart = StyleSheet.create({
  wrap: {
    marginTop: 22,
  },
  footer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  footerCol: {
    alignItems: 'center',
    minWidth: 46,
  },
  footerKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.2,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  footerValue: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    letterSpacing: -0.4,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  footerMiddle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
    paddingHorizontal: 8,
  },
});

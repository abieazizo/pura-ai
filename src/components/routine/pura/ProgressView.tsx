/**
 * ProgressView — Progress screen.
 *
 * Two presentations:
 *   • Baseline (canCompare === false) — premium baseline state.
 *   • Comparison (canCompare === true) — quiet analytics layout.
 *
 * Never renders a fake improvement number. Trend line only when
 * the comparison service supplies real points.
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Circle, Line as SvgLine } from 'react-native-svg';
import { ArrowLeft } from 'phosphor-react-native';
import {
  puraRoutineColors as C,
  puraRoutineRadius as R,
  puraRoutineSpace as SP,
  puraRoutineType as T,
} from '@/theme';
import type { ProgressComparison } from '@/types/routine';
import {
  Body,
  EditorialHeading,
  Eyebrow,
  ModeSegmented,
  PuraButton,
  PuraCard,
  QuietTextButton,
} from './primitives';

type Range = 'week' | 'month' | 'all';
const RANGE_OPTIONS = [
  { key: 'week' as const, label: 'Week' },
  { key: 'month' as const, label: 'Month' },
  { key: 'all' as const, label: 'All Time' },
];

interface ProgressViewProps {
  comparison: ProgressComparison;
  onReturnToRoutine: () => void;
  onScheduleNextScan: () => void;
}

export function ProgressView({
  comparison,
  onReturnToRoutine,
  onScheduleNextScan,
}: ProgressViewProps) {
  const [range, setRange] = useState<Range>('week');

  if (!comparison.canCompare) {
    return (
      <View style={styles.wrap}>
        <PuraCard tone="surface" elevation="hero" style={styles.baselineCard}>
          <Eyebrow tone="muted">BASELINE</Eyebrow>
          <EditorialHeading size="page" style={{ marginTop: 10 }}>
            Your baseline{'\n'}is saved.
          </EditorialHeading>
          <Body size="large" style={{ marginTop: 12 }}>
            Complete another scan in similar lighting to see visible change
            over time.
          </Body>
          <View style={styles.timeline}>
            <View style={styles.timelineRow}>
              <View style={styles.timelineDotDone} />
              <View style={{ flex: 1 }}>
                <Text style={[T.meta, { fontFamily: 'Inter-SemiBold', color: C.ink }]}>
                  First scan
                </Text>
                <Text style={[T.meta]}>Baseline saved</Text>
              </View>
            </View>
            <View style={[styles.timelineConnector]} />
            <View style={styles.timelineRow}>
              <View style={styles.timelineDotPending} />
              <View style={{ flex: 1 }}>
                <Text style={[T.meta, { fontFamily: 'Inter-SemiBold', color: C.ink }]}>
                  Next scan
                </Text>
                <Text style={[T.meta]}>Waiting for comparison</Text>
              </View>
            </View>
          </View>
        </PuraCard>
        <PuraCard tone="soft" elevation="card" style={styles.consistencyCard}>
          <Eyebrow tone="coral">ROUTINE CONSISTENCY</Eyebrow>
          <Text style={[T.body, { marginTop: 6 }]}>
            {comparison.consistency.completedThisWeek} of{' '}
            {comparison.consistency.targetThisWeek} sessions completed this
            week
          </Text>
        </PuraCard>

        <View style={styles.cta}>
          <PuraButton
            label="Schedule next scan"
            variant="coral"
            onPress={onScheduleNextScan}
          />
          <QuietTextButton
            label="View routine"
            tone="muted"
            onPress={onReturnToRoutine}
            style={{ marginTop: 10, alignSelf: 'center' }}
          />
        </View>
      </View>
    );
  }

  // ----- With-data variant -----
  const delta = comparison.overallImprovementPercent ?? 0;
  const deltaLabel = `${delta >= 0 ? '+' : ''}${delta}%`;
  const deltaColor = delta >= 0 ? C.success : C.coralStrong;

  return (
    <View style={styles.wrap}>
      <ModeSegmented
        options={RANGE_OPTIONS}
        value={range}
        onChange={setRange}
      />

      <PuraCard tone="surface" elevation="hero" style={styles.analyticsCard}>
        <Eyebrow tone="muted">VISIBLE PROGRESS</Eyebrow>
        <Text style={[T.numericLarge, { marginTop: 6, color: deltaColor }]}>
          {deltaLabel}
        </Text>
        <Body style={{ marginTop: 4 }}>
          Compared with {comparison.comparedAgainstLabel ?? 'your previous scan'}
        </Body>
        {comparison.trendPoints && comparison.trendPoints.length >= 2 ? (
          <TrendChart points={comparison.trendPoints} />
        ) : null}
      </PuraCard>

      {comparison.focusAreaRows.length > 0 ? (
        <PuraCard tone="soft" elevation="card" style={styles.focusCard}>
          <Eyebrow tone="muted">FOCUS AREAS</Eyebrow>
          <View style={{ marginTop: 12, gap: 10 }}>
            {comparison.focusAreaRows.map((row) => (
              <View key={row.label} style={styles.focusRow}>
                <Text style={[T.stepTitle, { flex: 1, color: C.ink }]}>
                  {row.label}
                </Text>
                <Text
                  style={[
                    T.body,
                    {
                      color:
                        row.status === 'improving'
                          ? C.sageDeep
                          : row.status === 'still_active'
                          ? C.coralDeep
                          : C.muted,
                      fontFamily: 'Inter-SemiBold',
                    },
                  ]}
                >
                  {row.status === 'improving'
                    ? 'Improving'
                    : row.status === 'still_active'
                    ? 'Still active'
                    : row.status === 'little_change'
                    ? 'Little change'
                    : 'Measuring'}
                </Text>
              </View>
            ))}
          </View>
        </PuraCard>
      ) : null}

      <PuraCard tone="soft" elevation="card" style={styles.consistencyCard}>
        <Eyebrow tone="coral">ROUTINE CONSISTENCY</Eyebrow>
        <Text style={[T.body, { marginTop: 6 }]}>
          {comparison.consistency.completedThisWeek} of{' '}
          {comparison.consistency.targetThisWeek} sessions completed this week
        </Text>
      </PuraCard>
    </View>
  );
}

function TrendChart({
  points,
}: {
  points: Array<{ label: string; score: number }>;
}) {
  const w = 300;
  const h = 130;
  const padX = 18;
  const padY = 20;
  const minScore = Math.min(...points.map((p) => p.score));
  const maxScore = Math.max(...points.map((p) => p.score));
  const range = Math.max(1, maxScore - minScore);
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const stepX = points.length === 1 ? 0 : innerW / (points.length - 1);

  const toPoint = (p: { score: number }, i: number) => {
    const x = padX + i * stepX;
    const y = padY + innerH - ((p.score - minScore) / range) * innerH;
    return { x, y };
  };

  const xy = points.map(toPoint);
  const d = xy
    .map((pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `L ${pt.x} ${pt.y}`))
    .join(' ');

  return (
    <View style={{ marginTop: SP.lg }}>
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        {/* Soft horizontal guide line */}
        <SvgLine
          x1={padX}
          y1={h / 2}
          x2={w - padX}
          y2={h / 2}
          stroke={C.line}
          strokeDasharray="2 4"
        />
        <Path d={d} stroke={C.coralStrong} strokeWidth={2} fill="none" />
        {xy.map((pt, i) => (
          <Circle key={i} cx={pt.x} cy={pt.y} r={3} fill={C.coralStrong} />
        ))}
      </Svg>
      <View style={styles.trendLabels}>
        {points.map((p, i) => (
          <Text
            key={`${p.label}-${i}`}
            style={[T.meta, { fontSize: 10, color: C.muted }]}
            numberOfLines={1}
          >
            {p.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SP.gutter,
    paddingTop: 14,
    gap: SP.lg,
  },
  baselineCard: {
    padding: SP.xl,
  },
  timeline: {
    marginTop: SP.lg,
    gap: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineDotDone: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.coralStrong,
  },
  timelineDotPending: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: C.lineStrong,
    borderStyle: 'dashed',
  },
  timelineConnector: {
    marginLeft: 6,
    width: 2,
    height: 14,
    backgroundColor: C.lineStrong,
  },
  consistencyCard: {
    padding: SP.lg,
  },
  analyticsCard: {
    padding: SP.xl,
  },
  focusCard: {
    padding: SP.xl,
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cta: {
    marginTop: 4,
  },
  trendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 12,
  },
});

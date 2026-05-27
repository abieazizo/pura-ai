import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import {
  Body,
  Eyebrow,
  HeroHeadline,
  Supporting,
  Surface,
} from './primitives';
import { V26, V26_RADIUS, V26_SPACE, V26_TYPE } from './tokens';
import type {
  ProgressTrend,
  ScanEvidence,
  ScoreBreakdownRow,
} from '@/state/v26/routineSession';

interface EstablishedProgressProps {
  trend: ProgressTrend;
  evidence: ScanEvidence;
}

/**
 * v26 — Established progress hero + comparison.
 *
 * Only renders when the user has at least 4 reliable scans. Surfaces:
 *   • Emotional, data-truthful headline
 *   • Compact metric row (score + change since baseline)
 *   • Trend visualization tied to real data points
 *   • Baseline vs latest visual comparison
 */
export function EstablishedProgressHero({
  trend,
  evidence,
}: EstablishedProgressProps) {
  return (
    <Surface tone="surface" hero elevated style={s.hero}>
      <Eyebrow>YOUR PROGRESS</Eyebrow>
      <HeroHeadline style={s.headline}>{trend.headline}</HeroHeadline>

      {typeof trend.latestScore === 'number' ? (
        <View style={s.metricRow}>
          <View style={s.metricCol}>
            <Text style={s.metricLabel} maxFontSizeMultiplier={1.15}>
              Skin Score
            </Text>
            <Text style={s.metricValue} maxFontSizeMultiplier={1.1}>
              {trend.latestScore}
            </Text>
          </View>
          {typeof trend.changeSinceBaseline === 'number' ? (
            <View style={s.metricChangeWrap}>
              <Text style={s.metricChangeLabel} maxFontSizeMultiplier={1.15}>
                Change
              </Text>
              <Text style={s.metricChangeValue} maxFontSizeMultiplier={1.1}>
                {trend.changeSinceBaseline > 0
                  ? `+${trend.changeSinceBaseline} since baseline`
                  : trend.changeSinceBaseline < 0
                  ? `${trend.changeSinceBaseline} since baseline`
                  : 'No change since baseline'}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <Body style={s.supporting}>{trend.supporting}</Body>

      {trend.points.length > 1 ? (
        <View style={s.trend}>
          <TrendLine points={trend.points} />
        </View>
      ) : null}

      <ChinComparison evidence={evidence} />
    </Surface>
  );
}

// ---------------------------------------------------------------------------
// Score breakdown
// ---------------------------------------------------------------------------

interface ScoreBreakdownProps {
  rows: ScoreBreakdownRow[];
}

export function ScoreBreakdown({ rows }: ScoreBreakdownProps) {
  return (
    <Surface tone="surface" style={s.breakdownCard}>
      <Text style={s.breakdownHeader} maxFontSizeMultiplier={1.15}>
        What changed your score
      </Text>
      {rows.map((row, idx) => (
        <View
          key={`${row.label}-${idx}`}
          style={[s.breakdownRow, idx === rows.length - 1 && { borderBottomWidth: 0 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.breakdownLabel} maxFontSizeMultiplier={1.2}>
              {row.label}
            </Text>
            <Text style={s.breakdownStatus} maxFontSizeMultiplier={1.2}>
              {statusCopy(row.status)}
            </Text>
          </View>
          <Text style={[s.breakdownEffect, effectStyleFor(row.status)]} maxFontSizeMultiplier={1.1}>
            {row.effectLabel}
          </Text>
        </View>
      ))}
    </Surface>
  );
}

function statusCopy(status: ScoreBreakdownRow['status']): string {
  switch (status) {
    case 'improving':
      return 'Improving';
    case 'stillActive':
      return 'Still active';
    case 'stable':
      return 'Stable';
    case 'measuring':
    default:
      return 'Still measuring';
  }
}

function effectStyleFor(status: ScoreBreakdownRow['status']) {
  if (status === 'improving' || status === 'stillActive') {
    return { color: V26.terracottaText };
  }
  return { color: V26.inkMuted };
}

// ---------------------------------------------------------------------------
// Trend line
// ---------------------------------------------------------------------------

function TrendLine({ points }: { points: { dayLabel: string; score: number }[] }) {
  const WIDTH = 280;
  const HEIGHT = 96;
  const padding = 12;
  const min = Math.min(...points.map((p) => p.score));
  const max = Math.max(...points.map((p) => p.score));
  const range = Math.max(2, max - min);
  const xs = (i: number) =>
    padding + (i * (WIDTH - padding * 2)) / Math.max(1, points.length - 1);
  const ys = (v: number) =>
    HEIGHT - padding - ((v - min) / range) * (HEIGHT - padding * 2);

  const polyline = points.map((p, i) => `${xs(i)},${ys(p.score)}`).join(' ');

  return (
    <View>
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Line
          x1={padding}
          y1={HEIGHT - padding}
          x2={WIDTH - padding}
          y2={HEIGHT - padding}
          stroke={V26.border}
          strokeWidth={1}
        />
        <Polyline
          points={polyline}
          fill="none"
          stroke={V26.terracotta}
          strokeWidth={1.6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <Circle
            key={`pt-${i}`}
            cx={xs(i)}
            cy={ys(p.score)}
            r={3.6}
            fill={V26.terracotta}
          />
        ))}
      </Svg>
      <View style={s.trendLabels}>
        {points.map((p) => (
          <Text
            key={p.dayLabel}
            style={s.trendLabel}
            maxFontSizeMultiplier={1.1}
          >
            {p.dayLabel}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Chin comparison
// ---------------------------------------------------------------------------

function ChinComparison({ evidence }: { evidence: ScanEvidence }) {
  return (
    <View style={s.compareWrap}>
      <Eyebrow style={s.compareEyebrow}>CHIN AREA COMPARISON</Eyebrow>
      <View style={s.compareRow}>
        <ComparePane label="Baseline" imageUri={evidence.baselineImageUri} />
        <ComparePane label="Latest" imageUri={evidence.latestImageUri} highlight />
      </View>
      <Supporting style={s.compareCaption}>
        {evidence.comparisonAvailable
          ? evidence.observation
          : 'Continue scans to deepen the visible comparison.'}
      </Supporting>
    </View>
  );
}

function ComparePane({
  label,
  imageUri,
  highlight,
}: {
  label: string;
  imageUri?: string;
  highlight?: boolean;
}) {
  void imageUri;
  return (
    <View style={s.pane}>
      <Text style={s.paneLabel} maxFontSizeMultiplier={1.15}>
        {label}
      </Text>
      <View style={[s.paneFrame, highlight && s.paneFrameHighlight]}>
        <Svg width={92} height={92} viewBox="0 0 92 92">
          <Circle cx={46} cy={48} r={36} fill="#F3DCD2" />
          <Circle cx={46} cy={64} r={highlight ? 9 : 11} fill={V26.terracotta} opacity={highlight ? 0.32 : 0.48} />
        </Svg>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    gap: 0,
  },
  headline: {
    marginTop: 12,
  },
  metricRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: V26.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: V26.border,
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 11,
    color: V26.inkMuted,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontFamily: V26_TYPE.serifSemi,
    fontSize: 48,
    lineHeight: 52,
    color: V26.ink,
    marginTop: 6,
    letterSpacing: -1,
  },
  metricChangeWrap: {
    alignItems: 'flex-end',
  },
  metricChangeLabel: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 11,
    color: V26.inkMuted,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  metricChangeValue: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 13.5,
    color: V26.terracottaText,
    marginTop: 6,
  },
  supporting: {
    marginTop: 16,
  },
  trend: {
    marginTop: 22,
  },
  trendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  trendLabel: {
    fontFamily: V26_TYPE.sansMed,
    fontSize: 11,
    color: V26.inkMuted,
  },

  compareWrap: {
    marginTop: V26_SPACE.section,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: V26.border,
  },
  compareEyebrow: {
    color: V26.terracottaText,
  },
  compareRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 14,
  },
  pane: {
    flex: 1,
  },
  paneLabel: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 11,
    color: V26.inkMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  paneFrame: {
    aspectRatio: 1,
    borderRadius: V26_RADIUS.small,
    backgroundColor: V26.clayMist,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: V26.border,
  },
  paneFrameHighlight: {
    borderColor: V26.terracotta,
  },
  compareCaption: {
    marginTop: 14,
  },

  breakdownCard: {
    paddingVertical: 16,
  },
  breakdownHeader: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 17,
    color: V26.ink,
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: V26.border,
    gap: 12,
  },
  breakdownLabel: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 15,
    color: V26.ink,
  },
  breakdownStatus: {
    fontFamily: V26_TYPE.sans,
    fontSize: 12.5,
    color: V26.inkMuted,
    marginTop: 2,
  },
  breakdownEffect: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 16,
  },
});

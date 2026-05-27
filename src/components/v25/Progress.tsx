import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Card, PrimaryButton, TextAction } from './Surfaces';
import { SemanticBadge, type BadgeVariant } from './SemanticBadge';
import {
  SectionLabel,
  BodyPrimary,
  BodyFunctional,
  CardHeadline,
  SkinScoreNumber,
} from './Typography';
import { T, TYPE, RADIUS, SPACE } from './tokens';
import type { SkinSignal } from '@/state/v25/types';

/**
 * v25 — Progress primitives.
 *
 *   • SkinScoreHero    — single 0–100 metric, three states.
 *   • SkinSignalRow    — interpretation + next action; status badge.
 *   • ScoreComparisonCard — direct baseline vs latest comparison.
 *   • ScanQualityAlert — failed-latest insert.
 */

// ---------------------------------------------------------------------------
// Skin score hero
// ---------------------------------------------------------------------------

export type SkinScoreVariant =
  | 'reliable-comparison'
  | 'baseline-only'
  | 'failed-latest';

interface SkinScoreHeroProps {
  variant: SkinScoreVariant;
  score: number;
  /** Optional change vs baseline. Used in reliable-comparison only. */
  delta?: number;
  interpretation: string;
  reliableScanCount: number;
}

export function SkinScoreHero({
  variant,
  score,
  delta,
  interpretation,
  reliableScanCount,
}: SkinScoreHeroProps) {
  const eyebrow =
    variant === 'failed-latest' ? 'LAST RELIABLE SKIN SCORE' : 'SKIN SCORE';
  return (
    <Card tone="surface" hero elevated style={s.scoreCard}>
      <SectionLabel style={s.scoreEyebrow}>{eyebrow}</SectionLabel>
      <View style={s.scoreCenter}>
        <ScoreArc value={score} />
        <View style={s.scoreNumberWrap}>
          <SkinScoreNumber>{String(score)}</SkinScoreNumber>
          <Text style={s.scoreScale}>out of 100</Text>
        </View>
      </View>
      <View style={s.scoreFooter}>
        {variant === 'reliable-comparison' && typeof delta === 'number' ? (
          <SemanticBadge
            variant={delta >= 0 ? 'improving' : 'focus'}
            label={
              delta > 0
                ? `↑ +${delta} since baseline`
                : delta < 0
                ? `↓ ${delta} since baseline`
                : 'No change since baseline'
            }
          />
        ) : variant === 'baseline-only' ? (
          <SemanticBadge variant="stable" label="Baseline established" />
        ) : (
          <SemanticBadge variant="not-counted" label="Today’s scan not counted" />
        )}
        <BodyPrimary style={s.scoreInterpretation}>
          {interpretation}
        </BodyPrimary>
        <Text style={s.scoreMeta} maxFontSizeMultiplier={1.2}>
          Based on {reliableScanCount} reliable scan
          {reliableScanCount === 1 ? '' : 's'}
        </Text>
      </View>
    </Card>
  );
}

function ScoreArc({ value }: { value: number }) {
  const size = 156;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const centre = size / 2;
  const arcSpan = 240; // degrees
  const start = -210; // top-left
  const circumference = 2 * Math.PI * radius;
  const visiblePortion = arcSpan / 360;
  const dashTrack = circumference;
  const filled = Math.max(0, Math.min(1, value / 100));
  return (
    <Svg width={size} height={size}>
      <G rotation={start} originX={centre} originY={centre}>
        <Circle
          cx={centre}
          cy={centre}
          r={radius}
          stroke={T.line}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${visiblePortion * circumference} ${dashTrack}`}
        />
        <Circle
          cx={centre}
          cy={centre}
          r={radius}
          stroke={T.terracotta}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${
            visiblePortion * circumference * filled
          } ${dashTrack}`}
        />
      </G>
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// SkinSignalRow
// ---------------------------------------------------------------------------

interface SkinSignalRowProps {
  signal: SkinSignal;
  last?: boolean;
}

export function SkinSignalRow({ signal, last }: SkinSignalRowProps) {
  const variant: BadgeVariant =
    signal.status === 'focus'
      ? 'focus'
      : signal.status === 'improving'
      ? 'improving'
      : signal.status === 'stable'
      ? 'stable'
      : 'need-more-data';
  return (
    <View style={[s.signalRow, last && { borderBottomWidth: 0 }]}>
      <View style={s.signalHead}>
        <Text style={s.signalTitle} maxFontSizeMultiplier={1.2}>
          {signal.label}
        </Text>
        <SemanticBadge variant={variant} />
      </View>
      <Text style={s.signalInterp} maxFontSizeMultiplier={1.25}>
        {signal.interpretation}
      </Text>
      <Text style={s.signalNext} maxFontSizeMultiplier={1.25}>
        Next: {signal.nextAction}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ScoreComparisonCard
// ---------------------------------------------------------------------------

interface ScoreComparisonProps {
  baselineDay: string;
  baselineScore: number;
  latestDay: string;
  latestScore: number;
  driver: string;
}

export function ScoreComparisonCard({
  baselineDay,
  baselineScore,
  latestDay,
  latestScore,
  driver,
}: ScoreComparisonProps) {
  const delta = latestScore - baselineScore;
  return (
    <Card tone="raised" style={s.comparisonCard}>
      <SectionLabel style={{ marginBottom: 14 }}>SCORE CHANGE</SectionLabel>
      <View style={s.comparisonRow}>
        <View style={s.comparisonCell}>
          <Text style={s.comparisonEyebrow} maxFontSizeMultiplier={1.15}>
            BASELINE
          </Text>
          <Text style={s.comparisonDay} maxFontSizeMultiplier={1.2}>
            {baselineDay}
          </Text>
          <Text style={s.comparisonNum} maxFontSizeMultiplier={1.15}>
            {baselineScore}
          </Text>
        </View>
        <View style={s.comparisonArrowWrap}>
          <Text style={s.comparisonArrow}>
            {delta > 0 ? '↑' : delta < 0 ? '↓' : '—'}
          </Text>
          <Text style={s.comparisonDelta}>
            {delta > 0 ? `+${delta}` : `${delta}`}
          </Text>
        </View>
        <View style={[s.comparisonCell, { alignItems: 'flex-end' }]}>
          <Text style={s.comparisonEyebrow} maxFontSizeMultiplier={1.15}>
            LATEST RELIABLE
          </Text>
          <Text style={s.comparisonDay} maxFontSizeMultiplier={1.2}>
            {latestDay}
          </Text>
          <Text style={s.comparisonNum} maxFontSizeMultiplier={1.15}>
            {latestScore}
          </Text>
        </View>
      </View>
      <BodyPrimary style={s.comparisonBody}>
        {delta > 0
          ? `↑ +${delta} points since baseline. ${driver}`
          : delta < 0
          ? `↓ ${delta} since baseline. ${driver}`
          : `Your score is steady since baseline. ${driver}`}
      </BodyPrimary>
      <Text style={s.comparisonNote} maxFontSizeMultiplier={1.25}>
        A full trend chart appears after 4 reliable scans.
      </Text>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ScanQualityAlert
// ---------------------------------------------------------------------------

interface ScanQualityAlertProps {
  variant?: 'progress' | 'home';
  onRetake: () => void;
  onTips?: () => void;
  onLastReliable?: () => void;
}

export function ScanQualityAlert({
  variant = 'progress',
  onRetake,
  onTips,
  onLastReliable,
}: ScanQualityAlertProps) {
  return (
    <Card tone="failed" style={s.alertCard}>
      <SectionLabel style={s.alertEyebrow}>
        {variant === 'progress'
          ? 'TODAY’S SCAN WAS NOT COUNTED'
          : 'SCAN NOT COUNTED'}
      </SectionLabel>
      <CardHeadline style={s.alertHeadline}>
        {variant === 'progress'
          ? 'Retake to update your score'
          : 'Retake needed for\naccurate results'}
      </CardHeadline>
      <BodyPrimary style={s.alertBody}>
        {variant === 'progress'
          ? 'Lighting and framing prevented an accurate comparison. Your Skin Score remains based on your last reliable scan.'
          : 'Lighting and framing prevented a reliable comparison. Your routine and Skin Score were not updated.'}
      </BodyPrimary>
      <BodyFunctional style={s.alertGuidance}>
        Retake your scan in bright, even light with your full face centered.
      </BodyFunctional>
      <PrimaryButton
        label="Retake scan"
        onPress={onRetake}
        variant="terracotta"
        style={{ marginTop: 8 }}
      />
      <View style={s.alertSecondaryRow}>
        {onTips ? (
          <TextAction label="View capture tips" onPress={onTips} />
        ) : null}
        {onLastReliable ? (
          <TextAction
            label="Use last reliable routine"
            onPress={onLastReliable}
          />
        ) : null}
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  scoreCard: {
    alignItems: 'center',
    paddingHorizontal: SPACE.heroPad,
  },
  scoreEyebrow: { marginBottom: 16 },
  scoreCenter: {
    width: 168,
    height: 168,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumberWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  scoreScale: {
    fontFamily: TYPE.sansMed,
    fontSize: 12,
    letterSpacing: 0.4,
    color: T.inkMuted,
    marginTop: 6,
  },
  scoreFooter: {
    marginTop: 18,
    alignItems: 'center',
    gap: 10,
  },
  scoreInterpretation: {
    color: T.inkSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  scoreMeta: {
    fontFamily: TYPE.sansMed,
    fontSize: 12,
    color: T.inkMuted,
  },
  signalRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.line,
  },
  signalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  signalTitle: {
    fontFamily: TYPE.sansSemi,
    fontSize: 15,
    color: T.ink,
  },
  signalInterp: {
    fontFamily: TYPE.sans,
    fontSize: 14,
    lineHeight: 20,
    color: T.inkSecondary,
  },
  signalNext: {
    fontFamily: TYPE.sansMed,
    fontSize: 13,
    lineHeight: 18,
    color: T.inkMuted,
    marginTop: 4,
  },
  comparisonCard: {
    gap: 10,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  comparisonCell: { flex: 1 },
  comparisonEyebrow: {
    fontFamily: TYPE.sansSemi,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: T.inkMuted,
  },
  comparisonDay: {
    fontFamily: TYPE.sansMed,
    fontSize: 12,
    color: T.inkSecondary,
    marginTop: 4,
  },
  comparisonNum: {
    fontFamily: TYPE.serifSemi,
    fontSize: 36,
    color: T.ink,
    marginTop: 6,
  },
  comparisonArrowWrap: {
    alignItems: 'center',
    width: 64,
  },
  comparisonArrow: {
    fontFamily: TYPE.sansSemi,
    fontSize: 22,
    color: T.terracotta,
  },
  comparisonDelta: {
    fontFamily: TYPE.sansSemi,
    fontSize: 13,
    color: T.terracottaDeep,
    marginTop: 2,
  },
  comparisonBody: {
    color: T.inkSecondary,
  },
  comparisonNote: {
    fontFamily: TYPE.sans,
    fontSize: 12.5,
    color: T.inkMuted,
    marginTop: 4,
  },
  alertCard: {
    gap: 12,
  },
  alertEyebrow: { color: T.terracottaDeep, marginBottom: 6 },
  alertHeadline: { color: T.ink },
  alertBody: { color: T.inkSecondary },
  alertGuidance: { color: T.terracottaDeep },
  alertSecondaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
});

/**
 * DailyInsightHero — the Routine sub-tab's lead card.
 *
 * Answers "what is today's focus, and why?" in one card. Reads from the
 * canonical insight + plan. Replaces the empty "Build your routine
 * around what your skin needs" headline that made the Routine tab feel
 * passive.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, ArrowUp, ArrowDown, Minus, Camera } from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import type { ProgressRoutineInsight } from '@/state/progressRoutineInsight';
import type { RoutinePlan } from '@/state/routinePlan';

interface Props {
  insight: ProgressRoutineInsight;
  plan: RoutinePlan;
  /** Tapping the "View scan read" CTA switches the top tab to Progress. */
  onViewScanRead: () => void;
  /** Tapping "Retake scan" navigates to the camera. */
  onRetakeScan: () => void;
}

export function DailyInsightHero({
  insight,
  plan,
  onViewScanRead,
  onRetakeScan,
}: Props) {
  const showScore = insight.hasScanned && insight.score !== null;
  const showRetake = insight.confidenceCaveat;

  const delta = insight.deltaLabel;
  const isUp = delta?.startsWith('+');
  const isDown = delta?.startsWith('-');
  const DeltaIcon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;
  const deltaColor = isUp
    ? palette.mossDeep
    : isDown
    ? palette.rust
    : palette.inkSecondary;
  const deltaBg = isUp
    ? palette.mossLight
    : isDown
    ? palette.rustLight
    : palette.bgDeep;

  return (
    <View style={styles.card}>
      <View style={styles.rail} pointerEvents="none" />

      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        TODAY’S FOCUS
      </Text>

      <Text
        style={styles.headline}
        maxFontSizeMultiplier={1.15}
        numberOfLines={2}
      >
        {plan.focusLabel}
      </Text>

      <Text
        style={styles.body}
        maxFontSizeMultiplier={1.2}
        numberOfLines={4}
      >
        {plan.focusBody}
      </Text>

      {insight.chips.length > 0 ? (
        <View style={styles.chipRow}>
          {insight.chips.slice(0, 3).map((c) => (
            <View key={c.label} style={[styles.chip, chipBg(c.tone)]}>
              <Text
                style={[styles.chipText, { color: chipFg(c.tone) }]}
                maxFontSizeMultiplier={1.1}
              >
                {c.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {showScore ? (
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel} maxFontSizeMultiplier={1.1}>
            SKIN SCORE
          </Text>
          <Text style={styles.scoreValue} maxFontSizeMultiplier={1.15}>
            {insight.score}
          </Text>
          <Text style={styles.scoreBand} maxFontSizeMultiplier={1.1}>
            {insight.scoreBand}
          </Text>
          {delta ? (
            <View style={[styles.deltaPill, { backgroundColor: deltaBg }]}>
              <DeltaIcon size={11} color={deltaColor} weight="bold" />
              <Text
                style={[styles.deltaValue, { color: deltaColor }]}
                maxFontSizeMultiplier={1.1}
                numberOfLines={1}
              >
                {delta}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.ctaRow}>
        {showRetake ? (
          <Pressable
            onPress={() => {
              hapt.tap();
              onRetakeScan();
            }}
            accessibilityRole="button"
            accessibilityLabel="Retake scan for sharper routine"
            style={({ pressed }) => [
              styles.primaryCta,
              pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
            ]}
          >
            <Camera size={14} color={palette.inkInverse} weight="duotone" />
            <Text style={styles.primaryCtaText} maxFontSizeMultiplier={1.15}>
              Retake scan
            </Text>
          </Pressable>
        ) : insight.hasScanned ? (
          <Pressable
            onPress={() => {
              hapt.select();
              onViewScanRead();
            }}
            accessibilityRole="button"
            accessibilityLabel="View today’s scan read"
            style={({ pressed }) => [
              styles.secondaryCta,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.secondaryCtaText} maxFontSizeMultiplier={1.15}>
              View today’s scan read
            </Text>
            <ArrowRight size={13} color={palette.inkSecondary} weight="bold" />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              hapt.tap();
              onRetakeScan();
            }}
            accessibilityRole="button"
            accessibilityLabel="Start your first scan"
            style={({ pressed }) => [
              styles.primaryCta,
              pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
            ]}
          >
            <Camera size={14} color={palette.inkInverse} weight="duotone" />
            <Text style={styles.primaryCtaText} maxFontSizeMultiplier={1.15}>
              Start your first scan
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function chipBg(tone: 'good' | 'warning' | 'neutral') {
  switch (tone) {
    case 'good':
      return {
        backgroundColor: palette.mossLight,
        borderColor: palette.moss,
      };
    case 'warning':
      return {
        backgroundColor: palette.amberLight,
        borderColor: palette.amber,
      };
    case 'neutral':
      return {
        backgroundColor: palette.bgDeep,
        borderColor: palette.hairline,
      };
  }
}

function chipFg(tone: 'good' | 'warning' | 'neutral'): string {
  switch (tone) {
    case 'good':
      return palette.mossDeep;
    case 'warning':
      return palette.amberDeep;
    case 'neutral':
      return palette.inkSecondary;
  }
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    marginHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: palette.clayPaper,
    borderWidth: 1,
    borderColor: palette.clayLight,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: palette.clay,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  rail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
    backgroundColor: palette.clay,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 8,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
    marginBottom: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.clayLight,
    marginBottom: 4,
  },
  scoreLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    letterSpacing: -0.6,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  scoreBand: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    letterSpacing: -0.1,
    color: palette.inkSecondary,
    flex: 1,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  deltaValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  primaryCta: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  secondaryCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkSecondary,
  },
});

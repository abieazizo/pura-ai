/**
 * AIRoutineSuggestionPanel — surfaces AI-generated steps for the
 * currently active slot. Only renders when AI has actually returned a
 * structured `RoutineRecommendation` AND has steps for this slot — so
 * the panel's presence is itself an honest signal that the AI ran.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import type { InnerSegment } from '@/screens/routine/lib';

interface Props {
  segment: InnerSegment;
}

export function AIRoutineSuggestionPanel({ segment }: Props) {
  const aiRoutine = useAppStore((s) => s.aiRoutine);
  if (!aiRoutine) return null;
  if (segment === 'saved') return null;
  const steps = segment === 'morning' ? aiRoutine.morning : aiRoutine.evening;
  if (steps.length === 0) return null;

  const headline =
    aiRoutine.headline && aiRoutine.headline.trim().length > 0
      ? aiRoutine.headline
      : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.rail} pointerEvents="none" />
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        AI SUGGESTS
      </Text>
      {headline ? (
        <Text
          style={styles.headline}
          maxFontSizeMultiplier={1.15}
          numberOfLines={2}
        >
          {headline}
        </Text>
      ) : null}
      {steps.slice(0, 4).map((step, i) => (
        <View key={`${step.title}-${i}`} style={styles.stepRow}>
          <Text style={styles.stepNum} maxFontSizeMultiplier={1.1}>
            {step.step_order || i + 1}
          </Text>
          <View style={{ flex: 1 }}>
            <Text
              style={styles.stepTitle}
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
            >
              {step.title}
            </Text>
            {step.reason && step.reason.trim().length > 0 ? (
              <Text
                style={styles.stepReason}
                numberOfLines={4}
                maxFontSizeMultiplier={1.2}
              >
                {step.reason}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 28,
    marginHorizontal: 20,
    paddingVertical: 18,
    paddingLeft: 19,
    paddingRight: 18,
    borderRadius: 18,
    backgroundColor: palette.clayPaper,
    position: 'relative',
    overflow: 'hidden',
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: palette.clay,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clay,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: palette.ink,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  stepNum: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.4,
    color: palette.clay,
    width: 18,
    fontVariant: ['tabular-nums'],
  },
  stepTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: palette.ink,
  },
  // v23.0 — long functional reasons read as utility copy, not
  // italic editorial. Inter Regular at 13/19 lands as readable
  // instruction text per the trust-first principle.
  stepReason: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    marginTop: 4,
  },
});

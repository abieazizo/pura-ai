/**
 * PausedRoutineStep — the signature "tonight, do less" moment.
 *
 * A single product step rendered with a soft terracotta wash and a
 * quiet "Paused tonight" tag. No red error styling, no dramatic
 * strike-through — the spec is explicit that the visual must
 * communicate protection, not failure.
 *
 * v26.3 — the marker dot ring quietly pulses (opacity 0.55 → 1.0 →
 * 0.55 over 4s) to signal "this isn't forever — we'll check back."
 * Reduce Motion holds the ring at full opacity without movement.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { pura26 } from '@/screens/home/homeTokens';

export interface PausedRoutineStepProps {
  /** Product step that was paused tonight ("Retinoid serum"). */
  stepName: string;
  /**
   * Plain-English reason ("Your chin is showing visible sensitivity.").
   * Phrased in appearance language, never diagnostic.
   */
  reason: string;
}

export function PausedRoutineStep({
  stepName,
  reason,
}: PausedRoutineStepProps) {
  const reduceMotion = useReduceMotion();
  const ringPulse = useSharedValue(0.55);

  useEffect(() => {
    if (reduceMotion) {
      ringPulse.value = 1;
      return;
    }
    ringPulse.value = withRepeat(
      withSequence(
        withTiming(1.0, {
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0.55, {
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      false
    );
    return () => cancelAnimation(ringPulse);
  }, [reduceMotion, ringPulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringPulse.value,
  }));

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${stepName} paused tonight. ${reason}`}
      style={styles.wrap}
    >
      <View style={styles.markerColumn}>
        <View style={styles.dot} />
        <Animated.View style={[styles.dotRing, ringStyle]} />
      </View>
      <View style={styles.body}>
        <Text style={styles.tag} maxFontSizeMultiplier={1.1}>
          PAUSED TONIGHT
        </Text>
        <Text style={styles.stepName} maxFontSizeMultiplier={1.15}>
          {stepName}
        </Text>
        <Text style={styles.reason} maxFontSizeMultiplier={1.2}>
          {reason}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 18,
    paddingVertical: 20,
    paddingHorizontal: 22,
    backgroundColor: pura26.terracottaSoft,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: pura26.terracottaTint,
  },
  markerColumn: {
    width: 22,
    alignItems: 'center',
    paddingTop: 8,
    position: 'relative',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: pura26.terracotta,
    opacity: 0.55,
  },
  dotRing: {
    position: 'absolute',
    top: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: pura26.pausedMarkerRingBorder,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  tag: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 1.8,
    color: pura26.terracottaText,
  },
  stepName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: pura26.terracottaText,
    opacity: 0.78,
  },
  reason: {
    fontFamily: 'Inter-Regular',
    fontSize: 14.5,
    lineHeight: 21,
    color: pura26.inkSecondary,
  },
});

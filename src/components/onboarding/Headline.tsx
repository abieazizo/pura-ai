import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/theme';

export interface QuestionHeadlineProps {
  children: string;
}

/**
 * Editorial onboarding headline (§2.4). Instrument Serif 40pt, left-aligned,
 * 24pt horizontal margin, 32pt top margin from the progress bar. Entrance:
 * opacity 0 → 1 + translateY 12 → 0 over 400ms ease-out, 100ms delay.
 */
export function QuestionHeadline({ children }: QuestionHeadlineProps) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(
      100,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    y.value = withDelay(
      100,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
  }, [opacity, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.Text
      style={[styles.text, style]}
      maxFontSizeMultiplier={1.15}
      accessibilityRole="header"
      numberOfLines={2}
    >
      {children}
    </Animated.Text>
  );
}

export interface QuestionSubheadProps {
  children: string;
}

/**
 * Onboarding subhead. Instrument Serif italic 17pt @ 70% ink. 12pt below
 * the headline. Entrance staggered 180ms.
 */
export function QuestionSubhead({ children }: QuestionSubheadProps) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(
      180,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    y.value = withDelay(
      180,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
  }, [opacity, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.Text style={[subStyles.text, style]} maxFontSizeMultiplier={1.2}>
      {children}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    // v7.5 — 36pt headline, max 2 lines. Dropped from 40.
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 36,
    lineHeight: 36 * 1.05,
    letterSpacing: -0.7,
    color: palette.ink,
    marginHorizontal: 24,
    marginTop: 32,
  },
});

const subStyles = StyleSheet.create({
  text: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    lineHeight: 17 * 1.35,
    color: 'rgba(26,22,20,0.7)',
    marginHorizontal: 24,
    marginTop: 12,
  },
});

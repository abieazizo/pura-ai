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
 * v20.0 — onboarding headline. Instrument Serif 32pt, two-line cap, left-
 * aligned, animates in over 400ms ease-out (100ms delay).
 *
 * Dropped from 36 → 32pt vs v7.5: the new flow uses richer subheads and
 * has more questions per screen, so the headline + subhead block must
 * stay short enough to leave room for option cards on iPhone 13 mini /
 * iPhone SE.
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
      numberOfLines={3}
    >
      {children}
    </Animated.Text>
  );
}

export interface QuestionSubheadProps {
  children: string;
}

/**
 * v20.0 — onboarding subhead. Sans-serif 15pt @ inkSecondary so the
 * functional helper text doesn't read as low-contrast italic. Editorial
 * italic is reserved for the emotional brand moments (Welcome,
 * PlanReveal, Paywall headline).
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
    <Animated.Text
      style={[subStyles.text, style]}
      maxFontSizeMultiplier={1.25}
    >
      {children}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: palette.ink,
    marginHorizontal: 24,
    marginTop: 28,
  },
});

const subStyles = StyleSheet.create({
  text: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSecondary,
    marginHorizontal: 24,
    marginTop: 10,
  },
});

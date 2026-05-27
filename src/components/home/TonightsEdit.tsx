/**
 * TonightsEdit — the editorial decision panel.
 *
 * "An Edit is the intelligent decision to keep a step, remove a step,
 *  pause a step, simplify a routine, gently reintroduce a product, or
 *  decide that no change is needed."
 *
 * The component is a layout shell: callers pass in the eyebrow
 * ("Tonight's Edit"), the headline ("No changes tonight." / "Retinoid
 * paused."), the optional belief line ("Do not chase faster results."),
 * and the body content.
 *
 * The header pieces (eyebrow → headline → belief) stagger in over
 * 360ms so the eye moves through them deliberately. Reduce Motion
 * collapses the stagger to a single short fade. Reads only from
 * `pura26` tokens.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { pura26 } from '@/screens/home/homeTokens';

export interface TonightsEditProps {
  eyebrow?: string;
  headline: string;
  /** A quiet principle line — e.g. "Do not chase faster results." */
  belief?: string;
  children?: React.ReactNode;
}

export function TonightsEdit({
  eyebrow = "TONIGHT'S EDIT",
  headline,
  belief,
  children,
}: TonightsEditProps) {
  return (
    <View style={styles.wrap}>
      <Stagger delay={0}>
        <Text
          accessibilityRole="text"
          style={styles.eyebrow}
          maxFontSizeMultiplier={1.1}
        >
          {eyebrow}
        </Text>
      </Stagger>
      <Stagger delay={120}>
        <Text
          accessibilityRole="header"
          style={styles.headline}
          maxFontSizeMultiplier={1.15}
        >
          {headline}
        </Text>
      </Stagger>
      {belief ? (
        <Stagger delay={260}>
          <Text style={styles.belief} maxFontSizeMultiplier={1.15}>
            {belief}
          </Text>
        </Stagger>
      ) : null}
      {children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

function Stagger({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) {
  const reduceMotion = useReduceMotion();
  const op = useSharedValue(0);
  const ty = useSharedValue(6);
  useEffect(() => {
    const dur = reduceMotion ? 200 : 540;
    const d = reduceMotion ? 0 : delay;
    op.value = withDelay(
      d,
      withTiming(1, { duration: dur, easing: Easing.bezier(0.22, 1, 0.36, 1) })
    );
    ty.value = withDelay(
      d,
      withTiming(0, { duration: dur, easing: Easing.bezier(0.22, 1, 0.36, 1) })
    );
  }, [reduceMotion, delay, op, ty]);
  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 32,
    paddingTop: 10,
    paddingBottom: 12,
  },
  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 2.6,
    color: pura26.inkMuted,
    marginBottom: 14,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.6,
    color: pura26.ink,
  },
  belief: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 19,
    lineHeight: 26,
    color: pura26.inkSecondary,
    marginTop: 12,
    letterSpacing: -0.1,
  },
  body: {
    marginTop: 28,
    gap: 24,
  },
});

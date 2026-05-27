/**
 * BreathSignature — a single quiet warm dot at the bottom of the
 * post-scan reveal.
 *
 * Acts as a visual punctuation mark on the staged reveal: after the
 * headline → supporting → decision → body sequence completes, this
 * tiny dot fades in and breathes faintly. Reads as Pura saying "I'm
 * still here." Never loud, never interactive.
 *
 * Reduce Motion: the dot still appears at full opacity but does not
 * breathe.
 *
 * Reads only from `pura26` tokens.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { pura26 } from '@/screens/home/homeTokens';

export interface BreathSignatureProps {
  /** ms before the dot begins fading in. */
  enterDelay?: number;
}

export function BreathSignature({ enterDelay = 0 }: BreathSignatureProps) {
  const reduceMotion = useReduceMotion();
  const op = useSharedValue(0);
  const breath = useSharedValue(0.5);

  useEffect(() => {
    const dur = reduceMotion ? 220 : 720;
    op.value = withDelay(
      reduceMotion ? 0 : enterDelay,
      withTiming(1, { duration: dur, easing: Easing.bezier(0.22, 1, 0.36, 1) })
    );
    if (!reduceMotion) {
      breath.value = withDelay(
        enterDelay + 600,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.5, { duration: 2400, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          false
        )
      );
    } else {
      breath.value = 0.75;
    }
    return () => cancelAnimation(breath);
  }, [reduceMotion, enterDelay, op, breath]);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
  }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: breath.value,
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.wrap, style]}
    >
      <Animated.View style={[styles.dot, dotStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: pura26.terracotta,
  },
});

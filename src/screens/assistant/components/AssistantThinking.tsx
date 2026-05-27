import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Sparkle } from 'phosphor-react-native';
import { dx } from '../decisionTokens';
import { useReduceMotion } from '@/hooks/useReduceMotion';

/**
 * Three-dot "Pura is checking…" row. Used briefly between a sent
 * message and the assistant card so the reveal feels intentional
 * rather than instantaneous.
 */
export function AssistantThinking() {
  const reduceMotion = useReduceMotion();
  const d1 = useSharedValue(0.25);
  const d2 = useSharedValue(0.25);
  const d3 = useSharedValue(0.25);

  useEffect(() => {
    if (reduceMotion) {
      d1.value = 1;
      d2.value = 1;
      d3.value = 1;
      return;
    }
    const cycle = (sv: typeof d1, delay: number) => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, {
              duration: 380,
              easing: Easing.bezier(0.4, 0, 0.2, 1),
            }),
            withTiming(0.25, {
              duration: 380,
              easing: Easing.bezier(0.4, 0, 0.2, 1),
            }),
          ),
          -1,
          false,
        ),
      );
    };
    cycle(d1, 0);
    cycle(d2, 140);
    cycle(d3, 280);
    return () => {
      cancelAnimation(d1);
      cancelAnimation(d2);
      cancelAnimation(d3);
    };
  }, [reduceMotion, d1, d2, d3]);

  const s1 = useAnimatedStyle(() => ({ opacity: d1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: d2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: d3.value }));

  return (
    <View style={styles.row} accessibilityLabel="Pura is checking…">
      <Sparkle size={12} color={dx.terracotta} weight="duotone" />
      <View style={styles.dots}>
        <Animated.View style={[styles.dot, s1]} />
        <Animated.View style={[styles.dot, s2]} />
        <Animated.View style={[styles.dot, s3]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  dots: { flexDirection: 'row', gap: 4 },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: dx.terracotta,
  },
});

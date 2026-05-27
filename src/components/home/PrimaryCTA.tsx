/**
 * PrimaryCTA — the home screen's terracotta pill.
 *
 * Used by both the post-scan layouts ("Begin recovery night", "Begin
 * tonight's routine") and the recovery-night fallback. Press feedback
 * is richer than a generic Pressable: the pill compresses to 0.985,
 * the warm shadow softens, and the inner color settles into the
 * pressed terracotta. Reduce Motion keeps the static visual.
 *
 * Reads only from `pura26` tokens.
 */

import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hapt } from '@/utils/haptics';
import { pura26 } from '@/screens/home/homeTokens';

export interface PrimaryCTAProps {
  label: string;
  onPress: () => void;
}

export function PrimaryCTA({ label, onPress }: PrimaryCTAProps) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const press = useSharedValue(0); // 0 = idle, 1 = pressed

  const onPressIn = () => {
    if (reduceMotion) return;
    scale.value = withTiming(0.985, { duration: 140 });
    press.value = withTiming(1, { duration: 140 });
  };
  const onPressOut = () => {
    if (reduceMotion) return;
    scale.value = withTiming(1, {
      duration: 260,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
    press.value = withTiming(0, { duration: 280 });
  };

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    // Slightly soften the shadow while pressed — feels like the
    // button is sinking into the surface, not lifting off it.
    shadowOpacity: 0.22 - press.value * 0.08,
    backgroundColor:
      press.value > 0.5 ? pura26.terracottaPressed : pura26.terracotta,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        hapt.tap();
        onPress();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={6}
    >
      <Animated.View style={[styles.pill, containerStyle]}>
        <Text style={styles.label} maxFontSizeMultiplier={1.1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 58,
    borderRadius: 999,
    backgroundColor: pura26.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: pura26.terracottaText,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: pura26.surface,
    letterSpacing: 0.1,
  },
});

/**
 * PressableScale — the press-feedback foundation (Cycle 2).
 *
 * Every tappable surface in the elevated app should feel physical: a tight
 * spring scale-down on press-in, a settle back on release, and a haptic on the
 * commit. This is the one place that behavior lives so it's identical app-wide.
 * Reduce-motion swaps the scale for a quiet opacity dip.
 */
import React, { useCallback } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  type GestureResponderEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { dsSpring } from '@/theme';
import { hapt, type HapticKind } from '@/utils/haptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps
  extends Omit<PressableProps, 'style' | 'children'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale at full press. Default 0.97. Larger targets want a subtler dip. */
  scaleTo?: number;
  /** Haptic fired on press commit. Default 'tap'; pass null to silence. */
  haptic?: HapticKind | null;
  disabled?: boolean;
}

export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  haptic = 'tap',
  disabled,
  onPress,
  ...rest
}: PressableScaleProps) {
  const reduce = useReduceMotion();
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => {
    if (reduce) {
      return { opacity: pressed.value ? 0.6 : 1 };
    }
    return {
      transform: [
        { scale: 1 - pressed.value * (1 - scaleTo) },
      ],
    };
  });

  const handleIn = useCallback(() => {
    pressed.value = reduce
      ? withTiming(1, { duration: 80 })
      : withSpring(1, dsSpring.press);
  }, [pressed, reduce]);

  const handleOut = useCallback(() => {
    pressed.value = reduce
      ? withTiming(0, { duration: 120 })
      : withSpring(0, dsSpring.press);
  }, [pressed, reduce]);

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      if (disabled) return;
      if (haptic) hapt[haptic]();
      onPress?.(e);
    },
    [disabled, haptic, onPress]
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handleIn}
      onPressOut={handleOut}
      onPress={handlePress}
      style={[style, animStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

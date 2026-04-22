import React, { useEffect } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import {
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { motion } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export interface AnimatedNumberProps extends Omit<TextProps, 'children'> {
  value: number;
  /** Number of decimals — defaults to 0 (integers). */
  decimals?: number;
  /** Prefix (e.g. "$"). */
  prefix?: string;
  /** Suffix (e.g. "%"). */
  suffix?: string;
  style?: TextStyle;
}

/**
 * Animates from the previous value to the next via a settle curve. On first
 * mount, eases from `value * 0.6` up to `value` so numbers "settle" into
 * place — a premium detail (the "back ease out").
 *
 * Respects reduce-motion — renders the final value immediately.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix,
  suffix,
  style,
  ...rest
}: AnimatedNumberProps) {
  const reduceMotion = useReduceMotion();
  const current = useSharedValue(reduceMotion ? value : Math.round(value * 0.6));
  const [display, setDisplay] = React.useState(current.value);

  useEffect(() => {
    if (reduceMotion) {
      current.value = value;
      setDisplay(value);
      return;
    }
    current.value = withTiming(value, motion.numberSettle);
  }, [value, reduceMotion, current]);

  useAnimatedReaction(
    () => current.value,
    (v) => {
      runOnJS(setDisplay)(v);
    },
    [current]
  );

  const formatted = decimals > 0 ? display.toFixed(decimals) : String(Math.round(display));

  return (
    <Text style={style} maxFontSizeMultiplier={1.1} {...rest}>
      {prefix ?? ''}
      {formatted}
      {suffix ?? ''}
    </Text>
  );
}

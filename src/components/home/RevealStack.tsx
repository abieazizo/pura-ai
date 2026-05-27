/**
 * RevealStack — staggered fade-in for a column of children.
 *
 * Each direct child renders with a calm fade + 6px rise, offset by
 * `gap` ms from its predecessor. Used inside TonightsEdit so the
 * paused step lands, the sub-section label settles, and the recovery
 * routine reveals in deliberate sequence — never as a single block.
 *
 * Reduce Motion replaces the stagger with a single short opacity
 * transition so all children become visible together without movement.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export interface RevealStackProps {
  /** ms between each child entering. Default 240. */
  gap?: number;
  /** ms delay before the first child enters. Default 0. */
  startDelay?: number;
  children: React.ReactNode;
}

export function RevealStack({
  gap = 240,
  startDelay = 0,
  children,
}: RevealStackProps) {
  const items = React.Children.toArray(children);
  return (
    <View style={styles.wrap}>
      {items.map((child, i) => (
        <RevealItem key={i} delay={startDelay + i * gap}>
          {child}
        </RevealItem>
      ))}
    </View>
  );
}

function RevealItem({
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
    gap: 24,
  },
});

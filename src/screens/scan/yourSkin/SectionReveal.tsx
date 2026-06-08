/**
 * SectionReveal — one calm beat. A section fades + rises (y+12 → 0, opacity
 * 0 → 1, ~400ms Easing.out) the first time its top scrolls into view, then stays.
 * The trigger + the animation both live on the UI thread (a `useAnimatedReaction`
 * on the shared scroll position drives a one-time `withTiming`), so a long page
 * of sections stays at 60/120fps with no JS-thread visibility thrash.
 *
 * Reduced Motion → the section is born assembled (opacity 1, no transform, no
 * reaction registered): the page is still complete and beautiful, just still.
 */

import React, { useCallback } from 'react';
import { View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { EASE, REVEAL } from './yourSkinMotion';

export interface SectionRevealProps extends Pick<ViewProps, 'accessibilityRole'> {
  scrollY: SharedValue<number>;
  /** Measured height of the scroll viewport (px). */
  viewportH: number;
  /** Stack order, for a gentle per-section stagger when several arm at once. */
  index?: number;
  reduceMotion: boolean;
  children: React.ReactNode;
  /** Optional extra style on the animated wrapper. */
  style?: ViewProps['style'];
}

export function SectionReveal({
  scrollY,
  viewportH,
  index = 0,
  reduceMotion,
  children,
  style,
  accessibilityRole,
}: SectionRevealProps) {
  const top = useSharedValue(-1); // unknown until laid out
  const played = useSharedValue(reduceMotion ? 1 : 0);
  const armed = useSharedValue(reduceMotion ? 1 : 0);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      top.value = e.nativeEvent.layout.y;
    },
    [top],
  );

  useAnimatedReaction(
    () => {
      if (reduceMotion || armed.value === 1 || top.value < 0 || viewportH <= 0) {
        return false;
      }
      // Arm once the section's top crosses the trigger line.
      return top.value < scrollY.value + viewportH * REVEAL.triggerFraction;
    },
    (inView, prev) => {
      if (inView && prev !== true && armed.value === 0) {
        armed.value = 1;
        played.value = withDelay(
          Math.min(index, 4) * 80,
          withTiming(1, { duration: REVEAL.durMs, easing: EASE.out }),
        );
      }
    },
    [viewportH, reduceMotion, index],
  );

  const aStyle = useAnimatedStyle(() => ({
    opacity: played.value,
    transform: [{ translateY: (1 - played.value) * REVEAL.riseY }],
  }));

  // The OUTER view carries onLayout (stable measured top, unaffected by the
  // transform on the inner animated view).
  return (
    <View onLayout={onLayout} style={style} accessibilityRole={accessibilityRole}>
      <Animated.View style={aStyle}>{children}</Animated.View>
    </View>
  );
}

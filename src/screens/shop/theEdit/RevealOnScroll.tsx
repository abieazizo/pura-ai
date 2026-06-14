/**
 * RevealOnScroll — THE CURATION SET-DOWN, generalized.
 *
 * Each block arrives as if PLACED by a concierge: opacity 0→1 + translateY
 * 16→0 + scale 0.96→1, spring (damping 20, stiffness 180). Blocks already in
 * view on mount stagger by 70ms (the collection leads, then concern sections);
 * blocks below the fold reveal when they cross into view on scroll (the page
 * unfolds as you explore). Worklet-driven; stills under reduce-motion.
 *
 * `onReveal` fires once when the block reveals — sections use it to bloom their
 * finding-echo glow up as they enter.
 */

import React, { useEffect } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { motion } from './tokens';

export function RevealOnScroll({
  scrollY,
  viewportH,
  index,
  reduceMotion,
  onReveal,
  style,
  children,
}: {
  scrollY: SharedValue<number>;
  viewportH: number;
  index: number;
  reduceMotion: boolean;
  onReveal?: () => void;
  style?: object;
  children: React.ReactNode;
}) {
  const revealed = useSharedValue(reduceMotion ? 1 : 0);
  const layoutY = useSharedValue<number | null>(null);
  const fired = useSharedValue(reduceMotion ? 1 : 0);

  const doReveal = (delayMs: number) => {
    'worklet';
    if (fired.value) return;
    fired.value = 1;
    revealed.value = withDelay(delayMs, withSpring(1, motion.setDownSpring));
    if (onReveal) runOnJS(onReveal)();
  };

  useEffect(() => {
    if (reduceMotion && onReveal) onReveal();
  }, [reduceMotion, onReveal]);

  const onLayout = (e: LayoutChangeEvent) => {
    if (reduceMotion) return;
    const y = e.nativeEvent.layout.y;
    layoutY.value = y;
    // Already in view on mount → staggered set-down.
    if (y < viewportH * 0.92) {
      doReveal(index * motion.setDownStaggerMs);
    }
  };

  // Below-the-fold blocks reveal as they cross into view on scroll.
  useAnimatedReaction(
    () => scrollY.value,
    (sy) => {
      if (fired.value || layoutY.value == null) return;
      if (sy + viewportH - 64 > layoutY.value) doReveal(0);
    },
  );

  const animStyle = useAnimatedStyle(() => ({
    opacity: revealed.value,
    transform: [
      { translateY: (1 - revealed.value) * 16 },
      { scale: 0.96 + revealed.value * 0.04 },
    ],
  }));

  return (
    <Animated.View onLayout={onLayout} style={[style, animStyle]}>
      {children}
    </Animated.View>
  );
}

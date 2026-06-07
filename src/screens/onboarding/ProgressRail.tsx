/**
 * ProgressRail — a thin glass rail (overlay) tinted by the orb's aura.
 *
 * A BAR, never countable dots: the count is hidden so the questionnaire's
 * length never intimidates. On a question completing, the fill EASES to the new
 * position (~500ms) with a tiny soft glow (the aura color) at the leading edge.
 * The fill is a UI-thread `scaleX` from the left — we never animate width.
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

export interface ProgressRailProps {
  /** Fill at entry (the prior question's position). */
  from: number; // 0..1
  /** Fill to ease to (this question's position). */
  to: number; // 0..1
  accent: string;
  trackColor: string;
  trackWidth: number;
  reduceMotion: boolean;
}

export function ProgressRail({ from, to, accent, trackColor, trackWidth, reduceMotion }: ProgressRailProps) {
  const fill = useSharedValue(Math.max(0.02, from));

  useEffect(() => {
    const target = Math.max(0.02, to);
    if (reduceMotion) {
      fill.value = target;
      return;
    }
    // A short beat, then ease to the new position (reads as "completing").
    fill.value = withDelay(120, withTiming(target, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [to, reduceMotion, fill]);

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: fill.value * trackWidth }],
    opacity: fill.value > 0.04 ? 1 : 0,
  }));

  return (
    <View
      style={[styles.track, { width: trackWidth, backgroundColor: trackColor }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        style={[styles.fill, { width: trackWidth, backgroundColor: accent }, fillStyle]}
      />
      {/* Soft glow at the leading edge (the orb's color). */}
      <Animated.View
        style={[styles.glow, { backgroundColor: accent, shadowColor: accent }, glowStyle]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    borderRadius: 2,
    overflow: 'visible',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 3,
    borderRadius: 2,
    transformOrigin: 'left',
  },
  glow: {
    position: 'absolute',
    left: -3,
    top: -1.5,
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 5,
    shadowOpacity: 0.9,
  },
});

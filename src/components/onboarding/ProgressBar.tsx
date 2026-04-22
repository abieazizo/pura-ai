import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { palette } from '@/theme';

export interface OnboardingProgressBarProps {
  current: number;
  total: number;
  visible: boolean;
}

const SPRING = { damping: 22, stiffness: 140, mass: 1 };

/**
 * v7 onboarding progress bar (§2.4). 4pt tall, 40pt horizontal margin, clay
 * track @ 15% + clay fill animating via spring. Hidden on splash, permission
 * primers, review ask, paywall, welcome — parent passes `visible={false}`
 * on those.
 */
export function OnboardingProgressBar({
  current,
  total,
  visible,
}: OnboardingProgressBarProps) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;
  const progress = useSharedValue(ratio);

  useEffect(() => {
    progress.value = withSpring(ratio, SPRING);
  }, [ratio, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  if (!visible) return null;

  return (
    <View style={styles.wrap} accessible={false}>
      <View style={styles.track} />
      <Animated.View style={[styles.fill, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 40,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  track: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(198,93,72,0.15)', // clay @ 15%
    borderRadius: 2,
  },
  fill: {
    height: 4,
    backgroundColor: palette.clay,
    borderRadius: 2,
  },
});

import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius } from '@/theme';

export interface ProgressBarProps {
  value: number;
  max?: number;
  height?: number;
  color?: string;
  trackColor?: string;
  animationDelay?: number;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({
  value,
  max = 100,
  height = 6,
  color = colors.accent,
  trackColor = colors.borderLight,
  animationDelay = 0,
  style,
}: ProgressBarProps) {
  const ratio = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  const progress = useSharedValue(0);

  useEffect(() => {
    const t = setTimeout(() => {
      progress.value = withTiming(ratio, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    }, animationDelay);
    return () => clearTimeout(t);
  }, [ratio, animationDelay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        { height, backgroundColor: trackColor, borderRadius: height / 2 },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: color, borderRadius: height / 2 },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.pill,
  },
  fill: {
    height: '100%',
  },
});

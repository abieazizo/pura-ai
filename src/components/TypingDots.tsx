import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius } from '@/theme';

export interface TypingDotsProps {
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function TypingDots({ color = colors.textSecondary, style }: TypingDotsProps) {
  return (
    <View style={[styles.row, style]}>
      <Dot color={color} delay={0} />
      <Dot color={color} delay={150} />
      <Dot color={color} delay={300} />
    </View>
  );
}

function Dot({ delay, color }: { delay: number; color: string }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
    return () => cancelAnimation(v);
  }, [delay, v]);

  const animated = useAnimatedStyle(() => ({
    opacity: 0.3 + 0.7 * v.value,
    transform: [{ translateY: -3 + 3 * v.value }],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, animated]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
});

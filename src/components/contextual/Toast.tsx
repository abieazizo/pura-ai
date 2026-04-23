import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '@/theme';

export interface ToastProps {
  message: string;
  /** Total visible time in ms. Spec §3.4 = 2000ms hold. */
  holdMs?: number;
  onFinished: () => void;
}

/**
 * Small pill toast used after the day-7 routine fitback (§3.4). Ink-90%
 * bg with paper text. Fades in 200ms, holds, fades out 300ms, then pings
 * the provider to clear itself.
 */
export function Toast({ message, holdMs = 2000, onFinished }: ToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(
      1,
      { duration: 200, easing: Easing.out(Easing.cubic) },
      () => {
        opacity.value = withDelay(
          holdMs,
          withTiming(
            0,
            { duration: 300, easing: Easing.in(Easing.cubic) },
            (done) => {
              if (done) runOnJS(onFinished)();
            }
          )
        );
      }
    );
  }, [opacity, holdMs, onFinished]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { paddingTop: insets.top + 8 }]}
    >
      <Animated.View style={[styles.pill, style]}>
        <Text style={styles.text} maxFontSizeMultiplier={1.1}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
    zIndex: 2000,
  },
  pill: {
    backgroundColor: 'rgba(11,18,32,0.92)', // v10 cool ink @ 92%
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  text: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: palette.bg,
  },
});

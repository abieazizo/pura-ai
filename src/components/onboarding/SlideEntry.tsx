import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

const SPRING = { damping: 22, stiffness: 140, mass: 1 };

export interface SlideEntryProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** When true the entrance is re-triggered every time the screen regains focus. */
  replayOnFocus?: boolean;
}

/**
 * Per-screen entrance wrapper (§2.3). Layered on top of the native-stack
 * `slide_from_right` transition to give every onboarding screen a consistent
 * Reanimated spring: +40px translateX → 0 with opacity 0 → 1.
 *
 * On back-nav the previous screen regains focus and replays the same
 * entrance (with `replayOnFocus`) so returning feels intentional, not stale.
 */
export function SlideEntry({
  children,
  style,
  replayOnFocus = true,
}: SlideEntryProps) {
  const x = useSharedValue(40);
  const opacity = useSharedValue(0);

  const run = React.useCallback(() => {
    x.value = 40;
    opacity.value = 0;
    x.value = withSpring(0, SPRING);
    opacity.value = withTiming(1, { duration: 260 });
  }, [opacity, x]);

  useEffect(() => {
    run();
  }, [run]);

  useFocusEffect(
    React.useCallback(() => {
      if (replayOnFocus) run();
    }, [run, replayOnFocus])
  );

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }],
  }));

  return (
    <Animated.View style={[styles.flex, animated, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

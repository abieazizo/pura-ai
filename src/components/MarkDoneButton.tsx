import React, { useEffect } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, radius, space, type as typography } from '../theme/tokens';

// v10.14 — type renamed from local `Props` to exported `MarkDoneButtonProps`
// so `components/index.ts` can re-export it cleanly. The prior index.ts
// export `export type { MarkDoneButtonProps }` was referencing a name that
// never existed in this file — a long-standing TS error in the build.
export type MarkDoneButtonProps = {
  completed: boolean;
  onPress: () => void;
  label?: string;
};

export function MarkDoneButton({
  completed,
  onPress,
  label = 'Mark done',
}: MarkDoneButtonProps) {
  const progress = useSharedValue(completed ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(completed ? 1 : 0, { duration: 260 });
  }, [completed, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.bg, colors.moss]
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.clay, colors.moss]
    ),
    transform: [{ scale: scale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [colors.clay, colors.bg]
    ),
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(0.96, { damping: 20, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    });
    onPress();
  };

  return (
    <Pressable onPress={handlePress} hitSlop={8}>
      <Animated.View style={[styles.button, animatedStyle]}>
        <Animated.Text style={[styles.label, animatedTextStyle]}>
          {completed ? 'Done' : label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
  },
  label: {
    ...typography.captionMed,
  },
});
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface OnboardingPrimaryButtonProps
  extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  /** When true the button looks "tonal-inverse" — sand bg, ink label. */
  tonal?: boolean;
}

const PRESS_SPRING = { damping: 15, stiffness: 300, mass: 1 };

/**
 * Onboarding primary button (§2.4). Full width with 40pt horizontal margin,
 * 56pt tall, radius 28, clay fill, paper text. Tap: scale to 0.98 via
 * spring, selection haptic, then fire `onPress`. Disabled state: opacity
 * 0.25, no haptic.
 */
export function OnboardingPrimaryButton({
  label,
  onPress,
  disabled,
  style,
  labelStyle,
  tonal,
}: OnboardingPrimaryButtonProps) {
  const scale = useSharedValue(1);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handle = () => {
    if (disabled) return;
    hapt.select();
    scale.value = withSpring(0.98, PRESS_SPRING, () => {
      scale.value = withSpring(1, PRESS_SPRING);
    });
    onPress();
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={handle}
      disabled={disabled}
      style={[
        styles.btn,
        tonal ? styles.tonal : styles.primary,
        disabled && styles.disabled,
        animated,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          tonal ? styles.labelTonal : styles.labelPrimary,
          labelStyle,
        ]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.15}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginHorizontal: 40,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: palette.clay },
  tonal: { backgroundColor: 'rgba(212,165,116,0.6)' }, // sand @ 60%
  disabled: { opacity: 0.25 },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    lineHeight: 20,
  },
  labelPrimary: { color: palette.bg },
  labelTonal: { color: palette.ink },
});

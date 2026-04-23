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

// v9.9 — onboarding primary aligned with the rest of the app (ink, not
// clay). Every primary CTA across Home / Plan / Scan / Products / Product
// Detail / AddToRoutine is `palette.ink` on paper text; onboarding was the
// last holdout. Tonal variant drops the warm sand tint for a cool paper
// tile with hairline border (matches Home concern cards).
const styles = StyleSheet.create({
  btn: {
    marginHorizontal: 40,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: palette.ink },
  tonal: {
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  disabled: { opacity: 0.28 },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelPrimary: { color: palette.inkInverse },
  labelTonal: { color: palette.ink },
});

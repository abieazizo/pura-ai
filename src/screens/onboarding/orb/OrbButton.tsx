/**
 * OrbButton — the reply CTA for the orb-companion screens.
 *
 * Inter SemiBold (it is UI, not the orb's voice), Ink fill, full-width minus the
 * 24px app gutter, 56 tall, 28 radius, with a soft "breathing float" shadow so
 * it reads as a present, alive affordance rather than a flat slab. Tap: light
 * haptic + a quick compress-and-release spring, then fire onPress.
 *
 * The breathing is a behind-glow View whose opacity + scale loop on the UI
 * thread — we never animate shadow radius (not UI-thread, and forbidden). Under
 * reduce-motion it sits still with a static shadow.
 */

import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { hapt } from '@/utils/haptics';
import { palette, auroraOrb as ORB } from '@/theme';

const PRESS_SPRING = { damping: 15, stiffness: 320, mass: 1 };

export interface OrbButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  reduceMotion?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function OrbButton({ label, onPress, disabled, reduceMotion, style }: OrbButtonProps) {
  const scale = useSharedValue(1);
  const breath = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      breath.value = 0.5;
      return;
    }
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [reduceMotion, breath]);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: disabled ? 0 : 0.18 + breath.value * 0.16,
    transform: [{ scaleX: 0.94 + breath.value * 0.03 }, { translateY: 6 + breath.value * 3 }],
  }));

  const handle = () => {
    if (disabled) return;
    hapt.tap();
    scale.value = withSequence(
      withTiming(0.96, { duration: 100, easing: Easing.out(Easing.quad) }),
      withSpring(1, PRESS_SPRING),
    );
    onPress();
  };

  return (
    <Animated.View style={[styles.wrap, style]}>
      {/* Breathing float shadow (behind the slab) */}
      <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled }}
        onPress={handle}
        disabled={disabled}
        style={[styles.btn, disabled && styles.disabled, btnStyle]}
      >
        <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.15}>
          {label}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 24,
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 8,
    bottom: -2,
    borderRadius: 28,
    backgroundColor: ORB.buttonShadow,
    ...Platform.select({
      ios: {
        shadowColor: ORB.buttonShadow,
        shadowOpacity: 0.5,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  btn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: 0.1,
    color: palette.inkInverse,
  },
});

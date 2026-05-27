/**
 * AddButton — the circular "add to routine" CTA shared across all
 * product cards (hero, supporting, mini).
 *
 * UX upgrades (pass 2):
 *   • Press feedback uses a 2-stage spring (down 0.86 → settle 1.0).
 *   • When `confirmed` flips false → true (the user just added the
 *     product), the button performs a confidence bloom: scale 1 →
 *     1.18 → 1.0 with a sage flash. Pairs with a notification-style
 *     haptic.
 *   • Confirmed → Confirmed re-press is treated as "already added"
 *     with a light tap, no animation, no double haptic.
 *
 * The bloom is intentionally restrained — premium retail apps confirm
 * without being childish. Total animation budget is ~360ms.
 */

import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Plus, Check } from 'phosphor-react-native';
import { puraShop, puraShopShadow } from '@/theme';
import { hapt } from '@/utils/haptics';

export type AddButtonSize = 'lg' | 'md' | 'sm';

const DIMENSIONS: Record<AddButtonSize, { size: number; icon: number }> = {
  lg: { size: 40, icon: 18 },
  md: { size: 36, icon: 16 },
  sm: { size: 32, icon: 14 },
};

export interface AddButtonProps {
  onPress: () => void;
  size?: AddButtonSize;
  confirmed?: boolean;
  /** Used for accessibility labels — e.g. `Add Paula's Choice 2% BHA to bag`. */
  productLabel: string;
}

export function AddButton({
  onPress,
  size = 'md',
  confirmed,
  productLabel,
}: AddButtonProps) {
  const { size: dim, icon: iconSize } = DIMENSIONS[size];

  // Press scale + confirmation bloom share the same shared value.
  const scale = useSharedValue(1);
  // 0 = idle, 1 = confirmed. Drives background color tween.
  const stateProgress = useSharedValue(confirmed ? 1 : 0);

  // Track previous confirmed state so we can detect the false → true
  // transition and play the bloom only once.
  const prevConfirmedRef = useRef<boolean>(confirmed ?? false);

  useEffect(() => {
    const wasConfirmed = prevConfirmedRef.current;
    const isConfirmed = confirmed ?? false;
    if (!wasConfirmed && isConfirmed) {
      // Confidence bloom + state flip.
      scale.value = withSequence(
        withSpring(1.18, { damping: 12, stiffness: 360, mass: 0.6 }),
        withSpring(1.0, { damping: 18, stiffness: 240, mass: 0.7 }),
      );
      stateProgress.value = withDelay(60, withTiming(1, { duration: 240 }));
    } else if (wasConfirmed && !isConfirmed) {
      // Quiet undo — no bloom, just a state tween.
      stateProgress.value = withTiming(0, { duration: 200 });
    }
    prevConfirmedRef.current = isConfirmed;
  }, [confirmed, scale, stateProgress]);

  const handlePress = () => {
    // Always give a press response.
    scale.value = withSequence(
      withSpring(0.86, { damping: 14, stiffness: 380, mass: 0.55 }),
      withSpring(1.0, { damping: 16, stiffness: 300, mass: 0.6 }),
    );
    if (confirmed) {
      hapt.select();
    } else {
      hapt.success();
    }
    onPress();
  };

  const animatedOuter = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedBg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      stateProgress.value,
      [0, 1],
      [puraShop.plusBg, puraShop.plusBgConfirmed],
    ),
  }));

  const accessibilityLabel = confirmed
    ? `${productLabel} — already in your routine`
    : `Add ${productLabel} to your routine`;

  return (
    <Animated.View style={animatedOuter}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: false, selected: confirmed }}
        hitSlop={6}
        style={({ pressed }) => [
          styles.btn,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
          },
          pressed && !confirmed && { backgroundColor: puraShop.plusBgPressed },
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: dim / 2 },
            animatedBg,
          ]}
          pointerEvents="none"
        />
        {confirmed ? (
          <Check size={iconSize} color={puraShop.plusIcon} weight="bold" />
        ) : (
          <Plus size={iconSize} color={puraShop.plusIcon} weight="bold" />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...puraShopShadow.plus,
  },
});

/**
 * AddButton — the circular "add to routine" CTA shared across all
 * product cards (hero, supporting, mini).
 *
 * Treatment (post black-void correction):
 *   • Idle is a LIGHT disc — white fill, a blue hairline ring, and a
 *     blue "+" glyph. It is never a black/near-black filled circle (the
 *     old `plusBg: #05070B` fill read as a broken void in the otherwise
 *     icy-white + blue storefront).
 *   • Press blooms to a solid Pura Blue fill with a white glyph — the
 *     accent appears only on press, per the hero spec.
 *   • Confirmed settles to success green with a white check.
 *
 * Motion: a 2-stage press spring (down 0.86 → settle 1.0); on the
 * false → true confirm transition the button performs a restrained
 * confidence bloom (1 → 1.18 → 1.0) paired with a success haptic. A
 * confirmed re-press is treated as "already added" — light tap, no bloom.
 */

import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Plus, Check } from 'phosphor-react-native';
import { puraShop, puraShopShadow } from '@/theme';
import { hapt } from '@/utils/haptics';

export type AddButtonSize = 'lg' | 'md' | 'sm';

const DIMENSIONS: Record<AddButtonSize, { size: number; icon: number }> = {
  lg: { size: 44, icon: 19 },
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

  // Track previous confirmed state so we can detect the false → true
  // transition and play the bloom only once.
  const prevConfirmedRef = useRef<boolean>(confirmed ?? false);

  useEffect(() => {
    const wasConfirmed = prevConfirmedRef.current;
    const isConfirmed = confirmed ?? false;
    if (!wasConfirmed && isConfirmed) {
      // Confidence bloom.
      scale.value = withSequence(
        withSpring(1.18, { damping: 12, stiffness: 360, mass: 0.6 }),
        withSpring(1.0, { damping: 18, stiffness: 240, mass: 0.7 }),
      );
    }
    prevConfirmedRef.current = isConfirmed;
  }, [confirmed, scale]);

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
        style={({ pressed }) => {
          const bg = confirmed
            ? puraShop.plusBgConfirmed
            : pressed
              ? puraShop.addActiveBg
              : puraShop.addBg;
          const border = confirmed
            ? puraShop.plusBgConfirmed
            : pressed
              ? puraShop.addActiveBg
              : puraShop.addBorder;
          return [
            styles.btn,
            {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              backgroundColor: bg,
              borderColor: border,
            },
          ];
        }}
      >
        {({ pressed }) => {
          const iconColor = confirmed
            ? puraShop.addConfirmedIcon
            : pressed
              ? puraShop.addActiveIcon
              : puraShop.addIcon;
          return confirmed ? (
            <Check size={iconSize} color={iconColor} weight="bold" />
          ) : (
            <Plus size={iconSize} color={iconColor} weight="bold" />
          );
        }}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    ...puraShopShadow.plus,
  },
});

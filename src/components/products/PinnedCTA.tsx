import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { ArrowRight, Storefront } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

export interface PinnedCTAProps {
  onAddToRoutine: () => void;
  onWhereToBuy: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_SPRING = { damping: 15, stiffness: 300, mass: 1 };

/**
 * v10.10 — pinned action tray for Product Detail.
 *
 * Previous versions shipped a floating ink pill with a tiny underlined
 * "Where to buy" text link 12pt below — two disconnected actions that
 * read as primary decision + legal fine print. The new tray groups
 * both actions as real buttons inside one premium surface:
 *
 *   ┌────────────────────────────────────┐
 *   │        Add to routine   →          │   ← primary ink pill, 54pt
 *   │                                    │
 *   │   🏬  Where to buy                 │   ← secondary outlined pill, 46pt
 *   └────────────────────────────────────┘
 *
 * The container carries a subtle top hairline + bg so the pair reads as
 * an anchored action bar rather than two orphan controls floating over
 * the scroll. Safe-area-aware; spring press on both buttons.
 */
export function PinnedCTA({ onAddToRoutine, onWhereToBuy }: PinnedCTAProps) {
  const insets = useSafeAreaInsets();

  const primaryScale = useSharedValue(1);
  const primaryStyle = useAnimatedStyle(() => ({
    transform: [{ scale: primaryScale.value }],
  }));
  const secondaryScale = useSharedValue(1);
  const secondaryStyle = useAnimatedStyle(() => ({
    transform: [{ scale: secondaryScale.value }],
  }));

  const onPressPrimary = () => {
    hapt.success();
    primaryScale.value = withSpring(0.98, PRESS_SPRING, () => {
      primaryScale.value = withSpring(1, PRESS_SPRING);
    });
    onAddToRoutine();
  };

  const onPressSecondary = () => {
    hapt.select();
    secondaryScale.value = withSpring(0.97, PRESS_SPRING, () => {
      secondaryScale.value = withSpring(1, PRESS_SPRING);
    });
    onWhereToBuy();
  };

  return (
    <View
      style={[styles.tray, { paddingBottom: insets.bottom + 12 }]}
    >
      <View style={styles.topHairline} pointerEvents="none" />

      <AnimatedPressable
        onPress={onPressPrimary}
        accessibilityRole="button"
        accessibilityLabel="Add to routine"
        style={[styles.primary, primaryStyle]}
      >
        <Text style={styles.primaryLabel} maxFontSizeMultiplier={1.15}>
          Add to routine
        </Text>
        <ArrowRight size={16} color={palette.inkInverse} weight="duotone" />
      </AnimatedPressable>

      <AnimatedPressable
        onPress={onPressSecondary}
        accessibilityRole="button"
        accessibilityLabel="Where to buy"
        style={[styles.secondary, secondaryStyle]}
      >
        <Storefront size={16} color={palette.ink} weight="duotone" />
        <Text style={styles.secondaryLabel} maxFontSizeMultiplier={1.15}>
          Where to buy
        </Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: palette.bg,
  },
  topHairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: palette.hairline,
  },
  primary: {
    height: 54,
    borderRadius: 27,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: palette.ink,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  primaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.1,
    color: palette.inkInverse,
  },
  secondary: {
    marginTop: 10,
    height: 46,
    borderRadius: 23,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: 0.1,
    color: palette.ink,
  },
});

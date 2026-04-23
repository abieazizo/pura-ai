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
 * v10.12 — pinned action tray compressed to a single row.
 *
 * Previous v10.10 tray stacked the primary and secondary buttons
 * vertically (54pt + 10pt gap + 46pt + padding ≈ 110pt content). That
 * was the right grouping semantically but consumed too much real
 * estate on a product page whose whole point is compression.
 *
 *   ┌────────────────────────────────────────────┐
 *   │  [ Add to routine → ] [🏬 Where to buy ]   │  ← one 50pt row
 *   └────────────────────────────────────────────┘
 *
 * Primary keeps 70% width (flex: 7) so it stays the clear hero action;
 * secondary gets 30% (flex: 3) — still a real button with icon + label,
 * not a fine-print link. Both share the same 50pt height and 25pt
 * radius. Saves ~55pt per product page. Both still spring-press.
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
    <View style={[styles.tray, { paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.topHairline} pointerEvents="none" />

      <View style={styles.row}>
        <AnimatedPressable
          onPress={onPressPrimary}
          accessibilityRole="button"
          accessibilityLabel="Add to routine"
          style={[styles.primary, primaryStyle]}
        >
          <Text style={styles.primaryLabel} maxFontSizeMultiplier={1.15}>
            Add to routine
          </Text>
          <ArrowRight size={15} color={palette.inkInverse} weight="duotone" />
        </AnimatedPressable>

        <AnimatedPressable
          onPress={onPressSecondary}
          accessibilityRole="button"
          accessibilityLabel="Where to buy"
          style={[styles.secondary, secondaryStyle]}
        >
          <Storefront size={15} color={palette.ink} weight="duotone" />
          <Text style={styles.secondaryLabel} maxFontSizeMultiplier={1.15}>
            Buy
          </Text>
        </AnimatedPressable>
      </View>
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
    paddingTop: 10,
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
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  primary: {
    flex: 7,
    height: 50,
    borderRadius: 25,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
    flex: 3,
    height: 50,
    borderRadius: 25,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: 0.1,
    color: palette.ink,
  },
});

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { ArrowRight } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

export interface PinnedCTAProps {
  onAddToRoutine: () => void;
  onWhereToBuy: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pinned primary CTA for Product Detail (§3.13). Absolute-positioned above
 * the tab bar, terracotta filled, success haptic on tap. A secondary
 * "Where to buy" link sits 12pt below, still inside the safe area.
 *
 * The button is floating — no wrapper bar — so the ScrollView above it
 * remains uncluttered. The content above uses `paddingBottom: 140` to
 * ensure the last section doesn't hide behind this CTA.
 */
export function PinnedCTA({ onAddToRoutine, onWhereToBuy }: PinnedCTAProps) {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPress = () => {
    hapt.success();
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    });
    onAddToRoutine();
  };

  const onBuy = () => {
    hapt.select();
    onWhereToBuy();
  };

  return (
    <View
      style={[styles.wrap, { bottom: insets.bottom + 12 }]}
      pointerEvents="box-none"
    >
      <AnimatedPressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Add to routine"
        style={[styles.cta, animated]}
      >
        <Text style={styles.label} maxFontSizeMultiplier={1.15}>
          Add to routine
        </Text>
        <ArrowRight size={18} color={palette.bg} weight="duotone" />
      </AnimatedPressable>

      <Pressable
        onPress={onBuy}
        hitSlop={8}
        accessibilityRole="link"
        accessibilityLabel="Where to buy"
        style={({ pressed }) => [
          styles.buyWrap,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={styles.buyLabel}>Where to buy</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'stretch',
  },
  cta: {
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.clay,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: palette.ink,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: palette.bg,
  },
  buyWrap: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
  buyLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: palette.clay,
    textDecorationLine: 'underline',
  },
});

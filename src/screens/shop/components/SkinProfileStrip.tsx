/**
 * SkinProfileStrip — "For your skin" + horizontal trait pills.
 *
 * Pass-2 upgrade: pills now interpolate between their idle (warm
 * cream) and active (blush + coral text) treatment via Reanimated
 * so concern selection feels considered, not jumpy.
 */

import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  puraShop,
  puraShopLayout,
  puraShopRadius,
  puraShopSpace,
  puraShopType,
} from '@/theme';
import type { ShopSkinContextPill } from '../useShopViewModel';

export interface SkinProfileStripProps {
  pills: ShopSkinContextPill[];
  onSelect: (p: ShopSkinContextPill) => void;
}

export function SkinProfileStrip({ pills, onSelect }: SkinProfileStripProps) {
  return (
    <View style={styles.wrap}>
      <Text
        style={styles.label}
        maxFontSizeMultiplier={1.15}
        accessibilityRole="header"
      >
        For your skin
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {pills.map((pill) => (
          <ContextPill
            key={pill.key}
            pill={pill}
            onPress={() => onSelect(pill)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ContextPill({
  pill,
  onPress,
}: {
  pill: ShopSkinContextPill;
  onPress: () => void;
}) {
  const progress = useSharedValue(pill.active ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(pill.active ? 1 : 0, { duration: 220 });
  }, [pill.active, progress]);

  const bg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [puraShop.contextIdleBg, puraShop.contextActiveBg],
    ),
    transform: [{ scale: scale.value }],
  }));

  const textColor = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [puraShop.contextIdleText, puraShop.contextActiveText],
    ),
  }));

  const handleIn = () =>
    (scale.value = withSpring(0.95, { damping: 16, stiffness: 400, mass: 0.5 }));
  const handleOut = () =>
    (scale.value = withSpring(1.0, { damping: 18, stiffness: 320, mass: 0.55 }));

  return (
    <Animated.View style={[styles.pillShell, bg]}>
      <Pressable
        onPress={onPress}
        onPressIn={handleIn}
        onPressOut={handleOut}
        accessibilityRole="button"
        accessibilityLabel={`${pill.label}${pill.active ? ', selected' : ''}`}
        accessibilityState={{ selected: pill.active }}
        style={styles.pillInner}
      >
        <Animated.Text
          style={[styles.pillText, textColor]}
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
        >
          {pill.label}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    ...puraShopType.contextLabel,
    color: puraShop.contextLabel,
    marginRight: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: puraShopSpace.sm,
    paddingRight: puraShopLayout.horizontalPadding,
  },
  pillShell: {
    height: 34,
    borderRadius: puraShopRadius.chip,
    overflow: 'hidden',
  },
  pillInner: {
    flex: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    ...puraShopType.contextPill,
  },
});

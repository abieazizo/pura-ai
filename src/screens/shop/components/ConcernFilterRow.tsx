/**
 * ConcernFilterRow — horizontally scrollable filter chips.
 *
 * Pass-2 upgrade: chips now animate their background/border/text
 * tone via Reanimated's interpolateColor instead of swapping the
 * class instantly. The icon also fades between duotone (idle) and
 * fill (active) weights via opacity instead of a hard glyph swap.
 * Press also gives a subtle inward scale.
 */

import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  Sparkle,
  Flame,
  Drop,
  Star,
  Shield,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import {
  puraShop,
  puraShopLayout,
  puraShopRadius,
  puraShopType,
} from '@/theme';
import type {
  ShopConcernFilter,
  ShopFilterChip,
} from '../useShopViewModel';

const ICONS = {
  sparkle: Sparkle,
  flame: Flame,
  drop: Drop,
  star: Star,
  shield: Shield,
} as const;

export interface ConcernFilterRowProps {
  chips: ShopFilterChip[];
  active: ShopConcernFilter;
  onSelect: (key: ShopConcernFilter) => void;
}

export function ConcernFilterRow({
  chips,
  active,
  onSelect,
}: ConcernFilterRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {chips.map((chip) => (
        <FilterChip
          key={chip.key}
          chip={chip}
          active={chip.key === active}
          onPress={() => onSelect(chip.key)}
        />
      ))}
    </ScrollView>
  );
}

function FilterChip({
  chip,
  active,
  onPress,
}: {
  chip: ShopFilterChip;
  active: boolean;
  onPress: () => void;
}) {
  const Icon = ICONS[chip.iconKey] as React.FC<PhosphorIconProps>;

  const progress = useSharedValue(active ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 200 });
  }, [active, progress]);

  const bg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [puraShop.chipBg, puraShop.chipBgActive],
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [puraShop.chipBorder, puraShop.chipBgActive],
    ),
    transform: [{ scale: scale.value }],
  }));

  const textColor = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [puraShop.chipText, puraShop.chipTextActive],
    ),
  }));

  const iconColor = useAnimatedStyle(() => ({
    opacity: 1,
  }));

  const handleIn = () =>
    (scale.value = withSpring(0.95, { damping: 16, stiffness: 400, mass: 0.5 }));
  const handleOut = () =>
    (scale.value = withSpring(1.0, { damping: 18, stiffness: 320, mass: 0.55 }));

  return (
    <Animated.View style={[styles.chipShell, bg]}>
      <Pressable
        onPress={onPress}
        onPressIn={handleIn}
        onPressOut={handleOut}
        accessibilityRole="button"
        accessibilityLabel={`${chip.label} filter${active ? ', selected' : ''}`}
        accessibilityState={{ selected: active }}
        style={styles.chipInner}
      >
        <Animated.View style={iconColor}>
          <Icon
            size={15}
            color={active ? puraShop.chipIconActive : puraShop.chipIcon}
            weight={active ? 'fill' : 'duotone'}
          />
        </Animated.View>
        <Animated.Text
          style={[styles.label, textColor]}
          maxFontSizeMultiplier={1.15}
          numberOfLines={1}
        >
          {chip.label}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    paddingBottom: 6,
    gap: 8,
    alignItems: 'center',
  },
  chipShell: {
    height: 36,
    borderRadius: puraShopRadius.chip,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chipInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  label: {
    ...puraShopType.chipLabel,
  },
});

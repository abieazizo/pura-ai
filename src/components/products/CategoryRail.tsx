import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Drop,
  GridNine,
  Heart,
  Leaf,
  Moon,
  Shield,
  Sparkle,
  Target,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

/**
 * v10.9 — Unified product category rail.
 *
 * Replaces both the v10.3 `SearchSuggestions` "TRY" chip row AND the v9.3
 * `ShopByGoal` icon grid. The three systems were each doing the same job
 * (category entry) with overlapping copy ("Natural" appeared in both).
 *
 * Seven chips in this exact order:
 *   1. Best for your skin   (scan-aware; always lead)
 *   2. Breakouts
 *   3. Hydration
 *   4. Texture
 *   5. Dark marks
 *   6. Sensitive
 *   7. Natural
 *
 * Single-select: the parent owns the selected `GoalKey` state and feeds
 * the content grid below. Each chip has a spring-scaled press, an icon
 * leader (duotone in accent → paper on selected), and a label. The first
 * chip carries a subtle moss-tinted match-aware treatment so
 * "Best for your skin" reads as the scan-derived protagonist even when
 * unselected.
 */

export type GoalKey =
  | 'best-for-you'
  | 'breakouts'
  | 'hydration'
  | 'texture'
  | 'dark-marks'
  | 'sensitive'
  | 'barrier'
  | 'natural';

interface GoalMeta {
  key: GoalKey;
  label: string;
  Icon: React.FC<PhosphorIconProps>;
  accent: string;
}

const GOALS: GoalMeta[] = [
  { key: 'best-for-you', label: 'Best for your skin', Icon: Sparkle as React.FC<PhosphorIconProps>, accent: palette.moss },
  { key: 'breakouts', label: 'Breakouts', Icon: Target as React.FC<PhosphorIconProps>, accent: palette.rust },
  { key: 'hydration', label: 'Hydration', Icon: Drop as React.FC<PhosphorIconProps>, accent: palette.clay },
  { key: 'texture', label: 'Texture', Icon: GridNine as React.FC<PhosphorIconProps>, accent: palette.amber },
  { key: 'dark-marks', label: 'Dark marks', Icon: Moon as React.FC<PhosphorIconProps>, accent: palette.clayDeep },
  { key: 'sensitive', label: 'Sensitive', Icon: Heart as React.FC<PhosphorIconProps>, accent: palette.moss },
  // v22.9 — explicit Barrier goal. Barrier support is a distinct
  // concern from generic sensitivity (e.g. compromised barrier from
  // over-exfoliation, post-procedure recovery, eczema-adjacent dryness).
  // Mapped to the curated "barrier repair" category in CategoryFeed.
  { key: 'barrier', label: 'Barrier', Icon: Shield as React.FC<PhosphorIconProps>, accent: palette.clay },
  { key: 'natural', label: 'Natural', Icon: Leaf as React.FC<PhosphorIconProps>, accent: palette.mossDeep },
];

export const GOAL_ORDER: GoalKey[] = GOALS.map((g) => g.key);

export interface CategoryRailProps {
  selected: GoalKey;
  onSelect: (goal: GoalKey) => void;
}

export function CategoryRail({ selected, onSelect }: CategoryRailProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        BROWSE BY GOAL
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {GOALS.map((g) => (
          <CategoryChip
            key={g.key}
            meta={g}
            active={g.key === selected}
            onPress={() => {
              hapt.select();
              onSelect(g.key);
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_SPRING = { damping: 15, stiffness: 300, mass: 1 };

function CategoryChip({
  meta,
  active,
  onPress,
}: {
  meta: GoalMeta;
  active: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const handle = () => {
    scale.value = withSpring(0.97, PRESS_SPRING, () => {
      scale.value = withSpring(1, PRESS_SPRING);
    });
    onPress();
  };
  const Icon = meta.Icon;

  return (
    <AnimatedPressable
      onPress={handle}
      accessibilityRole="button"
      accessibilityLabel={`Browse ${meta.label}`}
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        active ? styles.chipActive : styles.chipIdle,
        animated,
      ]}
    >
      <Icon
        size={14}
        weight="duotone"
        color={active ? palette.inkInverse : meta.accent}
        style={{ marginRight: 6 }}
      />
      <Text
        style={[
          styles.chipLabel,
          { color: active ? palette.inkInverse : palette.ink },
        ]}
        maxFontSizeMultiplier={1.1}
      >
        {meta.label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 22,
    marginBottom: 2,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginHorizontal: 20,
  },
  row: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipIdle: {
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
  },
  chipActive: {
    borderColor: palette.ink,
    backgroundColor: palette.ink,
  },
  chipLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: -0.05,
  },
});

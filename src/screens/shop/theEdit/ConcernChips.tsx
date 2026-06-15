/**
 * ConcernChips — the concern filter, in SCAN LANGUAGE. Idle: white + 0.5px
 * hairline + ink. Selected: Pura Blue fill + white. Tap re-threads the feed
 * (the cross-fade + reflow lives in TheEditScreen). 44px, Inter 14/500, 8px gap.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { hapt } from '@/utils/haptics';
import type { ConcernType } from '@/ai/ai-contracts';
import { edit, radius, space, type } from './tokens';
import { usePressScale } from './pressFeedback';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ChipKey = ConcernType | 'all';

export interface ChipItem {
  key: ChipKey;
  label: string;
}

export function ConcernChips({
  items,
  selected,
  onSelect,
  contentLeft,
}: {
  items: ChipItem[];
  selected: ChipKey;
  onSelect: (key: ChipKey) => void;
  contentLeft: number;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { paddingHorizontal: contentLeft }]}
      style={styles.scroll}
    >
      {items.map((it) => (
        <Chip key={it.key} item={it} active={it.key === selected} onSelect={onSelect} />
      ))}
    </ScrollView>
  );
}

function Chip({
  item,
  active,
  onSelect,
}: {
  item: ChipItem;
  active: boolean;
  onSelect: (key: ChipKey) => void;
}) {
  const press = usePressScale(0.93);
  return (
    <AnimatedPressable
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={() => {
        hapt.select();
        onSelect(item.key);
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle, press.style]}
    >
      <Text style={[type.chip, { color: active ? edit.white : edit.ink }]} numberOfLines={1}>
        {item.label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { gap: space.s, alignItems: 'center', paddingVertical: 0 },
  chip: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: radius.chip,
  },
  chipIdle: {
    backgroundColor: edit.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: edit.hairlineStrong,
  },
  chipActive: { backgroundColor: edit.blue },
});

/**
 * ConcernChips — the concern filter, in SCAN LANGUAGE. Idle: white + 0.5px
 * hairline + ink. Selected: Pura Blue fill + white. Tap re-threads the feed
 * (the cross-fade + reflow lives in TheEditScreen). 44px, Inter 14/500, 8px gap.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { hapt } from '@/utils/haptics';
import type { ConcernType } from '@/ai/ai-contracts';
import { edit, radius, space, type } from './tokens';

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
      {items.map((it) => {
        const active = it.key === selected;
        return (
          <Pressable
            key={it.key}
            onPress={() => {
              hapt.select();
              onSelect(it.key);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={it.label}
            style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
          >
            <Text style={[type.chip, { color: active ? edit.white : edit.ink }]} numberOfLines={1}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
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

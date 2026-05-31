/**
 * ConcernExplorer — "Explore another concern" chip row. Lives below
 * The Edit, NOT at the top. Browsing is secondary to the recommendation
 * decision.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import type { ConcernExploreOption } from '@/state/skinEdit';

interface ConcernExplorerProps {
  options: ConcernExploreOption[];
  selectedKey: ConcernExploreOption['key'] | null;
  onSelect: (key: ConcernExploreOption['key']) => void;
}

export function ConcernExplorer({ options, selectedKey, onSelect }: ConcernExplorerProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading} maxFontSizeMultiplier={1.2}>
        Explore another concern
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {options.map((opt) => {
          const active = opt.key === selectedKey;
          return (
            <Pressable
              key={opt.key}
              accessibilityRole="button"
              accessibilityLabel={`Explore ${opt.label}`}
              accessibilityState={{ selected: active }}
              onPress={() => {
                hapt.select();
                onSelect(opt.key);
              }}
              style={({ pressed }) => [
                styles.chip,
                active ? styles.chipActive : styles.chipIdle,
                pressed && { opacity: 0.94 },
              ]}
            >
              <Text
                style={[styles.label, active ? styles.labelActive : styles.labelIdle]}
                maxFontSizeMultiplier={1.1}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 32,
  },
  heading: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 21,
    lineHeight: 25,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 14,
    paddingHorizontal: 20,
  },
  row: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipIdle: {
    borderColor: palette.hairline,
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    borderColor: palette.clay,
    backgroundColor: palette.clayPaper,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: -0.05,
  },
  labelIdle: {
    color: palette.ink,
  },
  labelActive: {
    color: palette.clayDeep,
  },
});

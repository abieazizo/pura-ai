/**
 * EditModeSelector — segmented control with four modes:
 * Use tonight / Add next / Keep gentle / Skip for now.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme';
import { EDIT_MODE_META, type EditMode } from '@/state/skinEdit';
import { hapt } from '@/utils/haptics';

interface EditModeSelectorProps {
  selected: EditMode;
  onSelect: (mode: EditMode) => void;
}

export function EditModeSelector({ selected, onSelect }: EditModeSelectorProps) {
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {EDIT_MODE_META.map((meta) => {
          const active = meta.key === selected;
          return (
            <Pressable
              key={meta.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${meta.label} — ${meta.description}`}
              onPress={() => {
                hapt.select();
                onSelect(meta.key);
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
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    height: 40,
    paddingHorizontal: 16,
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
    borderColor: palette.ink,
    backgroundColor: palette.ink,
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
    color: palette.inkInverse,
  },
});

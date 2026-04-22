import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PuraMark } from '@/components/PuraMark';
import { useProfileSheet } from '@/hooks/useProfileSheet';
import { palette, radius, space } from '@/theme';

export interface HomeHeaderProps {
  score: number;
}

/**
 * Home header per §4.1. Mark on the left (existing component, 28pt), ScorePill
 * on the right. 56pt tall, 20pt horizontal padding.
 *
 * Tapping the ScorePill opens the profile sheet — it's the canonical entry
 * into the user's own space, which is where the score "lives".
 */
export function HomeHeader({ score }: HomeHeaderProps) {
  const { open } = useProfileSheet();

  return (
    <View style={styles.row}>
      <PuraMark variant="idle" size="sm" />
      <ScorePill value={score} onPress={open} />
    </View>
  );
}

function ScorePill({ value, onPress }: { value: number; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Skin score ${value}. Open profile.`}
      hitSlop={8}
      style={({ pressed }) => [styles.pill, pressed && { opacity: 0.85 }]}
    >
      <PuraMark variant="idle" size="xs" />
      <Text style={styles.pillNumber} maxFontSizeMultiplier={1.1}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.sand,
  },
  pillNumber: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 18,
    color: palette.clay,
    fontVariant: ['tabular-nums'],
  },
});

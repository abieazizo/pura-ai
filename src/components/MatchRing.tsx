import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, type as typography } from '@/theme';

export interface MatchRingProps {
  value: number; // 0..100
  size?: number;
  thickness?: number;
  style?: StyleProp<ViewStyle>;
  sublabel?: string;
}

/**
 * Color scale per spec §6.3:
 *   ≥ 70 → accent (coral)
 *   40..69 → warning
 *   < 40 → textTertiary
 */
export function MatchRing({
  value,
  size = 96,
  thickness = 6,
  style,
  sublabel = 'match',
}: MatchRingProps) {
  const v = Math.max(0, Math.min(100, value));
  const color =
    v >= 70 ? colors.accent : v >= 40 ? colors.warning : colors.textTertiary;

  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: thickness,
          borderColor: color,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`${v} percent match`}
    >
      <Text style={[styles.value, { color }]}>{v}%</Text>
      <Text style={styles.label}>{sublabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  value: {
    ...typography.heading,
    fontWeight: '700',
  },
  label: {
    ...typography.micro,
    color: colors.textTertiary,
    marginTop: -2,
  },
});

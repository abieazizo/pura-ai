import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CaretRight } from 'phosphor-react-native';
import { palette } from '@/theme';

export interface RoutineTonightRowProps {
  /** Formatted start time, e.g. "9:30 PM". */
  startsAt: string;
  /** Number of steps in the evening routine. */
  stepCount: number;
  onPress?: () => void;
}

/**
 * Tonight row (§4.7). Minimal, not a card. Hairline clay divider at the top.
 * Kicker + count on the left, chevron on the right. Full row is the tap
 * target.
 */
export function RoutineTonightRow({
  startsAt,
  stepCount,
  onPress,
}: RoutineTonightRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Tonight at ${startsAt}, ${stepCount} steps`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.divider} />
      <View style={styles.inner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
            {`TONIGHT \u00B7 ${startsAt.toUpperCase()}`}
          </Text>
          <Text style={styles.count} maxFontSizeMultiplier={1.15}>
            {`${stepCount} steps`}
          </Text>
        </View>
        <CaretRight size={16} color={palette.clay} weight="regular" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    marginHorizontal: 20,
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(20,124,255,0.1)',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(26,22,20,0.6)',
    marginBottom: 4,
  },
  count: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: palette.ink,
  },
});

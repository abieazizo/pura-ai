/**
 * DayContextStrip — single source of day kicker + freshness copy.
 *
 * Lives directly under the header. Reads only insight fields so the
 * "Day 13 · Latest scan updated today" line is built in exactly one place.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme';

interface Props {
  dayLabel: string;
  freshnessLabel: string;
}

export function DayContextStrip({ dayLabel, freshnessLabel }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        {dayLabel}
      </Text>
      {freshnessLabel && freshnessLabel.trim().length > 0 ? (
        <Text style={styles.freshness} maxFontSizeMultiplier={1.15}>
          {freshnessLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  freshness: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.1,
    color: palette.inkTertiary,
  },
});

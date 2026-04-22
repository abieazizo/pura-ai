import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { palette } from '@/theme';

/**
 * Floating italic pull-quote (§4.9). No border, no fill. Centered, generous
 * whitespace above and below. The tone-setter at the bottom of Home.
 */
export function HomePullquote({
  children = 'Two scans is enough for measurable change.',
}: {
  children?: string;
}) {
  return (
    <Text style={styles.quote} maxFontSizeMultiplier={1.25}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  quote: {
    marginHorizontal: 40,
    marginTop: 48,
    marginBottom: 32,
    textAlign: 'center',
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 18,
    lineHeight: 18 * 1.45,
    color: palette.clay,
  },
});

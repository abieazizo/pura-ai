import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Standalone ON-DEVICE row (§2.3). Lives on its own line — never overlapped
 * by the mode selector or any other element. Inter 10pt, tracking +140‰,
 * white at 50%.
 */
export function OnDeviceKicker() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.text} maxFontSizeMultiplier={1.1}>
        ON-DEVICE
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  text: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
  },
});

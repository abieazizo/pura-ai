import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { dx } from '../decisionTokens';

interface Props {
  label: string;
  tone?: 'muted' | 'terracotta';
}

/**
 * Tiny uppercase label used to title each section in the Decision
 * Room. Default tone is muted ink; terracotta is reserved for the
 * "UPDATED JUST NOW" eyebrow inside the active decision card.
 */
export function SectionEyebrow({ label, tone = 'muted' }: Props) {
  return (
    <Text
      style={[
        styles.text,
        tone === 'terracotta' ? styles.terracotta : styles.muted,
      ]}
      accessibilityRole="text"
      maxFontSizeMultiplier={1.1}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.5,
  },
  muted: { color: dx.inkMuted },
  terracotta: { color: dx.terracottaText },
});

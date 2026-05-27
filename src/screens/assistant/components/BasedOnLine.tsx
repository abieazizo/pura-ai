import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { dx } from '../decisionTokens';

interface Props {
  text: string;
}

/**
 * Single-line provenance footer ("Based on today's scan, previous-
 * scan comparison, evening routine, and ingredient check.").
 */
export function BasedOnLine({ text }: Props) {
  return (
    <Text style={styles.text} maxFontSizeMultiplier={1.25}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    lineHeight: 16,
    color: dx.inkMuted,
  },
});

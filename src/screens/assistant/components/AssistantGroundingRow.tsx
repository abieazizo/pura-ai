import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sparkle } from 'phosphor-react-native';
import { dx } from '../decisionTokens';

interface Props {
  label: string;
}

/**
 * Tiny "Pura · Checked against tonight's decision" row that sits
 * above every assistant response. It's the trust signal that the
 * answer is grounded — not a generic chatbot reply.
 */
export function AssistantGroundingRow({ label }: Props) {
  return (
    <View style={styles.row} accessibilityRole="text">
      <Sparkle size={12} color={dx.terracotta} weight="duotone" />
      <Text style={styles.text} maxFontSizeMultiplier={1.1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  text: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11.5,
    color: dx.terracottaText,
    letterSpacing: 0.1,
  },
});

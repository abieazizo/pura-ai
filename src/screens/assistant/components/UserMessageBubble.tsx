import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { dx, dRadius } from '../decisionTokens';

interface Props {
  text: string;
}

/**
 * Warm-tinted user bubble. No blue chat colors; the bubble is
 * terracotta-soft with a slightly cropped top-right corner to keep
 * the speech-bubble convention without screaming.
 */
export function UserMessageBubble({ text }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.bubble}>
        <Text style={styles.text} maxFontSizeMultiplier={1.3}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: dRadius.conversationCard,
    borderTopRightRadius: 8,
    backgroundColor: dx.terracottaSoft,
    borderWidth: 1,
    borderColor: dx.terracottaTint,
  },
  text: {
    fontFamily: 'Inter-Regular',
    fontSize: 14.5,
    lineHeight: 20,
    color: dx.ink,
  },
});

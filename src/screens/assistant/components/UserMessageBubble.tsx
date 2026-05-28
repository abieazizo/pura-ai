import React from 'react';
import { Clipboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { dx, dRadius } from '../decisionTokens';
import { hapt } from '@/utils/haptics';

interface Props {
  text: string;
}

/**
 * Warm-tinted user bubble. Long-press copies the message text to clipboard.
 */
export function UserMessageBubble({ text }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        onLongPress={() => {
          Clipboard.setString(text);
          hapt.select();
        }}
        accessibilityHint="Long press to copy"
        style={({ pressed }) => [styles.bubble, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.text} maxFontSizeMultiplier={1.3}>
          {text}
        </Text>
      </Pressable>
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

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight } from 'phosphor-react-native';
import { dx, dRadius } from '../decisionTokens';
import { hapt } from '@/utils/haptics';

interface Props {
  prompts: readonly string[];
  onPick: (prompt: string) => void;
}

/**
 * Stacked prompt buttons. Each row is a full-width pill so the user
 * can tap a prompt without crowding chip after chip into a narrow
 * row. These exist to interrogate, refine, or apply the current
 * decision — they are not a substitute for the decision itself.
 */
export function DecisionPromptList({ prompts, onPick }: Props) {
  return (
    <View style={styles.list}>
      {prompts.map((p) => (
        <Pressable
          key={p}
          accessibilityRole="button"
          accessibilityLabel={p}
          onPress={() => {
            hapt.select();
            onPick(p);
          }}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
          hitSlop={4}
        >
          <Text
            style={styles.text}
            numberOfLines={2}
            maxFontSizeMultiplier={1.2}
          >
            {p}
          </Text>
          <ArrowRight size={14} weight="bold" color={dx.terracottaText} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 6,
  },
  row: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: dRadius.pill,
    backgroundColor: dx.surfaceSecondary,
    borderWidth: 1,
    borderColor: dx.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  text: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 13.5,
    lineHeight: 18,
    letterSpacing: -0.05,
    color: dx.ink,
  },
});

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dx, dRadius, dShadow } from '../decisionTokens';
import { MORNING_AFTER } from '../decisionCopy';
import { hapt } from '@/utils/haptics';

interface Props {
  onAnswer: (a: 'BETTER' | 'SAME' | 'WORSE') => void;
  current: 'BETTER' | 'SAME' | 'WORSE' | null;
}

/**
 * Morning-after feedback prompt. Surfaces when a Recovery Night was
 * applied 6–36h ago and no feedback has been recorded yet. Captures
 * the user's lived experience so the next decision can be tuned —
 * the system never assumes recovery worked just because we said
 * "skip exfoliation".
 */
export function MorningAfterPrompt({ onAnswer, current }: Props) {
  const [picked, setPicked] = useState<'BETTER' | 'SAME' | 'WORSE' | null>(
    current,
  );

  let response: string | null = null;
  if (picked === 'BETTER') response = MORNING_AFTER.responseBetter;
  else if (picked === 'SAME') response = MORNING_AFTER.responseSame;
  else if (picked === 'WORSE') response = MORNING_AFTER.responseWorse;

  return (
    <View style={[styles.card, dShadow.card]}>
      <Text style={styles.prompt} maxFontSizeMultiplier={1.25}>
        {MORNING_AFTER.prompt}
      </Text>
      <View style={styles.row}>
        <Choice
          label={MORNING_AFTER.better}
          active={picked === 'BETTER'}
          onPress={() => {
            hapt.select();
            setPicked('BETTER');
            onAnswer('BETTER');
          }}
        />
        <Choice
          label={MORNING_AFTER.same}
          active={picked === 'SAME'}
          onPress={() => {
            hapt.select();
            setPicked('SAME');
            onAnswer('SAME');
          }}
        />
        <Choice
          label={MORNING_AFTER.worse}
          active={picked === 'WORSE'}
          onPress={() => {
            hapt.select();
            setPicked('WORSE');
            onAnswer('WORSE');
          }}
        />
      </View>
      {response ? (
        <View style={styles.response}>
          <Text style={styles.responseText} maxFontSizeMultiplier={1.3}>
            {response}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Choice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        active && styles.choiceActive,
        pressed && { opacity: 0.9 },
      ]}
    >
      <Text
        style={[styles.choiceText, active && styles.choiceTextActive]}
        maxFontSizeMultiplier={1.15}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: dx.surfacePrimary,
    borderRadius: dRadius.conversationCard,
    borderWidth: 1,
    borderColor: dx.line,
    padding: 18,
    gap: 12,
  },
  prompt: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15.5,
    lineHeight: 21,
    color: dx.ink,
    letterSpacing: -0.1,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choice: {
    paddingHorizontal: 14,
    height: 42,
    borderRadius: dRadius.pill,
    borderWidth: 1,
    borderColor: dx.line,
    backgroundColor: dx.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceActive: {
    borderColor: dx.terracotta,
    backgroundColor: dx.terracottaSoft,
  },
  choiceText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: dx.ink,
  },
  choiceTextActive: {
    color: dx.terracottaText,
    fontFamily: 'Inter-SemiBold',
  },
  response: {
    backgroundColor: dx.surfaceSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dx.line,
    padding: 12,
  },
  responseText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: dx.inkSecondary,
  },
});

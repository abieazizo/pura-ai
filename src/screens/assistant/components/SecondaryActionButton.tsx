import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { ArrowRight } from 'phosphor-react-native';
import { dx, dRadius } from '../decisionTokens';
import { hapt } from '@/utils/haptics';

interface Props {
  label: string;
  onPress: () => void;
  trailingArrow?: boolean;
  underline?: boolean;
}

/**
 * Lightweight link-style action used for "Ask why this changed" and
 * similar secondary triggers. Underline variant has no chrome — it
 * reads as a plain link.
 */
export function SecondaryActionButton({
  label,
  onPress,
  trailingArrow = true,
  underline = false,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        hapt.select();
        onPress();
      }}
      hitSlop={8}
      style={({ pressed }) => [
        underline ? styles.underline : styles.pill,
        pressed && { opacity: 0.88 },
      ]}
    >
      <Text
        style={[
          styles.label,
          underline ? styles.labelUnderline : styles.labelPill,
        ]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.15}
      >
        {label}
      </Text>
      {trailingArrow ? (
        <ArrowRight size={13} weight="bold" color={dx.terracottaText} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: dRadius.pill,
    backgroundColor: dx.terracottaSoft,
  },
  underline: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  label: { fontFamily: 'Inter-SemiBold', letterSpacing: 0.05 },
  labelPill: { fontSize: 13.5, color: dx.terracottaText },
  labelUnderline: {
    fontSize: 13.5,
    color: dx.terracottaText,
    textDecorationLine: 'underline',
  },
});

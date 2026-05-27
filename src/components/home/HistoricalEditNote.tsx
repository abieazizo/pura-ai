/**
 * HistoricalEditNote — the single quiet historical line below the
 * mirror portal. Renders only when Pura has a real previous edit to
 * reference. Phrased as past memory, never as a current diagnosis.
 *
 * The note is set with a hairline rule and italic serif body to read
 * like a marginal annotation rather than another card.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CaretRight } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { pura26 } from '@/screens/home/homeTokens';

export interface HistoricalEditNoteProps {
  body: string;
  actionLabel?: string;
  onPress: () => void;
}

export function HistoricalEditNote({
  body,
  actionLabel = 'See your previous edit',
  onPress,
}: HistoricalEditNoteProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.rule} />
      <Text style={styles.body} maxFontSizeMultiplier={1.2}>
        {body}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPress={() => {
          hapt.select();
          onPress();
        }}
        hitSlop={10}
        style={({ pressed }) => [
          styles.action,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={styles.actionText} maxFontSizeMultiplier={1.15}>
          {actionLabel}
        </Text>
        <CaretRight size={11} color={pura26.inkSecondary} weight="bold" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 32,
    paddingTop: 44,
    paddingBottom: 18,
    gap: 16,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: pura26.border,
    width: 40,
  },
  body: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 18,
    lineHeight: 25,
    color: pura26.inkSecondary,
    letterSpacing: -0.1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  actionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    color: pura26.inkSecondary,
    letterSpacing: 0.2,
  },
});

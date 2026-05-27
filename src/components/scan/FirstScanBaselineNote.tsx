/**
 * FirstScanBaselineNote — small note that sits under SkinScoreReveal
 * on the user's FIRST scan results screen.
 *
 * Replaces the returning-user delta language ("Up 2", "Stable",
 * "+5 since last scan") which is meaningless before a baseline
 * exists. The note explicitly says:
 *
 *   • This is a baseline, not a verdict
 *   • Tomorrow's scan starts tracking change
 *
 * Designed to be calm and proud — never apologetic.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sparkle } from 'phosphor-react-native';
import { palette } from '@/theme';

interface Props {
  /** Optional — if provided, the note name-drops the focus zone. */
  focusLabel?: string | null;
}

export function FirstScanBaselineNote({ focusLabel }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.kickerRow}>
        <Sparkle size={11} color={palette.clayDeep} weight="fill" />
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          FIRST SCAN BASELINE
        </Text>
      </View>
      <Text style={styles.body} maxFontSizeMultiplier={1.2}>
        This is your starting point. Scan again tomorrow to begin tracking
        change
        {focusLabel ? ` on the ${focusLabel.toLowerCase()}` : ''}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    marginHorizontal: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: palette.clayPaper,
    borderWidth: 1,
    borderColor: palette.clay,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.ink,
  },
});

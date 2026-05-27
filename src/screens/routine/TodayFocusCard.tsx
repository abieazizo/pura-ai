/**
 * TodayFocusCard — Routine sub-tab's daily voice card.
 *
 * Reads ONLY the canonical `insight.bestMove.body`. Never invents copy.
 * Renders nothing when there's no bestMove (the caller gates).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme';

interface Props {
  text: string;
}

export function TodayFocusCard({ text }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.rail} pointerEvents="none" />
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        TODAY’S FOCUS
      </Text>
      {/* v23.0 — 4 lines so the concrete instructions fit; serif here
          is intentional (this is the Routine page's hero focus line,
          not a functional CTA). */}
      <Text style={styles.body} maxFontSizeMultiplier={1.2} numberOfLines={4}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 18,
    paddingLeft: 19,
    paddingRight: 18,
    borderRadius: 18,
    backgroundColor: palette.clayPaper,
    position: 'relative',
    overflow: 'hidden',
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: palette.clay,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  body: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.2,
    color: palette.ink,
  },
});

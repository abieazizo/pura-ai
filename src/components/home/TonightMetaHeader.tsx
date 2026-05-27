/**
 * TonightMetaHeader — small phase-aware marker line.
 *
 * "TONIGHT · MAY 23" in the standard evening window. The eyebrow
 * shifts honestly outside that window:
 *   - early afternoon  →  "EARLY · MAY 23"
 *   - 22:00 to 02:00  →  "LATE TONIGHT · MAY 23"
 *   - 02:00 to 12:00  →  "OVERNIGHT · MAY 22" (refers to the *previous*
 *                          evening's session)
 *
 * Generous breathing room is intentional: the header sits alone above
 * a long stretch of paper and the headline below it breathes into the
 * top third of the screen.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useEveningPhase, evaluateEveningPhase } from '@/hooks/useEveningPhase';
import { pura26 } from '@/screens/home/homeTokens';

export interface TonightMetaHeaderProps {
  /** Allows tests / Storybook to pin the date. Production omits. */
  now?: Date;
}

const MONTH_SHORT = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

export function TonightMetaHeader({ now }: TonightMetaHeaderProps) {
  const phase = now ? evaluateEveningPhase(now) : useEveningPhase();
  const month = MONTH_SHORT[phase.referenceDate.getMonth()];
  const day = phase.referenceDate.getDate();
  const label = `${phase.eyebrow} · ${month} ${day}`;
  return (
    <View style={styles.wrap}>
      <Text
        accessibilityRole="text"
        accessibilityLabel={label.replace(/·/g, ',').toLowerCase()}
        style={styles.text}
        maxFontSizeMultiplier={1.1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 32,
    paddingTop: 14,
    paddingBottom: 8,
  },
  text: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 2.6,
    color: pura26.inkMuted,
  },
});

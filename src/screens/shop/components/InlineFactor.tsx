/**
 * InlineFactor — a single-line, coral-text affordance shown above
 * the price on supporting + mini product cards. Surfaces the
 * strongest personalized match factor so even small cards visibly
 * communicate why they're showing here for THIS user.
 *
 * Renders null when the top factor is the generic "baseline" — we
 * never lie about a match.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check } from 'phosphor-react-native';
import { puraShop } from '@/theme';
import type { MatchedFactor } from '../personalization';

export interface InlineFactorProps {
  factors: MatchedFactor[];
}

export function InlineFactor({ factors }: InlineFactorProps) {
  const top = factors
    .filter((f) => f.kind !== 'baseline')
    .sort((a, b) => b.weight - a.weight)[0];
  if (!top) return null;
  return (
    <View style={styles.row}>
      <Check size={9} color={puraShop.coralDeep} weight="bold" />
      <Text
        style={styles.text}
        maxFontSizeMultiplier={1.15}
        numberOfLines={1}
      >
        {top.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  text: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: puraShop.coralDeep,
    letterSpacing: -0.05,
  },
});

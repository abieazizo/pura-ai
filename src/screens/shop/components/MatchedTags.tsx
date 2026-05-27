/**
 * MatchedTags — small coral-soft pills surfacing why the hero (or
 * supporting) card is personally relevant. Reads from the typed
 * `MatchedFactor[]` produced by `scoreForUser` so the row never
 * lies about what was actually matched.
 *
 * Renders at most 2 factors, sorted by descending weight, dropping
 * the generic "baseline" placeholder. Returns null when there are
 * no real factors so the component is invisible until the data is
 * meaningful.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sparkle, Drop, Star, Shield, Flame, Clock } from 'phosphor-react-native';
import {
  puraShop,
  puraShopRadius,
  puraShopType,
} from '@/theme';
import type { MatchedFactor } from '../personalization';

export interface MatchedTagsProps {
  factors: MatchedFactor[];
  /** Optional kicker above the row ("MATCHED FOR"). */
  showKicker?: boolean;
  /** Max number of tags rendered. Default 2. */
  limit?: number;
}

export function MatchedTags({
  factors,
  showKicker,
  limit = 2,
}: MatchedTagsProps) {
  const display = factors
    .filter((f) => f.kind !== 'baseline')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);

  if (display.length === 0) return null;

  return (
    <View>
      {showKicker ? (
        <Text style={styles.kicker} maxFontSizeMultiplier={1.15}>
          MATCHED FOR
        </Text>
      ) : null}
      <View style={styles.row}>
        {display.map((f, idx) => (
          <View key={`${f.kind}-${idx}`} style={styles.tag}>
            {iconFor(f)}
            <Text style={styles.label} maxFontSizeMultiplier={1.15} numberOfLines={1}>
              {f.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function iconFor(f: MatchedFactor) {
  const c = puraShop.coralDeep;
  const size = 11;
  switch (f.kind) {
    case 'concern':
      return f.label.includes('breakouts') ? (
        <Flame size={size} color={c} weight="fill" />
      ) : f.label.includes('marks') ? (
        <Star size={size} color={c} weight="fill" />
      ) : f.label.includes('hydration') ? (
        <Drop size={size} color={c} weight="fill" />
      ) : f.label.includes('sensitive') || f.label.includes('barrier') ? (
        <Shield size={size} color={c} weight="fill" />
      ) : (
        <Sparkle size={size} color={c} weight="fill" />
      );
    case 'skinType':
      return <Sparkle size={size} color={c} weight="fill" />;
    case 'sensitivity':
      return <Shield size={size} color={c} weight="fill" />;
    case 'goal':
      return <Star size={size} color={c} weight="fill" />;
    case 'timing':
      return <Clock size={size} color={c} weight="fill" />;
    default:
      return <Sparkle size={size} color={c} weight="fill" />;
  }
}

const styles = StyleSheet.create({
  kicker: {
    ...puraShopType.matchLabel,
    color: puraShop.coralDeep,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: puraShop.coralSoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: puraShopRadius.chip,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: puraShop.coralDeep,
    letterSpacing: -0.1,
  },
});

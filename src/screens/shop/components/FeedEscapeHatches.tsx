/**
 * FeedEscapeHatches — the quiet ways out of the curated feed (Step 10).
 *
 * The feed is opinionated: it picks for you. But a trustworthy storefront
 * never traps you inside its opinion — so two understated exits sit at the
 * bottom of the edit (and inside the terminal card): browse the whole catalog,
 * or browse by concern. They are deliberately quiet — outlined, not filled —
 * because they're the fallback, not the headline.
 *
 * They route OUT to the existing full-catalog and browse-by-concern surfaces
 * (which are intentionally untouched). `catalogCount` comes from the model so
 * the "all N" label is always honest.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight } from 'phosphor-react-native';

import { puraShop, puraShopHome } from '@/theme';

export interface FeedEscapeHatchesProps {
  catalogCount: number;
  onBrowseAll: () => void;
  onBrowseConcern?: () => void;
  /** `card` sits inside the terminal card (no heading); `page` ends the feed. */
  variant?: 'card' | 'page';
}

export function FeedEscapeHatches({
  catalogCount,
  onBrowseAll,
  onBrowseConcern,
  variant = 'page',
}: FeedEscapeHatchesProps) {
  return (
    <View style={styles.wrap}>
      {variant === 'page' ? (
        <Text style={styles.lead}>Looking for something specific?</Text>
      ) : null}

      <HatchRow
        label={`Browse all ${catalogCount} products`}
        onPress={onBrowseAll}
      />
      {onBrowseConcern ? (
        <HatchRow label="Browse by concern" onPress={onBrowseConcern} />
      ) : null}
    </View>
  );
}

function HatchRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      <ArrowRight size={16} weight="bold" color={puraShopHome.quietInk} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 10,
  },
  lead: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    letterSpacing: -0.1,
    color: puraShop.inkSecondary,
    textAlign: 'center',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: puraShopHome.cardEdge,
    backgroundColor: puraShopHome.cardSurface,
  },
  rowPressed: {
    opacity: 0.65,
  },
  rowLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: -0.2,
    color: puraShopHome.ink,
  },
});

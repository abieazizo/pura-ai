/**
 * SavedShelf — the "Saved by you" row (Step 8).
 *
 * The things the user reached out and kept, gathered into one quiet shelf
 * below tonight's edit. It reads the model's `savedCards` (already resolved
 * from the canonical saved set, scored for display) and renders them as
 * EditorialProductCards. Empty → renders nothing; the feed never shows an
 * empty "Saved" header begging to be filled.
 *
 * The per-card eyebrow is suppressed here — the section header already says
 * "Saved by you", so repeating it on every tile would be noise.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { puraShopHome, puraShopLayout, puraShopType } from '@/theme';
import type { StackCard } from '../shopStackModel';
import { EditorialProductCard } from './EditorialProductCard';

export interface SavedShelfProps {
  cards: StackCard[];
  onPressProduct?: (productId: string) => void;
  onToggleSave?: (productId: string) => void;
  /** Optional — a quiet "All N" link when the shelf has more than a glance. */
  onViewAll?: () => void;
}

export function SavedShelf({
  cards,
  onPressProduct,
  onToggleSave,
  onViewAll,
}: SavedShelfProps) {
  if (cards.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <View style={styles.headLeft}>
          <View style={styles.headTick} />
          <Text style={styles.headLabel}>SAVED BY YOU</Text>
        </View>
        {onViewAll && cards.length > 2 ? (
          <Pressable
            onPress={onViewAll}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`See all ${cards.length} saved products`}
          >
            <Text style={styles.viewAll}>All {cards.length}</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {cards.map((c) => (
          <EditorialProductCard
            key={c.key}
            card={c}
            width={158}
            showEyebrow={false}
            onPress={onPressProduct}
            onToggleSave={onToggleSave}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: puraShopLayout.horizontalPadding,
    marginBottom: 12,
  },
  headLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headTick: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: puraShopHome.quietInk,
    marginRight: 8,
  },
  headLabel: {
    ...puraShopType.tagLabel,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: puraShopHome.quietInk,
  },
  viewAll: {
    ...puraShopType.viewAll,
    color: puraShopHome.treatAccent,
  },
  row: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    paddingVertical: 4,
    gap: 12,
  },
});

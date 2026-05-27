/**
 * ProductCarousel — horizontal product row used by the storefront
 * for "Complete tonight's routine", "Breakout essentials", and any
 * future supporting carousel.
 *
 * Owns the snap behavior, content insets, and (in pass 4) the
 * graceful overflow fade. Card-level rendering is delegated to
 * `MiniProductCard` so swapping the card style affects every
 * carousel in one place.
 */

import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { puraShop, puraShopLayout, puraShopSpace } from '@/theme';
import type { ShopCard } from '../useShopViewModel';
import { MiniProductCard } from './MiniProductCard';

export interface ProductCarouselProps {
  cards: ShopCard[];
  miniWidth: number;
  /** Optional search tokens — when present, each card's name shows
   *  matched substrings in coral semibold. */
  highlightTokens?: readonly string[];
  onOpenProduct: (id: string) => void;
  onQuickAdd: (id: string) => void;
}

const MINI_GAP = puraShopSpace.md; // 12

export const MINI_CAROUSEL_GAP = MINI_GAP;

export function ProductCarousel({
  cards,
  miniWidth,
  highlightTokens,
  onOpenProduct,
  onQuickAdd,
}: ProductCarouselProps) {
  // Memoize the keyExtractor-equivalent so React doesn't reconcile
  // every render. (Real keys come from card.catalog.id.)
  const handleOpen = useCallback(
    (id: string) => onOpenProduct(id),
    [onOpenProduct],
  );
  const handleAdd = useCallback(
    (id: string) => onQuickAdd(id),
    [onQuickAdd],
  );

  if (cards.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      snapToInterval={miniWidth + MINI_GAP}
      decelerationRate="fast"
    >
      {cards.map((card) => (
        <MiniProductCard
          key={card.catalog.id}
          product={card.catalog}
          width={miniWidth}
          isInRoutine={card.isInRoutine}
          factors={card.factors}
          highlightTokens={highlightTokens}
          onPress={() => handleOpen(card.catalog.id)}
          onAdd={() => handleAdd(card.catalog.id)}
        />
      ))}
      {/* Trailing spacer doubles as a clean carousel-end marker — keeps
          the last card from kissing the viewport edge after a snap. */}
      <View style={styles.endSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    paddingBottom: 6,
    gap: MINI_GAP,
  },
  endSpacer: {
    width: puraShopLayout.horizontalPadding - MINI_GAP,
  },
});

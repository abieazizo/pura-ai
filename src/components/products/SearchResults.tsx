import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { palette } from '@/theme';
import type { Product } from '@/types';
import { ProductCardHorizontal } from './ProductCardHorizontal';

export interface SearchResultsProps {
  query: string;
  results: Product[];
}

/**
 * 2-column grid rendered while the search input has text (§2.10). Reuses
 * `ProductCardHorizontal` at a dynamic width so the tiles keep their
 * tint + heart + match-pill treatment consistent with the catalog rows.
 */
export function SearchResults({ query, results }: SearchResultsProps) {
  const { width } = useWindowDimensions();
  const cardW = Math.floor((width - 40 - 12) / 2);

  if (results.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText} maxFontSizeMultiplier={1.2}>
          {`No matches for \u201C${query}\u201D.`}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {results.map((p) => (
        <ProductCardHorizontal
          key={p.id}
          product={p}
          width={cardW}
          style={styles.cell}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cell: {
    // card height stays 220pt; the Animated.View inside ProductCardHorizontal
    // honours the `width` prop we pass.
  },
  emptyWrap: {
    paddingHorizontal: 20,
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 22,
    color: palette.inkTertiary,
    textAlign: 'center',
  },
});

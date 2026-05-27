/**
 * EditorialProductTile — a recommendation card surfaced inside The Edit
 * (horizontal scroll inside each mode). Carries product identity, the
 * Pura role label, short reason, timing, and price. Match percentage is
 * supporting only.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme';
import type { Recommendation } from '@/state/skinEdit';
import { RECOMMENDATION_STATE_LABEL } from '@/state/skinEdit';
import { ProductStage } from './ProductStage';

interface EditorialProductTileProps {
  recommendation: Recommendation;
  timing?: string;
  onPress: () => void;
}

export function EditorialProductTile({ recommendation, timing, onPress }: EditorialProductTileProps) {
  const { product, state, shortReason } = recommendation;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.brand} ${product.name}, ${RECOMMENDATION_STATE_LABEL[state]}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.96 }]}
    >
      <View style={styles.stage}>
        <ProductStage product={product} imageUrl={product.imageUrl} size="tile" />
      </View>

      <View style={styles.stateBadge}>
        <Text style={styles.stateBadgeText} maxFontSizeMultiplier={1.1} numberOfLines={1}>
          {RECOMMENDATION_STATE_LABEL[state]}
        </Text>
      </View>

      <Text style={styles.brand} maxFontSizeMultiplier={1.1} numberOfLines={1}>
        {product.brand.toUpperCase()}
      </Text>
      <Text style={styles.name} maxFontSizeMultiplier={1.2} numberOfLines={2}>
        {product.name}
      </Text>

      <Text style={styles.reason} maxFontSizeMultiplier={1.2} numberOfLines={2}>
        {shortReason}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.timing} maxFontSizeMultiplier={1.1} numberOfLines={1}>
          {timing ?? 'Tonight · PM'}
        </Text>
        <Text style={styles.price} maxFontSizeMultiplier={1.1}>
          {product.price > 0 ? `$${product.price}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    borderRadius: 20,
    backgroundColor: '#FCFAF7',
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 12,
  },
  stage: {
    marginBottom: 10,
  },
  stateBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: palette.clayPaper,
    marginBottom: 8,
  },
  stateBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 0.6,
    color: palette.clayDeep,
    textTransform: 'uppercase',
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.inkSecondary,
    marginBottom: 2,
  },
  name: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    lineHeight: 18,
    color: palette.ink,
    marginBottom: 8,
    minHeight: 36,
  },
  reason: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: palette.inkSecondary,
    marginBottom: 12,
    minHeight: 32,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  timing: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    flex: 1,
  },
  price: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
});

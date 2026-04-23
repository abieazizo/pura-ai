import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Star } from 'phosphor-react-native';
import { palette } from '@/theme';

export interface PriceAndRatingProps {
  price: number;
  rating: number;
  reviewCount: number;
}

function formatPrice(p: number): string {
  if (Number.isInteger(p)) return `$${p}`;
  return `$${p.toFixed(2)}`;
}

/**
 * Price left, star rating + review count right (§3.6). Stars render in
 * terracotta at three fidelity levels: fill, duotone (half-state), and
 * regular (outline).
 */
export function PriceAndRating({
  price,
  rating,
  reviewCount,
}: PriceAndRatingProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.price} maxFontSizeMultiplier={1.15}>
        {formatPrice(price)}
      </Text>

      <View style={styles.right}>
        <View style={styles.stars}>
          {[0, 1, 2, 3, 4].map((i) => {
            const weight =
              rating > i + 0.5
                ? 'fill'
                : rating > i
                ? 'duotone'
                : 'regular';
            return (
              <Star
                key={i}
                size={14}
                color={palette.clay}
                weight={weight as 'fill' | 'duotone' | 'regular'}
              />
            );
          })}
        </View>
        <Text style={styles.rating} maxFontSizeMultiplier={1.15}>
          {rating.toFixed(1)}
        </Text>
        <Text style={styles.sep}>·</Text>
        <Text style={styles.reviews} maxFontSizeMultiplier={1.15}>
          {`${reviewCount.toLocaleString()} reviews`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginHorizontal: 20,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  price: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 32,
    letterSpacing: -0.6,
    color: palette.clay,
    fontVariant: ['tabular-nums'],
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rating: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.ink,
  },
  sep: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: palette.inkTertiary,
  },
  reviews: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: palette.inkTertiary,
  },
});

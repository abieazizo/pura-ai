import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path, Rect } from 'react-native-svg';
import { Heart } from 'phosphor-react-native';
import { colors, palette, radius, space, type as typography } from '@/theme';
import type { Product, ProductMatch } from '@/types';

export type ProductCardVariant = 'default' | 'match' | 'chip' | 'detailRow';

export interface ProductCardProps {
  product: Product;
  match?: ProductMatch;
  variant?: ProductCardVariant;
  onPress?: () => void;
  wishlisted?: boolean;
  onToggleWishlist?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * v5 patch §3.2 — grid product cards are flat tinted rectangles, not stock
 * photography. Card tint is chosen deterministically from the product id
 * (hash % 3) into one of three warm tones: sand, clay-paper, moss-paper.
 *
 *   ┌───────────────────────────┐
 *   │ 89 match          ♡       │  ← micro kicker + wishlist
 *   │                           │
 *   │ The Ordinary              │  ← brand micro uppercase
 *   │ Niacinamide 10%           │  ← serif 22pt (max 2 lines, word-break)
 *   │ + Zinc 1%                 │
 *   │                           │
 *   │ $14                  ⎔    │  ← tabular price + bottle silhouette
 *   └───────────────────────────┘
 *
 * Product names NEVER truncate mid-word. numberOfLines={3}, adjustsFontSizeToFit.
 */
export function ProductCard({
  product,
  match,
  variant = 'default',
  onPress,
  wishlisted,
  onToggleWishlist,
  style,
}: ProductCardProps) {
  if (variant === 'chip') {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${product.brand} ${product.name}`}
        style={({ pressed }) => [
          styles.chip,
          pressed && { opacity: 0.9 },
          style,
        ]}
      >
        <Image source={product.imageUri} style={styles.chipImage} contentFit="cover" />
        <View style={styles.chipText}>
          <Text style={styles.chipBrand}>{product.brand.toUpperCase()}</Text>
          <Text style={styles.chipName}>{product.name}</Text>
        </View>
      </Pressable>
    );
  }

  if (variant === 'detailRow') {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${product.brand} ${product.name}`}
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: colors.bgSubtle },
          style,
        ]}
      >
        <Image source={product.imageUri} style={styles.rowImage} contentFit="cover" />
        <View style={styles.rowText}>
          <Text style={styles.cardBrand}>{product.brand.toUpperCase()}</Text>
          <Text
            style={styles.cardName}
            numberOfLines={3}
            textBreakStrategy="simple"
            lineBreakMode="tail"
          >
            {product.name}
          </Text>
          {match ? (
            <Text style={styles.matchText}>{match.matchPercent}% match</Text>
          ) : null}
        </View>
        {onToggleWishlist ? (
          <Pressable
            onPress={onToggleWishlist}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            style={({ pressed }) => [styles.heartBtn, pressed && { opacity: 0.7 }]}
          >
            <Heart
              size={22}
              color={wishlisted ? palette.coral : palette.inkTertiary}
              weight={wishlisted ? 'fill' : 'regular'}
            />
          </Pressable>
        ) : null}
      </Pressable>
    );
  }

  // default | match (grid card — flat tinted per §3.2)
  const tint = pickTint(product.id);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${product.brand} ${product.name}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: tint },
        pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
        style,
      ]}
    >
      {/* Top row: match kicker (left) + wishlist (right) */}
      <View style={styles.topRow}>
        {match && variant === 'match' ? (
          <Text style={styles.matchKicker}>
            <Text style={styles.matchKickerNum}>{match.matchPercent}</Text>
            {'  match'.toUpperCase()}
          </Text>
        ) : (
          <View />
        )}
        {onToggleWishlist ? (
          <Pressable
            onPress={onToggleWishlist}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Heart
              size={18}
              color={wishlisted ? palette.coral : palette.ink}
              weight={wishlisted ? 'fill' : 'regular'}
            />
          </Pressable>
        ) : null}
      </View>

      {/* Name block */}
      <View style={styles.nameBlock}>
        <Text style={styles.cardBrand} numberOfLines={1}>
          {product.brand.toUpperCase()}
        </Text>
        <Text
          style={styles.cardName}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          textBreakStrategy="simple"
          lineBreakMode="tail"
        >
          {product.name}
        </Text>
      </View>

      {/* Bottom row: price (left) + bottle glyph (right) */}
      <View style={styles.bottomRow}>
        {product.priceUsd ? (
          <Text style={styles.price}>${product.priceUsd}</Text>
        ) : (
          <View />
        )}
        <BottleGlyph />
      </View>
    </Pressable>
  );
}

/**
 * Deterministic tint for a given product id. Hash → 3 tones. First-in-index
 * bucket tends to land on sand — pleasant for the FOR YOU section's opener.
 */
function pickTint(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const idx = h % 3;
  return [palette.clayPaper, palette.sandPaper, palette.mossLight][idx];
}

/**
 * Line-drawn bottle silhouette, 20% ink. Single SVG path per §3.2.
 */
function BottleGlyph() {
  return (
    <Svg width={24} height={36} viewBox="0 0 24 36" opacity={0.2}>
      <Path
        d="M9 2 L15 2 L15 8 L18 10 L18 34 L6 34 L6 10 L9 8 Z"
        stroke={palette.ink}
        strokeWidth={1}
        fill="none"
        strokeLinejoin="round"
      />
      <Rect x={8} y={14} width={8} height={4} fill={palette.ink} fillOpacity={0.1} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 4,
    padding: space.md,
    minHeight: 200,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  matchKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: palette.clay,
    textTransform: 'uppercase',
  },
  matchKickerNum: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 16,
    letterSpacing: 0,
    color: palette.clay,
  },
  nameBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  cardBrand: {
    ...typography.micro,
    color: palette.inkTertiary,
    marginBottom: 4,
  },
  cardName: {
    // §3.2 — Instrument Serif 22pt, wraps at word boundaries only
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 22,
    lineHeight: 26,
    color: palette.ink,
  },
  price: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: space.md,
  },

  // chip & row styles unchanged from v5 except where §2.3 word-breaking
  // guards were added on the detailRow name.
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md,
    padding: 4,
    paddingRight: space.sm,
    maxWidth: 220,
  },
  chipImage: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    marginRight: space.sm,
  },
  chipText: { flex: 1 },
  chipBrand: { ...typography.micro, color: colors.textTertiary },
  chipName: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: space.sm,
  },
  rowImage: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.bgSubtle,
    marginRight: space.md,
  },
  rowText: { flex: 1 },
  matchText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
    marginTop: 4,
  },
  heartBtn: { paddingHorizontal: space.sm },
});

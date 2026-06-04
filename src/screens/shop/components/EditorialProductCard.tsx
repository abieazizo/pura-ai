/**
 * EditorialProductCard — the compact, reusable product card for the Pura Shop
 * home's horizontal shelves (Step 11). The swipeable StackCard is the feed's
 * centerpiece; this is its quieter sibling — the same editorial vocabulary
 * (pillar halo, serif name, the one accent) distilled into a tile that lives
 * in a row: the "Saved by you" shelf, the pre-scan teaser gate, and any later
 * cross-screen surface that needs a Pura-home product tile.
 *
 * It renders ONE `StackCard` model value and nothing else — no store, no raw
 * AI output. The match % shows only when personalization is real
 * (`matchPercent != null`), so a pre-scan teaser (whose match is null by
 * construction) never fakes a number.
 *
 * Web-safety: the open-zone and the save heart are SIBLINGS, never nested, so
 * react-native-web never emits a <button> inside a <button>.
 */

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Heart } from 'phosphor-react-native';

import { puraShopHome, puraShopShadow, puraShopType } from '@/theme';
import type { StackCard } from '../shopStackModel';

export interface EditorialProductCardProps {
  card: StackCard;
  /** Tile width. Defaults to a shelf-friendly 160. */
  width?: number;
  /** Show the editorial eyebrow above the product. Default true. */
  showEyebrow?: boolean;
  onPress?: (productId: string) => void;
  onToggleSave?: (productId: string) => void;
}

export function EditorialProductCard({
  card,
  width = 160,
  showEyebrow = true,
  onPress,
  onToggleSave,
}: EditorialProductCardProps) {
  const p = card.product;
  if (!p) return null;

  const accent = card.pillarTheme?.accent ?? puraShopHome.ink;
  const halo = card.pillarTheme?.halo ?? puraShopHome.treatHalo;
  const productLabel = `${p.brand} ${p.shortName ?? p.name}`;
  const showMatch = card.hasRealPersonalization && card.matchPercent != null;

  return (
    <View style={[styles.card, { width }]}>
      {/* Open-zone — packshot + identity + price. */}
      <Pressable
        onPress={() => onPress?.(p.id)}
        accessibilityRole="button"
        accessibilityLabel={`${productLabel}. ${formatPrice(p.price)}${
          showMatch ? `. ${card.matchPercent}% match` : ''
        }`}
        style={({ pressed }) => [styles.openZone, pressed && styles.pressed]}
      >
        {showEyebrow ? (
          <View style={styles.eyebrowRow}>
            <View style={[styles.eyebrowTick, { backgroundColor: accent }]} />
            <Text style={[styles.eyebrow, { color: accent }]} numberOfLines={1}>
              {card.eyebrow}
            </Text>
          </View>
        ) : null}

        <View style={styles.zone}>
          <View style={[styles.halo, { backgroundColor: halo }]} />
          <Image
            source={p.catalogPackshot}
            style={styles.img}
            resizeMode="contain"
            accessibilityLabel={productLabel}
          />
        </View>

        <Text style={styles.brand} numberOfLines={1}>
          {p.brand.toUpperCase()}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {p.shortName ?? p.name}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.price}>{formatPrice(p.price)}</Text>
          {showMatch ? (
            <Text style={[styles.match, { color: accent }]} numberOfLines={1}>
              {card.matchPercent}% match
            </Text>
          ) : null}
        </View>
      </Pressable>

      {/* Save heart — a sibling Pressable in the top-right (never nested). */}
      <Pressable
        onPress={() => onToggleSave?.(p.id)}
        hitSlop={8}
        style={styles.heart}
        accessibilityRole="button"
        accessibilityLabel={
          card.isSaved ? `Remove ${productLabel} from saved` : `Save ${productLabel}`
        }
        accessibilityState={{ selected: card.isSaved }}
      >
        <Heart
          size={18}
          weight={card.isSaved ? 'fill' : 'regular'}
          color={card.isSaved ? accent : puraShopHome.quietInk}
        />
      </Pressable>
    </View>
  );
}

function formatPrice(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: puraShopHome.cardSurface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: puraShopHome.cardEdge,
    overflow: 'hidden',
    position: 'relative',
    ...puraShopShadow.card,
  },
  openZone: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  pressed: {
    opacity: 0.85,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  eyebrowTick: {
    width: 12,
    height: 2,
    borderRadius: 1,
    marginRight: 6,
  },
  eyebrow: {
    ...puraShopType.tagLabel,
    fontSize: 9,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  zone: {
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  halo: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  img: {
    width: 78,
    height: 92,
  },
  brand: {
    ...puraShopType.brand,
    fontSize: 10,
    color: puraShopHome.quietInk,
    marginBottom: 3,
  },
  name: {
    ...puraShopType.miniProductSerif,
    color: puraShopHome.ink,
    marginBottom: 9,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  price: {
    ...puraShopType.priceLarge,
    color: puraShopHome.ink,
  },
  match: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: -0.1,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 6,
  },
  heart: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    // Soft white backing so the heart stays legible if it ever sits over the
    // packshot halo.
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
});

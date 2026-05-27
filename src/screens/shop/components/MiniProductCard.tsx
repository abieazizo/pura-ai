/**
 * MiniProductCard — small product card used in horizontal carousels.
 *
 * Pass-2 upgrades:
 *   • Press scale is now a 2-stage Reanimated spring (down 0.965 →
 *     settle 1.0) rather than a single-frame opacity dim.
 *   • The card lifts very slightly on press for a tactile feel.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  puraShop,
  puraShopRadius,
  puraShopShadow,
  puraShopType,
} from '@/theme';
import type { ShopCatalogProduct, ShopBadgeTone } from '../shopCatalog';
import type { MatchedFactor } from '../personalization';
import { ProductPackshot } from './ProductPackshot';
import { AddButton } from './AddButton';
import { InlineFactor } from './InlineFactor';
import { HighlightedText } from './HighlightedText';

export interface MiniProductCardProps {
  product: ShopCatalogProduct;
  width: number;
  isInRoutine: boolean;
  /** Top matched factors so the card can surface "✓ active breakouts". */
  factors?: MatchedFactor[];
  /** When set, the matched substrings inside the product name render
   *  in coral semibold so search hits are visually anchored. */
  highlightTokens?: readonly string[];
  onPress: () => void;
  onAdd: () => void;
}

export function MiniProductCard({
  product,
  width,
  isInRoutine,
  factors,
  highlightTokens,
  onPress,
  onAdd,
}: MiniProductCardProps) {
  const cardHeight = 250;
  const imageH = 134;

  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleIn = () =>
    (scale.value = withSpring(0.965, {
      damping: 16,
      stiffness: 400,
      mass: 0.6,
    }));
  const handleOut = () =>
    (scale.value = withSpring(1.0, {
      damping: 18,
      stiffness: 280,
      mass: 0.65,
    }));

  return (
    <Animated.View style={[styles.card, { width, height: cardHeight }, animated]}>
      <Pressable
        onPress={onPress}
        onPressIn={handleIn}
        onPressOut={handleOut}
        style={styles.pressable}
        accessibilityRole="button"
        accessibilityLabel={`${product.brand} ${product.name}, $${product.price}`}
      >
        <View style={[styles.imageArea, { height: imageH }]}>
          <ProductPackshot
            source={product.catalogPackshot}
            tone={product.packshotTone}
            width={width}
            height={imageH}
            compact
            accessibilityLabel={`${product.brand} ${product.name}`}
          />
          {product.badge ? (
            <View style={styles.tagWrap}>
              <View style={[styles.tag, tagBg(product.badge.tone)]}>
                <Text
                  style={[styles.tagText, tagText(product.badge.tone)]}
                  maxFontSizeMultiplier={1.0}
                  numberOfLines={1}
                >
                  {product.badge.label}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.plate}>
          <Text style={styles.brand} maxFontSizeMultiplier={1.15} numberOfLines={1}>
            {product.brand.toUpperCase()}
          </Text>
          <HighlightedText
            text={product.shortName ?? product.name}
            tokens={highlightTokens}
            style={styles.name}
            numberOfLines={2}
            maxFontSizeMultiplier={1.1}
          />
          {factors && factors.length > 0 ? (
            <InlineFactor factors={factors} />
          ) : null}
          <View style={styles.footer}>
            <Text style={styles.price} maxFontSizeMultiplier={1.15}>
              ${formatPrice(product.price)}
            </Text>
            <View style={styles.plusReserve} />
          </View>
        </View>
      </Pressable>

      <View style={styles.addFloat} pointerEvents="box-none">
        <AddButton
          onPress={onAdd}
          size="sm"
          confirmed={isInRoutine}
          productLabel={`${product.brand} ${product.name}`}
        />
      </View>
    </Animated.View>
  );
}

function formatPrice(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2);
}

function tagBg(tone: ShopBadgeTone) {
  switch (tone) {
    case 'sage': return { backgroundColor: puraShop.tagGentleBg };
    case 'honey': return { backgroundColor: puraShop.tagValueBg };
    case 'coral': return { backgroundColor: puraShop.tagBestsellerBg };
    case 'ocean': return { backgroundColor: puraShop.tagCoasterBg };
    case 'bestseller': return { backgroundColor: puraShop.tagBestsellerBg };
    case 'viral': return { backgroundColor: puraShop.tagViralBg };
  }
}
function tagText(tone: ShopBadgeTone) {
  switch (tone) {
    case 'sage': return { color: puraShop.tagGentleText };
    case 'honey': return { color: puraShop.tagValueText };
    case 'coral': return { color: puraShop.tagBestsellerText };
    case 'ocean': return { color: puraShop.tagCoasterText };
    case 'bestseller': return { color: puraShop.tagBestsellerText };
    case 'viral': return { color: puraShop.tagViralText };
  }
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderRadius: puraShopRadius.cardSmall,
    overflow: 'visible',
    backgroundColor: puraShop.cardSurface,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    ...puraShopShadow.card,
  },
  pressable: {
    flex: 1,
    borderRadius: puraShopRadius.cardSmall,
    overflow: 'hidden',
  },
  imageArea: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: puraShop.borderWarm,
  },
  tagWrap: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    ...puraShopType.tagLabel,
  },
  plate: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  brand: {
    ...puraShopType.brand,
    color: puraShop.inkSecondary,
  },
  name: {
    ...puraShopType.miniProductSerif,
    color: puraShop.ink,
    marginTop: 2,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    ...puraShopType.price,
    color: puraShop.ink,
  },
  plusReserve: {
    width: 36,
    height: 32,
  },
  addFloat: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    zIndex: 2,
  },
});

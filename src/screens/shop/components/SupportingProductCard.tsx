/**
 * SupportingProductCard — compact recommendation card used as the two
 * stacked options to the right of the hero. Vertical layout with a
 * smaller packshot stage on top, info plate below, and a status tag
 * pinned over the image. The brief specifically called these out as
 * supporting (not primary) so the visual weight is intentionally
 * lower than the hero — smaller serif, lighter shadow, no match orb.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Star } from 'phosphor-react-native';
import {
  puraShop,
  puraShopRadius,
  puraShopShadow,
  puraShopType,
} from '@/theme';
import type { ShopCatalogProduct, ShopBadgeTone } from '../shopCatalog';
import { ProductPackshot } from './ProductPackshot';
import { AddButton } from './AddButton';

export interface SupportingProductCardProps {
  product: ShopCatalogProduct;
  width: number;
  height: number;
  isInRoutine: boolean;
  onPress: () => void;
  onAdd: () => void;
}

export function SupportingProductCard({
  product,
  width,
  height,
  isInRoutine,
  onPress,
  onAdd,
}: SupportingProductCardProps) {
  const imageH = Math.round(height * 0.46);
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
    <Animated.View style={[styles.card, { width, height }, animated]}>
      <Pressable
        onPress={onPress}
        onPressIn={handleIn}
        onPressOut={handleOut}
        style={styles.pressable}
        accessibilityRole="button"
        accessibilityLabel={`${product.brand} ${product.name}, $${product.price}`}
      >
        {/* Image stage */}
        <View style={[styles.imageArea, { height: imageH }]}>
          <ProductPackshot
            source={product.catalogPackshot}
            tone={product.packshotTone}
            width={width}
            height={imageH}
            accessibilityLabel={`${product.brand} ${product.name}`}
          />

          {/* Top-left status tag */}
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

          {/* Top-right rating capsule */}
          {product.rating != null ? (
            <View style={styles.ratingWrap}>
              <Text style={styles.ratingText} maxFontSizeMultiplier={1.0}>
                {product.rating.toFixed(1)}
              </Text>
              <Star
                size={11}
                color={puraShop.ratingStar}
                weight="fill"
                style={{ marginLeft: 3 }}
              />
            </View>
          ) : null}
        </View>

        {/* Info plate */}
        <View style={styles.plate}>
          <Text style={styles.brand} maxFontSizeMultiplier={1.15} numberOfLines={1}>
            {product.brand.toUpperCase()}
          </Text>
          <Text
            style={styles.name}
            maxFontSizeMultiplier={1.1}
            numberOfLines={2}
          >
            {product.shortName ?? product.name}
          </Text>
          {product.usageLine ? (
            <Text
              style={styles.usage}
              maxFontSizeMultiplier={1.2}
              numberOfLines={1}
            >
              {product.usageLine}
            </Text>
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
          size="md"
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
    top: 10,
    left: 10,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    ...puraShopType.tagLabel,
  },
  ratingWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 252, 248, 0.92)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ratingText: {
    ...puraShopType.rating,
    color: puraShop.ratingText,
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
    ...puraShopType.supportingProductSerif,
    color: puraShop.ink,
    marginTop: 2,
  },
  usage: {
    ...puraShopType.usageLine,
    color: puraShop.inkMuted,
    marginTop: 4,
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
    width: 38,
    height: 36,
  },
  addFloat: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    zIndex: 2,
  },
});

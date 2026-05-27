/**
 * HeroProductCard — full-width featured recommendation.
 *
 * v35 — minimal, guaranteed-render rebuild.
 *   • Backdrop: a single peach LinearGradient. No white "bloom"
 *     overlay (the prior bloom was painting over the bottle on
 *     web).
 *   • Packshot: React Native's built-in <Image> with explicit pixel
 *     width + height (no percent strings, no onLayout) so it always
 *     paints, even on the first commit, on every renderer.
 *   • Match orb is ALWAYS rendered (using the lowest non-zero
 *     fallback) so the user sees the personalization signal.
 *   • Plate sized to fit: brand + name + benefit + factor row + price
 *     pill + plus button — all visible on a 420pt-tall hero.
 *   • Plus button is a sibling overlay (never nested inside the
 *     outer Pressable), zIndex 20.
 */

import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Sparkle } from 'phosphor-react-native';
import { BlurView } from 'expo-blur';
import {
  puraShop,
  puraShopRadius,
  puraShopShadow,
  puraShopType,
} from '@/theme';
import type { ShopCatalogProduct } from '../shopCatalog';
import type { MatchedFactor } from '../personalization';
import { MatchOrb } from './MatchOrb';
import { AddButton } from './AddButton';
import { MatchedTags } from './MatchedTags';

export interface HeroProductCardProps {
  product: ShopCatalogProduct;
  width: number;
  height: number;
  badgeLabel?: string;
  matchPercent?: number;
  factors?: MatchedFactor[];
  isInRoutine: boolean;
  onPress: () => void;
  onAdd: () => void;
}

const PADDING = 16;
const ORB_SIZE = 64;

export function HeroProductCard({
  product,
  width,
  height,
  badgeLabel = "Tonight's #1",
  matchPercent,
  factors,
  isInRoutine,
  onPress,
  onAdd,
}: HeroProductCardProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const handlePressIn = () => {
    scale.value = withSpring(0.985, {
      damping: 22, stiffness: 380, mass: 0.7,
    });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1.0, {
      damping: 20, stiffness: 260, mass: 0.75,
    });
  };

  // Image area takes ~52% of card height. With heroHeight ≥ 420 the
  // image is at least 218px tall — large enough for the bottle to
  // read confidently while leaving room for the full plate.
  const imageH = Math.max(200, Math.round(height * 0.52));
  // Packshot wraps inside the imageArea with the given inset.
  const packshotW = Math.max(120, width - PADDING * 2);
  const packshotH = Math.max(120, imageH - PADDING * 2);

  // ALWAYS show the match orb — even a low score communicates "this
  // is personalized to you". Floor at the product's catalog-level
  // matchScore (98 for Paula's, etc.) so the orb is meaningful even
  // when the user has no profile data yet.
  const matchScore =
    matchPercent && matchPercent > 0
      ? matchPercent
      : product.matchScore && product.matchScore > 0
        ? product.matchScore
        : 0;

  return (
    <View style={[styles.card, { width, height }]}>
      <Animated.View style={[styles.cardAnim, animated]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
          accessibilityLabel={`${product.brand} ${product.name}, ${matchScore} percent match, $${product.price}`}
          style={styles.pressable}
        >
          {/* Image stage */}
          <View style={[styles.imageArea, { height: imageH }]}>
            <LinearGradient
              colors={[puraShop.heroFrom, puraShop.heroVia, puraShop.heroTo]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />

            {/* Packshot — explicit pixel dimensions, plain RN Image. */}
            <View
              style={[
                styles.packshotWrap,
                {
                  width: packshotW,
                  height: packshotH,
                  left: PADDING,
                  top: PADDING,
                },
              ]}
              pointerEvents="none"
            >
              <Image
                source={product.catalogPackshot}
                style={{ width: packshotW, height: packshotH }}
                resizeMode="contain"
                accessibilityLabel={`${product.brand} ${product.name}`}
                fadeDuration={180}
              />
            </View>

            {/* Tonight's #1 capsule */}
            <View style={styles.badgeWrap} pointerEvents="none">
              <View style={styles.badge}>
                {Platform.OS === 'ios' ? (
                  <BlurView
                    intensity={40}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                  />
                ) : (
                  <View
                    style={[StyleSheet.absoluteFill, styles.badgeBgFallback]}
                  />
                )}
                <Sparkle size={11} color={puraShop.heroSparkle} weight="fill" />
                <Text style={styles.badgeText} maxFontSizeMultiplier={1.05}>
                  {badgeLabel}
                </Text>
              </View>
            </View>

            {/* Match orb */}
            {matchScore > 0 ? (
              <View style={styles.orbWrap} pointerEvents="none">
                <MatchOrb percent={matchScore} size={ORB_SIZE} />
              </View>
            ) : null}
          </View>

          {/* Info plate */}
          <View style={styles.plate}>
            <Text style={styles.brand} maxFontSizeMultiplier={1.1} numberOfLines={1}>
              {product.brand.toUpperCase()}
            </Text>
            <Text style={styles.name} maxFontSizeMultiplier={1.05} numberOfLines={2}>
              {product.name}
            </Text>
            {product.benefitLine ? (
              <Text
                style={styles.benefit}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
              >
                {product.benefitLine}
              </Text>
            ) : null}

            {factors && factors.length > 0 ? (
              <View style={styles.factors}>
                <MatchedTags factors={factors} showKicker={false} limit={2} />
              </View>
            ) : null}

            <View style={styles.footer}>
              <View style={styles.pricePill}>
                <Text style={styles.priceText} maxFontSizeMultiplier={1.1}>
                  ${formatPrice(product.price)}
                </Text>
              </View>
              <View style={styles.plusReserve} />
            </View>
          </View>
        </Pressable>
      </Animated.View>

      {/* Floating AddButton — sibling overlay */}
      <View style={styles.addFloat} pointerEvents="box-none">
        <AddButton
          onPress={onAdd}
          size="lg"
          confirmed={isInRoutine}
          productLabel={`${product.brand} ${product.name}`}
        />
      </View>
    </View>
  );
}

function formatPrice(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2);
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderRadius: puraShopRadius.hero,
    overflow: 'visible',
  },
  cardAnim: {
    width: '100%',
    height: '100%',
    borderRadius: puraShopRadius.hero,
    overflow: 'hidden',
    backgroundColor: puraShop.heroInfoBg,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    ...puraShopShadow.hero,
  },
  pressable: {
    flex: 1,
  },
  imageArea: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  packshotWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  badgeWrap: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
  badge: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeBgFallback: {
    backgroundColor: puraShop.heroTagBg,
    borderRadius: 999,
  },
  badgeText: {
    color: puraShop.heroTagText,
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 0.4,
  },
  orbWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  plate: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: puraShop.heroInfoBg,
  },
  brand: {
    ...puraShopType.brand,
    color: puraShop.inkSecondary,
  },
  name: {
    ...puraShopType.heroProductSerif,
    color: puraShop.ink,
    marginTop: 4,
  },
  benefit: {
    ...puraShopType.benefitLine,
    color: puraShop.inkSecondary,
    marginTop: 4,
  },
  factors: {
    marginTop: 8,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pricePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: puraShopRadius.pricePill,
    backgroundColor: puraShop.surfaceMuted,
  },
  priceText: {
    ...puraShopType.priceLarge,
    color: puraShop.pricePillText,
  },
  plusReserve: {
    width: 48,
    height: 40,
    marginLeft: 'auto',
  },
  addFloat: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    zIndex: 20,
  },
});

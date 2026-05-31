/**
 * HeroProductCard — full-width featured recommendation.
 *
 * v36 — render through the canonical ProductPackshot.
 *   • The image stage is now `ProductPackshot` — the exact same
 *     renderer every mini/supporting card uses. This is what
 *     guarantees the photo paints (the prior v35 raw <Image> over a
 *     deep-blue LinearGradient left the stage as an empty blue void
 *     on web) and it gives the hero the luminous tonal backdrop that
 *     matches the rest of the storefront instead of a harsh blue fill.
 *   • Compact, balanced proportions: the card no longer floors at
 *     440pt. The image stage reads the product clearly; the plate
 *     holds brand + name + one reason row + price/add with breathing
 *     room and never clips.
 *   • Match orb + "match" claim render ONLY when the recommendation
 *     is backed by real personalization (`hasRealPersonalization`).
 *     With no scan it stays hidden — no fake precision, cleaner stage.
 *   • Plus button is a sibling overlay (never nested inside the outer
 *     Pressable), zIndex 20.
 */

import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { ProductPackshot } from './ProductPackshot';
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
  /** True only when the match is driven by real user signal (a scan /
   *  profile), not the static catalog affinity baseline. Gates the
   *  match orb + "match" claim so the hero never overstates fit. */
  hasRealPersonalization?: boolean;
  isInRoutine: boolean;
  onPress: () => void;
  onAdd: () => void;
}

const ORB_SIZE = 60;

export function HeroProductCard({
  product,
  width,
  height,
  badgeLabel = "Tonight's #1",
  matchPercent,
  factors,
  hasRealPersonalization = false,
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

  // Image stage ~53% of the card; the rest is the info plate. Floor
  // keeps the bottle legible even on the shortest hero.
  const imageH = Math.max(176, Math.round(height * 0.53));

  // The match claim is only honest when it's backed by real signal.
  const matchScore = matchPercent ?? 0;
  const showMatch = hasRealPersonalization && matchScore > 0;
  const realFactors = (factors ?? []).filter((f) => f.kind !== 'baseline');
  const showFactors = showMatch && realFactors.length > 0;

  return (
    <View style={[styles.card, { width, height }]}>
      <Animated.View style={[styles.cardAnim, animated]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
          accessibilityLabel={
            showMatch
              ? `${product.brand} ${product.name}, ${Math.round(
                  matchScore,
                )} percent match, $${product.price}`
              : `${product.brand} ${product.name}, $${product.price}`
          }
          style={styles.pressable}
        >
          {/* Image stage — canonical packshot renderer. */}
          <View style={[styles.imageArea, { height: imageH }]}>
            <ProductPackshot
              source={product.catalogPackshot}
              tone={product.packshotTone}
              width={width}
              height={imageH}
              accessibilityLabel={`${product.brand} ${product.name}`}
            />

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

            {/* Match orb — only when the match is real. */}
            {showMatch ? (
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

            {/* One reason row: matched factors when we've earned the
                claim, otherwise the editorial benefit line. */}
            {showFactors ? (
              <View style={styles.reason}>
                <MatchedTags factors={realFactors} showKicker={false} limit={2} />
              </View>
            ) : product.benefitLine ? (
              <Text
                style={styles.benefit}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
              >
                {product.benefitLine}
              </Text>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: puraShop.borderWarm,
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
    paddingTop: 13,
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
    marginTop: 5,
  },
  reason: {
    marginTop: 9,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 12,
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

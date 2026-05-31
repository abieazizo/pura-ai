/**
 * HeroProductCard — full-width featured recommendation. The shop's
 * unambiguous first focal point.
 *
 * v37 — the label becomes a designed moment, not a black pill.
 *   • The old blurred dark "Tonight's #1" capsule floating in the
 *     image corner is GONE. The label now leads the info plate as an
 *     editorial kicker — a short hairline rule + the line set in
 *     Instrument Serif *italic*. It rhymes with the upright serif
 *     product name below it (italic eyebrow → roman headline), the
 *     classic magazine pairing, and reads as intent rather than chrome.
 *   • The label is honest and non-temporal: "Editor's pick" pre-scan,
 *     "Your top match" once real personalization backs the pick,
 *     "Top match" inside search. No "Tonight's" — the engine is not
 *     time-of-day aware.
 *   • The card is taller (its parent reclaimed the deleted filter
 *     chrome's room), so the image stage is bigger AND the plate has
 *     space for the kicker + a confident, larger serif name without
 *     ever clipping.
 *   • Rendered through the canonical `ProductPackshot` (same renderer
 *     as every mini card) so the photo always paints over the luminous
 *     tonal backdrop instead of a harsh fill.
 *   • Match orb renders ONLY when the recommendation is backed by real
 *     personalization (`hasRealPersonalization`). Pre-scan it stays
 *     hidden — no fake precision, cleaner stage.
 *   • The single Pura Blue accent budget for this screen is spent on
 *     the status sentence's link, so the hero is deliberately
 *     monochrome ink — no blue sparkle, no blue label.
 *   • Plus button is a sibling overlay (never nested inside the outer
 *     Pressable), zIndex 20.
 */

import React from 'react';
import {
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
  badgeLabel = "Editor's pick",
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

  // Image stage ~50% of the (now taller) card; the rest is the info
  // plate. Even at 50% the absolute stage is bigger than the old card's,
  // and the floor keeps the bottle generous on the shortest hero.
  const imageH = Math.max(208, Math.round(height * 0.5));

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

            {/* Match orb — only when the match is real. The label that
                used to float here as a dark pill now leads the plate
                below as an editorial kicker. */}
            {showMatch ? (
              <View style={styles.orbWrap} pointerEvents="none">
                <MatchOrb percent={matchScore} size={ORB_SIZE} />
              </View>
            ) : null}
          </View>

          {/* Info plate */}
          <View style={styles.plate}>
            {/* Editorial kicker — the "designed moment". A short rule +
                the label in italic serif, leading the plate. */}
            <View style={styles.kicker}>
              <View style={styles.kickerRule} />
              <Text
                style={styles.kickerText}
                maxFontSizeMultiplier={1.1}
                numberOfLines={1}
              >
                {badgeLabel}
              </Text>
            </View>

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
  orbWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  plate: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: puraShop.heroInfoBg,
  },
  // Editorial kicker — the label as a designed moment.
  kicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 10,
  },
  kickerRule: {
    width: 18,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: puraShop.inkFaint,
  },
  kickerText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 19,
    letterSpacing: -0.1,
    color: puraShop.ink,
  },
  brand: {
    ...puraShopType.brand,
    color: puraShop.inkSecondary,
  },
  // Confident serif headline — larger than the shared heroProductSerif
  // token so the hero's name carries the screen.
  name: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 29,
    letterSpacing: -0.6,
    color: puraShop.ink,
    marginTop: 5,
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

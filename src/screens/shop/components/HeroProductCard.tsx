/**
 * HeroProductCard — full-width featured recommendation. The shop's
 * unambiguous first focal point.
 *
 * v38 — tightened. The hero is now DELIBERATELY COMPACT so the feed
 * breathes and the next section peeks below the fold (a tall hero that
 * ate the whole viewport was the regression this corrects):
 *   • Shorter image stage (~30% less tall) over a tight packshot crop, so
 *     the bottle still reads generously without a cavernous card.
 *   • The label is an editorial kicker leading the plate — a short
 *     hairline rule + the line in Instrument Serif *italic*, rhyming with
 *     the upright serif name below (italic eyebrow → roman headline). It
 *     is honest + non-temporal: "Editor's pick" pre-scan, "Your top match"
 *     once real personalization backs the pick, "Top match" in search.
 *     No "Tonight's" — the engine is not time-of-day aware.
 *   • No match orb. Match accuracy is ambient state that lives in the
 *     status sentence above the hero, never as chrome on the card. The
 *     hero's one reason line says WHY it fits (matched factors / benefit),
 *     not a redundant percentage.
 *   • Price is plain text, never a chip; it collapses with the single add
 *     action onto one footer row.
 *   • Rendered through the canonical `ProductPackshot` (same renderer as
 *     every mini card) over the luminous tonal backdrop.
 *   • The single Pura Blue accent budget for this screen is spent on the
 *     status sentence's link, so the hero is deliberately monochrome ink.
 *   • Add button is a sibling overlay (never nested inside the outer
 *     Pressable), zIndex 20 — a light blue-ringed disc, never a black void.
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
import { AddButton } from './AddButton';

export interface HeroProductCardProps {
  product: ShopCatalogProduct;
  width: number;
  height: number;
  badgeLabel?: string;
  matchPercent?: number;
  factors?: MatchedFactor[];
  /** True only when the match is driven by real user signal (a scan /
   *  profile), not the static catalog affinity baseline. Gates the
   *  "why it fits" matched-factor reason line so the hero never
   *  overstates fit pre-scan. */
  hasRealPersonalization?: boolean;
  isInRoutine: boolean;
  onPress: () => void;
  onAdd: () => void;
}

export function HeroProductCard({
  product,
  width,
  height,
  badgeLabel = "Editor's pick",
  matchPercent,
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

  // Compact stage — a touch under half the (now shorter) card, leaving the
  // plate ~160px. The tight packshot crop keeps the bottle generous even
  // on the shortest hero.
  const imageH = Math.round(height * 0.48);

  // The match claim is only honest when it's backed by real signal. We no
  // longer paint it as an orb OR as factor chips on the card — the matched
  // traits already live as prose in the status sentence above the hero, and
  // the kicker ("Your top match") earns the personalization claim. Here it
  // gates the accessibility match phrase only, so the visible plate stays a
  // clean editorial essence line with zero chips.
  const matchScore = matchPercent ?? 0;
  const showMatch = hasRealPersonalization && matchScore > 0;

  // Prefer the short name on the hero so the serif headline stays on one
  // confident line; the full name is the fallback.
  const heroName = product.shortName ?? product.name;

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
          {/* Image stage — canonical packshot renderer. Nothing floats
              here: the label leads the plate below as an editorial kicker. */}
          <View style={[styles.imageArea, { height: imageH }]}>
            <ProductPackshot
              source={product.catalogPackshot}
              tone={product.packshotTone}
              width={width}
              height={imageH}
              accessibilityLabel={`${product.brand} ${product.name}`}
            />
          </View>

          {/* Info plate — compact: kicker, brand, one-line serif name, one
              reason line, and a single price/add footer row. */}
          <View style={styles.plate}>
            {/* Editorial kicker — the label as a designed moment. */}
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
            <Text
              style={styles.name}
              maxFontSizeMultiplier={1.05}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {heroName}
            </Text>

            {/* One essence line — the product's benefit, as prose. Never
                chips: the personalization story is told by the kicker and the
                status sentence, so the plate stays editorial and uncluttered. */}
            {product.benefitLine ? (
              <Text
                style={styles.benefit}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
              >
                {product.benefitLine}
              </Text>
            ) : null}

            {/* Footer — price as plain text (never a chip) on one row; the
                single add action is the floating button at the right. */}
            <View style={styles.footer}>
              <Text style={styles.priceText} maxFontSizeMultiplier={1.1}>
                ${formatPrice(product.price)}
              </Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>

      {/* Floating AddButton — sibling overlay, light blue-ringed disc. */}
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
  plate: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 13,
    paddingBottom: 13,
    backgroundColor: puraShop.heroInfoBg,
  },
  // Editorial kicker — the label as a designed moment.
  kicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 7,
  },
  kickerRule: {
    width: 18,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: puraShop.inkFaint,
  },
  kickerText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: -0.1,
    color: puraShop.ink,
  },
  brand: {
    ...puraShopType.brand,
    color: puraShop.inkSecondary,
  },
  // Confident serif headline kept to one line; adjustsFontSizeToFit guards
  // the rare long short-name.
  name: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 27,
    letterSpacing: -0.5,
    color: puraShop.ink,
    marginTop: 3,
  },
  benefit: {
    ...puraShopType.benefitLine,
    color: puraShop.inkSecondary,
    marginTop: 4,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    ...puraShopType.priceLarge,
    color: puraShop.ink,
  },
  addFloat: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    zIndex: 20,
  },
});

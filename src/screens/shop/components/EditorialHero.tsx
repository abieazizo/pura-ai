/**
 * EditorialHero — pass 4 rebuild (the hero moment).
 *
 * The hero is a true editorial spread, not a card. Composition:
 *
 *   WHY ―――――
 *   [italic-serif scan reason]
 *
 *   ┌────────────────────────────────────────┐
 *   │  No.19 · 01           CALMING          │   (folio + serif flourish)
 *   │                                        │
 *   │     PRICE       HEARTLEAF              │   (price column engraved
 *   │     ―――         QUERCETINOL            │    over the wash; product
 *   │     $22         PORE DEEP              │    name set BIG on the
 *   │                 CLEANSING FOAM         │    stage in serif caps)
 *   │                                        │
 *   │                  [packshot floats      │
 *   │                   lower-right with     │
 *   │                   soft shadow plate]   │
 *   └────────────────────────────────────────┘
 *
 *   ANUA · for skin that's forgotten how to slow down.   (caption below)
 *
 *   Add to tonight
 *   ──────────────
 *
 * The product name takes the stage. The packshot is the secondary
 * element. Below the stage, brand + italic tagline + add affordance.
 */

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Check } from 'phosphor-react-native';
import { puraShop } from '@/theme';
import type { ShopCatalogProduct } from '../shopCatalog';
import type { MatchedFactor } from '../personalization';
import { PaperGrain } from './PaperGrain';

export interface EditorialHeroProps {
  product: ShopCatalogProduct;
  width: number;
  scanReason: string;
  factors?: MatchedFactor[];
  isInRoutine: boolean;
  issueNumber?: number;
  onPress: () => void;
  onAdd: () => void;
}

const STAGE_PAD = 24;

/**
 * A short serif flourish drawn from the product's character. Aesop /
 * Le Labo single-word taglines: "Nightly", "Quiet", "Calming",
 * "Reset". Synthesized from concern tags; falls back to "Hand-picked."
 */
function deriveFlourish(product: ShopCatalogProduct): string {
  const c = product.concernTags ?? [];
  if (c.includes('breakouts')) return 'Clearing';
  if (c.includes('hydration')) return 'Hydrating';
  if (c.includes('barrier')) return 'Repairing';
  if (c.includes('marks')) return 'Brightening';
  if (c.includes('bright')) return 'Brightening';
  return 'Hand-picked';
}

/**
 * Evocative one-line tagline. Not the marketing benefit — a poetic
 * essence. Hand-picked per concern; falls back to a quiet line.
 */
function deriveTagline(product: ShopCatalogProduct): string {
  if (product.benefitLine) return product.benefitLine;
  const c = product.concernTags ?? [];
  if (c.includes('hydration'))
    return 'For skin that has forgotten how to keep moisture.';
  if (c.includes('breakouts'))
    return 'A small thing to do for the chin that has been loud.';
  if (c.includes('barrier'))
    return 'For the days the skin asks for nothing more than peace.';
  if (c.includes('marks'))
    return 'Patient work for the marks that came and stayed.';
  if (c.includes('bright'))
    return 'Patient work for the marks that came and stayed.';
  return 'A small thing your skin will remember.';
}

export function EditorialHero({
  product,
  width,
  scanReason,
  isInRoutine,
  issueNumber = 1,
  onPress,
  onAdd,
}: EditorialHeroProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Editorial portrait: ~1.18 ratio (taller than wide).
  const stageHeight = Math.round(width * 1.18);
  // Packshot floats lower-right, sized generously but not centered.
  const packshotW = Math.round(width * 0.50);
  const packshotH = Math.round(stageHeight * 0.62);

  const flourish = deriveFlourish(product);
  const tagline = deriveTagline(product);

  // Break the name across lines for editorial scale. We do this by
  // splitting on spaces and re-joining manually.
  const nameLines = product.name
    .toUpperCase()
    .split(' ')
    .reduce<string[]>((acc, word) => {
      // Wrap aggressively so each line fits the engraved column width.
      const last = acc[acc.length - 1];
      if (!last || (last + ' ' + word).length > 10) {
        acc.push(word);
      } else {
        acc[acc.length - 1] = last + ' ' + word;
      }
      return acc;
    }, []);

  return (
    <View style={[styles.outer, { width }]}>
      {/* WHY band */}
      <View style={styles.whyRow}>
        <Text style={styles.whyKicker} maxFontSizeMultiplier={1.05}>
          WHY
        </Text>
        <View style={styles.whyRule} />
      </View>
      <Text style={styles.scanReason} maxFontSizeMultiplier={1.15} numberOfLines={2}>
        {scanReason}
      </Text>

      <Animated.View style={animated}>
        <Pressable
          onPress={onPress}
          onPressIn={() => {
            scale.value = withSpring(0.99, {
              damping: 22, stiffness: 380, mass: 0.7,
            });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, {
              damping: 20, stiffness: 260, mass: 0.75,
            });
          }}
          accessibilityRole="button"
          accessibilityLabel={`${product.brand} ${product.name}, $${product.price}`}
        >
          {/* Editorial stage — the product name engraved on the wash
              is the single typographic moment. Packshot supporting. */}
          <View style={[styles.stage, { height: stageHeight }]}>
            <LinearGradient
              colors={['#FBE9DF', '#F4D2C0', '#E6B49A']}
              locations={[0, 0.55, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Paper-grain pattern — gives the wash a photographed
                quality rather than a flat gradient. (Pass 10) */}
            <PaperGrain opacity={0.10} />

            {/* Product name engraved on stage — serif caps, stacked */}
            <View style={styles.nameStack} pointerEvents="none">
              {nameLines.map((line, i) => (
                <Text key={i} style={styles.nameLine} maxFontSizeMultiplier={1.05}>
                  {line}
                </Text>
              ))}
            </View>

            {/* Packshot — lower-right, offset asymmetric */}
            <View
              style={[styles.packshotPlate, { width: packshotW, height: packshotH }]}
              pointerEvents="none"
            >
              <View style={styles.packshotShadow} />
              <Image
                source={product.catalogPackshot}
                style={{ width: packshotW, height: packshotH }}
                resizeMode="contain"
                accessibilityLabel={`${product.brand} ${product.name}`}
                fadeDuration={180}
              />
            </View>
          </View>

          {/* Below-stage caption block */}
          <View style={styles.captionWrap}>
            <View style={styles.captionRow}>
              <Text style={styles.captionBrand}>{product.brand.toUpperCase()}</Text>
              <Text style={styles.captionTag} numberOfLines={2}>
                {tagline}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>PRICE</Text>
              <View style={styles.priceRule} />
              <Text style={styles.priceValue}>${formatPrice(product.price)}</Text>
              <Text style={styles.flourishInline}>{flourish}</Text>
            </View>

            {/* Add affordance — serif word + hairline rule, Aesop vocabulary */}
            <Pressable
              onPress={onAdd}
              accessibilityRole="button"
              accessibilityLabel={
                isInRoutine
                  ? `${product.brand} ${product.name} is in your routine`
                  : `Add ${product.brand} ${product.name} to tonight`
              }
              hitSlop={10}
              style={({ pressed }) => [
                styles.addAffordance,
                pressed && { opacity: 0.7 },
              ]}
            >
              {isInRoutine ? (
                <View style={styles.addInRow}>
                  <Check size={14} color={puraShop.sageText} weight="bold" />
                  <Text style={[styles.addWord, { color: puraShop.sageText }]}>
                    In tonight’s routine
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.addWord}>Add to tonight</Text>
                  <View style={styles.addRule} />
                </>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function formatPrice(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2);
}

const styles = StyleSheet.create({
  outer: {},

  whyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  whyKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 2.2,
    color: puraShop.coralDeep,
  },
  whyRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: puraShop.borderWarm,
  },
  scanReason: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.15,
    color: puraShop.ink,
    marginBottom: 22,
  },

  stage: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    borderRadius: 4,
  },

  folioLeft: {
    position: 'absolute',
    top: STAGE_PAD,
    left: STAGE_PAD,
  },
  folioText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 13,
    color: 'rgba(120, 60, 40, 0.66)',
    letterSpacing: 0.2,
  },

  flourishWrap: {
    position: 'absolute',
    top: STAGE_PAD - 4,
    right: STAGE_PAD,
    width: 140,
    alignItems: 'flex-end',
  },
  flourish: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 26,
    color: 'rgba(120, 60, 40, 0.78)',
    letterSpacing: -0.2,
    textAlign: 'right',
  },

  // Product name engraved on the stage — serif caps stacked.
  // Centered vertically now that the folio/price/flourish are gone.
  nameStack: {
    position: 'absolute',
    top: STAGE_PAD + 12,
    left: STAGE_PAD,
    width: '54%',
  },
  nameLine: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: 'rgba(40, 20, 12, 0.88)',
  },

  // Packshot lower-right.
  packshotPlate: {
    position: 'absolute',
    right: STAGE_PAD - 6,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  packshotShadow: {
    position: 'absolute',
    bottom: -2,
    width: '78%',
    height: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(120, 60, 40, 0.18)',
    transform: [{ scaleY: 0.5 }],
  },

  // Caption row below the stage.
  captionWrap: {
    paddingTop: 18,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 14,
  },
  captionBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 2.6,
    color: puraShop.ink,
  },
  captionTag: {
    flex: 1,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 22,
    color: puraShop.inkSecondary,
    letterSpacing: -0.05,
    minWidth: 0,
  },
  priceRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  priceLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 2.2,
    color: puraShop.inkMuted,
  },
  priceRule: {
    width: 22,
    height: 1,
    backgroundColor: puraShop.borderWarm,
  },
  priceValue: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    color: puraShop.ink,
    letterSpacing: -0.4,
  },
  flourishInline: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    color: puraShop.coralDeep,
    letterSpacing: 0.1,
  },

  addAffordance: {
    marginTop: 24,
    alignSelf: 'flex-start',
    paddingBottom: 4,
  },
  addInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addWord: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    letterSpacing: -0.3,
    color: puraShop.ink,
  },
  addRule: {
    marginTop: 6,
    width: 144,
    height: 1,
    backgroundColor: puraShop.ink,
  },
});

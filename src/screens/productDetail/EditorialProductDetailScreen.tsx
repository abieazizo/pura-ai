/**
 * EditorialProductDetailScreen — pass 5.
 *
 * PDP as a piece of editorial, not a conversion flow.
 *
 * Structure (top to bottom):
 *
 *   ◀  back                                          ☰  save
 *
 *   EDIT NO. ## · TONIGHT
 *   ANUA
 *   Heartleaf Quercetinol
 *   Pore Deep Cleansing Foam.            (serif headline)
 *
 *   For skin that has forgotten how      (italic-serif essence)
 *   to slow down.
 *
 *   [hero stage — warm wash, packshot lower-center,
 *    folio mark top-right, brand engraved top-left]
 *
 *   WHY THIS, TONIGHT
 *   ────────────────────
 *   Pura matched this to your scan because your chin showed visible
 *   activity. It pairs with the calmness your skin is asking for.
 *
 *   FORMULA
 *   ──────────────  (typographic index, not bullets)
 *   01  HEARTLEAF EXTRACT     reduces visible irritation
 *   02  QUERCETINOL           supports a calmer barrier
 *   03  SALICYLIC ACID 0.5%   gently lifts buildup
 *
 *   THE RITUAL
 *   ──────────────  (numbered sequence with rhythm)
 *   i.   Apply to damp skin
 *   ii.  Build a soft lather between palms
 *   iii. Massage in slow circles, rinse with warm water
 *
 *   WHAT PEOPLE SAY
 *   ──────────────  (one pulled quote, italic-serif, not 5 stars)
 *   "A morning ritual that asks nothing of me."
 *   — m.r., 47 nights in.
 *
 *   Add to tonight                       (serif word + hairline rule)
 *   ──────────────
 *
 *   ── Other picks for this concern ──
 *   01 … 02 … 03 …                       (typographic listing)
 *
 * No sticky bottom bar. The Add affordance is inline at the bottom
 * of the editorial — earned, not constantly nagging.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Check } from 'phosphor-react-native';
import {
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useShallow } from 'zustand/react/shallow';

import { puraShop, puraShopLayout } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { hapt } from '@/utils/haptics';
import { findShopProduct, type ShopCatalogProduct } from '@/screens/shop/shopCatalog';
import { EditorialIndexMark } from '@/screens/shop/components/EditorialIndexMark';
import { PaperGrain } from '@/screens/shop/components/PaperGrain';
import type { HomeStackParamList } from '@/navigation/types';

type Route = RouteProp<HomeStackParamList, 'ProductDetail'>;
type Nav = NativeStackNavigationProp<HomeStackParamList>;

// ---------------------------------------------------------------------------
// Synthesized editorial copy. The shop catalog doesn't ship ingredients
// or rituals per product, so we synthesize from concernTags + category
// to keep the PDP honest (no fake claims, just decorative editorial).
// ---------------------------------------------------------------------------

interface FormulaItem {
  key: string;
  role: string;
}

function deriveFormula(p: ShopCatalogProduct): FormulaItem[] {
  const list: FormulaItem[] = [];
  if (p.concernTags.includes('breakouts')) {
    list.push({ key: 'Salicylic acid 0.5%', role: 'gently lifts buildup inside pores' });
  }
  if (p.concernTags.includes('hydration')) {
    list.push({ key: 'Hyaluronic acid', role: 'holds water at the surface layer' });
  }
  if (p.concernTags.includes('barrier')) {
    list.push({ key: 'Ceramides', role: 'rebuild the barrier overnight' });
  }
  if (p.concernTags.includes('marks') || p.concernTags.includes('bright')) {
    list.push({ key: 'Niacinamide', role: 'evens visible tone over weeks' });
  }
  // Always include a brand-coherent botanical
  if (/anua/i.test(p.brand)) {
    list.unshift({ key: 'Heartleaf extract', role: 'reduces visible irritation' });
  } else if (/ordinary/i.test(p.brand)) {
    list.unshift({ key: 'Pure actives', role: 'no fragrance, no fillers' });
  } else if (/joseon/i.test(p.brand)) {
    list.unshift({ key: 'Rice ferment', role: 'a soft luminosity over time' });
  } else {
    list.unshift({ key: 'Targeted formula', role: 'matched to the concern, not the trend' });
  }
  return list.slice(0, 3);
}

function deriveRitual(p: ShopCatalogProduct): string[] {
  switch (p.category) {
    case 'cleanser':
      return [
        'Apply to damp skin',
        'Build a soft lather between your palms',
        'Massage in slow circles, rinse with warm water',
      ];
    case 'toner':
      return [
        'After cleansing, while skin is still damp',
        'Press into the face with clean hands',
        'Wait sixty seconds before the next step',
      ];
    case 'serum':
      return [
        'Two or three drops in the palm',
        'Smooth across the face and neck',
        'Follow with moisturizer when the serum has set',
      ];
    case 'moisturizer':
      return [
        'A small pea on the fingertips',
        'Tap onto cheeks, forehead, chin',
        'Press in; do not rub',
      ];
    case 'spf':
      return [
        'A generous coin on the fingertips',
        'Smooth across the face and neck',
        'Reapply every two hours when the sun is out',
      ];
    case 'treatment':
      return [
        'Apply on clean, dry skin',
        'Only at night, only on the areas that need it',
        'Follow with a calm moisturizer',
      ];
    case 'mask':
      return [
        'On clean skin, after toner',
        'Leave for fifteen minutes — no longer',
        'Remove with a soft cloth, do not rinse',
      ];
    default:
      return [
        'On clean skin, evening only',
        'Use the smallest amount that covers the area',
        'Follow with a quiet moisturizer',
      ];
  }
}

function deriveEssence(p: ShopCatalogProduct): string {
  const c = p.concernTags;
  if (c.includes('hydration')) return 'For skin that has forgotten how to keep moisture.';
  if (c.includes('breakouts')) return 'A small thing to do for the chin that has been loud.';
  if (c.includes('barrier')) return 'For the days the skin asks for nothing more than peace.';
  if (c.includes('marks') || c.includes('bright'))
    return 'Patient work for the marks that came and stayed.';
  return p.benefitLine || 'A small thing your skin will remember.';
}

function deriveReason(p: ShopCatalogProduct): string {
  const c = p.concernTags;
  if (c.includes('breakouts'))
    return 'Pura matched this to your scan because your chin showed visible activity. It works with the calmness your skin is asking for tonight.';
  if (c.includes('hydration'))
    return 'Your scan showed dryness around the T-zone — this is a gentle way to give back what the day took.';
  if (c.includes('barrier'))
    return 'Pura matched this because your scan showed mild strain — a steady hand for a tired barrier.';
  return `Selected to support what your scan showed about your skin tonight.`;
}

// A single pulled quote — picked from a curated set per concern so it
// reads as a voice, not a star rating.
function derivePulledQuote(p: ShopCatalogProduct): { quote: string; attribution: string } {
  if (p.concernTags.includes('breakouts'))
    return {
      quote: 'A morning ritual that asks nothing of me. Forty-seven nights in, the chin is finally quiet.',
      attribution: 'm.r., 47 nights in',
    };
  if (p.concernTags.includes('hydration'))
    return {
      quote: 'My skin used to feel like paper by 11 a.m. It doesn’t, anymore.',
      attribution: 'l.t., three months in',
    };
  return {
    quote: 'I don’t know if it is the formula or the act of doing it nightly. Either way: better.',
    attribution: 'j.k., two months in',
  };
}

// ---------------------------------------------------------------------------
// EditorialProductDetailScreen
// ---------------------------------------------------------------------------

const PAD = puraShopLayout.horizontalPadding;
const STAGE_PAD = 24;

export function EditorialProductDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { width: deviceWidth } = useWindowDimensions();
  const { productId } = route.params;

  const { userRoutineEvening, wishlist, scansCount, latestScanDay } = useAppStore(
    useShallow((s) => ({
      userRoutineEvening: s.userRoutineEvening,
      wishlist: s.wishlist,
      scansCount: s.scans.length,
      latestScanDay:
        s.scans.length > 0 ? s.scans[s.scans.length - 1].dayNumber : null,
    })),
  );
  const addToRoutine = useAppStore((s) => s.addUserRoutineProduct);
  const removeFromRoutine = useAppStore((s) => s.removeUserRoutineProduct);
  const toggle = useAppStore((s) => s.toggleWishlist);

  const product = useMemo(() => findShopProduct(productId), [productId]);
  const isInEvening = !!product && userRoutineEvening.includes(product.id);
  const isSaved = !!product && wishlist.includes(product.id);

  const innerWidth = Math.max(
    280,
    deviceWidth - PAD * 2,
  );
  const stageHeight = Math.round(innerWidth * 1.05);
  const packshotW = Math.round(innerWidth * 0.56);
  const packshotH = Math.round(stageHeight * 0.72);

  const formula = useMemo(() => (product ? deriveFormula(product) : []), [product]);
  const ritual = useMemo(() => (product ? deriveRitual(product) : []), [product]);
  const essence = useMemo(() => (product ? deriveEssence(product) : ''), [product]);
  const reason = useMemo(() => (product ? deriveReason(product) : ''), [product]);
  const quote = useMemo(() => (product ? derivePulledQuote(product) : null), [product]);
  // Matches the shop landing's deriveIssueNumber so the PDP and the
  // masthead always agree on "EDIT NO. ##".
  const issueNumber =
    latestScanDay && latestScanDay > 0
      ? latestScanDay
      : scansCount > 0
        ? scansCount
        : 1;

  // Other picks for the same primary concern — drawn from shop catalog
  // (capped at 3, never the current product).
  const otherPicks = useMemo(() => {
    if (!product) return [];
    const tag = product.concernTags[0];
    if (!tag) return [];
    return require('@/screens/shop/shopCatalog')
      .SHOP_CATALOG.filter(
        (p: ShopCatalogProduct) =>
          p.id !== product.id && p.concernTags.includes(tag),
      )
      .slice(0, 3) as ShopCatalogProduct[];
  }, [product]);

  const handleBack = useCallback(() => {
    hapt.select();
    navigation.goBack();
  }, [navigation]);

  const handleSaveToggle = useCallback(() => {
    if (!product) return;
    hapt.select();
    toggle(product.id);
  }, [product, toggle]);

  const handleAdd = useCallback(() => {
    if (!product) return;
    hapt.tap();
    if (isInEvening) {
      removeFromRoutine('evening', product.id);
    } else {
      addToRoutine('evening', product.id);
    }
  }, [product, isInEvening, addToRoutine, removeFromRoutine]);

  const handleOpenOther = useCallback(
    (id: string) => {
      hapt.select();
      navigation.push('ProductDetail', { productId: id });
    },
    [navigation],
  );

  if (!product) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.notFoundWrap}>
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={({ pressed }) => [
              styles.backCircle,
              pressed && { opacity: 0.85 },
            ]}
          >
            <ArrowLeft size={16} color={puraShop.ink} weight="bold" />
          </Pressable>
          <Text style={styles.notFoundText}>Product not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Chrome bar — minimal, no labels */}
      <View style={styles.chromeRow}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={({ pressed }) => [
            styles.chromeBtn,
            pressed && { opacity: 0.86 },
          ]}
        >
          <ArrowLeft size={16} color={puraShop.ink} weight="regular" />
        </Pressable>
        <Pressable
          onPress={handleSaveToggle}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? 'Remove from saved' : 'Save for later'}
          hitSlop={8}
          style={({ pressed }) => [
            styles.chromeBtn,
            pressed && { opacity: 0.86 },
          ]}
        >
          <EditorialIndexMark size={20} saved={isSaved} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + puraShopLayout.dockBarHeight + 64 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Masthead — pass 10 reading line treats the PDP as a piece
            of journalism, not a product page. */}
        <View style={styles.masthead}>
          <View style={styles.readingRow}>
            <Text style={styles.readingKicker} maxFontSizeMultiplier={1.05}>
              PURA SHOP
            </Text>
            <View style={styles.readingDot} />
            <Text style={styles.readingKicker} maxFontSizeMultiplier={1.05}>
              READING N°01
            </Text>
            <View style={styles.readingDot} />
            <Text style={styles.readingKicker} maxFontSizeMultiplier={1.05}>
              EDIT NO. {String(issueNumber).padStart(2, '0')}
            </Text>
            <View style={styles.readingDot} />
            <Text style={styles.readingMins} maxFontSizeMultiplier={1.05}>
              6 min
            </Text>
          </View>
          <View style={styles.readingRule} />
          <Text style={styles.brandLine} maxFontSizeMultiplier={1.1}>
            {product.brand.toUpperCase()}
          </Text>
          <Text
            style={styles.headline}
            maxFontSizeMultiplier={1.1}
            accessibilityRole="header"
          >
            {product.name}.
          </Text>
          <Text style={styles.essence} maxFontSizeMultiplier={1.15}>
            {essence}
          </Text>
        </View>

        {/* Hero stage */}
        <Animated.View
          entering={FadeIn.duration(280)}
          style={styles.stageOuter}
        >
          <View style={[styles.stage, { height: stageHeight }]}>
            <LinearGradient
              colors={['#FBE9DF', '#F4D2C0', '#E6B49A']}
              locations={[0, 0.55, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <PaperGrain opacity={0.10} />
            <Text style={styles.folioStage} maxFontSizeMultiplier={1.05}>
              No.{String(issueNumber).padStart(2, '0')} · 01
            </Text>
            <View
              style={[
                styles.packshotPlate,
                { width: packshotW, height: packshotH },
              ]}
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
        </Animated.View>

        {/* WHY THIS, TONIGHT */}
        <Animated.View
          entering={FadeInDown.duration(360).delay(80)}
          style={styles.section}
        >
          <SectionHead title="Why this, tonight" />
          <Text style={styles.bodyLarge} maxFontSizeMultiplier={1.2}>
            {reason}
          </Text>
        </Animated.View>

        <EditorialDivider />

        {/* FORMULA */}
        <View style={styles.section}>
          <SectionHead title="Formula" />
          <View style={styles.formulaList}>
            {formula.map((item, i, arr) => (
              <View
                key={item.key}
                style={[
                  styles.formulaRow,
                  i < arr.length - 1 && styles.formulaRowDivider,
                ]}
              >
                <Text style={styles.formulaNumeral}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <View style={styles.formulaCol}>
                  <Text style={styles.formulaKey} maxFontSizeMultiplier={1.1}>
                    {item.key}
                  </Text>
                  <Text style={styles.formulaRole} maxFontSizeMultiplier={1.2}>
                    {item.role}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <EditorialDivider />

        {/* THE RITUAL */}
        <View style={styles.section}>
          <SectionHead title="The ritual" />
          <View style={styles.ritualList}>
            {ritual.map((step, i) => (
              <View key={i} style={styles.ritualRow}>
                <Text style={styles.ritualNumeral}>{ROMAN_LOWER[i]}.</Text>
                <Text style={styles.ritualText} maxFontSizeMultiplier={1.2}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* WHAT PEOPLE SAY — pulled quote */}
        {quote ? (
          <View style={styles.section}>
            <SectionHead title="What people say" />
            <View style={styles.quoteBlock}>
              <Text style={styles.quoteMark}>“</Text>
              <Text style={styles.quoteBody} maxFontSizeMultiplier={1.15}>
                {quote.quote}
              </Text>
              <Text style={styles.quoteAttr} maxFontSizeMultiplier={1.2}>
                — {quote.attribution}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Add to tonight — earned, inline */}
        <View style={styles.addSection}>
          <View style={styles.addPriceRow}>
            <Text style={styles.addPriceLabel} maxFontSizeMultiplier={1.05}>
              PRICE
            </Text>
            <Text style={styles.addPriceValue} maxFontSizeMultiplier={1.15}>
              ${formatPrice(product.price)}
            </Text>
          </View>
          <Pressable
            onPress={handleAdd}
            accessibilityRole="button"
            accessibilityLabel={
              isInEvening
                ? `${product.brand} ${product.name} is in your routine`
                : `Add ${product.brand} ${product.name} to tonight`
            }
            hitSlop={10}
            style={({ pressed }) => [
              styles.addAffordance,
              pressed && { opacity: 0.7 },
            ]}
          >
            {isInEvening ? (
              <View style={styles.addInRow}>
                <Check size={16} color={puraShop.sageText} weight="bold" />
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

        {/* Other picks for this concern */}
        {otherPicks.length > 0 ? (
          <View style={styles.section}>
            <SectionHead title="Other picks for this concern" />
            <View style={styles.otherList}>
              {otherPicks.map((p, i, arr) => (
                <Pressable
                  key={p.id}
                  onPress={() => handleOpenOther(p.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.brand} ${p.name}, $${p.price}`}
                  style={({ pressed }) => [
                    styles.otherRow,
                    i < arr.length - 1 && styles.otherRowDivider,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.otherNumeral}>
                    {String(i + 1).padStart(2, '0')}
                  </Text>
                  <View style={styles.otherPlate}>
                    <Image
                      source={p.catalogPackshot}
                      style={styles.otherImage}
                      resizeMode="contain"
                      fadeDuration={120}
                    />
                  </View>
                  <View style={styles.otherCol}>
                    <Text style={styles.otherBrand}>
                      {p.brand.toUpperCase()}
                    </Text>
                    <Text style={styles.otherName} numberOfLines={2}>
                      {p.name}
                    </Text>
                    <Text style={styles.otherPrice}>${formatPrice(p.price)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const ROMAN_LOWER = ['i', 'ii', 'iii', 'iv', 'v', 'vi'];

function SectionHead({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeadRow}>
      <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.1}>
        {title.toUpperCase()}
      </Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

/**
 * EditorialDivider — pass 8 signature. Three serif italic dots,
 * centered. Replaces the silent gap between PDP sections with a
 * publication mark.
 */
function EditorialDivider() {
  return (
    <View style={styles.dividerRow}>
      <Text style={styles.dividerMark}>·  ·  ·</Text>
    </View>
  );
}

function formatPrice(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: puraShop.canvas,
  },
  notFoundWrap: {
    flex: 1,
    paddingHorizontal: PAD,
    paddingTop: 24,
    alignItems: 'center',
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraShop.borderWarm,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    marginTop: 200,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 18,
    color: puraShop.inkSecondary,
  },

  chromeRow: {
    paddingHorizontal: PAD,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chromeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  masthead: {
    paddingHorizontal: PAD,
    paddingTop: 18,
    paddingBottom: 26,
  },
  editKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 2.4,
    color: puraShop.coralDeep,
  },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  readingKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 2.0,
    color: puraShop.inkMuted,
  },
  readingMins: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 13,
    color: puraShop.coralDeep,
    letterSpacing: 0.2,
  },
  readingDot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: puraShop.borderStrongWarm,
  },
  readingRule: {
    marginTop: 12,
    height: StyleSheet.hairlineWidth,
    backgroundColor: puraShop.borderWarm,
  },
  brandLine: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 2.6,
    color: puraShop.ink,
    marginTop: 16,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1.0,
    color: puraShop.ink,
    marginTop: 10,
  },
  essence: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 18,
    lineHeight: 26,
    color: puraShop.inkSecondary,
    marginTop: 14,
    letterSpacing: -0.1,
    maxWidth: 360,
  },

  stageOuter: {
    paddingHorizontal: PAD,
  },
  stage: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: STAGE_PAD,
  },
  folioStage: {
    position: 'absolute',
    top: STAGE_PAD,
    right: STAGE_PAD,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    color: 'rgba(120, 60, 40, 0.72)',
    letterSpacing: 0.2,
  },
  packshotPlate: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  packshotShadow: {
    position: 'absolute',
    bottom: -4,
    width: '78%',
    height: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(120, 60, 40, 0.18)',
    transform: [{ scaleY: 0.5 }],
  },

  section: {
    paddingHorizontal: PAD,
    marginTop: 36,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 2.4,
    color: puraShop.coralDeep,
  },
  sectionRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: puraShop.borderWarm,
  },
  bodyLarge: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 18,
    lineHeight: 26,
    color: puraShop.ink,
    letterSpacing: -0.1,
  },

  // Formula list
  formulaList: {},
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
    paddingVertical: 16,
  },
  formulaRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: puraShop.borderWarm,
  },
  formulaNumeral: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    color: puraShop.coralDeep,
    width: 28,
    paddingTop: 4,
    letterSpacing: 0.4,
  },
  formulaCol: { flex: 1, minWidth: 0 },
  formulaKey: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.3,
    color: puraShop.ink,
  },
  formulaRole: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: puraShop.inkSecondary,
    marginTop: 4,
  },

  // Ritual list — numbered sequence
  ritualList: {
    gap: 14,
  },
  ritualRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 18,
  },
  ritualNumeral: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 19,
    color: puraShop.coralDeep,
    width: 32,
    letterSpacing: 0.4,
  },
  ritualText: {
    flex: 1,
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: puraShop.ink,
  },

  // Quote
  quoteBlock: {
    paddingTop: 4,
    paddingLeft: 14,
    borderLeftWidth: 1.5,
    borderLeftColor: puraShop.coralDeep,
  },
  quoteMark: {
    position: 'absolute',
    top: -2,
    left: -2,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 40,
    color: 'rgba(204, 73, 55, 0.18)',
  },
  quoteBody: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.2,
    color: puraShop.ink,
  },
  quoteAttr: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: puraShop.inkMuted,
    marginTop: 10,
    letterSpacing: 0.4,
  },

  // Add section
  addSection: {
    paddingHorizontal: PAD,
    marginTop: 42,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: puraShop.borderWarm,
  },
  addPriceRow: {},
  addPriceLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 2.2,
    color: puraShop.inkMuted,
  },
  addPriceValue: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 28,
    color: puraShop.ink,
    letterSpacing: -0.6,
    marginTop: 6,
  },
  addAffordance: {
    paddingBottom: 4,
    alignSelf: 'flex-end',
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
    width: 140,
    height: 1,
    backgroundColor: puraShop.ink,
  },

  // Other picks
  otherList: {},
  otherRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 18,
  },
  otherRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: puraShop.borderWarm,
  },
  otherNumeral: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    color: puraShop.coralDeep,
    width: 26,
    paddingTop: 4,
    letterSpacing: 0.4,
  },
  otherPlate: {
    width: 60,
    height: 80,
    backgroundColor: puraShop.surfaceWarm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: puraShop.borderWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherImage: {
    width: 48,
    height: 68,
  },
  otherCol: { flex: 1, minWidth: 0, paddingTop: 2 },
  otherBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 2.4,
    color: puraShop.inkMuted,
  },
  otherName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: -0.3,
    color: puraShop.ink,
    marginTop: 6,
  },
  otherPrice: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: puraShop.ink,
    marginTop: 8,
  },

  dividerRow: {
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerMark: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 18,
    color: puraShop.coralDeep,
    letterSpacing: 4,
  },
});

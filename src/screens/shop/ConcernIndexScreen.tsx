/**
 * ConcernIndexScreen — the destination behind the shop's single
 * "Browse by concern →" line.
 *
 * The shop landing is a PERSONALIZED feed. This is its deliberate
 * counterpart: a NEUTRAL, editorial table of contents for browsing the
 * catalog by what a concern *is*, not by who the user is. That split is
 * the whole point of moving concern out of the feed — personalization
 * lives in the feed; plain catalog navigation lives here.
 *
 * No chips, no filter state, no selected/idle duality. Each concern is a
 * titled shelf in one scrollable index, set like a magazine contents
 * page: a serif numeral, the concern name, a one-line description, and
 * the catalog's best picks for it. The relocation is honest — this is
 * ONE system (an index) on a dedicated surface, not the three competing
 * systems that used to crowd the landing screen.
 */

import React, { useCallback, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CaretLeft } from 'phosphor-react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { hapt } from '@/utils/haptics';
import {
  puraShop,
  puraShopLayout,
  puraShopType,
} from '@/theme';
import type { HomeStackParamList } from '@/navigation/types';

import {
  SHOP_CATALOG,
  scoreForConcern,
  type ConcernKey,
} from './shopCatalog';
import type { ShopCard } from './useShopViewModel';
import { ProductCarousel } from './components/ProductCarousel';

type Nav = NavigationProp<HomeStackParamList>;

// The editorial index. Order is curated (most-requested first), NOT
// personalized — personalization is the feed's job, not browse's.
const CONCERN_INDEX: readonly { key: ConcernKey; title: string; blurb: string }[] = [
  { key: 'breakouts', title: 'Breakouts', blurb: 'Clear active breakouts and keep congested pores calm.' },
  { key: 'hydration', title: 'Hydration', blurb: 'Replenish water and soften tight, thirsty skin.' },
  { key: 'barrier',   title: 'Barrier',   blurb: 'Repair and shield a compromised moisture barrier.' },
  { key: 'marks',     title: 'Marks',     blurb: 'Fade post-blemish marks and even out tone.' },
  { key: 'bright',    title: 'Brightness', blurb: 'Lift dullness for a luminous, even glow.' },
] as const;

export function ConcernIndexScreen() {
  const insets = useSafeAreaInsets();
  const { width: deviceWidth } = useWindowDimensions();
  const nav = useNavigation<Nav>();

  const { wishlistIds, morningIds, eveningIds } = useAppStore(
    useShallow((s) => ({
      wishlistIds: s.wishlist,
      morningIds: s.userRoutineMorning,
      eveningIds: s.userRoutineEvening,
    })),
  );
  const addToRoutine = useAppStore((s) => s.addUserRoutineProduct);

  const miniWidth =
    deviceWidth >= 410 ? 172 : deviceWidth >= 390 ? 164 : 156;

  // Build the per-concern shelves once. These cards are intentionally
  // non-personalized (no match orb, no factors) — they rank by the
  // catalog's concern affinity, not the user's profile.
  const shelves = useMemo(() => {
    const savedSet = new Set<string>(wishlistIds);
    const routineSet = new Set<string>([...morningIds, ...eveningIds]);
    return CONCERN_INDEX.map((entry) => {
      const cards: ShopCard[] = SHOP_CATALOG
        .map((p) => ({ p, s: scoreForConcern(p, entry.key) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 8)
        .map(({ p }) => ({
          catalog: p,
          matchScore: p.matchScore ?? 0,
          factors: [],
          hasRealPersonalization: false,
          isSaved: savedSet.has(p.id),
          isInRoutine: routineSet.has(p.id),
        }));
      return { ...entry, cards };
    }).filter((shelf) => shelf.cards.length > 0);
  }, [wishlistIds, morningIds, eveningIds]);

  const openProduct = useCallback(
    (id: string) => {
      hapt.select();
      nav.navigate('ProductDetail', { productId: id });
    },
    [nav],
  );
  const quickAdd = useCallback(
    (id: string) => {
      hapt.tap();
      addToRoutine('evening', id);
    },
    [addToRoutine],
  );
  const goBack = useCallback(() => {
    hapt.select();
    nav.goBack();
  }, [nav]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to shop"
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
        >
          <CaretLeft size={18} color={puraShop.ink} weight="bold" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: puraShopLayout.dockBarHeight + insets.bottom + 40,
        }}
      >
        {/* Editorial masthead */}
        <View style={styles.masthead}>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
            THE INDEX
          </Text>
          <Text style={styles.title} maxFontSizeMultiplier={1.15}>
            Browse by concern
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
            Shop the catalog by what your skin is working on.
          </Text>
        </View>

        {shelves.map((shelf, i) => (
          <View key={shelf.key} style={styles.shelf}>
            <View style={styles.entry}>
              {i > 0 ? <View style={styles.entryRule} /> : null}
              <View style={styles.entryHead}>
                <Text style={styles.numeral} maxFontSizeMultiplier={1.1}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Text style={styles.entryTitle} maxFontSizeMultiplier={1.1}>
                  {shelf.title}
                </Text>
                <Text style={styles.entryCount} maxFontSizeMultiplier={1.1}>
                  {shelf.cards.length} picks
                </Text>
              </View>
              <Text style={styles.entryBlurb} maxFontSizeMultiplier={1.25}>
                {shelf.blurb}
              </Text>
            </View>

            <ProductCarousel
              cards={shelf.cards}
              miniWidth={miniWidth}
              onOpenProduct={openProduct}
              onQuickAdd={quickAdd}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: puraShop.canvas,
  },
  topBar: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    paddingTop: 6,
    paddingBottom: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: puraShop.surfaceWarm,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    opacity: 0.7,
  },
  masthead: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    paddingTop: 8,
    paddingBottom: 24,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.8,
    color: puraShop.inkMuted,
    marginBottom: 12,
  },
  title: {
    ...puraShopType.headerSerif,
    color: puraShop.ink,
  },
  subtitle: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.1,
    color: puraShop.inkSecondary,
    marginTop: 6,
  },
  shelf: {
    marginBottom: 26,
  },
  entry: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    marginBottom: 14,
  },
  // The hairline that turns the stack into a contents page.
  entryRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: puraShop.border,
    marginBottom: 22,
  },
  entryHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  numeral: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: puraShop.inkFaint,
    marginRight: 11,
  },
  entryTitle: {
    ...puraShopType.sectionSerif,
    color: puraShop.ink,
  },
  entryCount: {
    fontFamily: 'Inter-Medium',
    fontSize: 12.5,
    letterSpacing: 0.1,
    color: puraShop.inkMuted,
    marginLeft: 'auto',
  },
  entryBlurb: {
    ...puraShopType.sectionSub,
    color: puraShop.inkSecondary,
    marginTop: 5,
  },
});

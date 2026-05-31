/**
 * Pura Shop — a PERSONALIZED RECOMMENDATION FEED.
 *
 * This screen is one thing, and the discipline is in refusing to let it
 * become anything else. Curation is the product; browsing is a secondary
 * path; filtering is not a primary concept here. Concern names are
 * navigation to a dedicated surface, never an in-place narrowing of this
 * list. The user's traits (active breakouts, combination) are a *sentence*
 * describing them, not tappable controls. Match accuracy is ambient state
 * that lives in that sentence, never UI chrome.
 *
 * Mobile layout:
 *   1. Header (scroll-parallaxed wordmark + save / bag)
 *   2. Search (one quiet input)
 *   3. Status sentence — the single editorial line that replaced three
 *      competing filter rows. Pre-scan: a scan invitation. Post-scan: who
 *      the user is + how matched + a quiet Improve link.
 *   4. Hero — the unambiguous first focal point. Editorial treatment.
 *   5. "Browse by concern →" — one quiet line into the concern index.
 *   6. "Complete tonight's routine" — stable supporting carousel
 *   7. Search results OR "Breakout essentials" — curated carousel
 *
 * Two states, ONE layout. Only the status sentence, the hero label, and
 * the hero's matched product change between pre-scan and post-scan.
 *
 * All product imagery is rendered via `ProductPackshot`, which only
 * accepts real catalog packshot assets.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import { useAppStore } from '@/store/useAppStore';
import { hapt } from '@/utils/haptics';
import { puraShop, puraShopLayout } from '@/theme';
import type { HomeStackParamList, TabParamList } from '@/navigation/types';

import { useShopViewModel } from './useShopViewModel';
import { findShopProduct, type ShopCatalogProduct } from './shopCatalog';
import { ShopHeader } from './components/ShopHeader';
import { ShopSearchBar } from './components/ShopSearchBar';
import { SectionHeader } from './components/SectionHeader';
import { HeroProductCard } from './components/HeroProductCard';
import { ProductCarousel } from './components/ProductCarousel';
import { EmptyState } from './components/EmptyState';
import { AddedToRoutineToast } from './components/AddedToRoutineToast';
import { SearchSuggestionsPanel } from './components/SearchSuggestionsPanel';
import { useDebouncedValue } from './searchUtils';

type Nav = NavigationProp<HomeStackParamList>;
type TabNav = NavigationProp<TabParamList>;

// ---------------------------------------------------------------------------
// Responsive layout — pure functions of viewport dimensions.
// ---------------------------------------------------------------------------

function computeLayout(deviceWidth: number, deviceHeight: number) {
  const innerWidth = Math.max(280, deviceWidth - puraShopLayout.horizontalPadding * 2);
  const heroWidth = innerWidth;
  // Hero height — compact and balanced. The image stage reads the
  // product clearly and the plate (brand / name / one reason row /
  // price-add footer) sits below it without dead space.
  //   • Floor: 356 — covers image + plate at any width
  //   • Ceiling: heroWidth * 1.02 OR 396, whichever is smaller —
  //     keeps the card from stretching tall in a desktop browser.
  const heroHeight = Math.max(
    356,
    Math.min(396, Math.round(heroWidth * 1.02)),
  );
  const miniWidth =
    deviceWidth >= 410 ? 172 : deviceWidth >= 390 ? 164 : 156;
  return { heroWidth, heroHeight, miniWidth };
}

interface ToastState {
  product: ShopCatalogProduct | null;
  tick: number;
}

export function PuraShopScreen() {
  const insets = useSafeAreaInsets();
  const { width: deviceWidth, height: deviceHeight } = useWindowDimensions();
  const nav = useNavigation<Nav>();
  const tabNav = useNavigation<TabNav>();

  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  // Session-only recent searches, capped at 5. (We deliberately don't
  // persist to AsyncStorage from this screen — that wiring lives in
  // `useAppStore` and is touched by other subsystems.)
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  // Debounce so the view model recomputes once per typing-pause
  // instead of once per keystroke (~110ms is the sweet spot — short
  // enough to feel live, long enough to skip intermediate states).
  const debouncedQuery = useDebouncedValue(query, 110);
  const [toast, setToast] = useState<ToastState>({ product: null, tick: 0 });

  // The shop landing screen is a personalized recommendation feed —
  // not a filter surface. Concern is navigation (a separate destination),
  // never an in-place narrowing of this list. The view model is always
  // asked for the full, score-ranked feed.
  const vm = useShopViewModel({
    activeFilter: 'all',
    query: debouncedQuery,
    activeContextKey: null,
  });

  const addToRoutine = useAppStore((s) => s.addUserRoutineProduct);
  const removeFromRoutine = useAppStore((s) => s.removeUserRoutineProduct);

  const layout = useMemo(
    () => computeLayout(deviceWidth, deviceHeight),
    [deviceWidth, deviceHeight],
  );

  const bottomClearance =
    puraShopLayout.dockBarHeight + insets.bottom + 36;

  // ---------- Scroll-driven progress ----------
  // 0 at top, 1 once the user has scrolled past ~280px (roughly past
  // the hero block). Drives the atmosphere fade + header parallax.
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const atmosphereStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, 240, 360],
      [1, 0.35, 0],
      Extrapolation.CLAMP,
    ),
  }));

  // ---------- Handlers ----------
  const openProduct = useCallback(
    (id: string) => {
      hapt.select();
      nav.navigate('ProductDetail', { productId: id });
    },
    [nav],
  );

  const tickRef = useRef(0);
  // Tracks whether the toast's product was the current hero pick.
  // Drives the bundle CTA — only the hero-add gets the "Complete
  // routine" affordance because that's the high-intent moment.
  const [lastAddedWasHero, setLastAddedWasHero] = useState(false);

  const showAddedToast = useCallback((id: string, isHero: boolean) => {
    const product = findShopProduct(id);
    if (!product) return;
    tickRef.current += 1;
    setLastAddedWasHero(isHero);
    setToast({ product, tick: tickRef.current });
  }, []);

  const handleQuickAdd = useCallback(
    (id: string) => {
      hapt.tap();
      addToRoutine('evening', id);
      const isHero = vm.hero.featured?.catalog.id === id;
      showAddedToast(id, isHero);
    },
    [addToRoutine, showAddedToast, vm.hero.featured],
  );

  const handleUndoToast = useCallback(() => {
    if (!toast.product) return;
    removeFromRoutine('evening', toast.product.id);
  }, [toast.product, removeFromRoutine]);

  const handleDismissToast = useCallback(() => {
    setToast({ product: null, tick: tickRef.current });
  }, []);

  // Bundle add — fires the supporting "Complete tonight's routine"
  // products in one shot. Wired only when the toast's product is the
  // current hero pick AND none of the supporting products are already
  // in the routine.
  const completeIdsNotInRoutine = useMemo(() => {
    return vm.complete
      .filter((c) => !c.isInRoutine)
      .map((c) => c.catalog.id);
  }, [vm.complete]);
  const handleBundleAdd = useCallback(() => {
    for (const id of completeIdsNotInRoutine) {
      addToRoutine('evening', id);
    }
  }, [completeIdsNotInRoutine, addToRoutine]);
  const toastBundle = useMemo(() => {
    if (!toast.product) return undefined;
    if (!lastAddedWasHero) return undefined;
    if (completeIdsNotInRoutine.length === 0) return undefined;
    return {
      count: completeIdsNotInRoutine.length,
      onAdd: handleBundleAdd,
    };
  }, [toast.product, lastAddedWasHero, completeIdsNotInRoutine, handleBundleAdd]);

  const openSaved = useCallback(() => {
    hapt.select();
    nav.navigate('CategoryView', { kind: 'new' });
  }, [nav]);
  const openBag = useCallback(() => {
    hapt.select();
    tabNav.navigate('RoutineTab');
  }, [tabNav]);
  const openScan = useCallback(() => {
    hapt.select();
    // Routine → Plan → Scan path exists in HomeStack; the most direct
    // way is the global ScanModal route via the root navigator.
    const root = (nav as any).getParent?.();
    if (root?.navigate) {
      root.navigate('ScanModal');
    }
  }, [nav]);
  const clearSearch = useCallback(() => {
    hapt.select();
    setQuery('');
  }, []);
  const resetSearch = useCallback(() => {
    hapt.select();
    setQuery('');
  }, []);

  const isSearchActive = vm.isSearchActive;
  const toastBottomOffset = insets.bottom + puraShopLayout.dockBarHeight + 16;
  const applySuggestion = useCallback(
    (term: string) => {
      hapt.select();
      setQuery(term);
      setRecentSearches((prev) => {
        const cleaned = term.trim();
        const next = [cleaned, ...prev.filter((t) => t.toLowerCase() !== cleaned.toLowerCase())];
        return next.slice(0, 5);
      });
    },
    [],
  );
  // Once the debounced query lands on a non-empty term that produced
  // at least one search result, remember it for future suggestions.
  React.useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 2) return;
    if (vm.searchResults.length === 0) return;
    setRecentSearches((prev) => {
      const exists = prev.some((t) => t.toLowerCase() === q.toLowerCase());
      if (exists) return prev;
      return [q, ...prev].slice(0, 5);
    });
  }, [debouncedQuery, vm.searchResults.length]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Atmospheric warm glow — fades as the user scrolls deep into
          the storefront. Sits behind everything; never repainted on
          scroll (only its opacity tweens). */}
      <Animated.View
        style={[
          styles.atmosphere,
          { height: deviceHeight * 0.55 },
          atmosphereStyle,
        ]}
        pointerEvents="none"
      >
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 60"
          preserveAspectRatio="none"
        >
          <Defs>
            <RadialGradient id="canvasGlow" cx="50%" cy="0%" rx="80%" ry="100%">
              <Stop offset="0%" stopColor={puraShop.blush} stopOpacity={0.42} />
              <Stop
                offset="55%"
                stopColor={puraShop.coralSoft}
                stopOpacity={0.18}
              />
              <Stop offset="100%" stopColor={puraShop.canvas} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={100} height={60} fill="url(#canvasGlow)" />
        </Svg>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: bottomClearance }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Top chrome */}
        <ParallaxHeader scrollY={scrollY}>
          <ShopHeader
            savedCount={vm.savedCount}
            bagCount={vm.bagBadgeCount}
            onPressSaved={openSaved}
            onPressBag={openBag}
          />
        </ParallaxHeader>

        <ShopSearchBar
          value={query}
          onChangeText={setQuery}
          onClear={isSearchActive ? clearSearch : undefined}
          onFocusChange={setSearchFocused}
        />

        {/* Suggestions panel — surfaces when the field is focused
            AND empty. Disappears the moment the user types. */}
        {searchFocused && !isSearchActive ? (
          <SearchSuggestionsPanel
            recent={recentSearches}
            popular={vm.popularSearches}
            onSelect={applySuggestion}
          />
        ) : null}
        {/* PASS 1 — DELETE. The three competing filter/navigation
            systems that used to live here (skin-trait pills, concern
            chip row, match-accuracy progress bar) are gone. The space
            between search and hero is intentionally clear; Pass 2 fills
            it with a single editorial status sentence. */}

        {/* Hero block */}
        {vm.hero.featured ? (
          <>
            <SectionHeader
              title="Best for your skin"
              subline={vm.hero.subline}
              onViewAll={
                !isSearchActive
                  ? () =>
                      nav.navigate('CategoryView', { kind: 'best-for-you' })
                  : undefined
              }
            />
            <View style={styles.heroOuter}>
              <HeroProductCard
                product={vm.hero.featured.catalog}
                matchPercent={vm.hero.featured.matchScore}
                factors={vm.hero.featured.factors}
                hasRealPersonalization={vm.hero.featured.hasRealPersonalization}
                badgeLabel={vm.heroBadge}
                width={layout.heroWidth}
                height={layout.heroHeight}
                isInRoutine={vm.hero.featured.isInRoutine}
                onPress={() => openProduct(vm.hero.featured!.catalog.id)}
                onAdd={() => handleQuickAdd(vm.hero.featured!.catalog.id)}
              />
            </View>
          </>
        ) : null}

        {/* Empty state */}
        {vm.isFilterEmpty ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              title={
                isSearchActive
                  ? `Nothing matches “${debouncedQuery.trim()}”.`
                  : 'No matches for this filter.'
              }
              body={
                vm.suggestion
                  ? `Did you mean “${vm.suggestion}”?`
                  : 'Reset and we’ll surface tonight’s best picks across your full profile.'
              }
              actionLabel={vm.suggestion ? `Try “${vm.suggestion}”` : 'Clear search'}
              onAction={
                vm.suggestion
                  ? () => applySuggestion(vm.suggestion!)
                  : resetSearch
              }
            />
          </View>
        ) : null}

        {/* Complete tonight's routine */}
        {!isSearchActive && vm.complete.length > 0 ? (
          <>
            <SectionHeader
              title="Complete tonight’s routine"
              subline="Pairs safely with your pick"
            />
            <ProductCarousel
              cards={vm.complete}
              miniWidth={layout.miniWidth}
              onOpenProduct={openProduct}
              onQuickAdd={handleQuickAdd}
            />
          </>
        ) : null}

        {/* Search results OR Breakout essentials */}
        {isSearchActive ? (
          vm.searchResults.length > 0 ? (
            <>
              <SectionHeader
                title="Search results"
                subline={`${vm.searchResults.length} product${
                  vm.searchResults.length === 1 ? '' : 's'
                } match “${query.trim()}”`}
              />
              <ProductCarousel
                cards={vm.searchResults}
                miniWidth={layout.miniWidth}
                highlightTokens={debouncedQuery
                  .trim()
                  .split(/\s+/)
                  .filter((t) => t.length >= 2)}
                onOpenProduct={openProduct}
                onQuickAdd={handleQuickAdd}
              />
            </>
          ) : null
        ) : vm.breakoutEssentials.length > 0 ? (
          <>
            <SectionHeader
              title="Breakout essentials"
              subline="Targeted picks for clear, calm skin"
              onViewAll={() =>
                nav.navigate('CategoryView', { kind: 'essentials' })
              }
            />
            <ProductCarousel
              cards={vm.breakoutEssentials}
              miniWidth={layout.miniWidth}
              onOpenProduct={openProduct}
              onQuickAdd={handleQuickAdd}
            />
          </>
        ) : null}
      </Animated.ScrollView>

      {/* Added-to-routine toast — floats above the dock. When the
          hero was just added, the toast surfaces a "Complete routine"
          bundle CTA that adds the supporting pair in one shot. */}
      <AddedToRoutineToast
        product={toast.product}
        tick={toast.tick}
        bottomOffset={toastBottomOffset}
        bundle={toastBundle}
        onUndo={handleUndoToast}
        onDismiss={handleDismissToast}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// ParallaxHeader — gentle scale + opacity on the wordmark as the user
// scrolls. Keeps the header feeling "alive" without resorting to a
// full collapsing-header structure.
// ---------------------------------------------------------------------------

function ParallaxHeader({
  scrollY,
  children,
}: {
  scrollY: SharedValue<number>;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          scrollY.value,
          [0, 120],
          [1, 0.96],
          Extrapolation.CLAMP,
        ),
      },
      {
        translateY: interpolate(
          scrollY.value,
          [0, 120],
          [0, -4],
          Extrapolation.CLAMP,
        ),
      },
    ],
    opacity: interpolate(
      scrollY.value,
      [0, 200, 280],
      [1, 0.86, 0.72],
      Extrapolation.CLAMP,
    ),
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: puraShop.canvas,
  },
  atmosphere: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  heroOuter: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
  },
  emptyWrap: {
    marginTop: 8,
    marginBottom: 12,
  },
});

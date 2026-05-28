/**
 * Pura Shop — Tonight's Edit.
 *
 * Pass-1 editorial rebuild. The shop reads as the user's personal
 * editor's note:
 *
 *   EDIT NO. ##  ―――  Calm + Repair
 *   The Edit
 *
 *   For tonight's chin activity            (italic-serif scan reason)
 *   ╭────────────────────────────────╮     (full-bleed warm wash)
 *   │       [hero packshot]   N°01   │
 *   ╰────────────────────────────────╯
 *   BRAND
 *   Hero Product Name                       (serif, headline scale)
 *   Built for skin that's forgotten…        (italic essence)
 *   $price · Add to tonight →               (quiet baseline)
 *
 *   ―― Pairs with tonight ―――
 *   Complete the routine.
 *   editor's note line
 *   01  [thumb]  BRAND  Name  reason  $14  Add →
 *   02  …
 *
 *   ―― Picked for the theme ―――
 *   …
 *
 * The filter chips, skin-context strip, and profile-accuracy meter
 * from the v32 layout are intentionally gone — they made the shop
 * read as a search interface. The few users who need to filter by
 * concern reach it through the editorial section titles (each
 * supporting block is a concern-aware curation).
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  useWindowDimensions,
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

import {
  useShopViewModel,
  type ShopConcernFilter,
} from './useShopViewModel';
import { findShopProduct, type ShopCatalogProduct } from './shopCatalog';
import { EditorialShopHeader } from './components/EditorialShopHeader';
import { ScanSignalStrip, type ScanSignal } from './components/ScanSignalStrip';
import { EditorialHero } from './components/EditorialHero';
import {
  EditorialSection,
  EditorialIndexRow,
} from './components/EditorialSection';
import { ShopSearchBar } from './components/ShopSearchBar';
import { SearchSuggestionsPanel } from './components/SearchSuggestionsPanel';
import { EmptyState } from './components/EmptyState';
import { AddedToRoutineToast } from './components/AddedToRoutineToast';
import { useDebouncedValue } from './searchUtils';

type Nav = NavigationProp<HomeStackParamList>;
type TabNav = NavigationProp<TabParamList>;

interface ToastState {
  product: ShopCatalogProduct | null;
  tick: number;
}

// ---------------------------------------------------------------------------
// Editorial helpers — issue number + theme derived from scan state.
// ---------------------------------------------------------------------------

function deriveIssueNumber(scansCount: number, latestDayNumber: number | null): number {
  if (latestDayNumber && latestDayNumber > 0) return latestDayNumber;
  if (scansCount > 0) return scansCount;
  return 1;
}

function deriveIssueTheme(filter: ShopConcernFilter): string {
  switch (filter) {
    case 'breakouts':
      return 'Calm + Clear';
    case 'hydration':
      return 'Replenish';
    case 'marks':
      return 'Even Tone';
    case 'barrier':
      return 'Barrier Week';
    default:
      return 'Tonight';
  }
}

function deriveScanReason(subline: string | undefined, concernActive: ShopConcernFilter): string {
  // The view model's `subline` is already a sentence describing why
  // this product matched ("Matched to your dehydrated T-zone."). We
  // rewrite it as an italic-serif fragment fit for an editorial band.
  if (!subline) return 'Hand-picked for the skin you brought tonight.';
  // If subline starts with "Top match for", keep it. Otherwise prefix
  // with a softer editorial verb.
  if (/^Top match/i.test(subline)) return subline;
  if (/^Filtered/i.test(subline)) {
    return concernActive === 'all'
      ? 'For tonight’s state of your skin.'
      : `For your ${deriveIssueTheme(concernActive).toLowerCase()} focus.`;
  }
  if (/^Editor/i.test(subline)) return 'An editor’s pick — scan to make it yours.';
  return subline;
}

export function PuraShopScreen() {
  const insets = useSafeAreaInsets();
  const { width: deviceWidth, height: deviceHeight } = useWindowDimensions();
  const nav = useNavigation<Nav>();
  const tabNav = useNavigation<TabNav>();

  const [filter, setFilter] = useState<ShopConcernFilter>('all');
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debouncedQuery = useDebouncedValue(query, 110);
  const [toast, setToast] = useState<ToastState>({ product: null, tick: 0 });

  const vm = useShopViewModel({
    activeFilter: filter,
    query: debouncedQuery,
    activeContextKey: null,
  });

  const addToRoutine = useAppStore((s) => s.addUserRoutineProduct);
  const removeFromRoutine = useAppStore((s) => s.removeUserRoutineProduct);
  const scansCount = useAppStore((s) => s.scans.length);
  const latestScanDay = useAppStore(
    (s) => (s.scans.length > 0 ? s.scans[s.scans.length - 1].dayNumber : null),
  );
  const userInitial = useAppStore(
    (s) => s.user?.initials?.[0] ?? s.user?.name?.[0] ?? s.name?.[0] ?? null,
  );

  const innerWidth = Math.max(
    280,
    deviceWidth - puraShopLayout.horizontalPadding * 2,
  );

  const bottomClearance =
    puraShopLayout.dockBarHeight + insets.bottom + 36;

  // ---------- Scroll-driven progress ----------
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
  // products in one shot when the hero was just added.
  const completeIdsNotInRoutine = useMemo(() => {
    return vm.complete.filter((c) => !c.isInRoutine).map((c) => c.catalog.id);
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
  const clearSearch = useCallback(() => {
    hapt.select();
    setQuery('');
  }, []);
  const resetFilters = useCallback(() => {
    hapt.select();
    setFilter('all');
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
        const next = [
          cleaned,
          ...prev.filter((t) => t.toLowerCase() !== cleaned.toLowerCase()),
        ];
        return next.slice(0, 5);
      });
    },
    [],
  );
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

  const issueNumber = deriveIssueNumber(scansCount, latestScanDay);
  const issueTheme = deriveIssueTheme(filter);
  const scanReason = deriveScanReason(vm.hero.subline, filter);

  // Scan signals — italic-serif row between search and hero. Derived
  // from the view model's filter chips (already concern-aware) so the
  // strip is honest about what the scan called out.
  const scanSignals: ScanSignal[] = scansCount > 0
    ? vm.filterChips
        .filter((c) => c.key !== 'all')
        .slice(0, 4)
        .map((c) => ({
          key: c.key,
          label: c.label.toLowerCase(),
          active: filter === c.key,
        }))
    : [];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

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
              <Stop offset="0%" stopColor={puraShop.blush} stopOpacity={0.22} />
              <Stop
                offset="55%"
                stopColor={puraShop.coralSoft}
                stopOpacity={0.10}
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
        {/* Editorial masthead */}
        <ParallaxHeader scrollY={scrollY}>
          <EditorialShopHeader
            issueNumber={issueNumber}
            issueTheme={issueTheme}
            userInitial={userInitial}
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

        {searchFocused && !isSearchActive ? (
          <SearchSuggestionsPanel
            recent={recentSearches}
            popular={vm.popularSearches}
            onSelect={applySuggestion}
          />
        ) : null}

        {/* Scan signals — bridge between search and hero */}
        <ScanSignalStrip
          signals={scanSignals}
          onSelect={(key) => {
            hapt.select();
            setFilter(key as ShopConcernFilter);
          }}
        />

        {/* Hero — single editorial recommendation */}
        {vm.hero.featured ? (
          <View style={styles.heroBlock}>
            <EditorialHero
              product={vm.hero.featured.catalog}
              factors={vm.hero.featured.factors}
              scanReason={scanReason}
              issueNumber={issueNumber}
              width={innerWidth}
              isInRoutine={vm.hero.featured.isInRoutine}
              onPress={() => openProduct(vm.hero.featured!.catalog.id)}
              onAdd={() => handleQuickAdd(vm.hero.featured!.catalog.id)}
            />
          </View>
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
              actionLabel={vm.suggestion ? `Try “${vm.suggestion}”` : 'Reset'}
              onAction={
                vm.suggestion
                  ? () => applySuggestion(vm.suggestion!)
                  : resetFilters
              }
            />
          </View>
        ) : null}

        {/* Pairs with tonight */}
        {!isSearchActive && vm.complete.length > 0 ? (
          <EditorialSection
            kicker="Pairs with tonight"
            title="Complete the routine."
            note="Quiet supports for the steps before and after your hero."
          >
            {vm.complete.slice(0, 4).map((card, i, arr) => (
              <EditorialIndexRow
                key={card.catalog.id}
                index={i + 1}
                product={card.catalog}
                reason={
                  card.factors[0]?.label
                    ? `Pairs because ${card.factors[0].label.toLowerCase()}.`
                    : 'A safe companion to your hero.'
                }
                isInRoutine={card.isInRoutine}
                isLast={i === arr.length - 1}
                onPress={() => openProduct(card.catalog.id)}
                onAdd={() => handleQuickAdd(card.catalog.id)}
              />
            ))}
          </EditorialSection>
        ) : null}

        {/* Search results */}
        {isSearchActive && vm.searchResults.length > 0 ? (
          <EditorialSection
            kicker={`You searched`}
            title={`“${query.trim()}”`}
            note={`${vm.searchResults.length} product${
              vm.searchResults.length === 1 ? '' : 's'
            } in this season's edit.`}
          >
            {vm.searchResults.slice(0, 8).map((card, i, arr) => (
              <EditorialIndexRow
                key={card.catalog.id}
                index={i + 1}
                product={card.catalog}
                reason={
                  card.factors[0]?.label ?? 'Matched to your query.'
                }
                isInRoutine={card.isInRoutine}
                isLast={i === arr.length - 1}
                onPress={() => openProduct(card.catalog.id)}
                onAdd={() => handleQuickAdd(card.catalog.id)}
              />
            ))}
          </EditorialSection>
        ) : null}

        {/* The "Picked for the theme" listing was removed in pass 7 —
            it duplicated the purpose of "Pairs with tonight". The shop
            now reads as: hero → one supporting list → end. Restraint
            is a luxury signal. The full edit is reachable from
            individual section actions. */}
      </Animated.ScrollView>

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
// scrolls. Keeps the header feeling alive without a full collapsing-header
// structure.
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
  heroBlock: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    marginTop: 12,
  },
  emptyWrap: {
    marginTop: 8,
    marginBottom: 12,
  },
});

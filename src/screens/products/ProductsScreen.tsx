import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SlidersHorizontal } from 'phosphor-react-native';
import { AISearchBar } from '@/components/products/AISearchBar';
import { SearchResults } from '@/components/products/SearchResults';
import { FiltersStubSheet } from '@/components/products/FiltersStubSheet';
import { CategoryRail, type GoalKey } from '@/components/products/CategoryRail';
import { CategoryFeed } from '@/components/products/CategoryFeed';
import { LiveProductCard } from '@/components/products/LiveProductCard';
import { PuraMark } from '@/components/PuraMark';
import { AISourceBadge } from '@/components/dev/AISourceBadge';
import { searchProducts } from '@/store/productSelectors';
import { useAppStore } from '@/store/useAppStore';
import { getSearchSuggestions } from '@/api';
import { lookupLiveProducts } from '@/api/liveProducts';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';
import type { LiveProductCandidate } from '@/ai/ai-contracts';

/**
 * ProductsScreen — v10.16.
 *
 * Information architecture (top → bottom):
 *
 *   BrandBar
 *   ↓
 *   Title: "Products."
 *   ↓
 *   "POWERED BY AI" kicker
 *   ↓
 *   AISearchBar
 *   ↓
 *   CategoryRail — "Browse by goal" chips (7, in spec order)
 *   ↓
 *   CategoryFeed — 2-column grid. When the default "Best for your skin"
 *                  chip is selected, this is the "Matched to your skin"
 *                  section (CategoryFeed already renders that kicker);
 *                  when another chip is selected, the grid becomes the
 *                  goal-specific feed.
 *
 * v10.16 — the v10.9 `BestForYouLead` editorial hero that sat between
 * search and browse has been removed. A single standout match card
 * between the search bar and the browse chips broke the page rhythm and
 * made personalized picks feel like an interruption. Now Browse by goal
 * leads directly after search, and "Matched to your skin" expands into a
 * full multi-pick grid below it via the default-selected chip — the
 * personalized feed is the answer to "Best for your skin", not a
 * competing hero.
 *
 * Pre-scan users: the "Best for your skin" chip's CategoryFeed renders a
 * premium locked promotion for the scan; every other goal is populated
 * from the static catalog regardless of scan state.
 */
export function ProductsScreen() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [goal, setGoal] = useState<GoalKey>('best-for-you');

  // v10.22 — pull AI-driven placeholder + chips from the store.
  // Hydrated by `getSearchSuggestions('products')` after a scan
  // completes (see useAppStore::addScan); on mount we re-fire so a
  // user landing here outside the scan flow still gets contextual
  // suggestions if AI is configured.
  const aiSuggestions = useAppStore((s) => s.aiSearchSuggestions);

  // 150ms debounce on search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  // v11.10 — fire AI search suggestions ONLY when:
  //   (a) the AI gateway is actually configured (no point firing into
  //       a dead transport), AND
  //   (b) we don't already have suggestions cached from the post-scan
  //       hydration in useAppStore::addScan.
  //
  // Previously this fired unconditionally on every mount; when the
  // proxy was unreachable it generated a runtime AbortError that
  // surfaced as a red overlay despite being non-critical. Gating the
  // call removes the noise without changing behavior when AI is up.
  useEffect(() => {
    if (aiSuggestions) return;
    let cancelled = false;
    void (async () => {
      try {
        const { aiGateway } = await import('@/ai/aiGateway');
        if (cancelled) return;
        if (!aiGateway.isAvailable()) return;
        await getSearchSuggestions('products');
      } catch {
        /* non-critical: AISearchBar uses its default placeholder */
      }
    })();
    return () => {
      cancelled = true;
    };
    // aiSuggestions intentionally listed: only re-fires if the cache
    // is invalidated, which currently never happens at runtime — but
    // the dependency keeps the linter honest.
  }, [aiSuggestions]);

  // v18.0 — live retrieval becomes the primary search engine. The
  // local fuzzy `searchProducts` selector becomes the emergency
  // fallback only when (a) the gateway is unreachable, or (b) the AI
  // returned zero candidates for this query. Cached at the module
  // layer in liveProducts.ts so a back-press → re-search is instant.
  const [liveResults, setLiveResults] = useState<LiveProductCandidate[]>(
    []
  );
  const [liveSearching, setLiveSearching] = useState(false);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length === 0) {
      setLiveResults([]);
      setLiveSearching(false);
      return;
    }
    let cancelled = false;
    setLiveSearching(true);
    lookupLiveProducts(q, { count: 10 })
      .then((picks) => {
        if (cancelled) return;
        setLiveResults(picks);
      })
      .catch(() => {
        if (cancelled) return;
        setLiveResults([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLiveSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Emergency fallback: only consulted when AI returns nothing.
  const seedFallbackResults = useMemo(
    () =>
      debouncedQuery.trim().length > 0
        ? searchProducts(debouncedQuery)
        : [],
    [debouncedQuery]
  );

  const isSearching = query.trim().length > 0;
  const placeholder =
    aiSuggestions?.prefill_placeholder &&
    aiSuggestions.prefill_placeholder.trim().length > 0
      ? aiSuggestions.prefill_placeholder
      : undefined;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <AISourceBadge feature="products" />

      {/* v11.10 — unified header pattern. Page identity in the brand
          bar (top-left); no redundant giant in-page title. Matches the
          AssistantScreen pattern so all primary tabs read consistently. */}
      <View style={styles.headerRow}>
        <View style={styles.brandLeft}>
          <PuraMark size={22} variant="idle" />
          <Text style={styles.brandWord} maxFontSizeMultiplier={1.1}>
            Products
          </Text>
        </View>
        <Pressable
          onPress={() => {
            hapt.select();
            setFiltersOpen(true);
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          style={({ pressed }) => [
            styles.filterBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <SlidersHorizontal size={18} color={palette.ink} weight="duotone" />
        </Pressable>
      </View>

      <AISearchBar
        value={query}
        onChangeText={setQuery}
        onClear={() => setQuery('')}
        placeholder={placeholder}
      />

      {/* v10.26 — when AI search suggestions are present, render a
          horizontal chip row under the search bar. Each chip is a
          tap-to-search affordance. Only renders when the AI gateway
          returned non-empty suggestion_chips; on fallback there's
          simply no row, so its presence alone signals "AI ran". */}
      {!isSearching &&
      aiSuggestions &&
      aiSuggestions.suggestion_chips.length > 0 ? (
        <AISuggestionRow
          chips={aiSuggestions.suggestion_chips}
          onPick={(chip) => {
            hapt.select();
            setQuery(chip);
          }}
        />
      ) : null}

      {isSearching ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.searchScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {liveResults.length > 0 ? (
            <View style={liveStyles.grid}>
              {liveResults.map((c) => (
                <View key={c.id} style={liveStyles.cell}>
                  <LiveProductCard candidate={c} variant="alt" />
                </View>
              ))}
            </View>
          ) : liveSearching ? (
            <View style={liveStyles.statusWrap}>
              <Text
                style={liveStyles.statusText}
                maxFontSizeMultiplier={1.2}
              >
                Searching real products…
              </Text>
            </View>
          ) : (
            // Emergency fallback: AI returned nothing AND we're not
            // mid-fetch. Show whatever the local fuzzy search can
            // offer so the user is never staring at "no results" if
            // we have ANY signal at all.
            <SearchResults
              query={debouncedQuery}
              results={seedFallbackResults}
            />
          )}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.rowsScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── 1. Browse by goal — 7 chips, category-first ─────── */}
          <CategoryRail selected={goal} onSelect={setGoal} />

          {/* ── 2. Matched to your skin / goal feed ──────────────── */}
          <CategoryFeed goal={goal} />

          <View style={{ height: 140 }} />
        </ScrollView>
      )}

      <FiltersStubSheet
        visible={filtersOpen}
        onDismiss={() => setFiltersOpen(false)}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// v10.26 — AI suggestion chip row.
//
// Renders a horizontal scrolling row of AI-generated suggestion chips
// beneath the AISearchBar when the gateway has produced fresh
// suggestions. Tapping a chip populates the search input.
//
// Chips fade-in on mount via a small reanimated transition so the row
// doesn't pop visually when AI eventually returns. The whole row only
// renders when AI suggestions exist — so its presence on screen is
// itself a strong signal that AI is alive for this user.
// ---------------------------------------------------------------------------

function AISuggestionRow({
  chips,
  onPick,
}: {
  chips: string[];
  onPick: (chip: string) => void;
}) {
  const op = useSharedValue(0);
  const ty = useSharedValue(6);
  React.useEffect(() => {
    op.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    ty.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [op, ty]);
  const containerStyle = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View style={[suggestionRow.wrap, containerStyle]}>
      <Text style={suggestionRow.kicker} maxFontSizeMultiplier={1.1}>
        SUGGESTED FOR YOU
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={suggestionRow.row}
        keyboardShouldPersistTaps="handled"
      >
        {chips.map((chip) => (
          <Pressable
            key={chip}
            onPress={() => onPick(chip)}
            accessibilityRole="button"
            accessibilityLabel={`Search ${chip}`}
            style={({ pressed }) => [
              suggestionRow.chip,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text
              style={suggestionRow.chipLabel}
              maxFontSizeMultiplier={1.1}
              numberOfLines={1}
            >
              {chip}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const suggestionRow = StyleSheet.create({
  wrap: {
    marginTop: 12,
    marginBottom: 4,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: palette.clay,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  row: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: palette.clayPaper,
    borderWidth: 1,
    borderColor: palette.clay,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipLabel: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    letterSpacing: -0.1,
    color: palette.ink,
  },
});

// v18.0 — live search grid + transient status block.
const liveStyles = StyleSheet.create({
  grid: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cell: {
    width: '47%',
  },
  statusWrap: {
    paddingHorizontal: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  statusText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 22,
    color: palette.inkTertiary,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  // v11.10 — unified header dimensions across primary tabs.
  // 48pt height matches AssistantScreen.brandBar so the page-to-page
  // transitions feel consistent.
  headerRow: {
    height: 48,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandWord: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 48,
    lineHeight: 54,
    letterSpacing: -1.0,
    color: palette.ink,
    marginHorizontal: 20,
    marginTop: 8,
  },
  searchKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  rowsScroll: {
    paddingTop: 6,
    paddingBottom: 20,
  },
  searchScroll: {
    paddingBottom: 120,
  },
});

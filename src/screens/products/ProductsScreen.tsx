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
import { PuraMark } from '@/components/PuraMark';
import { AISourceBadge } from '@/components/dev/AISourceBadge';
import { searchProducts } from '@/store/productSelectors';
import { useAppStore } from '@/store/useAppStore';
import { getSearchSuggestions } from '@/api';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

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

  // Fire-and-forget refresh of search suggestions on mount. Falls back
  // silently when AI is unavailable (the placeholder reverts to the
  // default copy in AISearchBar).
  useEffect(() => {
    let cancelled = false;
    getSearchSuggestions('products').catch(() => {
      /* swallowed — store state stays as-is */
    });
    return () => {
      cancelled = true;
      void cancelled;
    };
  }, []);

  const searchResults = useMemo(
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

      {/* Brand bar — PuraMark + wordmark + filter chip */}
      <View style={styles.headerRow}>
        <View style={styles.brandLeft}>
          <PuraMark size={32} variant="idle" />
          <Text style={styles.brandWord} maxFontSizeMultiplier={1.1}>
            Pura AI
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

      <Text style={styles.title} maxFontSizeMultiplier={1.15}>
        Products.
      </Text>

      <Text style={styles.searchKicker} maxFontSizeMultiplier={1.1}>
        POWERED BY AI
      </Text>

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
          <SearchResults query={debouncedQuery} results={searchResults} />
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  headerRow: {
    height: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandWord: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    letterSpacing: -0.3,
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

import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SlidersHorizontal } from 'phosphor-react-native';
import { AISearchBar } from '@/components/products/AISearchBar';
import { ProductRow } from '@/components/products/ProductRow';
import { SearchResults } from '@/components/products/SearchResults';
import { FiltersStubSheet } from '@/components/products/FiltersStubSheet';
import { PuraMark } from '@/components/PuraMark';
import {
  getBestForYou,
  getBestOverall,
  getEssentials,
  getNatural,
  getNew,
  searchProducts,
} from '@/store/productSelectors';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

/**
 * v7.6 Products catalog (§2.3). Header + title + signature search bar
 * above five horizontally snapping rows. Search swaps the rows for a
 * 2-column grid; a "POWERED BY AI" kicker lives with the bar to sell
 * the signature.
 *
 * The filter sheet and `See all →` destinations are stubs — real catalog
 * grid and filter UI ship in later PRs (§5).
 */
export function ProductsScreen() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // 150ms debounce per §2.10.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  const rows = useMemo(
    () => ({
      bestForYou: getBestForYou(),
      bestOverall: getBestOverall(),
      natural: getNatural(),
      new: getNew(),
      essentials: getEssentials(),
    }),
    []
  );

  const searchResults = useMemo(
    () =>
      debouncedQuery.trim().length > 0
        ? searchProducts(debouncedQuery)
        : [],
    [debouncedQuery]
  );

  const isSearching = query.trim().length > 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.headerRow}>
        <PuraMark variant="idle" size="sm" />
        <Pressable
          onPress={() => {
            hapt.select();
            // eslint-disable-next-line no-console
            console.log('[products] TODO: filter sheet');
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
          <SlidersHorizontal
            size={20}
            color={palette.ink}
            weight="duotone"
          />
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
      />

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
          {/* v9.2 — Shop by goal. Tight 2×3 chip grid at the top of the
              catalog. Each chip will deep-link into CategoryView filtered
              by its goal once the filter engine lands. */}
          <ShopByGoal
            onPressGoal={(goal) => {
              hapt.select();
              // Hook into existing CategoryView — until filter support
              // ships, goal simply scopes the destination kind.
              // eslint-disable-next-line no-console
              console.log('[products] shop-by-goal:', goal);
            }}
          />

          <ProductRow
            kind="best-for-you"
            data={rows.bestForYou}
            isFirstRow
          />
          <ProductRow kind="best-overall" data={rows.bestOverall} />
          <ProductRow kind="natural" data={rows.natural} />
          <ProductRow kind="new" data={rows.new} />
          <ProductRow kind="essentials" data={rows.essentials} />
          <View style={{ height: 120 }} />
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
// ShopByGoal — v9.2 goal-driven browse. Six outcomes in a 2×3 grid, each a
// chip with a colored dot + label + nav arrow. Intentionally lives inline
// so the rest of the catalog composition stays legible.
// ---------------------------------------------------------------------------

const GOAL_SWATCH: Record<
  'breakouts' | 'hydration' | 'texture' | 'dark-marks' | 'sensitive' | 'natural',
  string
> = {
  breakouts: palette.rust,
  hydration: palette.clay,
  texture: palette.amber,
  'dark-marks': palette.clayDeep,
  sensitive: palette.moss,
  natural: palette.mossDeep,
};

const GOAL_LABEL: Record<keyof typeof GOAL_SWATCH, string> = {
  breakouts: 'Breakouts',
  hydration: 'Hydration',
  texture: 'Texture',
  'dark-marks': 'Dark marks',
  sensitive: 'Sensitive',
  natural: 'Natural',
};

function ShopByGoal({
  onPressGoal,
}: {
  onPressGoal: (goal: keyof typeof GOAL_SWATCH) => void;
}) {
  const goals = Object.keys(GOAL_SWATCH) as Array<keyof typeof GOAL_SWATCH>;
  return (
    <View style={goalStyles.wrap}>
      <Text style={goalStyles.kicker} maxFontSizeMultiplier={1.1}>
        SHOP BY GOAL
      </Text>
      <View style={goalStyles.grid}>
        {goals.map((g) => (
          <Pressable
            key={g}
            onPress={() => onPressGoal(g)}
            accessibilityRole="button"
            accessibilityLabel={`Shop ${GOAL_LABEL[g]}`}
            style={({ pressed }) => [
              goalStyles.chip,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <View
              style={[goalStyles.dot, { backgroundColor: GOAL_SWATCH[g] }]}
            />
            <Text style={goalStyles.label} maxFontSizeMultiplier={1.1}>
              {GOAL_LABEL[g]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const goalStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexGrow: 1,
    flexBasis: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.bgDeep,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: -0.1,
    color: palette.ink,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  headerRow: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212,165,116,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 56,
    lineHeight: 56 * 1.02,
    letterSpacing: -1.2,
    color: palette.ink,
    marginHorizontal: 20,
    marginTop: 12,
  },
  searchKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: 'rgba(26,22,20,0.6)',
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  rowsScroll: {
    paddingBottom: 20,
  },
  searchScroll: {
    paddingBottom: 120,
  },
});

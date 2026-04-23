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
import {
  SlidersHorizontal,
  Sparkle,
  Drop,
  GridNine,
  Moon,
  Heart,
  Leaf,
  ArrowRight,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '@/store/useAppStore';
import { AISearchBar } from '@/components/products/AISearchBar';
import { ProductRow } from '@/components/products/ProductRow';
import { SearchResults } from '@/components/products/SearchResults';
import { SearchSuggestions } from '@/components/products/SearchSuggestions';
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
  const nav = useNavigation<any>();
  const hasScanned = useAppStore((s) => s.scans.length > 0);
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

      {/* v10 — brand bar harmonized with Home (PuraMark 32 + wordmark).
          Products is a primary tab, so it needs the full brand mark, not
          the v5 small-only treatment. */}
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
            size={18}
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

      {/* v10.3 — intelligent suggestions when empty. Pulls scan + profile
          state to surface scan-aware chips ("For chin breakouts") plus
          always-on discovery chips. Kills the "dead search" feeling. */}
      {!isSearching ? (
        <SearchSuggestions onPick={(q) => setQuery(q)} />
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
          {/* ── Best for you — leads the page ──────────────────────── */}
          <BestForYouSection
            hasScanned={hasScanned}
            data={rows.bestForYou}
          />

          {/* ── Shop by goal — Phosphor icons, not dots ───────────── */}
          <ShopByGoal
            onPressGoal={(goal) => {
              hapt.select();
              // eslint-disable-next-line no-console
              console.log('[products] shop-by-goal:', goal);
            }}
          />

          {/* ── Remaining rows ─────────────────────────────────────── */}
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
// BestForYouSection — v9.3. First major section on the catalog page.
// If the user has scanned, renders the Best-for-you horizontal row.
// If not, renders a premium empty state that promotes the scan.
// ---------------------------------------------------------------------------

function BestForYouSection({
  hasScanned,
  data,
}: {
  hasScanned: boolean;
  data: Parameters<typeof ProductRow>[0]['data'];
}) {
  const nav = useNavigation<any>();
  if (!hasScanned) {
    return (
      <View style={bestStyles.lockedWrap}>
        <View style={bestStyles.lockedIconWrap}>
          <Sparkle size={20} color={palette.clay} weight="duotone" />
        </View>
        <Text style={bestStyles.lockedKicker} maxFontSizeMultiplier={1.1}>
          BEST FOR YOU
        </Text>
        <Text
          style={bestStyles.lockedHeadline}
          maxFontSizeMultiplier={1.15}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.9}
        >
          Scan your face to unlock matched products.
        </Text>
        <Text style={bestStyles.lockedBody} maxFontSizeMultiplier={1.2}>
          One thirty-second scan, and the catalog starts speaking to your skin directly.
        </Text>
        <Pressable
          onPress={() => {
            hapt.tap();
            nav.navigate('ScanModal');
          }}
          accessibilityRole="button"
          accessibilityLabel="Take your first scan"
          style={({ pressed }) => [
            bestStyles.lockedCta,
            pressed && { opacity: 0.94, transform: [{ scale: 0.985 }] },
          ]}
        >
          <Text style={bestStyles.lockedCtaLabel} maxFontSizeMultiplier={1.15}>
            Take a scan
          </Text>
          <ArrowRight size={15} color={palette.inkInverse} weight="duotone" />
        </Pressable>
      </View>
    );
  }
  return <ProductRow kind="best-for-you" data={data} isFirstRow />;
}

const bestStyles = StyleSheet.create({
  lockedWrap: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    alignItems: 'flex-start',
  },
  lockedIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.clayPaper,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockedKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clay,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  lockedHeadline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: palette.ink,
    marginBottom: 10,
  },
  lockedBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    marginBottom: 18,
  },
  lockedCta: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lockedCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: 0.1,
    color: palette.inkInverse,
  },
});

// ---------------------------------------------------------------------------
// ShopByGoal — v9.3. Six goals, each with a Phosphor duotone icon (not a
// colored dot). Icons carry more signal-per-pixel and match the rest of
// the app's iconography system.
// ---------------------------------------------------------------------------

type GoalKey =
  | 'breakouts'
  | 'hydration'
  | 'texture'
  | 'dark-marks'
  | 'sensitive'
  | 'natural';

const GOAL_META: Record<
  GoalKey,
  { label: string; Icon: React.FC<PhosphorIconProps>; accent: string }
> = {
  breakouts:   { label: 'Breakouts',  Icon: Sparkle as React.FC<PhosphorIconProps>,   accent: palette.rust },
  hydration:   { label: 'Hydration',  Icon: Drop as React.FC<PhosphorIconProps>,       accent: palette.clay },
  texture:     { label: 'Texture',    Icon: GridNine as React.FC<PhosphorIconProps>,   accent: palette.amber },
  'dark-marks':{ label: 'Dark marks', Icon: Moon as React.FC<PhosphorIconProps>,       accent: palette.clayDeep },
  sensitive:   { label: 'Sensitive',  Icon: Heart as React.FC<PhosphorIconProps>,      accent: palette.moss },
  natural:     { label: 'Natural',    Icon: Leaf as React.FC<PhosphorIconProps>,       accent: palette.mossDeep },
};

function ShopByGoal({
  onPressGoal,
}: {
  onPressGoal: (goal: GoalKey) => void;
}) {
  const goals = Object.keys(GOAL_META) as GoalKey[];
  return (
    <View style={goalStyles.wrap}>
      <Text style={goalStyles.kicker} maxFontSizeMultiplier={1.1}>
        SHOP BY GOAL
      </Text>
      <View style={goalStyles.grid}>
        {goals.map((g) => {
          const meta = GOAL_META[g];
          const Icon = meta.Icon;
          return (
            <Pressable
              key={g}
              onPress={() => onPressGoal(g)}
              accessibilityRole="button"
              accessibilityLabel={`Shop ${meta.label}`}
              style={({ pressed }) => [
                goalStyles.chip,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View
                style={[
                  goalStyles.iconWrap,
                  { backgroundColor: withAlpha(meta.accent, 0.12) },
                ]}
              >
                <Icon size={18} color={meta.accent} weight="duotone" />
              </View>
              <Text style={goalStyles.label} maxFontSizeMultiplier={1.1}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Inline color alpha helper — keeps us out of StyleSheet/token juggling
// for the six goal tints.
function withAlpha(hex: string, a: number): string {
  // Accept "#RRGGBB" and produce "rgba(r, g, b, a)".
  if (hex.length !== 7 || !hex.startsWith('#')) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const goalStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 10,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexGrow: 1,
    flexBasis: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
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
  // v10 — cool paper filter chip. Prior warm-sand pill (v5 residual)
  // was the single most jarring misfit on the catalog page.
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
  // v10.3 — lineHeight widened to 54pt (1.125×) so the "p" descender in
  // "Products." stops clipping. 48pt serif needs more vertical room
  // than a 1.02× line can offer.
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
    paddingBottom: 20,
  },
  searchScroll: {
    paddingBottom: 120,
  },
});

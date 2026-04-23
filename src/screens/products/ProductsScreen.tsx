import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
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
  ArrowRight,
  CaretRight,
} from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '@/store/useAppStore';
import { AISearchBar } from '@/components/products/AISearchBar';
import { SearchResults } from '@/components/products/SearchResults';
import { FiltersStubSheet } from '@/components/products/FiltersStubSheet';
import { CategoryRail, type GoalKey } from '@/components/products/CategoryRail';
import { CategoryFeed } from '@/components/products/CategoryFeed';
import { PuraMark } from '@/components/PuraMark';
import { getBestForYou, searchProducts } from '@/store/productSelectors';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';
import type { Product } from '@/types';

/**
 * ProductsScreen — v10.9.
 *
 * Rewrite that collapses three redundant category systems (the v10.3
 * "TRY" smart-chip row, the v9.3 ShopByGoal icon grid, and the four
 * stacked category rows) into ONE discovery architecture:
 *
 *   BrandBar → Title → Search
 *   ↓
 *   BestForYouLead (editorial hero, one top-match pick)
 *   ↓
 *   CategoryRail (7 chips; "Best for your skin" leads)
 *   ↓
 *   CategoryFeed (2-column product grid, content filtered by selection)
 *
 * Search typed state still uses the existing SearchResults component.
 * Pre-scan users: BestForYouLead shows a locked empty state; the
 * CategoryFeed's "Best for your skin" option shows its own scan-
 * promotion card. Every other goal is always populated.
 */
export function ProductsScreen() {
  const nav = useNavigation<any>();
  const hasScanned = useAppStore((s) => s.scans.length > 0);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [goal, setGoal] = useState<GoalKey>('best-for-you');

  // 150ms debounce on search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  const searchResults = useMemo(
    () =>
      debouncedQuery.trim().length > 0
        ? searchProducts(debouncedQuery)
        : [],
    [debouncedQuery]
  );

  const bestForYouLead = useMemo<Product | null>(() => {
    const picks = getBestForYou();
    return picks.length > 0 ? picks[0] : null;
  }, []);

  const isSearching = query.trim().length > 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

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
          {/* ── 1. Hero: Best for your skin lead ─────────────────── */}
          {hasScanned && bestForYouLead ? (
            <BestForYouLead product={bestForYouLead} />
          ) : (
            <BestForYouLockedHero onScan={() => nav.navigate('ScanModal')} />
          )}

          {/* ── 2. Unified category rail ─────────────────────────── */}
          <CategoryRail selected={goal} onSelect={setGoal} />

          {/* ── 3. Category feed — content changes by selection ──── */}
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
// BestForYouLead — editorial hero for the single top match (post-scan).
// Inline-defined so the card stays a thin layer over the shared Category
// components and keeps its page-specific sizing.
// ---------------------------------------------------------------------------

function BestForYouLead({ product }: { product: Product }) {
  const nav = useNavigation<any>();
  const openLead = () => {
    hapt.select();
    nav.navigate('ProductDetail', { productId: product.id, tint: product.tint });
  };
  return (
    <View style={leadStyles.wrap}>
      <View style={leadStyles.headerRow}>
        <Text style={leadStyles.kicker} maxFontSizeMultiplier={1.1}>
          BEST FOR YOU
        </Text>
        <View style={leadStyles.leader} />
        <Text style={leadStyles.pct} maxFontSizeMultiplier={1.1}>
          {`${product.matchScore ?? 94}% match`}
        </Text>
      </View>

      <Pressable
        onPress={openLead}
        accessibilityRole="button"
        accessibilityLabel={`${product.brand} ${product.name} — top match`}
        style={({ pressed }) => [
          leadStyles.card,
          pressed && { opacity: 0.96 },
        ]}
      >
        <View style={[leadStyles.image, { backgroundColor: tintFor(product) }]}>
          {product.imageUri ? (
            <Image
              source={{ uri: product.imageUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <Drop size={48} color={palette.ink} weight="duotone" />
          )}
        </View>
        <View style={leadStyles.text}>
          <Text style={leadStyles.brand} maxFontSizeMultiplier={1.1}>
            {product.brand.toUpperCase()}
          </Text>
          <Text
            style={leadStyles.name}
            numberOfLines={2}
            maxFontSizeMultiplier={1.15}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {product.name}
          </Text>
          <Text
            style={leadStyles.why}
            numberOfLines={2}
            maxFontSizeMultiplier={1.2}
          >
            Matched from your scan — picked from everything we have.
          </Text>
          <View style={leadStyles.foot}>
            <Text style={leadStyles.price} maxFontSizeMultiplier={1.1}>
              {`$${Number.isInteger(product.price) ? product.price : product.price.toFixed(2)}`}
            </Text>
            <CaretRight size={13} color={palette.inkTertiary} weight="bold" />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function BestForYouLockedHero({ onScan }: { onScan: () => void }) {
  return (
    <View style={lockedStyles.wrap}>
      <View style={lockedStyles.iconWrap}>
        <Sparkle size={20} color={palette.clay} weight="duotone" />
      </View>
      <Text style={lockedStyles.kicker} maxFontSizeMultiplier={1.1}>
        BEST FOR YOU
      </Text>
      <Text
        style={lockedStyles.headline}
        maxFontSizeMultiplier={1.15}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.9}
      >
        Scan your face to unlock your best matches.
      </Text>
      <Text style={lockedStyles.body} maxFontSizeMultiplier={1.2}>
        One thirty-second scan, and the catalog starts speaking to your skin directly.
      </Text>
      <Pressable
        onPress={() => {
          hapt.tap();
          onScan();
        }}
        accessibilityRole="button"
        accessibilityLabel="Take your first scan"
        style={({ pressed }) => [
          lockedStyles.cta,
          pressed && { opacity: 0.94, transform: [{ scale: 0.985 }] },
        ]}
      >
        <Text style={lockedStyles.ctaLabel} maxFontSizeMultiplier={1.15}>
          Take a scan
        </Text>
        <ArrowRight size={15} color={palette.inkInverse} weight="duotone" />
      </Pressable>
    </View>
  );
}

function tintFor(p: Product): string {
  switch (p.tint) {
    case 'clay':
      return palette.clayPaper;
    case 'sand':
      return palette.sandPaper;
    case 'moss':
      return palette.mossLight;
    default:
      return palette.bgDeep;
  }
}

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
    paddingBottom: 20,
  },
  searchScroll: {
    paddingBottom: 120,
  },
});

const leadStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  leader: {
    flex: 1,
    height: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderBottomColor: palette.hairline,
  },
  pct: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.4,
    color: palette.mossDeep,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  card: {
    flexDirection: 'row',
    gap: 16,
  },
  image: {
    width: 148,
    height: 186,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    marginBottom: 4,
  },
  name: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 8,
  },
  why: {
    flex: 1,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    lineHeight: 19,
    color: palette.inkSecondary,
    marginBottom: 10,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    letterSpacing: -0.2,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
});

const lockedStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 18,
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.clayPaper,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clay,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: palette.ink,
    marginBottom: 10,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    marginBottom: 18,
  },
  cta: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: 0.1,
    color: palette.inkInverse,
  },
});

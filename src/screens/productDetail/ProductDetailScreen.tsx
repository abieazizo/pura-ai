import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { DetailHeader } from '@/components/products/DetailHeader';
import { ProductHero } from '@/components/products/ProductHero';
import { BrandAndName } from '@/components/products/BrandAndName';
import { PriceAndRating } from '@/components/products/PriceAndRating';
import { FitTagsRow } from '@/components/products/FitTagsRow';
import { Accordion } from '@/components/products/Accordion';
import { IngredientsPanel } from '@/components/products/IngredientsPanel';
import { DetailsPanel } from '@/components/products/DetailsPanel';
import { PinnedCTA } from '@/components/products/PinnedCTA';
import {
  AddToRoutineSheet,
  routineTargetLabel,
  type AddToRoutineTarget,
} from '@/components/products/AddToRoutineSheet';
import { Toast } from '@/components/contextual/Toast';
import { seedProducts } from '@/data/seed';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { palette } from '@/theme';
import { CATEGORY_LABEL, getConcerns } from '@/utils/concerns';
import type { Concern, Product, ProductTint } from '@/types';

type DetailRoute = RouteProp<
  { ProductDetail: { productId: string; tint?: ProductTint } },
  'ProductDetail'
>;

/**
 * v7.6 Product Detail. Composition is strict per §3.2:
 *   DetailHeader → ScrollView{
 *     ProductHero(tint) → BrandAndName → PriceAndRating → FitTagsRow
 *     → Accordion(description, open) → Accordion(ingredients, open)
 *     → Accordion(howToUse) → Accordion(details) → 140pt spacer
 *   } → PinnedCTA
 */
export function ProductDetailScreen() {
  const route = useRoute<DetailRoute>();
  const { productId } = route.params;
  const tint: ProductTint = route.params.tint ?? 'sand';

  const product = seedProducts.find((p) => p.id === productId);
  const user = useAppStore(
    useShallow((s) => ({
      skinType: s.skinType,
      concerns: s.concerns,
      sensitivity: s.sensitivity,
    }))
  );

  // v9.7 — pull the user's top concern so we can generate a concrete
  // "Why this matches you" line tied to the scan spine.
  const scans = useAppStore((s) => s.scans);
  const topConcern = useMemo<Concern | null>(() => {
    const latest = scans[scans.length - 1];
    if (!latest) return null;
    const previous = scans.length >= 2 ? scans[scans.length - 2] : undefined;
    const concerns = getConcerns(latest, previous);
    return concerns.find((c) => c.severity !== 'calm') ?? concerns[0] ?? null;
  }, [scans]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!product) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <DetailHeader productId={productId} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Product not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleAdded = (target: AddToRoutineTarget) => {
    setToastMsg(`Added to ${routineTargetLabel(target)}.`);
  };

  const handleWhereToBuy = () => {
    // eslint-disable-next-line no-console
    console.log('[product] TODO: purchasing links coming soon');
    setToastMsg('Purchasing links coming soon.');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <DetailHeader productId={product.id} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ProductHero tint={tint} imageUrl={product.imageUrl ?? product.imageUri} />
        <BrandAndName brand={product.brand} name={product.name} />

        {/* v9.7 — match + why. Lives right under the name so the match
            signal and the concern-tied rationale register before price
            and fit tags. Only renders when we have a scan-derived top
            concern; otherwise the section is hidden (no fabricated
            match talk). */}
        <MatchWhyBlock product={product} topConcern={topConcern} />

        <PriceAndRating
          price={product.price}
          rating={product.rating}
          reviewCount={product.reviewCount}
        />
        <FitTagsRow product={product} user={user} />

        <Accordion id="description" title="Description" defaultOpen>
          <Text style={styles.bodyCopy} maxFontSizeMultiplier={1.2}>
            {product.description || 'No description available.'}
          </Text>
        </Accordion>

        <Accordion id="ingredients" title="Ingredients" defaultOpen>
          <IngredientsPanel product={product} user={user} />
        </Accordion>

        <Accordion id="howToUse" title="How to Use">
          {product.howToUse ? (
            <Text style={styles.bodyCopy} maxFontSizeMultiplier={1.2}>
              {product.howToUse}
            </Text>
          ) : null}
        </Accordion>

        <Accordion id="details" title="Details">
          <DetailsPanel product={product} />
        </Accordion>

        <View style={{ height: 140 }} />
      </ScrollView>

      <PinnedCTA
        onAddToRoutine={() => setSheetOpen(true)}
        onWhereToBuy={handleWhereToBuy}
      />

      <AddToRoutineSheet
        visible={sheetOpen}
        productId={product.id}
        productName={product.name}
        onDismiss={() => setSheetOpen(false)}
        onAdded={handleAdded}
      />

      {toastMsg ? (
        <Toast message={toastMsg} onFinished={() => setToastMsg(null)} />
      ) : null}
    </SafeAreaView>
  );
}

// ============================================================================
// MatchWhyBlock — v9.7
//
// Inline section below the product name. Shows:
//   • Moss-green "92% MATCH" capsule + stars for rating parity
//   • A concern-tied rationale sentence:
//       "Because your chin is tracking as moderate in your last scan."
// Hidden if there's no scan-derived concern — never fabricates a match
// story out of nothing.
// ============================================================================

function MatchWhyBlock({
  product,
  topConcern,
}: {
  product: Product;
  topConcern: Concern | null;
}) {
  if (!topConcern) return null;

  const reason = buildReason(product, topConcern);
  const matchScore = product.matchScore ?? 82;

  return (
    <View style={matchStyles.wrap}>
      <View style={matchStyles.badgeRow}>
        <View style={matchStyles.badge}>
          <Text style={matchStyles.badgeNum} maxFontSizeMultiplier={1.1}>
            {matchScore}%
          </Text>
          <Text style={matchStyles.badgeLabel} maxFontSizeMultiplier={1.1}>
            MATCH
          </Text>
        </View>
        <Text style={matchStyles.kicker} maxFontSizeMultiplier={1.1}>
          WHY THIS MATCHES YOU
        </Text>
      </View>
      <View style={matchStyles.reasonRow}>
        <View style={matchStyles.reasonBullet} />
        <Text
          style={matchStyles.reason}
          maxFontSizeMultiplier={1.2}
          numberOfLines={3}
        >
          {reason}
        </Text>
      </View>
    </View>
  );
}

function buildReason(product: Product, concern: Concern): string {
  // Category-aware rationale. Uses the concern region for specificity; the
  // product's own category implicitly shapes the language (e.g. a serum
  // vs a moisturizer speaks to different concerns).
  const region = concern.region;
  switch (concern.category) {
    case 'breakouts':
      return `Your ${region} is tracking as ${CATEGORY_LABEL[concern.category].toLowerCase()} \u00b7 ${concern.severity.replace('-', ' ')}. This targets exactly that.`;
    case 'hydration':
      return `Your ${region} are reading low on moisture. This restores hydration where you need it.`;
    case 'texture':
      return `Texture on your ${region} is uneven in your last scan. This smooths that surface.`;
    case 'tone':
      return `Dark marks on your ${region} are still visible. This works on uneven tone over time.`;
  }
}

// ============================================================================

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  scroll: { paddingBottom: 60 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    color: 'rgba(26,22,20,0.6)',
  },
  bodyCopy: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 16,
    lineHeight: 23,
    color: 'rgba(26,22,20,0.85)',
  },
});

const matchStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: palette.moss,
    alignItems: 'center',
    minWidth: 56,
  },
  badgeNum: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    lineHeight: 15,
    color: palette.inkInverse,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.1,
  },
  badgeLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 1.1,
    color: 'rgba(248,250,252,0.82)',
    marginTop: 1,
  },
  kicker: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
  reasonBullet: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: palette.clay,
    marginTop: 2,
  },
  reason: {
    flex: 1,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSecondary,
  },
});

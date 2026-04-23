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

        {/* v10 — description now collapsed by default. Brand-marketing copy
            is the weakest information on this screen; users open it only
            when they need to. Ingredients stay open because they're the
            concrete health data. */}
        <Accordion id="description" title="Description">
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
// MatchWhyBlock — v10
//
// Inline row below the product name. No bordered card, no bullet rail, no
// separate "WHY THIS MATCHES YOU" kicker that duplicated the FitTagsRow
// kicker. The moss badge carries the match signal; the italic serif
// rationale carries the reason. Renders as a caption to the product name,
// not a competing panel.
//
// Hidden if there's no scan-derived concern — never fabricates a match
// story out of nothing.
// ============================================================================

/**
 * v10.4 — match block now reads as the AI's pitch, not a caption.
 *
 * Structure:
 *   MATCHED FOR YOU  ·······································  92%
 *   "Your chin is reading as breakouts · moderate.
 *    This targets exactly that."
 *
 * The kicker + percentage live on one editorial header row with a
 * dotted-leader rule between them so the block has premium tension
 * (like a menu price line). The rationale is a larger italic serif
 * quote beneath. Moss is used only on the percentage — the rest reads
 * in ink, so the block belongs to the product page's voice.
 */
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
      <View style={matchStyles.headerRow}>
        <Text style={matchStyles.kicker} maxFontSizeMultiplier={1.1}>
          MATCHED FOR YOU
        </Text>
        <View style={matchStyles.leader} />
        <Text style={matchStyles.percent} maxFontSizeMultiplier={1.1}>
          {`${matchScore}%`}
        </Text>
      </View>
      <Text
        style={matchStyles.reason}
        maxFontSizeMultiplier={1.2}
        numberOfLines={4}
      >
        {reason}
      </Text>
    </View>
  );
}

function buildReason(product: Product, concern: Concern): string {
  // v10 — region phrasing rewritten to stay grammatical for singular
  // (chin, forehead, nose) and plural (cheeks, under-eyes) region strings.
  // The product's own category implicitly shapes the language.
  const region = concern.region;
  const cat = CATEGORY_LABEL[concern.category].toLowerCase();
  const sev = concern.severity.replace('-', ' ');
  switch (concern.category) {
    case 'breakouts':
      return `Your ${region} is reading as ${cat} \u00b7 ${sev}. This targets exactly that.`;
    case 'hydration':
      return `Low moisture on your ${region} in the last scan. This restores hydration where you need it.`;
    case 'texture':
      return `Uneven texture on your ${region} in the last scan. This smooths that surface.`;
    case 'tone':
      return `Dark marks still visible on your ${region}. This works on uneven tone over time.`;
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
    color: palette.inkTertiary,
  },
  // v10 — palette.inkSecondary in place of the warm terracotta rgba.
  bodyCopy: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 16,
    lineHeight: 23,
    color: palette.inkSecondary,
  },
});

// v10.4 — match block is now the AI's pitch beat.
//
// Header row: "MATCHED FOR YOU" kicker + dotted leader + giant "92%" in
// moss-deep. Below: a larger italic serif rationale in ink-secondary.
// No bordered card, no badge — the block lives inline but carries real
// typographic weight so it reads as the product page's signature moment.
const matchStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
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
  percent: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.6,
    color: palette.mossDeep,
    fontVariant: ['tabular-nums'],
  },
  reason: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 19,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: palette.inkSecondary,
  },
});

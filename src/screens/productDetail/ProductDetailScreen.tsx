import React, { useMemo, useState } from 'react';
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
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { DetailHeader } from '@/components/products/DetailHeader';
import { ProductHero } from '@/components/products/ProductHero';
import { BrandAndName } from '@/components/products/BrandAndName';
import { PriceAndRating } from '@/components/products/PriceAndRating';
import { FitTagsRow } from '@/components/products/FitTagsRow';
import { Accordion } from '@/components/products/Accordion';
import { WhyItWorksPanel } from '@/components/products/WhyItWorksPanel';
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
import { hapt } from '@/utils/haptics';
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
        {/* ── v10.10 first screenful — identity cluster ─────────
            Image → Brand/Name → Match (% + one-line reason) → Price
            → compact Fit chips. Tight 16pt rhythm between these five
            elements so they read as one product-identity block. */}
        <ProductHero tint={tint} imageUrl={product.imageUrl ?? product.imageUri} />
        <BrandAndName brand={product.brand} name={product.name} />
        <MatchWhyBlock product={product} topConcern={topConcern} />
        <PriceAndRating
          price={product.price}
          rating={product.rating}
          reviewCount={product.reviewCount}
        />
        <FitTagsRow product={product} user={user} />

        {/* ── v10.10 boundary rule ──────────────────────────────
            A hairline + kicker creates a clear break between the
            identity cluster above and the progressive-disclosure
            stack below. Reads as "here's the product — here are
            the details." */}
        <View style={styles.boundary}>
          <View style={styles.boundaryRule} />
          <Text style={styles.boundaryKicker} maxFontSizeMultiplier={1.1}>
            THE DETAILS
          </Text>
          <View style={styles.boundaryRule} />
        </View>

        {/* ── v10.10 progressive disclosure (4 sections) ────────
            The old "Why this matches you" + "Ingredients" split
            merged into a single premium "Why it works for your
            skin" section. The formula story, the AI fit note, the
            curated hero ingredients, and the collapsible full list
            all live in one place — one answer to "why is this right
            for me." Alternatives stays open as the discovery moment;
            How to use + Product details collapsed by default. */}
        <Accordion id="why" title="Why it works for your skin" defaultOpen>
          <WhyItWorksPanel
            product={product}
            user={user}
            topConcern={topConcern}
          />
        </Accordion>

        <Accordion id="alternatives" title="Alternatives" defaultOpen>
          <AlternativesList current={product} />
        </Accordion>

        <Accordion id="howToUse" title="How to use">
          {product.howToUse ? (
            <Text style={styles.bodyCopy} maxFontSizeMultiplier={1.2}>
              {product.howToUse}
            </Text>
          ) : null}
        </Accordion>

        <Accordion id="details" title="Product details">
          <DetailsPanel product={product} />
        </Accordion>

        {/* v10.12 — spacer reduced 180 → 120 to match the new
            single-row PinnedCTA tray (was 2-row ≈ 110pt + paddings). */}
        <View style={{ height: 120 }} />
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
// AlternativesList — v10.9
// Three similar products rendered as match-pill rows (same visual
// vocabulary as Plan's Alternatives from v10.5). Tap a row to open its
// detail page. Hidden when no alternatives are found.
// ============================================================================

function AlternativesList({ current }: { current: Product }) {
  const nav = useNavigation<any>();
  const alternatives = useMemo(
    () => pickAlternatives(current),
    [current]
  );
  if (alternatives.length === 0) return null;

  const openProduct = (p: Product) => {
    hapt.select();
    nav.navigate('ProductDetail', { productId: p.id, tint: p.tint });
  };

  return (
    <View style={altStyles.list}>
      {alternatives.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => openProduct(p)}
          accessibilityRole="button"
          accessibilityLabel={`${p.brand} ${p.name}`}
          style={({ pressed }) => [
            altStyles.row,
            pressed && { opacity: 0.92 },
          ]}
        >
          <View
            style={[
              altStyles.image,
              { backgroundColor: tintColor(p) },
            ]}
          >
            {p.imageUri ? (
              <Image
                source={{ uri: p.imageUri }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            ) : null}
          </View>
          <View style={{ flex: 1, marginRight: 10 }}>
            <View style={altStyles.brandRow}>
              <Text style={altStyles.brand} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                {p.brand.toUpperCase()}
              </Text>
              <View style={altStyles.matchPill}>
                <Text style={altStyles.matchPillText} maxFontSizeMultiplier={1.1}>
                  {`${p.matchScore ?? 84}%`}
                </Text>
              </View>
            </View>
            <Text
              style={altStyles.name}
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
            >
              {p.name}
            </Text>
          </View>
          <Text style={altStyles.price} maxFontSizeMultiplier={1.1}>
            {`$${Number.isInteger(p.price) ? p.price : p.price.toFixed(2)}`}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function pickAlternatives(current: Product): Product[] {
  return seedProducts
    .filter((p) => p.id !== current.id && p.category === current.category)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
}

function tintColor(p: Product): string {
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

// v10.10 — `buildWhyParagraph` was moved inside `WhyItWorksPanel`
// (renamed to `buildRationale`) along with the hero-ingredient
// curation. The Why section now owns its full story end to end —
// fit note → rationale → key ingredients → full list — instead of
// splitting it across a separate rationale accordion and an
// IngredientsPanel.

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
        numberOfLines={3}
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
  // v10.10 — "THE DETAILS" boundary between the identity cluster and
  // the progressive-disclosure stack. v10.12: marginTop 36 → 22 to
  // tighten the transition without losing the visual two-halves cue.
  boundary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
    marginHorizontal: 20,
  },
  boundaryRule: {
    flex: 1,
    height: 1,
    backgroundColor: palette.hairline,
  },
  boundaryKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.8,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
});

// v10.4 — match block is now the AI's pitch beat.
//
// Header row: "MATCHED FOR YOU" kicker + dotted leader + giant "92%" in
// moss-deep. Below: a larger italic serif rationale in ink-secondary.
// No bordered card, no badge — the block lives inline but carries real
// typographic weight so it reads as the product page's signature moment.
// v10.12 — match block compressed. marginTop 16 → 12, header marginBottom
// 10 → 8, percent 24→22, reason fontSize 19→17 + lineHeight 26→22. Saves
// ~25pt without losing the editorial register — the dotted-leader header
// + moss percent still read as the AI's headline pitch.
const matchStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
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
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.5,
    color: palette.mossDeep,
    fontVariant: ['tabular-nums'],
  },
  reason: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: palette.inkSecondary,
  },
});

// v10.12 — alternatives compressed. list gap 14 → 10, row paddingVertical
// 6 → 3, thumbnails 54×66 → 48×58. Three rows of Alternatives save ~25pt
// while keeping the "same vocabulary as Plan" visual read.
const altStyles = StyleSheet.create({
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 3,
  },
  image: {
    width: 48,
    height: 58,
    borderRadius: 10,
    overflow: 'hidden',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.inkTertiary,
  },
  matchPill: {
    paddingHorizontal: 6,
    height: 16,
    borderRadius: 8,
    backgroundColor: palette.mossLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchPillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 0.4,
    color: palette.mossDeep,
    fontVariant: ['tabular-nums'],
  },
  name: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  price: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    letterSpacing: -0.2,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
});

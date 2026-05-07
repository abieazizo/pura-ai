import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Linking,
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
import { seedProducts, productMechanismFor } from '@/data/seed';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';
import { CATEGORY_LABEL, getConcerns } from '@/utils/concerns';
import type { Concern, Product, ProductCategory, ProductTint } from '@/types';
import type { LiveProductCandidate } from '@/ai/ai-contracts';
// v19.20 — ProductDetailScreen's "alternatives" row now flows
// through the shared deterministic recommendation engine.
import {
  buildSearchUrl,
  getRecommendationContextFromQuery,
} from '@/api/liveProducts';
import { LiveProductCard } from '@/components/products/LiveProductCard';

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

  // v18.1 — resolve from the live cache first, fall back to seed.
  // Live products surfaced anywhere in the app (Home, scan results,
  // assistant, search) are written into `liveProductsById` by
  // `src/api/liveProducts.ts`. ProductDetail can render either type
  // because we adapt LiveProductCandidate → Product shape on read.
  const liveCandidate = useAppStore(
    (s) => s.liveProductsById[productId] ?? null
  );
  const product: Product | undefined = useMemo(() => {
    if (liveCandidate) {
      return liveCandidateToProduct(liveCandidate, tint);
    }
    return seedProducts.find((p) => p.id === productId);
  }, [liveCandidate, productId, tint]);
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

  const handleWhereToBuy = async () => {
    // v10.27 — open the brand's real product page when the seed
    // catalog has a buyUrl for this id. Falls back to a brand search
    // if not, then to a friendly toast if neither works (offline,
    // unsupported scheme, etc.).
    const target =
      product.buyUrl ??
      `https://duckduckgo.com/?q=${encodeURIComponent(
        `${product.brand} ${product.name}`
      )}`;
    try {
      const supported = await Linking.canOpenURL(target);
      if (!supported) {
        setToastMsg('Couldn’t open the shop link on this device.');
        return;
      }
      await Linking.openURL(target);
    } catch {
      setToastMsg('Couldn’t open the shop link.');
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <DetailHeader productId={product.id} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ProductHero
          tint={tint}
          imageUrl={
            product.imageUrl && product.imageUrl.length > 0
              ? product.imageUrl
              : product.imageUri && product.imageUri.length > 0
              ? product.imageUri
              : undefined
          }
          product={product}
        />
        <BrandAndName brand={product.brand} name={product.name} />
        <MatchWhyBlock product={product} topConcern={topConcern} />
        {/* v18.4 — render PriceAndRating's full panel ONLY for seed
            products (which have real rating + reviewCount). Live
            products show a tighter price-only line — no fake zero
            rating, no "(0 reviews)" placeholder. */}
        {liveCandidate ? (
          <LivePriceLine
            price={product.price}
            currency={liveCandidate.currency}
            merchantName={liveCandidate.merchantName}
          />
        ) : (
          <PriceAndRating
            price={product.price}
            rating={product.rating}
            reviewCount={product.reviewCount}
          />
        )}
        {/* Hide FitTagsRow on live products that have no tags — the
            seed-era treatment renders nothing for empty tags but
            still occupies vertical space. */}
        {liveCandidate && product.tags.length === 0 ? null : (
          <FitTagsRow product={product} user={user} />
        )}

        <View style={styles.boundary}>
          <View style={styles.boundaryRule} />
          <Text style={styles.boundaryKicker} maxFontSizeMultiplier={1.1}>
            THE DETAILS
          </Text>
          <View style={styles.boundaryRule} />
        </View>

        {/* v18.4 — for LIVE products, replace the dense WhyItWorksPanel
            (which expects rich seed-era ingredient + formula data)
            with a tight "Why this fits" panel built from the AI's
            matchReason + ingredientsHighlights. Seed products keep
            the legacy panel. */}
        {liveCandidate ? (
          <Accordion
            id="why"
            title="Why this fits your scan"
            defaultOpen
          >
            <LiveWhyPanel candidate={liveCandidate} />
          </Accordion>
        ) : (
          <Accordion id="why" title="Why it works for your skin" defaultOpen>
            <WhyItWorksPanel
              product={product}
              user={user}
              topConcern={topConcern}
            />
          </Accordion>
        )}

        <Accordion id="alternatives" title="Alternatives" defaultOpen>
          <AlternativesList current={product} />
        </Accordion>

        {/* "How to use" hidden on live products with no howToUse data. */}
        {liveCandidate && !product.howToUse ? null : (
          <Accordion id="howToUse" title="How to use">
            {product.howToUse ? (
              <Text style={styles.bodyCopy} maxFontSizeMultiplier={1.2}>
                {product.howToUse}
              </Text>
            ) : null}
          </Accordion>
        )}

        {/* "Product details" hidden on live products — the seed-era
            DetailsPanel pulls fields (formulation, goodFor, timeOfUse,
            skinTypes) that live candidates don't carry. */}
        {liveCandidate ? null : (
          <Accordion id="details" title="Product details">
            <DetailsPanel product={product} />
          </Accordion>
        )}

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
// v18.1 — LiveProductCandidate → Product adapter.
//
// The detail screen was originally seed-only. v18.1 lets it render
// any product surfaced via the live retrieval engine by adapting
// the candidate shape into the legacy Product shape. Fields the
// live candidate doesn't carry (rating, reviewCount, tint hash,
// formulation, howToUse, etc.) are filled with sensible defaults
// or empty strings; the screen's optional-field handling already
// handles missing data gracefully.
// ============================================================================

// ============================================================================
// v18.4 — Live product detail components.
// ============================================================================

/**
 * Price-only line for live products. Hides rating + reviewCount which
 * live candidates don't carry. Optionally shows the merchant name as
 * a small kicker so the user knows where the price came from.
 */
function LivePriceLine({
  price,
  currency,
  merchantName,
}: {
  price: number;
  currency: string;
  merchantName: string | null;
}) {
  if (!Number.isFinite(price) || price <= 0) {
    return (
      <View style={livePriceStyles.row}>
        <Text style={livePriceStyles.priceMissing} maxFontSizeMultiplier={1.1}>
          Price varies — tap Shop for live pricing
        </Text>
      </View>
    );
  }
  const sym =
    currency === 'GBP'
      ? '£'
      : currency === 'EUR'
      ? '€'
      : currency === 'CAD'
      ? 'C$'
      : currency === 'AUD'
      ? 'A$'
      : '$';
  const formatted = Number.isInteger(price)
    ? `${sym}${price}`
    : `${sym}${price.toFixed(2)}`;
  return (
    <View style={livePriceStyles.row}>
      <Text style={livePriceStyles.price} maxFontSizeMultiplier={1.1}>
        {formatted}
      </Text>
      {merchantName ? (
        <Text style={livePriceStyles.merchant} maxFontSizeMultiplier={1.1}>
          at {merchantName}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Why-this-fits panel for live products. Replaces the seed-era
 * WhyItWorksPanel which relies on `formulation` + structured
 * `ingredientList` that live candidates don't carry. Renders:
 *   • The AI's matchReason as a serif lead line
 *   • The shortDescription as a body paragraph
 *   • A clean "Hero ingredients" chip row from ingredientsHighlights
 *   • Concern chips from concernTags
 */
function LiveWhyPanel({ candidate }: { candidate: LiveProductCandidate }) {
  return (
    <View style={liveWhyStyles.wrap}>
      {candidate.matchReason ? (
        <Text style={liveWhyStyles.lead} maxFontSizeMultiplier={1.2}>
          {candidate.matchReason}
        </Text>
      ) : null}
      {candidate.shortDescription ? (
        <Text style={liveWhyStyles.body} maxFontSizeMultiplier={1.2}>
          {candidate.shortDescription}
        </Text>
      ) : null}
      {candidate.ingredientsHighlights.length > 0 ? (
        <View style={liveWhyStyles.section}>
          <Text style={liveWhyStyles.kicker} maxFontSizeMultiplier={1.1}>
            HERO INGREDIENTS
          </Text>
          <View style={liveWhyStyles.chipRow}>
            {candidate.ingredientsHighlights.slice(0, 6).map((ing) => (
              <View key={ing} style={liveWhyStyles.chip}>
                <Text style={liveWhyStyles.chipText} maxFontSizeMultiplier={1.1}>
                  {ing}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {candidate.concernTags.length > 0 ? (
        <View style={liveWhyStyles.section}>
          <Text style={liveWhyStyles.kicker} maxFontSizeMultiplier={1.1}>
            TARGETS
          </Text>
          <View style={liveWhyStyles.chipRow}>
            {candidate.concernTags.map((c) => (
              <View key={c} style={liveWhyStyles.targetChip}>
                <Text
                  style={liveWhyStyles.targetChipText}
                  maxFontSizeMultiplier={1.1}
                >
                  {c.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const livePriceStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 14,
  },
  price: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    letterSpacing: -0.4,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  merchant: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkTertiary,
  },
  priceMissing: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    color: palette.inkTertiary,
  },
});

const liveWhyStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 14,
  },
  lead: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: palette.ink,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: palette.inkSecondary,
  },
  section: {
    gap: 8,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  chipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
    color: palette.ink,
  },
  targetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: palette.clayPaper,
  },
  targetChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.2,
    color: palette.clayDeep,
  },
});

function adaptCategory(c: LiveProductCandidate['category']): ProductCategory {
  switch (c) {
    case 'spot_treatment':
      return 'treatment';
    case 'unknown':
      return 'serum';
    default:
      return c;
  }
}

function liveCandidateToProduct(
  c: LiveProductCandidate,
  tint: ProductTint
): Product {
  const buyUrl = c.productUrl ?? buildSearchUrl(c);
  return {
    id: c.id,
    brand: c.brand,
    name: c.name,
    category: adaptCategory(c.category),
    imageUri: c.imageUrl ?? '',
    ingredients: c.ingredientsHighlights,
    keyIngredients: c.ingredientsHighlights,
    description: c.shortDescription,
    tint,
    rating: 0,
    reviewCount: 0,
    matchScore: c.matchScore,
    tags: [],
    addedDate: c.sourceTimestamp,
    price: c.price ?? 0,
    imageUrl: c.imageUrl ?? undefined,
    buyUrl,
  };
}

// ============================================================================
// AlternativesList — v10.9
// Three similar products rendered as match-pill rows (same visual
// vocabulary as Plan's Alternatives from v10.5). Tap a row to open its
// detail page. Hidden when no alternatives are found.
// ============================================================================

// v19.20 — AlternativesList now uses the shared deterministic
// recommendation engine. The list paints from the seed catalog
// regardless of AI proxy state. The current product is filtered
// out so the same item never appears as its own alternative.
function AlternativesList({ current }: { current: Product }) {
  const [picks, setPicks] = useState<LiveProductCandidate[]>([]);
  useEffect(() => {
    let cancelled = false;
    const query = `${current.category}`;
    getRecommendationContextFromQuery(query, {})
      .then((rec) => {
        if (cancelled) return;
        // Drop the current product if it surfaces; cap at 3 alts.
        setPicks(
          rec.candidateProducts
            .filter((c) => c.id !== current.id)
            .slice(0, 3)
        );
      })
      .catch(() => {
        if (cancelled) return;
        setPicks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [current.id, current.category, current.brand, current.name]);

  if (picks.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={altStyles.scrollRow}
    >
      {picks.map((c) => (
        <LiveProductCard key={c.id} candidate={c} variant="alt" />
      ))}
    </ScrollView>
  );
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
  // v10.32 — second sentence is now the per-product mechanism when
  // available, replacing the generic filler that read identically
  // across every product.
  const region = concern.region;
  const cat = CATEGORY_LABEL[concern.category].toLowerCase();
  const sev = concern.severity.replace('-', ' ');
  const mechanism = productMechanismFor(product.id);
  switch (concern.category) {
    case 'breakouts':
      return `Your ${region} is reading as ${cat} \u00b7 ${sev}. ${mechanism ?? 'This targets exactly that.'}`;
    case 'hydration':
      return `Low moisture on your ${region} in the last scan. ${mechanism ?? 'This restores hydration where you need it.'}`;
    case 'texture':
      return `Uneven texture on your ${region} in the last scan. ${mechanism ?? 'This smooths that surface.'}`;
    case 'tone':
      return `Dark marks still visible on your ${region}. ${mechanism ?? 'This works on uneven tone over time.'}`;
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

// v18.2 — altStyles reduced to a single horizontal scroll row for
// the LiveProductCard alt carousel. The legacy seed-driven list /
// row / image / brandRow styles are gone — the alt card carries its
// own complete visual treatment.
const altStyles = StyleSheet.create({
  scrollRow: {
    gap: 10,
    paddingRight: 4,
  },
});

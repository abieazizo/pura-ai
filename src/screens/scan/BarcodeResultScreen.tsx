/**
 * Barcode result screen — v10.32.
 *
 * The terminus of the barcode flow: takes the resolved
 * `BarcodeResolution` (or null) from `BarcodeAnalyzingScreen` and
 * renders one of three states:
 *
 *   1. **Found + catalog match** — the resolved product is in the
 *      Pura seed catalog. Render a premium product card with the
 *      catalog photo (or upgraded placeholder), brand kicker, name
 *      in serif, scanned-barcode trust line, and three CTAs:
 *      Open detail, Add to routine, Find in shops.
 *
 *   2. **Found, no catalog match** — the barcode resolved to a real
 *      product (CeraVe SA Smoothing Cleanser, etc) that isn't in our
 *      24-product seed yet. Render the same card chrome but tone
 *      down the CTAs: only Find in shops + Find similar in our picks.
 *      Adding non-catalog products to the routine isn't supported
 *      (the routine store keys on catalog product ids).
 *
 *   3. **Not found** — clean empty state with the unresolved barcode
 *      and Try-again / Search-by-name CTAs.
 *
 * The screen is a full-paper SafeAreaView (NOT the dark ink the
 * analyzing screen used). The barcode flow ends back on the paper
 * canvas the rest of the app lives on; the dark loading screen was
 * the transition, not the destination.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowRight,
  Barcode,
  CheckCircle,
  MagnifyingGlass,
  Storefront,
  X,
} from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import { seedProducts } from '@/data/seed';
import { ProductPlaceholderImage } from '@/components/products/ProductPlaceholderImage';
import {
  AddToRoutineSheet,
  routineTargetLabel,
  type AddToRoutineTarget,
} from '@/components/products/AddToRoutineSheet';
import { Toast } from '@/components/contextual/Toast';
import type { BarcodeResolution, ProductCategory as AiCategory } from '@/ai/ai-contracts';
import type { Product, ProductCategory, ProductTint } from '@/types';

export interface BarcodeResultScreenProps {
  barcodeValue: string;
  resolution: BarcodeResolution | null;
  /** Close the entire scan modal (used by the cancel/X chrome). */
  onCloseModal: () => void;
  /** Replace this screen with the camera so the user can scan again. */
  onScanAgain: () => void;
}

export function BarcodeResultScreen({
  barcodeValue,
  resolution,
  onCloseModal,
  onScanAgain,
}: BarcodeResultScreenProps) {
  const nav = useNavigation<any>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Try to map the resolved identity onto a seed catalog product.
  // OBF returns canonical_title as "Brand Product Name"; fuzzy match
  // against seedProducts. When a match exists, we get the full rich
  // detail page experience (Add to routine, alternatives, ingredient
  // breakdown). When it doesn't, we still render a credible card
  // but suppress the catalog-only CTAs.
  const catalogMatch = useMemo<Product | null>(
    () => matchToCatalog(resolution),
    [resolution]
  );

  const found =
    !!resolution && resolution.found && !!resolution.identity;

  const handleOpenDetail = useCallback(() => {
    if (!catalogMatch) return;
    hapt.select();
    onCloseModal();
    // Defer to next tick so the modal close transition starts before
    // the parent navigator pushes ProductDetail underneath.
    setTimeout(() => {
      nav.getParent()?.navigate('ProductDetailModal', {
        productId: catalogMatch.id,
      });
    }, 80);
  }, [catalogMatch, nav, onCloseModal]);

  const handleAddToRoutine = useCallback(() => {
    if (!catalogMatch) return;
    hapt.select();
    setSheetOpen(true);
  }, [catalogMatch]);

  const handleFindInShops = useCallback(async () => {
    hapt.select();
    const target = catalogMatch?.buyUrl
      ? catalogMatch.buyUrl
      : `https://duckduckgo.com/?q=${encodeURIComponent(buildShopQuery(resolution, barcodeValue))}`;
    try {
      const supported = await Linking.canOpenURL(target);
      if (!supported) {
        setToast('Couldn’t open the shop link on this device.');
        return;
      }
      await Linking.openURL(target);
    } catch {
      setToast('Couldn’t open the shop link.');
    }
  }, [catalogMatch, resolution, barcodeValue]);

  const handleSearchByName = useCallback(() => {
    hapt.select();
    onCloseModal();
    setTimeout(() => {
      // Best-effort jump to Products. The current root nav exposes
      // ProductsTab; the inner navigator handles its own initial route.
      nav.getParent()?.navigate('Tabs', { screen: 'ProductsTab' });
    }, 80);
  }, [nav, onCloseModal]);

  const handleAdded = useCallback(
    (target: AddToRoutineTarget) => {
      setToast(`Added to ${routineTargetLabel(target)}.`);
      setSheetOpen(false);
    },
    []
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => {
            hapt.select();
            onCloseModal();
          }}
          accessibilityRole="button"
          accessibilityLabel="Close scanner"
          hitSlop={10}
          style={({ pressed }) => [
            styles.closeChip,
            pressed && { opacity: 0.85 },
          ]}
        >
          <X size={18} color={palette.ink} weight="bold" />
        </Pressable>
        <Text style={styles.headerKicker} maxFontSizeMultiplier={1.1}>
          BARCODE LOOKUP
        </Text>
        <View style={styles.closeChipPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {found && resolution!.identity ? (
          <FoundCard
            barcodeValue={barcodeValue}
            resolution={resolution!}
            catalogMatch={catalogMatch}
          />
        ) : (
          <NotFoundCard barcodeValue={barcodeValue} />
        )}
      </ScrollView>

      <View style={styles.ctaDock}>
        {found ? (
          <>
            {catalogMatch ? (
              <PrimaryDockButton
                label="Open product details"
                Icon={ArrowRight}
                onPress={handleOpenDetail}
              />
            ) : null}
            {catalogMatch ? (
              <SecondaryDockButton
                label="Add to your routine"
                Icon={CheckCircle}
                onPress={handleAddToRoutine}
              />
            ) : (
              <SecondaryDockButton
                label="Find similar in our picks"
                Icon={MagnifyingGlass}
                onPress={handleSearchByName}
              />
            )}
            <GhostDockButton
              label="Find in shops"
              Icon={Storefront}
              onPress={handleFindInShops}
            />
            <GhostDockButton
              label="Scan another"
              Icon={Barcode}
              onPress={() => {
                hapt.select();
                onScanAgain();
              }}
            />
          </>
        ) : (
          <>
            <PrimaryDockButton
              label="Try scanning again"
              Icon={Barcode}
              onPress={() => {
                hapt.select();
                onScanAgain();
              }}
            />
            <SecondaryDockButton
              label="Search by name instead"
              Icon={MagnifyingGlass}
              onPress={handleSearchByName}
            />
          </>
        )}
      </View>

      {catalogMatch ? (
        <AddToRoutineSheet
          visible={sheetOpen}
          productId={catalogMatch.id}
          productName={catalogMatch.name}
          onDismiss={() => setSheetOpen(false)}
          onAdded={handleAdded}
        />
      ) : null}

      {toast ? (
        <Toast message={toast} onFinished={() => setToast(null)} />
      ) : null}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// FoundCard — premium product preview for the resolved identity.
// ---------------------------------------------------------------------------

function FoundCard({
  barcodeValue,
  resolution,
  catalogMatch,
}: {
  barcodeValue: string;
  resolution: BarcodeResolution;
  catalogMatch: Product | null;
}) {
  const identity = resolution.identity!;
  const brand = identity.brand ?? 'Unknown brand';
  const name = identity.product_name ?? 'Unnamed product';
  const tint: ProductTint = catalogMatch?.tint ?? 'sand';

  // Synthesize a Product-shaped object good enough for the placeholder
  // when we don't have a catalog match. The placeholder reads
  // brand+category+name to render the silhouette.
  const previewProduct = useMemo<Pick<
    Product,
    'brand' | 'category' | 'name'
  >>(
    () =>
      catalogMatch
        ? catalogMatch
        : {
            brand,
            category: aiCategoryToSeed(identity.product_category),
            name,
          },
    [catalogMatch, brand, name, identity.product_category]
  );

  return (
    <View style={cardStyles.wrap}>
      <Text style={cardStyles.kickerLine} maxFontSizeMultiplier={1.1}>
        IDENTIFIED
      </Text>

      <View style={[cardStyles.imageTile, { backgroundColor: tintFor(tint) }]}>
        {catalogMatch?.imageUrl ? (
          <Image
            source={{ uri: catalogMatch.imageUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={140}
          />
        ) : (
          <ProductPlaceholderImage
            product={previewProduct}
            silhouetteSize={120}
            showBrandWord
            showProductName
          />
        )}
      </View>

      <Text style={cardStyles.brand} maxFontSizeMultiplier={1.1}>
        {brand.toUpperCase()}
      </Text>
      <Text
        style={cardStyles.name}
        numberOfLines={3}
        maxFontSizeMultiplier={1.15}
      >
        {name}
      </Text>

      <View style={cardStyles.metaRow}>
        <CategoryChip category={identity.product_category} />
        {catalogMatch ? (
          <View style={cardStyles.inCatalogPill}>
            <Text style={cardStyles.inCatalogText}>IN OUR PICKS</Text>
          </View>
        ) : (
          <View style={cardStyles.notInCatalogPill}>
            <Text style={cardStyles.notInCatalogText}>NOT IN OUR PICKS YET</Text>
          </View>
        )}
      </View>

      {identity.key_claims && identity.key_claims.length > 0 ? (
        <View style={cardStyles.claimsBlock}>
          <Text style={cardStyles.claimsKicker} maxFontSizeMultiplier={1.1}>
            FROM THE PACKAGING
          </Text>
          <View style={cardStyles.claimsRow}>
            {identity.key_claims.slice(0, 4).map((claim, i) => (
              <View key={i} style={cardStyles.claimChip}>
                <Text style={cardStyles.claimText} numberOfLines={1}>
                  {claim}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={cardStyles.trustRow}>
        <Barcode size={14} color={palette.inkTertiary} weight="duotone" />
        <Text style={cardStyles.trustText} maxFontSizeMultiplier={1.1}>
          {`Scanned ${barcodeValue} · sourced from the open product database`}
        </Text>
      </View>
    </View>
  );
}

function CategoryChip({ category }: { category: AiCategory }) {
  const label = LABEL_FOR_CATEGORY[category];
  return (
    <View style={cardStyles.categoryChip}>
      <Text style={cardStyles.categoryChipText} maxFontSizeMultiplier={1.1}>
        {label}
      </Text>
    </View>
  );
}

const LABEL_FOR_CATEGORY: Record<AiCategory, string> = {
  cleanser: 'Cleanser',
  serum: 'Serum',
  moisturizer: 'Moisturizer',
  spot_treatment: 'Spot treatment',
  toner: 'Toner',
  spf: 'SPF',
  mask: 'Mask',
  unknown: 'Skincare',
};

// ---------------------------------------------------------------------------
// NotFoundCard
// ---------------------------------------------------------------------------

function NotFoundCard({ barcodeValue }: { barcodeValue: string }) {
  return (
    <View style={notFoundStyles.wrap}>
      <View style={notFoundStyles.iconCircle}>
        <Barcode size={36} color={palette.inkTertiary} weight="duotone" />
      </View>
      <Text style={notFoundStyles.headline} maxFontSizeMultiplier={1.15}>
        We didn’t find this barcode.
      </Text>
      <Text style={notFoundStyles.body} maxFontSizeMultiplier={1.2}>
        We checked the global open product database for{' '}
        <Text style={notFoundStyles.code}>{barcodeValue}</Text> and didn’t
        get a match.
      </Text>
      <Text style={notFoundStyles.body} maxFontSizeMultiplier={1.2}>
        Try scanning again with the barcode flat, well-lit, and centred —
        or search the brand name from the Products tab.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// CTA dock buttons
// ---------------------------------------------------------------------------

interface DockButtonProps {
  label: string;
  Icon: React.ComponentType<{ size: number; color: string; weight?: any }>;
  onPress: () => void;
}

function PrimaryDockButton({ label, Icon, onPress }: DockButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        ctaStyles.primary,
        pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
      ]}
    >
      <Text style={ctaStyles.primaryLabel} maxFontSizeMultiplier={1.15}>
        {label}
      </Text>
      <Icon size={16} color={palette.inkInverse} weight="duotone" />
    </Pressable>
  );
}

function SecondaryDockButton({ label, Icon, onPress }: DockButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        ctaStyles.secondary,
        pressed && { opacity: 0.94 },
      ]}
    >
      <Text style={ctaStyles.secondaryLabel} maxFontSizeMultiplier={1.15}>
        {label}
      </Text>
      <Icon size={15} color={palette.ink} weight="duotone" />
    </Pressable>
  );
}

function GhostDockButton({ label, Icon, onPress }: DockButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        ctaStyles.ghost,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Icon size={14} color={palette.inkSecondary} weight="duotone" />
      <Text style={ctaStyles.ghostLabel} maxFontSizeMultiplier={1.15}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tintFor(tint: ProductTint): string {
  switch (tint) {
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

function aiCategoryToSeed(c: AiCategory): ProductCategory {
  // Map AI contract categories onto seed categories. Spot-treatment
  // collapses into the seed's `treatment` bucket. Unknown defaults
  // to serum (the most visually neutral silhouette).
  switch (c) {
    case 'cleanser':
      return 'cleanser';
    case 'serum':
      return 'serum';
    case 'moisturizer':
      return 'moisturizer';
    case 'spot_treatment':
      return 'treatment';
    case 'toner':
      return 'toner';
    case 'spf':
      return 'spf';
    case 'mask':
      return 'mask';
    case 'unknown':
    default:
      return 'serum';
  }
}

function buildShopQuery(
  resolution: BarcodeResolution | null,
  fallbackBarcode: string
): string {
  const id = resolution?.identity;
  if (id?.brand && id?.product_name) {
    return `${id.brand} ${id.product_name}`;
  }
  if (id?.canonical_title) return id.canonical_title;
  return `barcode ${fallbackBarcode}`;
}

/**
 * Try to map a BarcodeResolution onto a seed catalog product.
 *
 * Match strategies, in order:
 *   1. Catalog id key — if the resolution carries a non-null
 *      `matched_catalog_product_id` AND it exists in seedProducts.
 *      (The OBF lookup returns the OBF code as the id, which won't
 *      match seed slugs — but a future hand-curated catalog map
 *      might. Cheap to check.)
 *   2. Canonical title contains both brand AND name tokens of a seed
 *      product (case-insensitive).
 *   3. Brand exact-match + significant name-token overlap.
 *
 * Returns null when no confident match is found — the caller renders
 * the resolved info as a non-catalog product card.
 */
function matchToCatalog(resolution: BarcodeResolution | null): Product | null {
  if (!resolution || !resolution.found || !resolution.identity) return null;
  const identity = resolution.identity;

  if (resolution.matched_catalog_product_id) {
    const direct = seedProducts.find(
      (p) => p.id === resolution.matched_catalog_product_id
    );
    if (direct) return direct;
  }

  const idBrand = (identity.brand ?? '').toLowerCase();
  const idName = (identity.product_name ?? '').toLowerCase();
  const idTitle = (identity.canonical_title ?? '').toLowerCase();
  const idTokens = idName
    .split(/\s+/)
    .filter((t) => t.length >= 4);

  let best: { product: Product; score: number } | null = null;
  for (const p of seedProducts) {
    const pBrand = p.brand.toLowerCase().replace(/[^a-z]/g, '');
    const pName = p.name.toLowerCase();
    const cleanIdBrand = idBrand.replace(/[^a-z]/g, '');
    let score = 0;
    if (
      cleanIdBrand.length > 0 &&
      (pBrand.includes(cleanIdBrand) || cleanIdBrand.includes(pBrand))
    ) {
      score += 50;
    }
    for (const t of idTokens) {
      if (pName.includes(t)) score += 12;
    }
    if (idTitle && idTitle.includes(pName.split(' ')[0])) score += 8;
    if (score > 0 && (!best || score > best.score)) {
      best = { product: p, score };
    }
  }
  if (best && best.score >= 50) return best.product;
  return null;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
  },
  closeChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeChipPlaceholder: {
    width: 36,
    height: 36,
  },
  headerKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.8,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 220,
  },
  ctaDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    backgroundColor: palette.bg,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
    gap: 8,
  },
});

const cardStyles = StyleSheet.create({
  wrap: {
    paddingTop: 4,
  },
  kickerLine: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.mossDeep,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  imageTile: {
    width: '100%',
    aspectRatio: 1.05,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    marginBottom: 6,
  },
  name: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingHorizontal: 12,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.4,
    color: palette.inkSecondary,
  },
  inCatalogPill: {
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
    backgroundColor: palette.mossLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inCatalogText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1,
    color: palette.mossDeep,
  },
  notInCatalogPill: {
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notInCatalogText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1,
    color: palette.inkTertiary,
  },
  claimsBlock: {
    marginBottom: 16,
  },
  claimsKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  claimsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  claimChip: {
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  claimText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    letterSpacing: 0.2,
    color: palette.inkSecondary,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
  },
  trustText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: palette.inkTertiary,
    flex: 1,
  },
});

const notFoundStyles = StyleSheet.create({
  wrap: {
    paddingTop: 32,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 14,
  },
  body: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 16,
    lineHeight: 23,
    color: palette.inkSecondary,
    marginBottom: 12,
  },
  code: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: 0.6,
    color: palette.ink,
  },
});

const ctaStyles = StyleSheet.create({
  primary: {
    height: 50,
    borderRadius: 25,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  primaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: 0.1,
    color: palette.inkInverse,
  },
  secondary: {
    height: 46,
    borderRadius: 23,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  secondaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.1,
    color: palette.ink,
  },
  ghost: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ghostLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkSecondary,
  },
});

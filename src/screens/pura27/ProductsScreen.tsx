/**
 * pura27 — Products screen.
 *
 * The shelf-grounded nightly recommendation surface. Three tabs:
 *   • Tonight   — featured product + safety panel + sequence preview
 *   • My Shelf  — owned products with recognition status
 *   • Discover  — secondary, never a sales feed
 *
 * Every visible button drives real state through `usePuraSession`:
 *   - "Add to tonight’s routine" writes `userRoutineEvening` (so the
 *     Routine screen's Step 2 picks it up) and navigates to the Routine
 *     tab. The button briefly enters a confirmed state.
 *
 * Trust contract: the screen never claims a shelf photo unless the
 * data carries one, never recommends a product that isn't `owned`,
 * and never collapses to a faded near-blank surface.
 */

import React, { useCallback, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

import { pura27, pura27Radius } from '@/theme';
import { hapt } from '@/utils/haptics';
import { usePuraSession } from '@/state/pura27/puraSession';
import type {
  RoutineStep,
  ShelfProduct,
} from '@/state/pura27/types';
import type { RootStackParamList } from '@/navigation/types';
import {
  Body,
  BodyLarge,
  Card,
  DisplayCard,
  DisplayHero,
  FunctionalTitle,
  HeaderRow,
  InfoState,
  PrimaryButton,
  PuraScreen,
  SectionLabel,
  SecondaryButton,
  SegmentedTabs,
  StatusPill,
} from './components';

type Nav = NavigationProp<RootStackParamList>;

type ProductsTab = 'tonight' | 'shelf' | 'discover';

const TABS: readonly { key: ProductsTab; label: string }[] = [
  { key: 'tonight', label: 'Tonight' },
  { key: 'shelf', label: 'My Shelf' },
  { key: 'discover', label: 'Discover' },
];

// ===========================================================================
// ProductsScreen
// ===========================================================================

export function ProductsP27Screen() {
  const nav = useNavigation<Nav>();
  const { session, todayLabel, actions } = usePuraSession();
  const [tab, setTab] = useState<ProductsTab>('tonight');
  const [confirmed, setConfirmed] = useState(false);

  const featured = session.shelfProducts.find(
    (p) => p.id === session.featuredProductId,
  );

  const treatStep: RoutineStep | undefined = session.currentRoutine.steps.find(
    (s) => s.kind === 'treat',
  );

  const handleAddToRoutine = useCallback(() => {
    if (!featured) return;
    hapt.tap();
    actions.selectFeaturedProduct(featured.id);
    setConfirmed(true);
    setTimeout(() => {
      setConfirmed(false);
      // Send the user to the Routine tab. From a child stack, nav.getParent
      // surfaces the parent tab navigator.
      const parent = (nav as any).getParent?.();
      if (parent?.navigate) {
        parent.navigate('RoutineTab');
      } else {
        (nav as any).navigate?.('RoutineTab');
      }
    }, 650);
  }, [actions, featured, nav]);

  const handleStartScan = useCallback(() => {
    hapt.select();
    nav.navigate('ScanModal');
  }, [nav]);

  return (
    <PuraScreen>
      <HeaderRow
        title="Products"
        meta={`UPDATED FROM TONIGHT’S SCAN · ${todayLabel.toUpperCase()}`}
      />

      <SegmentedTabs<ProductsTab>
        tabs={TABS}
        value={tab}
        onChange={setTab}
      />

      {tab === 'tonight' ? (
        <TonightTab
          featured={featured}
          treatStep={treatStep}
          confirmed={confirmed}
          onAddToRoutine={handleAddToRoutine}
        />
      ) : null}

      {tab === 'shelf' ? (
        <ShelfTab
          products={session.shelfProducts}
          onStartScan={handleStartScan}
        />
      ) : null}

      {tab === 'discover' ? (
        <DiscoverTab onReviewShelf={() => setTab('shelf')} />
      ) : null}
    </PuraScreen>
  );
}

// ===========================================================================
// Tonight tab — the recommendation experience.
// ===========================================================================

interface TonightTabProps {
  featured: ShelfProduct | undefined;
  treatStep: RoutineStep | undefined;
  confirmed: boolean;
  onAddToRoutine: () => void;
}

function TonightTab({
  featured,
  treatStep,
  confirmed,
  onAddToRoutine,
}: TonightTabProps) {
  if (!featured) {
    return (
      <InfoState
        headline="Add your products first."
        body="Scan labels or search products so Pura can build a routine from what you already own."
        style={tonightStyles.empty}
      />
    );
  }

  return (
    <Animated.View entering={Platform.OS === 'web' ? undefined : FadeIn.duration(220)}>
      <View style={tonightStyles.hero}>
        <DisplayHero>
          One product fits{'\n'}tonight best.
        </DisplayHero>
        <BodyLarge style={tonightStyles.heroBody}>
          Use a targeted treatment on your chin only. Keep stronger
          actives paused.
        </BodyLarge>
      </View>

      <RoutineSequencePreview activeKind="treat" />

      <SectionLabel tone="accent" style={tonightStyles.shelfLabel}>
        FROM YOUR SHELF
      </SectionLabel>

      <FeaturedProductCard
        product={featured}
        treatStep={treatStep}
        confirmed={confirmed}
        onAddToRoutine={onAddToRoutine}
      />
    </Animated.View>
  );
}

const tonightStyles = StyleSheet.create({
  hero: {
    paddingTop: 28,
    paddingBottom: 18,
  },
  heroBody: {
    marginTop: 16,
  },
  shelfLabel: {
    marginTop: 24,
    marginBottom: 12,
  },
  empty: {
    marginTop: 28,
  },
});

// ---------------------------------------------------------------------------
// Routine sequence preview
// ---------------------------------------------------------------------------

function RoutineSequencePreview({
  activeKind,
}: {
  activeKind: 'cleanse' | 'treat' | 'moisturize';
}) {
  const items: { key: 'cleanse' | 'treat' | 'moisturize'; label: string }[] = [
    { key: 'cleanse', label: 'Cleanse' },
    { key: 'treat', label: 'Treat chin' },
    { key: 'moisturize', label: 'Moisturize' },
  ];

  return (
    <Card variant="warm" style={sequenceStyles.card}>
      <SectionLabel>TONIGHT’S ROUTINE</SectionLabel>
      <View style={sequenceStyles.row}>
        {items.map((item, idx) => {
          const active = item.key === activeKind;
          return (
            <React.Fragment key={item.key}>
              <View
                style={[
                  sequenceStyles.pill,
                  active
                    ? sequenceStyles.pillActive
                    : sequenceStyles.pillInactive,
                ]}
              >
                <Text
                  maxFontSizeMultiplier={1.2}
                  style={[
                    sequenceStyles.pillLabel,
                    {
                      color: active ? pura27.accentText : pura27.inkSecondary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </View>
              {idx < items.length - 1 ? (
                <View style={sequenceStyles.connector} />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
    </Card>
  );
}

const sequenceStyles = StyleSheet.create({
  card: {
    marginTop: 24,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: pura27Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 1,
  },
  pillActive: {
    backgroundColor: pura27.accentSoft,
    borderColor: pura27.activeBorder,
  },
  pillInactive: {
    backgroundColor: pura27.surface,
    borderColor: pura27.border,
  },
  pillLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    letterSpacing: 0.1,
  },
  connector: {
    flex: 1,
    minWidth: 8,
    height: StyleSheet.hairlineWidth,
    backgroundColor: pura27.borderStrong,
    marginHorizontal: 6,
  },
});

// ---------------------------------------------------------------------------
// Featured product card — the heart of the screen.
// ---------------------------------------------------------------------------

interface FeaturedProductCardProps {
  product: ShelfProduct;
  treatStep: RoutineStep | undefined;
  confirmed: boolean;
  onAddToRoutine: () => void;
}

function FeaturedProductCard({
  product,
  treatStep,
  confirmed,
  onAddToRoutine,
}: FeaturedProductCardProps) {
  const recognized = product.recognitionStatus === 'confirmed';
  const recognitionLine = recognized
    ? 'Product recognized from your shelf'
    : 'Confirm this product before using it tonight';

  return (
    <Card style={featuredStyles.card}>
      <View style={featuredStyles.pillRow}>
        <StatusPill label="On your shelf" variant="success" />
        <StatusPill label="Best fit tonight" variant="accent" />
      </View>

      <View style={featuredStyles.imageFrame}>
        {product.imageUri ? (
          <Image
            source={{ uri: product.imageUri }}
            style={featuredStyles.image}
            resizeMode="contain"
            accessibilityLabel={`${product.brand} ${product.name}`}
          />
        ) : (
          <ProductPlaceholder
            initials={initialsFromBrand(product.brand)}
          />
        )}
      </View>

      <SectionLabel style={featuredStyles.brand}>
        {product.brand.toUpperCase()}
      </SectionLabel>
      <DisplayCard>{product.name}</DisplayCard>

      <BodyLarge style={featuredStyles.recommendation}>
        Use on your chin only tonight.
      </BodyLarge>
      <Body style={featuredStyles.reason}>
        This targets the active-looking area from your scan while keeping
        irritation risk controlled.
      </Body>

      <SafetyPanel />

      <View style={featuredStyles.recognitionRow}>
        <View
          style={[
            featuredStyles.recognitionDot,
            {
              backgroundColor: recognized
                ? pura27.success
                : pura27.warning,
            },
          ]}
        />
        <Text
          maxFontSizeMultiplier={1.2}
          style={featuredStyles.recognitionLabel}
        >
          {recognitionLine}
        </Text>
      </View>

      <PrimaryButton
        label="Add to tonight’s routine"
        confirmedLabel="Added to tonight’s routine"
        confirmed={confirmed}
        onPress={onAddToRoutine}
        accessibilityLabel="Add this product to tonight’s routine and open the Routine screen"
        style={featuredStyles.cta}
      />

      <Text
        maxFontSizeMultiplier={1.2}
        style={featuredStyles.metaUnderCta}
      >
        Updates step 2 of tonight’s routine
        {treatStep?.productName ? ` · currently ${treatStep.productName}` : ''}
      </Text>
    </Card>
  );
}

const featuredStyles = StyleSheet.create({
  card: {
    marginTop: 4,
    padding: 20,
    gap: 0,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  imageFrame: {
    width: '100%',
    height: 224,
    borderRadius: pura27Radius.xl,
    backgroundColor: pura27.imageSurface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '88%',
    height: '88%',
  },
  brand: {
    marginTop: 20,
    marginBottom: 6,
  },
  recommendation: {
    marginTop: 16,
    color: pura27.ink,
    fontFamily: 'Inter-SemiBold',
  },
  reason: {
    marginTop: 8,
  },
  recognitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: pura27.border,
  },
  recognitionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recognitionLabel: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 12.5,
    color: pura27.inkSecondary,
    letterSpacing: 0.1,
  },
  cta: {
    marginTop: 18,
  },
  metaUnderCta: {
    marginTop: 10,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: pura27.inkTertiary,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
});

// ---------------------------------------------------------------------------
// Safety panel — two equal columns, text + color (never color alone).
// ---------------------------------------------------------------------------

function SafetyPanel() {
  return (
    <View
      accessibilityRole="summary"
      style={safetyStyles.wrap}
    >
      <View
        style={[safetyStyles.column, safetyStyles.use]}
        accessibilityLabel="Use tonight: BHA on chin only"
      >
        <SectionLabel tone="success">USE TONIGHT</SectionLabel>
        <FunctionalTitle style={safetyStyles.useLabel}>
          BHA · Chin only
        </FunctionalTitle>
      </View>
      <View
        style={[safetyStyles.column, safetyStyles.skip]}
        accessibilityLabel="Skip tonight: Retinoid serum"
      >
        <SectionLabel style={{ color: pura27.warning }}>SKIP TONIGHT</SectionLabel>
        <FunctionalTitle style={safetyStyles.skipLabel}>
          Retinoid serum
        </FunctionalTitle>
      </View>
    </View>
  );
}

const safetyStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  column: {
    flex: 1,
    minWidth: 0,
    padding: 16,
    borderRadius: pura27Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  use: {
    backgroundColor: pura27.successBackground,
    borderColor: pura27.successBackground,
  },
  skip: {
    backgroundColor: pura27.warningBackground,
    borderColor: pura27.warningBackground,
  },
  useLabel: {
    marginTop: 8,
    color: pura27.success,
  },
  skipLabel: {
    marginTop: 8,
    color: pura27.warning,
  },
});

// ---------------------------------------------------------------------------
// Product placeholder — refined neutral, never broken-image.
// ---------------------------------------------------------------------------

function initialsFromBrand(brand: string): string {
  return brand
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function ProductPlaceholder({ initials }: { initials: string }) {
  return (
    <View style={placeholderStyles.wrap}>
      <Text
        maxFontSizeMultiplier={1.2}
        style={placeholderStyles.initials}
      >
        {initials}
      </Text>
      <Text
        maxFontSizeMultiplier={1.2}
        style={placeholderStyles.note}
      >
        Add a shelf photo
      </Text>
    </View>
  );
}

const placeholderStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  initials: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 48,
    color: pura27.accentText,
    letterSpacing: -1,
  },
  note: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
    color: pura27.inkTertiary,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
});

// ===========================================================================
// Shelf tab
// ===========================================================================

function ShelfTab({
  products,
  onStartScan,
}: {
  products: readonly ShelfProduct[];
  onStartScan: () => void;
}) {
  if (products.length === 0) {
    return (
      <InfoState
        headline="Add your products first."
        body="Scan labels or search products so Pura can build a routine from what you already own."
        primaryLabel="Start tonight’s scan"
        onPrimary={onStartScan}
        style={shelfStyles.empty}
      />
    );
  }
  return (
    <View style={shelfStyles.wrap}>
      <View style={shelfStyles.intro}>
        <DisplayCard>Your shelf</DisplayCard>
        <Body style={shelfStyles.introBody}>
          Products Pura can use when building your routine.
        </Body>
      </View>

      {products.map((product) => (
        <ShelfRow key={product.id} product={product} />
      ))}
    </View>
  );
}

function ShelfRow({ product }: { product: ShelfProduct }) {
  const isConfirmed = product.recognitionStatus === 'confirmed';
  return (
    <Card style={shelfStyles.card}>
      <View style={shelfStyles.cardRow}>
        <View style={shelfStyles.thumb}>
          <Text
            maxFontSizeMultiplier={1.2}
            style={shelfStyles.thumbInitials}
          >
            {initialsFromBrand(product.brand)}
          </Text>
        </View>
        <View style={shelfStyles.cardText}>
          <SectionLabel>{product.brand.toUpperCase()}</SectionLabel>
          <Text
            maxFontSizeMultiplier={1.2}
            numberOfLines={2}
            style={shelfStyles.productName}
          >
            {product.name}
          </Text>
          <Text
            maxFontSizeMultiplier={1.2}
            style={shelfStyles.category}
          >
            {capitalize(product.category)}
          </Text>
        </View>
      </View>
      <View style={shelfStyles.statusRow}>
        <StatusPill
          label={isConfirmed ? 'Confirmed' : 'Needs confirmation'}
          variant={isConfirmed ? 'success' : 'warning'}
        />
      </View>
    </Card>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const shelfStyles = StyleSheet.create({
  wrap: {
    marginTop: 18,
    gap: 14,
  },
  intro: {
    marginBottom: 4,
  },
  introBody: {
    marginTop: 8,
  },
  card: {
    padding: 16,
    gap: 14,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: pura27Radius.lg,
    backgroundColor: pura27.imageSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbInitials: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    color: pura27.accentText,
  },
  cardText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  productName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: pura27.ink,
    letterSpacing: -0.1,
  },
  category: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: pura27.inkSecondary,
  },
  statusRow: {
    flexDirection: 'row',
  },
  empty: {
    marginTop: 28,
  },
});

// ===========================================================================
// Discover tab — deliberately quiet.
// ===========================================================================

function DiscoverTab({ onReviewShelf }: { onReviewShelf: () => void }) {
  return (
    <View style={discoverStyles.wrap}>
      <Card variant="warm" style={discoverStyles.card}>
        <DisplayCard>Missing something gentle?</DisplayCard>
        <Body style={discoverStyles.body}>
          Explore alternatives only when your shelf does not contain a
          suitable match for tonight.
        </Body>
        <SecondaryButton
          label="Review my shelf first"
          onPress={onReviewShelf}
          style={discoverStyles.cta}
          accessibilityLabel="Switch to My Shelf"
        />
      </Card>
    </View>
  );
}

const discoverStyles = StyleSheet.create({
  wrap: {
    marginTop: 24,
  },
  card: {
    padding: 24,
  },
  body: {
    marginTop: 10,
  },
  cta: {
    marginTop: 22,
    alignSelf: 'flex-start',
  },
});

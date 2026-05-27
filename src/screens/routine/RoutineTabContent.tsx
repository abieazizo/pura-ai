/**
 * RoutineTabContent — the Routine sub-tab, rebuilt.
 *
 * Renders, in order:
 *
 *   1. DailyInsightHero            — "Today's focus" + chips + score + CTA
 *   2. ConflictWarningCard         — only on evening + when plan flags one
 *   3. RoutineSegmentControl       — Morning / Evening / Saved (existing)
 *   4. RoutineCompletionStrip      — X of Y complete + estimated time
 *   5. AIAdjustmentCard            — scan-driven adjustment + bullets
 *   6. RoutineStepCard ×N          — every step renders with structure even
 *                                    when the user has no products added
 *   7. SavedView                   — when segment === 'saved'
 *   8. ProductBridgeCard           — one curated Routine → Products bridge
 *
 * The plan is deterministic and scan-aware: `buildRoutinePlan(insight)` is
 * the single source of truth for Morning vs Evening copy + adjustment.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ArrowRight, BookmarkSimple } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import { DailyInsightHero } from '@/components/routine/DailyInsightHero';
import { RoutineCompletionStrip } from '@/components/routine/RoutineCompletionStrip';
import { AIAdjustmentCard } from '@/components/routine/AIAdjustmentCard';
import { RoutineStepCard } from '@/components/routine/RoutineStepCard';
import { ConflictWarningCard } from '@/components/routine/ConflictWarningCard';
import { ProductBridgeCard } from '@/components/routine/ProductBridgeCard';
import { ProductGapsCard } from '@/components/routine/ProductGapsCard';
import { RoutineCompleteBanner } from '@/components/routine/RoutineCompleteBanner';
import { hydrate, type InnerSegment } from '@/screens/routine/lib';
import {
  buildProductGaps,
  buildRoutinePlan,
  type RoutineStepPlan,
} from '@/state/routinePlan';
import type { ProgressRoutineInsight } from '@/state/progressRoutineInsight';
import type { Product, ProductCategory } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

export type { InnerSegment };

interface Props {
  insight: ProgressRoutineInsight;
  innerSegment: InnerSegment;
  onInnerSegment: (s: InnerSegment) => void;
  onScan: () => void;
  onBrowseProducts: () => void;
  /** Switch the top tab to Progress. */
  onViewScanRead: () => void;
}

export function RoutineTabContent({
  insight,
  innerSegment,
  onInnerSegment,
  onScan,
  onBrowseProducts,
  onViewScanRead,
}: Props) {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const userRoutineMorning = useAppStore((s) => s.userRoutineMorning);
  const userRoutineEvening = useAppStore((s) => s.userRoutineEvening);
  const wishlist = useAppStore((s) => s.wishlist);

  const morningProducts = useMemo(
    () => hydrate(userRoutineMorning),
    [userRoutineMorning]
  );
  const eveningProducts = useMemo(
    () => hydrate(userRoutineEvening),
    [userRoutineEvening]
  );
  const savedProducts = useMemo(() => hydrate(wishlist), [wishlist]);

  const plan = useMemo(() => buildRoutinePlan(insight), [insight]);

  // Local completion state — never persisted across cold starts. The
  // routine is a daily plan, not a permanent ledger.
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>(
    {}
  );

  const toggleStep = useCallback(
    (id: string) => {
      setCompletedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
    },
    []
  );

  // Cross-fade segment switches.
  const op = useSharedValue(1);
  useEffect(() => {
    op.value = 0;
    op.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [op, innerSegment]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: op.value }));

  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + 56 + 56;

  // Resolve attached product for a step. Pick the first product whose
  // category matches the step's category — never invent a substitute.
  const productForStep = useCallback(
    (step: RoutineStepPlan, source: Product[]): Product | undefined => {
      return source.find((p) => matchesCategory(p.category, step.category));
    },
    []
  );

  // Status chip text for the AI adjustment card.
  const statusChip = plan.isGentlePlan
    ? 'Gentle mode'
    : insight.confidenceCaveat
    ? null
    : insight.hasScanned
    ? 'Adjusted today'
    : null;

  const onSegmentTab = (s: InnerSegment) => {
    if (s === innerSegment) return;
    onInnerSegment(s);
  };

  const openProductDetail = (productId: string, tint: Product['tint']) => {
    hapt.select();
    // @ts-expect-error nested stack nav from primary tab
    nav.navigate?.('Tabs', {
      screen: 'HomeTab',
      params: {
        screen: 'ProductDetail',
        params: { productId, tint },
      },
    });
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      <DailyInsightHero
        insight={insight}
        plan={plan}
        onViewScanRead={onViewScanRead}
        onRetakeScan={onScan}
      />

      {/* Segment switcher above the routine body. */}
      <View style={styles.segmentWrap}>
        <SegmentRow
          active={innerSegment === 'saved' ? 'evening' : innerSegment}
          onChange={onSegmentTab}
          morningStepCount={plan.morning.length}
          eveningStepCount={plan.evening.length}
        />
      </View>

      {/* v23.3 — Saved sits separately, never alongside time-of-day. */}
      <SavedEntryRow
        count={savedProducts.length}
        active={innerSegment === 'saved'}
        onOpenSaved={() => onSegmentTab('saved')}
      />

      <Animated.View style={fadeStyle}>
        {innerSegment === 'morning' ? (
          <RoutineBody
            segment="morning"
            steps={plan.morning}
            completed={completedSteps}
            onToggle={toggleStep}
            attachedProducts={morningProducts}
            productForStep={productForStep}
            adjustment={plan.morningAdjustment}
            reasoning={plan.reasoning}
            statusChip={statusChip}
            focusLabel={plan.focusLabel}
            onAddProduct={onBrowseProducts}
            onFindMatch={onBrowseProducts}
            onOpenProduct={openProductDetail}
            estimateMin={plan.morningEstimateMin}
            productGaps={buildProductGaps({
              plan,
              hasCleanser: !!productForStep(plan.morning[0], morningProducts),
              hasHydration: !!productForStep(plan.morning[1], morningProducts),
              hasMoisturizer: !!productForStep(
                plan.morning[2],
                morningProducts
              ),
              hasSpf: !!productForStep(plan.morning[3], morningProducts),
            })}
            onScanProduct={onScan}
            onSearchProduct={onBrowseProducts}
            onLetPuraRecommend={onBrowseProducts}
            onScanAgain={onScan}
          />
        ) : null}

        {innerSegment === 'evening' ? (
          <RoutineBody
            segment="evening"
            steps={plan.evening}
            completed={completedSteps}
            onToggle={toggleStep}
            attachedProducts={eveningProducts}
            productForStep={productForStep}
            adjustment={plan.eveningAdjustment}
            reasoning={plan.reasoning}
            statusChip={statusChip}
            focusLabel={plan.focusLabel}
            onAddProduct={onBrowseProducts}
            onFindMatch={onBrowseProducts}
            onOpenProduct={openProductDetail}
            estimateMin={plan.eveningEstimateMin}
            conflictWarning={plan.eveningConflictWarning}
            productGaps={buildProductGaps({
              plan,
              hasCleanser: !!productForStep(plan.evening[0], eveningProducts),
              // Evening doesn't have hydration as a slot, so always
              // reflect the morning hydration ownership for consistency.
              hasHydration: !!productForStep(plan.morning[1], morningProducts),
              hasMoisturizer: !!productForStep(
                plan.evening[1],
                eveningProducts
              ),
              // SPF is morning-only — reuse the morning slot.
              hasSpf: !!productForStep(plan.morning[3], morningProducts),
            })}
            onScanProduct={onScan}
            onSearchProduct={onBrowseProducts}
            onLetPuraRecommend={onBrowseProducts}
            onScanAgain={onScan}
          />
        ) : null}

        {innerSegment === 'saved' ? (
          <SavedView
            products={savedProducts}
            onBrowse={onBrowseProducts}
            onOpenProduct={openProductDetail}
          />
        ) : null}

        {/* Product bridge always anchors the bottom of Routine. */}
        <ProductBridgeCard
          focusLabel={plan.focusLabel}
          onSeeMatches={onBrowseProducts}
          onBrowseAll={onBrowseProducts}
        />
      </Animated.View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

interface RoutineBodyProps {
  segment: 'morning' | 'evening';
  steps: RoutineStepPlan[];
  completed: Record<string, boolean>;
  onToggle: (id: string) => void;
  attachedProducts: Product[];
  productForStep: (step: RoutineStepPlan, source: Product[]) => Product | undefined;
  adjustment: { title: string; body: string; bullets: string[] };
  /** v23.3 — structured reasoning for the "Why Pura changed today's routine" card. */
  reasoning: import('@/state/routinePlan').RoutineReasoning;
  statusChip: string | null;
  /** Plan focus label, e.g. "Hydration support". Drives the complete-banner copy. */
  focusLabel: string;
  onAddProduct: () => void;
  onFindMatch: () => void;
  onOpenProduct: (id: string, tint: Product['tint']) => void;
  estimateMin: number;
  conflictWarning?: string | null;
  /** v23.3 — prioritized routine gaps for the shelf-setup card. */
  productGaps: import('@/state/routinePlan').RoutineGap[];
  onScanProduct: () => void;
  onSearchProduct: () => void;
  onLetPuraRecommend: () => void;
  /** Tap on the all-complete banner's Scan button. */
  onScanAgain: () => void;
}

function RoutineBody({
  segment,
  steps,
  completed,
  onToggle,
  attachedProducts,
  productForStep,
  adjustment,
  reasoning,
  statusChip,
  focusLabel,
  onAddProduct,
  onFindMatch,
  onOpenProduct,
  estimateMin,
  conflictWarning,
  productGaps,
  onScanProduct,
  onSearchProduct,
  onLetPuraRecommend,
  onScanAgain,
}: RoutineBodyProps) {
  const completedCount = steps.filter((s) => completed[s.id]).length;
  const allDone = completedCount === steps.length && steps.length > 0;

  return (
    <View>
      <RoutineCompletionStrip
        segment={segment}
        completedCount={completedCount}
        totalCount={steps.length}
        estimateMin={estimateMin}
      />

      {/* v23.3 — pass the structured reasoning so the card renders the
          "Why Pura changed today's routine" numbered breakdown
          instead of the legacy bullet list. */}
      <AIAdjustmentCard
        adjustment={adjustment}
        reasoning={reasoning}
        statusChip={statusChip}
      />

      {steps.map((step) => {
        const product = productForStep(step, attachedProducts);
        return (
          <RoutineStepCard
            key={step.id}
            step={step}
            completed={!!completed[step.id]}
            onToggle={() => onToggle(step.id)}
            product={product}
            onAddProduct={onAddProduct}
            onFindMatch={onFindMatch}
            onOpenProduct={
              product ? () => onOpenProduct(product.id, product.tint) : undefined
            }
          />
        );
      })}

      {/* Evening-only protective warning. Calm tone. */}
      {segment === 'evening' && conflictWarning ? (
        <ConflictWarningCard message={conflictWarning} />
      ) : null}

      {/* v23.3 — all-steps-done celebration banner. Calm, non-gamified. */}
      {allDone ? (
        <RoutineCompleteBanner
          segment={segment}
          focusLabel={focusLabel}
          onScanAgain={onScanAgain}
        />
      ) : null}

      {/* v23.3 — shelf-setup card. Renders only when the user has
          missing product slots; otherwise we trust their routine
          is already built. */}
      {productGaps.length > 0 ? (
        <ProductGapsCard
          gaps={productGaps}
          onScanProduct={onScanProduct}
          onSearchProduct={onSearchProduct}
          onLetPuraRecommend={onLetPuraRecommend}
        />
      ) : null}
    </View>
  );
}

function SavedView({
  products,
  onBrowse,
  onOpenProduct,
}: {
  products: Product[];
  onBrowse: () => void;
  onOpenProduct: (id: string, tint: Product['tint']) => void;
}) {
  if (products.length === 0) {
    return (
      <View style={savedStyles.empty}>
        <View style={savedStyles.emptyIcon}>
          <BookmarkSimple
            size={22}
            color={palette.clayDeep}
            weight="duotone"
          />
        </View>
        <Text style={savedStyles.emptyTitle} maxFontSizeMultiplier={1.15}>
          No saved products yet
        </Text>
        <Text style={savedStyles.emptyBody} maxFontSizeMultiplier={1.2}>
          Save products from recommendations or add the products you already
          use to build a smarter routine.
        </Text>

        <View style={savedStyles.ghostList}>
          {[
            { label: 'Hydrating serum', sub: 'Slot for your serum or essence' },
            { label: 'Barrier moisturizer', sub: 'Slot for your daily moisturizer' },
            { label: 'SPF', sub: 'Slot for your sun protection' },
          ].map((g) => (
            <View key={g.label} style={savedStyles.ghostRow}>
              <Text style={savedStyles.ghostLabel}>{g.label}</Text>
              <Text style={savedStyles.ghostSub} numberOfLines={1}>
                {g.sub}
              </Text>
            </View>
          ))}
        </View>

        <View style={savedStyles.ctaRow}>
          <Pressable
            onPress={() => {
              hapt.tap();
              onBrowse();
            }}
            accessibilityRole="button"
            accessibilityLabel="Browse matches"
            style={({ pressed }) => [
              savedStyles.primaryCta,
              pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
            ]}
          >
            <Text style={savedStyles.primaryCtaText} maxFontSizeMultiplier={1.15}>
              Browse matches
            </Text>
            <ArrowRight size={13} color={palette.inkInverse} weight="bold" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={savedStyles.listWrap}>
      <Text style={savedStyles.listKicker} maxFontSizeMultiplier={1.1}>
        SAVED PRODUCTS
      </Text>
      <Text style={savedStyles.listSubtitle} maxFontSizeMultiplier={1.2}>
        Add saved products into your morning or evening routine.
      </Text>
      <View style={{ gap: 10, marginTop: 12 }}>
        {products.map((p) => (
          <SavedProductRow
            key={p.id}
            product={p}
            onOpen={() => onOpenProduct(p.id, p.tint)}
          />
        ))}
      </View>
    </View>
  );
}

function SavedProductRow({
  product,
  onOpen,
}: {
  product: Product;
  onOpen: () => void;
}) {
  const addUserRoutineProduct = useAppStore((s) => s.addUserRoutineProduct);
  const addToSlot = (slot: 'morning' | 'evening') => {
    hapt.select();
    addUserRoutineProduct(slot, product.id);
  };
  return (
    <View style={savedStyles.row}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [
          savedStyles.rowBody,
          pressed && { opacity: 0.95 },
        ]}
      >
        <Text
          style={savedStyles.rowName}
          maxFontSizeMultiplier={1.15}
          numberOfLines={1}
        >
          {product.name}
        </Text>
        <Text
          style={savedStyles.rowBrand}
          maxFontSizeMultiplier={1.1}
          numberOfLines={1}
        >
          {`${product.brand} · ${product.category.toUpperCase()}`}
        </Text>
      </Pressable>
      <View style={savedStyles.rowActions}>
        <Pressable
          onPress={() => addToSlot('morning')}
          accessibilityRole="button"
          accessibilityLabel={`Add ${product.name} to morning routine`}
          style={({ pressed }) => [
            savedStyles.actionBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={savedStyles.actionBtnText}>+ Morning</Text>
        </Pressable>
        <Pressable
          onPress={() => addToSlot('evening')}
          accessibilityRole="button"
          accessibilityLabel={`Add ${product.name} to evening routine`}
          style={({ pressed }) => [
            savedStyles.actionBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={savedStyles.actionBtnText}>+ Evening</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SegmentRow({
  active,
  onChange,
  morningStepCount,
  eveningStepCount,
}: {
  active: InnerSegment;
  onChange: (s: InnerSegment) => void;
  morningStepCount: number;
  eveningStepCount: number;
  /** Kept for back-compat — the screen still passes this even though
   *  Saved is no longer a segment. The link is rendered separately. */
  savedCount?: number;
}) {
  // v23.3 — Morning / Evening only. Saved is its own quiet link below
  // the segment row; it never sat conceptually next to time-of-day.
  const SEGS: Array<{ id: 'morning' | 'evening'; label: string; sub: string }> =
    [
      {
        id: 'morning',
        label: 'Morning',
        sub: `${morningStepCount} steps`,
      },
      {
        id: 'evening',
        label: 'Evening',
        sub: `${eveningStepCount} steps`,
      },
    ];
  return (
    <View style={segStyles.row}>
      {SEGS.map((s) => {
        const selected = s.id === active;
        return (
          <Pressable
            key={s.id}
            onPress={() => onChange(s.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              segStyles.seg,
              selected && segStyles.segSelected,
              pressed && !selected && { opacity: 0.85 },
            ]}
          >
            <Text
              style={[
                segStyles.label,
                {
                  color: selected ? palette.inkInverse : palette.ink,
                },
              ]}
              maxFontSizeMultiplier={1.1}
            >
              {s.label}
            </Text>
            <Text
              style={[
                segStyles.sub,
                {
                  color: selected
                    ? 'rgba(248,250,252,0.78)'
                    : palette.inkTertiary,
                },
              ]}
              maxFontSizeMultiplier={1.1}
            >
              {s.sub}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * v23.3 — quieter saved-products entry. Lives BELOW the morning/evening
 * switch so the time-of-day switch stays cleanly focused. Tap →
 * `onOpenSaved` switches the screen-level `innerSegment` to 'saved'.
 */
function SavedEntryRow({
  count,
  active,
  onOpenSaved,
}: {
  count: number;
  active: boolean;
  onOpenSaved: () => void;
}) {
  return (
    <View style={savedEntryStyles.wrap}>
      <Pressable
        onPress={onOpenSaved}
        accessibilityRole="button"
        accessibilityLabel="View saved products"
        hitSlop={6}
        style={({ pressed }) => [
          savedEntryStyles.link,
          active && savedEntryStyles.linkActive,
          pressed && { opacity: 0.85 },
        ]}
      >
        <BookmarkSimple
          size={12}
          color={active ? palette.clayDeep : palette.inkSecondary}
          weight="duotone"
        />
        <Text
          style={[
            savedEntryStyles.label,
            { color: active ? palette.clayDeep : palette.inkSecondary },
          ]}
          maxFontSizeMultiplier={1.1}
        >
          {`Saved products${count > 0 ? ` · ${count}` : ''}`}
        </Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesCategory(
  productCategory: ProductCategory,
  stepCategory: ProductCategory
): boolean {
  if (productCategory === stepCategory) return true;
  // Hydrating layer (step `serum`) also accepts a `toner` if that's what
  // the user added.
  if (stepCategory === 'serum' && productCategory === 'toner') return true;
  // Spot treatment step also accepts a `mask` for completeness.
  if (stepCategory === 'treatment' && productCategory === 'mask') return true;
  return false;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scroll: { paddingBottom: 140 },
  segmentWrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
});

const savedEntryStyles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: palette.bg,
  },
  linkActive: {
    backgroundColor: palette.clayPaper,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11.5,
    letterSpacing: 0.1,
  },
});

const segStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: palette.bgDeep,
    borderRadius: 14,
    padding: 4,
    gap: 3,
  },
  seg: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segSelected: {
    backgroundColor: palette.ink,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.1,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    letterSpacing: 0.3,
    marginTop: 2,
  },
});

const savedStyles = StyleSheet.create({
  empty: {
    marginTop: 20,
    marginHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.clayPaper,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 6,
  },
  emptyBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 320,
  },
  ghostList: {
    alignSelf: 'stretch',
    gap: 8,
    marginBottom: 16,
  },
  ghostRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    borderStyle: 'dashed',
  },
  ghostLabel: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 14,
    color: palette.ink,
    marginBottom: 2,
  },
  ghostSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: palette.inkTertiary,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: palette.ink,
  },
  primaryCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
  listWrap: {
    marginTop: 20,
    marginHorizontal: 20,
  },
  listKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  listSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  rowBody: {
    flex: 1,
  },
  rowName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: -0.1,
    color: palette.ink,
    marginBottom: 2,
  },
  rowBrand: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: palette.inkTertiary,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: palette.bgDeep,
  },
  actionBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.1,
    color: palette.ink,
  },
});

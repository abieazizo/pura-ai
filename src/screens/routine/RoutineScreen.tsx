import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import {
  Sun,
  Moon,
  BookmarkSimple,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  CaretRight,
  X,
  Drop,
} from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { CompareSlider } from '@/components/CompareSlider';
import { SkinScoreHero, SkinScoreTrendCard } from '@/screens/progress/SkinScoreHero';
import { ProgressNarrative } from '@/screens/progress/ProgressNarrative';
import { PhotoTimelineStrip } from '@/screens/progress/PhotoTimelineStrip';
import { useAppStore, useDayNumber } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { computeSkinScore, formatDelta, tierLabel } from '@/utils/skinScore';
import { buildTonightFocus, getConcerns } from '@/utils/concerns';
import { seedProducts } from '@/data/seed';
import { palette, space } from '@/theme';
import { hapt } from '@/utils/haptics';
import type { RootStackParamList } from '@/navigation/types';
import type { Product, ProductCategory, Scan } from '@/types';

/**
 * Routine tab — v10.16 unified ongoing-use destination.
 *
 * v10.16 — the top-level tab label is now "ROUTINE" (previously
 * "PROGRESS"). The v10.13 mismatch where the tab said PROGRESS but the
 * default screen said "Routine." made the destination feel like two
 * pages wearing the same clothes. Routine leads because it's the daily
 * action center; Progress remains the secondary segment where proof
 * accumulates.
 *
 * Inside the screen a segmented control switches between two sub-tabs:
 *
 *   • Routine (default)  — action layer. Morning / Evening / Saved
 *                          nested segments with actual product cards.
 *                          Premium empty state for first-time users
 *                          ("What are you using right now?").
 *   • Progress           — proof layer. SkinScoreHero + "why" line +
 *                          ProgressNarrative + Day-1-vs-latest compare
 *                          + scan history.
 *
 * The two sub-tabs share a header / title / brand bar. Switching is
 * instant (no route change — internal state) with a smooth fade.
 *
 * This replaces both the old ProgressTab and the v10.11 "Routine with
 * embedded Progress" scroll. One destination, clear role per side.
 */

type TopSegment = 'routine' | 'progress';
type InnerSegment = 'morning' | 'evening' | 'saved';

export function RoutineScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();

  const [topSegment, setTopSegment] = useState<TopSegment>('routine');
  const [innerSegment, setInnerSegment] = useState<InnerSegment>('morning');

  const { scans, userRoutineMorning, userRoutineEvening, wishlist } = useAppStore(
    useShallow((s) => ({
      scans: s.scans,
      userRoutineMorning: s.userRoutineMorning,
      userRoutineEvening: s.userRoutineEvening,
      wishlist: s.wishlist,
    }))
  );
  const dayNumber = useDayNumber();

  const hasScanned = scans.length > 0;
  const firstScan = scans[0];
  const latestScan = scans[scans.length - 1];
  const progressAvailable = scans.length >= 2 && !!firstScan && !!latestScan;
  const compareHeight = 420;

  // v10.18 — pull the top "tonight focus" sentence from the latest
  // scan's concerns. Used as the Routine sub-tab's "TODAY" focus card
  // so the page opens with one clear daily-action voice instead of a
  // cold list of products.
  const todayFocus = useMemo<string | null>(() => {
    if (!latestScan) return null;
    const previous = scans.length >= 2 ? scans[scans.length - 2] : undefined;
    const focus = buildTonightFocus(getConcerns(latestScan, previous));
    return focus[0] ?? null;
  }, [latestScan, scans]);

  const morningProducts = useMemo(
    () => hydrate(userRoutineMorning),
    [userRoutineMorning]
  );
  const eveningProducts = useMemo(
    () => hydrate(userRoutineEvening),
    [userRoutineEvening]
  );
  const savedProducts = useMemo(() => hydrate(wishlist), [wishlist]);

  const anyProducts =
    morningProducts.length > 0 ||
    eveningProducts.length > 0 ||
    savedProducts.length > 0;

  const activeList =
    innerSegment === 'morning'
      ? morningProducts
      : innerSegment === 'evening'
      ? eveningProducts
      : savedProducts;

  const handleTop = (s: TopSegment) => {
    if (s === topSegment) return;
    hapt.select();
    setTopSegment(s);
  };
  const handleInner = (s: InnerSegment) => {
    if (s === innerSegment) return;
    hapt.select();
    setInnerSegment(s);
  };

  const openScan = () => {
    hapt.tap();
    nav.navigate('ScanModal');
  };

  const openProducts = () => {
    hapt.select();
    // @ts-expect-error nested stack nav
    nav.navigate?.('Tabs', { screen: 'ProductsTab' });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.headerRow}>
        <PuraMark size={26} variant="idle" />
        <Text style={styles.brandWord} maxFontSizeMultiplier={1.1}>
          Pura AI
        </Text>
        <View style={{ flex: 1 }} />
      </View>

      <View style={styles.titleBlock}>
        {/* v10.18 — replaced the generic kicker ("WHAT YOU'RE DOING" /
            "HOW IT'S TRACKING") with a daily-use anchor. When the user
            has scanned at least once we surface the day count; this
            gives the destination its identity as a place the user
            comes back to every day, not a tab they configure once. */}
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          {hasScanned ? `DAY ${dayNumber}` : 'BEGIN HERE'}
        </Text>
        <Text style={styles.title} maxFontSizeMultiplier={1.15}>
          {topSegment === 'routine' ? 'Routine.' : 'Progress.'}
        </Text>
      </View>

      {/* v10.20 — persistent score strip. Always visible in the
          destination header (when scanned), regardless of which
          segment is active. The Skin Score becomes a constant
          presence — the destination's anchor — instead of something
          the user has to navigate to. Premium habit/health apps put
          the user's current state at the top of the destination
          (Apple Health rings, Whoop strap); this strip serves that
          role for Pura. Tapping it switches to the Progress sub-tab
          where the full hero treatment lives. */}
      {hasScanned ? (
        <ScoreStrip
          score={computeSkinScore(scans)}
          onPress={() => handleTop('progress')}
          active={topSegment === 'progress'}
        />
      ) : null}

      {/* v10.20 — TopSegmented restyled as magazine-style underline
          tabs (see component below). The previous gray-pill
          UIKit-default segmented control made the destination feel
          like "two sub-pages in a weak container"; the new typographic
          treatment lets the page own its own section masthead. */}
      <View style={styles.topSegmentedWrap}>
        <TopSegmented active={topSegment} onChange={handleTop} />
      </View>

      {topSegment === 'routine' ? (
        <RoutineSubTab
          innerSegment={innerSegment}
          onInnerSegment={handleInner}
          activeList={activeList}
          anyProducts={anyProducts}
          morningCount={morningProducts.length}
          eveningCount={eveningProducts.length}
          savedCount={savedProducts.length}
          hasScanned={hasScanned}
          todayFocus={todayFocus}
          onScan={openScan}
          onBrowseProducts={openProducts}
        />
      ) : (
        <ProgressSubTab
          scans={scans}
          firstScan={firstScan}
          latestScan={latestScan}
          progressAvailable={progressAvailable}
          width={width}
          compareHeight={compareHeight}
          onScan={openScan}
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// Persistent score strip — v10.20
// ============================================================================
//
// Sits in the destination header above the segmented tabs whenever the
// user has scanned at least once. Always visible regardless of segment,
// so the Skin Score is the destination's identity, not a sub-tab
// feature. Tapping the strip jumps to the Progress segment where the
// full hero lives. Active state (when Progress is already selected) is
// rendered in clay so the strip reads as a non-button context line.

function ScoreStrip({
  score,
  onPress,
  active,
}: {
  score: ReturnType<typeof computeSkinScore>;
  onPress: () => void;
  active: boolean;
}) {
  const delta = score.deltaSinceLast;
  const DeltaIcon =
    delta === null
      ? null
      : delta > 0
      ? ArrowUp
      : delta < 0
      ? ArrowDown
      : Minus;
  const deltaColor =
    delta === null
      ? palette.inkTertiary
      : delta > 0
      ? palette.mossDeep
      : delta < 0
      ? palette.rust
      : palette.inkTertiary;

  const Wrapper: React.ComponentType<any> = active ? View : Pressable;

  return (
    <Wrapper
      onPress={active ? undefined : onPress}
      accessibilityRole={active ? undefined : 'button'}
      accessibilityLabel={
        active
          ? undefined
          : `Skin Score ${score.value}, ${tierLabel(score.tier)}. Open Progress.`
      }
      style={[
        scoreStripStyles.wrap,
        active && scoreStripStyles.wrapActive,
      ]}
    >
      <Text style={scoreStripStyles.kicker} maxFontSizeMultiplier={1.1}>
        SKIN SCORE
      </Text>
      <View style={scoreStripStyles.valueRow}>
        <Text style={scoreStripStyles.value} maxFontSizeMultiplier={1.15}>
          {score.value}
        </Text>
        <Text style={scoreStripStyles.tier} maxFontSizeMultiplier={1.15}>
          {tierLabel(score.tier)}
        </Text>
      </View>
      {DeltaIcon && delta !== null ? (
        <View style={scoreStripStyles.deltaPill}>
          <DeltaIcon size={11} color={deltaColor} weight="bold" />
          <Text
            style={[scoreStripStyles.deltaValue, { color: deltaColor }]}
            maxFontSizeMultiplier={1.1}
          >
            {formatDelta(delta)}
          </Text>
        </View>
      ) : (
        <Text style={scoreStripStyles.firstReading} maxFontSizeMultiplier={1.1}>
          first reading
        </Text>
      )}
      {!active ? (
        <CaretRight size={13} color={palette.inkTertiary} weight="bold" />
      ) : null}
    </Wrapper>
  );
}

// ============================================================================
// Top segmented control — v10.20 magazine-style underline tabs
// ============================================================================
//
// Replaces the v10.13 gray-pill iOS-default segmented control. Two
// serif labels sit side-by-side with a 2pt clay underline indicator
// beneath the active one (animated on switch). A hairline rule runs
// the full width below the labels so the strip reads as a publication
// section masthead, not a UIKit primitive.

function TopSegmented({
  active,
  onChange,
}: {
  active: TopSegment;
  onChange: (s: TopSegment) => void;
}) {
  const OPTIONS: Array<{ id: TopSegment; label: string }> = [
    { id: 'routine', label: 'Routine' },
    { id: 'progress', label: 'Progress' },
  ];
  return (
    <View style={segStyles.topRow}>
      {OPTIONS.map((o) => {
        const selected = o.id === active;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            hitSlop={6}
            style={({ pressed }) => [
              segStyles.topSeg,
              pressed && !selected && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                segStyles.topSegLabel,
                {
                  color: selected ? palette.ink : palette.inkTertiary,
                },
              ]}
              maxFontSizeMultiplier={1.1}
            >
              {o.label}
            </Text>
            <View
              style={[
                segStyles.topSegUnderline,
                {
                  backgroundColor: selected ? palette.clay : 'transparent',
                },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

// ============================================================================
// Routine sub-tab
// ============================================================================

function RoutineSubTab({
  innerSegment,
  onInnerSegment,
  activeList,
  anyProducts,
  morningCount,
  eveningCount,
  savedCount,
  hasScanned,
  todayFocus,
  onScan,
  onBrowseProducts,
}: {
  innerSegment: InnerSegment;
  onInnerSegment: (s: InnerSegment) => void;
  activeList: Product[];
  anyProducts: boolean;
  morningCount: number;
  eveningCount: number;
  savedCount: number;
  hasScanned: boolean;
  todayFocus: string | null;
  onScan: () => void;
  onBrowseProducts: () => void;
}) {
  const fadeKey = innerSegment;
  const op = useSharedValue(1);
  React.useEffect(() => {
    op.value = 0;
    op.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [op, fadeKey]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: op.value }));

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* v10.18 — TODAY focus card. Pulls the top sentence from the
          latest scan's concerns and lands it at the top of the
          Routine view so the page opens with a daily voice ("Apply
          your calming gel directly to the spot.") instead of a cold
          inner segmented control. Only renders when the user has
          scanned and at least one product is in the routine — for
          the first-run state, FirstRunRoutinePanel below is the
          stronger anchor. */}
      {hasScanned && anyProducts && todayFocus ? (
        <TodayFocusCard text={todayFocus} />
      ) : null}

      <View style={styles.innerSegmentedWrap}>
        <InnerSegmented
          active={innerSegment}
          onChange={onInnerSegment}
          morningCount={morningCount}
          eveningCount={eveningCount}
          savedCount={savedCount}
        />
      </View>

      <Animated.View style={fadeStyle}>
        {!anyProducts ? (
          <FirstRunRoutinePanel
            hasScanned={hasScanned}
            onScan={onScan}
            onBrowse={onBrowseProducts}
          />
        ) : activeList.length === 0 ? (
          <SegmentEmptyPanel
            segment={innerSegment}
            onBrowse={onBrowseProducts}
          />
        ) : (
          <RoutineList products={activeList} segment={innerSegment} />
        )}
      </Animated.View>
    </ScrollView>
  );
}

// ============================================================================
// Today focus card — v10.18
// ============================================================================
//
// Premium clay-rail card that sits above the inner segmented control on
// the Routine sub-tab. One sentence, no chrome, no CTA — the page's
// daily voice. Reads as a quote-card, not a banner.

function TodayFocusCard({ text }: { text: string }) {
  return (
    <View style={focusStyles.wrap}>
      <View style={focusStyles.rail} pointerEvents="none" />
      <Text style={focusStyles.kicker} maxFontSizeMultiplier={1.1}>
        TODAY’S FOCUS
      </Text>
      <Text
        style={focusStyles.body}
        maxFontSizeMultiplier={1.2}
        numberOfLines={3}
      >
        {text}
      </Text>
    </View>
  );
}

function InnerSegmented({
  active,
  onChange,
  morningCount,
  eveningCount,
  savedCount,
}: {
  active: InnerSegment;
  onChange: (s: InnerSegment) => void;
  morningCount: number;
  eveningCount: number;
  savedCount: number;
}) {
  const SEGS: Array<{
    id: InnerSegment;
    label: string;
    Icon: React.FC<any>;
    count: number;
  }> = [
    { id: 'morning', label: 'Morning', Icon: Sun, count: morningCount },
    { id: 'evening', label: 'Evening', Icon: Moon, count: eveningCount },
    { id: 'saved', label: 'Saved', Icon: BookmarkSimple, count: savedCount },
  ];
  return (
    <View style={segStyles.inner}>
      {SEGS.map((seg) => {
        const selected = seg.id === active;
        const Icon = seg.Icon;
        return (
          <Pressable
            key={seg.id}
            onPress={() => onChange(seg.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              segStyles.innerSeg,
              selected && segStyles.innerSegSelected,
              pressed && !selected && { opacity: 0.85 },
            ]}
          >
            <Icon
              size={14}
              color={selected ? palette.inkInverse : palette.inkSecondary}
              weight={selected ? 'duotone' : 'regular'}
            />
            <Text
              style={[
                segStyles.innerSegLabel,
                { color: selected ? palette.inkInverse : palette.inkSecondary },
              ]}
              maxFontSizeMultiplier={1.1}
            >
              {seg.label}
            </Text>
            {seg.count > 0 ? (
              <View
                style={[
                  segStyles.innerCount,
                  selected
                    ? { backgroundColor: 'rgba(248,250,252,0.22)' }
                    : { backgroundColor: palette.bgDeep },
                ]}
              >
                <Text
                  style={[
                    segStyles.innerCountText,
                    { color: selected ? palette.inkInverse : palette.inkSecondary },
                  ]}
                  maxFontSizeMultiplier={1.1}
                >
                  {seg.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// ============================================================================
// Routine list — actual product cards
// ============================================================================

function RoutineList({
  products,
  segment,
}: {
  products: Product[];
  segment: InnerSegment;
}) {
  const nav = useNavigation<any>();
  const removeUserRoutineProduct = useAppStore((s) => s.removeUserRoutineProduct);
  const toggleWishlist = useAppStore((s) => s.toggleWishlist);

  const removeProduct = (productId: string) => {
    hapt.select();
    if (segment === 'morning' || segment === 'evening') {
      removeUserRoutineProduct(segment, productId);
    } else {
      toggleWishlist(productId);
    }
  };

  // v10.19 — section header + step numbering. Each segment now lands
  // with its own identity inside the panel (icon + serif name +
  // sub-line) instead of three identical lists below the chip. And
  // morning/evening rows carry "STEP N" on the role kicker so the
  // routine reads as a sequence, not a bag of products. Saved is
  // explicitly NOT numbered — Saved is "decide later," not a
  // sequence; numbering it would mis-frame its intent.
  const sequenced = segment === 'morning' || segment === 'evening';

  return (
    <View>
      <RoutineSectionHeader segment={segment} count={products.length} />
      <View style={styles.list}>
        {products.map((p, i) => (
          <Pressable
            key={p.id}
            onPress={() => {
              hapt.select();
              nav.navigate('ProductDetail', { productId: p.id, tint: p.tint });
            }}
            accessibilityRole="button"
            accessibilityLabel={
              sequenced
                ? `Step ${i + 1}, ${productCategoryLabel(p.category)}: ${p.brand} ${p.name}`
                : `${productCategoryLabel(p.category)}: ${p.brand} ${p.name}`
            }
            style={({ pressed }) => [
              styles.listRow,
              pressed && { opacity: 0.94, transform: [{ scale: 0.992 }] },
            ]}
          >
            <View
              style={[
                styles.listImage,
                { backgroundColor: tintFor(p) },
              ]}
            >
              {p.imageUri ? (
                <Image
                  source={{ uri: p.imageUri }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                />
              ) : (
                <Drop size={26} color={palette.ink} weight="duotone" />
              )}
            </View>
            <View style={styles.listText}>
              <Text style={styles.listRole} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                {sequenced
                  ? `STEP ${i + 1} \u00B7 ${productCategoryLabel(p.category)}`
                  : productCategoryLabel(p.category)}
              </Text>
              <Text style={styles.listName} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {p.name}
              </Text>
              <Text style={styles.listBrand} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                {p.brand}
              </Text>
            </View>
          <Pressable
            onPress={() => removeProduct(p.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              segment === 'saved'
                ? `Remove ${p.name} from saved`
                : `Remove ${p.name} from ${segment}`
            }
            style={styles.removeBtn}
          >
            <X size={13} color={palette.inkTertiary} weight="bold" />
          </Pressable>
        </Pressable>
        ))}
      </View>
    </View>
  );
}

// v10.19 — section header rendered above the product list per
// segment so each inner panel feels like its own micro-destination.
// Morning gets the Sun + a serif name + a one-line role description;
// Evening gets the Moon; Saved gets the Bookmark with a different
// sub-line (Saved is "decide later," not a sequenced ritual).
function RoutineSectionHeader({
  segment,
  count,
}: {
  segment: InnerSegment;
  count: number;
}) {
  const meta = SECTION_META[segment];
  const Icon = meta.Icon;
  return (
    <View style={sectionStyles.wrap}>
      <View style={sectionStyles.iconWrap}>
        <Icon size={18} color={palette.clay} weight="duotone" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={sectionStyles.titleRow}>
          <Text style={sectionStyles.title} maxFontSizeMultiplier={1.15}>
            {meta.title}
          </Text>
          <Text style={sectionStyles.count} maxFontSizeMultiplier={1.1}>
            {count === 1 ? '1 item' : `${count} items`}
          </Text>
        </View>
        <Text
          style={sectionStyles.body}
          maxFontSizeMultiplier={1.2}
          numberOfLines={2}
        >
          {meta.body}
        </Text>
      </View>
    </View>
  );
}

const SECTION_META: Record<
  InnerSegment,
  { title: string; body: string; Icon: React.FC<any> }
> = {
  morning: {
    title: 'Morning.',
    body: 'How you start the day. SPF is the closer.',
    Icon: Sun,
  },
  evening: {
    title: 'Evening.',
    body: 'Repair window. Where active ingredients earn their keep.',
    Icon: Moon,
  },
  saved: {
    title: 'Saved.',
    body: 'Decide later. Move into morning or evening when you’re ready.',
    Icon: BookmarkSimple,
  },
};

// v10.18 — display label for product category (used as the row's
// step-role kicker). Falls back to the raw category string if a new
// category is added without a label.
function productCategoryLabel(c: ProductCategory): string {
  switch (c) {
    case 'cleanser':
      return 'CLEANSER';
    case 'toner':
      return 'TONER';
    case 'serum':
      return 'SERUM';
    case 'moisturizer':
      return 'MOISTURIZER';
    case 'spf':
      return 'SPF';
    case 'treatment':
      return 'TREATMENT';
    case 'mask':
      return 'MASK';
    default:
      return String(c).toUpperCase();
  }
}

// ============================================================================
// Empty states
// ============================================================================

/** Shown when NO products exist across any slot (first-time state). */
function FirstRunRoutinePanel({
  hasScanned,
  onScan,
  onBrowse,
}: {
  hasScanned: boolean;
  onScan: () => void;
  onBrowse: () => void;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelMark}>
        <PuraMark size={44} variant="idle" />
      </View>
      <Text style={styles.panelHeading} maxFontSizeMultiplier={1.2}>
        What are you using right now?
      </Text>
      <Text style={styles.panelBody} maxFontSizeMultiplier={1.2}>
        Build your morning and evening here. {hasScanned
          ? 'Pick from your matched picks, or browse the full catalog.'
          : 'Scan first — or browse — and we\u2019ll match as you build.'}
      </Text>

      <Pressable
        onPress={onBrowse}
        accessibilityRole="button"
        accessibilityLabel="Browse products"
        style={({ pressed }) => [
          styles.primaryCta,
          pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
        ]}
      >
        <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
          Browse products
        </Text>
        <ArrowRight size={16} color={palette.inkInverse} weight="duotone" />
      </Pressable>

      {!hasScanned ? (
        <Pressable
          onPress={onScan}
          accessibilityRole="button"
          accessibilityLabel="Take your first scan"
          style={({ pressed }) => [
            styles.secondaryCta,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.secondaryCtaLabel} maxFontSizeMultiplier={1.15}>
            Take a scan first
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Shown when OTHER slots have products but the current one is empty. */
function SegmentEmptyPanel({
  segment,
  onBrowse,
}: {
  segment: InnerSegment;
  onBrowse: () => void;
}) {
  const copy =
    segment === 'morning'
      ? {
          heading: 'No morning steps yet.',
          body: 'Add a product from your saved picks or the catalog to build your morning.',
          cta: 'Browse products',
        }
      : segment === 'evening'
      ? {
          heading: 'No evening steps yet.',
          body: 'Evening is where repair happens. Add targeted products from the catalog.',
          cta: 'Browse products',
        }
      : {
          heading: 'Nothing saved yet.',
          body: 'Tap the heart on any product to keep it here and decide later.',
          cta: 'Explore products',
        };
  return (
    <View style={styles.panel}>
      <View style={styles.panelMark}>
        <PuraMark size={38} variant="idle" />
      </View>
      <Text style={styles.panelHeading} maxFontSizeMultiplier={1.2}>
        {copy.heading}
      </Text>
      <Text style={styles.panelBody} maxFontSizeMultiplier={1.2}>
        {copy.body}
      </Text>
      <Pressable
        onPress={onBrowse}
        accessibilityRole="button"
        accessibilityLabel={copy.cta}
        style={({ pressed }) => [
          styles.primaryCta,
          pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
        ]}
      >
        <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
          {copy.cta}
        </Text>
        <ArrowRight size={16} color={palette.inkInverse} weight="duotone" />
      </Pressable>
    </View>
  );
}

// ============================================================================
// Progress sub-tab
// ============================================================================

function ProgressSubTab({
  scans,
  firstScan,
  latestScan,
  progressAvailable,
  width,
  compareHeight,
  onScan,
}: {
  scans: Scan[];
  firstScan: Scan | undefined;
  latestScan: Scan | undefined;
  progressAvailable: boolean;
  width: number;
  compareHeight: number;
  onScan: () => void;
}) {
  const op = useSharedValue(0);
  React.useEffect(() => {
    op.value = 0;
    op.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [op]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: op.value }));

  if (!progressAvailable || !firstScan || !latestScan) {
    return (
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={fadeStyle}>
          <View style={styles.panel}>
            <View style={styles.panelMark}>
              <PuraMark size={44} variant="idle" />
            </View>
            <Text style={styles.panelHeading} maxFontSizeMultiplier={1.2}>
              Nothing to compare yet.
            </Text>
            <Text style={styles.panelBody} maxFontSizeMultiplier={1.2}>
              {scans.length === 0
                ? 'One scan, and the before starts being recorded. Two, and the after begins.'
                : 'One more scan unlocks side-by-side and the trend chart.'}
            </Text>
            <Pressable
              onPress={onScan}
              accessibilityRole="button"
              accessibilityLabel="Take a scan"
              style={({ pressed }) => [
                styles.primaryCta,
                pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
                {scans.length === 0 ? 'Take your first scan' : 'Scan again'}
              </Text>
              <ArrowRight size={16} color={palette.inkInverse} weight="duotone" />
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={fadeStyle}>
        {/* v10.20 — score hero is now the score story only (label /
            value / delta / verdict / why); the trend chart that used
            to live inside it has been spun out into SkinScoreTrendCard
            below so each module gets its own page-rhythm beat. */}
        <SkinScoreHero score={computeSkinScore(scans)} scans={scans} />

        <SkinScoreTrendCard scans={scans} />

        <ProgressNarrative scans={scans} />

        <View style={styles.compareBlock}>
          <View style={styles.compareHead}>
            <Text style={styles.compareKicker} maxFontSizeMultiplier={1.1}>
              SIDE BY SIDE
            </Text>
            <Text style={styles.compareDates} maxFontSizeMultiplier={1.1}>
              {`DAY 1 \u2192 DAY ${latestScan.dayNumber}`}
            </Text>
          </View>
          <View
            style={[
              styles.fullBleedCompare,
              { marginHorizontal: -space.lg },
            ]}
          >
            <CompareSlider
              leftUri={firstScan.photoUri}
              rightUri={latestScan.photoUri}
              leftLabel="DAY 1"
              rightLabel={`DAY ${latestScan.dayNumber}`}
              width={width}
              height={compareHeight}
            />
          </View>
        </View>

        {scans.length > 2 ? (
          <View style={styles.historyBlock}>
            <Text style={styles.historyKicker} maxFontSizeMultiplier={1.1}>
              SCAN HISTORY
            </Text>
            <View style={{ marginLeft: -space.lg }}>
              <PhotoTimelineStrip
                scans={scans}
                selectedId={latestScan.id}
                onSelect={() => {}}
              />
            </View>
          </View>
        ) : null}

        {/* v10.18 — invite-to-action footer. Progress is read-only by
            nature; without this the page dead-ends on a chart strip
            and gives the user nothing to do next. A quiet pressable
            ("Scan again to update your reading") closes the loop and
            keeps the destination active. */}
        <Pressable
          onPress={onScan}
          accessibilityRole="button"
          accessibilityLabel="Scan again to update your reading"
          style={({ pressed }) => [
            styles.scanAgainCta,
            pressed && { opacity: 0.94 },
          ]}
        >
          <View style={styles.scanAgainBadge}>
            <ArrowRight size={14} color={palette.clay} weight="bold" />
          </View>
          <Text style={styles.scanAgainLabel} maxFontSizeMultiplier={1.15}>
            Scan again to update your reading
          </Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function hydrate(ids: string[]): Product[] {
  return ids
    .map((id) => seedProducts.find((p) => p.id === id))
    .filter((p): p is Product => !!p);
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

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  scroll: { paddingBottom: 140 },

  headerRow: {
    height: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandWord: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 20,
    letterSpacing: -0.3,
    color: palette.ink,
  },

  titleBlock: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.0,
    color: palette.ink,
  },

  // v10.20 — magazine-style underline tabs sit closer to the score
  // strip above (when present) and the content below. The previous
  // gray-pill layout needed more breathing room because the pill was
  // visually heavy; the underline strip sits lighter on the page.
  topSegmentedWrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 0,
  },

  innerSegmentedWrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },

  // Routine list — v10.18 paper-card treatment.
  list: {
    marginTop: 18,
    paddingHorizontal: 20,
    gap: 12,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
    // Soft warm shadow so the row reads as a card, not a flexbox row.
    shadowColor: palette.clay,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  listImage: {
    width: 56,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listText: {
    flex: 1,
    paddingVertical: 1,
  },
  listRole: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: palette.clay,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  listName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 2,
  },
  listBrand: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    letterSpacing: 0.1,
    color: palette.inkTertiary,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty/first-run panel
  panel: {
    marginTop: 32,
    marginHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    alignItems: 'center',
  },
  panelMark: { marginBottom: 18 },
  panelHeading: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
    textAlign: 'center',
    marginBottom: 10,
  },
  panelBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: palette.inkSecondary,
    textAlign: 'center',
    marginBottom: 22,
    maxWidth: 300,
  },
  primaryCta: {
    height: 44,
    minWidth: 200,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
  secondaryCta: {
    marginTop: 10,
    paddingVertical: 8,
  },
  secondaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.inkSecondary,
  },

  // v10.18 — Progress page invite-to-action footer.
  scanAgainCta: {
    marginTop: 24,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: palette.bgDeep,
  },
  scanAgainBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanAgainLabel: {
    flex: 1,
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  compareBlock: { marginTop: space.xxl },
  compareHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
    paddingHorizontal: space.lg,
  },
  compareKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  compareDates: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: palette.clay,
    fontVariant: ['tabular-nums'],
  },
  fullBleedCompare: { marginTop: 4 },
  historyBlock: {
    marginTop: space.xxl,
    paddingHorizontal: space.lg,
  },
  historyKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: space.md,
  },
});

// v10.19 — section identity header above the routine list per
// inner segment. Each segment lands as its own micro-destination
// inside the panel: icon disc, serif name, role sub-line, item count.
const sectionStyles = StyleSheet.create({
  wrap: {
    marginTop: 22,
    marginBottom: 6,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.clayPaper,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: palette.ink,
  },
  count: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
    color: palette.inkTertiary,
    fontVariant: ['tabular-nums'],
  },
  body: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
    maxWidth: '94%',
  },
});

// v10.18 — TODAY focus card. Lives at the top of the Routine sub-tab,
// above the inner segmented control. Premium clay-rail treatment so
// the page leads with a daily-action voice, not a configuration view.
const focusStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 18,
    paddingLeft: 19,
    paddingRight: 18,
    borderRadius: 18,
    backgroundColor: palette.clayPaper,
    position: 'relative',
    overflow: 'hidden',
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: palette.clay,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  body: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.2,
    color: palette.ink,
  },
});

// v10.20 — persistent score strip in the destination header. Lives
// between the title block and the segmented tabs whenever the user has
// scanned. Always visible regardless of which segment is active so the
// Skin Score is the destination's anchor, not a sub-tab feature.
const scoreStripStyles = StyleSheet.create({
  wrap: {
    marginTop: 18,
    marginHorizontal: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: palette.bgDeep,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wrapActive: {
    // When the user is already on Progress, the strip is read-only
    // context (not a button). Lighter background.
    backgroundColor: palette.clayPaper,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flex: 1,
  },
  value: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    letterSpacing: -0.6,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  tier: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    letterSpacing: -0.1,
    color: palette.inkSecondary,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: palette.bg,
  },
  deltaValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  firstReading: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: palette.inkTertiary,
    fontStyle: 'italic',
  },
});

const segStyles = StyleSheet.create({
  // v10.20 — magazine-style underline tabs replace the v10.13 gray-pill
  // segmented control. Two serif labels with a 2pt clay underline
  // beneath the active one + a bottom hairline rule across the strip.
  // Reads as a section masthead, not a UIKit segmented primitive.
  topRow: {
    flexDirection: 'row',
    gap: 28,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.hairline,
  },
  topSeg: {
    paddingTop: 6,
    paddingBottom: 12,
    alignItems: 'center',
  },
  topSegLabel: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  topSegUnderline: {
    marginTop: 8,
    width: 28,
    height: 2,
    borderRadius: 1,
  },

  inner: {
    flexDirection: 'row',
    backgroundColor: palette.bgDeep,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  innerSeg: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  innerSegSelected: {
    backgroundColor: palette.ink,
  },
  innerSegLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  innerCount: {
    marginLeft: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCountText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
});

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
  Plus,
  X,
  CaretRight,
  Drop,
} from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { CompareSlider } from '@/components/CompareSlider';
import { SkinScoreHero } from '@/screens/progress/SkinScoreHero';
import { ProgressNarrative } from '@/screens/progress/ProgressNarrative';
import { PhotoTimelineStrip } from '@/screens/progress/PhotoTimelineStrip';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { buildSkinScoreWhy, computeSkinScore } from '@/utils/skinScore';
import { seedProducts } from '@/data/seed';
import { palette, space } from '@/theme';
import { hapt } from '@/utils/haptics';
import type { RootStackParamList } from '@/navigation/types';
import type { Product, Scan } from '@/types';

/**
 * Progress tab — v10.13 unified ongoing-use destination.
 *
 * Top-level tab label is "PROGRESS", icon ChartLineUp. Inside the
 * screen a segmented control switches between two sub-tabs:
 *
 *   • Routine (default)  — action layer. Morning / Evening / Saved
 *                          nested segments with actual product cards.
 *                          Premium empty state for first-time users
 *                          ("What are you using right now?").
 *   • Progress          — proof layer. SkinScoreHero + "why" line +
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

  const hasScanned = scans.length > 0;
  const firstScan = scans[0];
  const latestScan = scans[scans.length - 1];
  const progressAvailable = scans.length >= 2 && !!firstScan && !!latestScan;
  const compareHeight = 420;

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
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          {topSegment === 'routine' ? 'WHAT YOU’RE DOING' : 'HOW IT’S TRACKING'}
        </Text>
        <Text style={styles.title} maxFontSizeMultiplier={1.15}>
          {topSegment === 'routine' ? 'Routine.' : 'Progress.'}
        </Text>
      </View>

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
// Top segmented control — Routine | Progress
// ============================================================================

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
    <View style={segStyles.top}>
      {OPTIONS.map((o) => {
        const selected = o.id === active;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              segStyles.topSeg,
              selected && segStyles.topSegSelected,
              pressed && !selected && { opacity: 0.85 },
            ]}
          >
            <Text
              style={[
                segStyles.topSegLabel,
                { color: selected ? palette.inkInverse : palette.inkSecondary },
              ]}
              maxFontSizeMultiplier={1.1}
            >
              {o.label}
            </Text>
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

  return (
    <View style={styles.list}>
      {products.map((p, i) => (
        <Pressable
          key={p.id}
          onPress={() => {
            hapt.select();
            nav.navigate('ProductDetail', { productId: p.id, tint: p.tint });
          }}
          accessibilityRole="button"
          accessibilityLabel={`${p.brand} ${p.name}`}
          style={({ pressed }) => [
            styles.listRow,
            pressed && { opacity: 0.92 },
          ]}
        >
          <View style={styles.orderBadge}>
            <Text style={styles.orderBadgeText} maxFontSizeMultiplier={1.1}>
              {i + 1}
            </Text>
          </View>
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
              <Drop size={22} color={palette.ink} weight="duotone" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.listBrand} numberOfLines={1} maxFontSizeMultiplier={1.1}>
              {p.brand.toUpperCase()}
            </Text>
            <Text style={styles.listName} numberOfLines={1} maxFontSizeMultiplier={1.15}>
              {p.name}
            </Text>
          </View>
          <Pressable
            onPress={() => removeProduct(p.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${p.name}`}
            style={styles.removeBtn}
          >
            <X size={14} color={palette.inkTertiary} weight="bold" />
          </Pressable>
        </Pressable>
      ))}
    </View>
  );
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

  const whyLine = buildSkinScoreWhy(scans);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={fadeStyle}>
        <SkinScoreHero score={computeSkinScore(scans)} scans={scans} />

        {/* v10.13 — "why" line below the hero turns the number into
            something understandable ("Breakouts calming, hydration
            still needs work"). Same utility surfaces on Home + Scan
            Result so the Skin Score reads as meaningful everywhere. */}
        <View style={styles.whyLineWrap}>
          <Text style={styles.whyLineText} maxFontSizeMultiplier={1.2}>
            {whyLine}
          </Text>
        </View>

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

  topSegmentedWrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },

  innerSegmentedWrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },

  // Routine list
  list: {
    marginTop: 24,
    paddingHorizontal: 20,
    gap: 10,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  orderBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
    color: palette.inkSecondary,
    fontVariant: ['tabular-nums'],
  },
  listImage: {
    width: 42,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.inkTertiary,
    marginBottom: 2,
  },
  listName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  removeBtn: {
    width: 30,
    height: 30,
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

  // Progress sub-tab extras
  whyLineWrap: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: palette.bgDeep,
  },
  whyLineText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 21,
    color: palette.inkSecondary,
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

const segStyles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    backgroundColor: palette.bgDeep,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  topSeg: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSegSelected: {
    backgroundColor: palette.ink,
  },
  topSegLabel: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    letterSpacing: -0.2,
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

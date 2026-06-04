/**
 * Skeleton — shimmer placeholder primitive (v35 perf pass).
 *
 * A single animated "bone": a rounded fill that eases between a cool-neutral
 * base and a lighter porcelain sweep (skeletonBase ↔ skeletonHighlight),
 * 1.5s ease-in-out, infinite. Pure React Native + reanimated — no remote
 * asset and no layout measurement, so it works fully offline and at any
 * width (number OR percentage).
 *
 * WHEN to reach for it: only to hold layout while genuinely-absent content
 * loads — a live product lookup after a fresh scan, a true cold-start list
 * with nothing yet in the persisted store. Do NOT use it to replace content
 * that already paints instantly from the Zustand-persist cache; a flash of
 * bones where there was instant content reads as SLOWER, not faster (see
 * CLAUDE.md: "No UI layer that looks technically improved but visibly
 * unchanged"). Keep the real scan progress bar and the routine build
 * ceremony — those communicate genuine latency and must not be skeletonized.
 *
 * Reduced motion → a static base fill, no pulse.
 *
 * Colors come ONLY from theme tokens — no hex literals live here, per the
 * tokens.ts grep guard.
 */
import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { radius as themeRadius, space, useTheme } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

// 750ms each direction → a 1.5s there-and-back shimmer cycle.
const SHIMMER_HALF_MS = 750;

export interface SkeletonProps {
  /** number (px) or percentage string. Defaults to full width. */
  width?: DimensionValue;
  /** number (px) or percentage string. Defaults to a single text-line height. */
  height?: DimensionValue;
  /** Corner radius. Defaults to 8. */
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The atomic bone. Compose these into the silhouette of whatever is loading.
 */
export function Skeleton({
  width = '100%',
  height = 14,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const reduce = useReduceMotion();
  // 0 → highlight (porcelain sweep), 1 → base (cool gray rest state).
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduce) {
      cancelAnimation(progress);
      progress.value = 1; // settle on the calm base tone
      return;
    }
    progress.value = withRepeat(
      withTiming(1, {
        duration: SHIMMER_HALF_MS,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(progress);
  }, [reduce, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.skeletonHighlight, colors.skeletonBase],
    ),
  }));

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[{ width, height, borderRadius }, animatedStyle, style]}
    />
  );
}

// ---------------------------------------------------------------------------
// Group skeletons — each mirrors the footprint of the real component so the
// swap to real content does not shift layout. They wrap their bones in an
// accessibility "Loading" boundary so screen readers announce the wait once
// instead of reading out a stack of empty views.
// ---------------------------------------------------------------------------

interface GroupProps {
  style?: StyleProp<ViewStyle>;
}

function LoadingBoundary({
  children,
  style,
  label = 'Loading',
}: GroupProps & { children: React.ReactNode; label?: string }) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={style}
    >
      {children}
    </View>
  );
}

/** Mirrors the grid ProductCard (radius 4, padding md, minHeight 200). */
export function ProductCardSkeleton({ style }: GroupProps) {
  const { colors } = useTheme();
  return (
    <LoadingBoundary
      style={[
        styles.productCard,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
        style,
      ]}
    >
      <Skeleton width={48} height={11} borderRadius={4} />
      <View style={styles.productNameBlock}>
        <Skeleton width={72} height={9} borderRadius={4} style={styles.mb8} />
        <Skeleton width="92%" height={20} borderRadius={6} style={styles.mb6} />
        <Skeleton width="58%" height={20} borderRadius={6} />
      </View>
      <View style={styles.rowBetween}>
        <Skeleton width={40} height={15} borderRadius={4} />
        <Skeleton width={20} height={30} borderRadius={4} />
      </View>
    </LoadingBoundary>
  );
}

/**
 * Mirrors the ResultScreen hero product card: image + brand + name +
 * why-it-fits line, then ONE full-width CTA below.
 */
export function HeroCardSkeleton({ style }: GroupProps) {
  const { colors } = useTheme();
  return (
    <LoadingBoundary
      style={[
        styles.heroCard,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
        style,
      ]}
    >
      <View style={styles.heroRow}>
        <Skeleton width={96} height={96} borderRadius={themeRadius.md} />
        <View style={styles.heroText}>
          <Skeleton width={64} height={9} borderRadius={4} style={styles.mb8} />
          <Skeleton width="88%" height={18} borderRadius={6} style={styles.mb6} />
          <Skeleton width="54%" height={18} borderRadius={6} style={styles.mb12} />
          <Skeleton width="74%" height={11} borderRadius={4} />
        </View>
      </View>
      <Skeleton
        width="100%"
        height={52}
        borderRadius={themeRadius.md}
        style={styles.mt16}
      />
    </LoadingBoundary>
  );
}

/** A few assistant-aligned message bubbles — "composing a reply" cold state. */
export function ConversationSkeleton({ style }: GroupProps) {
  const { colors } = useTheme();
  const Bubble = ({ widths }: { widths: DimensionValue[] }) => (
    <View style={styles.msgRow}>
      <Skeleton width={32} height={32} borderRadius={16} />
      <View
        style={[
          styles.bubble,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        {widths.map((w, i) => (
          <Skeleton
            key={i}
            width={w}
            height={11}
            borderRadius={4}
            style={i < widths.length - 1 ? styles.mb8 : undefined}
          />
        ))}
      </View>
    </View>
  );
  return (
    <LoadingBoundary label="Loading conversation" style={[styles.conversation, style]}>
      <Bubble widths={['90%', '82%', '56%']} />
      <Bubble widths={['72%', '40%']} />
    </LoadingBoundary>
  );
}

/** Mirrors the full Product Detail screen: hero image, titles, price, body, CTA. */
export function ProductDetailSkeleton({ style }: GroupProps) {
  return (
    <LoadingBoundary label="Loading product" style={[styles.detail, style]}>
      <Skeleton width="100%" height={240} borderRadius={themeRadius.lg} />
      <Skeleton width={84} height={10} borderRadius={4} style={styles.detailBrand} />
      <Skeleton width="90%" height={28} borderRadius={8} style={styles.mb8} />
      <Skeleton width="48%" height={28} borderRadius={8} style={styles.mb16} />
      <Skeleton width={64} height={20} borderRadius={6} style={styles.mb20} />
      <Skeleton width="100%" height={12} borderRadius={4} style={styles.mb10} />
      <Skeleton width="96%" height={12} borderRadius={4} style={styles.mb10} />
      <Skeleton width="88%" height={12} borderRadius={4} style={styles.mb10} />
      <Skeleton width="40%" height={12} borderRadius={4} />
      <Skeleton
        width="100%"
        height={52}
        borderRadius={themeRadius.md}
        style={styles.mt24}
      />
    </LoadingBoundary>
  );
}

/** Mirrors a scan-history row: thumbnail + score/date text + score dial. */
export function ScanCardSkeleton({ style }: GroupProps) {
  const { colors } = useTheme();
  return (
    <LoadingBoundary
      label="Loading scan"
      style={[
        styles.scanRow,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
        style,
      ]}
    >
      <Skeleton width={56} height={56} borderRadius={themeRadius.md} />
      <View style={styles.scanText}>
        <Skeleton width="52%" height={16} borderRadius={6} style={styles.mb8} />
        <Skeleton width="30%" height={11} borderRadius={4} />
      </View>
      <Skeleton width={44} height={44} borderRadius={22} />
    </LoadingBoundary>
  );
}

const styles = StyleSheet.create({
  // shared spacing helpers
  mb6: { marginBottom: 6 },
  mb8: { marginBottom: 8 },
  mb10: { marginBottom: 10 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: space.md },
  mb20: { marginBottom: 20 },
  mt16: { marginTop: space.md },
  mt24: { marginTop: space.lg },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  productCard: {
    borderRadius: 4,
    borderWidth: 1,
    padding: space.md,
    minHeight: 200,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  productNameBlock: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: space.md,
  },

  heroCard: {
    borderRadius: themeRadius.lg,
    borderWidth: 1,
    padding: space.md,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroText: { flex: 1, marginLeft: space.md, justifyContent: 'center' },

  conversation: { paddingVertical: space.sm },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: space.md,
  },
  bubble: {
    flex: 1,
    marginLeft: space.sm,
    borderRadius: themeRadius.lg,
    borderWidth: 1,
    padding: space.md,
  },

  detail: { padding: space.md },
  detailBrand: { marginTop: space.lg, marginBottom: 10 },

  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: themeRadius.lg,
    borderWidth: 1,
    padding: space.sm,
  },
  scanText: { flex: 1, marginLeft: space.md, justifyContent: 'center' },
});

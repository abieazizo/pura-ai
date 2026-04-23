import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import {
  ArrowRight,
  ChartLineUp,
  ScanSmiley,
  Sparkle,
} from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { SkinScoreDial } from '@/components/SkinScoreDial';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

export interface TutorialProps {
  /** User advances past the final page — enter first-scan handoff. */
  onComplete: () => void;
  /** User hits Skip — same destination as complete, but no haptic celebration. */
  onSkip: () => void;
}

type PageIndex = 0 | 1 | 2;
const PAGES: PageIndex[] = [0, 1, 2];

/**
 * Tutorial (v10.6) — premium product walkthrough between Paywall and
 * Welcome. Explains the real app loop: Scan → Plan → Track. Three
 * horizontally paged slides, each built around a distinctive visual
 * (not a stock illustration).
 *
 * Page 1 — Scan: a soft face silhouette with pulsing ring.
 * Page 2 — Plan: a real SkinScoreDial rendered small + tier label.
 * Page 3 — Track: a rising sparkline on a tiered backdrop.
 *
 * Respects reduce-motion. Skippable at any time (top-right). "Next"
 * turns into "Take your first scan" on the final page.
 */
export function Tutorial({ onComplete, onSkip }: TutorialProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<Animated.FlatList<PageIndex>>(null);
  const [page, setPage] = useState<PageIndex>(0);

  // v10.8 — scrollX drives per-page parallax. Visuals translate at 0.4×
  // the scroll rate (sticky), copy at 1.0× (standard), so the visual
  // "stays" on screen longer while the next page's text arrives.
  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width) as PageIndex;
    if (next !== page) {
      setPage(next);
      hapt.select();
    }
  };

  const next = () => {
    if (page === 2) {
      hapt.success();
      onComplete();
      return;
    }
    hapt.select();
    const nextPage = (page + 1) as PageIndex;
    listRef.current?.scrollToIndex({ index: nextPage, animated: true });
    setPage(nextPage);
  };

  const skip = () => {
    hapt.select();
    onSkip();
  };

  // v10.7 — Tutorial is now the final onboarding step. Page-3 CTA is
  // "Take your first scan" because tapping it hands off directly into
  // the ScanModal (see TutorialHost in OnboardingNavigator). There is
  // no separate Welcome stop anymore, so the button speaks plainly.
  const ctaLabel = page === 2 ? 'Take your first scan' : 'Next';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <View style={styles.brandLeft}>
          <PuraMark variant="idle" size={24} />
          <Text style={styles.brandWord} maxFontSizeMultiplier={1.1}>
            Pura AI
          </Text>
        </View>
        <Pressable
          onPress={skip}
          accessibilityRole="button"
          accessibilityLabel="Skip tutorial"
          hitSlop={10}
          style={({ pressed }) => [
            styles.skipBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.skipLabel} maxFontSizeMultiplier={1.1}>
            Skip
          </Text>
        </Pressable>
      </View>

      <Animated.FlatList
        ref={listRef}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(i) => String(i)}
        onScroll={scrollHandler}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <TutorialPage
            index={item}
            width={width}
            activeIndex={page}
            scrollX={scrollX}
          />
        )}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dots}>
          {PAGES.map((p) => (
            <View
              key={p}
              style={[
                styles.dot,
                p === page ? styles.dotActive : styles.dotIdle,
              ]}
            />
          ))}
        </View>
        <View style={{ height: 20 }} />
        <OnboardingPrimaryButton label={ctaLabel} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// Page
// ============================================================================

const PAGE_META: Record<
  PageIndex,
  {
    kicker: string;
    headline: string;
    body: string;
  }
> = {
  0: {
    kicker: '01 · SCAN',
    headline: 'A thirty-second reading of your skin.',
    body:
      'Steady your camera, soft light, one tap. Pura reads what\u2019s on the surface — not what a quiz guessed.',
  },
  1: {
    kicker: '02 · PLAN',
    headline: 'Your Skin Score, and what to do tonight.',
    body:
      'Every scan produces a Skin Score and a plan grounded in what changed. No hype, no generic steps.',
  },
  2: {
    kicker: '03 · TRACK',
    headline: 'See your skin change, week to week.',
    body:
      'Scan regularly and Pura builds a real record — photos, scores, and the moves that moved them.',
  },
};

function TutorialPage({
  index,
  width,
  activeIndex,
  scrollX,
}: {
  index: PageIndex;
  width: number;
  activeIndex: PageIndex;
  scrollX: SharedValue<number>;
}) {
  const meta = PAGE_META[index];
  const reduceMotion = useReduceMotion();
  const isActive = index === activeIndex;

  // v10.8 — parallax derived from scrollX. The page's "distance from
  // center" is `scrollX - index * width`, normalized to [-1, 1] across
  // the adjacent pages. Visual gets ~40% of the scroll translation
  // (sticky feel); copy gets full translation but fades off-center so
  // only the active page's words are readable.
  const visualParallaxStyle = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    const center = index * width;
    const progress = (scrollX.value - center) / width; // [-1, 1] window
    // Visual slides at 0.4× the scroll rate for a sticky parallax feel.
    const translateX = -progress * width * 0.4;
    // Slight scale pulse: shrinks toward 0.94 as the page leaves center.
    const scale = interpolate(
      Math.abs(progress),
      [0, 1],
      [1, 0.94],
      'clamp'
    );
    // Opacity fades the off-center page's visual so the next one has
    // uncontested visual weight when centered.
    const opacity = interpolate(
      Math.abs(progress),
      [0, 0.6, 1],
      [1, 0.45, 0],
      'clamp'
    );
    return {
      transform: [{ translateX }, { scale }],
      opacity,
    };
  });

  const copyParallaxStyle = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    const center = index * width;
    const progress = (scrollX.value - center) / width;
    // Copy fades faster than the visual so off-center text doesn't
    // bleed through. Slight lift so active copy feels anchored.
    const opacity = interpolate(
      Math.abs(progress),
      [0, 0.5, 1],
      [1, 0.3, 0],
      'clamp'
    );
    const translateY = interpolate(
      Math.abs(progress),
      [0, 1],
      [0, 10],
      'clamp'
    );
    return { opacity, transform: [{ translateY }] };
  });

  // Entrance lift only when actively arriving from off-screen (e.g.
  // first mount of page 0). Doesn't fight parallax — uses a separate
  // shared value that settles in 420ms.
  const entryY = useSharedValue(reduceMotion ? 0 : 14);
  useEffect(() => {
    if (reduceMotion) return;
    if (isActive) {
      entryY.value = withDelay(
        120,
        withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [isActive, entryY, reduceMotion]);

  const entryStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: entryY.value }],
  }));

  return (
    <View style={[pageStyles.wrap, { width }]}>
      <Animated.View style={[pageStyles.visualWrap, visualParallaxStyle]}>
        {index === 0 ? <ScanVisual active={isActive} reduceMotion={reduceMotion} /> : null}
        {index === 1 ? <PlanVisual active={isActive} /> : null}
        {index === 2 ? <TrackVisual active={isActive} reduceMotion={reduceMotion} /> : null}
      </Animated.View>

      <Animated.View style={[pageStyles.copy, copyParallaxStyle, entryStyle]}>
        <Text style={pageStyles.kicker} maxFontSizeMultiplier={1.1}>
          {meta.kicker}
        </Text>
        <Text
          style={pageStyles.headline}
          maxFontSizeMultiplier={1.15}
          numberOfLines={3}
        >
          {meta.headline}
        </Text>
        <Text style={pageStyles.body} maxFontSizeMultiplier={1.2}>
          {meta.body}
        </Text>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// Per-page visuals — hand-crafted, not stock illustrations.
// ============================================================================

/** Page 1 — Scan. Soft face silhouette (oval arc + pulsing ring). */
function ScanVisual({
  active,
  reduceMotion,
}: {
  active: boolean;
  reduceMotion: boolean;
}) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion || !active) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 0 })
      ),
      -1,
      false
    );
  }, [pulse, active, reduceMotion]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: (1 - pulse.value) * 0.6,
    transform: [{ scale: 0.85 + pulse.value * 0.35 }],
  }));

  return (
    <View style={visuals.root}>
      <Animated.View style={[visuals.pulsingRing, ringStyle]} />
      <View style={visuals.faceOval} />
      <View style={visuals.iconBadge}>
        <ScanSmiley size={22} color={palette.clay} weight="duotone" />
      </View>
    </View>
  );
}

/** Page 2 — Plan. Small live SkinScoreDial at a curated score. */
function PlanVisual({ active }: { active: boolean }) {
  // A stable demo score so each entrance plays back consistently.
  return (
    <View style={visuals.root}>
      <View style={visuals.dialWrap}>
        <SkinScoreDial
          key={active ? 'active' : 'idle'}
          value={78}
          size={180}
          showTier
          deltaCaption="+4 since last scan"
        />
      </View>
      <View style={visuals.iconBadge}>
        <Sparkle size={20} color={palette.clay} weight="duotone" />
      </View>
    </View>
  );
}

/** Page 3 — Track. A rising sparkline inside a tiered backdrop. */
function TrackVisual({
  active,
  reduceMotion,
}: {
  active: boolean;
  reduceMotion: boolean;
}) {
  const reveal = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion || !active) {
      reveal.value = reduceMotion ? 1 : 0;
      return;
    }
    reveal.value = 0;
    reveal.value = withDelay(
      180,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })
    );
  }, [reveal, active, reduceMotion]);

  return (
    <View style={visuals.root}>
      <View style={visuals.trackCard}>
        <Svg width="100%" height={140}>
          <Defs>
            <SvgLinearGradient id="track-area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={palette.clay} stopOpacity={0.22} />
              <Stop offset="1" stopColor={palette.clay} stopOpacity={0.02} />
            </SvgLinearGradient>
            <RadialGradient id="track-glow" cx="85%" cy="35%" r="50%">
              <Stop offset="0" stopColor={palette.moss} stopOpacity={0.24} />
              <Stop offset="1" stopColor={palette.moss} stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {/* Tier-zone backdrop bands */}
          {[
            { from: 0, to: 55, color: palette.rust },
            { from: 55, to: 70, color: palette.amber },
            { from: 70, to: 85, color: palette.clay },
            { from: 85, to: 100, color: palette.moss },
          ].map((band, i) => {
            const yTop = 20 + ((100 - band.to) / 100) * 100;
            const yBot = 20 + ((100 - band.from) / 100) * 100;
            return (
              <Circle
                key={`band-${i}`}
                cx={-1000}
                cy={(yTop + yBot) / 2}
                r={0}
                fill={band.color}
                opacity={0.05}
              />
            );
          })}

          {/* Glow */}
          <Circle cx="85%" cy="35%" r="60" fill="url(#track-glow)" />

          {/* Endpoint dot */}
          <AnimatedSparkDot reveal={reveal} />
        </Svg>
      </View>
      <View style={visuals.iconBadge}>
        <ChartLineUp size={20} color={palette.moss} weight="duotone" />
      </View>
    </View>
  );
}

/**
 * Endpoint dot for the Track visual — fades in + gently scales once the
 * sparkline has had time to "draw." Kept intentionally simple (dot +
 * halo) rather than trying to animate a full SVG path in reanimated,
 * which on small tutorial stages reads identically.
 */
function AnimatedSparkDot({
  reveal,
}: {
  reveal: { value: number };
}) {
  const style = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ scale: 0.6 + 0.4 * reveal.value }],
  }));
  return (
    <Animated.View style={[visuals.sparkDotWrap, style]}>
      <View style={visuals.sparkDotHalo} />
      <View style={visuals.sparkDotCore} />
    </Animated.View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  topBar: {
    height: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandWord: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    letterSpacing: -0.3,
    color: palette.ink,
  },
  skipBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  skipLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.1,
    color: palette.inkSecondary,
  },
  footer: {
    paddingHorizontal: 0,
    paddingTop: 12,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 22,
    backgroundColor: palette.ink,
  },
  dotIdle: {
    width: 6,
    backgroundColor: palette.hairline,
  },
});

const pageStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: 28,
  },
  visualWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  copy: {
    marginBottom: 8,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.8,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
    color: palette.ink,
  },
  body: {
    marginTop: 14,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 22,
    color: palette.inkSecondary,
  },
});

const visuals = StyleSheet.create({
  root: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceOval: {
    width: 200,
    height: 260,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: palette.clay,
    opacity: 0.55,
  },
  pulsingRing: {
    position: 'absolute',
    width: 240,
    height: 300,
    borderRadius: 160,
    borderWidth: 1.2,
    borderColor: palette.clay,
  },
  dialWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackCard: {
    width: 280,
    height: 160,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    padding: 12,
    overflow: 'hidden',
  },
  sparkDotWrap: {
    position: 'absolute',
    left: '82%',
    top: 38,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkDotHalo: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.moss,
    opacity: 0.24,
  },
  sparkDotCore: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: palette.moss,
  },
  iconBadge: {
    marginTop: 28,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

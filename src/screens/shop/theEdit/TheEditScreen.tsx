/**
 * THE EDIT — the Shop tab. The back half of the scan: Pura's curation of YOUR
 * skin's products, a living personal collection a companion tends. Editorial,
 * intimate, calm, dimensional. Three parallax planes (atmospheric BACK · cards
 * MID · bled photos FRONT), a curation SET-DOWN on enter, concern-threaded
 * sections that unfold on scroll, honest replenishment as the hero.
 *
 * Renders ONLY from `useSkinShop` — every product is tied to a finding, the
 * kept routine, or a concern. All motion is Reanimated worklets / rAF on the UI
 * thread; never setTimeout. Stills under reduce-motion.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useAppStore } from '@/store/useAppStore';
import { hapt } from '@/utils/haptics';
import type { RootStackParamList } from '@/navigation/types';
import type { ConcernType } from '@/ai/ai-contracts';
import type { AuroraOrbHandle } from '@/components/AuroraOrb';
import { useSkinShop } from '@/screens/shop/skinShop';
import type { ConcernPick } from '@/screens/shop/skinShop';

import { AtmosphericLight } from './AtmosphericLight';
import { RevealOnScroll } from './RevealOnScroll';
import { ConcernChips, type ChipKey } from './ConcernChips';
import { CollectionCard } from './CollectionCard';
import { ConcernPickCard } from './ConcernPickCard';
import { EditHeader } from './EditHeader';
import { EmptyState } from './EmptyState';
import { edit, space, type, motion } from './tokens';

// Orb-voice intro per concern (warm, tied to what was seen).
const CONCERN_INTRO: Partial<Record<ConcernType, string>> = {
  redness: 'For the warmth on your skin',
  sensitivity: 'For when your skin gets reactive',
  hydration: 'For the dry patches',
  breakouts: 'For the breakouts',
  dark_marks: 'For the marks left behind',
  texture: 'For the uneven texture',
  oiliness: 'For the midday shine',
  pores: 'For the look of your pores',
};

// Header title that references the top finding.
const TITLE_BY_CONCERN: Partial<Record<ConcernType, string>> = {
  redness: 'Calmer skin, in a few steps',
  sensitivity: 'Calmer, steadier skin',
  hydration: 'Softer, more comfortable skin',
  breakouts: 'Clearer skin, step by step',
  dark_marks: 'More even skin, over time',
  texture: 'Smoother skin, gently',
  oiliness: 'Balanced, fresher skin',
  pores: 'Refined, clearer skin',
};

export function TheEditScreen() {
  const model = useSkinShop();
  const insets = useSafeAreaInsets();
  const { height: viewportH } = useWindowDimensions();
  // `?screen=shop&rm=1` (web) forces reduce-motion so the page can be captured
  // for visual review (the orb's idle loop otherwise keeps the renderer busy).
  // Preserve this OR — do not remove the forced flag.
  const forcedReduceMotion =
    Platform.OS === 'web' &&
    (() => {
      try {
        return new URLSearchParams(
          (globalThis as unknown as { location?: { search?: string } }).location?.search ?? '',
        ).get('rm') === '1';
      } catch {
        return false;
      }
    })();
  const reduceMotion = useReducedMotion() || forcedReduceMotion;

  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const orbRef = useRef<AuroraOrbHandle>(null);

  const routine = useAppStore(
    useShallow((s) => ({ morning: s.userRoutineMorning, evening: s.userRoutineEvening })),
  );
  const addToRoutine = useAppStore((s) => s.addUserRoutineProduct);
  const inRoutine = useCallback(
    (id: string) =>
      (routine.morning?.includes(id) ?? false) || (routine.evening?.includes(id) ?? false),
    [routine],
  );

  const [selected, setSelected] = useState<ChipKey>('all');
  // EditHeader no longer self-measures (it owns a fixed height); reserve enough
  // for the eyebrow + a 2-line serif title + the tint underline.
  const headerH = insets.top + 112;

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // ── THE CURATION SET-DOWN — one calm orb pulse, then the cards arrive. ──────
  useEffect(() => {
    if (reduceMotion) return;
    const raf = requestAnimationFrame(() => orbRef.current?.emphasisPulse?.());
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  // ── Chip re-thread: cross-fade out (140) → swap → fade in (200) + 8px reflow.
  const feedOpacity = useSharedValue(1);
  const feedY = useSharedValue(0);
  const applySelection = useCallback(
    (key: ChipKey) => {
      setSelected(key);
      feedY.value = motion.chipReflowPx;
      feedOpacity.value = withTiming(1, { duration: motion.chipFadeInMs, easing: Easing.out(Easing.cubic) });
      feedY.value = withTiming(0, { duration: motion.chipFadeInMs, easing: Easing.out(Easing.cubic) });
    },
    [feedOpacity, feedY],
  );
  const onSelectChip = useCallback(
    (key: ChipKey) => {
      if (key === selected) return;
      if (reduceMotion) {
        setSelected(key);
        return;
      }
      feedOpacity.value = withTiming(
        0,
        { duration: motion.chipFadeOutMs, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(applySelection)(key);
        },
      );
    },
    [selected, reduceMotion, feedOpacity, applySelection],
  );
  // The concern sections are the MID plane: they ride the chip re-thread reflow
  // AND a bounded mid-plane parallax (a few px faster than the cards) so all
  // three planes move at distinct rates. Bounded — never a gimmick.
  const feedStyle = useAnimatedStyle(() => ({
    opacity: feedOpacity.value,
    transform: [
      {
        translateY:
          feedY.value - Math.min(scrollY.value * motion.midDrift, motion.midDriftMaxPx),
      },
    ],
  }));

  const onReorder = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {});
  }, []);
  const onAdd = useCallback(
    (id: string) => {
      addToRoutine('evening', id);
    },
    [addToRoutine],
  );
  const onScan = useCallback(() => {
    hapt.select();
    nav.navigate('ScanModal');
  }, [nav]);

  // ── Empty state — no scan, no products. ─────────────────────────────────────
  if (model.status === 'notScanned') {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <AtmosphericLight scrollY={scrollY} reduceMotion={reduceMotion} />
        <EmptyState onScan={onScan} reduceMotion={reduceMotion} topInset={insets.top} />
      </View>
    );
  }

  const topConcern = model.concerns[0]?.concern;
  const title = (topConcern && TITLE_BY_CONCERN[topConcern]) || 'Curated for your skin';
  const topTint = model.concerns[0]?.tintHex ?? edit.blue;
  // Finding-grounded eyebrow: "FOR YOUR REDNESS", falling back to skin.
  const eyebrow = topConcern
    ? `FOR YOUR ${(model.concerns[0]?.label ?? 'skin').toUpperCase()}`
    : 'FOR YOUR SKIN';

  // Hero row: the featured piece leads; the rest follow. One focal point even
  // without a real restock (featuredRestock ?? the first kept item).
  const featured = model.featuredRestock ?? model.collection[0] ?? null;
  const rest = model.collection.filter((c) => c.product.id !== featured?.product.id);

  const chipItems = useMemo(
    () => [
      { key: 'all' as ChipKey, label: 'All' },
      ...model.concerns.map((c) => ({ key: c.concern as ChipKey, label: c.label })),
    ],
    [model.concerns],
  );

  const visibleConcerns = model.concerns.filter(
    (c) => selected === 'all' || c.concern === selected,
  );

  const contentLeft = space.gutter;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <AtmosphericLight scrollY={scrollY} reduceMotion={reduceMotion} />
      <ContinuityWisp tint={topTint} reduceMotion={reduceMotion} />

      <EditHeader
        title={title}
        eyebrow={eyebrow}
        tintHex={topTint}
        scrollY={scrollY}
        orbRef={orbRef}
        reduceMotion={reduceMotion}
        topInset={insets.top}
        contentLeft={contentLeft}
      />

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: headerH + 8, paddingBottom: insets.bottom + 96 }}
      >
        {/* CONCERN CHIPS */}
        <View style={{ marginTop: space.m, marginBottom: space.section - space.s }}>
          <ConcernChips items={chipItems} selected={selected} onSelect={onSelectChip} contentLeft={contentLeft} />
        </View>

        {/* YOUR COLLECTION — the hero region (reorder). The featured piece is a
            full-width portrait still-life; the rest follow in a compact row. */}
        {model.collection.length > 0 ? (
          <RevealOnScroll scrollY={scrollY} viewportH={viewportH} index={0} reduceMotion={reduceMotion}>
            <View style={{ paddingHorizontal: contentLeft }}>
              <Text style={type.section}>What you're using</Text>
              <Text style={[type.sub, { marginTop: space.xs }]}>
                Yours to reorder — replenishment first.
              </Text>
              {featured ? (
                <View style={{ marginTop: space.m }}>
                  <CollectionCard
                    item={featured}
                    featured
                    fullWidthHero
                    tint={topTint}
                    scrollY={scrollY}
                    onReorder={onReorder}
                  />
                </View>
              ) : null}
            </View>
            {rest.length > 0 ? (
              <>
                <Text
                  style={[type.eyebrow, { paddingHorizontal: contentLeft, marginTop: space.section - space.s }]}
                >
                  ALSO IN YOUR ROUTINE
                </Text>
                <Animated.ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: contentLeft, gap: space.m, paddingTop: space.m, paddingBottom: 8 }}
                >
                  {rest.map((c) => (
                    <CollectionCard key={c.product.id} item={c} scrollY={scrollY} onReorder={onReorder} />
                  ))}
                </Animated.ScrollView>
              </>
            ) : null}
          </RevealOnScroll>
        ) : null}

        {/* FOR YOUR CONCERNS — editorial sections, one per active finding. */}
        <Animated.View style={feedStyle}>
          {visibleConcerns.map((c, i) => {
            const picks = model.filterPicksByConcern(c.concern);
            if (picks.length === 0) return null;
            return (
              <ConcernSection
                key={`${c.concern}-${selected}`}
                concern={c.concern}
                label={c.label}
                picks={picks}
                index={i + 1}
                scrollY={scrollY}
                viewportH={viewportH}
                reduceMotion={reduceMotion}
                inRoutine={inRoutine}
                onAdd={onAdd}
                contentLeft={contentLeft}
              />
            );
          })}
        </Animated.View>

        {/* FOOTER */}
        <View style={[styles.footer, { paddingHorizontal: contentLeft }]}>
          <Text style={[type.sub, { textAlign: 'center' }]}>
            Your routine works even if you buy nothing.
          </Text>
          <Text style={[type.disclosure, { textAlign: 'center', marginTop: space.xs }]}>
            Some links go to Amazon; Pura may earn a small commission at no cost to you.
          </Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

/**
 * ConcernSection — one finding's editorial section. Owns a one-shot `bloom`
 * shared value fired by RevealOnScroll's onReveal as the section enters view;
 * the bloom is handed to the FIRST pick so its finding-echo glow swells once —
 * the scan's glow becoming the product's echo. Worklet-only; still under
 * reduce-motion.
 */
function ConcernSection({
  concern,
  label,
  picks,
  index,
  scrollY,
  viewportH,
  reduceMotion,
  inRoutine,
  onAdd,
  contentLeft,
}: {
  concern: ConcernType;
  label: string;
  picks: ConcernPick[];
  index: number;
  scrollY: SharedValue<number>;
  viewportH: number;
  reduceMotion: boolean;
  inRoutine: (id: string) => boolean;
  onAdd: (id: string) => void;
  contentLeft: number;
}) {
  const bloom = useSharedValue(0);
  const onReveal = useCallback(() => {
    if (reduceMotion) return;
    bloom.value = withSequence(
      withTiming(motion.echoBloomTo, { duration: motion.echoBloomInMs, easing: Easing.out(Easing.cubic) }),
      withDelay(
        motion.echoBloomHoldMs,
        withTiming(0, { duration: motion.echoBloomOutMs, easing: Easing.in(Easing.quad) }),
      ),
    );
  }, [reduceMotion, bloom]);

  return (
    <RevealOnScroll
      scrollY={scrollY}
      viewportH={viewportH}
      index={index}
      reduceMotion={reduceMotion}
      onReveal={onReveal}
      style={{ marginTop: space.section, paddingHorizontal: contentLeft }}
    >
      <Text style={type.concernIntro}>
        {CONCERN_INTRO[concern] ?? `For your ${label.toLowerCase()}`}
      </Text>
      <View style={{ marginTop: space.m, gap: space.m }}>
        {picks.map((p, idx) => (
          <ConcernPickCard
            key={`${p.forFindingId}:${p.product.id}`}
            pick={p}
            reduceMotion={reduceMotion}
            inRoutine={inRoutine(p.product.id)}
            onAdd={onAdd}
            bloom={idx === 0 ? bloom : undefined}
          />
        ))}
      </View>
    </RevealOnScroll>
  );
}

/** Scan→shop continuity: a faint wisp of the last finding's glow that carries
 *  in near the orb, then fades — so the shop feels like the same companion. */
function ContinuityWisp({ tint, reduceMotion }: { tint: string; reduceMotion: boolean }) {
  const o = useSharedValue(reduceMotion ? 0 : 0.16);
  useEffect(() => {
    if (reduceMotion) return;
    o.value = withDelay(280, withTiming(0, { duration: 1500, easing: Easing.in(Easing.quad) }));
  }, [reduceMotion, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View pointerEvents="none" style={[styles.wisp, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="edit-wisp" cx="78%" cy="14%" r="40%">
            <Stop offset="0%" stopColor={tint} stopOpacity={1} />
            <Stop offset="100%" stopColor={tint} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#edit-wisp)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: edit.porcelain },
  footer: { marginTop: space.section, alignItems: 'center' },
  wisp: { position: 'absolute', top: 0, left: 0, right: 0, height: 240, zIndex: 1 },
});

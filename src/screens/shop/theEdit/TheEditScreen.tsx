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
import { Linking, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
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
  const reduceMotion = useReducedMotion();

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
  const [headerH, setHeaderH] = useState(insets.top + 96);

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
  const feedStyle = useAnimatedStyle(() => ({
    opacity: feedOpacity.value,
    transform: [{ translateY: feedY.value }],
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
        scrollY={scrollY}
        orbRef={orbRef}
        reduceMotion={reduceMotion}
        topInset={insets.top}
        contentLeft={contentLeft}
        onHeight={setHeaderH}
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

        {/* YOUR COLLECTION — the hero region (reorder). */}
        {model.collection.length > 0 ? (
          <RevealOnScroll scrollY={scrollY} viewportH={viewportH} index={0} reduceMotion={reduceMotion}>
            <View style={{ paddingHorizontal: contentLeft }}>
              <Text style={type.section}>What you're using</Text>
              <Text style={[type.sub, { marginTop: space.xs }]}>
                Yours to reorder — replenishment first.
              </Text>
            </View>
            <Animated.ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: contentLeft, gap: space.m, paddingTop: space.m, paddingBottom: 8 }}
              style={{ marginTop: space.s }}
            >
              {featured ? (
                <CollectionCard item={featured} featured scrollY={scrollY} onReorder={onReorder} />
              ) : null}
              {rest.map((c) => (
                <CollectionCard key={c.product.id} item={c} scrollY={scrollY} onReorder={onReorder} />
              ))}
            </Animated.ScrollView>
          </RevealOnScroll>
        ) : null}

        {/* FOR YOUR CONCERNS — editorial sections, one per active finding. */}
        <Animated.View style={feedStyle}>
          {visibleConcerns.map((c, i) => {
            const picks = model.filterPicksByConcern(c.concern);
            if (picks.length === 0) return null;
            return (
              <RevealOnScroll
                key={`${c.concern}-${selected}`}
                scrollY={scrollY}
                viewportH={viewportH}
                index={i + 1}
                reduceMotion={reduceMotion}
                style={{ marginTop: space.section, paddingHorizontal: contentLeft }}
              >
                <Text style={type.concernIntro}>{CONCERN_INTRO[c.concern] ?? `For your ${c.label.toLowerCase()}`}</Text>
                <Text style={[type.sub, { marginTop: space.xs }]}>Ranked by fit to what I saw — never by price.</Text>
                <View style={{ marginTop: space.m, gap: space.m }}>
                  {picks.map((p) => (
                    <ConcernPickCard
                      key={`${p.forFindingId}:${p.product.id}`}
                      pick={p}
                      reduceMotion={reduceMotion}
                      inRoutine={inRoutine(p.product.id)}
                      onAdd={onAdd}
                    />
                  ))}
                </View>
              </RevealOnScroll>
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

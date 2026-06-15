/**
 * YourSkinScreen — the FINAL, canonical Pura scan-results screen 2 ("Your
 * Skin"), reached when the user taps "See everything →" on the first-finding
 * screen. It is network-decoupled (prop-driven, like SeenIntoFocusScreen): it
 * consumes a canonical, validated `SkinRead` (WITH the screen-2 plan fields) and
 * NEVER runs a new scan or reads raw AI output.
 *
 * THE SPINE
 *   1. Reduce decisions — the plan arrives ALREADY SET; the user follows it.
 *   2. Input to a plan, not a diagnosis — findings are ingredients; the screen
 *      opens and closes on forward motion and never lands on a flaw.
 *
 * THE "TOO MUCH" RULE — the default canvas is the most serene version possible:
 *   orb + synthesis + horizon · a calm map (only the hero glow) · one hero
 *   finding · an already-made plan · one button. Every power feature (the
 *   toggles, the co-shape touch, the share artifact) is invisible until invited.
 *
 * Reuse, not rebuild: the AuroraOrb is a PERSISTENT shared element (a single
 * sticky instance, never re-mounted as you scroll); the map reuses the SAME
 * additive glow renderer + the SAME once-computed face landmarks as screen 1.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import { type AssistantOrbState } from '@/screens/assistant/AssistantAuroraOrb';
import { ResultsOrb } from '@/components/ResultsOrb';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useReduceTransparency } from '@/hooks/useReduceTransparency';
import {
  DEFAULT_FACE_BOX,
  type FaceBox,
  type FaceLandmarks,
} from '../firstFinding/faceRegions';
import { metricTint, type MetricTint, type ScreenTheme } from '../firstFinding/metricTint';
import type { SkinRead } from '@/types/skinRead';
import { hapt } from '@/utils/haptics';

import { buildYourSkinViewModel } from './viewModel';
import { guardRead } from './coverageGuard';
import { LAYOUT, SECTION_GAP, COPY2, TYPE2, tokensFor } from './yourSkinMotion';
import { SectionReveal } from './SectionReveal';
import { SynthesisSection } from './SynthesisSection';
import { SkinMapCard, type ToneBackdrop } from './SkinMapCard';
import { FindingsSection } from './FindingsSection';
import { PlanSection } from './PlanSection';
import { CommitSection } from './CommitSection';
import { BadPhotoBanner } from './BadPhotoBanner';
import { ShareArtifactCard } from './ShareArtifactCard';

const AScrollView = Animated.ScrollView;

export interface YourSkinScreenProps {
  read: SkinRead;
  /** The captured selfie URI (production). */
  photoUri?: string;
  /** Offline/dev stand-in for the captured frame when there is no photoUri. */
  toneBackdrop?: ToneBackdrop;
  /** Face landmarks computed ONCE on the captured frame (screen 1). */
  faceBox?: FaceBox;
  /** REAL capture-moment anchors (landmarksFromCaptureQuality). When present
   *  the skin-map glow affine-warps to the actual face; absent → faceBox. */
  landmarks?: FaceLandmarks;
  mirrored?: boolean;
  /** DARK is the hero, unbroken from screens 1–2. */
  theme?: ScreenTheme;
  /** Onboarding goal — for the share card / a11y fallbacks. */
  goal?: string;
  dateLabel?: string;

  onBuildRoutine: () => void;
  onDoLater?: () => void;
  onRescan?: () => void;
  /** Persist a "not me" down-weight so it survives the session. */
  onDownweightFinding?: (id: string, downweighted: boolean) => void;
  onShareDayOne?: () => void;

  forceReduceMotion?: boolean;
  forceReduceTransparency?: boolean;
}

export function YourSkinScreen(props: YourSkinScreenProps) {
  const {
    read,
    photoUri,
    toneBackdrop = 'medium',
    faceBox = DEFAULT_FACE_BOX,
    landmarks,
    mirrored = true,
    theme = 'dark',
    dateLabel = 'Today',
    onBuildRoutine,
    onDoLater,
    onRescan,
    onDownweightFinding,
    onShareDayOne,
    forceReduceMotion,
    forceReduceTransparency,
  } = props;

  const sysReduceMotion = useReduceMotion();
  const sysReduceTransparency = useReduceTransparency();
  const reduceMotion = forceReduceMotion ?? sysReduceMotion;
  const reduceTransparency = forceReduceTransparency ?? sysReduceTransparency;

  const insets = useSafeAreaInsets();
  const tokens = useMemo(() => tokensFor(theme), [theme]);

  // Coverage-cap guard: strip any over-cap spot / whole-face wash BEFORE the
  // screen derives anything, so a wash is impossible to render and the markers,
  // tints, plan, and map all read the SAME sanitized findings. Honest data passes
  // through untouched; a flagged wash signals the upstream normalizer to regenerate.
  const { findings: guardedFindings, report: coverageReport } = useMemo(() => guardRead(read), [read]);
  const gRead = useMemo(() => ({ ...read, findings: guardedFindings }), [read, guardedFindings]);
  useEffect(() => {
    if (__DEV__ && coverageReport.regenerateAdvised) {
      console.warn('[YourSkin] coverage-cap guard rejected a whole-face wash — regenerate advised:', coverageReport.rejectedIds);
    }
  }, [coverageReport]);
  const vm = useMemo(() => buildYourSkinViewModel(gRead), [gRead]);

  const findingsById = useMemo(() => {
    const m: Record<string, (typeof gRead.findings)[number]> = {};
    for (const f of gRead.findings) m[f.id] = f;
    return m;
  }, [gRead.findings]);

  const tintByFinding = useMemo(() => {
    const m: Record<string, MetricTint> = {};
    for (const f of gRead.findings) m[f.id] = metricTint(f.metric, theme);
    return m;
  }, [gRead.findings, theme]);

  // ── Screen state ──────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(vm.hero?.id ?? null);
  const [collapsed, setCollapsed] = useState(false);
  const [justFindings, setJustFindings] = useState(false);
  const [downweighted, setDownweighted] = useState<Set<string>>(new Set());
  const [coShapePriorityId, setCoShapePriorityId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [planPlay, setPlanPlay] = useState(false);
  const [orbState, setOrbState] = useState<AssistantOrbState>('idle');

  const badPhoto = read.photoCheck.betterPhotoWouldHelp;
  const lowConfidence = badPhoto || read.sureLevel === 'not totally sure in this light';
  const summaryLine = read.skinSummaryLine || read.openingLine || '';
  const hasContent = !!vm.hero || !!summaryLine || vm.moves.length > 0;

  // The active glow = the selected finding IF it has spots and isn't eased off.
  const activeGlowId = useMemo(() => {
    if (!selectedId) return null;
    const f = findingsById[selectedId];
    if (!f || f.spots.length === 0 || downweighted.has(f.id)) return null;
    return f.id;
  }, [selectedId, findingsById, downweighted]);

  // Co-shape: the move that addresses the bumped finding floats to the top.
  const displayMoves = useMemo(() => {
    if (!coShapePriorityId) return vm.moves;
    const idx = vm.moves.findIndex((m) => m.addressesIds.includes(coShapePriorityId));
    if (idx <= 0) return vm.moves;
    const copy = vm.moves.slice();
    const [m] = copy.splice(idx, 1);
    copy.unshift(m);
    return copy;
  }, [vm.moves, coShapePriorityId]);

  // A co-shape chip MUST map to a real plan move — otherwise tapping it would
  // claim "I put that first" while the plan visibly doesn't change (a false
  // confirmation). So we only offer chips for findings some move addresses.
  const addressedIds = useMemo(() => {
    const s = new Set<string>();
    for (const m of vm.moves) for (const id of m.addressesIds) s.add(id);
    return s;
  }, [vm.moves]);

  const concernFindings = useMemo(
    () => gRead.findings.filter(
      (f) => f.metric !== 'positive' && f.spots.length > 0 && !downweighted.has(f.id) && addressedIds.has(f.id),
    ),
    [gRead.findings, downweighted, addressedIds],
  );

  // ── Warm orb beats — a single sticky instance, gently reactive. ─────────────
  const beatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warmBeat = useCallback(() => {
    setOrbState('responding');
    if (beatTimer.current) clearTimeout(beatTimer.current);
    beatTimer.current = setTimeout(() => setOrbState('idle'), 1800);
  }, []);
  useEffect(() => {
    // Greeting beat as the orb "speaks" the synthesis on arrival.
    warmBeat();
    return () => { if (beatTimer.current) clearTimeout(beatTimer.current); };
  }, [warmBeat]);

  // ── Scroll plumbing for the reveals + bidirectional scroll-into-view. ───────
  const scrollY = useSharedValue(0);
  const scrollRef = useRef<any>(null);
  const [viewportH, setViewportH] = useState(Dimensions.get('window').height);
  const findingsTop = useRef(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
  });
  const onScrollViewLayout = (e: LayoutChangeEvent) => setViewportH(e.nativeEvent.layout.height);

  // ── Selection handlers (bidirectional sync) ─────────────────────────────────
  const selectFromList = useCallback((id: string) => setSelectedId(id), []);
  const selectFromMap = useCallback((id: string) => {
    setSelectedId(id);
    // Tap a marker → its finding surfaces. Bring the findings list into view.
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo?.({ y: Math.max(0, findingsTop.current - 96), animated: true });
    });
  }, []);

  const onAgency = useCallback((id: string, verdict: 'confirm' | 'not_me') => {
    setDownweighted((prev) => {
      const next = new Set(prev);
      const willDown = verdict === 'not_me';
      if (willDown) next.add(id); else next.delete(id);
      onDownweightFinding?.(id, willDown);
      return next;
    });
    if (verdict === 'not_me') {
      hapt.select();
      // Clear its map emphasis — fall back to the hero (if distinct) or nothing.
      setSelectedId((cur) => (cur === id ? (vm.hero && vm.hero.id !== id ? vm.hero.id : null) : cur));
      // If the rejected finding WAS the co-shaped priority, drop the priority —
      // otherwise "Good to know — I put that first." lingers (and its move stays
      // pinned, chip-less) for a finding the user just rejected.
      setCoShapePriorityId((cur) => (cur === id ? null : cur));
    } else {
      hapt.tap();
    }
  }, [onDownweightFinding, vm.hero]);

  const onCoShape = useCallback((id: string) => { setCoShapePriorityId(id); }, []);

  // Data-error / empty read → a calm, honest empty state. Never fabricate.
  if (!hasContent) {
    return <EmptyState tokens={tokens} theme={theme} insets={insets} orbState={orbState} scanTone={vm.scanTone} onRescan={onRescan} onDoLater={onDoLater} />;
  }

  const gutter = LAYOUT.gutter;
  let sectionIndex = 0;

  return (
    <View style={[styles.root, { backgroundColor: tokens.bg }]}>
      <StatusBar style={tokens.barStyle} />

      {/* Faint radial lift behind the orb. */}
      <LinearGradient
        colors={[tokens.bgLift, tokens.bg]}
        style={[styles.bgLift, { height: 220 + insets.top }]}
        pointerEvents="none"
      />

      {/* ── Persistent sticky header — the SINGLE orb instance + quiet options. ── */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerSide} />
        <ResultsOrb state={orbState} size={56} scanTone={vm.scanTone} />
        <View style={styles.headerSide}>
          <Pressable
            onPress={() => { setOptionsOpen((o) => !o); hapt.select(); }}
            accessibilityRole="button"
            accessibilityLabel={COPY2.moreOptions}
            hitSlop={10}
            style={styles.optionsBtn}
          >
            <Text style={{ color: tokens.faint, fontSize: 22, lineHeight: 22, fontFamily: 'Inter-SemiBold' }}>⋯</Text>
          </Pressable>
        </View>
      </View>

      {/* Quiet options sheet — holds the invisible-until-invited toggles. */}
      {optionsOpen && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOptionsOpen(false)} accessibilityElementsHidden />
          <View style={[styles.optionsPanel, { top: insets.top + 56, right: gutter, borderColor: tokens.depth.hairline, overflow: 'hidden' }]}>
            {/* Real glass — native blur + a tint wash + a top-edge light hairline.
                Reduce Transparency falls back to the solid card surface (a11y). */}
            {reduceTransparency ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.cardSurface }]} pointerEvents="none" />
            ) : (
              <>
                <BlurView intensity={28} tint={theme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: theme === 'dark' ? 'rgba(20,22,30,0.52)' : 'rgba(255,255,255,0.58)' }]} pointerEvents="none" />
                <LinearGradient colors={[theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)', 'transparent']} style={styles.glassTopLight} pointerEvents="none" />
              </>
            )}
            <OptionRow
              label={justFindings ? COPY2.warmView : COPY2.justFindings}
              tokens={tokens}
              onPress={() => { setJustFindings((v) => !v); setOptionsOpen(false); hapt.select(); }}
            />
            <View style={[styles.optionDivider, { backgroundColor: tokens.depth.hairline }]} />
            <OptionRow
              label={COPY2.shareCta}
              tokens={tokens}
              onPress={() => { setShareOpen(true); setOptionsOpen(false); hapt.tap(); }}
            />
          </View>
        </>
      )}

      <AScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={onScrollViewLayout}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: 12, paddingBottom: insets.bottom + 28 }}
      >
        {/* SECTION A — synthesis + horizon. */}
        <SectionReveal scrollY={scrollY} viewportH={viewportH} index={sectionIndex++} reduceMotion={reduceMotion}>
          <SynthesisSection summaryLine={summaryLine} horizonLine={read.horizonLine} tokens={tokens} scanTone={vm.scanTone} />
        </SectionReveal>

        {/* Bad-photo carry-over banner (calm, honest, never blocks). */}
        {badPhoto && (
          <View style={{ marginTop: 24 }}>
            <BadPhotoBanner tokens={tokens} onRescan={() => onRescan?.()} />
          </View>
        )}

        {/* SECTION B — the map. */}
        <SectionReveal scrollY={scrollY} viewportH={viewportH} index={sectionIndex++} reduceMotion={reduceMotion} style={{ marginTop: SECTION_GAP }}>
          <SkinMapCard
            photoUri={photoUri}
            toneBackdrop={toneBackdrop}
            faceBox={faceBox}
            landmarks={landmarks}
            mirrored={mirrored}
            findings={gRead.findings}
            activeFindingId={activeGlowId}
            onSelectFinding={selectFromMap}
            theme={theme}
            tokens={tokens}
            reduceMotion={reduceMotion}
            reduceTransparency={reduceTransparency}
            collapsed={collapsed}
            onToggleCollapse={() => { setCollapsed((c) => !c); hapt.select(); }}
          />
        </SectionReveal>

        {/* SECTION C — the findings. */}
        <View onLayout={(e) => { findingsTop.current = e.nativeEvent.layout.y; }}>
          <SectionReveal scrollY={scrollY} viewportH={viewportH} index={sectionIndex++} reduceMotion={reduceMotion} style={{ marginTop: SECTION_GAP }}>
            <FindingsSection
              hero={vm.hero}
              supporting={vm.supporting}
              tintByFinding={tintByFinding}
              tokens={tokens}
              reduceMotion={reduceMotion}
              selectedId={selectedId}
              onSelect={selectFromList}
              downweighted={downweighted}
              onAgency={onAgency}
              justFindings={justFindings}
              moves={vm.moves}
              findingToMove={vm.findingToMove}
            />
          </SectionReveal>
        </View>

        {/* SECTION D — the plan, already set in motion. */}
        {vm.moves.length > 0 && (
          <SectionReveal
            scrollY={scrollY}
            viewportH={viewportH}
            index={sectionIndex++}
            reduceMotion={reduceMotion}
            style={{ marginTop: SECTION_GAP }}
            onReveal={() => { if (!planPlay) { setPlanPlay(true); warmBeat(); } }}
          >
            <PlanSection
              moves={displayMoves}
              findingsById={findingsById}
              tintByFinding={tintByFinding}
              concernFindings={concernFindings}
              downweighted={downweighted}
              tokens={tokens}
              reduceMotion={reduceMotion}
              play={planPlay}
              coShapePriorityId={coShapePriorityId}
              onCoShape={onCoShape}
              badPhoto={badPhoto}
            />
          </SectionReveal>
        )}

        {/* SECTION E — commitment, closing on hope. */}
        <SectionReveal
          scrollY={scrollY}
          viewportH={viewportH}
          index={sectionIndex++}
          reduceMotion={reduceMotion}
          style={{ marginTop: SECTION_GAP + 8 }}
          onReveal={warmBeat}
        >
          <CommitSection
            horizonLine={read.horizonLine}
            tokens={tokens}
            lowConfidence={lowConfidence}
            onBuild={onBuildRoutine}
            onDoLater={() => onDoLater?.()}
            onRescan={() => onRescan?.()}
          />
        </SectionReveal>
      </AScrollView>

      {/* Share artifact — invisible until invited. */}
      {shareOpen && (
        <ShareArtifactCard
          tokens={tokens}
          toneColors={shareToneColors(vm.scanTone)}
          dateLabel={dateLabel}
          onShare={() => { onShareDayOne?.(); setShareOpen(false); }}
          onClose={() => setShareOpen(false)}
        />
      )}
    </View>
  );
}

function shareToneColors(tone: string): [string, string, string] {
  switch (tone) {
    case 'reactive': return ['#5E8FD0', '#7A6BC8', '#88C3DA'];
    case 'active': return ['#8A6BC6', '#C49AD8', '#7E78C6'];
    default: return ['#7A6BC8', '#6B86C4', '#88C3DA'];
  }
}

function OptionRow({ label, tokens, onPress }: { label: string; tokens: ReturnType<typeof tokensFor>; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.optionRow}>
      <Text style={[TYPE2.quiet, { color: tokens.body }]} maxFontSizeMultiplier={1.5}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({
  tokens, theme, insets, orbState, scanTone, onRescan, onDoLater,
}: {
  tokens: ReturnType<typeof tokensFor>;
  theme: ScreenTheme;
  insets: ReturnType<typeof useSafeAreaInsets>;
  orbState: AssistantOrbState;
  scanTone: ReturnType<typeof buildYourSkinViewModel>['scanTone'];
  onRescan?: () => void;
  onDoLater?: () => void;
}) {
  return (
    <View style={[styles.root, styles.empty, { backgroundColor: tokens.bg, paddingTop: insets.top + 40 }]}>
      <StatusBar style={tokens.barStyle} />
      <ResultsOrb state={orbState} size={72} scanTone={scanTone} />
      <Text style={[TYPE2.synthesis, { color: tokens.line, textAlign: 'center', marginTop: 24 }]}>
        I couldn’t quite read this one. Let’s try once more.
      </Text>
      <Pressable onPress={() => onRescan?.()} style={[styles.emptyCta, { backgroundColor: tokens.accent }]} accessibilityRole="button">
        <Text style={{ color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 16 }}>Rescan</Text>
      </Pressable>
      <Pressable onPress={() => onDoLater?.()} hitSlop={8} style={{ marginTop: 14 }} accessibilityRole="button">
        <Text style={[TYPE2.quiet, { color: tokens.faint }]}>{COPY2.doLater}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgLift: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.gutter,
    paddingBottom: 6,
  },
  headerSide: { width: 56, alignItems: 'center', justifyContent: 'center' },
  optionsBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  optionsPanel: {
    position: 'absolute',
    minWidth: 180,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    zIndex: 40,
    boxShadow: [{ offsetX: 0, offsetY: 10, blurRadius: 28, spreadDistance: 0, color: 'rgba(0,0,0,0.25)' }] as any,
  },
  optionRow: { paddingHorizontal: 16, paddingVertical: 13 },
  optionDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 12 },
  glassTopLight: { position: 'absolute', top: 0, left: 0, right: 0, height: 22 },
  empty: { alignItems: 'center', paddingHorizontal: 32 },
  emptyCta: { height: 52, paddingHorizontal: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
});

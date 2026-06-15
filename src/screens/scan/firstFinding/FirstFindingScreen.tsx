/**
 * FirstFindingScreen — the Analyzing moment flowing into the First Finding as
 * ONE continuous, shared-element sequence. A single persistent photo and the
 * single persistent companion orb (driven, never re-mounted) carry the whole
 * story: nothing swaps, everything transforms.
 *
 * Sequence: ANALYZING (loops the soft gaze-sweep + transparency-of-process
 * status lines for the REAL API duration) → PIVOT (the SAME photo reflows
 * 78%→62%, opening the lower third; soft haptic) → ORB "GOT IT" beat (warm
 * eye-arcs + glow bloom, before any word) → OPENING LINE (word-by-word, no
 * overflow) → SYNCED GLOW (additive light blooms on the EXACT spots, clipped to
 * face regions, ON the spoken word) → FIRST FINDING card → quiet "See everything".
 *
 * Network-decoupled: it consumes the canonical `SkinReadOutcome` (a container
 * runs the GPT-4V call). It never reads raw AI output. Requires an OrbProvider
 * in context (the persistent onboarding orb) — it drives, not mounts, the orb.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useOrb } from '@/screens/onboarding/orb/OrbHost';
import { FilmGrain } from '@/components/FilmGrain';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useReduceTransparency } from '@/hooks/useReduceTransparency';
import {
  primaryFinding,
  REGION_CHIP,
  REGION_LABEL,
  type FaceRegionKey,
  type SkinRead,
  type SkinReadFinding,
  type SkinReadOutcome,
} from '@/types/skinRead';
import {
  DEFAULT_FACE_BOX,
  proportionalFaceDetector,
  regionGeometry,
  regionGeometryFromLandmarks,
  type FaceBox,
  type FaceLandmarks,
} from './faceRegions';
import { computeBloomSchedule } from './bloomSchedule';
import { metricTint, type ScreenTheme } from './metricTint';
import {
  COPY,
  EASE,
  LAYOUT,
  STATUS_LINES,
  STATUS_LONG_CALL,
  TIMELINE,
  TYPE,
  tokensFor,
} from './motion';
import { PhotoStage } from './PhotoStage';
import { GazeSweep } from './GazeSweep';
import { GlowField, type GlowFieldHandle, type GlowSpotInput } from './GlowField';
import { FindingCard } from './FindingCard';
import { OrbSpeech } from '@/screens/onboarding/orb/OrbSpeech';

const ORB_SIZE = 64;
const ORB_ZONE = ORB_SIZE + LAYOUT.orbToPhoto;

// A no-concerns read earns a single soft, DISTRIBUTED positive wash — not one hot
// spot, not a whole-face blob: gentle low-strength light across a few regions with
// chips OFF, assembled from the same region-clipped additive primitive as concerns
// so the good-news moment feels as authored as the concern path.
const POSITIVE_WASH_REGIONS: FaceRegionKey[] = ['forehead', 'left_cheek', 'right_cheek', 'chin'];
const POSITIVE_WASH_STRENGTH = 0.16;

export interface FirstFindingScreenProps {
  /** The captured selfie (front camera; mirrored at display by default). */
  photoUri: string;
  /** Canonical outcome — starts 'pending', then ready/bad_photo/service_error. */
  outcome: SkinReadOutcome;
  /** Quiet "See everything →" → the next results screen (existing/placeholder). */
  onSeeEverything: () => void;
  /** Bad photo → retake in better light. */
  onTryBetterLight: () => void;
  /** Service error → run the read again. */
  onTryAgain: () => void;
  /** Dark is the hero default for the scan sequence. */
  theme?: ScreenTheme;
  /** Was the front camera mirrored at display? (person-left ↔ viewer side). */
  mirrored?: boolean;
  /**
   * Real face anchors (from the project's faceGeometryProvider / AI overlay).
   * When present, glows are AFFINE-WARPED to track this face — off-center, tilted,
   * any proportions. Absent → the proportional fallback (centered face box).
   */
  landmarks?: FaceLandmarks;
}

type Phase = 'analyzing' | 'reveal' | 'badPhotoChoice' | 'error';

export function FirstFindingScreen({
  photoUri,
  outcome,
  onSeeEverything,
  onTryBetterLight,
  onTryAgain,
  theme = 'dark',
  mirrored = true,
  landmarks,
}: FirstFindingScreenProps) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const reduceTransparency = useReduceTransparency();
  const orb = useOrb();
  const tokens = useMemo(() => tokensFor(theme), [theme]);

  // ── Frame geometry. Analyzing (largest) → reveal (down-scaled). ────────────
  const aW = Math.min(W * LAYOUT.photoWidthFractionAnalyzing, 330);
  const aH = aW / LAYOUT.photoAspect;
  const rW = aW * (LAYOUT.photoWidthFractionFinding / LAYOUT.photoWidthFractionAnalyzing);
  const rH = rW / LAYOUT.photoAspect;

  // ── ONE timeline. All UI-thread shared values owned here. ──────────────────
  const pivot = useSharedValue(0); // 0 analyzing → 1 finding
  const mute = useSharedValue(1); // 1 muted → 0.5 alive
  const float = useSharedValue(0); // gentle analyzing float
  const sweepGather = useSharedValue(0); // 0 sweeping → 1 gathered+faded
  const glowRef = useRef<GlowFieldHandle>(null);

  // ── State. ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('analyzing');
  const [statusIdx, setStatusIdx] = useState(0);
  const [longCall, setLongCall] = useState(false);
  const [showLine, setShowLine] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [shownAnyway, setShownAnyway] = useState(false);
  const [revealRead, setRevealRead] = useState<SkinRead | null>(null);
  const [faceBox, setFaceBox] = useState<FaceBox>(DEFAULT_FACE_BOX);

  // ── Timers + lifecycle. ─────────────────────────────────────────────────────
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const statusTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const revealStarted = useRef(false);
  const after = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(() => mounted.current && fn(), ms);
    timers.current.push(id);
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const stopAnalyzing = useCallback(() => {
    if (statusTimer.current) {
      clearInterval(statusTimer.current);
      statusTimer.current = null;
    }
    cancelAnimation(float);
    float.value = withTiming(0, { duration: 300 });
  }, [float]);

  // ── Derived view-model. ─────────────────────────────────────────────────────
  const finding: SkinReadFinding | null = useMemo(
    () => (revealRead ? primaryFinding(revealRead) : null),
    [revealRead],
  );
  const tint = useMemo(
    () => metricTint(finding?.metric ?? 'neutral', theme),
    [finding?.metric, theme],
  );
  const hedge = phase === 'reveal' && outcome.status === 'bad_photo';
  // Dark mode reads the additive glow as luminous heat → lift strength ~15%
  // (the renderer still hard-caps the alpha, so it never blows out).
  const darkLift = theme === 'dark' ? 1.15 : 1;
  // One source of spots for BOTH render and bloom timing (so pool indices line
  // up): the model's located spots, or — for a positive read with nothing to
  // locate — the soft positive wash.
  const isPositiveWash =
    !!finding && finding.metric === 'positive' && finding.spots.length === 0;
  const effectiveSpots = useMemo(
    () =>
      isPositiveWash
        ? POSITIVE_WASH_REGIONS.map((region) => ({ region, place: '', strength: POSITIVE_WASH_STRENGTH }))
        : finding
          ? finding.spots.slice(0, 4)
          : [],
    [finding, isPositiveWash],
  );
  const glowSpots: GlowSpotInput[] = useMemo(() => {
    return effectiveSpots.map((s) => ({
      geometry: landmarks
        ? regionGeometryFromLandmarks(s.region, landmarks, rW, rH, mirrored)
        : regionGeometry(s.region, faceBox, rW, rH, mirrored),
      strength: Math.min(1, s.strength * darkLift),
      chipLabel: s.place || REGION_CHIP[s.region],
    }));
  }, [effectiveSpots, faceBox, rW, rH, mirrored, landmarks, darkLift]);
  const lowConfidence = !!finding?.lowConfidence || hedge;

  // ── Mount: detect face once, start analyzing motion, place + wake the orb. ──
  useEffect(() => {
    mounted.current = true;
    proportionalFaceDetector
      .detect(photoUri)
      .then((res) => res && mounted.current && setFaceBox(res.faceBox))
      .catch(() => {});

    // Orb: arrive over the photo, look DOWN at it, examine.
    const orbCy = insets.top + ORB_ZONE - LAYOUT.orbToPhoto - ORB_SIZE / 2;
    orb.show();
    orb.moveTo({ cx: W / 2, cy: orbCy, size: ORB_SIZE });
    orb.setGaze('down');
    orb.setExpression('focused');

    if (!reduceMotion) {
      float.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 2200, easing: EASE.io }),
          withTiming(4, { duration: 2200, easing: EASE.io }),
        ),
        -1,
        true,
      );
    }
    // The status lines LOOP for the whole real API duration (spec: analyzing
    // loops until the read returns — never parks on one line). This is
    // information, not motion: it rotates under Reduce Motion too (the swap
    // animation itself is what reduce strips, via the keyed Fade transitions).
    statusTimer.current = setInterval(() => {
      if (!mounted.current) return;
      setStatusIdx((i) => (i + 1) % STATUS_LINES.length);
    }, TIMELINE.statusLineMs);
    after(TIMELINE.longCallMs, () => setLongCall(true));
    AccessibilityInfo.announceForAccessibility('Reading your skin.');

    return () => {
      mounted.current = false;
      clearTimers();
      if (statusTimer.current) clearInterval(statusTimer.current);
      [pivot, mute, float, sweepGather].forEach(cancelAnimation);
    };
    // Mount-once controller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── React to the outcome: drive the pivot → reveal, or a hard-case path. ────
  useEffect(() => {
    if (outcome.status === 'pending') return;
    if (phase === 'reveal' || phase === 'error') return; // already resolved

    if (outcome.status === 'service_error') {
      stopAnalyzing();
      setPhase('error');
      orb.setExpression('reassuring');
      orb.setGaze('forward');
      AccessibilityInfo.announceForAccessibility(outcome.message);
      return;
    }
    if (outcome.status === 'bad_photo' && !shownAnyway) {
      stopAnalyzing();
      setPhase('badPhotoChoice');
      orb.setExpression('curious'); // gentle-concerned: brows raised
      orb.setGaze('forward');
      return;
    }
    const read =
      outcome.status === 'ready' || outcome.status === 'bad_photo' ? outcome.read : null;
    if (!read) {
      stopAnalyzing();
      // A bad photo with NO hedged read to show must not dead-end on the generic
      // error screen — "Show me anyway" has nothing to reveal, so send the user
      // to retake in better light (the only honest next step).
      if (outcome.status === 'bad_photo') {
        onTryBetterLight();
        return;
      }
      setPhase('error');
      return;
    }
    startReveal(read);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, shownAnyway, phase]);

  // ── The reveal choreography. ────────────────────────────────────────────────
  const startReveal = useCallback(
    (read: SkinRead) => {
      if (revealStarted.current) return;
      revealStarted.current = true;
      stopAnalyzing();
      setRevealRead(read);
      setPhase('reveal');

      const f = primaryFinding(read);
      const spots = f
        ? f.spots.slice(0, 4).map((s) => ({ region: s.region }))
        : [];

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        /* web/no haptics */
      }

      if (reduceMotion) {
        // Settled, complete, beautiful — no sweep/resize/word-fade/bloom.
        pivot.value = 1;
        mute.value = 0.5;
        sweepGather.value = 1;
        orb.reactArchetype('warm');
        orb.setExpression('warm');
        orb.setGaze('forward');
        setShowLine(true);
        after(60, () => glowRef.current?.settleAll());
        after(120, () => setShowCard(true));
        return;
      }

      // Pivot — gather the sweep + reflow the photo + lift the muting.
      sweepGather.value = withTiming(1, { duration: TIMELINE.gatherMs, easing: EASE.out });
      pivot.value = withTiming(1, { duration: TIMELINE.pivotMs, easing: EASE.out });
      mute.value = withTiming(0.5, { duration: TIMELINE.pivotMs, easing: EASE.out });

      // Got-it beat (before any word) — warm eye-arcs + glow bloom + scale hop.
      after(TIMELINE.pivotMs, () => {
        orb.reactArchetype('warm');
        orb.setGaze('forward');
        const orbCy = insets.top + ORB_ZONE - LAYOUT.orbToPhoto - ORB_SIZE / 2 - 12;
        orb.moveTo({ cx: W / 2, cy: orbCy, size: ORB_SIZE }, { duration: 420 });
      });

      // Opening line + synced glows.
      after(TIMELINE.pivotMs + TIMELINE.gotItMs, () => {
        orb.setExpression('warm');
        setShowLine(true);
        scheduleGlows(read);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reduceMotion],
  );

  // Bloom each glow ON its spoken PLACE word (general noun, not the trailing
  // side word), strongest-first + brighter. One soft haptic on the first bloom
  // (none for the calm positive wash). Derives from `read` so it can't go stale.
  const scheduleGlows = useCallback(
    (read: SkinRead) => {
      const f = primaryFinding(read);
      if (!f) return;
      const positiveWash = f.metric === 'positive' && f.spots.length === 0;
      const regions: FaceRegionKey[] = positiveWash
        ? POSITIVE_WASH_REGIONS
        : f.spots.slice(0, 4).map((s) => s.region);
      if (regions.length === 0) return;

      const words = read.openingLine.split(/\s+/);
      const { times, firstIndex } = computeBloomSchedule(words, regions, {
        startDelayMs: 120, // == OrbSpeech startDelay → glow + word share t0
        wordStaggerMs: TIMELINE.wordStaggerMs,
        onWordOffsetMs: 140,
        bloomStaggerMs: TIMELINE.bloomStaggerMs,
      });

      times.forEach((t, i) => {
        after(t, () => {
          if (!positiveWash && i === firstIndex) {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {
              /* no haptics */
            }
          }
          glowRef.current?.bloom(i);
        });
      });
    },
    [after],
  );

  const onLineDone = useCallback(() => {
    after(TIMELINE.cardDelayMs, () => setShowCard(true));
  }, [after]);

  const onShowAnyway = useCallback(() => {
    setShownAnyway(true); // re-runs the outcome effect → reveal (hedged)
  }, []);

  // ── Animated styles. ────────────────────────────────────────────────────────
  const photoBoxStyle = useAnimatedStyle(() => ({
    width: interpolate(pivot.value, [0, 1], [aW, rW]),
    height: interpolate(pivot.value, [0, 1], [aH, rH]),
    transform: [{ translateY: float.value * (1 - pivot.value) }],
  }));

  // ── A11y text equivalents. ──────────────────────────────────────────────────
  const glowA11y = useMemo(() => buildGlowA11y(finding), [finding]);

  // On a long call the closer-look line JOINS the rotation (honesty about the
  // wait) — it never parks the screen on one static line; the loop keeps
  // rotating for the whole real API duration.
  const statusLines = longCall ? [...STATUS_LINES, STATUS_LONG_CALL] : STATUS_LINES;
  const statusText = statusLines[statusIdx % statusLines.length];
  const maxLineWidth = W - LAYOUT.gutter * 2;

  return (
    <View style={[styles.root, { backgroundColor: tokens.bg }]}>
      <StatusBar style={tokens.barStyle === 'light' ? 'light' : 'dark'} />
      <BackgroundWash tokens={tokens} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.col, { paddingHorizontal: LAYOUT.gutter }]}>
          {/* Orb zone (the orb itself floats in the OrbHost overlay above). */}
          <View style={{ height: ORB_ZONE }} />

          {/* The ONE photo — reflows as a shared element; glows live inside. */}
          <Animated.View
            style={[
              styles.photoBox,
              {
                borderRadius: LAYOUT.photoRadius,
                boxShadow: [
                  { offsetX: 0, offsetY: tokens.depth.contact.offsetY, blurRadius: tokens.depth.contact.blur, spreadDistance: 0, color: tokens.depth.contact.color },
                  { offsetX: 0, offsetY: tokens.depth.ambient.offsetY, blurRadius: tokens.depth.ambient.blur, spreadDistance: 0, color: tokens.depth.ambient.color },
                ],
              } as any,
              photoBoxStyle,
            ]}
          >
            <PhotoStage
              photoUri={photoUri}
              tokens={tokens}
              mute={mute}
              reduceTransparency={reduceTransparency}
              radius={LAYOUT.photoRadius}
            >
              {phase === 'analyzing' && (
                <GazeSweep
                  faceBox={faceBox}
                  frameW={aW}
                  frameH={aH}
                  color={SWEEP_COLOR}
                  gather={sweepGather}
                  reduceMotion={reduceMotion}
                  dark={theme === 'dark'}
                />
              )}
              {phase === 'reveal' && finding && glowSpots.length > 0 && (
                <GlowField
                  ref={glowRef}
                  spots={glowSpots}
                  tint={tint}
                  frameW={rW}
                  frameH={rH}
                  lowConfidence={lowConfidence}
                  reduceMotion={reduceMotion}
                  reduceTransparency={reduceTransparency}
                  a11yLabel={glowA11y}
                  renderChips={!isPositiveWash}
                />
              )}
            </PhotoStage>
          </Animated.View>

          {/* Below-photo content (reflows up as the photo shrinks). */}
          <View style={[styles.below, { paddingTop: LAYOUT.photoToLine }]}>
            {phase === 'analyzing' && (
              <View style={styles.center}>
                <Animated.Text
                  key={`status-${longCall ? 'long' : statusIdx}`}
                  entering={FadeIn.duration(reduceMotion ? 0 : 520)}
                  exiting={FadeOut.duration(reduceMotion ? 0 : 520)}
                  style={[TYPE.status, { color: tokens.status, textAlign: 'center' }]}
                  maxFontSizeMultiplier={1.6}
                  accessibilityLiveRegion="polite"
                >
                  {statusText}
                </Animated.Text>
                <Text style={[TYPE.confidence, styles.privacy, { color: tokens.faint }]} maxFontSizeMultiplier={1.4}>
                  {COPY.privacy}
                </Text>
              </View>
            )}

            {phase === 'reveal' && revealRead && (
              <RevealContent
                read={revealRead}
                finding={finding}
                tint={tint}
                tokens={tokens}
                reduceMotion={reduceMotion}
                showLine={showLine}
                showCard={showCard}
                maxLineWidth={maxLineWidth}
                onLineDone={onLineDone}
                onSeeEverything={onSeeEverything}
              />
            )}

            {phase === 'badPhotoChoice' && (
              <BadPhotoChoice
                reason={(outcome.status === 'bad_photo' && outcome.read?.openingLine) || COPY.errorTitle}
                tokens={tokens}
                onTryBetterLight={onTryBetterLight}
                onShowAnyway={onShowAnyway}
                /* Only offer "Show me anyway" when there's a hedged read to
                   reveal — otherwise it has nothing to show and dead-ends. */
                canShowAnyway={outcome.status === 'bad_photo' && outcome.read != null}
              />
            )}

            {phase === 'error' && (
              <View style={styles.center}>
                <Text style={[TYPE.voice, { color: tokens.line, textAlign: 'center' }]} maxFontSizeMultiplier={1.6} accessibilityRole="header">
                  {outcome.status === 'service_error' ? outcome.message : COPY.errorTitle}
                </Text>
                <View style={{ height: 24 }} />
                <OutlineButton label={COPY.tryAgain} tokens={tokens} onPress={onTryAgain} />
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* ~4% photographic grain over the whole frame (spec: dark cinematic
          design). Static texture — pointerEvents none, zero per-frame cost. */}
      <FilmGrain />
    </View>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Reveal content — opening line + finding card + quiet CTA.
// ───────────────────────────────────────────────────────────────────────────

function RevealContent({
  read,
  finding,
  tint,
  tokens,
  reduceMotion,
  showLine,
  showCard,
  maxLineWidth,
  onLineDone,
  onSeeEverything,
}: {
  read: SkinRead;
  finding: SkinReadFinding | null;
  tint: ReturnType<typeof metricTint>;
  tokens: ReturnType<typeof tokensFor>;
  reduceMotion: boolean;
  showLine: boolean;
  showCard: boolean;
  maxLineWidth: number;
  onLineDone: () => void;
  onSeeEverything: () => void;
}) {
  return (
    // Scrollable so the opening line + finding card + "See everything" CTA can
    // never clip off-screen on short devices or at large Dynamic Type — the
    // trust climax must always be fully readable AND the CTA always reachable.
    // (The shared-element photo is a sibling above, untouched by this scroll.)
    <ScrollView
      style={styles.revealCol}
      contentContainerStyle={styles.revealColContent}
      showsVerticalScrollIndicator={false}
    >
      {showLine && (
        <OrbSpeech
          text={read.openingLine}
          reduceMotion={reduceMotion}
          play
          startDelay={120}
          wordStagger={TIMELINE.wordStaggerMs}
          wordDuration={TIMELINE.wordDurationMs}
          align="center"
          maxWidth={maxLineWidth}
          onDone={onLineDone}
          accessibilityRole="header"
          numberOfLines={4}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          textStyle={[TYPE.voice, { color: tokens.line, textAlign: 'center' }]}
        />
      )}

      {showCard && finding && (
        <View style={{ marginTop: LAYOUT.lineToCard }}>
          <FindingCard
            finding={finding}
            tint={tint}
            tokens={tokens}
            reduceMotion={reduceMotion}
            play={showCard}
          />
        </View>
      )}

      {showCard && (
        <Pressable
          onPress={onSeeEverything}
          accessibilityRole="button"
          accessibilityLabel="See everything"
          hitSlop={12}
          style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[TYPE.cta, { color: tokens.accent }]} maxFontSizeMultiplier={1.4}>
            {COPY.seeEverything}  →
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Bad-photo honest choice.
// ───────────────────────────────────────────────────────────────────────────

function BadPhotoChoice({
  reason,
  tokens,
  onTryBetterLight,
  onShowAnyway,
  canShowAnyway,
}: {
  reason: string;
  tokens: ReturnType<typeof tokensFor>;
  onTryBetterLight: () => void;
  onShowAnyway: () => void;
  /** "Show me anyway" only appears when there's a hedged read to reveal. */
  canShowAnyway: boolean;
}) {
  return (
    <View style={styles.center}>
      <Text style={[TYPE.voice, { color: tokens.line, textAlign: 'center' }]} maxFontSizeMultiplier={1.6} accessibilityRole="header">
        {reason}
      </Text>
      <Text style={[TYPE.status, styles.badTip, { color: tokens.status }]} maxFontSizeMultiplier={1.6}>
        A clearer photo in good light would help me read your skin.
      </Text>
      <OutlineButton label={COPY.tryBetterLight} tokens={tokens} onPress={onTryBetterLight} />
      {canShowAnyway ? (
        <Pressable
          onPress={onShowAnyway}
          accessibilityRole="button"
          accessibilityLabel={COPY.showAnyway}
          hitSlop={12}
          style={({ pressed }) => [styles.quietBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[TYPE.cta, { color: tokens.status }]} maxFontSizeMultiplier={1.4}>
            {COPY.showAnyway}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Pieces.
// ───────────────────────────────────────────────────────────────────────────

const SWEEP_COLOR = 'rgba(150, 180, 255, 1)'; // aurora blue, matches the orb

function BackgroundWash({ tokens }: { tokens: ReturnType<typeof tokensFor> }) {
  return (
    <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Defs>
        <RadialGradient id="ff-bg" cx="50%" cy="16%" r="80%">
          <Stop offset="0" stopColor={tokens.bgLift} />
          <Stop offset="1" stopColor={tokens.bg} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#ff-bg)" />
    </Svg>
  );
}

function OutlineButton({
  label,
  tokens,
  onPress,
}: {
  label: string;
  tokens: ReturnType<typeof tokensFor>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.outlineBtn,
        { borderColor: tokens.accent, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[TYPE.cta, { color: tokens.accent }]} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </Pressable>
  );
}

function buildGlowA11y(finding: SkinReadFinding | null): string {
  if (!finding) return '';
  if (finding.spots.length === 0) return finding.name;
  const metricWord =
    finding.metric === 'redness' ? 'redness'
    : finding.metric === 'dryness' ? 'dryness'
    : finding.metric === 'dark_marks' ? 'dark marks'
    : finding.metric === 'breakouts' ? 'a few small spots'
    : finding.metric === 'oil' ? 'oil'
    : finding.name.toLowerCase();
  const places = finding.spots.map((s) => REGION_LABEL[s.region].toLowerCase());
  let label = `${metricWord} shown on ${joinPlaces(places)}`;
  if (finding.spots.length > 1) {
    label += `, stronger on the ${REGION_LABEL[finding.spots[0].region].toLowerCase()}`;
  }
  return label;
}

function joinPlaces(places: string[]): string {
  if (places.length <= 1) return places[0] ?? '';
  if (places.length === 2) return `${places[0]} and ${places[1]}`;
  return `${places.slice(0, -1).join(', ')}, and ${places[places.length - 1]}`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  col: { flex: 1 },
  photoBox: { alignSelf: 'center' },
  below: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'flex-start' },
  revealCol: { flex: 1 },
  // flexGrow keeps it centered-to-top when it fits; scrolls when it doesn't.
  revealColContent: { alignItems: 'center', flexGrow: 1, paddingBottom: 24 },
  privacy: { marginTop: 14, textAlign: 'center', maxWidth: 280 },
  badTip: { marginTop: 12, marginBottom: 24, textAlign: 'center', maxWidth: 300 },
  cta: {
    minHeight: 44,
    marginTop: LAYOUT.cardToCta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  quietBtn: { minHeight: 44, marginTop: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  outlineBtn: {
    minHeight: 52,
    paddingHorizontal: 28,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export { FirstFindingScreen as AnalyzingFirstFindingScreen };

import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { X, ArrowRight, CaretDown } from 'phosphor-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '@/store/useAppStore';
import { palette, statusColor } from '@/theme';
import { hapt } from '@/utils/haptics';
import {
  CATEGORY_LABEL,
  buildSummaryHeadline,
  buildTonightFocus,
  getConcerns,
  severityLabel,
} from '@/utils/concerns';
import { buildSkinScoreWhy, computeSkinScore, formatDelta } from '@/utils/skinScore';
import { SkinScoreDial } from '@/components/SkinScoreDial';
import { AISourceBadge } from '@/components/dev/AISourceBadge';
import type { RootStackParamList } from '@/navigation/types';
import type { Concern, Severity } from '@/types';
import type { FaceScanAnalysis } from '@/ai/ai-contracts';

/**
 * ScanResultsFaceScreen — v8.2 glanceable rebuild.
 *
 * The product rule: "stop showing the user everything the AI knows."
 *
 * Default view (3-second comprehension):
 *   • Hero photo with up to 3 subtle hotspot markers (only for concerns
 *     with severity ≥ moderate — calm/mild findings don't get hotspots).
 *   • One-sentence headline (serif, short).
 *   • Three flat rows: category · region · severity. No cards. No trend
 *     chips. No sub-labels.
 *   • One CTA: "What should I do now?"
 *
 * Tap-to-expand:
 *   • Tapping a row expands it inline to show the finding line + the
 *     one next-step sentence. LayoutAnimation handles the height; tap
 *     anywhere in the row to collapse again.
 *
 * "What should I do now?" CTA:
 *   • Opens the Tonight sheet (bottom half-modal) with the numbered
 *     action list. That sheet is the *only* place the full plan lives.
 */

// Android needs this toggle for LayoutAnimation to fire.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface ScanResultsFaceScreenProps {
  scanId: string;
}

export function ScanResultsFaceScreen({ scanId }: ScanResultsFaceScreenProps) {
  const scans = useAppStore((s) => s.scans);
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();

  const scan = scans.find((s) => s.id === scanId) ?? scans[scans.length - 1];
  const previous = scan
    ? scans.filter((s) => s.capturedAt < scan.capturedAt).slice(-1)[0]
    : undefined;

  const concerns = scan ? getConcerns(scan, previous) : [];
  const top3 = concerns.slice(0, 3);
  const headline = buildHeadline(concerns);
  const tonight = buildTonightFocus(concerns);

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [tonightOpen, setTonightOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // v10.1 — emotional landing. The medallion's count-up fires this at the
  // moment the final value settles. `revealHapticFired` makes sure we only
  // land the haptic once per screen mount, even if the dial is remounted
  // via state transitions.
  const revealHapticFired = useRef(false);
  const handleRevealComplete = React.useCallback(() => {
    if (revealHapticFired.current) return;
    revealHapticFired.current = true;
    hapt.success();
  }, []);

  if (!scan) return null;

  // v9.1 — bigger, more dominant face. 1.32x aspect gives a near-full-screen
  // hero on standard phones; the face is the result, not a card in a list.
  const photoSize = {
    w: width - 32,
    h: Math.round((width - 32) * 1.32),
  };

  const close = () => {
    hapt.select();
    rootNav.goBack();
  };

  const toggleRow = (category: string) => {
    hapt.select();
    LayoutAnimation.configureNext({
      duration: 220,
      update: { type: 'easeInEaseOut' },
    });
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  const openPlan = () => {
    hapt.tap();
    // v9.1 — the "what should I do now?" flow now opens a full-screen Plan
    // page instead of a half-sheet. Tonight lives inside Plan as one of
    // five zones: summary, tonight, best product, alternatives, why.
    rootNav.goBack(); // dismiss the scan modal first
    setTimeout(() => {
      // Give the modal dismiss a tick to finish before pushing the plan.
      // @ts-expect-error nested stack nav
      rootNav.navigate?.('Tabs', {
        screen: 'HomeTab',
        params: { screen: 'Plan' },
      });
    }, 60);
  };

  // Only the concerns that need attention get a hotspot on the photo.
  // Calm / mild findings stay hidden — the photo should read clean.
  const hotspotConcerns = top3.filter(
    (c) => c.severity === 'moderate' || c.severity === 'needs-attention'
  );

  const score = computeSkinScore(scans);
  const previousScoreValue =
    scans.length >= 2 ? scans[scans.length - 2].overallScore : null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      {/* v10.25 — dev-only AI source pill. Renders nothing in
          production builds. Tap → AIDiagnostics. */}
      <AISourceBadge feature="scan" />

      <View style={styles.header}>
        <Pressable
          onPress={close}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Close results"
          hitSlop={8}
        >
          <X size={18} weight="duotone" color={palette.ink} />
        </Pressable>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <HeroPhoto
          photoUri={scan.photoUri}
          size={photoSize}
          hotspotConcerns={hotspotConcerns}
          scoreValue={score.value}
          previousScore={previousScoreValue}
          deltaCaption={
            score.deltaSinceLast !== null
              ? `${formatDelta(score.deltaSinceLast)} since last scan`
              : 'first reading'
          }
          onRevealComplete={handleRevealComplete}
        />

        <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
          {headline}
        </Text>

        {/* v10.13 — Skin Score "why" line directly under the reveal
            headline. Names which concerns moved so the medallion's
            +4 / -4 reads as meaningful, not arbitrary. */}
        {scans.length >= 2 ? (
          <Text
            style={styles.whyLine}
            maxFontSizeMultiplier={1.2}
            numberOfLines={2}
          >
            {buildSkinScoreWhy(scans)}
          </Text>
        ) : null}

        <View style={styles.findings}>
          {top3.map((concern, i) => (
            <StaggeredFindingRow
              key={concern.category}
              index={i}
              concern={concern}
              expanded={expandedCategory === concern.category}
              onPress={() => toggleRow(concern.category)}
              showTopDivider={i > 0}
            />
          ))}
        </View>

        {/* v10.26 — AI-only blocks. Each surfaces a structured field
            from `aiAnalysis` that the previous template-based fallback
            doesn't have: image quality issues, an explicit AVOID list,
            and a tonight-focus list driven by the AI's
            `next_focus.tonight`. None of these render on the
            deterministic path, so the result screen looks visibly
            different when AI is alive. */}
        {scan.aiAnalysis ? (
          <AIScanExtras analysis={scan.aiAnalysis} />
        ) : null}

        <Pressable
          onPress={openPlan}
          style={({ pressed }) => [
            styles.cta,
            pressed && { opacity: 0.94, transform: [{ scale: 0.985 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="What should I do now?"
        >
          <Text style={styles.ctaLabel} maxFontSizeMultiplier={1.15}>
            What should I do now?
          </Text>
          <ArrowRight size={15} color={palette.inkInverse} weight="duotone" />
        </Pressable>

        <Text style={styles.trustNote} maxFontSizeMultiplier={1.2}>
          Based on visible signals. Not a medical diagnosis.
        </Text>
      </ScrollView>

      <TonightSheet
        visible={tonightOpen}
        steps={tonight}
        onDismiss={() => setTonightOpen(false)}
        onDone={() => {
          hapt.success();
          setTonightOpen(false);
          rootNav.goBack();
        }}
      />
    </SafeAreaView>
  );
}

// ============================================================================
// Hero photo + hotspots
// ============================================================================

function HeroPhoto({
  photoUri,
  size,
  hotspotConcerns,
  scoreValue,
  previousScore,
  deltaCaption,
  onRevealComplete,
}: {
  photoUri: string;
  size: { w: number; h: number };
  hotspotConcerns: Concern[];
  scoreValue: number;
  previousScore: number | null;
  deltaCaption: string;
  onRevealComplete?: () => void;
}) {
  return (
    <View
      style={[
        styles.hero,
        { width: size.w, height: size.h },
      ]}
    >
      <Image
        source={photoUri}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={200}
      />
      {/* v10.5 — reveal motion: the medallion now RISES from +28 into
          its resting position while fading up from 0.0 opacity over
          620ms with a spring-damped ease. The photo lands first, the
          medallion arrives second — a two-beat reveal that feels
          cinematic. Haptic still fires at count-up settle. Respects
          reduce-motion via the initial value. */}
      <View pointerEvents="none" style={styles.scoreRevealWrap}>
        <RisingMedallion
          scoreValue={scoreValue}
          previousScore={previousScore}
          deltaCaption={deltaCaption}
          onRevealComplete={onRevealComplete}
        />
      </View>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {hotspotConcerns.flatMap((c) =>
          c.hotspots.slice(0, 1).map((pt, i) => (
            <Hotspot
              key={`${c.category}-${i}`}
              x={pt.x * size.w}
              y={pt.y * size.h}
              severity={c.severity}
              rank={c.rank}
            />
          ))
        )}
      </View>
    </View>
  );
}

/**
 * v10.5 — StaggeredFindingRow. Wraps each FindingRow so they slide up
 * from +12pt and fade in from 0 opacity, cascading with an 80ms delay
 * per rank. Fires shortly after the medallion arrives (base delay
 * 640ms = medallion's 120 + 420 reveal lead-in + 100 settle). Gives
 * the result a three-beat rhythm: photo → medallion → findings.
 * Reduce-motion bypasses the animation.
 */
function StaggeredFindingRow({
  index,
  concern,
  expanded,
  onPress,
  showTopDivider,
}: {
  index: number;
  concern: Concern;
  expanded: boolean;
  onPress: () => void;
  showTopDivider: boolean;
}) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateY = useSharedValue(reduceMotion ? 0 : 12);

  useEffect(() => {
    if (reduceMotion) return;
    const delay = 640 + index * 80;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 460, easing: Easing.out(Easing.cubic) })
    );
  }, [opacity, translateY, reduceMotion, index]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={style}>
      <FindingRow
        concern={concern}
        expanded={expanded}
        onPress={onPress}
        showTopDivider={showTopDivider}
      />
    </Animated.View>
  );
}

/**
 * v10.5 — RisingMedallion. Wraps the existing SkinScoreDial in a
 * reanimated container that rises from +28pt into resting position
 * while fading in from 0 to 1 opacity over 620ms with a spring-damped
 * ease. The dial's internal count-up still runs inside; the haptic
 * still fires at settle. This outer motion turns "score medallion
 * fades in" into "score medallion arrives" — the difference between
 * a chart and a reveal.
 */
function RisingMedallion({
  scoreValue,
  previousScore,
  deltaCaption,
  onRevealComplete,
}: {
  scoreValue: number;
  previousScore: number | null;
  deltaCaption: string;
  onRevealComplete?: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const translateY = useSharedValue(reduceMotion ? 0 : 28);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    translateY.value = withDelay(
      120,
      withSpring(0, { damping: 18, stiffness: 150, mass: 1 })
    );
    opacity.value = withDelay(
      120,
      withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) })
    );
  }, [translateY, opacity, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.scoreRevealBackdrop, style]}>
      <SkinScoreDial
        value={scoreValue}
        size={112}
        showTier={false}
        previousValue={previousScore}
        deltaCaption={deltaCaption}
        delay={420}
        onRevealComplete={onRevealComplete}
      />
    </Animated.View>
  );
}

function Hotspot({
  x,
  y,
  severity,
  rank,
}: {
  x: number;
  y: number;
  severity: Severity;
  rank: number;
}) {
  const color = colorFor(severity);
  const pulse = useSharedValue(0);

  React.useEffect(() => {
    pulse.value = withDelay(
      rank * 120,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      )
    );
  }, [pulse, rank]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: (1 - pulse.value) * 0.55,
    transform: [{ scale: 0.6 + pulse.value * 1.6 }],
  }));

  const DOT = 8;
  const RING = 22;

  return (
    <View style={[styles.hotspotWrap, { left: x - 18, top: y - 18 }]}>
      <Animated.View
        style={[
          styles.hotspotRing,
          {
            width: RING,
            height: RING,
            borderRadius: RING / 2,
            borderColor: color,
            left: 18 - RING / 2,
            top: 18 - RING / 2,
          },
          pulseStyle,
        ]}
      />
      <View
        style={[
          styles.hotspotCoreHalo,
          {
            width: DOT + 4,
            height: DOT + 4,
            borderRadius: (DOT + 4) / 2,
            left: 18 - (DOT + 4) / 2,
            top: 18 - (DOT + 4) / 2,
          },
        ]}
      />
      <View
        style={[
          styles.hotspotCore,
          {
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: color,
            left: 18 - DOT / 2,
            top: 18 - DOT / 2,
          },
        ]}
      />
    </View>
  );
}

// ============================================================================
// Flat finding row
// ============================================================================

function FindingRow({
  concern,
  expanded,
  onPress,
  showTopDivider,
}: {
  concern: Concern;
  expanded: boolean;
  onPress: () => void;
  showTopDivider: boolean;
}) {
  const color = colorFor(concern.severity);
  // v10 — severity bar. The four tiers map to fill ratios so the bar
  // visually answers "how bad is it" before the user reads the word.
  // Calm renders an empty rail, needs-attention renders a full rail.
  const fillRatio = severityFillRatio(concern.severity);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${CATEGORY_LABEL[concern.category]}, ${
        concern.region
      }, ${severityLabel(concern.severity)}`}
      accessibilityState={{ expanded }}
      style={({ pressed }) => [
        styles.row,
        showTopDivider && styles.rowDivider,
        pressed && { opacity: 0.96 },
      ]}
    >
      <View style={styles.rowHead}>
        <Text style={styles.rowTitle} maxFontSizeMultiplier={1.15}>
          <Text style={styles.rowTitleStrong}>
            {CATEGORY_LABEL[concern.category]}
          </Text>
          <Text style={styles.rowTitleMid}>{`  ·  ${concern.region}`}</Text>
        </Text>
        <View style={{ flex: 1 }} />
        <Text
          style={[styles.rowSeverity, { color }]}
          maxFontSizeMultiplier={1.1}
        >
          {severityLabel(concern.severity)}
        </Text>
        <Animated.View
          style={[
            styles.rowCaret,
            expanded && { transform: [{ rotate: '180deg' }] },
          ]}
        >
          <CaretDown size={13} color={palette.inkTertiary} weight="bold" />
        </Animated.View>
      </View>

      <View style={styles.severityBarRail}>
        <View
          style={[
            styles.severityBarFill,
            {
              backgroundColor: color,
              width: `${Math.round(fillRatio * 100)}%`,
            },
          ]}
        />
      </View>

      {expanded ? (
        <View style={styles.rowDetail}>
          <Text style={styles.rowDetailFinding} maxFontSizeMultiplier={1.2}>
            {concern.finding}
          </Text>
          <View style={[styles.rowDetailBullet, { backgroundColor: color }]} />
          <Text style={styles.rowDetailNext} maxFontSizeMultiplier={1.2}>
            {concern.nextStep}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function severityFillRatio(s: Severity): number {
  switch (s) {
    case 'calm':
      return 0.1;
    case 'mild':
      return 0.35;
    case 'moderate':
      return 0.65;
    case 'needs-attention':
      return 1;
  }
}

// ============================================================================
// Tonight sheet
// ============================================================================

function TonightSheet({
  visible,
  steps,
  onDismiss,
  onDone,
}: {
  visible: boolean;
  steps: string[];
  onDismiss: () => void;
  onDone: () => void;
}) {
  const translateY = useSharedValue(1);
  const backdrop = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 1, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
    backdrop.value = withTiming(visible ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, translateY, backdrop]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: `${translateY.value * 100}%` }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  if (!visible && translateY.value === 1) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View
        style={[StyleSheet.absoluteFillObject, styles.backdrop, backdropStyle]}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onDismiss} />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.sheetGrabber} />
        <Text style={styles.sheetKicker} maxFontSizeMultiplier={1.1}>
          TONIGHT
        </Text>
        <View style={styles.sheetSteps}>
          {steps.map((step, i) => (
            <View key={i} style={styles.sheetStep}>
              <Text style={styles.sheetStepNum} maxFontSizeMultiplier={1.15}>
                {i + 1}
              </Text>
              <Text
                style={styles.sheetStepText}
                maxFontSizeMultiplier={1.2}
                numberOfLines={2}
              >
                {compressStep(step)}
              </Text>
            </View>
          ))}
        </View>
        <Pressable
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel="Save and close"
          style={({ pressed }) => [
            styles.sheetCta,
            pressed && { opacity: 0.94 },
          ]}
        >
          <Text style={styles.sheetCtaLabel} maxFontSizeMultiplier={1.15}>
            Got it
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// AI-only extras (v10.26)
//
// Renders three extra blocks below the finding rows when AI ran:
//   • image-quality nudge when the AI flagged the photo as low-
//     confidence ("Re-scan for sharper findings")
//   • TONIGHT — the AI's `next_focus.tonight` items as a numbered list
//   • AVOID — the AI's `next_focus.avoid` items as a small list
//
// None render on the deterministic-fallback path, so their presence
// is itself a strong signal that the scan was AI-driven.
// ============================================================================

function AIScanExtras({ analysis }: { analysis: FaceScanAnalysis }) {
  const tonight = analysis.next_focus.tonight.filter(
    (s) => s.trim().length > 0
  );
  const avoid = analysis.next_focus.avoid.filter(
    (s) => s.trim().length > 0
  );
  const lowQuality =
    !analysis.image_quality.usable ||
    analysis.image_quality.confidence < 0.6 ||
    analysis.image_quality.issues.length > 0;

  if (!lowQuality && tonight.length === 0 && avoid.length === 0) return null;

  return (
    <View style={extrasStyles.wrap}>
      {lowQuality ? (
        <View style={extrasStyles.qualityCard}>
          <View style={extrasStyles.qualityRail} />
          <Text style={extrasStyles.qualityKicker} maxFontSizeMultiplier={1.1}>
            IMAGE QUALITY
          </Text>
          <Text
            style={extrasStyles.qualityBody}
            maxFontSizeMultiplier={1.2}
            numberOfLines={3}
          >
            {qualityCopy(analysis)}
          </Text>
        </View>
      ) : null}

      {tonight.length > 0 ? (
        <View style={extrasStyles.block}>
          <Text style={extrasStyles.kicker} maxFontSizeMultiplier={1.1}>
            TONIGHT
          </Text>
          {tonight.slice(0, 3).map((item, i) => (
            <View key={i} style={extrasStyles.item}>
              <Text
                style={extrasStyles.itemNum}
                maxFontSizeMultiplier={1.15}
              >
                {i + 1}
              </Text>
              <Text
                style={extrasStyles.itemText}
                maxFontSizeMultiplier={1.2}
                numberOfLines={3}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {avoid.length > 0 ? (
        <View style={extrasStyles.block}>
          <Text
            style={[extrasStyles.kicker, { color: palette.rust }]}
            maxFontSizeMultiplier={1.1}
          >
            AVOID
          </Text>
          {avoid.slice(0, 3).map((item, i) => (
            <View key={i} style={extrasStyles.avoidItem}>
              <View style={extrasStyles.avoidDot} />
              <Text
                style={extrasStyles.avoidText}
                maxFontSizeMultiplier={1.2}
                numberOfLines={2}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function qualityCopy(analysis: FaceScanAnalysis): string {
  const issues = analysis.image_quality.issues;
  if (issues.includes('blurry'))
    return 'The photo read as slightly blurry — re-scan in steady light for sharper findings.';
  if (issues.includes('low_light'))
    return 'Low light detected. A brighter photo will tighten the per-zone confidence.';
  if (issues.includes('partial_face'))
    return 'Part of your face was cropped. Re-scan with the full face in frame for complete findings.';
  if (issues.includes('angled'))
    return 'The photo angle made some zones harder to read. Face the camera straight on for sharper findings.';
  if (issues.includes('occluded'))
    return 'Hair or hands covered part of the frame. Re-scan with the full face visible.';
  return 'Some zones read as low-confidence. A re-scan in better light will tighten the findings.';
}

const extrasStyles = StyleSheet.create({
  wrap: {
    marginBottom: 24,
    gap: 16,
  },
  block: {
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clay,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  itemNum: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: palette.clay,
    width: 22,
    fontVariant: ['tabular-nums'],
  },
  itemText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.ink,
    paddingTop: 3,
  },
  avoidItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
    paddingLeft: 4,
  },
  avoidDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.rust,
    marginTop: 7,
  },
  avoidText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
  },
  qualityCard: {
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 14,
    borderRadius: 14,
    backgroundColor: palette.amber + '14', // ~8% opacity
    position: 'relative',
    overflow: 'hidden',
  },
  qualityRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: palette.amber,
  },
  qualityKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.amber,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  qualityBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.ink,
  },
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Short, headline-y version of the summary — no "main focus today is…"
 * setup phrase. Just the fact.
 */
function buildHeadline(concerns: Concern[]): string {
  const top = concerns[0];
  if (!top || top.severity === 'calm') {
    return 'Your skin is settled today.';
  }
  const label = CATEGORY_LABEL[top.category];
  return `${label} on your ${top.region}.`;
}

/**
 * Rewrite a verbose next-step sentence into a 3-5 word imperative.
 * The full sentence lives inside the concern card's expanded view; this
 * is just for the Tonight sheet where the user wants a checklist, not
 * an essay.
 */
function compressStep(step: string): string {
  const s = step.toLowerCase();
  if (s.includes('calming gel')) return 'Calming gel on chin.';
  if (s.includes('skip actives') || s.includes('pause exfoliants'))
    return 'Skip actives tonight.';
  if (s.includes('hydrating serum')) return 'Add a hydrating serum.';
  if (s.includes('humectant')) return 'Layer a hydrating serum.';
  if (s.includes('moisturizer')) return 'Finish with moisturizer.';
  if (s.includes('gentle exfoliant')) return 'Gentle exfoliant.';
  if (s.includes('clay') || s.includes('pha')) return 'Clay or PHA mask once this week.';
  if (s.includes('brightening')) return 'Brightening serum.';
  if (s.includes('spf')) return 'SPF in the morning.';
  if (s.includes('barrier-repair')) return 'Barrier-repair only.';
  // Fallback: first clause of the sentence.
  const first = step.split(/[.;]/)[0];
  return first.length <= 48 ? `${first}.` : `${first.slice(0, 45)}\u2026`;
}

function colorFor(s: Severity): string {
  switch (s) {
    case 'calm':
      return statusColor.calm;
    case 'mild':
      return palette.inkTertiary;
    case 'moderate':
      return statusColor.monitor;
    case 'needs-attention':
      return statusColor.active;
  }
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },

  header: {
    height: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 48,
  },

  // Hero
  hero: {
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
  },
  scoreRevealWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -46,
    alignItems: 'center',
  },
  scoreRevealBackdrop: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
    shadowColor: palette.ink,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  hotspotWrap: {
    position: 'absolute',
    width: 36,
    height: 36,
  },
  hotspotRing: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  hotspotCore: {
    position: 'absolute',
  },
  hotspotCoreHalo: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(248,250,252,0.95)',
  },

  // Headline — extra top margin to clear the floating medallion (-46 bottom)
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: palette.ink,
    marginTop: 74,
    marginBottom: 12,
    maxWidth: '92%',
  },
  // v10.13 — Skin Score why-line under the reveal headline.
  whyLine: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 21,
    color: palette.inkSecondary,
    marginBottom: 24,
    maxWidth: '92%',
  },

  // Findings — flat rows, no card containers
  findings: {
    marginBottom: 32,
  },
  row: {
    paddingVertical: 18,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // v10 — severity bar replaces the 8pt dot. Still a 1pt-tall rail but
  // fill width maps to tier so the row carries visual weight proportional
  // to how bad the concern is.
  severityBarRail: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: palette.hairline,
    marginTop: 12,
    overflow: 'hidden',
  },
  severityBarFill: {
    height: 3,
    borderRadius: 1.5,
  },
  rowTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: palette.ink,
    letterSpacing: -0.1,
  },
  rowTitleStrong: {
    color: palette.ink,
  },
  rowTitleMid: {
    color: palette.inkTertiary,
    fontFamily: 'Inter-Regular',
  },
  rowSeverity: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  rowCaret: {
    marginLeft: 8,
    width: 16,
    alignItems: 'center',
  },
  rowDetail: {
    marginTop: 12,
    paddingLeft: 18,
    position: 'relative',
  },
  rowDetailFinding: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSecondary,
    marginBottom: 10,
  },
  rowDetailBullet: {
    position: 'absolute',
    left: 0,
    top: 40,
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  rowDetailNext: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.ink,
  },

  // CTA
  cta: {
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.1,
    color: palette.inkInverse,
  },

  // Trust
  trustNote: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 12,
    lineHeight: 18,
    color: palette.inkTertiary,
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: 24,
  },

  // Tonight sheet
  backdrop: {
    backgroundColor: 'rgba(11,18,32,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 36,
    shadowColor: palette.ink,
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 14,
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(11,18,32,0.15)',
    marginBottom: 18,
  },
  sheetKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  sheetSteps: {
    gap: 16,
    marginBottom: 22,
  },
  sheetStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  sheetStepNum: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 26,
    color: palette.clay,
    width: 26,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  sheetStepText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: palette.ink,
    letterSpacing: -0.1,
    paddingTop: 3,
  },
  sheetCta: {
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
});

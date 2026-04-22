import React, { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  X,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'phosphor-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
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
  severityDotCount,
  severityLabel,
  trendLabel,
} from '@/utils/concerns';
import type { RootStackParamList } from '@/navigation/types';
import type {
  Concern,
  ConcernTrend,
  Severity,
} from '@/types';

/**
 * ScanResultsFaceScreen — v8.1 rebuild around the concern model.
 *
 * Information architecture:
 *   1. Header with close + "READING COMPLETE" kicker
 *   2. Hero photo with ranked hotspot markers + overall score chip
 *   3. Summary headline (serif, derived from top concerns)
 *   4. Concern cards (4, ranked 1→4), each carrying finding / interpretation
 *      / next step + severity + trend
 *   5. Tonight's focus (consolidated action plan)
 *   6. Trust note
 *   7. Primary CTA
 *
 * Tapping a hotspot marker on the photo scrolls to the matching concern card
 * and briefly highlights it. Tapping a concern card brightens its marker on
 * the photo. This is the "grounded in the actual face" principle the product
 * critique called out — every concern is visibly tied to a region.
 */

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
  const summary = buildSummaryHeadline(concerns);
  const tonight = buildTonightFocus(concerns);

  const scrollRef = useRef<ScrollView>(null);
  const cardOffsets = useRef<Record<number, number>>({});
  const [focusedRank, setFocusedRank] = useState<number | null>(null);

  if (!scan) return null;

  const photoSize = {
    w: width - 40,
    h: Math.round((width - 40) * 1.15),
  };

  const close = () => {
    hapt.select();
    rootNav.goBack();
  };

  const handleHotspotTap = (rank: number) => {
    hapt.select();
    const y = cardOffsets.current[rank];
    if (typeof y === 'number') {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
    }
    setFocusedRank(rank);
    setTimeout(() => setFocusedRank(null), 1400);
  };

  const handleCardTap = (rank: number) => {
    hapt.select();
    setFocusedRank(rank);
    setTimeout(() => setFocusedRank(null), 1400);
  };

  const handleSaveAndClose = () => {
    hapt.success();
    // Scan is already persisted — this CTA just returns to Home.
    rootNav.goBack();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

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
        <Text style={styles.headerKicker} maxFontSizeMultiplier={1.1}>
          READING COMPLETE
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <HeroPhoto
          photoUri={scan.photoUri}
          overallScore={scan.overallScore}
          size={photoSize}
          concerns={concerns}
          focusedRank={focusedRank}
          onHotspotTap={handleHotspotTap}
        />

        <Text style={styles.summary} maxFontSizeMultiplier={1.15}>
          {summary}
        </Text>

        <View style={styles.concernStack}>
          {concerns.map((concern) => (
            <ConcernCard
              key={concern.category}
              concern={concern}
              focused={focusedRank === concern.rank}
              onLayout={(y) => {
                cardOffsets.current[concern.rank] = y;
              }}
              onPress={() => handleCardTap(concern.rank)}
            />
          ))}
        </View>

        <TonightFocusCard steps={tonight} />

        <Text style={styles.trustNote} maxFontSizeMultiplier={1.2}>
          Based on visible signals in your scan. Not a medical diagnosis.
        </Text>

        <View style={{ height: 16 }} />

        <Pressable
          onPress={handleSaveAndClose}
          style={({ pressed }) => [
            styles.primaryCta,
            pressed && { opacity: 0.94, transform: [{ scale: 0.985 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Save and return"
        >
          <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
            Save to progress
          </Text>
          <ArrowRight size={16} color={palette.inkInverse} weight="duotone" />
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// Hero photo + hotspot markers
// ============================================================================

function HeroPhoto({
  photoUri,
  overallScore,
  size,
  concerns,
  focusedRank,
  onHotspotTap,
}: {
  photoUri: string;
  overallScore: number;
  size: { w: number; h: number };
  concerns: Concern[];
  focusedRank: number | null;
  onHotspotTap: (rank: number) => void;
}) {
  // Each marker renders at every hotspot for the concern; rank controls its
  // pulse intensity + prominence (rank 1 pulses brightest; rank 4 is quiet).
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
      {/* Soft warm tint to ground the face into the interface */}
      <View style={styles.heroTint} pointerEvents="none" />

      {/* Hotspot overlay — each concern's hotspots painted as pulsing dots.
          Pressables for a11y / tap-to-focus. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {concerns.flatMap((concern) =>
          concern.hotspots.map((pt, i) => (
            <HotspotMarker
              key={`${concern.category}-${i}`}
              rank={concern.rank}
              severity={concern.severity}
              x={pt.x * size.w}
              y={pt.y * size.h}
              focused={focusedRank === concern.rank}
              onPress={() => onHotspotTap(concern.rank)}
            />
          ))
        )}
      </View>

      {/* Overall score chip, anchored bottom-right */}
      <View style={styles.scoreChip}>
        <Text style={styles.scoreChipKicker} maxFontSizeMultiplier={1.1}>
          OVERALL
        </Text>
        <Text style={styles.scoreChipNumber} maxFontSizeMultiplier={1.15}>
          {overallScore}
        </Text>
      </View>
    </View>
  );
}

function HotspotMarker({
  rank,
  severity,
  x,
  y,
  focused,
  onPress,
}: {
  rank: number;
  severity: Severity;
  x: number;
  y: number;
  focused: boolean;
  onPress: () => void;
}) {
  const color = colorForSeverity(severity);

  // Pulse intensity driven by rank — rank 1 pulses brightest, rank 4 is quiet.
  const intensity = rank === 1 ? 1 : rank === 2 ? 0.7 : rank === 3 ? 0.5 : 0.35;

  const pulse = useSharedValue(0);
  const focusGlow = useSharedValue(0);

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

  React.useEffect(() => {
    focusGlow.value = withTiming(focused ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [focused, focusGlow]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: (1 - pulse.value) * 0.6 * intensity,
    transform: [{ scale: 0.3 + pulse.value * 2.2 }],
  }));

  const focusStyle = useAnimatedStyle(() => ({
    opacity: focusGlow.value,
    transform: [{ scale: 0.6 + focusGlow.value * 0.8 }],
  }));

  const DOT = 12;
  const RING = 32;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Concern rank ${rank}`}
      hitSlop={10}
      style={[
        styles.hotspotTouch,
        { left: x - 20, top: y - 20 },
      ]}
    >
      {/* Pulsing ring */}
      <Animated.View
        style={[
          styles.hotspotRing,
          {
            width: RING,
            height: RING,
            borderRadius: RING / 2,
            borderColor: color,
            left: 20 - RING / 2,
            top: 20 - RING / 2,
          },
          pulseStyle,
        ]}
      />
      {/* Focus glow (brightens when the matching card is tapped) */}
      <Animated.View
        style={[
          styles.hotspotFocus,
          {
            width: RING * 1.5,
            height: RING * 1.5,
            borderRadius: (RING * 1.5) / 2,
            backgroundColor: color,
            left: 20 - (RING * 1.5) / 2,
            top: 20 - (RING * 1.5) / 2,
          },
          focusStyle,
        ]}
      />
      {/* Core dot + outline */}
      <View
        style={[
          styles.hotspotCore,
          {
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: color,
            left: 20 - DOT / 2,
            top: 20 - DOT / 2,
          },
        ]}
      />
      <View
        style={[
          styles.hotspotCoreHalo,
          {
            width: DOT + 4,
            height: DOT + 4,
            borderRadius: (DOT + 4) / 2,
            left: 20 - (DOT + 4) / 2,
            top: 20 - (DOT + 4) / 2,
          },
        ]}
      />
    </Pressable>
  );
}

// ============================================================================
// Concern card
// ============================================================================

function ConcernCard({
  concern,
  focused,
  onLayout,
  onPress,
}: {
  concern: Concern;
  focused: boolean;
  onLayout: (y: number) => void;
  onPress: () => void;
}) {
  const color = colorForSeverity(concern.severity);
  const dots = severityDotCount(concern.severity);

  const borderAnim = useSharedValue(0);
  React.useEffect(() => {
    borderAnim.value = withTiming(focused ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [focused, borderAnim]);

  const cardStyle = useAnimatedStyle(() => ({
    borderColor:
      borderAnim.value > 0.5
        ? color
        : palette.hairline,
    borderWidth: 1 + borderAnim.value * 0.5,
  }));

  return (
    <Pressable
      onPress={onPress}
      onLayout={(e) => onLayout(e.nativeEvent.layout.y)}
      style={({ pressed }) => [pressed && { opacity: 0.98 }]}
      accessibilityRole="button"
      accessibilityLabel={`${CATEGORY_LABEL[concern.category]} — ${severityLabel(
        concern.severity
      )} — ${concern.region}`}
    >
      <Animated.View style={[styles.concernCard, cardStyle]}>
        <View style={styles.concernHead}>
          <View style={styles.rankDot}>
            <Text style={styles.rankDotText} maxFontSizeMultiplier={1.1}>
              {concern.rank}
            </Text>
          </View>
          <View style={styles.severityDots}>
            {Array.from({ length: 3 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.severityDot,
                  {
                    backgroundColor:
                      i < dots ? color : palette.bgDeep,
                  },
                ]}
              />
            ))}
          </View>
          <View style={{ flex: 1 }} />
          <TrendChip trend={concern.trend} />
        </View>

        <Text
          style={styles.concernTitle}
          maxFontSizeMultiplier={1.15}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {`${CATEGORY_LABEL[concern.category]} \u00B7 ${severityLabel(
            concern.severity
          )} \u00B7 ${concern.region}`}
        </Text>

        <Text
          style={styles.concernFinding}
          maxFontSizeMultiplier={1.2}
          numberOfLines={4}
        >
          {concern.finding}
        </Text>

        <View style={styles.concernMeta}>
          <Text style={styles.concernMetaLabel} maxFontSizeMultiplier={1.1}>
            WHAT IT MEANS
          </Text>
          <Text style={styles.concernMetaBody} maxFontSizeMultiplier={1.2}>
            {concern.interpretation}
          </Text>
        </View>

        <View style={styles.concernMeta}>
          <Text style={styles.concernMetaLabel} maxFontSizeMultiplier={1.1}>
            TONIGHT
          </Text>
          <Text style={styles.concernMetaBody} maxFontSizeMultiplier={1.2}>
            {concern.nextStep}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function TrendChip({ trend }: { trend: ConcernTrend }) {
  const { icon: Icon, label, tint } = trendVisuals(trend);
  return (
    <View style={[styles.trendChip, { backgroundColor: tint.bg }]}>
      <Icon size={11} color={tint.fg} weight="duotone" />
      <Text
        style={[styles.trendChipLabel, { color: tint.fg }]}
        maxFontSizeMultiplier={1.1}
      >
        {label}
      </Text>
    </View>
  );
}

// ============================================================================
// Tonight's focus
// ============================================================================

function TonightFocusCard({ steps }: { steps: string[] }) {
  return (
    <View style={styles.tonight}>
      <Text style={styles.tonightKicker} maxFontSizeMultiplier={1.1}>
        TONIGHT\u2019S FOCUS
      </Text>
      <Text style={styles.tonightHeadline} maxFontSizeMultiplier={1.15}>
        {`A simple plan for tonight${'\u2014'}in order.`}
      </Text>
      <View style={styles.tonightList}>
        {steps.map((step, i) => (
          <View key={i} style={styles.tonightStep}>
            <View style={styles.tonightNumber}>
              <Text
                style={styles.tonightNumberText}
                maxFontSizeMultiplier={1.1}
              >
                {i + 1}
              </Text>
            </View>
            <Text
              style={styles.tonightStepText}
              maxFontSizeMultiplier={1.2}
            >
              {step}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function colorForSeverity(s: Severity): string {
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

function trendVisuals(trend: ConcernTrend): {
  icon: typeof ArrowUp;
  label: string;
  tint: { bg: string; fg: string };
} {
  switch (trend) {
    case 'new':
      return {
        icon: Minus,
        label: 'NEW',
        tint: { bg: palette.bgDeep, fg: palette.inkSecondary },
      };
    case 'improved':
      return {
        icon: ArrowUp,
        label: trendLabel(trend).toUpperCase(),
        tint: { bg: palette.mossLight, fg: palette.mossDeep },
      };
    case 'unchanged':
      return {
        icon: Minus,
        label: 'UNCHANGED',
        tint: { bg: palette.bgDeep, fg: palette.inkSecondary },
      };
    case 'worsened':
      return {
        icon: ArrowDown,
        label: 'WORTH WATCHING',
        tint: { bg: palette.rustLight, fg: palette.rust },
      };
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
  headerKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: palette.clay,
  },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // Hero photo
  hero: {
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    shadowColor: palette.ink,
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  heroTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(43,127,255,0.04)',
  },
  hotspotTouch: {
    position: 'absolute',
    width: 40,
    height: 40,
  },
  hotspotRing: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  hotspotFocus: {
    position: 'absolute',
    opacity: 0,
  },
  hotspotCore: {
    position: 'absolute',
  },
  hotspotCoreHalo: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(248,250,252,0.95)',
  },
  scoreChip: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(248,250,252,0.95)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  scoreChipKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.2,
    color: palette.inkTertiary,
    marginBottom: 1,
  },
  scoreChipNumber: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 28,
    lineHeight: 28,
    letterSpacing: -0.6,
    color: palette.clay,
    fontVariant: ['tabular-nums'],
  },

  // Summary
  summary: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: palette.ink,
    marginTop: 28,
    marginBottom: 20,
    maxWidth: '94%',
  },

  // Concern stack
  concernStack: {
    gap: 14,
    marginBottom: 28,
  },
  concernCard: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
  },
  concernHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  rankDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankDotText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: palette.inkInverse,
  },
  severityDots: {
    flexDirection: 'row',
    gap: 4,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendChipLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.0,
  },
  concernTitle: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 8,
  },
  concernFinding: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 24,
    color: palette.inkSecondary,
  },
  concernMeta: {
    marginTop: 14,
  },
  concernMetaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    marginBottom: 4,
  },
  concernMetaBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.ink,
  },

  // Tonight's focus
  tonight: {
    marginBottom: 24,
    paddingVertical: 22,
    paddingHorizontal: 22,
    borderRadius: 20,
    backgroundColor: palette.bgInk,
  },
  tonightKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: 'rgba(248,250,252,0.55)',
    marginBottom: 10,
  },
  tonightHeadline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: palette.inkInverse,
    marginBottom: 18,
  },
  tonightList: {
    gap: 14,
  },
  tonightStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tonightNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(248,250,252,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tonightNumberText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: palette.inkInverse,
  },
  tonightStepText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(248,250,252,0.92)',
  },

  // Trust note
  trustNote: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 13,
    lineHeight: 20,
    color: palette.inkTertiary,
    textAlign: 'center',
    marginTop: 6,
    marginHorizontal: 16,
  },

  // Primary CTA
  primaryCta: {
    height: 54,
    borderRadius: 27,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
});

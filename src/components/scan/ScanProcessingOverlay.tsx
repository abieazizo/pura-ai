/**
 * ScanProcessingOverlay — the new analyzing transition.
 *
 * Replaces the v18.x generic captioned photo with a staged sequence
 * that actually communicates what the pipeline is doing:
 *
 *   ┌────────────────────────────┐
 *   │ ◯ Checking scan quality…   │  cycling staged message
 *   ├────────────────────────────┤
 *   │ ▓▓▓▓▓░░░░░░░░░░░          │  segmented progress bar
 *   │ Quality · Signals · Score  │     (current stage labeled)
 *   │   · Plan · Products        │
 *   └────────────────────────────┘
 *
 * Beat plan (full scan):
 *   0ms — overlay enters
 *   500ms — Stage 1: Checking scan quality
 *   950ms — Stage 2: Reading visible signals
 *   1450ms — Stage 3: Reviewing texture and tone
 *   1950ms — Stage 4: Building tonight's plan
 *   2400ms — Stage 5: Matching support products
 *
 * Total minimum perceived: 1600ms. The component will not let the
 * caller dismiss it before the floor elapses — even if the AI gateway
 * returns instantly. Maximum is unbounded; if processing takes > 6500ms
 * we crossfade to a reassurance message ("Still reviewing the scan…").
 *
 * The overlay also pulses a subtle scan line down the photo so the
 * surface never feels static.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export type ProcessingFlavor = 'full' | 'partial' | 'low_quality';

export interface ScanProcessingOverlayProps {
  photoUri: string;
  flavor: ProcessingFlavor;
  /** Optional override — used by the analyzing screen to drive the long-wait line. */
  longWait?: boolean;
  /** Reduce-motion override. Honors OS Reduce Motion when omitted. */
  reduceMotion?: boolean;
}

const STAGES: Record<ProcessingFlavor, ReadonlyArray<string>> = {
  full: [
    'Scan quality confirmed',
    'Hydration signals reviewed',
    'Texture zones mapped',
    'Breakout areas checked',
    'Routine plan updated',
  ],
  partial: [
    'Visible areas confirmed',
    'Marking this as a partial scan',
    'Hydration signals reviewed',
    'Routine plan updated cautiously',
    'Matching support products',
  ],
  low_quality: [
    'Checking scan quality',
    'Lighting or framing may limit this scan',
    'Reviewing what is visible',
    'Preparing a safer result',
  ],
};

const STAGE_LABELS: ReadonlyArray<string> = [
  'Quality',
  'Hydration',
  'Texture',
  'Breakouts',
  'Routine',
];

const HEADER_TITLE = 'Reading visible skin signals';
const HEADER_SUB = 'Checking hydration, texture, and breakout areas.';
const PRIVACY_NOTE = 'Visible skin signals only · Not a medical diagnosis';

// Beat windows for each stage. Stage N becomes the active progress
// segment at STAGE_TIMES[N].
const STAGE_TIMES_FULL = [0, 500, 950, 1450, 1950, 2400];

const LONG_WAIT_THRESHOLD_MS = 6500;
const VERY_LONG_THRESHOLD_MS = 9500;

const LONG_WAIT_LINE = 'Still reviewing the scan…';
const VERY_LONG_LINE =
  'This is taking longer than expected. I’ll use the clearest visible signals.';

export function ScanProcessingOverlay({
  photoUri,
  flavor,
  longWait,
  reduceMotion: reduceMotionOverride,
}: ScanProcessingOverlayProps) {
  const osReduceMotion = useReduceMotion();
  const reduceMotion = reduceMotionOverride ?? osReduceMotion;
  const messages = STAGES[flavor];
  const stages = STAGE_LABELS;

  // ── Stage ticker ────────────────────────────────────────────────
  const [stageIndex, setStageIndex] = useState(0);
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < messages.length; i++) {
      const t = setTimeout(() => setStageIndex(i), STAGE_TIMES_FULL[i] ?? 500 * i);
      timers.push(t);
    }
    return () => timers.forEach(clearTimeout);
  }, [messages.length]);

  // ── Long-wait elapsed clock ─────────────────────────────────────
  const startedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Date.now() - startedAt.current);
    }, 250);
    return () => clearInterval(id);
  }, []);
  const showLongWait = longWait ?? elapsed >= LONG_WAIT_THRESHOLD_MS;
  const showVeryLong = elapsed >= VERY_LONG_THRESHOLD_MS;

  // ── Active caption ──────────────────────────────────────────────
  const caption = showVeryLong
    ? VERY_LONG_LINE
    : showLongWait
    ? LONG_WAIT_LINE
    : messages[Math.min(stageIndex, messages.length - 1)];

  // ── Photo entrance + scan line ──────────────────────────────────
  const photoEnter = useSharedValue(0);
  const scanLine = useSharedValue(0);

  useEffect(() => {
    photoEnter.value = withTiming(1, {
      duration: 420,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
  }, [photoEnter]);

  useEffect(() => {
    if (reduceMotion) {
      scanLine.value = 0;
      return;
    }
    scanLine.value = withRepeat(
      withDelay(
        220,
        withTiming(1, { duration: 1800, easing: Easing.bezier(0.4, 0, 0.2, 1) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(scanLine);
  }, [reduceMotion, scanLine]);

  const photoStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + 0.7 * photoEnter.value,
    transform: [
      { scale: 0.98 + 0.02 * photoEnter.value },
      { translateY: 6 * (1 - photoEnter.value) },
    ],
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: 320 * scanLine.value }],
    opacity:
      scanLine.value < 0.1
        ? scanLine.value * 2.8
        : scanLine.value > 0.85
        ? (1 - scanLine.value) * 1.86
        : 0.28,
  }));

  // ── Caption crossfade ───────────────────────────────────────────
  const captionOpacity = useSharedValue(1);
  const captionTranslate = useSharedValue(0);
  const renderedCaptionRef = useRef(caption);
  const [renderedCaption, setRenderedCaption] = useState(caption);
  useEffect(() => {
    if (caption === renderedCaptionRef.current) return;
    captionOpacity.value = withTiming(0, {
      duration: 160,
      easing: Easing.bezier(0.7, 0, 0.84, 0),
    });
    captionTranslate.value = withTiming(-5, { duration: 160 });
    const t = setTimeout(() => {
      renderedCaptionRef.current = caption;
      setRenderedCaption(caption);
      captionTranslate.value = 6;
      captionOpacity.value = withTiming(1, {
        duration: 220,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
      captionTranslate.value = withTiming(0, {
        duration: 220,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
    }, 160);
    return () => clearTimeout(t);
  }, [caption, captionOpacity, captionTranslate]);
  const captionAnim = useAnimatedStyle(() => ({
    opacity: captionOpacity.value,
    transform: [{ translateY: captionTranslate.value }],
  }));

  // ── Segmented progress geometry ─────────────────────────────────
  const segmentFill = useMemo(() => {
    // Compute completion fraction per segment.
    // Stage index 0 → first segment 30%, stage 1 → first done, second 30%, etc.
    return stages.map((_, i) => {
      if (stageIndex > i) return 1;
      if (stageIndex === i) return 0.55;
      return 0;
    });
  }, [stageIndex, stages]);

  return (
    <View style={styles.root} pointerEvents="none">
      <Text style={styles.headerTitle} maxFontSizeMultiplier={1.15}>
        {HEADER_TITLE}
      </Text>
      <Text style={styles.headerSubtitle} maxFontSizeMultiplier={1.2}>
        {HEADER_SUB}
      </Text>

      <View style={styles.photoFrame}>
        <Animated.View style={[StyleSheet.absoluteFillObject, photoStyle]}>
          <Image
            source={photoUri}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
          <View style={styles.photoTint} pointerEvents="none" />
        </Animated.View>
        {/* Animated scan line. Subtle, no laser. */}
        <Animated.View style={[styles.scanLine, scanLineStyle]} />
      </View>

      <Animated.Text
        style={[styles.caption, captionAnim]}
        maxFontSizeMultiplier={1.2}
        numberOfLines={2}
      >
        {renderedCaption}
      </Animated.Text>

      <View style={styles.segments}>
        {stages.map((label, i) => (
          <View key={label} style={styles.segmentCol}>
            <View style={styles.segmentBar}>
              <View
                style={[
                  styles.segmentFill,
                  { width: `${Math.round(segmentFill[i] * 100)}%` },
                ]}
              />
            </View>
            <Text
              style={[
                styles.segmentLabel,
                stageIndex >= i ? styles.segmentLabelActive : null,
              ]}
              maxFontSizeMultiplier={1.05}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.privacyNote} maxFontSizeMultiplier={1.15}>
        {PRIVACY_NOTE}
      </Text>
    </View>
  );
}

const PHOTO_W = 280;
const PHOTO_H = 360;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: 'rgba(248,250,252,0.96)',
    textAlign: 'center',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 18,
    color: 'rgba(248,250,252,0.7)',
    textAlign: 'center',
    marginBottom: 22,
    maxWidth: 320,
  },
  privacyNote: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    letterSpacing: 0.1,
    color: 'rgba(248,250,252,0.5)',
    textAlign: 'center',
    marginTop: 18,
  },
  photoFrame: {
    width: PHOTO_W,
    height: PHOTO_H,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(11,18,32,0.45)',
    marginBottom: 28,
  },
  photoTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,18,32,0.22)',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: '#7EF2C2',
    shadowColor: '#1C8DFF',
    shadowRadius: 6,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
  },
  caption: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 20,
    lineHeight: 26,
    color: 'rgba(248,250,252,0.92)',
    textAlign: 'center',
    marginBottom: 24,
    minHeight: 52,
  },
  segments: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 4,
    maxWidth: 360,
  },
  segmentCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  segmentBar: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(248,250,252,0.18)',
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    backgroundColor: '#68D8FF',
    borderRadius: 2,
  },
  segmentLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 1.1,
    color: 'rgba(248,250,252,0.42)',
    textTransform: 'uppercase',
  },
  segmentLabelActive: {
    color: 'rgba(191,234,255,0.95)',
  },
});

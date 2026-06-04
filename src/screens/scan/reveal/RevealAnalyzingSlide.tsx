/**
 * RevealAnalyzingSlide — screen 1 of the post-scan reveal (the "1 of 6"
 * analyzing state). Presentational only: it renders whatever `stage` it's
 * given. The owning ScanAnalyzingFaceScreen keeps its quality-gate state
 * machine; this just replaces the visual while the AI runs.
 *
 * Reference port: PURA eyebrow + step counter, Instrument Serif "AI Skin
 * Analysis" with a Pura-Blue italic "in progress", the captured photo under a
 * white triangulated mesh + scan sweep, and a Porcelain status card carrying
 * the 150px progress ring, a single rolling status line over a thin progress
 * bar, and a sparkle tip line.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Sparkle } from 'phosphor-react-native';
import { puraReveal, puraRevealLayout, puraRevealRadius, puraRevealShadow, puraRevealType } from '@/theme/tokens';
import type { LoadingStage } from '@/components/scan-results/AnalysisLoadingSlide';
import { RevealHeader } from './revealChrome';
import { ProgressRing } from '@/components/reveal/ProgressRing';

const ANALYZING_PHRASES = [
  'Mapping facial geometry...',
  'Reading skin tone across forehead...',
  'Checking pore density on T-zone...',
  'Analyzing texture on left cheek...',
  'Analyzing texture on right cheek...',
  'Measuring hydration signal...',
  'Detecting redness patterns...',
  'Reading barrier health indicators...',
  'Checking under-eye fatigue...',
  'Scanning for hyperpigmentation...',
  'Measuring sebum distribution...',
  'Detecting fine line patterns...',
  'Reading skin clarity...',
  'Cross-referencing with skin profile...',
  'Calibrating to your concerns...',
  'Finalizing analysis...',
] as const;

const ANALYZE_RAMP_MS = 7000;
const FINISH_SPRINT_MS = 300;
const PHRASE_INTERVAL_MS = 650;
const CROSSFADE_MS = 200;

export interface RevealAnalyzingSlideProps {
  photoUri?: string;
  stage: LoadingStage;
  onCancel?(): void;
}

export function RevealAnalyzingSlide({ photoUri, stage, onCancel }: RevealAnalyzingSlideProps) {
  const { width: vw } = useWindowDimensions();
  const done = stage === 'normalized';

  // Continuous progress: ramp to 95% over the analysis window, hold, then
  // sprint to 100% on completion. The integer % mirrors into JS state only
  // when it actually changes, so every integer 0..100 is rendered exactly once
  // and the ring (plain-number) redraws in lockstep with the text.
  const progress = useSharedValue(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    progress.value = withTiming(0.95, {
      duration: ANALYZE_RAMP_MS,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [progress]);

  useEffect(() => {
    if (done) {
      progress.value = withTiming(1, { duration: FINISH_SPRINT_MS, easing: Easing.out(Easing.quad) });
    }
  }, [done, progress]);

  useAnimatedReaction(
    () => Math.round(progress.value * 100),
    (cur, prev) => {
      if (cur !== prev) runOnJS(setPct)(cur);
    },
  );

  // Single rolling status line, crossfading through the phrase list until the
  // analysis completes, then snapping to "Analysis complete."
  const [phraseIndex, setPhraseIndex] = useState(0);
  const phraseOpacity = useSharedValue(1);

  useEffect(() => {
    if (done) {
      phraseOpacity.value = withTiming(1, { duration: 150 });
      return;
    }
    const advance = () => setPhraseIndex((i) => (i + 1) % ANALYZING_PHRASES.length);
    const id = setInterval(() => {
      phraseOpacity.value = withTiming(0, { duration: CROSSFADE_MS }, (finished) => {
        if (finished) {
          runOnJS(advance)();
          phraseOpacity.value = withTiming(1, { duration: CROSSFADE_MS });
        }
      });
    }, PHRASE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [done, phraseOpacity]);

  const phraseStyle = useAnimatedStyle(() => ({ opacity: phraseOpacity.value }));
  const phrase = done ? 'Analysis complete.' : ANALYZING_PHRASES[phraseIndex];

  const contentW = Math.min(vw, puraRevealLayout.maxContentWidth) - puraRevealLayout.screenPadding * 2;
  const frameW = Math.round(contentW * 0.78);
  const frameH = Math.round(frameW * 1.16);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.page}>
        <RevealHeader step={1} onClose={onCancel} />

        <View style={styles.titleBlock}>
          <Text style={[puraRevealType.displayTitle, { color: puraReveal.ink }]}>
            AI Skin Analysis
          </Text>
          <Text style={[puraRevealType.displayItalic, { color: puraReveal.blue }]}>
            in progress
          </Text>
          <Text style={[puraRevealType.body, styles.subtext]}>
            Mapping visible areas from your scan.
          </Text>
        </View>

        <View style={styles.photoBlock}>
          <PhotoMeshFrame photoUri={photoUri} width={frameW} height={frameH} active={!done} />
        </View>

        <View style={styles.card}>
          <ProgressRing
            size={150}
            stroke={puraRevealLayout.ringStroke}
            progress={pct / 100}
            color={puraReveal.blue}
            trackColor={puraReveal.ringTrack}
          >
            <View style={styles.ringCenter}>
              <Text style={[puraRevealType.ringNumber, { color: puraReveal.ink }]}>{pct}</Text>
              <Text style={[puraRevealType.ringPercent, { color: puraReveal.muted }]}>%</Text>
            </View>
          </ProgressRing>

          <View style={styles.phraseWrap}>
            <Animated.Text
              style={[puraRevealType.body, styles.phrase, { color: puraReveal.ink }, phraseStyle]}
              numberOfLines={2}
            >
              {phrase}
            </Animated.Text>
          </View>

          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>

          <View style={styles.divider} />
          <View style={styles.tipRow}>
            <Sparkle size={14} weight="fill" color={puraReveal.blue} />
            <Text style={[puraRevealType.tip, { color: puraReveal.muted }]}>
              Hold still for the sharpest read.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// PhotoMeshFrame — captured photo (or a neutral skin gradient) under a white
// triangulated mesh with a slow vertical scan sweep.
// ---------------------------------------------------------------------------

function PhotoMeshFrame({
  photoUri,
  width,
  height,
  active,
}: {
  photoUri?: string;
  width: number;
  height: number;
  active: boolean;
}) {
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      sweep.value = 0;
      return;
    }
    sweep.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [active, sweep]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sweep.value * height }],
    opacity: active ? 0.9 : 0,
  }));

  return (
    <View style={[styles.frame, { width, height }]}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={['#E8D2C2', '#D8B6A2', '#C99A86']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* White triangulated mesh. */}
      <FaceMesh width={width} height={height} />

      {/* Scan sweep — a soft blue-white bar travelling top → bottom. */}
      <Animated.View style={[styles.sweepWrap, sweepStyle]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(20,124,255,0.0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ width: '100%', height: 36 }}
        />
      </Animated.View>

      {/* Inner edge sheen. */}
      <View style={styles.frameEdge} pointerEvents="none" />
    </View>
  );
}

function FaceMesh({ width, height }: { width: number; height: number }) {
  const cols = 6;
  const rows = 8;
  const cw = width / cols;
  const rh = height / rows;
  const segs: string[] = [];
  for (let i = 0; i <= cols; i++) {
    const x = i * cw;
    segs.push(`M ${x} 0 L ${x} ${height}`);
  }
  for (let j = 0; j <= rows; j++) {
    const y = j * rh;
    segs.push(`M 0 ${y} L ${width} ${y}`);
  }
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      segs.push(`M ${i * cw} ${j * rh} L ${(i + 1) * cw} ${(j + 1) * rh}`);
    }
  }
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={segs.join(' ')} stroke={puraReveal.meshStroke} strokeWidth={0.7} fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: puraReveal.bg },
  page: {
    flex: 1,
    paddingHorizontal: puraRevealLayout.screenPadding,
    paddingTop: 6,
    maxWidth: puraRevealLayout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  titleBlock: { marginTop: 14 },
  subtext: { marginTop: 10, maxWidth: 300 },
  photoBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 14 },
  frame: {
    borderRadius: puraRevealRadius.cardLg,
    overflow: 'hidden',
    backgroundColor: puraReveal.porcelainDeep,
    ...puraRevealShadow.card,
  },
  frameEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: puraRevealRadius.cardLg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  sweepWrap: { position: 'absolute', left: 0, right: 0, top: -18 },
  card: {
    backgroundColor: puraReveal.surface,
    borderRadius: puraRevealRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraReveal.border,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 6,
    alignItems: 'center',
    ...puraRevealShadow.card,
  },
  ringCenter: { flexDirection: 'row', alignItems: 'baseline' },
  phraseWrap: {
    height: 42,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  phrase: { fontSize: 15, lineHeight: 19, textAlign: 'center' },
  track: {
    alignSelf: 'stretch',
    height: 2,
    borderRadius: 1,
    backgroundColor: puraReveal.ringTrack,
    overflow: 'hidden',
    marginTop: 12,
  },
  fill: { height: '100%', borderRadius: 1, backgroundColor: puraReveal.blue },
  divider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: puraReveal.border,
    marginVertical: 14,
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

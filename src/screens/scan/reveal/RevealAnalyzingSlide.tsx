/**
 * RevealAnalyzingSlide — screen 1 of the post-scan reveal (the "1 of 6"
 * analyzing state). Presentational only: it renders whatever `stage` it's
 * given. The owning ScanAnalyzingFaceScreen keeps its quality-gate state
 * machine; this just replaces the visual while the AI runs.
 *
 * Reference port: PURA eyebrow + step counter, Instrument Serif "AI Skin
 * Analysis" with a Pura-Blue italic "in progress", the captured photo under a
 * white triangulated mesh + scan sweep, and a Porcelain status card carrying
 * the 150px progress ring, the running checklist, and a sparkle tip line.
 */

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Check, Sparkle } from 'phosphor-react-native';
import { puraReveal, puraRevealLayout, puraRevealRadius, puraRevealShadow, puraRevealType } from '@/theme/tokens';
import type { LoadingStage } from '@/components/scan-results/AnalysisLoadingSlide';
import { RevealHeader } from './revealChrome';
import { ProgressRing } from '@/components/reveal/ProgressRing';

const STAGE_PROGRESS: Record<LoadingStage, number> = {
  image_ready: 0.12,
  quality_validated: 0.36,
  ai_result_returned: 0.64,
  geometry_ready: 0.84,
  normalized: 1.0,
};

const STATUS_ITEMS = ['Image quality', 'Visible areas', 'Focus areas', 'Results'] as const;

export interface RevealAnalyzingSlideProps {
  photoUri?: string;
  stage: LoadingStage;
  onCancel?(): void;
}

export function RevealAnalyzingSlide({ photoUri, stage, onCancel }: RevealAnalyzingSlideProps) {
  const { width: vw } = useWindowDimensions();
  const target = STAGE_PROGRESS[stage];
  const progress = useTween(target);
  const pct = Math.round(progress * 100);
  const checkedCount = Math.min(STATUS_ITEMS.length, Math.round(progress * STATUS_ITEMS.length));

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
          <PhotoMeshFrame photoUri={photoUri} width={frameW} height={frameH} active={stage !== 'normalized'} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <ProgressRing
              size={150}
              stroke={puraRevealLayout.ringStroke}
              progress={progress}
              color={puraReveal.blue}
              trackColor={puraReveal.ringTrack}
            >
              <View style={styles.ringCenter}>
                <Text style={[puraRevealType.ringNumber, { color: puraReveal.ink }]}>{pct}</Text>
                <Text style={[puraRevealType.ringPercent, { color: puraReveal.muted }]}>%</Text>
              </View>
            </ProgressRing>

            <View style={styles.cardCol}>
              <Text style={[puraRevealType.cardTitle, { color: puraReveal.ink }]}>Analyzing…</Text>
              <View style={styles.statusList}>
                {STATUS_ITEMS.map((label, i) => (
                  <StatusItem key={label} label={label} done={i < checkedCount} />
                ))}
              </View>
            </View>
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

function StatusItem({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={styles.statusItem}>
      <View style={[styles.statusDotWell, done && styles.statusCheck]}>
        {done ? (
          <Check size={10} weight="bold" color={puraReveal.white} />
        ) : (
          <View style={styles.statusDot} />
        )}
      </View>
      <Text
        style={[
          puraRevealType.statusItem,
          { color: done ? puraReveal.ink : puraReveal.veryMuted },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// useTween — RAF ease-out tween toward a numeric target (no animated SVG).
// ---------------------------------------------------------------------------

function useTween(target: number, duration = 540): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = from + (target - from) * eased;
      fromRef.current = cur;
      setValue(cur);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
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
    ...puraRevealShadow.card,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ringCenter: { flexDirection: 'row', alignItems: 'baseline' },
  cardCol: { flex: 1 },
  statusList: { marginTop: 10, gap: 8 },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDotWell: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCheck: { backgroundColor: puraReveal.done },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: puraReveal.ringTrack,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: puraReveal.border,
    marginVertical: 14,
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

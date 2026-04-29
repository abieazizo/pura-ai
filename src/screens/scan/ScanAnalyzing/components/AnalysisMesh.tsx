/**
 * AnalysisMesh — v14.0 cinematic scanning rebuild.
 *
 * v11.9–v13.1 rendered an 11-node mesh with 15 edges that the user
 * described as "weak dots / random scattered overlays." It read as
 * decoration rather than a real "AI is reading the face" moment.
 *
 * v14.0 replaces the mesh with a refined three-layer scanning visual:
 *
 *   Layer 1 — soft vertical glow band that travels DOWN the face,
 *             with a subtle azure gradient. Reads as "the system is
 *             scanning the surface."
 *   Layer 2 — four region beacons (forehead / left cheek / right
 *             cheek / chin) that pulse softly in sequence as the
 *             sweep passes their Y position. Restrained, no clutter.
 *   Layer 3 — a thin azure horizon line that moves with the sweep
 *             and ties the band to its current Y, like a measurement
 *             reference.
 *
 * The whole composition is intentional, calm, and premium — closer
 * to how a high-end imaging product visualises an analysis pass
 * (AppleVision-style) than to the chatty "lots of dots" pattern of
 * cheap AI demos.
 *
 * Visual rules:
 *   • Single azure tint (#7CB0FF) — same color the rest of the AI
 *     analysis already uses. No multi-hue confusion.
 *   • Reduce-motion: skip the sweep animation and show the layer at
 *     a static low opacity so the analysis isn't a blank canvas for
 *     accessibility users.
 *   • All animation is timing-based (no random jitter), so the
 *     visual is consistent run-to-run.
 */

import React, { useEffect } from 'react';
import { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import type { Beat } from '../hooks/useAnalysisChoreography';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface AnalysisMeshProps {
  size: { w: number; h: number };
  beat: Beat;
  reduceMotion: boolean;
}

const MESH_COLOR = '#7CB0FF'; // azure, same as v11.9 mesh
const SWEEP_HEIGHT_RATIO = 0.36;
const SWEEP_DURATION_MS = 2400;

/**
 * Region beacons — only the four canonical zones the rest of the
 * choreography already uses. Position is normalized 0..1 within the
 * photo box. Each beacon pulses when the sweep band crosses its Y.
 */
const BEACONS: ReadonlyArray<{ x: number; y: number; key: string }> = [
  { x: 0.50, y: 0.30, key: 'forehead' },
  { x: 0.30, y: 0.55, key: 'left-cheek' },
  { x: 0.70, y: 0.55, key: 'right-cheek' },
  { x: 0.50, y: 0.82, key: 'chin' },
];

function layerOpacityForBeat(beat: Beat): number {
  switch (beat) {
    case 'arrive':
    case 'locate':
      return 0;
    case 'partition':
      return 0.55;
    case 'detect':
      return 0.85;
    case 'score':
      return 0.45;
    case 'settle':
    case 'reveal':
      return 0;
    default:
      return 0;
  }
}

export function AnalysisMesh({ size, beat, reduceMotion }: AnalysisMeshProps) {
  const layerOpacity = useSharedValue(0);
  const sweepProgress = useSharedValue(0); // 0 → 1 across photo height
  const gradientId = React.useId();

  // Layer-level opacity — fades the whole composition in/out per beat.
  useEffect(() => {
    const target = layerOpacityForBeat(beat);
    if (reduceMotion) {
      layerOpacity.value = target;
      return;
    }
    layerOpacity.value = withTiming(target, {
      duration: 560,
      easing: Easing.out(Easing.cubic),
    });
  }, [beat, reduceMotion, layerOpacity]);

  // Sweep band — repeats during PARTITION/DETECT/SCORE so the
  // composition reads as "live work" rather than a static overlay.
  useEffect(() => {
    if (reduceMotion) {
      sweepProgress.value = 0.5;
      return;
    }
    const isActive = beat === 'partition' || beat === 'detect' || beat === 'score';
    if (!isActive) {
      cancelAnimation(sweepProgress);
      sweepProgress.value = withTiming(0, { duration: 360 });
      return;
    }
    sweepProgress.value = 0;
    sweepProgress.value = withRepeat(
      withTiming(1, {
        duration: SWEEP_DURATION_MS,
        easing: Easing.inOut(Easing.cubic),
      }),
      -1,
      false // restart from 0 each loop, not back-and-forth
    );
    return () => cancelAnimation(sweepProgress);
  }, [beat, reduceMotion, sweepProgress]);

  const sweepBandHeight = size.h * SWEEP_HEIGHT_RATIO;
  const sweepTravel = size.h - sweepBandHeight;

  const sweepBandProps = useAnimatedProps(() => ({
    y: sweepProgress.value * sweepTravel,
    opacity: layerOpacity.value * 0.35,
  }));

  const horizonProps = useAnimatedProps(() => ({
    y: sweepProgress.value * sweepTravel + sweepBandHeight - 1,
    opacity: layerOpacity.value * 0.85,
  }));

  return (
    <>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={MESH_COLOR} stopOpacity={0} />
          <Stop offset="0.5" stopColor={MESH_COLOR} stopOpacity={0.5} />
          <Stop offset="1" stopColor={MESH_COLOR} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* Layer 1: vertical glow band */}
      <AnimatedRect
        x={0}
        width={size.w}
        height={sweepBandHeight}
        fill={`url(#${gradientId})`}
        animatedProps={sweepBandProps}
      />

      {/* Layer 3: thin azure horizon at the bottom edge of the band */}
      <AnimatedRect
        x={size.w * 0.04}
        width={size.w * 0.92}
        height={1}
        fill={MESH_COLOR}
        animatedProps={horizonProps}
      />

      {/* Layer 2: region beacons — pulse when the sweep crosses them */}
      {BEACONS.map((b, i) => (
        <Beacon
          key={b.key}
          cx={b.x * size.w}
          cy={b.y * size.h}
          beat={beat}
          reduceMotion={reduceMotion}
          stagger={i * 110}
          layerOpacity={layerOpacity}
        />
      ))}
    </>
  );
}

interface BeaconProps {
  cx: number;
  cy: number;
  beat: Beat;
  reduceMotion: boolean;
  stagger: number;
  layerOpacity: { value: number };
}

function Beacon({
  cx,
  cy,
  beat,
  reduceMotion,
  stagger,
  layerOpacity,
}: BeaconProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0.85;
      return;
    }
    const isActive = beat === 'partition' || beat === 'detect' || beat === 'score';
    if (!isActive) {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 280 });
      return;
    }
    pulse.value = 0;
    // Staggered start, then continuous slow pulse.
    pulse.value = withTiming(0, { duration: stagger });
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 1500,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true // back-and-forth so the beacon breathes
    );
    return () => cancelAnimation(pulse);
  }, [beat, reduceMotion, stagger, pulse]);

  // Outer halo — wide, soft, low opacity.
  const haloProps = useAnimatedProps(() => ({
    r: 6 + pulse.value * 8,
    opacity: layerOpacity.value * (0.18 + pulse.value * 0.22),
  }));
  // Inner core — small, brighter, breathes with the same phase.
  const coreProps = useAnimatedProps(() => ({
    r: 2 + pulse.value * 1.5,
    opacity: layerOpacity.value * (0.6 + pulse.value * 0.35),
  }));

  return (
    <>
      <AnimatedCircle
        cx={cx}
        cy={cy}
        fill={MESH_COLOR}
        animatedProps={haloProps}
      />
      <AnimatedCircle
        cx={cx}
        cy={cy}
        fill={MESH_COLOR}
        animatedProps={coreProps}
      />
    </>
  );
}

void palette; // keep import for future palette token migration

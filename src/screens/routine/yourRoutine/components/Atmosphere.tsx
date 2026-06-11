/**
 * Atmosphere — the living surface behind the whole experience.
 *
 * Real values, never a flat gradient: the period's sky (top→bottom), a true
 * SVG radial bloom drifting on a slow sine (full out-and-back period =
 * routineTiming.bloomDriftMs ≈ 27s, total travel vector ≤ 8px), and static
 * 4–6% film grain. Night is the hero — a near-black canvas with a radial lift
 * behind the orb and a deep-violet aurora, so the orb's glow is the only warm
 * light. Reduced motion stills the drift but keeps every layer.
 *
 * Grain is platform-split: SVG feTurbulence renders only on web (the installed
 * react-native-svg stubs FeTurbulence on iOS/Android), so native tiles a tiny
 * pre-rasterized alpha-noise PNG recolored to the period's tint — real grain
 * on every platform, never a silent no-op. The low perf tier skips the grain
 * layer entirely (the orb already tiers itself).
 */

import React, { useEffect } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Rect,
  Filter,
  FeTurbulence,
  FeColorMatrix,
} from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  ROUTINE_ATMOSPHERE,
  routineTiming,
  type PeriodAtmosphere,
  type RoutinePeriod,
} from '@/theme/routineAtmosphere';

export function useAtmosphere(period: RoutinePeriod): PeriodAtmosphere {
  return ROUTINE_ATMOSPHERE[period];
}

interface AtmosphereProps {
  period: RoutinePeriod;
  reduceMotion: boolean;
  /** 0→1: the ritual "gradient intensifies slightly" as you enter. */
  intensify?: SharedValue<number>;
  /** 'low' drops the grain layer (budget devices). Default 'high'. */
  perfTier?: 'high' | 'low';
}

// Unit drift vector — normalized so |(x, y)| tops out at exactly 1, keeping
// the combined travel within the ≤8px ceiling (x carries more than y).
const DRIFT_X = 0.857;
const DRIFT_Y = -0.514;

export function Atmosphere({ period, reduceMotion, intensify, perfTier = 'high' }: AtmosphereProps) {
  const atmo = ROUTINE_ATMOSPHERE[period];
  const drift = useSharedValue(0.5);

  useEffect(() => {
    if (reduceMotion) {
      drift.value = 0.5; // assignment cancels any running loop
      return;
    }
    drift.value = 0;
    // One leg = half the period; auto-reverse completes the 24–30s round trip.
    drift.value = withRepeat(
      withTiming(1, { duration: routineTiming.bloomDriftMs / 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [reduceMotion, drift]);

  const T = routineTiming.bloomTravelPx;
  const bloomStyle = useAnimatedStyle(() => {
    const k = (drift.value - 0.5) * 2; // -1..1
    return {
      transform: [{ translateX: k * T * DRIFT_X }, { translateY: k * T * DRIFT_Y }],
    };
  });

  // Ritual intensify — an ADDITIVE bloom layer (the resting bloom already sits
  // at its token opacity; a multiplier above 1 would clamp invisibly).
  const intensifyStyle = useAnimatedStyle(() => ({
    opacity: intensify ? intensify.value * atmo.bloom.opacity * 0.35 : 0,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[atmo.sky[0], atmo.sky[1], atmo.sky[2]] as [string, string, string]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Night: a radial lift behind the orb so it reads as the light source. */}
      {atmo.dark && <RadialWash id="orbpool" color={atmo.orbPool} cx="50%" cy="40%" r="55%" opacity={1} />}

      {/* The drifting bloom + the ritual's quiet intensify layer above it. */}
      <Animated.View style={[StyleSheet.absoluteFill, bloomStyle]}>
        <RadialWash
          id="bloom"
          color={atmo.bloom.color}
          cx={`${Math.round(atmo.bloom.x * 100)}%`}
          cy={`${Math.round(atmo.bloom.y * 100)}%`}
          r={`${Math.round(atmo.bloom.radius * 60)}%`}
          opacity={atmo.bloom.opacity}
        />
        <Animated.View style={[StyleSheet.absoluteFill, intensifyStyle]}>
          <RadialWash
            id="bloom-lift"
            color={atmo.bloom.color}
            cx={`${Math.round(atmo.bloom.x * 100)}%`}
            cy={`${Math.round(atmo.bloom.y * 100)}%`}
            r={`${Math.round(atmo.bloom.radius * 60)}%`}
            opacity={1}
          />
        </Animated.View>
      </Animated.View>

      {perfTier !== 'low' && (
        <FilmGrain color={atmo.grain.color} opacity={atmo.grain.opacity} seed={period === 'night' ? 7 : 3} />
      )}
    </View>
  );
}

function RadialWash({
  id,
  color,
  cx,
  cy,
  r,
  opacity,
}: {
  id: string;
  color: string;
  cx: string;
  cy: string;
  r: string;
  opacity: number;
}) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx={cx} cy={cy} r={r}>
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

// The pre-rasterized alpha-noise tile for native (see scripts/genGrainPng.cjs).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GRAIN_TILE = require('../../../../../assets/grain/grain96.png');

/**
 * Static film grain. Web: SVG fractal noise recolored to the period tint (the
 * alpha row passes 1.0 — the Svg-level opacity owns the spec percentage).
 * Native: the noise PNG tiled full-screen, tintColor = the period tint.
 */
function FilmGrain({ color, opacity, seed }: { color: string; opacity: number; seed: number }) {
  // Touch-through is owned by the atmosphere root (pointerEvents="none").
  if (Platform.OS !== 'web') {
    return (
      <Image
        source={GRAIN_TILE}
        resizeMode="repeat"
        style={[StyleSheet.absoluteFillObject, { opacity, tintColor: color }]}
        accessibilityElementsHidden
      />
    );
  }
  const { r, g, b } = hexToUnit(color);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} opacity={opacity}>
        <Defs>
          <Filter id={`grain-${seed}`}>
            <FeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} />
            <FeColorMatrix
              type="matrix"
              values={`0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 1 0`}
            />
          </Filter>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </Svg>
    </View>
  );
}

function hexToUnit(hex: string): { r: string; g: string; b: string } {
  const m = hex.replace('#', '');
  const v = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const num = parseInt(v.slice(0, 6), 16);
  return {
    r: (((num >> 16) & 255) / 255).toFixed(3),
    g: (((num >> 8) & 255) / 255).toFixed(3),
    b: ((num & 255) / 255).toFixed(3),
  };
}

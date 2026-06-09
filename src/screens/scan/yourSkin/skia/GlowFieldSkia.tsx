// @ts-nocheck
/* eslint-disable */
/**
 * GlowFieldSkia — the FULL-FIDELITY on-skin glow (the signature beat), GPU path.
 *
 * ⚠️ ORPHAN BY DESIGN (see ./README.md). A drop-in for the RN/SVG `GlowField`:
 * identical `GlowFieldProps` + `GlowFieldHandle`, so SkinMapCard enables it with
 * a one-line import swap.
 *
 * WHY SKIA (and why the SVG fallback can't fully do this): this draws each spot
 * as a real `GLOW_SKSL` fragment shader — a soft radial bloom with a hot inner
 * core — CLIPPED to that region's landmark polygon and composited with
 * BlendMode.Plus (true additive light, NEVER source-over) under a MaskFilter
 * blur for an organic feather. Additive + per-region clip is what makes the glow
 * read as luminous heat on EVERY skin tone and structurally unable to wash a
 * whole face. The SVG path fakes additivity with `mixBlendMode:'screen'`; only
 * the GPU gives a real radius-animated bloom at 120fps.
 *
 * • alpha = spot.strength, capped ≤ GLOW_ALPHA_CAP (0.32), halved on low conf.
 * • stronger side brighter AND blooms ~120ms sooner (strongest-first stagger).
 * • ONE finding lit at a time is the PARENT's job (cross-fade); this field just
 *   renders the active finding's spots.
 * • coverage-cap guard: a spot whose polygon is implausibly large is skipped.
 * • Reduce Motion → blooms appear settled (opacity set, no scale).
 * • Reduce Transparency → soft SOLID region fills (no blend, no shader).
 */

import React, { forwardRef, useImperativeHandle, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Fill,
  Group,
  Path,
  Paint,
  Blur,
  Shader,
  Skia,
} from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { GLOW_SKSL, colorToVec3 } from './orbShaders';
import { spotExceedsFrame } from '../coverageGuard';
import { polygonPointsAttr, type RegionGeometry, type PxPoint } from '../../firstFinding/faceRegions';
import { EASE, GLOW_ALPHA_CAP, TIMELINE } from '../../firstFinding/motion';
import type { MetricTint } from '../../firstFinding/metricTint';

const MAX_SPOTS = 4;
const GLOW_EFFECT = Skia.RuntimeEffect.Make(GLOW_SKSL);

// Same public contract as the RN GlowField (verbatim) so this is a true drop-in.
export interface GlowSpotInput {
  geometry: RegionGeometry;
  strength: number;
  chipLabel: string;
}
export interface GlowFieldHandle {
  bloom(index: number): void;
  settleAll(): void;
  reset(): void;
}
export interface GlowFieldProps {
  spots: GlowSpotInput[];
  tint: MetricTint;
  frameW: number;
  frameH: number;
  lowConfidence: boolean;
  reduceMotion: boolean;
  reduceTransparency: boolean;
  a11yLabel: string;
  renderChips?: boolean; // accepted for drop-in parity; screen 2 passes false
}

function buildPath(polygon: PxPoint[]) {
  const p = Skia.Path.Make();
  if (polygon.length === 0) return p;
  p.moveTo(polygon[0].x, polygon[0].y);
  for (let i = 1; i < polygon.length; i++) p.lineTo(polygon[i].x, polygon[i].y);
  p.close();
  return p;
}

export const GlowFieldSkia = forwardRef<GlowFieldHandle, GlowFieldProps>(
  function GlowFieldSkia(
    { spots, tint, frameW, frameH, lowConfidence, reduceMotion, reduceTransparency, a11yLabel },
    ref,
  ) {
    // Fixed pool → stable hook order regardless of spot count (mirrors RN field).
    const p0 = useSharedValue(0);
    const p1 = useSharedValue(0);
    const p2 = useSharedValue(0);
    const p3 = useSharedValue(0);
    const pool = useMemo(() => [p0, p1, p2, p3], [p0, p1, p2, p3]);

    // Per-spot capped additive alpha; strongest reads brightest (already sorted).
    const targets = useMemo(
      () =>
        spots.map((s) => {
          const base = Math.min(GLOW_ALPHA_CAP, Math.max(0.06, s.strength));
          return lowConfidence ? base * 0.5 : base;
        }),
      [spots, lowConfidence],
    );

    useImperativeHandle(
      ref,
      (): GlowFieldHandle => ({
        bloom(index) {
          const sv = pool[index];
          if (!sv) return;
          sv.value = reduceMotion ? 1 : withTiming(1, { duration: TIMELINE.bloomMs, easing: EASE.out });
        },
        settleAll() {
          pool.forEach((sv, i) => {
            if (i >= spots.length) return;
            if (reduceMotion) {
              sv.value = 1;
              return;
            }
            // Stronger side blooms ~120ms SOONER: strongest is index 0 → 0 delay.
            sv.value = withDelay(
              i * TIMELINE.bloomStaggerMs,
              withTiming(1, { duration: TIMELINE.bloomMs, easing: EASE.out }),
            );
          });
        },
        reset() {
          pool.forEach((sv) => {
            cancelAnimation(sv);
            sv.value = 0;
          });
        },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [spots.length, reduceMotion],
    );

    if (!GLOW_EFFECT) {
      return <View style={StyleSheet.absoluteFill} accessibilityRole="image" accessibilityLabel={a11yLabel} />;
    }

    return (
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessible
        accessibilityRole="image"
        accessibilityLabel={a11yLabel}
      >
        <Canvas style={StyleSheet.absoluteFill}>
          {spots.slice(0, MAX_SPOTS).map((s, i) => (
            <Spot
              key={`glow-${s.geometry.region}-${i}`}
              phase={pool[i]}
              target={targets[i]}
              geometry={s.geometry}
              tint={tint}
              frameW={frameW}
              frameH={frameH}
              reduceMotion={reduceMotion}
              reduceTransparency={reduceTransparency}
            />
          ))}
        </Canvas>
      </View>
    );
  },
);

function Spot({
  phase,
  target,
  geometry,
  tint,
  frameW,
  frameH,
  reduceMotion,
  reduceTransparency,
}: {
  phase: SharedValue<number>;
  target: number;
  geometry: RegionGeometry;
  tint: MetricTint;
  frameW: number;
  frameH: number;
  reduceMotion: boolean;
  reduceTransparency: boolean;
}) {
  const { polygon, centroid, bbox } = geometry;

  // ALL hooks run unconditionally (Rules of Hooks); we branch only in the render.
  const clip = useMemo(() => buildPath(polygon), [polygon]);
  // Feather radius fades to 0 BEFORE the polygon edge → the clip is a safety
  // boundary, never the visible edge.
  const radius = Math.max(8, Math.min(bbox.w, bbox.h) * 0.62);
  const color = useMemo(() => colorToVec3(tint.glow), [tint.glow]);
  // Coverage-cap guard (render-time belt): never draw an implausibly large spot.
  const tooBig = useMemo(() => spotExceedsFrame(polygon, frameW, frameH), [polygon, frameW, frameH]);

  // Bloom scale (0.7→1.0) rides the feather radius; we animate Group opacity for
  // the alpha bloom (GPU-cheap) and keep u_alpha at the capped target so the
  // peak can never exceed the cap.
  const uniforms = useDerivedValue(() => {
    'worklet';
    return {
      u_size: [frameW, frameH],
      u_center: [centroid.x, centroid.y],
      u_radius: reduceMotion ? radius : radius * (0.7 + 0.3 * phase.value),
      u_color: color,
      u_alpha: target,
    };
  }, [frameW, frameH, centroid.x, centroid.y, radius, target, color, reduceMotion]);

  const groupOpacity = useDerivedValue(() => phase.value);
  const solidOpacity = useDerivedValue(() => 0.85 * phase.value);

  if (tooBig) return null;

  if (reduceTransparency) {
    // Soft SOLID fill, still clipped to the region (no blend, no gradient).
    return (
      <Group clip={clip} opacity={solidOpacity}>
        <Path path={clip} color={tint.glow} />
      </Group>
    );
  }

  return (
    <Group
      clip={clip}
      opacity={groupOpacity}
      blendMode="plus"
      layer={
        <Paint>
          <Blur blur={Math.max(4, radius * 0.45)} />
        </Paint>
      }
    >
      <Fill>
        <Shader source={GLOW_EFFECT} uniforms={uniforms} />
      </Fill>
    </Group>
  );
}

/** Re-export the SVG `points` helper so callers that mix paths keep one import. */
export { polygonPointsAttr };

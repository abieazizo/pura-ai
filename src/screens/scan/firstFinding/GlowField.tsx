/**
 * GlowField — the signature beat. A soft glow blooms on the EXACT spot of the
 * user's real photo, clipped to that region's polygon, as ADDITIVE light.
 *
 * Additive WITHOUT Skia: RN 0.81 ships native `mixBlendMode`, so each glow is a
 * View in `screen` blend mode containing a feathered radial gradient clipped to
 * the region polygon (react-native-svg ClipPath + Polygon). Screen-blend ADDS
 * light, so it reads correctly on EVERY skin tone — never a paint over skin, and
 * never a whole-face blob (each glow is contained to its named region).
 *
 * Each spot is paired with a plain location chip + a 1px leader line
 * (Differentiate-Without-Color): color is never the only signal.
 *
 * Accessibility branches, all complete:
 *   • Reduce Transparency → soft SOLID polygon fills (no blend, no gradient).
 *   • Reduce Motion → glows appear SETTLED (no bloom scale; opacity is set, not
 *     animated) — driven by the parent calling settle().
 *   • The whole field exposes ONE VoiceOver text equivalent.
 *
 * The parent drives the blooms imperatively (ref) so each lands ON the spoken
 * word. Per-spot opacity = bloom(0..1) × target alpha; scale = 0.7→1.0.
 */

import React, { forwardRef, useImperativeHandle, useMemo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, {
  Defs,
  ClipPath,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
  Line as SvgLine,
} from 'react-native-svg';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  polygonPointsAttr,
  type RegionGeometry,
} from './faceRegions';
import { EASE, GLOW_ALPHA_CAP, TIMELINE, TYPE } from './motion';
import type { MetricTint } from './metricTint';

const MAX_SPOTS = 4;
const MAX_CHIPS = 2;

const BLEND_SCREEN = { mixBlendMode: 'screen' } as unknown as ViewStyle;

export interface GlowSpotInput {
  geometry: RegionGeometry;
  /** 0..1 from the model — capped/halved into the additive alpha. */
  strength: number;
  /** Plain chip label, e.g. "Left cheek". */
  chipLabel: string;
}

export interface GlowFieldHandle {
  /** Bloom spot `index` (ON the spoken word). */
  bloom(index: number): void;
  /** Bloom every spot now (reduced-motion / static reveal). */
  settleAll(): void;
  reset(): void;
}

export interface GlowFieldProps {
  spots: GlowSpotInput[]; // already strongest-first, length ≤ MAX_SPOTS
  tint: MetricTint;
  frameW: number;
  frameH: number;
  lowConfidence: boolean;
  reduceMotion: boolean;
  reduceTransparency: boolean;
  /** VoiceOver text equivalent, e.g. "redness shown on both cheeks, stronger on the left". */
  a11yLabel: string;
}

export const GlowField = forwardRef<GlowFieldHandle, GlowFieldProps>(
  function GlowField(
    { spots, tint, frameW, frameH, lowConfidence, reduceMotion, reduceTransparency, a11yLabel },
    ref,
  ) {
    // Fixed pool so hook order is stable regardless of spot count.
    const p0 = useSharedValue(0);
    const p1 = useSharedValue(0);
    const p2 = useSharedValue(0);
    const p3 = useSharedValue(0);
    const pool = useMemo(() => [p0, p1, p2, p3], [p0, p1, p2, p3]);

    // Per-spot additive alpha: capped, halved when low-confidence, and the
    // strongest spot reads brightest (strength already sorts that way).
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
          if (reduceMotion) {
            sv.value = 1;
            return;
          }
          sv.value = withTiming(1, { duration: TIMELINE.bloomMs, easing: EASE.out });
        },
        settleAll() {
          pool.forEach((sv, i) => {
            if (i < spots.length) sv.value = reduceMotion ? 1 : withTiming(1, { duration: TIMELINE.bloomMs, easing: EASE.out });
          });
        },
        reset() {
          pool.forEach((sv) => {
            cancelAnimation(sv);
            sv.value = 0;
          });
        },
      }),
      // pool + flags are stable for the life of the field.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [spots.length, reduceMotion],
    );

    return (
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessible
        accessibilityRole="image"
        accessibilityLabel={a11yLabel}
      >
        {/* Glows — additive (or solid under Reduce Transparency). */}
        {spots.slice(0, MAX_SPOTS).map((s, i) => (
          <Glow
            key={`glow-${s.geometry.region}-${i}`}
            phase={pool[i]}
            target={targets[i]}
            geometry={s.geometry}
            tint={tint}
            reduceMotion={reduceMotion}
            reduceTransparency={reduceTransparency}
          />
        ))}

        {/* Chips + leader lines (never blended) — Differentiate-Without-Color. */}
        {spots.slice(0, MAX_CHIPS).map((s, i) => (
          <Chip
            key={`chip-${s.geometry.region}-${i}`}
            phase={pool[i]}
            geometry={s.geometry}
            label={s.chipLabel}
            tint={tint}
            frameW={frameW}
            frameH={frameH}
            tentative={lowConfidence}
          />
        ))}
      </View>
    );
  },
);

// ───────────────────────────────────────────────────────────────────────────

function Glow({
  phase,
  target,
  geometry,
  tint,
  reduceMotion,
  reduceTransparency,
}: {
  phase: SharedValue<number>;
  target: number;
  geometry: RegionGeometry;
  tint: MetricTint;
  reduceMotion: boolean;
  reduceTransparency: boolean;
}) {
  const { bbox, polygon, centroid } = geometry;
  // Local (bbox-relative) coords for the svg.
  const localPoly = polygon.map((p) => ({ x: p.x - bbox.x, y: p.y - bbox.y }));
  const localCx = centroid.x - bbox.x;
  const localCy = centroid.y - bbox.y;
  // Feather radius — fades to 0 BEFORE the polygon edge so the clip never reads
  // as a hard cut; the clip is a safety boundary, not the visible edge.
  const radius = Math.max(8, Math.min(bbox.w, bbox.h) * 0.62);
  const gid = useMemo(
    () => `glow-${geometry.region}-${Math.round(bbox.x)}-${Math.round(bbox.y)}`,
    [geometry.region, bbox.x, bbox.y],
  );

  const style = useAnimatedStyle(() => ({
    opacity: phase.value * target,
    transform: reduceMotion ? [] : [{ scale: 0.7 + 0.3 * phase.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: bbox.x,
          top: bbox.y,
          width: Math.max(1, bbox.w),
          height: Math.max(1, bbox.h),
        },
        reduceTransparency ? null : BLEND_SCREEN,
        style,
      ]}
      pointerEvents="none"
    >
      <Svg width={Math.max(1, bbox.w)} height={Math.max(1, bbox.h)}>
        <Defs>
          <ClipPath id={`${gid}-clip`}>
            <Polygon points={polygonPointsAttr(localPoly)} />
          </ClipPath>
          {!reduceTransparency && (
            <RadialGradient
              id={`${gid}-grad`}
              cx={localCx}
              cy={localCy}
              r={radius}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={tint.glow} stopOpacity={1} />
              <Stop offset="0.5" stopColor={tint.glow} stopOpacity={0.45} />
              <Stop offset="1" stopColor={tint.glow} stopOpacity={0} />
            </RadialGradient>
          )}
        </Defs>
        {reduceTransparency ? (
          // Reduce Transparency → soft SOLID fill, still clipped to the region.
          <Polygon
            points={polygonPointsAttr(localPoly)}
            fill={tint.glow}
            fillOpacity={0.85}
          />
        ) : (
          <Rect
            x={0}
            y={0}
            width={Math.max(1, bbox.w)}
            height={Math.max(1, bbox.h)}
            fill={`url(#${gid}-grad)`}
            clipPath={`url(#${gid}-clip)`}
          />
        )}
      </Svg>
    </Animated.View>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function Chip({
  phase,
  geometry,
  label,
  tint,
  frameW,
  frameH,
  tentative,
}: {
  phase: SharedValue<number>;
  geometry: RegionGeometry;
  label: string;
  tint: MetricTint;
  frameW: number;
  frameH: number;
  tentative: boolean;
}) {
  const { centroid } = geometry;
  // Estimate chip size for clamping (measured-free; conservative).
  const chipW = Math.min(frameW - 16, label.length * 7.5 + 24);
  const chipH = 24;
  // Place the chip a little above the centroid, clamped to the frame.
  const chipX = clamp(centroid.x - chipW / 2, 6, frameW - chipW - 6);
  const chipY = clamp(centroid.y - 46, 6, frameH - chipH - 6);
  // Leader-line anchor = chip bottom-center.
  const anchorX = chipX + chipW / 2;
  const anchorY = chipY + chipH;

  const fade = useAnimatedStyle(() => ({ opacity: Math.min(1, phase.value) }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, fade]} pointerEvents="none">
      {/* Leader line (tentative → dashed + dimmer). */}
      <Svg style={StyleSheet.absoluteFill} width={frameW} height={frameH}>
        <SvgLine
          x1={anchorX}
          y1={anchorY}
          x2={centroid.x}
          y2={centroid.y}
          stroke={tint.line}
          strokeWidth={1}
          strokeOpacity={tentative ? 0.5 : 0.85}
          strokeDasharray={tentative ? '3 3' : undefined}
        />
      </Svg>
      <View
        style={[
          styles.chip,
          {
            left: chipX,
            top: chipY,
            minHeight: chipH,
            backgroundColor: tint.chipBg,
            borderColor: tint.chipBorder,
            opacity: tentative ? 0.92 : 1,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[TYPE.chip, { color: tint.chipText }]}
          maxFontSizeMultiplier={1.3}
        >
          {tentative ? `${label}?` : label}
        </Text>
      </View>
    </Animated.View>
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

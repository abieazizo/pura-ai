/**
 * ScanConcernContour — the connective visual artifact across the
 * entire Pura experience.
 *
 * Per the v29 spec: "the connective artifact across the app is a
 * subtle scan-derived observation visual and one human-readable
 * truth." This component is that visual. It appears in different
 * modes on Home, AI Assist, Routine, and Products so the app reads
 * as one connected intelligence system rather than five unrelated
 * tabs.
 *
 * Visual form:
 *   • Soft partial oval / face silhouette drawn with thin warm strokes.
 *   • Minimal inner guides suggesting facial planes / chin boundary.
 *   • A single diffuse glow near the focus zone (chin for breakouts,
 *     forehead, cheeks, nose, full_face for diffuse concerns).
 *   • No clinical heatmap, no scattered acne dots, no severity gauge.
 *
 * Modes:
 *   • ritual       — embedded faintly inside the Home orb.
 *   • observation  — visible but subtle, used on AI landing / Home
 *                    post-scan / Products.
 *   • reviewing    — adds a single traveling scan stroke while AI
 *                    considers the question.
 *   • placement    — clear chin highlight during Routine treat step.
 *
 * Animation:
 *   • Never continuously flashes.
 *   • ritual: extremely slow ambient pulse.
 *   • reviewing: one controlled scan stroke moves across the contour.
 *   • placement: glow fades in once when the step becomes active.
 *   • reduceMotion → static.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Defs,
  Ellipse,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { puraColors, puraType } from '@/design/puraTokens';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { ConcernZone } from '@/state/tonightObservation';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export type ContourMode = 'ritual' | 'observation' | 'reviewing' | 'placement';
export type ContourSize = 'small' | 'medium' | 'hero';

export interface ScanConcernContourProps {
  zone: ConcernZone;
  size?: ContourSize;
  mode?: ContourMode;
  showLabel?: boolean;
  label?: string;
  reduceMotion?: boolean;
}

const SIZE_MAP: Record<ContourSize, { width: number; height: number; labelMargin: number; labelSize: number }> = {
  small: { width: 84, height: 100, labelMargin: 8, labelSize: 10 },
  medium: { width: 140, height: 168, labelMargin: 12, labelSize: 11 },
  hero: { width: 200, height: 240, labelMargin: 14, labelSize: 12 },
};

// Normalized zone glow positions (cx, cy as 0–1 of viewBox 0–100).
const ZONE_POSITION: Record<ConcernZone, { cx: number; cy: number; rx: number; ry: number }> = {
  chin: { cx: 50, cy: 84, rx: 18, ry: 10 },
  forehead: { cx: 50, cy: 28, rx: 22, ry: 8 },
  cheeks: { cx: 50, cy: 56, rx: 32, ry: 12 },
  nose: { cx: 50, cy: 52, rx: 8, ry: 14 },
  full_face: { cx: 50, cy: 56, rx: 32, ry: 30 },
};

export function ScanConcernContour({
  zone,
  size = 'medium',
  mode = 'observation',
  showLabel = false,
  label,
  reduceMotion: reduceMotionProp,
}: ScanConcernContourProps) {
  const systemReduce = useReduceMotion();
  const reduceMotion = reduceMotionProp ?? systemReduce;
  const dims = SIZE_MAP[size];
  const z = ZONE_POSITION[zone];

  // Ambient ritual pulse — extremely slow opacity wave on the glow.
  const ambient = useSharedValue(mode === 'ritual' ? 0.6 : 1);
  useEffect(() => {
    if (reduceMotion || mode !== 'ritual') {
      ambient.value = mode === 'ritual' ? 0.6 : 1;
      return;
    }
    ambient.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.55, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(ambient);
  }, [mode, reduceMotion, ambient]);

  // Reviewing scan stroke — one travelling band across the contour,
  // looping while in this mode.
  const sweepY = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion || mode !== 'reviewing') {
      sweepY.value = 0;
      return;
    }
    sweepY.value = withRepeat(
      withTiming(100, { duration: 1800, easing: Easing.inOut(Easing.cubic) }),
      -1,
      false
    );
    return () => cancelAnimation(sweepY);
  }, [mode, reduceMotion, sweepY]);

  // Placement reveal — one fade-in of the glow when first mounted.
  const placementOp = useSharedValue(mode === 'placement' ? 0 : 1);
  useEffect(() => {
    if (mode !== 'placement') {
      placementOp.value = 1;
      return;
    }
    placementOp.value = withDelay(
      120,
      withTiming(1, { duration: 540, easing: Easing.out(Easing.cubic) })
    );
  }, [mode, placementOp]);

  const ambientStyle = useAnimatedStyle(() => ({
    opacity: mode === 'ritual' ? ambient.value : 1,
  }));

  const sweepProps = useAnimatedProps(() => ({
    y: sweepY.value - 8,
  }));

  // Static visual values per mode.
  const contourStroke =
    mode === 'ritual' ? puraColors.scanContour : puraColors.scanContour;
  const glowFillId = `glow-${zone}-${size}-${mode}`;
  const glowOpacity =
    mode === 'placement'
      ? 1
      : mode === 'observation'
      ? 0.85
      : mode === 'reviewing'
      ? 0.7
      : 0.55;

  return (
    <View
      style={[styles.wrap, { width: dims.width }]}
      accessibilityRole="image"
      accessibilityLabel={`Pura noticed visible activity concentrated on the ${zone.replace('_', ' ')} tonight.`}
    >
      <View style={{ width: dims.width, height: dims.height }}>
        <Svg viewBox="0 0 100 120" width="100%" height="100%">
          <Defs>
            <RadialGradient id={glowFillId} cx="50%" cy="50%" r="50%">
              <Stop
                offset="0"
                stopColor={puraColors.clay}
                stopOpacity={mode === 'placement' ? 0.45 : mode === 'ritual' ? 0.12 : 0.32}
              />
              <Stop
                offset="0.7"
                stopColor={puraColors.clay}
                stopOpacity={mode === 'ritual' ? 0.04 : 0.12}
              />
              <Stop offset="1" stopColor={puraColors.clay} stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {/* Soft face silhouette — a half-egg curve with quiet inner guides. */}
          <Path
            d="M50 6 C30 6 18 22 18 46 C18 76 28 104 50 116 C72 104 82 76 82 46 C82 22 70 6 50 6 Z"
            fill={puraColors.surfaceQuiet}
            stroke={contourStroke}
            strokeWidth={0.9}
          />
          {/* Subtle midline + chin boundary — almost imperceptible. */}
          <Path
            d="M50 12 L50 110"
            stroke={contourStroke}
            strokeWidth={0.4}
            strokeDasharray="1.5 3"
          />
          <Path
            d="M30 76 Q50 82 70 76"
            stroke={contourStroke}
            strokeWidth={0.5}
            fill="none"
          />

          {/* Reviewing scan stroke — translates downward. */}
          {mode === 'reviewing' && !reduceMotion ? (
            <AnimatedRect
              x="18"
              width="64"
              height="6"
              fill={puraColors.scanLine}
              opacity={0.7}
              animatedProps={sweepProps}
            />
          ) : null}

          {/* Focus zone glow. */}
          <Ellipse
            cx={z.cx}
            cy={z.cy}
            rx={z.rx}
            ry={z.ry}
            fill={`url(#${glowFillId})`}
            opacity={glowOpacity}
          />

          {/* Active ring on placement / observation / reviewing. */}
          {mode !== 'ritual' ? (
            <Ellipse
              cx={z.cx}
              cy={z.cy}
              rx={z.rx + 1.5}
              ry={z.ry + 1.5}
              stroke={puraColors.scanContourActive}
              strokeWidth={mode === 'placement' ? 1.4 : 0.9}
              fill="none"
              opacity={mode === 'placement' ? 1 : 0.7}
            />
          ) : null}
        </Svg>
        {/* Ambient pulse covers the entire SVG opacity only on ritual mode. */}
        {mode === 'ritual' ? (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, ambientStyle]}
          />
        ) : null}
        {/* Placement reveal opacity covers only the glow layer for first-mount fade. */}
        {mode === 'placement' ? (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              useAnimatedStyle(() => ({ opacity: placementOp.value })),
            ]}
          />
        ) : null}
      </View>

      {showLabel ? (
        <Text
          style={[
            styles.label,
            { marginTop: dims.labelMargin, fontSize: dims.labelSize },
          ]}
          maxFontSizeMultiplier={1.2}
        >
          {label ?? `${capitalize(zone.replace('_', ' '))} · active tonight`}
        </Text>
      ) : null}
    </View>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  label: {
    ...puraType.eyebrow,
    color: puraColors.muted,
    letterSpacing: 1.8,
    textAlign: 'center',
  },
});

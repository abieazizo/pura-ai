/**
 * A single detection marker painted during Beat 4: core dot + halo ring +
 * two pulse ripples + a transient italic-label pill.
 *
 * The pulsed rings are two independent circles staggered by 400ms so there
 * are never more than two ripples alive on-screen (spec: "TWO iterations
 * only"). Both are GC'd once the beat moves on.
 */

import React, { useEffect } from 'react';
import { Circle, G, Rect, Text as SvgText } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import type { FindingType } from '@/types';
import { getMarkerColor } from '../constants';
import type { Beat } from '../hooks/useAnalysisChoreography';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

export interface DetectionMarkerProps {
  cx: number;
  cy: number;
  type: FindingType;
  label: string;
  visible: boolean;
  beat: Beat;
  reduceMotion: boolean;
  /** index 0-3 — staggers label appearance so multiple markers don't
   * dogpile the same pill region. */
  index: number;
  /** Bounds for label placement — keeps pill inside the photo box. */
  photoSize: { w: number; h: number };
}

function haloOpacityForBeat(beat: Beat): number {
  if (beat === 'detect' || beat === 'score') return 0.75;
  if (beat === 'settle' || beat === 'reveal') return 0.4;
  return 0;
}

export function DetectionMarker({
  cx,
  cy,
  type,
  label,
  visible,
  beat,
  reduceMotion,
  index,
  photoSize,
}: DetectionMarkerProps) {
  const color = getMarkerColor(type);

  // Core + halo entrance.
  const entryScale = useSharedValue(0);
  const haloOpacity = useSharedValue(0);

  // Two pulse ripples.
  const ripple1R = useSharedValue(0);
  const ripple1Opacity = useSharedValue(0);
  const ripple2R = useSharedValue(0);
  const ripple2Opacity = useSharedValue(0);

  // Label pill fade.
  const labelOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      entryScale.value = 0;
      haloOpacity.value = 0;
      labelOpacity.value = 0;
      ripple1Opacity.value = 0;
      ripple2Opacity.value = 0;
      return;
    }

    const targetHalo = haloOpacityForBeat(beat);

    if (reduceMotion) {
      entryScale.value = 1;
      haloOpacity.value = targetHalo;
      labelOpacity.value = 0;
      return;
    }

    // Entrance — scale 0 → 1.1 → 1.0 springy.
    entryScale.value = withSequence(
      withTiming(1.1, { duration: 160, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 14, stiffness: 180 })
    );
    haloOpacity.value = withTiming(targetHalo, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });

    // Two pulse rings, staggered. Each lives 1200ms.
    const spawnRipple = (
      r: SharedValue<number>,
      op: SharedValue<number>,
      startDelay: number
    ) => {
      r.value = 16;
      op.value = 0.6;
      r.value = withDelay(
        startDelay,
        withTiming(36, { duration: 1200, easing: Easing.out(Easing.cubic) })
      );
      op.value = withDelay(
        startDelay,
        withTiming(0, { duration: 1200, easing: Easing.out(Easing.cubic) })
      );
    };
    spawnRipple(ripple1R, ripple1Opacity, 0);
    spawnRipple(ripple2R, ripple2Opacity, 400);

    // Label pill — stagger by index so all 4 don't flash simultaneously.
    const labelDelay = 80 + index * 180;
    labelOpacity.value = withDelay(
      labelDelay,
      withSequence(
        withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
        withDelay(700, withTiming(0, { duration: 250, easing: Easing.in(Easing.cubic) }))
      )
    );
  }, [visible, beat, reduceMotion, index, entryScale, haloOpacity, labelOpacity, ripple1R, ripple1Opacity, ripple2R, ripple2Opacity]);

  // Update halo on beat transitions post-entry (dim on settle/reveal).
  useEffect(() => {
    if (!visible || reduceMotion) return;
    const target = haloOpacityForBeat(beat);
    haloOpacity.value = withTiming(target, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [beat, visible, reduceMotion, haloOpacity]);

  // Core dot: filled, 3pt.
  const coreProps = useAnimatedProps(() => ({
    opacity: entryScale.value > 0 ? 1 : 0,
    r: 3 * Math.min(1.2, Math.max(0, entryScale.value)),
  }));
  // Halo: 7pt outer ring.
  const haloProps = useAnimatedProps(() => ({
    opacity: haloOpacity.value,
  }));
  // Glow: soft 14pt disc behind the core.
  const glowProps = useAnimatedProps(() => ({
    opacity: (haloOpacity.value * 0.35),
  }));

  const rippleProps1 = useAnimatedProps(() => ({
    r: ripple1R.value,
    opacity: ripple1Opacity.value,
  }));
  const rippleProps2 = useAnimatedProps(() => ({
    r: ripple2R.value,
    opacity: ripple2Opacity.value,
  }));

  const labelPillProps = useAnimatedProps(() => ({
    opacity: labelOpacity.value,
  }));

  if (!visible) return null;

  // Label pill geometry — placed just to the right of the marker, flipped
  // to the left if that would run off the photo edge.
  const labelFontSize = 13;
  const charW = labelFontSize * 0.50;
  const textW = label.length * charW;
  const padH = 10;
  const padV = 4;
  const pillW = textW + padH * 2;
  const pillH = labelFontSize + padV * 2 + 4;
  const preferRight = cx + 10 + pillW < photoSize.w - 8;
  const pillX = preferRight ? cx + 10 : cx - 10 - pillW;
  const pillY = cy - pillH / 2;
  const textX = pillX + pillW / 2;
  const textY = pillY + pillH / 2 + labelFontSize * 0.35;

  return (
    <G>
      {/* Soft glow disc under the core */}
      <AnimatedCircle
        cx={cx}
        cy={cy}
        r={14}
        fill={color}
        animatedProps={glowProps}
      />

      {/* Halo ring */}
      <AnimatedCircle
        cx={cx}
        cy={cy}
        r={7}
        fill="none"
        stroke={color}
        strokeWidth={1}
        animatedProps={haloProps}
      />

      {/* Pulse ripple 1 */}
      <AnimatedCircle
        cx={cx}
        cy={cy}
        fill="none"
        stroke={color}
        strokeWidth={1}
        animatedProps={rippleProps1}
      />

      {/* Pulse ripple 2 */}
      <AnimatedCircle
        cx={cx}
        cy={cy}
        fill="none"
        stroke={color}
        strokeWidth={1}
        animatedProps={rippleProps2}
      />

      {/* Core dot */}
      <AnimatedCircle
        cx={cx}
        cy={cy}
        fill={color}
        animatedProps={coreProps}
      />

      {/* Label pill */}
      <AnimatedG animatedProps={labelPillProps}>
        <Rect
          x={pillX}
          y={pillY}
          width={pillW}
          height={pillH}
          rx={pillH / 2}
          ry={pillH / 2}
          fill={palette.bg}
          fillOpacity={0.96}
        />
        <SvgText
          x={textX}
          y={textY}
          fill={color}
          fontFamily="InstrumentSerif-Italic"
          fontSize={labelFontSize}
          textAnchor="middle"
        >
          {label}
        </SvgText>
      </AnimatedG>
    </G>
  );
}

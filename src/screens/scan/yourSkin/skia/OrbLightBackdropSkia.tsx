// @ts-nocheck
/* eslint-disable */
/**
 * OrbLightBackdropSkia — the orb's CAST LIGHT (orphan; see ./README.md). The
 * editorial composition needs the orb to read as a real light SOURCE: a large,
 * off-axis, additive (BlendMode.Plus) radial that tints the dark background and
 * the tops of the cards beneath it. Rendered BEHIND Section A's content.
 *
 * It breathes on the SAME counter-phase idea as the orb halo (exhale = a touch
 * brighter), so the page itself seems to inhale with the companion. Reduce
 * Motion holds it steady. scanTone biases the hue, keeping the surface
 * scan-aware without ever tinting content text (hue stays in the light only).
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Circle, Group, RadialGradient, Blur, Paint, vec } from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { AssistantScanTone } from './AuroraOrbSkia';

const TONE: Record<AssistantScanTone, [string, string]> = {
  balanced: ['#7A6BC8', '#4A4E86'],
  reactive: ['#5E8FD0', '#3C5E96'],
  active: ['#8A6BC6', '#5A4690'],
  none: ['#6E89C6', '#3E4A82'],
};

export interface OrbLightBackdropSkiaProps {
  width: number;
  height: number;
  scanTone?: AssistantScanTone;
  /** Light origin as a fraction of the box (off-axis upper-left by default). */
  originX?: number;
  originY?: number;
  /** Peak opacity of the cast light. Default 0.5. */
  intensity?: number;
  forceReduceMotion?: boolean;
}

export function OrbLightBackdropSkia({
  width,
  height,
  scanTone = 'balanced',
  originX = 0.32,
  originY = 0.18,
  intensity = 0.5,
  forceReduceMotion,
}: OrbLightBackdropSkiaProps) {
  const sysReduce = useReduceMotion();
  const reduce = forceReduceMotion ?? sysReduce;
  const [inner, outer] = TONE[scanTone] ?? TONE.balanced;

  const cx = width * originX;
  const cy = height * originY;
  const r = Math.max(width, height) * 0.95;

  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduce) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 5200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [reduce, pulse]);

  const opacity = useDerivedValue(() => {
    'worklet';
    return intensity * (0.85 + 0.15 * pulse.value);
  }, [intensity]);

  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Group
        opacity={opacity}
        blendMode="plus"
        layer={
          <Paint>
            <Blur blur={Math.max(28, width * 0.12)} />
          </Paint>
        }
      >
        <Circle cx={cx} cy={cy} r={r}>
          <RadialGradient
            c={vec(cx, cy)}
            r={r}
            colors={[inner, outer, 'rgba(0,0,0,0)']}
            positions={[0, 0.45, 1]}
          />
        </Circle>
      </Group>
    </Canvas>
  );
}

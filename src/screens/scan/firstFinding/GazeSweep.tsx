/**
 * GazeSweep — the analyzing attention. A soft, fully-feathered radial sprite
 * (pre-blurred via a transparent-fading gradient — NO blur filter, never an
 * animated blur radius) drifts across the face the way real eyes move:
 * forehead → cheeks → nose → under-eyes → chin, ~1.1s/zone, easing in/out,
 * LOOPING. Only POSITION + OPACITY animate, on the UI thread. It is NOT a scan
 * line, laser, reticle, or grid.
 *
 * At the pivot the parent sets `gather` → 1: the sweep glides to center and
 * fades, handing off to the located findings.
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { SWEEP_PATH, TIMELINE } from './motion';
import type { FaceBox } from './faceRegions';

export interface GazeSweepProps {
  faceBox: FaceBox;
  frameW: number;
  frameH: number;
  /** Aurora glow color (matches the orb). */
  color: string;
  /** 0 = sweeping · 1 = gathered to center + faded (pivot). */
  gather: SharedValue<number>;
  reduceMotion: boolean;
  /** Dark mode reads the sweep as luminous heat → a touch more alpha. */
  dark: boolean;
}

export function GazeSweep({
  faceBox,
  frameW,
  frameH,
  color,
  gather,
  reduceMotion,
  dark,
}: GazeSweepProps) {
  const size = Math.min(frameW * 0.36, 150);
  const r = size / 2;
  const baseAlpha = (dark ? 0.2 : 0.17);

  // Flattened path numbers so the worklet captures plain arrays.
  const xs = useMemo(() => SWEEP_PATH.map((p) => p.x), []);
  const ys = useMemo(() => SWEEP_PATH.map((p) => p.y), []);
  const n = xs.length;

  // One continuous looping phase 0..n (cyclic), linear in time.
  const phase = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    phase.value = 0;
    phase.value = withRepeat(
      withTiming(n, { duration: n * TIMELINE.sweepZoneMs, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(phase);
  }, [phase, n, reduceMotion]);

  const cxBox = faceBox.x + faceBox.w * 0.5;
  const cyBox = faceBox.y + faceBox.h * 0.5;

  const style = useAnimatedStyle(() => {
    'worklet';
    // Sample the cyclic path with eased segments.
    const ph = phase.value % n;
    const i = Math.floor(ph);
    const frac = ph - i;
    const k = frac < 0.5 ? 2 * frac * frac : 1 - Math.pow(-2 * frac + 2, 2) / 2; // easeInOutQuad
    const ax = xs[i];
    const ay = ys[i];
    const bx = xs[(i + 1) % n];
    const by = ys[(i + 1) % n];
    let nx = ax + (bx - ax) * k;
    let ny = ay + (by - ay) * k;
    // Gather → glide to the face-box center + fade.
    const g = gather.value;
    nx = nx + (cxBox - nx) * g;
    ny = ny + (cyBox - ny) * g;
    const fx = (faceBox.x + nx * faceBox.w) * frameW;
    const fy = (faceBox.y + ny * faceBox.h) * frameH;
    return {
      opacity: (reduceMotion ? 0 : baseAlpha) * (1 - g),
      transform: [{ translateX: fx - r }, { translateY: fy - r }],
    };
  });

  return (
    <Animated.View
      style={[styles.sprite, { width: size, height: size }, style]}
      pointerEvents="none"
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="gaze-sweep" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="0.5" stopColor={color} stopOpacity={0.5} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill="url(#gaze-sweep)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sprite: { position: 'absolute', left: 0, top: 0 },
});

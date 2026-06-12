/**
 * ApertureEntry — the cinematic arrival.
 *
 * No hard cut into a live camera. The screen starts as ink; a circle
 * of light blooms open from center (an aperture) while the feed fades
 * up through it. ~720ms, then this overlay is inert. The frame's own
 * settle-in (GazeFrame `entered`) is choreographed to land just after
 * the aperture finishes.
 *
 * The hole is an SVG evenodd path with its radius driven by a one-shot
 * rAF burst (~45 frames) — deliberately not Reanimated→SVG props,
 * which are unreliable on web. Reduce Motion: a plain 280ms fade.
 */

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { gaze } from './gazeTokens';
import { MOTION } from './gazeMotion';

export interface ApertureEntryProps {
  width: number;
  height: number;
  /** Starts the bloom (camera granted + mounted). */
  open: boolean;
  /** Fired once the aperture is fully open. */
  onOpened?: () => void;
}

export function ApertureEntry({ width, height, open, onOpened }: ApertureEntryProps) {
  const reduceMotion = useReduceMotion();
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const rafRef = useRef<number | null>(null);
  const openedRef = useRef(false);
  // The parent re-renders ~15×/s with live signals; an inline onOpened
  // identity must NOT restart the bloom — hold it in a ref and run the
  // burst exactly once.
  const onOpenedRef = useRef(onOpened);
  onOpenedRef.current = onOpened;
  const startedRef = useRef(false);

  useEffect(() => {
    if (!open || done || startedRef.current) return;
    startedRef.current = true;
    if (reduceMotion || typeof requestAnimationFrame !== 'function') {
      // Reduced motion: a simple timed fade handled below via progress.
      const start = Date.now();
      const id = setInterval(() => {
        const p = Math.min(1, (Date.now() - start) / 280);
        setProgress(p);
        if (p >= 1) {
          clearInterval(id);
          setDone(true);
          if (!openedRef.current) {
            openedRef.current = true;
            onOpenedRef.current?.();
          }
        }
      }, 40);
      return () => clearInterval(id);
    }
    const start = Date.now();
    const step = () => {
      const t = Math.max(0, Date.now() - start - MOTION.APERTURE_DELAY_MS);
      const p = Math.min(1, t / MOTION.APERTURE_MS);
      // easeOutCubic — the bloom decelerates like an iris settling.
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(eased);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDone(true);
        if (!openedRef.current) {
          openedRef.current = true;
          onOpenedRef.current?.();
        }
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [open, done, reduceMotion]);

  if (done) return null;

  if (reduceMotion) {
    return (
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: gaze.veilInk, opacity: 1 - progress },
        ]}
      />
    );
  }

  const maxR = Math.hypot(width, height) / 2 + 4;
  const r = Math.max(0.01, progress * maxR);
  const cx = width / 2;
  const cy = height / 2;
  // Full-screen rect with a circular hole (evenodd) — the aperture.
  const d =
    `M 0 0 H ${width} V ${height} H 0 Z ` +
    `M ${cx - r} ${cy} ` +
    `a ${r} ${r} 0 1 0 ${r * 2} 0 ` +
    `a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;

  // The iris edge carries a whisper of aurora that fades as the bloom
  // completes — the companion's light opening the scene, not a wipe.
  const rimOpacity = 0.85 * (1 - progress * progress);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="apertureRim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={gaze.sweepViolet} />
            <Stop offset="100%" stopColor={gaze.sweepCyan} />
          </LinearGradient>
        </Defs>
        <Path d={d} fill={gaze.veilInk} fillRule="evenodd" />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="url(#apertureRim)"
          strokeWidth={2}
          strokeOpacity={rimOpacity}
          fill="none"
        />
      </Svg>
    </View>
  );
}

/**
 * GazeFrame — the living framing guide. The companion's gaze.
 *
 * One luminous portrait locket (a squircle of aurora light) that IS
 * the orb on this screen. It breathes, drifts patiently while
 * searching, and responds fluidly to the REAL quality signals:
 *
 *   framingScore  → the frame settles from loose to snug and its
 *                   searching drift stills (the gaze "finding" you)
 *   lightScore    → the glow warms and brightens
 *   sharpnessScore→ the edge crisps (soft halo recedes, line sharpens)
 *   allPass hold  → an anticipation ring completes around the frame
 *                   over the auto-capture hold (~1.3s) — a held breath
 *
 * No broken arcs, no brackets, no grid. The signals arrive
 * pre-smoothed from the engine; short 150ms bridges keep the 15Hz
 * steps continuous. All layer mixing is plain View opacity/transform
 * (reliable on web); only the ring uses a brief rAF burst.
 */

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { ScanQualitySignals } from '@/scanQuality/types';
import { THRESHOLDS } from '@/scanQuality/thresholds';
import { FRAME, frameGeometry, gaze } from './gazeTokens';
import { MOTION } from './gazeMotion';

export interface GazeFrameProps {
  /** Camera-region size the frame composes within. */
  width: number;
  height: number;
  signals: ScanQualitySignals;
  /** True from shutter fire until navigation — triggers the inhale. */
  capturing: boolean;
  /** Entry choreography progress: frame fades/settles in when true. */
  entered: boolean;
  /** The camera region's offset from the top of the screen — the
   *  surround dim extends past the region to cover the WHOLE feed
   *  (no lighter seams above/below the region). */
  screenTop?: number;
  /** Full screen height for the extended surround dim. */
  screenHeight?: number;
}

/** Rounded-portrait squircle path centered at (cx, cy). */
function locketPath(cx: number, cy: number, w: number, h: number, r: number): string {
  const x = cx - w / 2;
  const y = cy - h / 2;
  return [
    `M ${x + r} ${y}`,
    `H ${x + w - r}`,
    `A ${r} ${r} 0 0 1 ${x + w} ${y + r}`,
    `V ${y + h - r}`,
    `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
    `H ${x + r}`,
    `A ${r} ${r} 0 0 1 ${x} ${y + h - r}`,
    `V ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    'Z',
  ].join(' ');
}

export function GazeFrame({
  width,
  height,
  signals,
  capturing,
  entered,
  screenTop = 0,
  screenHeight,
}: GazeFrameProps) {
  const reduceMotion = useReduceMotion();
  const dimH = screenHeight ?? height;

  // ---- geometry (snug frame; looseness is a transform scale) -------------
  const { frameW, frameH, cx, cy } = frameGeometry(width, height);
  const radius = frameW * FRAME.RADIUS_FRAC;
  const path = locketPath(cx, cy, frameW, frameH, radius);
  const ringPath = locketPath(
    cx,
    cy,
    frameW + FRAME.RING_GAP * 2,
    frameH + FRAME.RING_GAP * 2,
    radius + FRAME.RING_GAP
  );
  const ringPerimeter =
    2 * (frameW + FRAME.RING_GAP * 2 - 2 * (radius + FRAME.RING_GAP)) +
    2 * (frameH + FRAME.RING_GAP * 2 - 2 * (radius + FRAME.RING_GAP)) +
    2 * Math.PI * (radius + FRAME.RING_GAP);

  // ---- signal-driven shared values ----------------------------------------
  const framing = useSharedValue(0);
  const softGlow = useSharedValue(0.6);
  const warm = useSharedValue(0);
  const crisp = useSharedValue(0.45);
  useEffect(() => {
    const t = { duration: MOTION.SIGNAL_BRIDGE_MS };
    framing.value = withTiming(signals.framingScore, t);
    softGlow.value = withTiming(
      Math.min(1, 0.2 + 0.55 * (1 - signals.sharpnessScore) + 0.25 * signals.lightScore),
      t
    );
    warm.value = withTiming(0.5 * signals.lightScore, t);
    crisp.value = withTiming(0.45 + 0.55 * signals.sharpnessScore, t);
  }, [signals, framing, softGlow, warm, crisp]);

  // ---- breath + searching drift (stilled under Reduce Motion) ---------------
  const breath = useSharedValue(0);
  const driftX = useSharedValue(0);
  const driftY = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      breath.value = 0;
      driftX.value = 0;
      driftY.value = 0;
      return;
    }
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: MOTION.BREATH_MS / 2, easing: MOTION.easeBreath }),
        withTiming(0, { duration: MOTION.BREATH_MS / 2, easing: MOTION.easeBreath })
      ),
      -1
    );
    driftX.value = withRepeat(
      withSequence(
        withTiming(1, { duration: MOTION.DRIFT_X_MS / 2, easing: MOTION.easeBreath }),
        withTiming(-1, { duration: MOTION.DRIFT_X_MS / 2, easing: MOTION.easeBreath })
      ),
      -1
    );
    driftY.value = withRepeat(
      withSequence(
        withTiming(1, { duration: MOTION.DRIFT_Y_MS / 2, easing: MOTION.easeBreath }),
        withTiming(-1, { duration: MOTION.DRIFT_Y_MS / 2, easing: MOTION.easeBreath })
      ),
      -1
    );
    return () => {
      cancelAnimation(breath);
      cancelAnimation(driftX);
      cancelAnimation(driftY);
    };
  }, [reduceMotion, breath, driftX, driftY]);

  // ---- capture inhale ----------------------------------------------------------
  const inhale = useSharedValue(1);
  useEffect(() => {
    inhale.value = withTiming(capturing ? MOTION.INHALE_SCALE : 1, {
      duration: MOTION.INHALE_MS,
      easing: MOTION.easeOut,
    });
  }, [capturing, inhale]);

  // ---- entry settle ---------------------------------------------------------------
  const present = useSharedValue(0);
  useEffect(() => {
    present.value = withTiming(entered ? 1 : 0, {
      duration: reduceMotion ? 240 : MOTION.FRAME_DRAW_MS,
      easing: MOTION.easeOut,
    });
  }, [entered, present, reduceMotion]);

  // ---- composed transforms ------------------------------------------------------
  const frameTransform = useAnimatedStyle(() => {
    const loose = 1 + (FRAME.WIDTH_LOOSE / FRAME.WIDTH_SNUG - 1) * (1 - framing.value);
    const settleIn = 1 + 0.05 * (1 - present.value);
    const amp = FRAME.DRIFT_AMPLITUDE * (1 - framing.value);
    return {
      opacity: present.value,
      // Scale around the locket's own center, not the region center.
      transformOrigin: `${cx}px ${cy}px`,
      transform: [
        { translateX: driftX.value * amp },
        { translateY: driftY.value * amp * 0.7 },
        {
          scale:
            loose * settleIn * inhale.value * (1 + MOTION.BREATH_SCALE * breath.value),
        },
      ],
    };
  });
  const softStyle = useAnimatedStyle(() => ({ opacity: softGlow.value }));
  const warmStyle = useAnimatedStyle(() => ({ opacity: warm.value }));
  const crispStyle = useAnimatedStyle(() => ({ opacity: crisp.value }));
  const surroundStyle = useAnimatedStyle(() => ({ opacity: present.value }));

  // ---- anticipation ring (rAF burst synced to the auto-capture hold) -------------
  const [ringProgress, setRingProgress] = useState(0);
  const ringRaf = useRef<number | null>(null);
  const armed = signals.allPass && !capturing;
  useEffect(() => {
    if (typeof requestAnimationFrame !== 'function') return;
    if (!armed) {
      if (ringRaf.current !== null) cancelAnimationFrame(ringRaf.current);
      ringRaf.current = null;
      setRingProgress(0);
      return;
    }
    const start = Date.now();
    const step = () => {
      const p = Math.min(1, (Date.now() - start) / THRESHOLDS.AUTO_CAPTURE_HOLD_MS);
      setRingProgress(p);
      if (p < 1) ringRaf.current = requestAnimationFrame(step);
    };
    ringRaf.current = requestAnimationFrame(step);
    return () => {
      if (ringRaf.current !== null) cancelAnimationFrame(ringRaf.current);
      ringRaf.current = null;
    };
  }, [armed]);
  // Reduce Motion: the timer still auto-captures; the ring presents as a
  // steady held state instead of a sweep.
  const ringShown = armed || capturing;
  const ringOffset = reduceMotion
    ? 0
    : ringPerimeter * (1 - (capturing ? 1 : ringProgress));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Surround dim — focuses the portrait, never a hard mask. Drawn
          oversized so the WHOLE feed dims (no seam at region edges). */}
      <Animated.View
        style={[styles.surround, { top: -screenTop, height: dimH }, surroundStyle]}
      >
        <Svg width={width} height={dimH}>
          <Path
            d={`M 0 0 H ${width} V ${dimH} H 0 Z ${locketPath(cx, cy + screenTop, frameW, frameH, radius)}`}
            fill={gaze.surroundDim}
            fillRule="evenodd"
          />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, frameTransform]}>
        {/* Inner glow — the locket holds light. */}
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="gazeInner" cx="50%" cy="42%" r="62%">
              <Stop offset="55%" stopColor={gaze.innerGlowEdge} />
              <Stop offset="86%" stopColor={gaze.innerGlow0} />
              <Stop offset="100%" stopColor={gaze.innerGlowEdge} />
            </RadialGradient>
          </Defs>
          <Path d={path} fill="url(#gazeInner)" />
        </Svg>

        {/* Soft aurora halo — recedes as the image crisps. */}
        <Animated.View style={[StyleSheet.absoluteFill, softStyle]}>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="gazeHalo" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={gaze.haloInner} />
                <Stop offset="100%" stopColor={gaze.haloOuter} />
              </LinearGradient>
            </Defs>
            <Path d={path} stroke="url(#gazeHalo)" strokeWidth={16} fill="none" />
            <Path d={path} stroke="url(#gazeHalo)" strokeWidth={8} fill="none" />
          </Svg>
        </Animated.View>

        {/* Warm bloom — rises with good light. */}
        <Animated.View style={[StyleSheet.absoluteFill, warmStyle]}>
          <Svg width={width} height={height}>
            <Path
              d={path}
              stroke={gaze.warmGlow}
              strokeWidth={7}
              fill="none"
              strokeOpacity={0.5}
            />
          </Svg>
        </Animated.View>

        {/* Crisp aurora line — the gaze itself. */}
        <Animated.View style={[StyleSheet.absoluteFill, crispStyle]}>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="gazeStroke" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={gaze.strokeViolet} />
                <Stop offset="52%" stopColor={gaze.strokeBlue} />
                <Stop offset="100%" stopColor={gaze.strokeCyan} />
              </LinearGradient>
            </Defs>
            <Path d={path} stroke="url(#gazeStroke)" strokeWidth={2.2} fill="none" />
          </Svg>
        </Animated.View>

        {/* Anticipation ring — completes over the allPass hold. */}
        {ringShown ? (
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="gazeRing" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={gaze.strokeViolet} />
                <Stop offset="100%" stopColor={gaze.strokeCyan} />
              </LinearGradient>
            </Defs>
            <Path d={ringPath} stroke={gaze.ringTrack} strokeWidth={3} fill="none" />
            <Path
              d={ringPath}
              stroke="url(#gazeRing)"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${ringPerimeter}`}
              strokeDashoffset={ringOffset}
            />
          </Svg>
        ) : null}
      </Animated.View>

      {/* Static fallback rect kept out — Rect import used by Defs typing */}
      <View style={styles.hidden}>
        <Svg width={1} height={1}>
          <Rect width={0} height={0} />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 0, height: 0, opacity: 0 },
  surround: { position: 'absolute', left: 0, right: 0 },
});

/**
 * CornflowerArc — Pura's signature capture instrument.
 *
 * "The Hum" direction (Pass 1) + Pass 3 deep-tune (typeface-designer
 * curve refinement). Three sub-iterations layered into one component:
 *
 *   1. Stroke curve — bezier(0.22, 0, 0.10, 1). More aggressive
 *      front-load + softer glide-in than the v1 bezier(0.32, 0, 0.18,
 *      1). Reads as a breath in, not a mechanical sweep. The numerical
 *      delta is small; the perceptual delta is significant — the
 *      leading edge accelerates harder into its first 30% and decays
 *      more gracefully into the last 15%.
 *
 *   2. Stroke gradient — three stops instead of two. Transparent at
 *      the trail, 0.55 cornflower mid-path, 1.0 cornflower into the
 *      last 8%, and a 5%-wide white highlight at the leading tip. The
 *      head reads as having heat / light, not just opacity. Closer to
 *      a glowing filament than a painted line.
 *
 *   3. Kindled ember — instead of a single terracotta drop, 3 micro-
 *      sparks emit at the 6 o'clock terminus 80ms BEFORE the main
 *      ember, then the main ember releases. The sparks scatter in
 *      randomized arcs and fade in 200ms. Reads as a kindled flame,
 *      not a single drop. The cornflower → terracotta handoff that
 *      defines the brand tension stays the same; the WAY it happens
 *      is now ceremonial rather than mechanical.
 *
 * The arc geometry: single stroke sweeping 270° around the face oval,
 * open at 6 o'clock — the breathing space, never a closed ring.
 * Duration 1800ms — matches the 2s hold-steady countdown with a 200ms
 * breath before the photo fires.
 *
 * Reduce-motion: static 270° arc at full opacity, no sweep, no
 * sparks, no ember release.
 *
 * Cornflower (#7CB0FF) is reserved for this component — no other
 * surface in the app uses it.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Cornflower — the ONLY surface in the app that uses this color.
const CORNFLOWER = '#7CB0FF';
// Terracotta ember — Pura's brand warmth, used for the handoff beat.
const TERRACOTTA = '#C97A5A';

const STROKE_WIDTH = 1.5;
const SWEEP_DEGREES = 270; // open at 6 o'clock — breathing space
const SWEEP_DURATION_MS = 1800;
const EMBER_DURATION_MS = 420;

export interface CornflowerArcProps {
  /** Pixel width of the face oval the arc wraps around. */
  ovalWidth: number;
  /** Pixel height of the face oval. */
  ovalHeight: number;
  /** True while the arc should run its sweep. */
  active: boolean;
  /** Fires when the sweep + ember sequence finishes. */
  onComplete?: () => void;
}

/**
 * Build the SVG path for a 270° arc around an ellipse. The arc starts
 * at 9 o'clock and sweeps clockwise to 6 o'clock — the bottom-left
 * 90° stays open as the intentional breathing space.
 */
function buildArcPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number
): string {
  // Start: 9 o'clock (cx - rx, cy)
  const startX = cx - rx;
  const startY = cy;
  // End: 6 o'clock (cx, cy + ry)
  const endX = cx;
  const endY = cy + ry;
  // 270° = large arc; sweep clockwise (sweep-flag = 1)
  return `M ${startX} ${startY} A ${rx} ${ry} 0 1 1 ${endX} ${endY}`;
}

export function CornflowerArc({
  ovalWidth,
  ovalHeight,
  active,
  onComplete,
}: CornflowerArcProps) {
  const reduceMotion = useReduceMotion();

  // Sweep progress 0 → 1 along the dashoffset.
  const sweep = useSharedValue(0);
  // Main ember — opacity + inward drift.
  const emberOpacity = useSharedValue(0);
  const emberDrift = useSharedValue(0);
  // Pass 3 — kindled-flame sparks. Three particles emit just before
  // the main ember releases, scatter in their own arcs, fade fast.
  const sparksOpacity = useSharedValue(0);
  const sparksDrift = useSharedValue(0);

  // SVG canvas pads the oval so the 1.5pt stroke isn't clipped.
  const pad = STROKE_WIDTH * 4;
  const svgW = ovalWidth + pad * 2;
  const svgH = ovalHeight + pad * 2;
  const cx = svgW / 2;
  const cy = svgH / 2;
  const rx = ovalWidth / 2;
  const ry = ovalHeight / 2;
  const path = buildArcPath(cx, cy, rx, ry);

  // Approximate arc length (Ramanujan ellipse perimeter × sweep
  // fraction) — drives the stroke-dasharray reveal.
  const perimeter =
    Math.PI *
    (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const arcLength = perimeter * (SWEEP_DEGREES / 360);

  useEffect(() => {
    if (!active) {
      cancelAnimation(sweep);
      cancelAnimation(emberOpacity);
      cancelAnimation(emberDrift);
      cancelAnimation(sparksOpacity);
      cancelAnimation(sparksDrift);
      sweep.value = 0;
      emberOpacity.value = 0;
      emberDrift.value = 0;
      sparksOpacity.value = 0;
      sparksDrift.value = 0;
      return;
    }
    if (reduceMotion) {
      sweep.value = 1;
      emberOpacity.value = 0;
      emberDrift.value = 0;
      sparksOpacity.value = 0;
      sparksDrift.value = 0;
      return;
    }
    sweep.value = 0;
    sweep.value = withTiming(
      1,
      {
        duration: SWEEP_DURATION_MS,
        // Pass 3 deep-tune: bezier(0.22, 0, 0.10, 1). More aggressive
        // front-load and softer glide-in than the Pass 1 curve. Reads
        // as a breath in, not a mechanical sweep.
        easing: Easing.bezier(0.22, 0, 0.1, 1),
      },
      (finished) => {
        if (!finished) return;
        // Pass 3 kindled-ember sequence: 3 micro-sparks emit FIRST,
        // then the main ember releases 80ms later. Reads as a flame
        // being kindled, not a single drop falling.
        sparksOpacity.value = withSequence(
          withTiming(1, { duration: 60, easing: Easing.out(Easing.cubic) }),
          withTiming(0, {
            duration: 220,
            easing: Easing.in(Easing.cubic),
          })
        );
        sparksDrift.value = withTiming(1, {
          duration: 260,
          easing: Easing.out(Easing.cubic),
        });

        // Main ember — delayed 80ms behind the sparks so the sequence
        // reads as "spark, spark, spark → flame", not all at once.
        emberOpacity.value = withDelay(
          80,
          withSequence(
            withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic) }),
            withTiming(0, {
              duration: EMBER_DURATION_MS - 120,
              easing: Easing.in(Easing.cubic),
            })
          )
        );
        emberDrift.value = withDelay(
          80,
          withTiming(
            1,
            {
              duration: EMBER_DURATION_MS,
              easing: Easing.out(Easing.cubic),
            },
            (emberFinished) => {
              if (emberFinished && onComplete) runOnJS(onComplete)();
            }
          )
        );
      }
    );
    return () => {
      cancelAnimation(sweep);
      cancelAnimation(emberOpacity);
      cancelAnimation(emberDrift);
      cancelAnimation(sparksOpacity);
      cancelAnimation(sparksDrift);
    };
  }, [
    active,
    reduceMotion,
    sweep,
    emberOpacity,
    emberDrift,
    sparksOpacity,
    sparksDrift,
    onComplete,
  ]);

  // Stroke-dashoffset reveal: full length → 0.
  const arcAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: arcLength * (1 - sweep.value),
  }));

  // Ember: starts at terminus (6 o'clock), drifts upward toward face
  // center. ~55% of the path to keep the motion inside the oval.
  const emberStyle = useAnimatedStyle(() => {
    const startX = cx;
    const startY = cy + ry;
    const driftY = startY + (cy - startY) * emberDrift.value * 0.55;
    return {
      opacity: emberOpacity.value,
      transform: [
        { translateX: startX - 3 },
        { translateY: driftY - 3 },
        { scale: 0.6 + emberDrift.value * 0.8 },
      ],
    };
  });

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { width: svgW, height: svgH }]}
    >
      <Svg width={svgW} height={svgH}>
        <Defs>
          {/* Pass 3 — three-stop gradient. Adds a near-white highlight
              at the leading 5% of the path so the head reads as having
              heat / light, not just opacity. Closer to a glowing
              filament than a painted line. */}
          <LinearGradient id="cornflowerArcStroke" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={CORNFLOWER} stopOpacity={0} />
            <Stop offset="0.45" stopColor={CORNFLOWER} stopOpacity={0.55} />
            <Stop offset="0.95" stopColor={CORNFLOWER} stopOpacity={1} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.92} />
          </LinearGradient>
        </Defs>
        <AnimatedPath
          d={path}
          stroke="url(#cornflowerArcStroke)"
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={arcLength}
          animatedProps={arcAnimatedProps}
        />
      </Svg>
      {/* Pass 3 — kindled sparks. Three micro-particles scatter in
          their own arcs 80ms before the main ember releases. Reads as
          a flame being kindled, not a single drop falling. */}
      <Spark
        cx={cx}
        cyBase={cy + ry}
        angle={-Math.PI / 3}
        opacity={sparksOpacity}
        drift={sparksDrift}
      />
      <Spark
        cx={cx}
        cyBase={cy + ry}
        angle={-Math.PI / 2}
        opacity={sparksOpacity}
        drift={sparksDrift}
      />
      <Spark
        cx={cx}
        cyBase={cy + ry}
        angle={(-2 * Math.PI) / 3}
        opacity={sparksOpacity}
        drift={sparksDrift}
      />

      {/* Terracotta ember — the brand handoff moment */}
      <Animated.View
        style={[
          styles.ember,
          emberStyle,
          { backgroundColor: TERRACOTTA, shadowColor: TERRACOTTA },
        ]}
      />
    </View>
  );
}

interface SparkProps {
  cx: number;
  cyBase: number;
  /** Radian angle the spark drifts toward from the terminus. */
  angle: number;
  opacity: ReturnType<typeof useSharedValue<number>>;
  drift: ReturnType<typeof useSharedValue<number>>;
}

/**
 * Single micro-spark. Smaller and warmer than the main ember, scatters
 * in its own arc from the 6 o'clock terminus, fades within 220ms.
 * Three of these together with randomized angles read as a kindled
 * flame at the moment the arc completes.
 */
function Spark({ cx, cyBase, angle, opacity, drift }: SparkProps) {
  const style = useAnimatedStyle(() => {
    const travel = 18 + drift.value * 14; // px from terminus
    const dx = Math.cos(angle) * travel;
    const dy = Math.sin(angle) * travel;
    return {
      position: 'absolute' as const,
      left: cx + dx - 2,
      top: cyBase + dy - 2,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: TERRACOTTA,
      shadowColor: TERRACOTTA,
      shadowOpacity: 0.5,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 0 },
      opacity: opacity.value * (0.6 + 0.4 * (1 - drift.value)),
      transform: [{ scale: 0.4 + 0.8 * (1 - drift.value) }],
    };
  });
  return <Animated.View pointerEvents="none" style={style} />;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  ember: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    top: 0,
    left: 0,
  },
});

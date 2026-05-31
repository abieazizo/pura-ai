/**
 * CornflowerArc — Pura's signature capture instrument.
 *
 * "The Hum" direction (Pass 1, Direction A):
 *   • Single 1.5pt cornflower stroke (#7CB0FF) sweeping 270° around
 *     the face oval. Open at 6 o'clock — the breathing space, never
 *     a closed ring. The 270° opening defines the silhouette.
 *   • Gradient stroke (transparent → cornflower) reads as a velocity
 *     trail behind the leading tip during the sweep.
 *   • Easing: custom cubic-bezier (0.32, 0, 0.18, 1) — front-loaded so
 *     the stroke gathers velocity mid-sweep and glides into completion.
 *     Reference: Halide's focus ring acceleration curve.
 *   • Duration: 1800ms — matches the 2s "hold steady" countdown with
 *     a 200ms breath at the end before the photo fires.
 *   • On completion: a single terracotta ember (Pura's brand warmth)
 *     releases from the arc's terminus at 6 o'clock and drifts inward
 *     toward the face center over 420ms while fading. This is the
 *     cornflower → terracotta handoff that defines the brand tension
 *     in a single gesture.
 *   • Reduce-motion: static 270° arc at full opacity, no sweep, no
 *     ember release.
 *
 * Cornflower (#7CB0FF) is reserved for this component — no other
 * surface in the app uses it. Terracotta is used elsewhere but the
 * ember-at-completion is a Pura signature beat.
 *
 * Replaces the moss-halo + sheen treatment that previously occupied
 * the `preparing` state of the face Reticle.
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
  // Ember opacity + inward drift.
  const emberOpacity = useSharedValue(0);
  const emberDrift = useSharedValue(0);

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
      sweep.value = 0;
      emberOpacity.value = 0;
      emberDrift.value = 0;
      return;
    }
    if (reduceMotion) {
      sweep.value = 1;
      emberOpacity.value = 0;
      emberDrift.value = 0;
      return;
    }
    sweep.value = 0;
    sweep.value = withTiming(
      1,
      {
        duration: SWEEP_DURATION_MS,
        // Front-loaded — gathers velocity mid-sweep, glides into
        // completion. Custom bezier matching Halide's focus ring.
        easing: Easing.bezier(0.32, 0, 0.18, 1),
      },
      (finished) => {
        if (!finished) return;
        // Ember release at the moment the arc completes.
        emberOpacity.value = withSequence(
          withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic) }),
          withTiming(0, {
            duration: EMBER_DURATION_MS - 120,
            easing: Easing.in(Easing.cubic),
          })
        );
        emberDrift.value = withTiming(
          1,
          {
            duration: EMBER_DURATION_MS,
            easing: Easing.out(Easing.cubic),
          },
          (emberFinished) => {
            if (emberFinished && onComplete) runOnJS(onComplete)();
          }
        );
      }
    );
    return () => {
      cancelAnimation(sweep);
      cancelAnimation(emberOpacity);
      cancelAnimation(emberDrift);
    };
  }, [active, reduceMotion, sweep, emberOpacity, emberDrift, onComplete]);

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
          <LinearGradient id="cornflowerArcStroke" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={CORNFLOWER} stopOpacity={0} />
            <Stop offset="0.4" stopColor={CORNFLOWER} stopOpacity={0.55} />
            <Stop offset="1" stopColor={CORNFLOWER} stopOpacity={1} />
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

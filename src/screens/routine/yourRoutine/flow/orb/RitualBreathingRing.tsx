/**
 * RitualBreathingRing — the companion's resting breath in ACT 2.
 *
 * A single thin hairline ring centered on the orb's rest position (cx, cy),
 * sitting just OUTSIDE the orb's silhouette (the caller sets `size` to the orb
 * diameter + a small gap). It breathes FOREVER: a gentle, slow expand/contract
 * coupled with an opacity soften, on a long ~5.5s full breath via Reanimated
 * withRepeat(..., -1, true) — the companion's resting breath, deliberately
 * SLOWER than the orb's own micro-breath (~4s) and FASTER than the theater
 * pool's breath (~9s) so the three layer rather than beat together. It is
 * present, never busy — no pulsing "recording" dot, no progress meaning, no
 * scold.
 *
 * MOTION (this pass) — all Reanimated worklets, NEVER setTimeout/Animated:
 *   • the breath: a local withRepeat(withTiming(..., inOut.sin), -1, true) on
 *     scale + opacity — kept from the build (the BreathingRing / CardBreath
 *     idiom), the established way an ambient loop lives in a component.
 *   • the entrance: an OPTIONAL `enter` SharedValue (the host threads the descent
 *     `p` from useDescent, 0 = overview → 1 = ritual) fades + settles the ring in
 *     as the orb arrives, so the companion's breath BEGINS with the carry-over
 *     rather than being present before the orb lands. Absent → already arrived
 *     (presents at rest), so the ring is safe to mount with the contract props
 *     alone.
 *   • Reduce Motion: rendered STILL at its mid/rest size + a calm static opacity
 *     (no withRepeat); the entrance degrades to a clean fade (no settle scale).
 *     The OS setting is live — a mid-session flip cancels the loop (matching the
 *     BreathingRing / CardBreath idiom).
 *
 * Pure overlay: absolutely positioned, pointerEvents none, accessibility-inert
 * (purely decorative). No text, no controls, no commerce — renders identically
 * for empty / all-done / product-free steps, because it frames the orb, not the
 * step content.
 *
 * Color comes from the `color` prop (the caller passes a quiet ritualTone token
 * — never hardcoded — that must NOT out-shine the orb's gold on Done). No hex
 * lives here.
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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
import type { RitualBreathingRingProps } from '../contracts';

// The breath: one slow expand/contract. 2.75s out + 2.75s back (auto-reverse)
// = a ~5.5s full breath — visibly slower than the orb's own micro-breath so the
// two layer instead of syncing.
const BREATH_LEG_MS = 2750;
const SCALE_MAX = 1.06; // ~1.0 → ~1.06 → ~1.0
const OPACITY_REST = 0.5; // both endpoints of the breath
const OPACITY_DIP = 0.18; // the softest point, mid-breath
// Reduce-motion rest: the mid scale + a calm static opacity between the two.
const REST_SCALE = 1 + (SCALE_MAX - 1) / 2;
const REST_OPACITY = (OPACITY_REST + OPACITY_DIP) / 2;
// The entrance settles the ring in from a touch tighter than rest, so the breath
// "opens" with the orb's arrival rather than snapping to size.
const ENTER_FROM_SCALE = 0.92;

const STROKE = 1.25; // a thin hairline (~1–1.5px)
const MIN_SIZE = 1; // guard a transient/garbage measure (no negative radius)

// Props beyond the locked contract are OPTIONAL so the host can mount the ring
// with the contract shape alone; `enter` (the shared descent value) is the only
// addition and degrades to "already arrived" when omitted.
type Props = RitualBreathingRingProps & {
  /**
   * The host's descent progress (the SAME `p` from `useDescent` that carries the
   * orb over): 0 = overview, 1 = ritual. The ring fades + settles in as it
   * crosses 1. Omit to present at full rest (mounts with the contract props
   * alone — integration-safe).
   */
  enter?: SharedValue<number>;
};

/**
 * The breathing ring around the orb's rest position. Implements
 * RitualBreathingRingProps exactly: { size, reduceMotion, cx, cy, color }, plus
 * an optional `enter` shared value the host threads from the descent.
 */
export function RitualBreathingRing({
  size,
  reduceMotion,
  cx,
  cy,
  color,
  enter,
}: Props) {
  // t: 0 at the rest endpoints, 1 at the softest mid-breath point.
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(t); // assignment alone won't stop a running loop
      t.value = 0;
      return;
    }
    t.value = 0;
    t.value = withRepeat(
      withTiming(1, { duration: BREATH_LEG_MS, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(t);
  }, [reduceMotion, t]);

  // The entrance factor (0→1). Tracks the host's descent when threaded; absent,
  // sits at 1 (already arrived). One derived number the worklet reads either way.
  const arrived = useDerivedValue(() => (enter ? enter.value : 1));

  // Guard against a zero/garbage measure so the SVG never gets a negative radius
  // or NaN. The diameter is `size`; the box is sized to the largest breath so the
  // expanding ring is never clipped.
  // INVARIANT: box === diameter * SCALE_MAX bounds the breath exactly (entrance
  // settle only ever SHRINKS via ENTER_FROM_SCALE<1, so max combined scale is
  // SCALE_MAX×1.0 = SCALE_MAX). Any future SCALE_MAX bump MUST keep this product
  // or the expanding ring will silently clip at the box edge.
  const diameter = Math.max(MIN_SIZE, size);
  const box = diameter * SCALE_MAX;
  const r = (diameter - STROKE) / 2;

  // A box-sized wrapper pinned at the top-left, then translated so its CENTER
  // lands on (cx, cy). scale therefore pivots on the ring center, and the ring
  // re-centers smoothly when the host reports new (cx, cy) coords. opacity +
  // scale breathe on the loop (or hold at rest under reduce-motion); the entrance
  // fades the whole ring in and settles its scale from a touch tighter.
  const ringStyle = useAnimatedStyle(() => {
    const a = arrived.value; // 0..1 entrance
    const breathScale = reduceMotion ? REST_SCALE : 1 + t.value * (SCALE_MAX - 1);
    // Settle the scale in from ENTER_FROM_SCALE → 1× over the entrance (no settle
    // under reduce-motion — a pure fade). Multiplies the breath so the loop
    // continues uninterrupted underneath.
    const settle = reduceMotion ? 1 : ENTER_FROM_SCALE + a * (1 - ENTER_FROM_SCALE);
    const scale = breathScale * settle;

    const breathOpacity = reduceMotion
      ? REST_OPACITY
      : OPACITY_REST + t.value * (OPACITY_DIP - OPACITY_REST);

    return {
      opacity: a * breathOpacity,
      transform: [
        { translateX: cx - box / 2 },
        { translateY: cy - box / 2 },
        { scale },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.anchor, { width: box, height: box }, ringStyle]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={box} height={box} pointerEvents="none">
        <Circle
          cx={box / 2}
          cy={box / 2}
          r={Math.max(MIN_SIZE / 2, r)}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Pinned at the field's top-left; the animated style translates it onto
  // (cx, cy). position:absolute (not absoluteFill) so the box keeps its own
  // size and `scale` pivots on the ring center.
  anchor: { position: 'absolute', left: 0, top: 0 },
});

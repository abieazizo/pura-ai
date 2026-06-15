/**
 * EchoGlow — THE FINDING ECHO. A soft radial glow in a finding's tint that
 * gently breathes (opacity 0.14↔0.20, scale 1↔1.04, ~3.2s). It is the visual
 * thread from the words to the face: the same tint the scan glow used sits
 * behind the pick that answers that finding. `boost` brightens it briefly on
 * the add interaction. Worklet-driven; a calm still under reduce-motion.
 *
 * `strength` (0..1, the finding's severity) scales the breath's viscerality
 * from the ONE `motion.echo` curve — opacity floor/ceiling and scale amplitude
 * both lean on it, so a mild finding whispers and a severe one presses. Size is
 * owned by ConcernPickCard's layout; strength expresses only as opacity/scale.
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { motion } from './tokens';

export function EchoGlow({
  tint,
  reduceMotion,
  boost,
  strength,
  id,
}: {
  tint: string;
  reduceMotion: boolean;
  /** Optional external 0..~0.12 brighten pulse (the add interaction). */
  boost?: SharedValue<number>;
  /** Finding severity 0..1 — scales breath viscerality. Defaults to 1. */
  strength?: number;
  id: string;
}) {
  // Clamp to the contract range; absent → full presence.
  const s = strength == null ? 1 : Math.max(0, Math.min(1, strength));

  const breath = useSharedValue(reduceMotion ? 0.5 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: motion.echo.halfMs, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: motion.echo.halfMs, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => {
      breath.value = 0.5;
    };
  }, [reduceMotion, breath]);

  const style = useAnimatedStyle(() => {
    // ONE curve, strength-scaled: mild findings whisper, severe ones press.
    const sFloor = motion.echo.min * (0.7 + 0.3 * s);
    const sMax = motion.echo.max * (0.6 + 0.4 * s);
    const o = sFloor + breath.value * (sMax - sFloor);
    const scaleMax =
      motion.echo.scaleMin + (motion.echo.scaleMax - motion.echo.scaleMin) * (0.6 + 0.4 * s);
    const scale = motion.echo.scaleMin + breath.value * (scaleMax - motion.echo.scaleMin);
    return {
      opacity: o + (boost ? boost.value : 0),
      transform: [{ scale }],
    };
  });

  const gid = `echo-${id}`;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={gid} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={tint} stopOpacity={1} />
            <Stop offset="55%" stopColor={tint} stopOpacity={0.5} />
            <Stop offset="100%" stopColor={tint} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
      </Svg>
    </Animated.View>
  );
}

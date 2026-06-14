/**
 * EchoGlow — THE FINDING ECHO. A soft radial glow in a finding's tint that
 * gently breathes (opacity 0.14↔0.20, scale 1↔1.04, ~3.2s). It is the visual
 * thread from the words to the face: the same tint the scan glow used sits
 * behind the pick that answers that finding. `boost` brightens it briefly on
 * the add interaction. Worklet-driven; a calm still under reduce-motion.
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
  id,
}: {
  tint: string;
  reduceMotion: boolean;
  /** Optional external 0..~0.12 brighten pulse (the add interaction). */
  boost?: SharedValue<number>;
  id: string;
}) {
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
    const o = motion.echo.min + breath.value * (motion.echo.max - motion.echo.min);
    const s = motion.echo.scaleMin + breath.value * (motion.echo.scaleMax - motion.echo.scaleMin);
    return {
      opacity: o + (boost ? boost.value : 0),
      transform: [{ scale: s }],
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

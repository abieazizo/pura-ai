/**
 * BuildOrb — luminous AI processing mark.
 *
 * Composed of:
 *   • a wide soft peach halo behind everything
 *   • three thin orbital rings rotating at different speeds and tilts
 *   • a pearl center that breathes with a subtle inner highlight
 *   • six tiny sparkle particles drifting along their orbits
 *
 * Renders three visual presentations:
 *   • `animating` (default)  — full motion, full presence
 *   • `still`                — static, full presence (used for ready reveal)
 *   • `muted`                — quieter, no motion (empty / paused states)
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { puraRoutineColors as C } from '@/theme';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface BuildOrbProps {
  size?: number;
  animating?: boolean;
  muted?: boolean;
  /** Optional outer container style — used to add shadows or margins. */
  style?: StyleProp<ViewStyle>;
}

interface OrbitDef {
  /** Ring radius in viewBox units (200×200). */
  radius: number;
  /** Sparkle starting angle in degrees. */
  startDeg: number;
  /** Rotation period in ms. */
  durationMs: number;
  /** Counter-clockwise when true. */
  reverse?: boolean;
  /** Ring stroke opacity. */
  ringOpacity: number;
  /** Sparkle radius. */
  sparkleSize: number;
  /** Sparkle opacity. */
  sparkleOpacity: number;
}

const ORBITS: OrbitDef[] = [
  { radius: 88, startDeg: 0,   durationMs: 22000, reverse: false, ringOpacity: 0.32, sparkleSize: 1.8, sparkleOpacity: 0.95 },
  { radius: 74, startDeg: 200, durationMs: 30000, reverse: true,  ringOpacity: 0.22, sparkleSize: 1.4, sparkleOpacity: 0.78 },
  { radius: 60, startDeg: 110, durationMs: 18000, reverse: false, ringOpacity: 0.16, sparkleSize: 1.1, sparkleOpacity: 0.62 },
];

export function BuildOrb({
  size = 160,
  animating = true,
  muted = false,
  style,
}: BuildOrbProps) {
  const isStatic = muted || !animating;

  // One rotation value per orbit. We drive them as plain numeric shared
  // values and map to {rotateZ} inside an animatedStyle below.
  const rotation0 = useSharedValue(0);
  const rotation1 = useSharedValue(0);
  const rotation2 = useSharedValue(0);
  const breathe = useSharedValue(0.95);
  const haloPulse = useSharedValue(0.95);

  useEffect(() => {
    if (isStatic) {
      cancelAnimation(rotation0);
      cancelAnimation(rotation1);
      cancelAnimation(rotation2);
      cancelAnimation(breathe);
      cancelAnimation(haloPulse);
      rotation0.value = 0;
      rotation1.value = 0;
      rotation2.value = 0;
      breathe.value = 1;
      haloPulse.value = 1;
      return;
    }
    rotation0.value = withRepeat(
      withTiming(ORBITS[0].reverse ? -360 : 360, {
        duration: ORBITS[0].durationMs,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    rotation1.value = withRepeat(
      withTiming(ORBITS[1].reverse ? -360 : 360, {
        duration: ORBITS[1].durationMs,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    rotation2.value = withRepeat(
      withTiming(ORBITS[2].reverse ? -360 : 360, {
        duration: ORBITS[2].durationMs,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    breathe.value = withRepeat(
      withTiming(1.06, {
        duration: 2400,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
    haloPulse.value = withRepeat(
      withTiming(1.04, {
        duration: 3200,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(rotation0);
      cancelAnimation(rotation1);
      cancelAnimation(rotation2);
      cancelAnimation(breathe);
      cancelAnimation(haloPulse);
    };
  }, [isStatic, rotation0, rotation1, rotation2, breathe, haloPulse]);

  const orbit0Style = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation0.value}deg` }],
  }));
  const orbit1Style = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation1.value}deg` }],
  }));
  const orbit2Style = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation2.value}deg` }],
  }));
  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: haloPulse.value }],
    opacity: muted ? 0.45 : 1,
  }));

  // Pre-compute static positions for sparkles at their start angle.
  const sparkles = useMemo(
    () =>
      ORBITS.map((o) => {
        const rad = (o.startDeg * Math.PI) / 180;
        return {
          x: 100 + o.radius * Math.cos(rad),
          y: 100 + o.radius * Math.sin(rad),
          r: o.sparkleSize,
          opacity: muted ? 0 : o.sparkleOpacity,
        };
      }),
    [muted],
  );

  // Additional stationary glints inside the pearl.
  const innerGlints = useMemo(
    () => [
      { x: 92, y: 86, r: 2.4, opacity: muted ? 0.4 : 0.95 },
      { x: 108, y: 112, r: 1.6, opacity: muted ? 0.3 : 0.8 },
      { x: 86, y: 108, r: 1.2, opacity: muted ? 0.25 : 0.7 },
    ],
    [muted],
  );

  return (
    <View
      style={[styles.wrap, { width: size, height: size }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        muted ? 'Pura routine mark' : 'Pura is analyzing your scan'
      }
    >
      {/* Wide halo glow behind everything */}
      <Animated.View style={[StyleSheet.absoluteFill, haloStyle]}>
        <Svg width={size} height={size} viewBox="0 0 200 200" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="50%" rx="65%" ry="65%">
              <Stop offset="0%" stopColor={C.peachGlow} stopOpacity={muted ? 0.35 : 0.85} />
              <Stop offset="50%" stopColor={C.coralWash} stopOpacity={muted ? 0.20 : 0.55} />
              <Stop offset="100%" stopColor={C.background} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={100} cy={100} r={100} fill="url(#halo)" />
        </Svg>
      </Animated.View>

      {/* Outermost orbital ring */}
      <AnimatedSvg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        style={[StyleSheet.absoluteFill, orbit0Style]}
      >
        <Circle
          cx={100}
          cy={100}
          r={ORBITS[0].radius}
          fill="none"
          stroke={muted ? C.lineStrong : C.coral}
          strokeOpacity={ORBITS[0].ringOpacity}
          strokeWidth={0.8}
        />
        {/* Subtle short arc to give the ring a sense of direction */}
        <Circle
          cx={100 + ORBITS[0].radius}
          cy={100}
          r={2.6}
          fill={muted ? C.muted : C.coralStrong}
          opacity={muted ? 0.35 : 0.95}
        />
        <Circle
          cx={100 - ORBITS[0].radius * 0.7}
          cy={100 + ORBITS[0].radius * 0.7}
          r={1.4}
          fill={muted ? C.muted : C.coralStrong}
          opacity={muted ? 0.2 : 0.75}
        />
      </AnimatedSvg>

      {/* Middle ring — counter-rotation */}
      <AnimatedSvg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        style={[StyleSheet.absoluteFill, orbit1Style]}
      >
        <Circle
          cx={100}
          cy={100}
          r={ORBITS[1].radius}
          fill="none"
          stroke={muted ? C.lineStrong : C.coral}
          strokeOpacity={ORBITS[1].ringOpacity}
          strokeWidth={0.6}
        />
        <Circle
          cx={100 - ORBITS[1].radius * 0.85}
          cy={100 - ORBITS[1].radius * 0.5}
          r={1.6}
          fill={muted ? C.muted : C.coralStrong}
          opacity={muted ? 0.25 : 0.78}
        />
      </AnimatedSvg>

      {/* Innermost ring */}
      <AnimatedSvg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        style={[StyleSheet.absoluteFill, orbit2Style]}
      >
        <Circle
          cx={100}
          cy={100}
          r={ORBITS[2].radius}
          fill="none"
          stroke={muted ? C.lineStrong : C.coral}
          strokeOpacity={ORBITS[2].ringOpacity}
          strokeWidth={0.5}
        />
        <Circle
          cx={100 + ORBITS[2].radius * 0.5}
          cy={100 - ORBITS[2].radius * 0.85}
          r={1.1}
          fill={muted ? C.muted : C.coralStrong}
          opacity={muted ? 0.18 : 0.62}
        />
      </AnimatedSvg>

      {/* Pearl center — breathes */}
      <Animated.View style={[StyleSheet.absoluteFill, breatheStyle]}>
        <Svg width={size} height={size} viewBox="0 0 200 200" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="pearl" cx="42%" cy="34%" rx="60%" ry="60%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
              <Stop offset="42%" stopColor={C.coralWash} stopOpacity={muted ? 0.65 : 0.96} />
              <Stop offset="100%" stopColor={C.coral} stopOpacity={muted ? 0.35 : 0.65} />
            </RadialGradient>
            <RadialGradient id="hl" cx="34%" cy="26%" rx="34%" ry="22%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={muted ? 0.6 : 0.95} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="rim" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="78%" stopColor={muted ? C.lineStrong : C.coral} stopOpacity={muted ? 0.0 : 0.35} />
              <Stop offset="100%" stopColor={muted ? C.lineStrong : C.coral} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={100} cy={100} r={56} fill="url(#pearl)" />
          <Circle cx={100} cy={100} r={56} fill="url(#rim)" />
          <Ellipse cx={84} cy={82} rx={22} ry={14} fill="url(#hl)" />
        </Svg>
      </Animated.View>

      {/* Static sparkle dots — sit on the rings at startDeg */}
      <Svg width={size} height={size} viewBox="0 0 200 200" style={StyleSheet.absoluteFill}>
        {sparkles.map((s, i) => (
          <Circle key={`sp-${i}`} cx={s.x} cy={s.y} r={s.r} fill={muted ? C.muted : C.coralStrong} opacity={s.opacity} />
        ))}
        {innerGlints.map((g, i) => (
          <Circle key={`gl-${i}`} cx={g.x} cy={g.y} r={g.r} fill="#FFFFFF" opacity={g.opacity} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

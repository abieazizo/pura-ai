/**
 * AssistantFace — the low-poly face mesh that doubles as Pura Assist's
 * thinking indicator.
 *
 * It is a small react-native-svg wireframe (Pura Blue outline + faint
 * internal mesh + two eye dots) driven by react-native-reanimated:
 *
 *   • STATE A (idle):    a slow breathing scale + occasional blink.
 *   • STATE B (thinking): the eyes look around (left / right / up / down,
 *                         desynced), blink with variation, and the head
 *                         tilts -3°→0°→+3° — curious, never anxious.
 *   • STATE C (settle):   on completion, gaze + tilt ease back to neutral
 *                         over ~400ms, then idle resumes.
 *
 * Reduced-motion: the look-around is replaced by a calm opacity pulse
 * (0.6→1.0→0.6) and breathing is disabled, so the component still reads
 * as "alive / working" without vestibular motion.
 *
 * Decorative by contract — it embeds NO hex literals (every colour comes
 * from `puraAssist`) and reads no AI output; callers flip `thinking`.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Polygon } from 'react-native-svg';
import { puraAssist } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export interface AssistantFaceProps {
  /** True while a response is generating — drives the look-around state. */
  thinking: boolean;
  /** Rendered px (square). Geometry is authored in a 64×64 viewBox. */
  size?: number;
}

// Low-poly outline authored in 64-space (scaled by the SVG viewBox).
const OUTLINE = '32,6 46,11 54,24 52,40 40,54 32,58 24,54 12,40 10,24 18,11';

// Internal mesh — vertex→cheek/brow/nose lines that give the low-poly read.
const MESH: Array<[number, number, number, number]> = [
  [32, 6, 32, 20],
  [18, 11, 22, 31],
  [46, 11, 42, 31],
  [10, 24, 22, 31],
  [54, 24, 42, 31],
  [32, 20, 22, 31],
  [32, 20, 42, 31],
  [22, 31, 32, 39],
  [42, 31, 32, 39],
  [12, 40, 22, 31],
  [52, 40, 42, 31],
  [22, 31, 24, 54],
  [42, 31, 40, 54],
  [32, 39, 24, 54],
  [32, 39, 40, 54],
  [32, 39, 32, 58],
];

export function AssistantFace({ thinking, size = 64 }: AssistantFaceProps) {
  const reduce = useReduceMotion();

  // Whole-face transforms.
  const breath = useSharedValue(1); // idle breathing scale
  const tilt = useSharedValue(0); // head tilt (deg), thinking only
  const pulse = useSharedValue(1); // opacity, reduced-motion thinking only
  // Eye transforms.
  const gazeX = useSharedValue(0); // look left / right (64-space units)
  const gazeY = useSharedValue(0); // look up / down (64-space units)
  const blink = useSharedValue(1); // eye-lid scaleY

  const k = size / 64; // 64-space → px for gaze offsets
  const eyeD = size * 0.095;
  const leftCx = size * 0.36;
  const rightCx = size * 0.64;
  const eyeCy = size * 0.42;

  useEffect(() => {
    const stopAll = () => {
      cancelAnimation(breath);
      cancelAnimation(tilt);
      cancelAnimation(pulse);
      cancelAnimation(gazeX);
      cancelAnimation(gazeY);
      cancelAnimation(blink);
    };
    stopAll();

    // ---- Reduced motion: no look-around, no breathing. -----------------
    if (reduce) {
      breath.value = 1;
      tilt.value = 0;
      gazeX.value = 0;
      gazeY.value = 0;
      blink.value = 1;
      if (thinking) {
        pulse.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.6, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        );
      } else {
        pulse.value = withTiming(1, { duration: 300 });
      }
      return stopAll;
    }

    pulse.value = 1;

    if (thinking) {
      // ---- STATE B: curious look-around. ------------------------------
      tilt.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
          withTiming(3, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      // Gaze X / Y run on intentionally different cadences so the eyes
      // never feel like they're on a metronome.
      gazeX.value = withRepeat(
        withSequence(
          withTiming(3, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withDelay(
            480,
            withTiming(-3, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
          ),
          withDelay(
            360,
            withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          ),
        ),
        -1,
        false,
      );
      gazeY.value = withRepeat(
        withSequence(
          withTiming(-2, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
          withDelay(
            300,
            withTiming(2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          ),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      // Blink: long hold open, then a quick close/open.
      blink.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500 }),
          withTiming(0.12, { duration: 90, easing: Easing.in(Easing.ease) }),
          withTiming(1, { duration: 110, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      breath.value = 1;
      return stopAll;
    }

    // ---- STATE C → A: settle to neutral, then idle. -------------------
    tilt.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
    gazeX.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
    gazeY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
    breath.value = withRepeat(
      withSequence(
        withTiming(1.015, { duration: 1750, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1750, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    // Sparse idle blink.
    blink.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600 }),
        withTiming(0.12, { duration: 90 }),
        withTiming(1, { duration: 110 }),
      ),
      -1,
      false,
    );
    return stopAll;
  }, [thinking, reduce, breath, tilt, pulse, gazeX, gazeY, blink]);

  const faceStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: breath.value }, { rotate: `${tilt.value}deg` }],
  }));
  const eyesStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: gazeX.value * k },
      { translateY: gazeY.value * k },
    ],
  }));
  const blinkStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: blink.value }],
  }));

  const eyeBase = {
    position: 'absolute' as const,
    width: eyeD,
    height: eyeD,
    borderRadius: eyeD / 2,
    backgroundColor: puraAssist.blueWireframe,
    top: eyeCy - eyeD / 2,
  };

  return (
    <Animated.View
      style={[{ width: size, height: size }, faceStyle]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      pointerEvents="none"
    >
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Polygon
          points={OUTLINE}
          fill={puraAssist.blue05}
          stroke={puraAssist.blueWireframe}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        {MESH.map(([x1, y1, x2, y2], i) => (
          <Line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={puraAssist.blueWireframe}
            strokeOpacity={0.32}
            strokeWidth={1}
            strokeLinecap="round"
          />
        ))}
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, eyesStyle]}>
        <Animated.View style={[eyeBase, { left: leftCx - eyeD / 2 }, blinkStyle]} />
        <Animated.View style={[eyeBase, { left: rightCx - eyeD / 2 }, blinkStyle]} />
      </Animated.View>
    </Animated.View>
  );
}

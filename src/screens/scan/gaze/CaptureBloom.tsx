/**
 * CaptureBloom — the held breath (the climax shot).
 *
 * Capture is not a flash-and-click; it's light GATHERING INWARD onto
 * the face and then CLEARING to reveal it, crisp and lit. The mistake
 * to never make again: a single curve that fades the photo in UNDER a
 * wash that never recedes — that buries the very thing it claims to
 * show. So three decoupled motions, on `phase` from ScanCaptureScreen:
 *
 *   'bloom':
 *     • freeze  — the captured face lands FAST underneath (FREEZE_IN),
 *                 so by the time the light clears there is a real face
 *                 to reveal (it settles 1.04→1.0, "the moment landing")
 *     • flood   — a PULSE: rushes up (BLOOM_UP), then recedes to a
 *                 whisper (BLOOM_DOWN). Peak hides the live→photo swap;
 *                 the recede is the reveal.
 *     • converge— the light condenses inward the whole time
 *                 (scale 1.35 → 0.86), so it gathers onto the face,
 *                 not outward.
 *   'veil': ink rises; navigation happens beneath it so scan →
 *           analyzing is one unbroken moment.
 *
 * The frozen frame is the real captured photo, mirrored to match the
 * front-camera preview the user was just looking at.
 */

import React, { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { gaze } from './gazeTokens';
import { MOTION } from './gazeMotion';

export type CapturePhase = 'idle' | 'bloom' | 'veil';

export interface CaptureBloomProps {
  phase: CapturePhase;
  frozenUri: string | null;
  /** Mirror the frozen frame to match the front-camera preview. */
  mirrored: boolean;
  width: number;
  height: number;
}

export function CaptureBloom({ phase, frozenUri, mirrored, width, height }: CaptureBloomProps) {
  const reduceMotion = useReduceMotion();
  const freeze = useSharedValue(0);
  const flood = useSharedValue(0);
  const converge = useSharedValue(0);
  const veil = useSharedValue(0);

  useEffect(() => {
    if (phase === 'bloom') {
      if (reduceMotion) {
        freeze.value = withTiming(1, { duration: 100 });
        flood.value = withSequence(
          withTiming(0.7, { duration: 90 }),
          withTiming(0.1, { duration: 160 })
        );
        converge.value = withTiming(1, { duration: 250 });
        return;
      }
      // Face lands first, fast, so the light has something to reveal.
      freeze.value = withTiming(1, { duration: MOTION.FREEZE_IN_MS, easing: MOTION.easeOut });
      // The pulse: flood up, then recede to a whisper — the reveal.
      flood.value = withSequence(
        withTiming(1, { duration: MOTION.BLOOM_UP_MS, easing: MOTION.easeOut }),
        withTiming(0.12, { duration: MOTION.BLOOM_DOWN_MS, easing: MOTION.easeInOut })
      );
      // Light condenses inward across the whole pulse.
      converge.value = withTiming(1, {
        duration: MOTION.BLOOM_UP_MS + MOTION.BLOOM_DOWN_MS,
        easing: MOTION.easeInOut,
      });
    } else if (phase === 'veil') {
      veil.value = withTiming(1, {
        duration: reduceMotion ? 120 : MOTION.VEIL_MS,
        easing: MOTION.easeInOut,
      });
    } else {
      freeze.value = 0;
      flood.value = 0;
      converge.value = 0;
      veil.value = 0;
    }
  }, [phase, freeze, flood, converge, veil, reduceMotion]);

  // The captured moment settles crisp under the light.
  const freezeStyle = useAnimatedStyle(() => ({
    opacity: freeze.value,
    transform: [{ scale: 1.04 - 0.04 * freeze.value }],
  }));
  // Light gathers inward (scale 1.35 → 0.86) and pulses (opacity).
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: flood.value * 0.9,
    transform: [{ scale: 1.35 - 0.49 * converge.value }],
  }));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));

  if (phase === 'idle') return null;

  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* The moment, frozen crisp — present early, revealed as light clears. */}
      {frozenUri ? (
        <Animated.View style={[StyleSheet.absoluteFill, freezeStyle]}>
          <Image
            source={{ uri: frozenUri }}
            style={[
              StyleSheet.absoluteFill,
              mirrored && { transform: [{ scaleX: -1 }] },
            ]}
            resizeMode="cover"
          />
        </Animated.View>
      ) : null}

      {/* Light gathering inward, then clearing. */}
      <Animated.View style={[StyleSheet.absoluteFill, bloomStyle]}>
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id="captureBloom" cx="50%" cy="46%" r="58%">
              <Stop offset="0%" stopColor={gaze.bloomCore} />
              <Stop offset="42%" stopColor={gaze.bloomMid} />
              <Stop offset="100%" stopColor={gaze.bloomEdge} />
            </RadialGradient>
          </Defs>
          <Rect width={width} height={height} fill="url(#captureBloom)" />
        </Svg>
      </Animated.View>

      {/* The exit veil — navigation happens beneath it. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: gaze.veilInk }, veilStyle]}
      />
    </Animated.View>
  );
}

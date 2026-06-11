/**
 * CaptureBloom — the held breath.
 *
 * Capture is not a flash and a click; it's an inhale. The choreography
 * (driven by `phase` from ScanCaptureScreen):
 *
 *   'bloom'  — the frozen photo appears under a soft aurora bloom that
 *              gathers INWARD (light collecting into the moment), while
 *              GazeFrame inhales (its own scale dip).
 *   'veil'   — ink rises over everything; navigation happens beneath it
 *              so the cut to the analyzing screen is invisible — one
 *              unbroken moment.
 *
 * The frozen frame is the real captured photo, mirrored to match the
 * front-camera preview the user was just looking at.
 */

import React, { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
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
  const bloom = useSharedValue(0);
  const veil = useSharedValue(0);

  useEffect(() => {
    if (phase === 'bloom') {
      bloom.value = withTiming(1, {
        duration: reduceMotion ? 120 : MOTION.BLOOM_MS,
        easing: MOTION.easeOut,
      });
    } else if (phase === 'veil') {
      veil.value = withTiming(1, {
        duration: reduceMotion ? 140 : MOTION.EXIT_VEIL_MS,
        easing: MOTION.easeInOut,
      });
    } else {
      bloom.value = 0;
      veil.value = 0;
    }
  }, [phase, bloom, veil, reduceMotion]);

  const bloomStyle = useAnimatedStyle(() => ({
    opacity: bloom.value * 0.9,
    transform: [{ scale: 1.35 - 0.43 * bloom.value }],
  }));
  const freezeStyle = useAnimatedStyle(() => ({ opacity: bloom.value }));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));

  if (phase === 'idle') return null;

  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* The moment, frozen crisp. */}
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

      {/* Light gathering inward. */}
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

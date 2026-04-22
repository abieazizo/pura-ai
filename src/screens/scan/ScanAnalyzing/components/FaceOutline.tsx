/**
 * Stylized oval face outline. Draws over ~900ms on Beat 2 via a
 * strokeDashoffset animation, then dims as later beats take over.
 *
 * Opacity contract:
 *   beat 'arrive'                      → 0
 *   beat 'locate'                      → 0.75 (drawing)
 *   beat 'partition' | 'detect' | 'score' → 0.22
 *   beat 'settle' | 'reveal'           → 0.08
 */

import React, { useEffect } from 'react';
import { Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import { buildFaceOutlinePath } from '../constants';
import type { Beat } from '../hooks/useAnalysisChoreography';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface FaceOutlineProps {
  size: { w: number; h: number };
  beat: Beat;
  reduceMotion: boolean;
}

// Ramanujan ellipse perimeter approximation.
function ellipsePerimeter(a: number, b: number): number {
  const h = Math.pow(a - b, 2) / Math.pow(a + b, 2);
  return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

function opacityForBeat(beat: Beat): number {
  switch (beat) {
    case 'arrive':
      return 0;
    case 'locate':
      return 0.75;
    case 'partition':
    case 'detect':
    case 'score':
      return 0.22;
    case 'settle':
    case 'reveal':
      return 0.08;
    default:
      return 0;
  }
}

export function FaceOutline({ size, beat, reduceMotion }: FaceOutlineProps) {
  // The oval spans ~0.60w × 0.70h of the photo; approximate perimeter from
  // those half-axes for the dash math.
  const a = size.w * 0.30;
  const b = size.h * 0.35;
  const perimeter = Math.max(1, ellipsePerimeter(a, b));

  const dashOffset = useSharedValue(perimeter);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const target = opacityForBeat(beat);
    if (reduceMotion) {
      opacity.value = target;
      dashOffset.value = 0;
      return;
    }
    if (beat === 'locate') {
      // Draw + fade in simultaneously.
      dashOffset.value = withTiming(0, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(target, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      opacity.value = withTiming(target, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [beat, reduceMotion, dashOffset, opacity]);

  const animatedProps = useAnimatedProps(() => ({
    opacity: opacity.value,
    strokeDashoffset: dashOffset.value,
  }));

  const d = buildFaceOutlinePath(size.w, size.h);

  return (
    <AnimatedPath
      d={d}
      stroke={palette.clay}
      strokeWidth={1.5}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={`${perimeter} ${perimeter}`}
      animatedProps={animatedProps}
    />
  );
}

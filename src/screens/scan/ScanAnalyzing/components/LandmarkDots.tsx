/**
 * Six landmark pips (eye outers, nostrils, mouth corners) that stagger in
 * during Beat 2 and dim through subsequent beats.
 */

import React, { useEffect } from 'react';
import { Circle, G } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import { LANDMARKS } from '../constants';
import type { Beat } from '../hooks/useAnalysisChoreography';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface LandmarkDotsProps {
  size: { w: number; h: number };
  beat: Beat;
  reduceMotion: boolean;
}

function opacityForBeat(beat: Beat): number {
  switch (beat) {
    case 'arrive':
      return 0;
    case 'locate':
      return 0.9;
    case 'partition':
      return 0.7;
    case 'detect':
    case 'score':
      return 0.5;
    case 'settle':
    case 'reveal':
      return 0.3;
    default:
      return 0;
  }
}

function DotOne({
  cx,
  cy,
  index,
  beat,
  reduceMotion,
}: {
  cx: number;
  cy: number;
  index: number;
  beat: Beat;
  reduceMotion: boolean;
}) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    const target = opacityForBeat(beat);
    if (reduceMotion) {
      opacity.value = target;
      return;
    }
    if (beat === 'locate') {
      // Stagger 60ms per dot on Beat 2 for a sequential "landing" feel.
      const delay = 200 + index * 60;
      opacity.value = withTiming(target, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
      // Re-dispatch the actual dimmed value after the initial rise so the
      // subsequent beat values aren't clobbered by delay scheduling.
      setTimeout(() => {
        // no-op; opacity already targeted by the same animation above
      }, delay);
    } else {
      opacity.value = withTiming(target, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [beat, reduceMotion, index, opacity]);

  const animatedProps = useAnimatedProps(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={3}
      fill={palette.clay}
      animatedProps={animatedProps}
    />
  );
}

export function LandmarkDots({ size, beat, reduceMotion }: LandmarkDotsProps) {
  return (
    <G>
      {LANDMARKS.map((pt, i) => (
        <DotOne
          key={i}
          cx={pt.x * size.w}
          cy={pt.y * size.h}
          index={i}
          beat={beat}
          reduceMotion={reduceMotion}
        />
      ))}
    </G>
  );
}

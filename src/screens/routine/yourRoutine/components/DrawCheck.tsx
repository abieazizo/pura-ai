/**
 * DrawCheck — a checkmark that draws ITSELF.
 *
 * On completion the check strokes on over ~320ms via an SVG path, with a single
 * light haptic landing mid-draw (~180ms) — the body of the "soft double-tick".
 * No pop, no confetti: the line simply completes. Reduced motion renders it
 * already drawn.
 */

import React, { useEffect } from 'react';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { routineTiming } from '@/theme/routineAtmosphere';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Checkmark in a 24×24 box; total stroke length ≈ 22.
const CHECK_PATH = 'M5 13 L10 18 L19 7';
const CHECK_LEN = 22;

interface DrawCheckProps {
  size: number;
  color: string;
  /** Flip to true to play the draw. */
  drawing: boolean;
  reduceMotion: boolean;
  /** Fired ~180ms into the draw — wire the light haptic here. */
  onMidDraw?: () => void;
  onDone?: () => void;
}

export function DrawCheck({ size, color, drawing, reduceMotion, onMidDraw, onDone }: DrawCheckProps) {
  const drawn = useSharedValue(0);

  useEffect(() => {
    if (!drawing) return;
    if (reduceMotion) {
      drawn.value = 1;
      onMidDraw?.();
      onDone?.();
      return;
    }
    drawn.value = withTiming(
      1,
      { duration: routineTiming.checkDraw, easing: Easing.bezier(0.22, 1, 0.36, 1) },
      (finished) => {
        if (finished && onDone) runOnJS(onDone)();
      },
    );
    const t = setTimeout(() => onMidDraw?.(), routineTiming.checkHapticAt);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LEN * (1 - drawn.value),
  }));

  const scale = size / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <AnimatedPath
        d={CHECK_PATH}
        stroke={color}
        strokeWidth={2.4 / scale + 1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={CHECK_LEN}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}

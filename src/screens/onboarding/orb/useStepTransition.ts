/**
 * useStepTransition — the content fade+lift used between interview steps.
 *
 * The orb is the through-line and NEVER fades; only a step's own content
 * (lines, input, cards, CTA) lifts away on advance and the next rises in. This
 * hook owns that: an optional enter (fade+lift in) and a `runExit` that fades +
 * lifts out, then fires its callback so the host can swap steps. Under
 * reduce-motion both are instant.
 */

import { useCallback } from 'react';
import { useEffect } from 'react';
import {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const EASE_OUT = Easing.out(Easing.cubic);
const EASE_IN = Easing.in(Easing.cubic);

export function useStepTransition(
  reduceMotion: boolean,
  opts?: { enter?: boolean; enterDuration?: number },
) {
  const enter = opts?.enter ?? true;
  const skipEnter = reduceMotion || !enter;
  const op = useSharedValue(skipEnter ? 1 : 0);
  const ty = useSharedValue(skipEnter ? 0 : 16);

  useEffect(() => {
    if (skipEnter) return;
    const duration = opts?.enterDuration ?? 380;
    op.value = withTiming(1, { duration, easing: EASE_OUT });
    ty.value = withTiming(0, { duration, easing: EASE_OUT });
  }, [skipEnter, opts?.enterDuration, op, ty]);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));

  const runExit = useCallback(
    (cb: () => void) => {
      if (reduceMotion) {
        cb();
        return;
      }
      op.value = withTiming(0, { duration: 320, easing: EASE_IN });
      ty.value = withTiming(-20, { duration: 320, easing: EASE_IN }, (finished) => {
        if (finished) runOnJS(cb)();
      });
    },
    [reduceMotion, op, ty],
  );

  return { style, runExit };
}

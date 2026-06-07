/**
 * useStepTransition — the content fade+lift used between interview steps.
 *
 * The orb is the through-line and NEVER fades; only a step's own content
 * (lines, input, cards, CTA) leaves on advance and the next arrives. This hook
 * owns that container motion: an optional enter, and a `runExit` whose mode is
 * either 'lift' (fade + rise away) or 'z' (recede INTO the z-axis — fade +
 * scale 0.96 + translate up-and-back, for the 4→5 depth transition). Under
 * reduce-motion both collapse to instant / a cross-fade.
 *
 * The advance callback is fired from a JS-thread timer (not the Reanimated
 * completion callback, which can be dropped on web), so a step always advances.
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const EASE_OUT = Easing.out(Easing.cubic);
const EASE_IN = Easing.in(Easing.cubic);

export type ExitMode = 'lift' | 'z';

export function useStepTransition(
  reduceMotion: boolean,
  opts?: { enter?: boolean; enterDuration?: number },
) {
  const enter = opts?.enter ?? true;
  const skipEnter = reduceMotion || !enter;
  const op = useSharedValue(skipEnter ? 1 : 0);
  const ty = useSharedValue(skipEnter ? 0 : 16);
  const sc = useSharedValue(1);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (skipEnter) return;
    const duration = opts?.enterDuration ?? 380;
    op.value = withTiming(1, { duration, easing: EASE_OUT });
    ty.value = withTiming(0, { duration, easing: EASE_OUT });
  }, [skipEnter, opts?.enterDuration, op, ty]);

  useEffect(() => () => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }, { scale: sc.value }],
  }));

  const runExit = useCallback(
    (cb: () => void, mode: ExitMode = 'lift') => {
      const dur = reduceMotion ? 220 : mode === 'z' ? 360 : 320;
      if (!reduceMotion) {
        const z = mode === 'z';
        ty.value = withTiming(z ? -14 : -20, { duration: dur, easing: EASE_IN });
        if (z) sc.value = withTiming(0.96, { duration: dur, easing: EASE_IN });
      }
      op.value = withTiming(0, { duration: dur, easing: EASE_IN });
      // Advance off a JS-thread timer — robust on web + native.
      if (exitTimer.current) clearTimeout(exitTimer.current);
      exitTimer.current = setTimeout(cb, dur);
    },
    [reduceMotion, op, ty, sc],
  );

  return { style, runExit };
}

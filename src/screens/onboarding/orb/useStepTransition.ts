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
 * ADVANCE TRIGGER (native-correct): the exit's OWN Reanimated completion
 * callback fires the advance via `runOnJS` — reliable on iOS/Android. Because
 * reanimated-web can silently drop that completion callback, on web ONLY we arm
 * a `setTimeout` fallback. The caller's advance is idempotent (a lock), so
 * whichever path fires first wins and the other is a harmless no-op. Never a
 * bare timeout on native.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const EASE_OUT = Easing.out(Easing.cubic);
const EASE_IN = Easing.in(Easing.cubic);
// Small buffer past the animation so the web fallback only fires if the
// completion callback genuinely didn't.
const WEB_FALLBACK_BUFFER = 80;

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
  const webTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (skipEnter) return;
    const duration = opts?.enterDuration ?? 380;
    op.value = withTiming(1, { duration, easing: EASE_OUT });
    ty.value = withTiming(0, { duration, easing: EASE_OUT });
  }, [skipEnter, opts?.enterDuration, op, ty]);

  useEffect(
    () => () => {
      if (webTimer.current) clearTimeout(webTimer.current);
    },
    [],
  );

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }, { scale: sc.value }],
  }));

  /**
   * Animate the exit and fire `commit` when it lands. `commit` MUST be
   * idempotent — it is invoked from the completion callback (native) AND,
   * on web only, from a timeout fallback.
   */
  const runExit = useCallback(
    (commit: () => void, mode: ExitMode = 'lift') => {
      const dur = reduceMotion ? 220 : mode === 'z' ? 360 : 320;
      if (!reduceMotion) {
        const z = mode === 'z';
        ty.value = withTiming(z ? -14 : -20, { duration: dur, easing: EASE_IN });
        if (z) sc.value = withTiming(0.96, { duration: dur, easing: EASE_IN });
      }
      // Native-correct: the opacity track's completion callback commits.
      op.value = withTiming(0, { duration: dur, easing: EASE_IN }, (finished) => {
        'worklet';
        if (finished) runOnJS(commit)();
      });
      // Web-only fallback (reanimated-web can drop the completion callback).
      if (webTimer.current) {
        clearTimeout(webTimer.current);
        webTimer.current = null;
      }
      if (Platform.OS === 'web') {
        webTimer.current = setTimeout(commit, dur + WEB_FALLBACK_BUFFER);
      }
    },
    [reduceMotion, op, ty, sc],
  );

  /**
   * Interrupt the exit (tap-to-skip): stop the animation and kill the web
   * fallback so the caller's direct `commit` is the ONLY remaining trigger.
   * cancelAnimation resolves the completion callback with finished=false, so it
   * will NOT commit. Snap exited so the outgoing content doesn't linger a frame.
   */
  const cancelExit = useCallback(() => {
    cancelAnimation(op);
    cancelAnimation(ty);
    cancelAnimation(sc);
    op.value = 0;
    if (webTimer.current) {
      clearTimeout(webTimer.current);
      webTimer.current = null;
    }
  }, [op, ty, sc]);

  return { style, runExit, cancelExit };
}

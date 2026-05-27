/**
 * CrossfadeStage — quiet opacity transition between two home states.
 *
 * The Pura home swaps between three top-level compositions (portal,
 * recovery-night fallback, post-scan reveal). A bare React state flip
 * cuts hard, which contradicts the screen's voice of "calm" and
 * "settled". CrossfadeStage wraps the children in a single Animated
 * layer that fades the previous content out as the new content fades
 * in, on a 320ms cubic ease.
 *
 * Reduce Motion replaces the fade with an instant swap so nothing is
 * gated on animation.
 *
 * The transition is keyed off the `stageKey` prop — change it and a
 * fade plays; keep it identical and the children re-render in place
 * without animation.
 */

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export interface CrossfadeStageProps {
  /** A string that changes when the stage should crossfade. */
  stageKey: string;
  children: React.ReactNode;
}

export function CrossfadeStage({ stageKey, children }: CrossfadeStageProps) {
  const reduceMotion = useReduceMotion();
  const lastKey = useRef(stageKey);
  const [renderedChildren, setRenderedChildren] = useState(children);
  const op = useSharedValue(1);

  useEffect(() => {
    if (stageKey === lastKey.current) {
      // Same stage — just update children in place (state inside the
      // current view changing without a stage transition).
      setRenderedChildren(children);
      return;
    }
    lastKey.current = stageKey;
    if (reduceMotion) {
      setRenderedChildren(children);
      op.value = 1;
      return;
    }
    // Fade out current children, swap, fade new ones in.
    op.value = withTiming(
      0,
      { duration: 180, easing: Easing.bezier(0.4, 0, 0.2, 1) },
      (finished) => {
        if (finished) {
          op.value = withTiming(1, {
            duration: 360,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
          });
        }
      }
    );
    const swap = setTimeout(() => setRenderedChildren(children), 180);
    return () => clearTimeout(swap);
  }, [stageKey, children, reduceMotion, op]);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
  }));

  return (
    <Animated.View style={[styles.fill, style]}>{renderedChildren}</Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

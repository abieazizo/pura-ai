/**
 * usePressScale — the tactile layer for THE EDIT (Cycle 13: motion & micro-
 * interactions). Every tappable surface springs DOWN under a finger and settles
 * back, so nothing reads as static. Reanimated worklet on the UI thread (60fps),
 * and a no-op under reduce-motion (the press still fires; it just doesn't move).
 *
 * Spring is calibrated firm + quick (press-in snappier than release) so it feels
 * like pressing a real, slightly weighted object — never a slow rubbery bounce.
 */

import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const PRESS_IN = { damping: 18, stiffness: 340, mass: 0.6 };
const PRESS_OUT = { damping: 15, stiffness: 240, mass: 0.6 };

export function usePressScale(to = 0.97) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = () => {
    if (!reduceMotion) scale.value = withSpring(to, PRESS_IN);
  };
  const onPressOut = () => {
    if (!reduceMotion) scale.value = withSpring(1, PRESS_OUT);
  };

  return { style, onPressIn, onPressOut };
}

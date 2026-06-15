/**
 * pressFeedback — THE EDIT's tactile language, in one place.
 *
 * Two responsibilities, no more:
 *   1. Per-surface press springs. Every tappable surface springs DOWN under a
 *      finger and settles back, so nothing reads as static. Reanimated worklet
 *      on the UI thread (60fps), and a no-op under reduce-motion (the press
 *      still fires; it just doesn't move).
 *   2. Honest haptic helpers built on the EXISTING `hapt` vocabulary — no
 *      invented API (there is no `hapt.impact('medium')`; we use tap/select/
 *      stepComplete only).
 *
 * The spring is calibrated firm + quick (press-in snappier than release) so it
 * feels like pressing a real, slightly weighted object — never a slow rubbery
 * bounce. The three surface variants only change the depth + out-spring weight;
 * they all share one base so no caller breaks.
 *
 * SURFACE → DEPTH → HAPTIC mapping (the calibrated tactile grammar):
 *   chip (ConcernChips)        → usePressScaleChip   (0.93, snappier out) → pressHaptics.select
 *   card reorder (CollectionCard) → usePressScaleCard (0.985, medium)     → pressHaptics.tap
 *   pick / add (ConcernPickCard)  → usePressScaleCard (0.985, medium)     → add = pressHaptics.commit
 *   CTA (EmptyState)              → usePressScaleButton (0.96, firm)      → pressHaptics.tap
 *   EditHeader                    → presses nothing (the orb is alive, not tappable here)
 *
 * A chip is the lightest, quickest acknowledgement (it just re-threads the
 * lens). A card is a calm, medium settle. A button is the firmest commit. The
 * add-to-routine gesture is the one "consequential" beat on screen, so it earns
 * `commit` (medium impact + a selection tick) — the page's only weighty haptic.
 */

import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { hapt } from '@/utils/haptics';

// Press-in is firmer + faster than release: the finger lands with intent, the
// surface eases back. Out-spring weight is tuned per surface below.
const PRESS_IN = { damping: 18, stiffness: 340, mass: 0.6 };
const PRESS_OUT = { damping: 15, stiffness: 240, mass: 0.6 };
// A chip's release is a touch snappier (less mass, more stiffness) so the
// lightest surface also feels the quickest to spring back.
const PRESS_OUT_SNAPPY = { damping: 16, stiffness: 300, mass: 0.5 };

/**
 * Base press-scale hook. Springs to `to` on press-in, back to 1 on press-out,
 * no-op under reduce-motion. `outSpring` lets variants tune the release weight
 * without forking the worklet. Kept as the public base so no caller breaks.
 */
export function usePressScale(to = 0.97, outSpring: object = PRESS_OUT) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = () => {
    if (!reduceMotion) scale.value = withSpring(to, PRESS_IN);
  };
  const onPressOut = () => {
    if (!reduceMotion) scale.value = withSpring(1, outSpring);
  };

  return { style, onPressIn, onPressOut };
}

/** Chip — lightest + quickest: a deep, snappy dip (the lens re-threading). */
export function usePressScaleChip() {
  return usePressScale(0.93, PRESS_OUT_SNAPPY);
}

/** Card — calm, medium settle for the collection + pick surfaces. */
export function usePressScaleCard() {
  return usePressScale(0.985, PRESS_OUT);
}

/** Button — firm commit for CTAs (the EmptyState reorder). */
export function usePressScaleButton() {
  return usePressScale(0.96, PRESS_OUT);
}

/**
 * The screen's honest haptic vocabulary, mapped to REAL `hapt` methods:
 *   tap    → light UI tap (chrome / reorder / CTA)
 *   select → selection tick (re-threading a chip / lens)
 *   commit → `hapt.stepComplete` (medium impact + a selection tick): the one
 *            "consequential add" beat, reserved for adding a pick to the routine.
 *
 * No invented impact levels — these are the existing vocabulary, named for
 * THE EDIT's surfaces. Haptics already self-gate on the app-wide preference,
 * and each is a silent no-op when disabled.
 */
export const pressHaptics = {
  /** chrome / card reorder / CTA — light. */
  tap: () => hapt.tap(),
  /** chip re-thread — selection tick. */
  select: () => hapt.select(),
  /** add-to-routine — the consequential commit (medium + tick). */
  commit: () => hapt.stepComplete(),
} as const;

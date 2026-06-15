/**
 * ProgressTrail — a QUIET sense of where you are in the ritual.
 *
 * Not a progress bar, not a percentage, not a streak or a score. Just a slim
 * row of soft DOTS — one per step — sitting low in the dark theater chrome.
 * Finished steps read filled (`ritualTone.progressOn`); upcoming steps read
 * nearly-empty (`ritualTone.progressOff`); the CURRENT step wears a faint ring
 * so the user senses "I'm here" without ever reading a number. The dots are a
 * fixed small width (never flex-to-fill), so 2–3 steps stay quiet position cues
 * and never inflate into a fat segmented BAR. It recedes; it never competes.
 *
 * The no-number rule holds for screen readers too: the trail is decorative and
 * HIDDEN from assistive tech. RitualStage already announces "Step n of m" on
 * each advance, so re-exposing a numeric progress value here would be the one
 * audible count the visual design deliberately removed.
 *
 * Pure & presentational: everything it draws is derived from props, with the
 * `index`/`doneCount` defensively clamped so a stray value can't break the row.
 * The newest-filled dot settles in calmly via one shared value per dot — a
 * gentle opacity crossfade on the flow's shared ARRIVE curve (from
 * `flow/motion.ts`), over a named flow duration — never a sweeping bar
 * animation, never a locally-authored curve. Reduced motion renders every dot
 * in its final state with zero transform/opacity animation.
 *
 * Colors come from `@/theme/routineFlow` (no hex here). `color` optionally
 * overrides the "on" dot only.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { flowTiming, ritualTone } from '@/theme/routineFlow';
import { ARRIVE } from '../motion';
import type { ProgressTrailProps } from '../contracts';

// --- named local tokens -----------------------------------------------------
/** A small fixed dot — never flex-to-fill, so few steps read as dots, not a
 *  segmented bar. The current dot's faint ring sits just outside this. */
const DOT_SIZE = 5;
const DOT_GAP = 9; // 8pt-grid breathing room between dots
const DOT_RADIUS = DOT_SIZE / 2;
/** The current step's faint outline ring — a distinct treatment so "I'm here"
 *  stays legible on the dark theater without a fill that reads as "done". */
const CURRENT_RING = DOT_SIZE + 6;
const CURRENT_RING_RADIUS = CURRENT_RING / 2;
const CURRENT_RING_WIDTH = StyleSheet.hairlineWidth;
/** The calm fade as a dot fills — the flow's arrival curve + a named flow
 *  duration (the step-advance settle). Motion comes from the shared module,
 *  never a locally re-declared bezier. */
const SETTLE_MS = flowTiming.stepAdvanceMs;
const SETTLE_EASE = ARRIVE;

type DotState = 'on' | 'current' | 'off';

/** One soft dot. Filled dots fade in calmly; the current dot is a faint ring
 *  (not a fill); empty dots are quiet. Reduced motion = no animation. */
function Dot({
  state,
  onColor,
  reduceMotion,
}: {
  state: DotState;
  onColor: string;
  reduceMotion: boolean;
}) {
  const isFilled = state === 'on';
  // The fill overlay only matters for the "on" dot; current/off keep it hidden
  // (the current read is carried by the ring, never by a half-fill).
  const target = isFilled ? 1 : 0;
  const fill = useSharedValue(reduceMotion ? target : isFilled ? 0 : target);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(fill);
      fill.value = target;
      return;
    }
    // Only the newest fill needs a settle — a single short opacity ease keeps it
    // calm, never a sweeping motion.
    fill.value = withTiming(target, { duration: SETTLE_MS, easing: SETTLE_EASE });
    return () => cancelAnimation(fill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: fill.value }));

  return (
    <View style={styles.slot}>
      {/* The faint "I'm here" ring — only on the current dot. */}
      {state === 'current' && (
        <View style={[styles.ring, { borderColor: ritualTone.progressOn }]} pointerEvents="none" />
      )}
      <View style={[styles.dot, { backgroundColor: ritualTone.progressOff }]}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: onColor, borderRadius: DOT_RADIUS }, style]}
        />
      </View>
    </View>
  );
}

export function ProgressTrail({
  total,
  index,
  doneCount,
  reduceMotion,
  color,
}: ProgressTrailProps) {
  // Defensive clamps — an out-of-range index/doneCount must never break the row.
  const count = Math.max(0, Math.floor(total));
  const done = Math.max(0, Math.min(count, Math.floor(doneCount)));
  const current = Math.max(0, Math.min(count - 1, Math.floor(index)));
  const onColor = color ?? ritualTone.progressOn;

  // Empty routine: render nothing — never an orphan dot, never a /0.
  if (count === 0) return null;

  const stateFor = (i: number): DotState => {
    if (i < done) return 'on';
    if (i === current && done < count) return 'current';
    return 'off';
  };

  return (
    // Decorative: the trail is a visual position cue only. RitualStage announces
    // "Step n of m" on advance, so the trail is hidden from assistive tech — the
    // no-number rule holds for screen readers too (no audible count/percentage).
    <View
      style={styles.row}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Dot key={i} state={stateFor(i)} onColor={onColor} reduceMotion={reduceMotion} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Fixed gap between fixed-width dots — many steps stay slim and quiet; never
    // flex-to-fill (which would inflate few steps into a fat bar).
    columnGap: DOT_GAP,
  },
  // Each dot reserves the ring's footprint so the current ring never nudges its
  // neighbours — the row stays perfectly even whichever dot is current.
  slot: {
    width: CURRENT_RING,
    height: CURRENT_RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: CURRENT_RING,
    height: CURRENT_RING,
    borderRadius: CURRENT_RING_RADIUS,
    borderWidth: CURRENT_RING_WIDTH,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_RADIUS,
    overflow: 'hidden',
  },
});

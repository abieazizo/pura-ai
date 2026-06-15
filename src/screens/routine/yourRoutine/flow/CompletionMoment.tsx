/**
 * CompletionMoment — the calm close of the ritual. Rest, not reward.
 *
 * Shown by the flow host when the last step is done. The host POSITIONS the
 * shared orb (top-center of the theater); this moment WARMS it: on mount it
 * fires `playDoneLanding` ONCE — the ritual's slowest, fully-warm gold bloom +
 * the single closing Medium haptic — so the orb glow is the only celebration,
 * framed as rest. (Per-step Done/Skip beats belong to RitualStage; the host
 * fires neither landing nor per-step beats, so there is no double-bloom.) This
 * component leaves clear vertical room for the orb and never imports its view,
 * positions, or overlaps it. Below the orb it presents two lines and then,
 * deliberately, nothing:
 *
 *   • the gentle serif closing line (`model.doneLandingLine`, verbatim) —
 *     e.g. "That's it for tonight."
 *   • a beat later, the soft rescan bridge (`model.progressBridge`, verbatim) —
 *     a quiet sentence pointing toward the NEXT scan. Not a button, not urgency,
 *     not commerce.
 *
 * The two arrive in a calm staggered set-down (line first, bridge a beat later)
 * driven ENTIRELY by the shared `useSetDown` helper from `flow/motion.ts` — the
 * same arrival the overview uses (translateY 16→0 + opacity on the flow spring,
 * 70ms stagger), so the close inherits the flow's one motion language rather
 * than a curve authored here.
 *
 * REST IS CHOSEN, NOT IMPOSED. The whole screen is a quiet tap target: a tap
 * anywhere returns to the overview, whenever the user is ready. The moment never
 * yanks a reader mid-sentence:
 *   • Normal motion: an auto-return runs ONLY as a generous floor, scaled to the
 *     copy length and the user's Dynamic-Type scale, and never shorter than the
 *     orb's warm done-landing bloom — so the warmth is never truncated and a
 *     slower reader has time. The tap can always leave sooner.
 *   • Reduced motion (typically a slower reader): NO auto-return at all. The
 *     lines simply rest, present and still, until the user taps to leave.
 * Either way `onReturn` fires EXACTLY ONCE, holds run on the shared `useUiDelay`
 * (never setTimeout), and pending holds are cancelled on unmount.
 *
 * Colors come from `@/theme/routineFlow` (no hex); warmth is the orb's alone.
 */

import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { flowTiming, ritualTone } from '@/theme/routineFlow';
import { useOrb } from '@/screens/onboarding/orb/OrbHost';
import { flowType } from './type';
import { playDoneLanding, useSetDown, useUiDelay } from './motion';
import type { CompletionMomentProps } from './contracts';

// --- named local tokens -----------------------------------------------------
/** The host parks the warmed orb top-center at `insets.top + RITUAL_ORB_CY` with
 *  diameter RITUAL_ORB_SIZE, ringed by the breathing ring (+RITUAL_RING_PAD each
 *  side). We DERIVE the headroom from that geometry (rather than a hand-tuned
 *  number) so the closing line provably clears the warmed orb AND its ring at any
 *  inset, then add a calm gap. Mirrors RoutineFlow's RITUAL_ORB_SIZE(132) /
 *  cy(insets.top+132) / ring(+56) — kept in sync there. */
const RITUAL_ORB_CY = 132;
const RITUAL_ORB_SIZE = 132;
const RITUAL_RING_PAD = 28; // ring extends 56 total ⇒ 28 each side
/** A calm gap between the orb's ring and the closing line. */
const ORB_TO_LINE_GAP = 36;
/** Set-down stagger indices: the closing line lands first, the bridge a beat
 *  later (one 70ms `setDownStaggerMs` step behind it — the flow's own cadence). */
const LINE_STAGGER_INDEX = 0;
const BRIDGE_STAGGER_INDEX = 1;

/**
 * The auto-return FLOOR (normal motion only) — a generous, copy-aware minimum so
 * a slow reader is never yanked mid-sentence; the tap can always leave sooner.
 * We never auto-return before:
 *   • the orb's warm done-landing bloom finishes (`doneBloomMs`), so the
 *     signature warmth is never cut by the carry-home, AND
 *   • a reading budget: a base read time + per-word time for BOTH lines,
 *     stretched by the user's font scale (bigger type ⇒ more time).
 * It's a floor for *auto*-return only; under reduced motion there is no
 * auto-return — the user taps when ready.
 */
const READ_BASE_MS = 1400; // time to register the moment before any words
const READ_PER_WORD_MS = 320; // unhurried per-word reading pace
const AUTO_RETURN_CEILING_MS = 9000; // never linger past this on its own

function wordCount(...parts: string[]): number {
  return parts
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** One closing line on the shared set-down arrival. The motion is owned by
 *  `useSetDown` (flow/motion.ts): translateY 16→0 + opacity on the flow spring,
 *  staggered by `index`. Reduced motion presents it instantly, no transform.
 *  The visible Text speaks for itself — no duplicate accessibilityLabel. */
function SetDownLine({
  staggerIndex,
  reduceMotion,
  children,
  style,
}: {
  staggerIndex: number;
  reduceMotion: boolean;
  children: React.ReactNode;
  style: object;
}) {
  const anim = useSetDown(staggerIndex, reduceMotion);

  return (
    <Animated.View style={anim}>
      <Text style={style} maxFontSizeMultiplier={1.4}>
        {children}
      </Text>
    </Animated.View>
  );
}

export function CompletionMoment({ line, bridge, reduceMotion, onReturn }: CompletionMomentProps) {
  const { after, cancelAll } = useUiDelay();
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const orb = useOrb();
  const returned = useRef(false);

  // Reserve room to the bottom of the warmed orb's ring, then a type-scaled gap,
  // so the closing line never crowds the orb even at max Dynamic Type.
  const scale = Math.max(1, fontScale || 1);
  const orbRingBottom = insets.top + RITUAL_ORB_CY + RITUAL_ORB_SIZE / 2 + RITUAL_RING_PAD;
  const headroom = orbRingBottom + ORB_TO_LINE_GAP * scale;

  /** Leave to the overview — at most once, whether by tap or by the auto floor. */
  const leave = () => {
    if (returned.current) return;
    returned.current = true;
    cancelAll();
    onReturn();
  };

  // THE DONE LANDING — warm the shared orb ONCE on mount: its slowest fully-warm
  // gold bloom + the single closing Medium haptic. The orb's glow is the only
  // celebration; everything else is rest. Driven, never duplicated.
  useEffect(() => {
    playDoneLanding(orb);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Announce the close to VoiceOver in reading order (closing line, then the
  // rescan bridge) so a user mid-ritual hears the moment even though the stage
  // swapped beneath them. The tap-to-return hint rides on the surface below.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${line} ${bridge}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-return is a GENEROUS FLOOR, normal motion ONLY. Reduced motion (the
  // slower reader who turned it on) gets NO timer — the lines rest until a tap.
  // The floor is the max of the orb's warm bloom and a font-scaled reading
  // budget, capped so it never lingers forever on its own. A tap leaves sooner.
  useEffect(() => {
    if (reduceMotion) return; // rest, present and still, until the user taps.
    const readMs = (READ_BASE_MS + wordCount(line, bridge) * READ_PER_WORD_MS) * scale;
    const floorMs = Math.min(
      AUTO_RETURN_CEILING_MS,
      Math.max(flowTiming.doneBloomMs, flowTiming.careHoldMs + readMs),
    );
    after(floorMs, leave);
    return cancelAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Pressable
      style={styles.wrap}
      onPress={leave}
      // The whole moment is one calm element: VO reads the lines (announced
      // above) and offers a single "return" action; it never re-counts steps.
      accessibilityRole="button"
      accessibilityLabel={`${line} ${bridge}`}
      accessibilityHint="Returns to your routine"
      accessibilityViewIsModal
    >
      {/* Clear space above for the host's warmed orb + ring — never drawn here.
          Derived from the orb geometry + a type-scaled gap so the closing line
          always clears the warmed orb, at any inset or Dynamic-Type scale. */}
      <View
        style={{ height: headroom }}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      <View style={styles.copy}>
        <SetDownLine staggerIndex={LINE_STAGGER_INDEX} reduceMotion={reduceMotion} style={styles.line}>
          {line}
        </SetDownLine>

        <SetDownLine staggerIndex={BRIDGE_STAGGER_INDEX} reduceMotion={reduceMotion} style={styles.bridge}>
          {bridge}
        </SetDownLine>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: ritualTone.base,
    alignItems: 'center',
    // Content sits below the orb headroom; flexible height lets long copy wrap.
    paddingHorizontal: 32,
  },
  copy: {
    alignItems: 'center',
  },
  line: {
    ...flowType.stepMoment,
    color: ritualTone.ink,
    textAlign: 'center',
  },
  bridge: {
    ...flowType.context,
    color: ritualTone.muted,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 320,
  },
});

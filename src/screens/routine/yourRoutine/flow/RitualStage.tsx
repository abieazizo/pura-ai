/**
 * RitualStage — ACT 2's per-step theater. ONE step at a time, on the dark
 * `ritualTone` canvas, beneath the shared companion orb (driven, never
 * duplicated) and TEAM ORB's RitualBreathingRing, with TEAM PROGRESS's
 * ProgressTrail as the only progress cue.
 *
 * Vertical rhythm, top → bottom:
 *   • quiet RitualControls bar (Pause/Resume + End, faint until attended)
 *   • ProgressTrail (quiet, never gamey)
 *   • STEP n OF m eyebrow (flowType.eyebrow, ritualTone.faint)
 *   • the step NAME as the serif step moment 40 — THE moment (ritualTone.ink)
 *   • ONE short kind instruction (StepInstruction — action OR throughline, never
 *     both, no AM/PM duplicate, no "calm and simple" filler)
 *   • the per-step product (RitualProduct — real image + name + brand; renders
 *     NOTHING when product-free), with the absorb BreathingRing when it settles
 *   • a pinned, prominent Done on a ritualTone.done surface, and a quiet Skip
 *
 * The host owns the step state machine (it passes `step`/`index`/`total` and
 * advances on `onDone`/`onSkip`). RitualStage drives the orb via the motion.ts
 * choreography through `useOrb()`, plays the local Done/Skip beats, HOLDS via
 * `useUiDelay` (never setTimeout), then calls `onDone`/`onSkip`:
 *   • Done → playGoldBloom (orb gold + Medium haptic) + DrawCheck draws; hold
 *     settleHoldMs; a meaningful step → orbCareBeat + careHoldMs (the stillness
 *     is the reward), else orbTakeStep; then useStepTransition.exit → onDone.
 *   • Skip → playMuteDim (no haptic, no scold) + a short hold → exit → onSkip.
 * Advance is ALWAYS the useStepTransition rise — never a hard cut.
 *
 * total === 0 is an honest, exitable rest end-state (a calm line + End), never a
 * black void. Reduce-motion shows the instruction whole, pre-draws the check,
 * and the transition becomes a clean swap.
 *
 * Tokens only: type from flowType, color from ritualTone/orbTemp. No commerce.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { flowTiming, ritualTone } from '@/theme/routineFlow';
import { useOrb } from '@/screens/onboarding/orb/OrbHost';
import type { StepVM } from '../model';
import { flowType } from './type';
import type { RitualStageProps } from './contracts';
import {
  useStepTransition,
  useUiDelay,
  orbTakeStep,
  orbCareBeat,
  orbProgress,
  playGoldBloom,
  playMuteDim,
} from './motion';
import { ritualHaptics } from '../ritualHaptics';
import { BreathingRing, CardBreath } from '../components/BreathingRing';
import { DrawCheck } from '../components/DrawCheck';
import { RitualControls } from './components/RitualControls';
import { StepInstruction } from './components/StepInstruction';
import { RitualProduct } from './components/RitualProduct';
import { ProgressTrail } from './components/ProgressTrail';

/** The per-step lifecycle, local to the stage (the host owns the index). */
type Phase = 'active' | 'doneBeat' | 'care' | 'skipBeat';

/** The one chosen instruction line: the finding throughline if it traces, else
 *  the plain action. NEVER both — and never an AM/PM duplicate or filler. */
function instructionFor(step: StepVM): string {
  const through = step.throughline?.trim();
  if (through) return through;
  return step.action?.trim() ?? '';
}

export function RitualStage({
  step,
  index,
  total,
  reduceMotion,
  paused,
  onDone,
  onSkip,
  onTogglePause,
  onEndEarly,
}: RitualStageProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const orb = useOrb();

  const transition = useStepTransition(reduceMotion);
  const delay = useUiDelay();

  const [phase, setPhase] = useState<Phase>('active');
  const [drawing, setDrawing] = useState(false);

  // The footer (Done + Skip) settles OUT as the beat begins rather than blinking
  // away — a hard mount/unmount of the controls would read as a cut against the
  // gold bloom. One UI-thread opacity (Reanimated worklet only; no Animated, no
  // setTimeout): 1 while the step is live, fades to 0 over the step-out window as
  // the orb warms. Reduce-motion makes it an instant, clean swap.
  const footerOut = useSharedValue(0); // 0 = present, 1 = retired
  const footerStyle = useAnimatedStyle(() => ({ opacity: 1 - footerOut.value }));

  // One beat per step: once Done OR Skip fires, the controls go inert so a
  // double-tap (or Done-then-Skip) can never fire both beats for one step.
  const guard = useRef(false);
  // After End early, no queued advance/care hold may fire post-teardown.
  const ended = useRef(false);
  // Detect a genuine step change (index or id) to play the entrance beat once.
  const lastKey = useRef<string | null>(null);

  const isLast = index === total - 1;
  // The model marks the SPF + the top-finding step meaningful; the ritual also
  // treats the last step as meaningful (the care beat lands before completion).
  const meaningful = !!step && (step.meaningful || isLast);
  const absorbing = !!step && step.absorbSeconds > 0 && phase === 'active';

  // --- Entrance: a new step rises, the orb takes it, VoiceOver is announced.
  useEffect(() => {
    if (total === 0 || !step) return;
    const key = `${index}:${step.id}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    ended.current = false;
    guard.current = false;
    setPhase('active');
    setDrawing(false);
    // A fresh step's controls are present (the prior beat's fade is reset).
    footerOut.value = 0;

    transition.enter();
    // The orb drops its gaze to the new step + re-cools to the present baseline,
    // so the next gold/care beat has somewhere cool to warm from. (Driven, not
    // duplicated — the stage renders no orb of its own.)
    orbTakeStep(orb);
    // The companion's glow deepens a touch as the ritual progresses — a subtle
    // held brighten via the shared choreography, never a gamey bar/score. Skip
    // under reduce-motion (a brighten is still a motion cue, and the OS asked for
    // stillness); the gold/mute beats remain, as those are core feedback.
    if (!reduceMotion && total > 1) orbProgress(orb, index / (total - 1));

    // VoiceOver: name → instruction → product order, announced on advance.
    AccessibilityInfo.announceForAccessibility(
      `Step ${index + 1} of ${total}. ${step.action}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, step?.id, total]);

  // Cancel any pending holds on unmount.
  useEffect(() => () => delay.cancelAll(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Done: the gold beat fires on the tap, EVERY step. The check draws; a
  //     hold settles; meaningful steps hold the warmth (care); then advance.
  function handleDone() {
    if (phase !== 'active' || guard.current || !step || ended.current) return;
    guard.current = true;
    setPhase('doneBeat');
    setDrawing(true);
    retireFooter();
    // THE GOLD BEAT — orb floods warm gold + halo bloom + ONE Medium haptic.
    playGoldBloom(orb);
  }

  /** The controls settle out (fade) as a beat begins — never a hard unmount.
   *  Reduce-motion retires them instantly (a clean swap, no transform/fade). */
  function retireFooter() {
    if (reduceMotion) {
      footerOut.value = 1;
      return;
    }
    footerOut.value = withTiming(1, {
      duration: flowTiming.stepOutMs,
      easing: Easing.in(Easing.quad),
    });
  }

  // The checkmark finished drawing — hold, then care (meaningful) or advance.
  function onCheckDrawn() {
    if (ended.current) return;
    delay.after(flowTiming.settleHoldMs, () => {
      if (ended.current || !step) return;
      if (meaningful) {
        // Completion-as-care: the orb holds the warm gold and goes still — the
        // stillness IS the reward — for careHoldMs, then advances.
        setPhase('care');
        orbCareBeat(orb);
        delay.after(flowTiming.careHoldMs, () => {
          if (!ended.current) exitThen(onDone);
        });
      } else {
        // A normal step re-cools, then advances.
        orbTakeStep(orb);
        exitThen(onDone);
      }
    });
  }

  // --- Skip: the muted beat — no haptic, no scold — a quiet beat, then advance.
  function handleSkip() {
    if (phase !== 'active' || guard.current || !step || ended.current) return;
    guard.current = true;
    setPhase('skipBeat');
    retireFooter();
    playMuteDim(orb);
    delay.after(flowTiming.settleHoldMs, () => {
      if (!ended.current) exitThen(onSkip);
    });
  }

  /** The outgoing step fades/slides down, then the host swaps to the next; the
   *  incoming step rises via the entrance effect above. Never a hard cut. */
  function exitThen(advance: () => void) {
    transition.exit(() => {
      if (!ended.current) advance();
    });
  }

  function handleEndEarly() {
    if (ended.current) return;
    ended.current = true;
    // Cancel any queued advance/care hold so nothing fires after teardown; the
    // host owns the orb's end-early settle (orbEndedEarly) — not duplicated here.
    delay.cancelAll();
    onEndEarly();
  }

  const controlsTop = insets.top + 12;

  // --- Empty / end (total === 0): an honest, exitable rest — never a void.
  if (total === 0 || !step) {
    return (
      <View style={[styles.fill, styles.endCenter, { paddingTop: insets.top + 200 }]}>
        <Text
          style={[flowType.stepMoment, styles.endTitle]}
          maxFontSizeMultiplier={1.3}
        >
          Nothing to run right now.
        </Text>
        <Text
          style={[flowType.context, styles.endSub]}
          maxFontSizeMultiplier={1.4}
        >
          There's nothing in your routine for this part of the day.
        </Text>
        <Pressable
          onPress={handleEndEarly}
          accessibilityRole="button"
          accessibilityLabel="Done"
          style={({ pressed }) => [styles.endButton, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[flowType.uiName, styles.endButtonLabel]} maxFontSizeMultiplier={1.2}>
            Done
          </Text>
        </Pressable>
      </View>
    );
  }

  const beatActive = phase === 'doneBeat' || phase === 'skipBeat' || phase === 'care';

  return (
    <View style={styles.fill}>
      {/* Quiet top controls — Pause/Resume + End. Inert during a beat. */}
      <View style={[styles.controls, { top: controlsTop }]} pointerEvents="box-none">
        <RitualControls
          paused={paused}
          onTogglePause={onTogglePause}
          onEndEarly={handleEndEarly}
          disabled={beatActive}
        />
      </View>

      {/* The quiet progress cue (placed by the stage; never gamey). */}
      <View style={[styles.progress, { top: controlsTop + 44 }]} pointerEvents="none">
        <ProgressTrail
          total={total}
          index={index}
          doneCount={index}
          reduceMotion={reduceMotion}
          color={ritualTone.progressOn}
        />
      </View>

      {/* The step — exactly ONE at a time. Rises on enter, fades down on exit. */}
      <Animated.View
        style={[styles.body, { paddingTop: insets.top + 168 }, transition.style]}
      >
        <Text
          style={[flowType.eyebrow, styles.eyebrow]}
          maxFontSizeMultiplier={1.2}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          STEP {index + 1} OF {total}
        </Text>

        {/* The whole step breathes while the product settles (stilled on pause
            / reduce-motion). The serif moment never truncates — it wraps. */}
        <CardBreath reduceMotion={reduceMotion || paused || !absorbing} style={styles.breath}>
          <Text style={[flowType.stepMoment, styles.moment]} maxFontSizeMultiplier={1.3}>
            {step.action}
          </Text>

          <StepInstruction
            key={`instr-${index}`}
            text={instructionFor(step)}
            color={ritualTone.muted}
            reduceMotion={reduceMotion}
            paused={paused}
          />

          {/* The per-step product — real image + name + brand, or nothing. */}
          <RitualProduct step={step} />

          {/* Absorb — a breathing ring, never a countdown. Freezes on pause. */}
          {absorbing && (
            <View
              style={styles.ringWrap}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={`Letting it settle — about ${step.absorbSeconds} seconds`}
            >
              <BreathingRing
                size={56}
                absorbSeconds={step.absorbSeconds}
                color={ritualTone.ink}
                trackColor={ritualTone.hairline}
                running={!paused}
                reduceMotion={reduceMotion}
              />
            </View>
          )}
        </CardBreath>

        {/* The drawing checkmark — the body of the soft double-tick. */}
        {(phase === 'doneBeat' || phase === 'care') && (
          <View style={styles.checkWrap} accessibilityElementsHidden importantForAccessibility="no">
            <DrawCheck
              size={36}
              color={ritualTone.ink}
              drawing={drawing}
              reduceMotion={reduceMotion}
              // Under reduce-motion the draw is instant — both ticks would land
              // in one frame, so the second mid-draw tick stays silent.
              onMidDraw={() => {
                if (!reduceMotion) ritualHaptics.stepCompleteMidDraw();
              }}
              onDone={onCheckDrawn}
            />
          </View>
        )}
      </Animated.View>

      {/* Done pinned + prominent; Skip quiet beneath. Stays mounted across the
          beat and SETTLES OUT (footerStyle fade) rather than blinking away — a
          hard unmount would read as a cut against the gold bloom. Once a beat is
          live the controls go pointer-inert + a11y-hidden, so the fading-out
          buttons can't be re-tapped (the guard ref also forbids a second beat)
          or read aloud while they dissolve. */}
      <Animated.View
        style={[styles.footer, { paddingBottom: insets.bottom + 24, width }, footerStyle]}
        pointerEvents={phase === 'active' ? 'box-none' : 'none'}
        accessibilityElementsHidden={phase !== 'active'}
        importantForAccessibility={phase === 'active' ? 'auto' : 'no-hide-descendants'}
      >
        <Pressable
          onPress={handleDone}
          disabled={phase !== 'active'}
          accessibilityRole="button"
          accessibilityLabel="Mark this step done"
          style={({ pressed }) => [styles.done, { opacity: pressed ? 0.88 : 1 }]}
        >
          <Text style={[flowType.uiName, styles.doneLabel]} maxFontSizeMultiplier={1.2}>
            Done
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSkip}
          disabled={phase !== 'active'}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Skip this step"
          style={({ pressed }) => [styles.skip, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[flowType.context, styles.skipLabel]} maxFontSizeMultiplier={1.3}>
            Skip
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },

  controls: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
  progress: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },

  body: { flex: 1, paddingHorizontal: 28 },
  eyebrow: { color: ritualTone.faint },
  breath: { marginTop: 18, alignSelf: 'stretch' },
  moment: { color: ritualTone.ink },
  ringWrap: { marginTop: 36, alignSelf: 'flex-start' },
  checkWrap: { marginTop: 32, alignItems: 'center', alignSelf: 'stretch' },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  // Pinned, prominent, ≥44px — the calm done surface from ritualTone.
  done: {
    alignSelf: 'stretch',
    minHeight: 56,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: ritualTone.done,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ritualTone.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneLabel: { color: ritualTone.ink },
  skip: { marginTop: 14, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  skipLabel: { color: ritualTone.faint },

  // Empty / end rest state.
  endCenter: { alignItems: 'center', paddingHorizontal: 28 },
  endTitle: { color: ritualTone.ink, textAlign: 'center' },
  endSub: { color: ritualTone.muted, textAlign: 'center', marginTop: 12 },
  endButton: {
    marginTop: 32,
    minHeight: 52,
    paddingHorizontal: 36,
    borderRadius: 26,
    backgroundColor: ritualTone.done,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ritualTone.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButtonLabel: { color: ritualTone.ink },
});

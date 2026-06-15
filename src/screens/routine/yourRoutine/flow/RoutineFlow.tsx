/**
 * RoutineFlow — the TWO-ACT host (the signature light→dark descent).
 *
 * ONE continuous experience: ACT 1 the light Porcelain OVERVIEW (the plan) and
 * ACT 2 the dark RITUAL theater (the orb walks you through). Tapping Start
 * dissolves the overview into the theater over ~600ms — the companion orb
 * carrying across as a SINGLE shared element and the tab bar fading out. Reverse
 * on finish / end-early. No hard cut, no flash of base color, no orb re-mount.
 *
 * THE CONTINUITY MECHANISM: the OrbProvider is mounted ONCE here with
 * `birth=false` (the orb already exists; never re-birth it), so the orb is a
 * genuine shared element across both acts. Both acts stay MOUNTED and stacked
 * during the descent (opacity/transform only) so the OrbHost and its siblings
 * never unmount mid-transition — coherence is structural, not a swap.
 *
 * The host owns ONLY: the FlowAct machine, the descent cross-fade (`useDescent`),
 * the orb carry (`carryOrbToRitual` / `carryOrbHome`), the tab-bar fade
 * (`useRoutineFocus().setFocused`), and back-navigation. Act-2 internals (the
 * theater, the step stage, the breathing ring, completion) belong to other
 * teams and resolve at integration; the host just frames + orchestrates them.
 *
 * Reduce-motion: the descent becomes a clean cross-fade (no transforms — handled
 * by `useDescent`); the orb still ARRIVES via the carry, but the OrbHost glide
 * snaps without translate. Everything stays legible and reachable.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated from 'react-native-reanimated';
import { OrbProvider, useOrb } from '@/screens/onboarding/orb/OrbHost';
import { useRoutineFocus } from '@/state/v26/routineFocus';
import { ritualTone } from '@/theme/routineFlow';
import type { FlowAct, FlowRect, OrbTargetXY, RitualPhase } from './contracts';
import type { YourRoutineModel, StepVM } from '../model';
import {
  carryOrbHome,
  carryOrbToRitual,
  orbEndedEarly,
  orbToCalm,
  useDescent,
} from './motion';
import { OverviewScreen } from './OverviewScreen';
import { RitualTheater } from './orb/RitualTheater';
import { RitualBreathingRing } from './orb/RitualBreathingRing';
import { RitualStage } from './RitualStage';
import { CompletionMoment } from './CompletionMoment';

/** The orb's large ritual presence diameter (top-center of the theater). */
const RITUAL_ORB_SIZE = 132;
/** The calm overview orb diameter (matches the header's 44px anchor). */
const OVERVIEW_ORB_SIZE = 44;
/** The breathing ring sits just outside the ritual orb. */
const RITUAL_RING_SIZE = RITUAL_ORB_SIZE + 56;

export interface RoutineFlowProps {
  model: YourRoutineModel;
  reduceMotion: boolean;
  now: Date;
  /** Ritual finished / ended — ONLY the step ids actually marked done. */
  onComplete?: (completedStepIds: string[]) => void;
  /** Quiet bridge from the done-for-today rest state (e.g. open a rescan). */
  onRescanBridge?: () => void;
}

export function RoutineFlow(props: RoutineFlowProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // The orb's resting target on the OVERVIEW (right-aligned by the header). A
  // deterministic first-frame fallback so the orb is NEVER parked at (0,0)/NaN
  // before the header reports its measured anchor.
  const overviewAnchor = useMemo<OrbTargetXY>(
    () => ({
      cx: width - insets.right - 24 - OVERVIEW_ORB_SIZE / 2,
      cy: insets.top + 16 + 8 + 18 + OVERVIEW_ORB_SIZE / 2, // header padding + anchor offset
      size: OVERVIEW_ORB_SIZE,
    }),
    [width, insets.right, insets.top],
  );

  return (
    <OrbProvider
      birth={false}
      reduceMotion={props.reduceMotion}
      initialTarget={overviewAnchor}
      blinkCadence={{ minMs: 4000, maxMs: 9000, blinkMs: 120 }}
      breathProfile={{ amplitude: 1.02, halfMs: 2250 }}
    >
      <RoutineFlowInner
        {...props}
        viewport={{ width, height }}
        overviewAnchorFallback={overviewAnchor}
      />
    </OrbProvider>
  );
}

function RoutineFlowInner({
  model,
  reduceMotion,
  now,
  onComplete,
  onRescanBridge,
  viewport,
  overviewAnchorFallback,
}: RoutineFlowProps & {
  viewport: { width: number; height: number };
  overviewAnchorFallback: OrbTargetXY;
}) {
  const insets = useSafeAreaInsets();
  const orb = useOrb();
  const setRoutineFocused = useRoutineFocus((s) => s.setFocused);
  const descent = useDescent(reduceMotion);

  const [act, setAct] = useState<FlowAct>('overview');
  const actRef = useRef<FlowAct>('overview');
  actRef.current = act;

  // The orb's overview rest anchor — updated when the header reports its center,
  // seeded with the deterministic fallback so the carry-home never targets NaN.
  const overviewAnchorRef = useRef<OrbTargetXY>(overviewAnchorFallback);
  const handleOrbAnchor = useCallback((xy: OrbTargetXY) => {
    overviewAnchorRef.current = xy;
    // While at rest on the overview, keep the shared orb parked exactly on the
    // freshly-measured anchor (Dynamic Type / rotation reflow). Never move it
    // mid-descent or during the ritual.
    if (actRef.current === 'overview') {
      orb.moveTo(xy);
    }
  }, [orb]);

  // The orb's large ritual presence — top-center of the theater.
  const ritualOrbTarget = useMemo<OrbTargetXY>(
    () => ({
      cx: viewport.width / 2,
      cy: insets.top + 132,
      size: RITUAL_ORB_SIZE,
    }),
    [viewport.width, insets.top],
  );

  // ---- Ritual step machine (host-orchestrated; stage UI is TEAM STEP) -------
  const steps: StepVM[] = model.ritualSteps;
  const total = steps.length;
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<RitualPhase>('active');
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const completedRef = useRef<string[]>([]);
  completedRef.current = completedIds;

  const currentStep: StepVM | null =
    total > 0 && stepIndex < total ? steps[stepIndex] : null;

  // ---- Enter the ritual (Start) --------------------------------------------
  const startRitual = useCallback(
    (_rect?: FlowRect) => {
      // Re-entrancy guard: one descent in flight — a second tap is ignored.
      if (actRef.current !== 'overview') return;
      if (total === 0) return; // never Start into an empty theater

      // Reset the run.
      setStepIndex(0);
      setPhase('active');
      setCompletedIds([]);

      setAct('descending');
      setRoutineFocused(true); // the tab bar fades for the whole ritual
      carryOrbToRitual(orb, ritualOrbTarget); // the shared-element glide up
      descent.start(() => {
        // The descent landed — Act 2 is live.
        setAct('ritual');
      });
    },
    [orb, ritualOrbTarget, descent, setRoutineFocused, total],
  );

  // ---- Return to the overview (finish / end-early) -------------------------
  const returnHome = useCallback(() => {
    if (actRef.current !== 'ritual') return;
    setAct('returning');
    carryOrbHome(orb, overviewAnchorRef.current); // shrink the orb back home
    descent.reverse(() => {
      // Landed back on the overview — only now restore the tab bar.
      setAct('overview');
      setRoutineFocused(false);
      orbToCalm(orb);
    });
  }, [orb, descent, setRoutineFocused]);

  // The ritual reports it has finished its closing rest → carry home.
  const handleCompletionReturn = useCallback(() => {
    onComplete?.(completedRef.current);
    returnHome();
  }, [onComplete, returnHome]);

  // ---- Step handlers ---------------------------------------------------------
  // BOUNDARY: per-step orb EMOTION (Done → gold bloom, Skip → mute, the advance
  // beat) is owned by TEAM STEP inside RitualStage, and the completion landing
  // by TEAM PROGRESS inside CompletionMoment — the host must NOT fire them too,
  // or the orb would double-bloom / double-haptic at integration. RitualStage
  // runs its own Done/Skip beat + transition, THEN calls these to advance the
  // act-level machine. So the host only: records what was done, bumps the index,
  // and flips to the completion phase on the last step.
  const advance = useCallback(() => {
    setStepIndex((i) => {
      if (i >= total - 1) {
        setPhase('completed'); // the calm completion moment takes the screen
        return i;
      }
      setPhase('active');
      return i + 1;
    });
  }, [total]);

  const onDone = useCallback(() => {
    if (!currentStep) return;
    setCompletedIds((prev) =>
      prev.includes(currentStep.id) ? prev : [...prev, currentStep.id],
    );
    advance();
  }, [currentStep, advance]);

  const onSkip = useCallback(() => {
    if (!currentStep) return;
    advance(); // a skip leaves the step open (not added to completedIds)
  }, [currentStep, advance]);

  const [paused, setPaused] = useState(false);
  const onTogglePause = useCallback(() => setPaused((p) => !p), []);

  const onEndEarly = useCallback(() => {
    // Back-navigation is the host's job: always recover the frame — tab bar
    // back, orb home — so the flow can never strand the user in a tab-bar-less
    // dark screen. A reassuring half-warm settle as we leave (not a celebration).
    orbEndedEarly(orb);
    onComplete?.(completedRef.current);
    returnHome();
  }, [orb, onComplete, returnHome]);

  // The dark theater carries the system status bar style only while it's the
  // live act; on the light overview the bar reads dark.
  const ritualLive = act === 'descending' || act === 'ritual' || act === 'returning';

  return (
    <View style={styles.root}>
      <StatusBar style={ritualLive ? 'light' : 'dark'} />

      {/* ACT 2 — the dark ritual layer (BELOW the overview in z, revealed as the
          overview fades). Always mounted + stacked so the orb's siblings never
          unmount mid-descent. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, descent.darkStyle]}
        pointerEvents={act === 'ritual' ? 'auto' : 'none'}
        accessibilityElementsHidden={act === 'overview'}
        importantForAccessibility={act === 'overview' ? 'no-hide-descendants' : 'auto'}
      >
        {/* The theater is a self-contained backdrop (NOT a wrapper): dark base +
            a radial lift POOL tracking the orb's rest center + grain. Threading
            the descent `p` as `enter` blooms the room in WITH the orb's carry. */}
        <RitualTheater
          cx={ritualOrbTarget.cx}
          cy={ritualOrbTarget.cy}
          size={RITUAL_ORB_SIZE}
          reduceMotion={reduceMotion}
          enter={descent.p}
        />

        {/* The companion's resting breath, around the orb's ritual rest. Also
            blooms in with the carry via the shared descent `p`. */}
        <RitualBreathingRing
          size={RITUAL_RING_SIZE}
          cx={ritualOrbTarget.cx}
          cy={ritualOrbTarget.cy}
          color={ritualTone.hairline}
          reduceMotion={reduceMotion}
          enter={descent.p}
        />

        {/* The step content — ONE step at a time, or the calm completion rest.
            Stacked on TOP so its Done / Skip / End controls stay tappable. */}
        {phase === 'completed' ? (
          <CompletionMoment
            line={model.doneLandingLine}
            bridge={model.progressBridge}
            reduceMotion={reduceMotion}
            onReturn={handleCompletionReturn}
          />
        ) : currentStep ? (
          <RitualStage
            step={currentStep}
            index={stepIndex}
            total={total}
            reduceMotion={reduceMotion}
            paused={paused}
            onDone={onDone}
            onSkip={onSkip}
            onTogglePause={onTogglePause}
            onEndEarly={onEndEarly}
          />
        ) : null}
      </Animated.View>

      {/* ACT 1 — the light overview (ABOVE in z, recedes during the descent).
          Mounted throughout; opacity/transform only. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, descent.lightStyle]}
        pointerEvents={act === 'overview' ? 'auto' : 'none'}
        accessibilityElementsHidden={ritualLive}
        importantForAccessibility={ritualLive ? 'no-hide-descendants' : 'auto'}
      >
        <OverviewScreen
          model={model}
          reduceMotion={reduceMotion}
          now={now}
          onStart={startRitual}
          onRescanBridge={onRescanBridge}
          onOrbAnchor={handleOrbAnchor}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ritualTone.base,
  },
});

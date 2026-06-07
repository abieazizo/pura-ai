/**
 * OrbInterviewScreen — hosts the whole orb interview as ONE route with ONE orb
 * instance: Screen 2 → name beat → Screen 3 (goal) → Screen 4 (guidance) →
 * Screen 5 (routine depth). Keeping them internal steps means the orb never
 * re-mounts between them; it glides + shifts aura while each step's content
 * cross-fades. Seeded at Screen 1's exit spot for a seamless handoff in.
 *
 * Forks wired here:
 *   • goal → stored, and "guide me" SKIPS Screen 4 (default walk-me-through).
 *   • guidance → stored (forks explanation depth) + threads Screen 5's framing.
 *   • routine depth → stored as an EDITABLE preference (sizes the routine).
 *   • Screen 4 → 5 is a z-axis transition with the aura warming violet→blue.
 */

import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useAppStore } from '@/store/useAppStore';
import type { AppState } from '@/store/useAppStore';
import { OrbProvider, useOrb } from './orb/OrbHost';
import type { OrbTarget } from './orb/orbLayout';
import { useOnboardingTheme } from './orb/onboardingTheme';
import { OrbSpeaksScreen } from './OrbSpeaksScreen';
import { NameBeatScreen } from './NameBeatScreen';
import { QuestionScreen } from './QuestionScreen';
import {
  GOAL_QUESTION,
  GUIDANCE_QUESTION,
  ROUTINE_DEPTH_QUESTION,
} from './questionConfig';

export interface OrbInterviewScreenProps {
  /** Advance out of the orb chain (→ the camera primer). */
  onDone: () => void;
}

type Step = 'speaks' | 'name' | 'goal' | 'guidance' | 'routine';

function devInitialStep(): Step | null {
  if (!__DEV__) return null;
  try {
    const s = (globalThis as any)?.localStorage?.getItem?.('__pura_interview_step__');
    if (s === 'name') return 'name';
    if (s === 'goal' || s === 'question') return 'goal';
    if (s === 'guidance') return 'guidance';
    if (s === 'routine') return 'routine';
  } catch {}
  return null;
}

export function OrbInterviewScreen({ onDone }: OrbInterviewScreenProps) {
  const reduceMotion = useReduceMotion();
  const { dark, colors } = useOnboardingTheme();
  const { width, height } = useWindowDimensions();

  // The orb enters EXACTLY where Screen 1's cold open leaves it (same formula),
  // so the cross-route handoff reads as one continuous element.
  const clusterTop = Math.round(height * 0.16);
  const orbSize = Math.min(Math.round(width * 0.64), 264);
  const arrival: OrbTarget = {
    cx: width / 2,
    cy: clusterTop + orbSize / 2 - height * 0.16,
    size: 90,
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.base }]}>
      <OrbProvider
        reduceMotion={reduceMotion}
        birth={false}
        initialTarget={arrival}
        dark={dark}
        auraTheme="violet-cool"
      >
        <InterviewSteps onDone={onDone} />
      </OrbProvider>
    </View>
  );
}

function InterviewSteps({ onDone }: { onDone: () => void }) {
  const reduceMotion = useReduceMotion();
  const orb = useOrb();
  const name = useAppStore((s) => s.name);
  const setGoal = useAppStore((s) => s.setGoal);
  const setGuidance = useAppStore((s) => s.setGuidance);
  const setRoutineDepth = useAppStore((s) => s.setRoutineDepth);

  const [step, setStep] = useState<Step>(() => devInitialStep() ?? 'speaks');
  const [goalId, setGoalId] = useState<string | null>(null);
  const [goalVal, setGoalVal] = useState<string | null>(null);
  const [guidanceId, setGuidanceId] = useState<string | null>(null);
  const [guidanceVal, setGuidanceVal] = useState<string | null>(null);
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [skippedGuidance, setSkippedGuidance] = useState(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    orb.hide({ duration: 260 });
    setTimeout(onDone, reduceMotion ? 0 : 260);
  }, [orb, onDone, reduceMotion]);

  switch (step) {
    case 'speaks':
      return <OrbSpeaksScreen onAdvance={() => setStep('name')} />;

    case 'name':
      return <NameBeatScreen onAdvance={() => setStep('goal')} />;

    case 'goal':
      return (
        <QuestionScreen
          config={GOAL_QUESTION}
          name={name}
          progressFrom={0}
          progressTo={0.34}
          initialSelected={goalId}
          onSelect={(value, id) => {
            setGoalId(id);
            setGoalVal(value);
            setGoal(value === 'unsure' ? null : (value as AppState['goal']));
          }}
          onAdvance={(value) => {
            if (value === 'unsure') {
              // Don't make a confused user declare confusion twice — skip
              // Screen 4 and default guidance to walk-me-through.
              setSkippedGuidance(true);
              setGuidance('full-guidance');
              setGuidanceVal('full-guidance');
              setStep('routine');
            } else {
              setStep('guidance');
            }
          }}
        />
      );

    case 'guidance':
      return (
        <QuestionScreen
          config={GUIDANCE_QUESTION}
          goal={goalVal}
          name={name}
          progressFrom={0.34}
          progressTo={0.67}
          exitMode="z" // recede into depth toward Screen 5
          initialSelected={guidanceId}
          onSelect={(value, id) => {
            setGuidanceId(id);
            setGuidanceVal(value);
            setGuidance(value as AppState['guidance']);
          }}
          onAdvance={() => setStep('routine')}
        />
      );

    case 'routine':
    default:
      return (
        <QuestionScreen
          config={ROUTINE_DEPTH_QUESTION}
          goal={goalVal}
          name={name}
          threadKey={guidanceVal}
          progressFrom={skippedGuidance ? 0.34 : 0.67}
          progressTo={1}
          enterMode={skippedGuidance ? 'rise' : 'z'} // emerge from depth after S4
          initialSelected={routineId}
          onSelect={(value, id) => {
            setRoutineId(id);
            setRoutineDepth(value as AppState['routineDepth']);
          }}
          onAdvance={finish}
        />
      );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

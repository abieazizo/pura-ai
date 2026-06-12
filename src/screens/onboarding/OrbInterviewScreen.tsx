/**
 * OrbInterviewScreen — hosts the whole orb interview as ONE route with ONE orb
 * instance. Keeping the questions internal steps means the orb never re-mounts
 * between them; it glides while each step's content cross-fades. Seeded at the
 * cold open's exit spot for a seamless handoff in.
 *
 * v22 — the momentum rebuild. Five questions, one per screen, each a single
 * tap (sensitivities is a multi-select with an exclusive "none"), then a short
 * synthesis beat and out to the camera primer:
 *
 *   goal → age → skin type → sensitivities → pregnancy → synthesis → onDone
 *
 * Everything collected is engine-consumed (see questionConfig.ts header).
 * The name beat, guidance and routine-depth questions were cut — momentum,
 * not data entry. Back navigation steps backward with selections restored.
 */

import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useAppStore } from '@/store/useAppStore';
import type { AppState, SkinCondition } from '@/store/useAppStore';
import { OrbProvider, useOrb } from './orb/OrbHost';
import { targetFor, type OrbTarget } from './orb/orbLayout';
import { useOnboardingTheme } from './orb/onboardingTheme';
import { QuestionScreen } from './QuestionScreen';
import { SynthesisBeat } from './SynthesisBeat';
import {
  AGE_QUESTION,
  GOAL_QUESTION,
  SAFETY_QUESTION,
  SENSITIVITIES_QUESTION,
  SKIN_TYPE_QUESTION,
} from './questionConfig';

export interface OrbInterviewScreenProps {
  /** Advance out of the orb chain (→ the camera primer). */
  onDone: () => void;
}

const STEPS = ['goal', 'age', 'skin', 'sense', 'safety'] as const;
type QuestionStep = (typeof STEPS)[number];
type Step = QuestionStep | 'synthesis';

/** Honest rail model: fill = ANSWERED questions / 5. A step arrives showing
 *  credit for the questions before it and eases to its own credit only when
 *  its answer commits — the bar never reads full on an unanswered question.
 *  Same formula in both directions (going back to re-answer a question shows
 *  the credit of everything before it). */
function railCredit(step: QuestionStep): { from: number; to: number } {
  const i = STEPS.indexOf(step);
  return { from: i / STEPS.length, to: (i + 1) / STEPS.length };
}

function devInitialStep(): Step | null {
  if (!__DEV__) return null;
  try {
    const s = (globalThis as any)?.localStorage?.getItem?.('__pura_interview_step__');
    if (s === 'goal' || s === 'question') return 'goal';
    if (s === 'age') return 'age';
    if (s === 'skin' || s === 'skinType') return 'skin';
    if (s === 'sense' || s === 'sensitivities') return 'sense';
    if (s === 'safety') return 'safety';
    if (s === 'synthesis') return 'synthesis';
  } catch {}
  return null;
}

export function OrbInterviewScreen({ onDone }: OrbInterviewScreenProps) {
  const reduceMotion = useReduceMotion();
  const { dark, colors } = useOnboardingTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // The orb enters EXACTLY where the cold open's exit flight parks it — the
  // question beat's own target (ColdOpen flies the orb to this same spot via
  // targetFor('question')), so the cross-route cross-fade swaps two perfectly
  // superimposed orbs and the companion never jumps.
  const arrival: OrbTarget = targetFor('question', width, height, insets.top);

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
  const setGoal = useAppStore((s) => s.setGoal);
  const setAgeRange = useAppStore((s) => s.setAgeRange);
  const setAgePreferNotToSay = useAppStore((s) => s.setAgePreferNotToSay);
  const setSkinType = useAppStore((s) => s.setSkinType);
  const setSensitivity = useAppStore((s) => s.setSensitivity);
  const setFragranceSensitive = useAppStore((s) => s.setFragranceSensitive);
  const setSkinConditions = useAppStore((s) => s.setSkinConditions);
  const setAvoidIngredients = useAppStore((s) => s.setAvoidIngredients);
  const setPregnancyCaution = useAppStore((s) => s.setPregnancyCaution);

  const [step, setStep] = useState<Step>(() => devInitialStep() ?? 'goal');
  const [backward, setBackward] = useState(false);
  // Per-step selections — kept so back navigation restores the prior answer.
  const [goalId, setGoalId] = useState<string | null>(null);
  const [ageId, setAgeId] = useState<string | null>(null);
  const [skinId, setSkinId] = useState<string | null>(null);
  const [senseIds, setSenseIds] = useState<string[]>([]);
  // Restored like every other step — the back chevron is reachable during
  // the ~1.5s reaction window, and the store may already hold the answer.
  const [safetyId, setSafetyId] = useState<string | null>(null);
  const doneRef = useRef(false);

  const goForward = useCallback((next: Step) => {
    setBackward(false);
    setStep(next);
  }, []);
  const goBack = useCallback((prev: QuestionStep) => {
    setBackward(true);
    setStep(prev);
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    orb.hide({ duration: 260 });
    setTimeout(onDone, reduceMotion ? 0 : 260);
  }, [orb, onDone, reduceMotion]);

  /** Map the sensitivities multi-select onto the safety-profile fields the
   *  engine reads (buildSafetyProfile). Recomputed in full on every advance so
   *  back-and-change stays consistent — never an incremental patch. */
  const applySensitivities = useCallback(
    (ids: string[]) => {
      const none = ids.length === 0 || ids.includes('none');
      const conditions: SkinCondition[] = [];
      if (ids.includes('eczema')) conditions.push('eczema');
      if (ids.includes('rosacea')) conditions.push('rosacea');
      setSkinConditions(conditions);
      setAvoidIngredients(ids.includes('actives') ? ['retinol', 'exfoliating acids'] : []);
      setFragranceSensitive(none ? 'no' : ids.includes('fragrance') ? 'yes' : 'no');
      const count = ids.filter((id) => id !== 'none').length;
      setSensitivity(none ? 'not' : count >= 2 ? 'very' : 'somewhat');
    },
    [setSkinConditions, setAvoidIngredients, setFragranceSensitive, setSensitivity],
  );

  switch (step) {
    case 'goal':
      return (
        <QuestionScreen
          key="goal"
          config={GOAL_QUESTION}
          progressFrom={railCredit('goal').from}
          progressTo={railCredit('goal').to}
          backward={backward}
          initialSelected={goalId}
          onSelect={(value, id) => {
            setGoalId(id);
            setGoal(value === 'unsure' ? null : (value as AppState['goal']));
          }}
          onAdvance={() => goForward('age')}
        />
      );

    case 'age':
      return (
        <QuestionScreen
          key="age"
          config={AGE_QUESTION}
          progressFrom={railCredit('age').from}
          progressTo={railCredit('age').to}
          backward={backward}
          initialSelected={ageId}
          onBack={() => goBack('goal')}
          onSelect={(value, id) => {
            setAgeId(id);
            const preferNot = value === 'prefer_not';
            setAgePreferNotToSay(preferNot);
            setAgeRange(preferNot ? null : (value as AppState['ageRange']));
          }}
          onAdvance={() => goForward('skin')}
        />
      );

    case 'skin':
      return (
        <QuestionScreen
          key="skin"
          config={SKIN_TYPE_QUESTION}
          progressFrom={railCredit('skin').from}
          progressTo={railCredit('skin').to}
          backward={backward}
          initialSelected={skinId}
          onBack={() => goBack('age')}
          onSelect={(value, id) => {
            setSkinId(id);
            setSkinType(value as AppState['skinType']);
          }}
          onAdvance={() => goForward('sense')}
        />
      );

    case 'sense':
      return (
        <QuestionScreen
          key="sense"
          config={SENSITIVITIES_QUESTION}
          progressFrom={railCredit('sense').from}
          progressTo={railCredit('sense').to}
          backward={backward}
          initialSelectedIds={senseIds}
          exitMode="z" // recede into depth toward the final question
          onBack={() => goBack('skin')}
          onAdvance={() => goForward('safety')}
          onAdvanceMulti={(ids) => {
            setSenseIds(ids);
            applySensitivities(ids);
            goForward('safety');
          }}
        />
      );

    case 'safety':
      return (
        <QuestionScreen
          key="safety"
          config={SAFETY_QUESTION}
          progressFrom={railCredit('safety').from}
          progressTo={railCredit('safety').to}
          backward={backward}
          enterMode="z" // the "Last one" gravity beat emerges from depth
          initialSelected={safetyId}
          onBack={() => goBack('sense')}
          onSelect={(value, id) => {
            setSafetyId(id);
            setPregnancyCaution(value as AppState['pregnancyCaution']);
          }}
          onAdvance={() => goForward('synthesis')}
        />
      );

    case 'synthesis':
    default:
      return <SynthesisBeat onDone={finish} />;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

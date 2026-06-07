/**
 * OrbInterviewScreen — hosts Screen 2 → name beat → Screen 3 as ONE route with
 * ONE orb instance.
 *
 * WHY one route: the orb must be a single continuous element across these three
 * beats. Keeping them as internal steps (not separate navigator screens) means
 * the orb never re-mounts between them — it just glides to each beat's target
 * while each step's own content cross-fades. The orb is seeded at the EXACT spot
 * Screen 1's cold open exits to, so the handoff into the interview is seamless.
 *
 * Screen 3 is instantiated here as the first question (the goal), with the FULL
 * spoken-reaction treatment; later questions would drop in as more steps using
 * the same QuestionScreen with reactionStyle="light".
 */

import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Sparkle, Crosshair, Hourglass, Sun, Compass } from 'phosphor-react-native';
import { palette } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useAppStore } from '@/store/useAppStore';
import type { AppState } from '@/store/useAppStore';
import { OrbProvider, useOrb } from './orb/OrbHost';
import type { OrbTarget } from './orb/orbLayout';
import { OrbSpeaksScreen } from './OrbSpeaksScreen';
import { NameBeatScreen } from './NameBeatScreen';
import { QuestionScreen, type QuestionOption } from './QuestionScreen';

export interface OrbInterviewScreenProps {
  /** Advance out of the orb chain (→ the camera primer). */
  onDone: () => void;
}

// Screen 3 — the goal question, with five DISTINCT reactions.
const GOAL_OPTIONS: QuestionOption[] = [
  {
    key: 'calmClear',
    label: 'Calmer, clearer skin overall',
    Icon: Sparkle,
    reaction: 'calmClear',
    reactionLine: "Calm and clear. That's a good place to aim.",
  },
  {
    key: 'breakouts',
    label: 'Get my breakouts under control',
    Icon: Crosshair,
    reaction: 'breakouts',
    reactionLine: "Let's get ahead of them together, [Name].",
  },
  {
    key: 'aging',
    label: 'Slow the signs of aging',
    Icon: Hourglass,
    reaction: 'aging',
    reactionLine: "Smart. We'll work on this gently, starting tonight.",
  },
  {
    key: 'darkSpots',
    label: 'Fade dark spots and even tone',
    Icon: Sun,
    reaction: 'darkSpots',
    reactionLine: "Got it. Even tone takes patience — I'll guide the pace.",
  },
  {
    key: 'unsure',
    label: "Honestly? I'm not sure — guide me",
    Icon: Compass,
    reaction: 'unsure',
    reactionLine: "That's completely okay. That's exactly what I'm here for.",
  },
];

// Map each goal answer onto the store's existing `goal` vocabulary so the scan
// reveal, routine matching and Shop keep working. "Not sure" stays null.
const GOAL_BY_KEY: Record<string, AppState['goal']> = {
  calmClear: 'calm',
  breakouts: 'clear',
  aging: 'smoother',
  darkSpots: 'bright',
  unsure: null,
};

// Indicative question count for the quiet progress dots + orb-as-progress.
const TOTAL_QUESTIONS = 6;

export function OrbInterviewScreen({ onDone }: OrbInterviewScreenProps) {
  const reduceMotion = useReduceMotion();
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
    <View style={styles.root}>
      <OrbProvider reduceMotion={reduceMotion} birth={false} initialTarget={arrival}>
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
  const [step, setStep] = useState<'speaks' | 'name' | 'question'>(() => {
    // Dev preview escape hatch: jump straight to a step for verification.
    if (__DEV__) {
      try {
        const s = (globalThis as any)?.localStorage?.getItem?.('__pura_interview_step__');
        if (s === 'name' || s === 'question') return s;
      } catch {}
    }
    return 'speaks';
  });
  const [goalKey, setGoalKey] = useState<string[]>([]);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    // The orb exits the built chain here (later questions would keep it going).
    orb.hide({ duration: 260 });
    setTimeout(onDone, reduceMotion ? 0 : 260);
  }, [orb, onDone, reduceMotion]);

  switch (step) {
    case 'speaks':
      return <OrbSpeaksScreen onAdvance={() => setStep('name')} />;
    case 'name':
      return <NameBeatScreen onAdvance={() => setStep('question')} />;
    case 'question':
    default:
      return (
        <QuestionScreen
          question="What are you hoping we'll work on together?"
          options={GOAL_OPTIONS}
          reactionStyle="full"
          select="single"
          progress={{ index: 0, total: TOTAL_QUESTIONS }}
          familiarityFrom={0}
          familiarityTo={1 / TOTAL_QUESTIONS}
          name={name}
          initialSelected={goalKey}
          onSelect={(keys) => {
            setGoalKey(keys);
            setGoal(GOAL_BY_KEY[keys[0]] ?? null);
          }}
          onAdvance={finish}
        />
      );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
});

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Eyebrow,
  ProgressDots,
  SectionHeading,
  Supporting,
  useReducedMotion,
} from './primitives';
import { TonightHero } from './TonightHero';
import { ActiveStep, CompactCompletedRow } from './ActiveStep';
import { CompletionHero } from './CompletionHero';
import { MorningSPF } from './MorningSPF';
import { V26, V26_SPACE } from './tokens';
import type {
  RoutineSession,
  RoutineStep,
} from '@/state/v26/routineSession';

interface TodayViewProps {
  session: RoutineSession;
  onStart: () => void;
  onCompleteStep: (stepId: string) => void;
  onSkipStep: (stepId: string) => void;
  onChangeProduct: (stepId: string) => void;
  onAddOwned: (stepId: string) => void;
  onChooseAnotherProduct: (stepId: string) => void;
  onCheckMyProducts: () => void;
  onAddMorningSPF: () => void;
  onFindSpfMatch?: () => void;
  onSetMorningReminder?: () => void;
  onWhyThisPlan?: () => void;
}

/**
 * v26 — Today body.
 *
 * Switches between pre-start, active-guided, and completion states.
 * Every state has ONE dominant moment and ONE primary action.
 */
export function TodayView(props: TodayViewProps) {
  const { session } = props;

  if (session.status === 'notStarted') {
    return <NotStarted session={session} onStart={props.onStart} onWhyTap={props.onWhyThisPlan} />;
  }
  if (session.status === 'complete') {
    return (
      <Complete
        session={session}
        onAddMorningSPF={props.onAddMorningSPF}
        onFindSpfMatch={props.onFindSpfMatch}
        onSetMorningReminder={props.onSetMorningReminder}
      />
    );
  }
  return <Active {...props} />;
}

// ---------------------------------------------------------------------------
// Not started
// ---------------------------------------------------------------------------

interface NotStartedProps {
  session: RoutineSession;
  onStart: () => void;
  onWhyTap?: () => void;
}

function NotStarted({ session, onStart, onWhyTap }: NotStartedProps) {
  const meta = `${session.steps.length} steps · ${session.estimatedMinutes} min`;
  return (
    <View style={s.body}>
      <TonightHero
        eyebrow={session.eyebrow}
        headline={session.emotionalHeadline}
        support={session.emotionalSupport}
        meta={meta}
        onStart={onStart}
        onWhyTap={onWhyTap}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Active
// ---------------------------------------------------------------------------

function Active(props: TodayViewProps) {
  const { session } = props;
  const reduced = useReducedMotion();

  const total = session.steps.length;
  const completed = session.completedStepIds.length;
  const activeStep = useMemo<RoutineStep | undefined>(
    () => session.steps[session.currentStepIndex],
    [session.steps, session.currentStepIndex],
  );

  const stepLabel = useCallback(
    (step: RoutineStep, index: number) => {
      if (step.isSignatureStep) return 'FINAL STEP';
      return `STEP ${index + 1} OF ${total}`;
    },
    [total],
  );

  const completedRows = session.completedStepIds
    .map((id) => session.steps.find((step) => step.id === id))
    .filter((step): step is RoutineStep => !!step);

  return (
    <View style={s.body}>
      <View style={s.progressHeader}>
        <Eyebrow style={s.progressEyebrow}>TONIGHT’S ROUTINE</Eyebrow>
        <View style={s.progressRow}>
          <SectionHeading style={s.progressTitle}>
            {completed === total
              ? 'Routine complete'
              : `Step ${Math.min(session.currentStepIndex + 1, total)} of ${total}`}
          </SectionHeading>
          <ProgressDots total={total} completed={completed} showActiveDot />
        </View>
      </View>

      {activeStep ? (
        <Animated.View
          key={activeStep.id}
          entering={reduced ? undefined : FadeIn.duration(220)}
        >
          <ActiveStep
            step={activeStep}
            stepLabel={stepLabel(activeStep, session.currentStepIndex)}
            onDone={() => props.onCompleteStep(activeStep.id)}
            onSkip={
              activeStep.isSignatureStep
                ? undefined
                : () => props.onSkipStep(activeStep.id)
            }
            onChangeProduct={
              activeStep.product
                ? () => props.onChangeProduct(activeStep.id)
                : undefined
            }
            onAddOwned={
              !activeStep.product && !activeStep.isSignatureStep
                ? () => props.onAddOwned(activeStep.id)
                : undefined
            }
            onChooseAnotherProduct={
              activeStep.product?.compatibility === 'avoidTonight'
                ? () => props.onChooseAnotherProduct(activeStep.id)
                : undefined
            }
            onCheckMyProducts={
              activeStep.isSignatureStep ? props.onCheckMyProducts : undefined
            }
          />
        </Animated.View>
      ) : null}

      {completedRows.length > 0 ? (
        <View style={s.completedList}>
          <Supporting style={s.completedLabel}>COMPLETED</Supporting>
          {completedRows.map((step, idx) => (
            <CompactCompletedRow
              key={step.id}
              index={idx + 1}
              total={total}
              title={step.title}
              detail={step.product?.name}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Complete
// ---------------------------------------------------------------------------

interface CompleteProps {
  session: RoutineSession;
  onAddMorningSPF: () => void;
  onFindSpfMatch?: () => void;
  onSetMorningReminder?: () => void;
}

function Complete({
  session,
  onAddMorningSPF,
  onFindSpfMatch,
  onSetMorningReminder,
}: CompleteProps) {
  const summary = useMemo(() => {
    const names = session.steps.map((step) => {
      if (step.isSignatureStep) return 'Kept treatment gentle';
      return step.title;
    });
    return names.join(' · ');
  }, [session.steps]);

  const meta = `${session.steps.length} steps completed · ${session.estimatedMinutes} min`;

  return (
    <View style={s.body}>
      <CompletionHero
        eyebrow="TONIGHT COMPLETE"
        headline="You did enough tonight."
        support="Your skin does not need more treatment. Let it settle."
        meta={meta}
        summary={summary}
      />
      <MorningSPF
        onAddOwned={onAddMorningSPF}
        onFindMatch={onFindSpfMatch}
        onSetReminder={onSetMorningReminder}
      />
    </View>
  );
}

const s = StyleSheet.create({
  body: {
    paddingHorizontal: V26_SPACE.gutter,
    paddingTop: 18,
    gap: V26_SPACE.cardGap,
  },
  progressHeader: {
    gap: 10,
  },
  progressEyebrow: {
    color: V26.terracottaText,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressTitle: {
    flexShrink: 1,
  },
  completedList: {
    marginTop: 8,
    gap: 8,
  },
  completedLabel: {
    color: V26.terracottaText,
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
});

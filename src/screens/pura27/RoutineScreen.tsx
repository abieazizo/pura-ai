/**
 * pura27 — Routine screen.
 *
 * The product's central nightly output. Two tabs:
 *   • Tonight  — three-step routine + completion state
 *   • Progress — 84-day program + trend + last-adaptation
 *
 * State + persistence flow through `usePuraSession` (which writes
 * `routineSessionV26` + `tonightCompleteAt` to the existing app store)
 * so completion survives navigation and app reloads, AND so the Home
 * screen sees the completed state without double-counting progress.
 *
 * Trust contract: no medical claims, no "diagnosis" language, no dead
 * production buttons. Steps speak in literal action terms — "Apply",
 * "Avoid", "Massage", "Wait 60 seconds".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { CheckCircle } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

import { pura27 } from '@/theme';
import { hapt } from '@/utils/haptics';
import { usePuraSession } from '@/state/pura27/puraSession';
import type {
  PuraSession,
  RoutineStep,
} from '@/state/pura27/types';
import type { RootStackParamList } from '@/navigation/types';
import {
  Body,
  BodyLarge,
  Card,
  DisplayCard,
  DisplayHero,
  FunctionalTitle,
  HeaderRow,
  InfoState,
  PrimaryButton,
  ProgressMeter,
  PuraScreen,
  SectionLabel,
  SegmentedTabs,
  StatusPill,
} from './components';

type Nav = NavigationProp<RootStackParamList>;

type RoutineTab = 'tonight' | 'progress';

const TABS: readonly { key: RoutineTab; label: string }[] = [
  { key: 'tonight', label: 'Tonight' },
  { key: 'progress', label: 'Progress' },
];

// ===========================================================================
// RoutineP27Screen
// ===========================================================================

export function RoutineP27Screen() {
  const nav = useNavigation<Nav>();
  const { session, actions } = usePuraSession();
  const [tab, setTab] = useState<RoutineTab>('tonight');

  const handleScan = useCallback(() => {
    hapt.tap();
    nav.navigate('ScanModal');
  }, [nav]);

  const handleDoneForTonight = useCallback(() => {
    hapt.select();
    const parent = (nav as any).getParent?.();
    if (parent?.navigate) {
      parent.navigate('HomeTab');
    }
  }, [nav]);

  const handleAskPura = useCallback(() => {
    hapt.select();
    const parent = (nav as any).getParent?.();
    if (parent?.navigate) {
      parent.navigate('AssistantTab');
    }
  }, [nav]);

  return (
    <PuraScreen>
      <HeaderRow
        title="Routine"
        meta="BUILT FROM TONIGHT’S RELIABLE SCAN"
      />

      <SegmentedTabs<RoutineTab>
        tabs={TABS}
        value={tab}
        onChange={setTab}
      />

      {tab === 'tonight' ? (
        <TonightTab
          session={session}
          onCompleteStep={actions.completeStep}
          onStartScan={handleScan}
          onDoneForTonight={handleDoneForTonight}
          onAskPura={handleAskPura}
        />
      ) : (
        <ProgressTab session={session} onReviewRoutine={() => setTab('tonight')} />
      )}
    </PuraScreen>
  );
}

// ===========================================================================
// Tonight tab
// ===========================================================================

interface TonightTabProps {
  session: PuraSession;
  onCompleteStep: (stepId: string) => void;
  onStartScan: () => void;
  onDoneForTonight: () => void;
  onAskPura: () => void;
}

function TonightTab({
  session,
  onCompleteStep,
  onStartScan,
  onDoneForTonight,
  onAskPura,
}: TonightTabProps) {
  const routine = session.currentRoutine;
  const steps = routine.steps;

  const completedCount = useMemo(
    () => steps.filter((s) => s.completed).length,
    [steps],
  );

  const isComplete = session.stage === 'routine_complete';

  if (session.stage === 'pre_scan') {
    return (
      <InfoState
        headline="Start with tonight’s scan."
        body="Your routine adapts after Pura sees what your skin needs tonight."
        primaryLabel="Start tonight’s scan"
        onPrimary={onStartScan}
        style={tonightStyles.empty}
      />
    );
  }

  if (isComplete) {
    return (
      <CompletionPanel
        progress={session.progress}
        onDoneForTonight={onDoneForTonight}
        onAskPura={onAskPura}
      />
    );
  }

  const remaining = steps.length - completedCount;
  const remainingLabel =
    completedCount === 0
      ? 'Ready to begin'
      : remaining === 1
      ? '1 step remaining'
      : `${remaining} steps remaining`;

  const activeStepId = (() => {
    const next = steps.find((s) => !s.completed);
    return next?.id ?? steps[0]?.id ?? '';
  })();

  return (
    <Animated.View entering={Platform.OS === 'web' ? undefined : FadeIn.duration(220)}>
      <Card variant="warm" style={tonightStyles.summary}>
        <DisplayCard>{routine.headline}</DisplayCard>
        <Body style={tonightStyles.summaryBody}>{routine.summary}</Body>
        {routine.skipped.length > 0 ? (
          <View style={tonightStyles.skippedRow}>
            <StatusPill
              label={`Skip ${routine.skipped[0]!.productName.toLowerCase()} tonight`}
              variant="warning"
            />
          </View>
        ) : null}
      </Card>

      <View style={tonightStyles.progressBlock}>
        <View style={tonightStyles.progressLabelsRow}>
          <SectionLabel>TONIGHT’S ROUTINE</SectionLabel>
          <SectionLabel>
            {`${completedCount} OF ${steps.length} DONE`}
          </SectionLabel>
        </View>
        <ProgressMeter
          value={completedCount}
          max={steps.length}
          height={8}
          accessibilityLabel={`Routine ${completedCount} of ${steps.length} steps complete`}
          style={tonightStyles.progressMeter}
        />
        <Text
          maxFontSizeMultiplier={1.2}
          style={tonightStyles.remainingLabel}
        >
          {remainingLabel}
        </Text>
      </View>

      <View style={tonightStyles.stepsList}>
        {steps.map((step) => (
          <StepCard
            key={step.id}
            step={step}
            active={step.id === activeStepId && !step.completed}
            onComplete={() => onCompleteStep(step.id)}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const tonightStyles = StyleSheet.create({
  summary: {
    marginTop: 22,
    padding: 22,
  },
  summaryBody: {
    marginTop: 10,
  },
  skippedRow: {
    marginTop: 16,
  },
  progressBlock: {
    marginTop: 28,
    paddingVertical: 18,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  progressMeter: {
    marginTop: 12,
  },
  remainingLabel: {
    marginTop: 12,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: pura27.inkSecondary,
    letterSpacing: 0.1,
  },
  stepsList: {
    gap: 14,
    paddingTop: 4,
    paddingBottom: 24,
  },
  empty: {
    marginTop: 28,
  },
});

// ---------------------------------------------------------------------------
// Step card
// ---------------------------------------------------------------------------

interface StepCardProps {
  step: RoutineStep;
  active: boolean;
  onComplete: () => void;
}

function StepCard({ step, active, onComplete }: StepCardProps) {
  return (
    <Card
      variant={active ? 'accent' : 'surface'}
      style={[
        stepStyles.card,
        step.completed && stepStyles.cardComplete,
      ]}
    >
      <View style={stepStyles.headerRow}>
        <SectionLabel tone={active ? 'accent' : 'default'}>
          {`STEP ${step.order}`}
        </SectionLabel>
        {step.completed ? (
          <StatusPill label="Done" variant="success" />
        ) : null}
      </View>

      <View style={stepStyles.titleRow}>
        <FunctionalTitle style={stepStyles.title}>
          {step.title}
        </FunctionalTitle>
      </View>

      <Text
        maxFontSizeMultiplier={1.2}
        style={stepStyles.product}
      >
        {step.productName}
      </Text>

      <Body style={stepStyles.instruction}>{step.instruction}</Body>

      {step.caution ? (
        <View style={stepStyles.cautionRow}>
          <StatusPill label={step.caution} variant="warning" />
        </View>
      ) : null}

      {active && !step.completed ? (
        <View style={stepStyles.activeBlock}>
          <Body style={stepStyles.expanded}>{step.expandedInstruction}</Body>
          <PrimaryButton
            label="Mark complete"
            onPress={onComplete}
            accessibilityLabel={`Mark ${step.title} complete`}
            style={stepStyles.cta}
            size="md"
          />
        </View>
      ) : null}

      {!active && !step.completed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mark ${step.title} complete`}
          hitSlop={6}
          onPress={onComplete}
          style={({ pressed }) => [
            stepStyles.secondaryComplete,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text
            maxFontSizeMultiplier={1.2}
            style={stepStyles.secondaryCompleteText}
          >
            Mark complete
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const stepStyles = StyleSheet.create({
  card: {
    padding: 20,
  },
  cardComplete: {
    backgroundColor: pura27.successBackground,
    borderColor: pura27.successBackground,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  titleRow: {
    marginTop: 10,
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    color: pura27.ink,
  },
  product: {
    marginTop: 4,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14.5,
    color: pura27.inkSecondary,
    letterSpacing: -0.1,
  },
  instruction: {
    marginTop: 12,
  },
  cautionRow: {
    marginTop: 12,
  },
  activeBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: pura27.border,
    gap: 16,
  },
  expanded: {
    color: pura27.ink,
  },
  cta: {
    alignSelf: 'stretch',
  },
  secondaryComplete: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryCompleteText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    color: pura27.accentText,
    letterSpacing: -0.1,
  },
});

// ---------------------------------------------------------------------------
// Completion panel
// ---------------------------------------------------------------------------

function CompletionPanel({
  progress,
  onDoneForTonight,
  onAskPura,
}: {
  progress: PuraSession['progress'];
  onDoneForTonight: () => void;
  onAskPura: () => void;
}) {
  return (
    <Animated.View
      entering={Platform.OS === 'web' ? undefined : FadeIn.duration(280)}
      style={completionStyles.wrap}
    >
      <View style={completionStyles.iconWrap}>
        <CheckCircle
          size={56}
          color={pura27.success}
          weight="duotone"
        />
      </View>
      <DisplayHero style={completionStyles.headline}>
        Tonight is complete.
      </DisplayHero>
      <BodyLarge style={completionStyles.body}>
        You kept treatment focused and gave irritated areas time to
        recover.
      </BodyLarge>

      <Card style={completionStyles.progressCard}>
        <SectionLabel>NIGHT TRACKED</SectionLabel>
        <FunctionalTitle style={completionStyles.progressTitle}>
          Day {progress.currentDay} complete
        </FunctionalTitle>
        <Text
          maxFontSizeMultiplier={1.2}
          style={completionStyles.progressMeta}
        >
          {`${progress.currentDay} of ${progress.totalDays} nights tracked`}
        </Text>
        <ProgressMeter
          value={progress.currentDay}
          max={progress.totalDays}
          accessibilityLabel={`${progress.currentDay} of ${progress.totalDays} nights tracked`}
          style={completionStyles.progressMeter}
        />
      </Card>

      <PrimaryButton
        label="Done for tonight"
        onPress={onDoneForTonight}
        accessibilityLabel="Return to Home"
        style={completionStyles.cta}
      />
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={onAskPura}
        style={({ pressed }) => [
          completionStyles.askLink,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text
          maxFontSizeMultiplier={1.2}
          style={completionStyles.askLinkText}
        >
          Ask Pura a question
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const completionStyles = StyleSheet.create({
  wrap: {
    paddingTop: 36,
    alignItems: 'center',
    gap: 16,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: pura27.successBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  headline: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    maxWidth: 320,
  },
  progressCard: {
    width: '100%',
    marginTop: 18,
    padding: 22,
  },
  progressTitle: {
    marginTop: 8,
    fontSize: 20,
    lineHeight: 24,
  },
  progressMeta: {
    marginTop: 6,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: pura27.inkSecondary,
  },
  progressMeter: {
    marginTop: 14,
  },
  cta: {
    marginTop: 24,
  },
  askLink: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  askLinkText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: pura27.accentText,
    letterSpacing: -0.1,
  },
});

// ===========================================================================
// Progress tab
// ===========================================================================

function ProgressTab({
  session,
  onReviewRoutine,
}: {
  session: PuraSession;
  onReviewRoutine: () => void;
}) {
  const progress = session.progress;
  const trendVariant =
    progress.trend === 'improving'
      ? 'success'
      : progress.trend === 'watch'
      ? 'warning'
      : 'info';
  return (
    <View style={progressStyles.wrap}>
      <Card variant="warm" style={progressStyles.headerCard}>
        <SectionLabel>84-DAY PROGRAM</SectionLabel>
        <View style={progressStyles.dayRow}>
          <DisplayCard>
            Day {progress.currentDay} of {progress.totalDays}
          </DisplayCard>
          <StatusPill label={progress.trendLabel} variant={trendVariant} />
        </View>
        <Text
          maxFontSizeMultiplier={1.2}
          style={progressStyles.headerMeta}
        >
          {`${progress.scansComplete} nights tracked`}
        </Text>
        <ProgressMeter
          value={progress.currentDay}
          max={progress.totalDays}
          accessibilityLabel={`${progress.currentDay} of ${progress.totalDays} days complete`}
          style={progressStyles.meter}
        />
      </Card>

      <Card style={progressStyles.card}>
        <SectionLabel>VISIBLE TREND</SectionLabel>
        <FunctionalTitle style={progressStyles.cardTitle}>
          {progress.trendHeadline}
        </FunctionalTitle>
        <View style={progressStyles.trendRow}>
          <StatusPill label={progress.trendLabel} variant={trendVariant} />
        </View>
        <Body style={progressStyles.cardBody}>{progress.trendBody}</Body>
      </Card>

      <Card style={progressStyles.card}>
        <SectionLabel>WHAT CHANGED</SectionLabel>
        <FunctionalTitle style={progressStyles.cardTitle}>
          {progress.lastAdaptationTitle}
        </FunctionalTitle>
        <Body style={progressStyles.cardBody}>
          {progress.lastAdaptationBody}
        </Body>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onReviewRoutine}
          style={({ pressed }) => [
            progressStyles.cardLink,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text
            maxFontSizeMultiplier={1.2}
            style={progressStyles.cardLinkText}
          >
            Review tonight’s routine
          </Text>
        </Pressable>
      </Card>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  wrap: {
    marginTop: 22,
    gap: 16,
    paddingBottom: 24,
  },
  headerCard: {
    padding: 22,
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  headerMeta: {
    marginTop: 6,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: pura27.inkSecondary,
  },
  meter: {
    marginTop: 16,
  },
  card: {
    padding: 22,
  },
  cardTitle: {
    marginTop: 8,
  },
  trendRow: {
    marginTop: 12,
  },
  cardBody: {
    marginTop: 12,
  },
  cardLink: {
    marginTop: 18,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  cardLinkText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    color: pura27.accentText,
    letterSpacing: -0.1,
  },
});

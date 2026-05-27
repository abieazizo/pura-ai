/**
 * v26 — Routine screen.
 *
 * The product's central nightly experience.
 *
 * Today layers:
 *   • landing — calm hero, scan→decision preview, owned product preview
 *   • focused — single-step ritual; the global FloatingTabBar collapses
 *   • completion — "You did enough tonight." + TomorrowSPF + Done exit
 *
 * Progress layers:
 *   • baseline-building (default) — BaselineProgressCard, SkinFocusMap,
 *     PlanInsightCard, NextScanCard with reminder
 *   • established (when reliable scan threshold met) — existing v26
 *     established hero + score breakdown
 *
 * State flows in via `useRoutineViewModel`. Persistence flows through
 * `setRoutineSessionV26` so a user who completes the routine and
 * re-launches sees the completion view, not the landing.
 *
 * During focused mode, `useRoutineFocus.setFocused(true)` collapses
 * the FloatingTabBar so the ritual fills the whole device.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';

import {
  BaselineProgressCard,
  CleanseStepCard,
  EstablishedProgressHero,
  FocusedRoutineHeader,
  LessIsBetterStepCard,
  MoisturizeStepCard,
  NextScanCard,
  OwnedProductPreview,
  PlanInsightCard,
  PrimaryAction,
  QuietTextButton,
  RoutineCompletionView,
  ScanDecisionPreview,
  ScoreBreakdown,
  SegmentedTabs,
  SkinFocusMapCard,
  Surface,
  V26,
  V26_SPACE,
  V26_TYPE,
  WhyTonightSheet,
  type RoutineTabKey,
} from '@/components/routine/v26';
import { useRoutineViewModel, todayDateKey } from '@/state/v26/routineViewModel';
import { useRoutineSessionStore } from '@/state/v26/routineSessionStore';
import { useLatestResult } from '@/store/useAppStore';
import { useRoutineFocus } from '@/state/v26/routineFocus';
import { hapt } from '@/utils/haptics';
import type { RootStackParamList } from '@/navigation/types';
import type { RoutineSession } from '@/state/v26/routineSession';
import {
  Body,
  Eyebrow,
  HeroHeadline,
  Meta,
} from '@/components/routine/v26/primitives';

interface RoutineV26ScreenProps {
  initialTab?: RoutineTabKey;
}

export function RoutineV26Screen({ initialTab }: RoutineV26ScreenProps = {}) {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const setFocused = useRoutineFocus((s) => s.setFocused);
  const persistRoutineSession = useRoutineSessionStore((s) => s.setSession);
  const clearStale = useRoutineSessionStore((s) => s.clearIfStale);
  const persistedSession = useRoutineSessionStore(
    useShallow((s) => s.session),
  );
  const latestResult = useLatestResult();
  const scanImageUri = latestResult?.photoUri;

  const [tab, setTab] = useState<RoutineTabKey>(initialTab ?? 'today');
  const [whyOpen, setWhyOpen] = useState(false);

  const vm = useRoutineViewModel();

  // Local session state — initial from vm, but tracks the user's live
  // step-by-step input. We persist on each meaningful change.
  const [sessionState, setSessionState] = useState<RoutineSession>(vm.session);
  const [skippedStepIds, setSkippedStepIds] = useState<string[]>([]);

  // Day rollover — drop yesterday's persisted snapshot.
  useEffect(() => {
    clearStale(todayDateKey());
  }, [clearStale]);

  // Hydrate local skipped list from persistence on mount.
  useEffect(() => {
    if (persistedSession?.skippedStepIds) {
      setSkippedStepIds(persistedSession.skippedStepIds);
    }
  }, [persistedSession?.skippedStepIds]);

  // Sync the local session to view-model changes (dev fixture swaps,
  // hydration, etc.). Persistence is the source of truth — if the user
  // returned mid-routine, vm.session already reflects that.
  useEffect(() => {
    setSessionState(vm.session);
  }, [vm.session]);

  // Drive the focused-mode flag from the session status. When the user
  // is mid-ritual the global tab bar disappears.
  useEffect(() => {
    const focused = sessionState.status === 'active';
    setFocused(focused);
    return () => setFocused(false);
  }, [sessionState.status, setFocused]);

  const writeSession = useCallback(
    (next: RoutineSession, nextSkipped?: string[]) => {
      setSessionState(next);
      if (nextSkipped) setSkippedStepIds(nextSkipped);
      persistRoutineSession({
        date: next.date,
        status: next.status,
        currentStepIndex: next.currentStepIndex,
        completedStepIds: next.completedStepIds,
        skippedStepIds: nextSkipped ?? skippedStepIds,
        completedAt:
          next.status === 'complete' ? new Date().toISOString() : null,
      });
    },
    [persistRoutineSession, skippedStepIds],
  );

  // ---------------------------------------------------------------------
  // Today actions
  // ---------------------------------------------------------------------

  const handleStart = useCallback(() => {
    hapt.tap();
    writeSession(
      {
        ...sessionState,
        status: 'active',
        currentStepIndex: 0,
        completedStepIds: [],
      },
      [],
    );
  }, [sessionState, writeSession]);

  const advanceFrom = useCallback(
    (stepId: string, skipped: boolean) => {
      const nextCompleted = Array.from(
        new Set([...sessionState.completedStepIds, stepId]),
      );
      const nextStepIndex = sessionState.steps.findIndex(
        (step) => !nextCompleted.includes(step.id),
      );
      const reachedEnd = nextStepIndex === -1;

      const nextSkipped = skipped
        ? Array.from(new Set([...skippedStepIds, stepId]))
        : skippedStepIds;

      writeSession(
        {
          ...sessionState,
          status: reachedEnd ? 'complete' : 'active',
          currentStepIndex: reachedEnd
            ? sessionState.steps.length
            : nextStepIndex,
          completedStepIds: nextCompleted,
        },
        nextSkipped,
      );
    },
    [sessionState, skippedStepIds, writeSession],
  );

  const handleComplete = useCallback(
    (stepId: string) => {
      hapt.stepComplete();
      advanceFrom(stepId, false);
    },
    [advanceFrom],
  );

  const handleSkip = useCallback(
    (stepId: string) => {
      hapt.tap();
      advanceFrom(stepId, true);
    },
    [advanceFrom],
  );

  const handleExitFocused = useCallback(() => {
    hapt.tap();
    // Persist partial progress; flip back to landing without losing it.
    writeSession({
      ...sessionState,
      status: 'notStarted',
    });
  }, [sessionState, writeSession]);

  const handleDoneForTonight = useCallback(() => {
    hapt.tap();
    setFocused(false);
    // Stay on the Routine tab in the completed state until day rollover.
  }, [setFocused]);

  const goToProducts = useCallback(() => {
    hapt.select();
    // @ts-expect-error nested tab nav
    nav.navigate?.('Tabs', { screen: 'ProductsTab' });
  }, [nav]);

  const goToScanModal = useCallback(() => {
    hapt.tap();
    nav.navigate('ScanModal');
  }, [nav]);

  const subtitle = useMemo(
    () =>
      tab === 'today'
        ? 'Tonight · Updated from today’s scan'
        : 'Progress built from consistent scans',
    [tab],
  );

  const bottomPad = useMemo(
    () => insets.bottom + V26_SPACE.tabBarReserve,
    [insets.bottom],
  );

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  // FOCUSED MODE — full-bleed single step
  if (sessionState.status === 'active') {
    return (
      <FocusedMode
        session={sessionState}
        skippedStepIds={skippedStepIds}
        scanImageUri={scanImageUri}
        onClose={handleExitFocused}
        onComplete={handleComplete}
        onSkip={handleSkip}
        onChangeProduct={goToProducts}
        onAddOwned={goToProducts}
        bottomPad={Math.max(insets.bottom, 24)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.headerWrap}>
        <Text style={styles.title} maxFontSizeMultiplier={1.2}>
          Routine
        </Text>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.25}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.tabsWrap}>
        <SegmentedTabs active={tab} onChange={setTab} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {tab === 'today' ? (
          sessionState.status === 'complete' ? (
            <RoutineCompletionView
              summary={buildCompletionSummary(sessionState, skippedStepIds)}
              elapsedMinutes={sessionState.estimatedMinutes}
              onAddSpf={goToProducts}
              onFindSpf={goToProducts}
              onDone={handleDoneForTonight}
            />
          ) : (
            <TodayLanding
              session={sessionState}
              scanImageUri={scanImageUri}
              onStart={handleStart}
              onWhyChanged={() => setWhyOpen(true)}
            />
          )
        ) : (
          <ProgressBody
            vm={vm}
            routineCompletedTonight={sessionState.status === 'complete'}
            onScanTips={() => hapt.tap()}
            onReviewRoutine={() => setTab('today')}
            scanImageUri={scanImageUri}
          />
        )}
      </ScrollView>

      <WhyTonightSheet visible={whyOpen} onClose={() => setWhyOpen(false)} />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Today landing
// ---------------------------------------------------------------------------

interface TodayLandingProps {
  session: RoutineSession;
  scanImageUri?: string;
  onStart: () => void;
  onWhyChanged: () => void;
}

function TodayLanding({
  session,
  scanImageUri,
  onStart,
  onWhyChanged,
}: TodayLandingProps) {
  const moisturizer = session.steps.find((s) => s.type === 'moisturize')?.product;
  return (
    <View style={landing.wrap}>
      <Surface tone="surface" hero elevated style={landing.hero}>
        <Eyebrow>TONIGHT</Eyebrow>
        <HeroHeadline style={landing.headline}>
          Keep your chin calm tonight.
        </HeroHeadline>
        <Body style={landing.body}>
          Mild activity detected around your chin.
        </Body>

        <View style={landing.preview}>
          <ScanDecisionPreview
            scanImageUri={scanImageUri}
            decisionLabel="PLAN ADJUSTED"
            decision="Skip strong treatment tonight"
          />
        </View>

        <View style={landing.metaRow}>
          <Meta style={landing.metaItem}>{session.steps.length} steps</Meta>
          <View style={landing.metaDot} />
          <Meta style={landing.metaItem}>{session.estimatedMinutes} min</Meta>
        </View>

        <PrimaryAction
          label="Start tonight’s routine"
          variant="ink"
          onPress={onStart}
          style={landing.cta}
          accessibilityLabel={`Start tonight's routine, ${session.steps.length} steps, about ${session.estimatedMinutes} minutes`}
        />
        <QuietTextButton
          label="See why this changed"
          tone="clay"
          onPress={onWhyChanged}
          style={landing.why}
        />
      </Surface>

      {moisturizer ? (
        <OwnedProductPreview
          eyebrow="USING TONIGHT"
          brand="CeraVe"
          name={moisturizer.name}
          status="Good for tonight’s gentle plan"
        />
      ) : null}
    </View>
  );
}

const landing = StyleSheet.create({
  wrap: {
    paddingHorizontal: V26_SPACE.gutter,
    paddingTop: 14,
    gap: V26_SPACE.cardGap,
  },
  hero: {
    gap: 0,
  },
  headline: {
    marginTop: 14,
    fontSize: 30,
    lineHeight: 36,
  },
  body: {
    marginTop: 12,
  },
  preview: {
    marginTop: 20,
  },
  metaRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaItem: {
    color: V26.inkMuted,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: V26.inkFaint,
  },
  cta: {
    marginTop: V26_SPACE.section,
  },
  why: {
    marginTop: 10,
    alignSelf: 'center',
  },
});

// ---------------------------------------------------------------------------
// Focused mode
// ---------------------------------------------------------------------------

interface FocusedModeProps {
  session: RoutineSession;
  skippedStepIds: string[];
  scanImageUri?: string;
  onClose: () => void;
  onComplete: (stepId: string) => void;
  onSkip: (stepId: string) => void;
  onChangeProduct: () => void;
  onAddOwned: () => void;
  bottomPad: number;
}

function FocusedMode({
  session,
  skippedStepIds,
  scanImageUri,
  onClose,
  onComplete,
  onSkip,
  onChangeProduct,
  onAddOwned,
  bottomPad,
}: FocusedModeProps) {
  void skippedStepIds;
  void scanImageUri;
  const activeStep = session.steps[session.currentStepIndex];
  const total = session.steps.length;
  const stepNumber = session.currentStepIndex + 1;
  const progressLabel = activeStep?.isSignatureStep
    ? 'Final step'
    : `${stepNumber} of ${total}`;

  return (
    <SafeAreaView style={focused.root} edges={['top']}>
      <StatusBar style="dark" />
      <FocusedRoutineHeader
        progressLabel={progressLabel}
        contextLabel="Tonight"
        onClose={onClose}
      />
      <ScrollView
        contentContainerStyle={[focused.body, { paddingBottom: bottomPad + 36 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeStep ? (
          activeStep.type === 'cleanse' ? (
            <CleanseStepCard
              ownedProduct={activeStep.product}
              ownedProductBrand={activeStep.product?.id?.startsWith('cerave') ? 'CeraVe' : undefined}
              onMarkComplete={() => onComplete(activeStep.id)}
              onSkip={() => onSkip(activeStep.id)}
              onChangeProduct={activeStep.product ? onChangeProduct : undefined}
              onAddOwned={!activeStep.product ? onAddOwned : undefined}
            />
          ) : activeStep.type === 'moisturize' && activeStep.product ? (
            <MoisturizeStepCard
              product={activeStep.product}
              productBrand="CeraVe"
              onMarkComplete={() => onComplete(activeStep.id)}
              onSkip={() => onSkip(activeStep.id)}
              onChangeProduct={onChangeProduct}
            />
          ) : activeStep.isSignatureStep ? (
            <LessIsBetterStepCard
              onFinish={() => onComplete(activeStep.id)}
            />
          ) : null
        ) : null}

        <CompletedStepStrip
          steps={session.steps}
          completedIds={session.completedStepIds}
          currentIndex={session.currentStepIndex}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const focused = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: V26.paper,
  },
  body: {
    paddingHorizontal: V26_SPACE.gutter,
    paddingTop: 8,
    gap: V26_SPACE.cardGap,
  },
});

function CompletedStepStrip({
  steps,
  completedIds,
  currentIndex,
}: {
  steps: RoutineSession['steps'];
  completedIds: string[];
  currentIndex: number;
}) {
  const completedSteps = completedIds
    .map((id) => steps.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s);
  if (completedSteps.length === 0) return null;
  return (
    <View style={strip.wrap}>
      <Eyebrow style={{ color: V26.inkMuted }}>COMPLETED</Eyebrow>
      <View style={strip.rows}>
        {completedSteps.map((step) => (
          <View key={step.id} style={strip.row}>
            <View style={strip.dot} />
            <Text style={strip.label} maxFontSizeMultiplier={1.15}>
              {step.title}
            </Text>
            {step.product ? (
              <Text style={strip.detail} maxFontSizeMultiplier={1.15}>
                {step.product.name}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      {currentIndex >= steps.length ? null : null}
    </View>
  );
}

const strip = StyleSheet.create({
  wrap: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: V26.surface,
    borderWidth: 1,
    borderColor: V26.border,
  },
  rows: {
    marginTop: 8,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: V26.terracotta,
  },
  label: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 14,
    color: V26.ink,
    flex: 1,
  },
  detail: {
    fontFamily: V26_TYPE.sans,
    fontSize: 12,
    color: V26.inkMuted,
  },
});

// ---------------------------------------------------------------------------
// Completion summary builder
// ---------------------------------------------------------------------------

function buildCompletionSummary(
  session: RoutineSession,
  skippedStepIds: string[],
) {
  return session.steps.map((step) => {
    const wasSkipped = skippedStepIds.includes(step.id);
    if (step.isSignatureStep) {
      return {
        label: wasSkipped ? 'Skipped treatment decision' : 'Skipped strong treatment',
        completed: !wasSkipped,
      };
    }
    return {
      label: wasSkipped ? `${step.title} skipped` : step.title,
      completed: !wasSkipped,
      detail: !wasSkipped ? step.product?.name : undefined,
    };
  });
}

// ---------------------------------------------------------------------------
// Progress body
// ---------------------------------------------------------------------------

interface ProgressBodyProps {
  vm: ReturnType<typeof useRoutineViewModel>;
  routineCompletedTonight: boolean;
  scanImageUri?: string;
  onScanTips: () => void;
  onReviewRoutine: () => void;
}

function ProgressBody({
  vm,
  routineCompletedTonight,
  scanImageUri,
  onScanTips,
  onReviewRoutine,
}: ProgressBodyProps) {
  const established = vm.reliability.baselineEstablished && vm.trend.established;
  return (
    <View style={progress.body}>
      {established ? (
        <EstablishedProgressHero trend={vm.trend} evidence={vm.evidence} />
      ) : (
        <BaselineProgressCard reliability={vm.reliability} />
      )}

      <SkinFocusMapCard
        scanImageUri={scanImageUri}
        comparisonAvailable={vm.evidence.comparisonAvailable}
        body={vm.evidence.observation}
      />

      <PlanInsightCard />

      {established && vm.trend.scoreBreakdown ? (
        <ScoreBreakdown rows={vm.trend.scoreBreakdown} />
      ) : null}

      <NextScanCard
        reliability={vm.reliability}
        onScanTips={onScanTips}
      />

      {!routineCompletedTonight ? (
        <QuietTextButton
          label="Review tonight’s routine"
          tone="muted"
          onPress={onReviewRoutine}
          style={progress.reviewLink}
        />
      ) : null}
    </View>
  );
}

const progress = StyleSheet.create({
  body: {
    paddingHorizontal: V26_SPACE.gutter,
    paddingTop: 14,
    gap: V26_SPACE.cardGap,
  },
  reviewLink: {
    alignSelf: 'center',
    marginTop: 4,
  },
});

// ---------------------------------------------------------------------------
// Top-level styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: V26.paper,
  },
  headerWrap: {
    paddingHorizontal: V26_SPACE.gutter,
    paddingTop: V26_SPACE.topAfterHeader,
    paddingBottom: 18,
  },
  title: {
    fontFamily: V26_TYPE.serif,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.4,
    color: V26.ink,
  },
  subtitle: {
    fontFamily: V26_TYPE.sansMed,
    fontSize: 14,
    lineHeight: 19,
    color: V26.inkMuted,
    marginTop: 4,
  },
  tabsWrap: {
    paddingHorizontal: V26_SPACE.gutter,
    paddingBottom: 8,
  },
});

// quiet unused exports — kept available for future product/scan suppress states
void Pressable;

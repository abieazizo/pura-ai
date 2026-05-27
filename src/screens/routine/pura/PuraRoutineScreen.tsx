/**
 * PuraRoutineScreen — Routine + Progress orchestrator.
 *
 * Owns the entire Routine lifecycle:
 *   no_scan → scan_available → building → ready_to_review
 *           → confirming_products → active
 *           ↳ session_in_progress → session_complete
 *
 * Plus the nested Progress view, reached through the compact header
 * action — not as a tab.
 *
 * Wiring rule: this screen only reads from the routine store and
 * narrow `useAppStore` selectors; it never recomputes derived state
 * inline. Side effects (build kick-off, store updates) go through
 * the services in `services/routine/*`.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import { Bell, Sparkle, SlidersHorizontal } from 'phosphor-react-native';
import {
  puraRoutineColors,
  puraRoutineColors as C,
  puraRoutineSpace as SP,
  puraRoutineType as T,
} from '@/theme';
import {
  useRoutineStore,
  canStartTimeOfDay,
  defaultTimeOfDayForNow,
  todayDateKey,
  resolveStepAvailability,
} from '@/state/routine/routineStore';
import { useAppStore, useLatestScan, useLatestResult } from '@/store/useAppStore';
import { useRoutineFocus } from '@/state/v26/routineFocus';
import {
  startRoutineBuild,
  reduceToOwnedOnly,
} from '@/services/routine/routineBuilderService';
import {
  canGenerateRoutineFromScan,
  selectVisibleFindings,
  translateScanToAnalysis,
} from '@/services/scanResults/translateAnalysis';
import { getProgressComparison } from '@/services/routine/progressComparisonService';
import {
  RoutineEmptyState,
  ScanAvailableState,
  RoutineBuildingView,
  RoutineReadyView,
  RoutineReviewView,
  DailyRoutineView,
  RoutineSessionView,
  RoutineCompletionView,
  ProgressView,
  EditorialHeading,
  Body,
  QuietTextButton,
} from '@/components/routine/pura';
import type { RootStackParamList } from '@/navigation/types';
import type { RoutineStep, RoutineTimeOfDay } from '@/types/routine';
import { hapt } from '@/utils/haptics';

type Nav = NavigationProp<RootStackParamList>;

type ScreenMode = 'main' | 'progress';

export function PuraRoutineScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const setFocused = useRoutineFocus((s) => s.setFocused);

  const [screenMode, setScreenMode] = useState<ScreenMode>('main');

  const {
    lifecycle,
    routine,
    buildProgress,
    buildFailureReason,
    confirmedOwnedProductIds,
    skippedStepIds,
    selectedTimeOfDay,
    todaySession,
  } = useRoutineStore(
    useShallow((s) => ({
      lifecycle: s.lifecycle,
      routine: s.routine,
      buildProgress: s.buildProgress,
      buildFailureReason: s.buildFailureReason,
      confirmedOwnedProductIds: s.confirmedOwnedProductIds,
      skippedStepIds: s.skippedStepIds,
      selectedTimeOfDay: s.selectedTimeOfDay,
      todaySession: s.todaySession,
    })),
  );

  const latestScan = useLatestScan();
  const latestResult = useLatestResult();
  const setLifecycle = useRoutineStore((s) => s.setLifecycle);
  const setSelectedTimeOfDay = useRoutineStore((s) => s.setSelectedTimeOfDay);
  const confirmOwned = useRoutineStore((s) => s.confirmOwned);
  const skipStep = useRoutineStore((s) => s.skipStep);
  const beginSession = useRoutineStore((s) => s.beginSession);
  const completeSessionStep = useRoutineStore((s) => s.completeSessionStep);
  const skipSessionStep = useRoutineStore((s) => s.skipSessionStep);
  const endSession = useRoutineStore((s) => s.endSession);
  const setRoutine = useRoutineStore((s) => s.setRoutine);

  // Derive the correct lifecycle when no routine exists yet.
  useEffect(() => {
    if (!routine) {
      // No routine — we are either no_scan or scan_available, unless a
      // build is in flight or just failed.
      if (lifecycle === 'building' || lifecycle === 'build_failed') return;
      if (!latestScan || !latestResult) {
        if (lifecycle !== 'no_scan') setLifecycle('no_scan');
      } else if (lifecycle !== 'scan_available') {
        setLifecycle('scan_available');
      }
    } else if (
      lifecycle === 'no_scan' ||
      lifecycle === 'scan_available'
    ) {
      // Routine exists but lifecycle is stale — promote to confirming or active.
      const stillNeedsConfirm = needsAnyConfirmation();
      setLifecycle(stillNeedsConfirm ? 'confirming_products' : 'active');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routine, latestScan, latestResult, lifecycle]);

  function needsAnyConfirmation(): boolean {
    if (!routine) return false;
    return (
      routine.morningSteps.some(
        (s) =>
          resolveStepAvailability(s, confirmedOwnedProductIds, skippedStepIds) !==
          'owned' &&
          !s.optional,
      ) ||
      routine.eveningSteps.some(
        (s) =>
          resolveStepAvailability(s, confirmedOwnedProductIds, skippedStepIds) !==
          'owned' &&
          !s.optional,
      )
    );
  }

  // Drive focused-mode flag — hides the floating dock during a session.
  useEffect(() => {
    const focused = lifecycle === 'session_in_progress';
    setFocused(focused);
    return () => setFocused(false);
  }, [lifecycle, setFocused]);

  // ----- Navigation helpers -----
  const goScan = useCallback(() => {
    hapt.tap();
    nav.navigate('ScanModal');
  }, [nav]);

  const goShop = useCallback(() => {
    hapt.tap();
    // @ts-expect-error nested tab nav
    nav.navigate?.('Tabs', { screen: 'ProductsTab' });
  }, [nav]);

  const goViewScanResults = useCallback(() => {
    hapt.tap();
    if (latestScan?.id) {
      nav.navigate('ScanModal');
    }
  }, [nav, latestScan]);

  // ----- Build kick-off -----
  const handleBuild = useCallback(async () => {
    if (!latestScan) {
      setLifecycle('no_scan');
      return;
    }
    const analysis = translateScanToAnalysis(latestScan);
    if (analysis.scanQuality.usability === 'retake_required') {
      useRoutineStore.getState().failBuild(
        'Your scan needs to be retaken before we can build a routine.',
      );
      return;
    }
    const supported = selectVisibleFindings(analysis);
    if (!canGenerateRoutineFromScan(analysis, supported)) {
      useRoutineStore.getState().failBuild(
        supported.length === 0
          ? 'No supported findings — a clearer scan is needed before creating a routine.'
          : analysis.routineEligibility.reason ??
              'Scan results do not support a routine yet.',
      );
      return;
    }
    hapt.tap();
    await startRoutineBuild({
      scanId: latestScan.id,
      scan: latestScan,
      analysis,
    });
  }, [latestScan, setLifecycle]);

  const handleRetryBuild = useCallback(() => {
    void handleBuild();
  }, [handleBuild]);

  // Auto-kick a build when arriving in lifecycle 'building' without a
  // build in flight (e.g. arriving from Scan Results CTA).
  useEffect(() => {
    if (lifecycle === 'building' && !buildProgress) {
      void handleBuild();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifecycle]);

  // ----- Confirmation actions -----
  const handleConfirmOwn = useCallback(
    (productId: string) => {
      hapt.tap();
      confirmOwned(productId);
    },
    [confirmOwned],
  );

  const handleSkipStep = useCallback(
    (stepId: string) => {
      hapt.tap();
      skipStep(stepId);
    },
    [skipStep],
  );

  const handleFindMatch = useCallback(
    (_step: RoutineStep) => {
      hapt.tap();
      goShop();
    },
    [goShop],
  );

  const handleChangeTimeOfDay = useCallback(
    (next: RoutineTimeOfDay) => {
      hapt.select();
      setSelectedTimeOfDay(next);
    },
    [setSelectedTimeOfDay],
  );

  const handleUseRoutine = useCallback(() => {
    hapt.tap();
    setLifecycle('active');
  }, [setLifecycle]);

  const handleUseOwnedOnly = useCallback(() => {
    if (!routine) return;
    const reduced = reduceToOwnedOnly(routine);
    if (
      reduced.morningSteps.length === 0 &&
      reduced.eveningSteps.length === 0
    ) {
      // Nothing usable — bounce to Shop.
      goShop();
      return;
    }
    hapt.tap();
    setRoutine(reduced);
    setLifecycle('active');
  }, [routine, setRoutine, setLifecycle, goShop]);

  // ----- Session control -----
  const handleStartSession = useCallback(() => {
    if (!routine) return;
    hapt.tap();
    const tod = selectedTimeOfDay;
    beginSession(tod, todayDateKey());
  }, [routine, selectedTimeOfDay, beginSession]);

  const handleSessionComplete = useCallback(
    (stepId: string) => {
      hapt.stepComplete();
      completeSessionStep(stepId);
    },
    [completeSessionStep],
  );

  const handleSessionSkip = useCallback(
    (stepId: string) => {
      hapt.tap();
      skipSessionStep(stepId);
    },
    [skipSessionStep],
  );

  const handleSessionFinish = useCallback(() => {
    hapt.stepComplete();
    endSession('complete');
  }, [endSession]);

  const handleCloseSession = useCallback(() => {
    hapt.tap();
    endSession('abandoned');
  }, [endSession]);

  const handleChangeProduct = useCallback(
    (_step: RoutineStep) => {
      goShop();
    },
    [goShop],
  );

  const handleViewProgress = useCallback(() => {
    hapt.tap();
    setScreenMode('progress');
  }, []);

  const handleDone = useCallback(() => {
    hapt.tap();
    setLifecycle('active');
  }, [setLifecycle]);

  const handleReturnToRoutine = useCallback(() => {
    hapt.tap();
    setScreenMode('main');
  }, []);

  // ----- Derived UI -----
  const canStart = useMemo(
    () =>
      canStartTimeOfDay({
        routine,
        confirmedOwnedIds: confirmedOwnedProductIds,
        skippedStepIds,
        timeOfDay: selectedTimeOfDay,
      }),
    [routine, confirmedOwnedProductIds, skippedStepIds, selectedTimeOfDay],
  );

  const headerTitle = lifecycle === 'building' ? 'Routine'
    : lifecycle === 'ready_to_review' ? 'Routine'
    : lifecycle === 'confirming_products' ? 'Your Custom Routine'
    : screenMode === 'progress' ? 'Progress'
    : lifecycle === 'session_complete' || lifecycle === 'active' ? null
    : 'Routine';

  const headerSubtitle =
    lifecycle === 'building'
      ? 'Pura is building your personalized routine.'
      : lifecycle === 'scan_available'
      ? 'Your latest scan is ready'
      : lifecycle === 'no_scan'
      ? 'Built from your skin scan'
      : lifecycle === 'confirming_products'
      ? 'Built from your focus areas.'
      : screenMode === 'progress'
      ? 'Compared from consistent scans'
      : null;

  const showBuildingHeader = lifecycle === 'building' || lifecycle === 'build_failed';

  // Focused full-screen session
  if (lifecycle === 'session_in_progress' && routine && todaySession) {
    const steps =
      todaySession.timeOfDay === 'morning'
        ? routine.morningSteps
        : routine.eveningSteps;
    const usable = steps.filter((s) => {
      const av = resolveStepAvailability(s, confirmedOwnedProductIds, skippedStepIds);
      return av === 'owned' || av === 'not_required';
    });
    return (
      <RoutineSessionView
        steps={usable}
        session={todaySession}
        onClose={handleCloseSession}
        onComplete={handleSessionComplete}
        onSkip={handleSessionSkip}
        onChangeProduct={handleChangeProduct}
        onFinish={handleSessionFinish}
      />
    );
  }

  // Default device-based time-of-day on first hydration after routine becomes active.
  useEffect(() => {
    if (
      lifecycle === 'active' &&
      todaySession === null &&
      selectedTimeOfDay === 'evening' &&
      defaultTimeOfDayForNow() === 'morning'
    ) {
      // Only adjust once on first render — user can flip manually.
      setSelectedTimeOfDay('morning');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifecycle]);

  const bottomPad = insets.bottom + SP.dockClearance;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      {showBuildingHeader ? (
        <View style={styles.headerWrap}>
          <View style={styles.headerTitleRow}>
            <EditorialHeading size="page">{headerTitle}</EditorialHeading>
            <Sparkle size={20} color={puraRoutineColors.coralDeep} weight="fill" style={{ marginLeft: 8 }} />
            <View style={{ flex: 1 }} />
            <View style={styles.headerIconBtnWrap}>
              <View style={styles.headerIconBtn}>
                <Bell size={18} color={puraRoutineColors.ink} weight="regular" />
                <View style={styles.headerIconBtnDot} />
              </View>
              <View style={styles.headerIconBtn}>
                <SlidersHorizontal size={18} color={puraRoutineColors.ink} weight="regular" />
              </View>
            </View>
          </View>
          {headerSubtitle ? (
            <Text style={styles.headerSubtitle}>
              Pura is building your{' '}
              <Text style={{ color: puraRoutineColors.coralDeep, fontFamily: 'Inter-SemiBold' }}>
                personalized
              </Text>{' '}
              routine.
            </Text>
          ) : null}
        </View>
      ) : headerTitle ? (
        <View style={styles.headerWrap}>
          <EditorialHeading size="page">{headerTitle}</EditorialHeading>
          {headerSubtitle ? (
            <Body style={{ marginTop: 4 }}>{headerSubtitle}</Body>
          ) : null}
          {screenMode === 'progress' ? (
            <View style={styles.headerActionRow}>
              <QuietTextButton
                label="Routine"
                tone="coral"
                onPress={handleReturnToRoutine}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {screenMode === 'progress' ? (
          <ProgressView
            comparison={getProgressComparison()}
            onReturnToRoutine={handleReturnToRoutine}
            onScheduleNextScan={goScan}
          />
        ) : lifecycle === 'no_scan' ? (
          <RoutineEmptyState
            onStartScan={goScan}
            onBrowseProducts={goShop}
          />
        ) : lifecycle === 'scan_available' ? (
          <ScanAvailableState
            focusAreaCount={countFocusAreas(latestScan)}
            onBuild={handleBuild}
            onViewResults={goViewScanResults}
          />
        ) : lifecycle === 'building' || lifecycle === 'build_failed' ? (
          <RoutineBuildingView
            progress={buildProgress}
            draft={routine}
            failureReason={lifecycle === 'build_failed' ? buildFailureReason : null}
            onRetry={handleRetryBuild}
            onRetakeScan={goScan}
            onReturnToScan={goViewScanResults}
          />
        ) : lifecycle === 'ready_to_review' && routine ? (
          <RoutineReadyView
            onReview={() => setLifecycle('confirming_products')}
            onLater={goViewScanResults}
          />
        ) : lifecycle === 'confirming_products' && routine ? (
          <RoutineReviewView
            routine={routine}
            confirmedOwnedIds={confirmedOwnedProductIds}
            skippedStepIds={skippedStepIds}
            selectedTimeOfDay={selectedTimeOfDay}
            onChangeTimeOfDay={handleChangeTimeOfDay}
            onConfirmOwn={handleConfirmOwn}
            onSkip={handleSkipStep}
            onFindMatch={handleFindMatch}
            onUseRoutine={handleUseRoutine}
            onUseOwnedOnly={handleUseOwnedOnly}
          />
        ) : lifecycle === 'session_complete' && routine && todaySession ? (
          <RoutineCompletionView
            routine={routine}
            session={todaySession}
            onViewProgress={handleViewProgress}
            onDone={handleDone}
          />
        ) : lifecycle === 'active' && routine ? (
          <DailyRoutineView
            routine={routine}
            confirmedOwnedIds={confirmedOwnedProductIds}
            skippedStepIds={skippedStepIds}
            selectedTimeOfDay={selectedTimeOfDay}
            onChangeTimeOfDay={handleChangeTimeOfDay}
            todaySession={todaySession}
            canStart={canStart}
            onStart={handleStartSession}
            onContinue={handleStartSession}
            onOpenProgress={handleViewProgress}
            onStepPress={handleStartSession}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function countFocusAreas(scan: ReturnType<typeof useLatestScan>): number {
  if (!scan) return 0;
  try {
    const analysis = translateScanToAnalysis(scan);
    return selectVisibleFindings(analysis).length;
  } catch {
    return 0;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  headerWrap: {
    paddingHorizontal: SP.gutter,
    paddingTop: SP.topAfterHeader,
    paddingBottom: SP.md,
    position: 'relative',
  },
  headerActionRow: {
    position: 'absolute',
    top: SP.topAfterHeader,
    right: SP.gutter,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtnWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerIconBtnDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.coralStrong,
    borderWidth: 1.5,
    borderColor: C.surface,
  },
  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: C.body,
    marginTop: 4,
  },
});

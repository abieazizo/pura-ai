/**
 * v26 — Routine view-model adapter.
 *
 * Translates the dev-switch fixtures + persistent store into a single
 * `RoutineViewModel`. Real data flows in here over time: the screen
 * never inspects the store or fixtures directly.
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useV25Dev } from '@/state/v25/devSwitch';
import { useAppStore } from '@/store/useAppStore';
import { useRoutineSessionStore } from './routineSessionStore';
import type {
  RoutineSession,
  RoutineStep,
  RoutineViewModel,
  ScanEvidence,
  ScanLogEntry,
  ScanReliabilityState,
  ScoreBreakdownRow,
  SkinSignal,
  ProgressTrend,
} from './routineSession';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function todayDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildSteps(): RoutineStep[] {
  return [
    {
      id: 'cleanse',
      type: 'cleanse',
      title: 'Cleanse gently',
      instruction: 'Use a non-exfoliating cleanser for 30–45 seconds.',
      guardrail: 'Avoid scrubbing the chin area.',
      product: undefined,
    },
    {
      id: 'moisturize',
      type: 'moisturize',
      title: 'Moisturize',
      instruction: 'Protect your barrier while the active area settles.',
      focusTag: 'Tonight’s focus',
      product: {
        id: 'cerave-moisturizing-cream',
        name: 'CeraVe Moisturizing Cream',
        category: 'moisturizer',
        compatibility: 'compatible',
        compatibilityReason: 'Compatible tonight',
      },
    },
    {
      id: 'do-less',
      type: 'avoid-actives',
      title: 'Do less tonight.',
      instruction:
        'Your chin is active, not damaged. Adding more treatment may irritate it further.',
      guardrail: 'Acids, retinoids, and scrubs.',
      isSignatureStep: true,
      primaryCta: 'I’ll keep it simple',
    },
  ];
}

function buildSession(args: {
  date: string;
  status: 'notStarted' | 'active' | 'complete';
  currentStepIndex: number;
  completedStepIds: string[];
  steps: RoutineStep[];
}): RoutineSession {
  return {
    date: args.date,
    period: 'evening',
    status: args.status,
    currentStepIndex: args.currentStepIndex,
    completedStepIds: args.completedStepIds,
    estimatedMinutes: 4,
    steps: args.steps,
    eyebrow: 'TONIGHT',
    emotionalHeadline: 'Keep your chin calm tonight.',
    emotionalSupport: 'Mild activity detected. No strong actives needed.',
    sourceScanId: 'scan-latest',
  };
}

function buildSignals(): SkinSignal[] {
  return [
    {
      id: 'breakouts',
      name: 'Breakouts',
      region: 'Chin area',
      status: 'needsAttention',
      summary: 'Keep tonight’s routine gentle.',
    },
    {
      id: 'hydration',
      name: 'Hydration',
      status: 'improving',
      summary: 'Less visible dryness than your first scan.',
    },
    {
      id: 'texture-darkmarks',
      name: 'Texture · Dark marks',
      status: 'measuring',
      summary: 'Unlocks after 2 more reliable scans.',
    },
  ];
}

function buildEvidence(): ScanEvidence {
  return {
    latestImageUri: undefined,
    baselineImageUri: undefined,
    trackedRegion: 'chin',
    annotation: { x: 0.46, y: 0.74, width: 0.22, height: 0.12 },
    comparisonAvailable: false,
    observation: 'Mild activity remains around your chin.',
    secondaryObservation:
      'Hydration appears slightly better than your first scan.',
  };
}

function buildReliability(args: {
  reliableScanCount: number;
  scannedToday: boolean;
}): ScanReliabilityState {
  const requiredForBaseline = 4;
  const baselineEstablished = args.reliableScanCount >= requiredForBaseline;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const scanLog: ScanLogEntry[] = [];
  if (args.reliableScanCount >= 1) {
    scanLog.push({ label: 'Day 1', caption: 'Baseline captured', state: 'done' });
  }
  if (args.reliableScanCount >= 2) {
    scanLog.push({ label: 'Day 4', caption: 'Reliable scan', state: 'done' });
  }
  if (args.reliableScanCount >= 3) {
    scanLog.push({ label: 'Day 7', caption: 'Reliable scan', state: 'done' });
  }
  if (args.reliableScanCount >= 4) {
    scanLog.push({ label: 'Day 10', caption: 'Reliable scan', state: 'done' });
  }

  const next = args.scannedToday ? 'pending' : 'pending';
  scanLog.push({
    label: args.scannedToday ? 'Tomorrow' : 'Today',
    caption: 'Next scan',
    state: next,
  });
  if (!baselineEstablished) {
    scanLog.push({
      label: `After ${Math.max(0, requiredForBaseline - args.reliableScanCount - 1)} more`,
      caption: 'Trend unlocks',
      state: 'future',
    });
  }

  return {
    reliableScanCount: args.reliableScanCount,
    requiredForBaseline,
    baselineEstablished,
    nextScanDueAt: args.scannedToday ? tomorrow.toISOString() : new Date().toISOString(),
    scannedToday: args.scannedToday,
    nextScanReady: !args.scannedToday,
    scanLog,
  };
}

function buildTrend(args: {
  reliableScanCount: number;
  hasPositiveChange: boolean;
}): ProgressTrend {
  if (args.reliableScanCount < 4) {
    return {
      established: false,
      points: [],
      headline: 'Building your baseline',
      supporting: 'Two more consistent scans will unlock visible trend tracking.',
    };
  }
  if (args.hasPositiveChange) {
    const breakdown: ScoreBreakdownRow[] = [
      { label: 'Hydration', status: 'improving', effectLabel: '+3' },
      { label: 'Breakouts', status: 'stillActive', effectLabel: '−1' },
      { label: 'Texture', status: 'stable', effectLabel: '0' },
      { label: 'Dark marks', status: 'measuring', effectLabel: '—' },
    ];
    return {
      established: true,
      points: [
        { dayLabel: 'Day 1', score: 60 },
        { dayLabel: 'Day 4', score: 61 },
        { dayLabel: 'Day 7', score: 60 },
        { dayLabel: 'Day 10', score: 62 },
      ],
      latestScore: 62,
      changeSinceBaseline: 2,
      headline: 'Your skin looks calmer than Day 1.',
      supporting:
        'Hydration improved. Breakout activity remains your focus.',
      scoreBreakdown: breakdown,
    };
  }
  return {
    established: true,
    points: [
      { dayLabel: 'Day 1', score: 60 },
      { dayLabel: 'Day 4', score: 60 },
      { dayLabel: 'Day 7', score: 59 },
      { dayLabel: 'Day 10', score: 60 },
    ],
    latestScore: 60,
    changeSinceBaseline: 0,
    headline: 'Your chin remains your focus.',
    supporting:
      'No visible improvement confirmed yet. Continue the gentle routine while we track change.',
    scoreBreakdown: [
      { label: 'Hydration', status: 'stable', effectLabel: '0' },
      { label: 'Breakouts', status: 'stillActive', effectLabel: '−1' },
      { label: 'Texture', status: 'stable', effectLabel: '0' },
      { label: 'Dark marks', status: 'measuring', effectLabel: '—' },
    ],
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * The view-model the Routine screen reads.
 *
 * Source of truth today: dev-switch fixture + persisted store completion
 * data. As real scan / product data lands, this hook is the one place to
 * swap in canonical state — screens never need to change.
 */
export function useRoutineViewModel(): RoutineViewModel {
  const dev = useV25Dev(
    useShallow((s) => ({ routine: s.routine, progress: s.progress })),
  );
  const persistedSession = useRoutineSessionStore(
    useShallow((s) => s.session),
  );

  const today = todayDateKey();

  return useMemo<RoutineViewModel>(() => {
    const steps = buildSteps();

    // Dev fixture overrides — let reviewers force any state.
    const fixtureStatus: 'notStarted' | 'active' | 'complete' =
      dev.routine === 'complete' ? 'complete' : 'notStarted';

    // Persisted session wins when it matches today's date.
    const isPersistedToday =
      !!persistedSession && persistedSession.date === today;

    let status: 'notStarted' | 'active' | 'complete' = 'notStarted';
    let completedStepIds: string[] = [];
    let currentStepIndex = 0;

    if (isPersistedToday && persistedSession) {
      status = persistedSession.status;
      completedStepIds = persistedSession.completedStepIds;
      currentStepIndex = persistedSession.currentStepIndex;
    } else if (fixtureStatus === 'complete') {
      status = 'complete';
      completedStepIds = steps.map((s) => s.id);
      currentStepIndex = steps.length;
    }

    const session = buildSession({
      date: today,
      status,
      currentStepIndex,
      completedStepIds,
      steps,
    });

    const reliableScanCount =
      dev.progress === 'baseline-only'
        ? 1
        : dev.progress === 'two-reliable'
        ? 2
        : dev.progress === 'failed-latest'
        ? 2
        : dev.progress === 'four-plus'
        ? 4
        : 2;
    const scannedToday = dev.progress !== 'failed-latest';
    const hasPositiveChange = dev.progress === 'four-plus';

    return {
      session,
      reliability: buildReliability({ reliableScanCount, scannedToday }),
      signals: buildSignals(),
      evidence: buildEvidence(),
      trend: buildTrend({ reliableScanCount, hasPositiveChange }),
    };
  }, [dev.routine, dev.progress, persistedSession, today]);
}

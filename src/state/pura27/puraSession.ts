/**
 * pura27 — Nightly session source of truth.
 *
 * One hook, three screens. `usePuraSession()` returns a fully resolved
 * `PuraSession` (typed in `./types`) and the actions the screens use to
 * mutate it: choosing tonight's featured product, marking steps complete,
 * resetting tonight, completing the routine.
 *
 * Wherever possible, this module DELEGATES to the existing app store so
 * that real persistence survives reloads:
 *   - tonight's completion timestamp → `tonightCompleteAt`
 *   - persisted routine progress     → `routineSessionV26`
 *   - selected product slot          → `userRoutineEvening`
 *
 * The prototype scenario described in the master prompt (Day 12 of 84,
 * BHA chin recommendation, paused retinoid) is encoded as typed fixtures
 * below. The fixtures are the ONLY copy of this data; nothing in the
 * three screens may inline brand names, product copy, or scan summary
 * strings. Replace the fixtures with backend reads when the canonical
 * `SkinState` / `RecommendationContext` is wired up — the screens never
 * need to change.
 */

import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store/useAppStore';
import type {
  NightStage,
  NightlyRoutine,
  NightlyScanSummary,
  ProgressSummary,
  PuraSession,
  RoutineStep,
  ShelfProduct,
} from './types';

// ---------------------------------------------------------------------------
// Fixture content — one centralized place.
// ---------------------------------------------------------------------------

const SCAN_FIXTURE: NightlyScanSummary = {
  id: 'scan-2026-05-24',
  date: '2026-05-24',
  completed: true,
  reliability: 'reliable',
  priorityConcern: 'breakouts',
  priorityRegion: 'chin',
  headline: 'Keep treatment gentle tonight.',
  summary:
    'One active-looking area on your chin needs attention. The rest of your routine can stay simple.',
};

const FEATURED_PRODUCT_ID = 'paulas-choice-2-bha';

const SHELF_FIXTURE: readonly ShelfProduct[] = [
  {
    id: 'paulas-choice-2-bha',
    brand: 'Paula’s Choice',
    name: 'Skin Perfecting 2% BHA Liquid Exfoliant',
    shortName: 'Paula’s Choice 2% BHA',
    category: 'treatment',
    imageUri: null,
    owned: true,
    recognitionStatus: 'confirmed',
    activeIngredients: ['Salicylic acid 2%'],
  },
  {
    id: 'gentle-cleanser',
    brand: 'CeraVe',
    name: 'Hydrating Facial Cleanser',
    shortName: 'Gentle Cleanser',
    category: 'cleanser',
    imageUri: null,
    owned: true,
    recognitionStatus: 'confirmed',
    activeIngredients: ['Ceramides', 'Hyaluronic acid'],
  },
  {
    id: 'comfort-moisturizer',
    brand: 'CeraVe',
    name: 'Moisturizing Cream',
    shortName: 'Comfort Moisturizer',
    category: 'moisturizer',
    imageUri: null,
    owned: true,
    recognitionStatus: 'confirmed',
    activeIngredients: ['Ceramides', 'Niacinamide'],
  },
  {
    id: 'retinoid-serum',
    brand: 'The Ordinary',
    name: 'Retinol 0.5% in Squalane',
    shortName: 'Retinoid Serum',
    category: 'serum',
    imageUri: null,
    owned: true,
    recognitionStatus: 'needsConfirmation',
    activeIngredients: ['Retinol 0.5%'],
  },
];

const PROGRESS_FIXTURE: ProgressSummary = {
  currentDay: 12,
  totalDays: 84,
  scansComplete: 11,
  routinesComplete: 11,
  trend: 'improving',
  trendLabel: 'Improving',
  trendHeadline: 'Chin breakout activity',
  trendBody: 'Less visible irritation across your last 7 scans.',
  lastAdaptationTitle: 'Retinoid paused for 2 nights',
  lastAdaptationBody:
    'Pura adjusted your routine after visible irritation appeared around your chin.',
};

const STEP_TEMPLATES: readonly Omit<RoutineStep, 'completed'>[] = [
  {
    id: 'step-cleanse',
    kind: 'cleanse',
    order: 1,
    title: 'Cleanse',
    productId: 'gentle-cleanser',
    productName: 'Gentle Cleanser',
    instruction: 'Whole face · Rinse with lukewarm water',
    expandedInstruction:
      'Massage gently for 30 seconds, then rinse with lukewarm water. Pat dry without rubbing.',
    caution: null,
  },
  {
    id: 'step-treat',
    kind: 'treat',
    order: 2,
    title: 'Treat',
    productId: FEATURED_PRODUCT_ID,
    productName: 'Paula’s Choice 2% BHA',
    instruction: 'Chin only · One thin layer',
    expandedInstruction:
      'Apply to the chin only. Avoid cheeks and any area that feels irritated. Wait 60 seconds before moisturizing.',
    caution: 'Skip retinoid tonight',
  },
  {
    id: 'step-moisturize',
    kind: 'moisturize',
    order: 3,
    title: 'Moisturize',
    productId: 'comfort-moisturizer',
    productName: 'Comfort Moisturizer',
    instruction: 'Whole face · Plain finish',
    expandedInstruction:
      'Apply a light, even layer across the face. Keep the finish simple tonight and avoid extra actives.',
    caution: null,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRoutine(args: {
  date: string;
  featuredProductId: string;
  completedStepIds: readonly string[];
  completedAt: string | null;
}): NightlyRoutine {
  const featured =
    SHELF_FIXTURE.find((p) => p.id === args.featuredProductId) ??
    SHELF_FIXTURE.find((p) => p.id === FEATURED_PRODUCT_ID)!;

  const steps: RoutineStep[] = STEP_TEMPLATES.map((tpl) => {
    if (tpl.kind === 'treat') {
      return {
        ...tpl,
        productId: featured.id,
        productName: featured.shortName,
        completed: args.completedStepIds.includes(tpl.id),
      };
    }
    return {
      ...tpl,
      completed: args.completedStepIds.includes(tpl.id),
    };
  });

  return {
    id: `routine-${args.date}`,
    scanId: SCAN_FIXTURE.id,
    date: args.date,
    headline: 'Focused care for one active area.',
    summary:
      'Treat the chin only. Skip your retinoid until irritation settles.',
    steps,
    skipped: [
      {
        productId: 'retinoid-serum',
        productName: 'Retinoid Serum',
        reason: 'Visible irritation around your chin tonight.',
      },
    ],
    completedAt: args.completedAt,
  };
}

function resolveStage(
  status: 'notStarted' | 'active' | 'complete',
  tonightCompleteAt: string | null,
): NightStage {
  if (status === 'complete' || tonightCompleteAt) {
    return 'routine_complete';
  }
  if (status === 'active') return 'routine_active';
  return 'scan_ready';
}

/**
 * Whether an ISO timestamp belongs to the local calendar day.
 *
 * Used to gate persisted "tonight complete" markers — a timestamp from
 * yesterday must NOT trigger today's completion state. Without this
 * check, a user who finished tonight's routine yesterday would re-open
 * the app today and still see "You did enough tonight" until they
 * scanned again, eroding the same trust the scan-rescue work was meant
 * to restore.
 */
function isSameLocalDay(iso: string | null, now = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function todayHumanDate(now = new Date()): string {
  return now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
}

/**
 * `YYYY-MM-DD` for the local day. Inlined here (rather than imported
 * from `@/state/v26/routineViewModel`) so this module never picks up
 * incidental TS errors from the v26 routine pipeline while it churns.
 */
function todayDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface PuraSessionActions {
  /**
   * Mark a step complete. Updates persisted `routineSessionV26` so the
   * progress survives reloads, and writes `tonightCompleteAt` when the
   * last step is finished.
   */
  completeStep: (stepId: string) => void;
  /** Choose tonight's featured (Treat) product. */
  selectFeaturedProduct: (productId: string) => void;
  /** Reset tonight's session (dev affordance — never surfaced in UI). */
  resetTonight: () => void;
}

export interface UsePuraSessionResult {
  session: PuraSession;
  /** A human-friendly date string for header metadata. */
  todayLabel: string;
  actions: PuraSessionActions;
}

export function usePuraSession(): UsePuraSessionResult {
  const persisted = useAppStore(
    useShallow((s) => ({
      session: s.routineSessionV26,
      tonightCompleteAt: s.tonightCompleteAt,
      userRoutineEvening: s.userRoutineEvening,
    })),
  );
  const persistRoutineSession = useAppStore((s) => s.setRoutineSessionV26);
  const setTonightCompleteAt = useAppStore((s) => s.setTonightCompleteAt);
  const addUserRoutineProduct = useAppStore((s) => s.addUserRoutineProduct);

  const today = todayDateKey();

  const featuredProductId = useMemo(() => {
    // Anything the user actively chose in the evening slot wins, as long
    // as it exists on our shelf fixture. Otherwise fall back to the
    // recommended hero product.
    const chosen = persisted.userRoutineEvening.find((id) =>
      SHELF_FIXTURE.some((p) => p.id === id),
    );
    return chosen ?? FEATURED_PRODUCT_ID;
  }, [persisted.userRoutineEvening]);

  const session = useMemo<PuraSession>(() => {
    // Day-rollover guard: only honor persisted state whose timestamp
    // is from today. A persisted session from yesterday would otherwise
    // freeze the Home stage at `routine_complete` forever.
    const persistedToday =
      persisted.session && persisted.session.date === today
        ? persisted.session
        : null;

    const validTonightCompleteAt = isSameLocalDay(
      persisted.tonightCompleteAt,
    )
      ? persisted.tonightCompleteAt
      : null;

    const completedStepIds: readonly string[] =
      persistedToday?.completedStepIds ?? [];

    const status: 'notStarted' | 'active' | 'complete' =
      persistedToday?.status ?? 'notStarted';

    const stage = resolveStage(status, validTonightCompleteAt);

    const routine = buildRoutine({
      date: today,
      featuredProductId,
      completedStepIds,
      completedAt:
        persistedToday?.completedAt ?? validTonightCompleteAt,
    });

    return {
      stage,
      tonightScan: SCAN_FIXTURE,
      currentRoutine: routine,
      shelfProducts: SHELF_FIXTURE,
      featuredProductId,
      progress: PROGRESS_FIXTURE,
    };
  }, [
    persisted.session,
    persisted.tonightCompleteAt,
    today,
    featuredProductId,
  ]);

  const completeStep = useCallback(
    (stepId: string) => {
      const persistedToday =
        persisted.session && persisted.session.date === today
          ? persisted.session
          : null;
      const prev = persistedToday?.completedStepIds ?? [];
      if (prev.includes(stepId)) return;
      const nextCompleted = [...prev, stepId];

      const allStepIds = STEP_TEMPLATES.map((s) => s.id);
      const allDone = allStepIds.every((id) => nextCompleted.includes(id));

      const nextIndex = allStepIds.findIndex(
        (id) => !nextCompleted.includes(id),
      );

      persistRoutineSession({
        date: today,
        status: allDone ? 'complete' : 'active',
        currentStepIndex: nextIndex === -1 ? allStepIds.length : nextIndex,
        completedStepIds: nextCompleted,
        completedAt: allDone ? new Date().toISOString() : null,
      });

      if (allDone) {
        setTonightCompleteAt(new Date().toISOString());
      }
    },
    [persisted.session, today, persistRoutineSession, setTonightCompleteAt],
  );

  const selectFeaturedProduct = useCallback(
    (productId: string) => {
      addUserRoutineProduct('evening', productId);
    },
    [addUserRoutineProduct],
  );

  const resetTonight = useCallback(() => {
    persistRoutineSession(null);
    setTonightCompleteAt(null);
  }, [persistRoutineSession, setTonightCompleteAt]);

  return {
    session,
    todayLabel: todayHumanDate(),
    actions: {
      completeStep,
      selectFeaturedProduct,
      resetTonight,
    },
  };
}

/**
 * Pure helper for components that need to resolve a shelf product
 * without taking the full hook subscription. Keeps the fixture data
 * the single source of truth even outside the hook.
 */
export function lookupShelfProduct(
  productId: string,
): ShelfProduct | undefined {
  return SHELF_FIXTURE.find((p) => p.id === productId);
}

export { FEATURED_PRODUCT_ID, SHELF_FIXTURE, PROGRESS_FIXTURE, SCAN_FIXTURE };

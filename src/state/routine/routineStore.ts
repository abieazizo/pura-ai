/**
 * Pura Routine — lifecycle store.
 *
 * Owns the user-facing routine lifecycle from scan handoff to daily
 * use. The store is the source of truth; screens bind to selectors,
 * never to fragmented store shape.
 *
 * What this store does NOT own:
 *   • Scan capture / analysis (lives in useAppStore + scan results
 *     services).
 *   • Product catalog (lives in shopCatalog).
 *   • Shelf ownership state (lives in useAppStore.userRoutineMorning /
 *     userRoutineEvening + this store's confirmation overrides).
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CustomRoutine,
  ProductAvailability,
  RoutineBuildProductStep,
  RoutineBuildProgress,
  RoutineBuildStage,
  RoutineBuildSubPhase,
  RoutineLifecycleState,
  RoutineSessionRecord,
  RoutineStep,
  RoutineStepType,
  RoutineTimeOfDay,
} from '@/types/routine';
import { ROUTINE_BUILD_PERCENT_BY_STAGE } from '@/types/routine';

interface RoutineStoreState {
  // Lifecycle
  lifecycle: RoutineLifecycleState;
  /** Scan id of the active or in-flight routine. */
  activeScanId: string | null;
  /** The current routine plan, in any state from `ready_to_review` onward. */
  routine: CustomRoutine | null;
  /** Real-time build progress while `lifecycle === 'building'`. */
  buildProgress: RoutineBuildProgress | null;
  /** Failure message when `lifecycle === 'build_failed'`. */
  buildFailureReason: string | null;

  // User overrides — confirmations / skips made on top of the generated plan.
  /** product id -> explicit confirmation that the user owns it */
  confirmedOwnedProductIds: Record<string, true>;
  /** step id -> explicit skip choice */
  skippedStepIds: Record<string, true>;

  // Active mode toggle (My Routine screen)
  selectedTimeOfDay: RoutineTimeOfDay;

  // Today's session, if any.
  todaySession: RoutineSessionRecord | null;

  // Lightweight session history for consistency display.
  recentSessions: RoutineSessionRecord[];

  // Actions
  setLifecycle: (next: RoutineLifecycleState) => void;
  startBuild: (scanId: string) => void;
  updateBuildProgress: (stage: RoutineBuildStage) => void;
  /** Advance the visual product-step progression (Cleanse → Treat → ...). */
  setBuildProductStep: (
    step: RoutineBuildProductStep | null,
    subPhase: RoutineBuildSubPhase,
  ) => void;
  /** Mark a product step as completed (visual checkmark). */
  completeBuildProductStep: (step: RoutineBuildProductStep) => void;
  completeBuild: (routine: CustomRoutine) => void;
  failBuild: (reason: string) => void;
  resetBuild: () => void;
  setRoutine: (routine: CustomRoutine) => void;
  confirmOwned: (productId: string) => void;
  unconfirmOwned: (productId: string) => void;
  skipStep: (stepId: string) => void;
  unskipStep: (stepId: string) => void;
  setSelectedTimeOfDay: (next: RoutineTimeOfDay) => void;
  beginSession: (timeOfDay: RoutineTimeOfDay, dateKey: string) => void;
  completeSessionStep: (stepId: string) => void;
  skipSessionStep: (stepId: string) => void;
  endSession: (status: 'complete' | 'abandoned') => void;
  resetSession: () => void;
  /** Hard reset — used when a fresh scan arrives and the user accepts an update. */
  clearAll: () => void;
}

const initial = {
  lifecycle: 'no_scan' as RoutineLifecycleState,
  activeScanId: null,
  routine: null,
  buildProgress: null,
  buildFailureReason: null,
  confirmedOwnedProductIds: {},
  skippedStepIds: {},
  selectedTimeOfDay: 'evening' as RoutineTimeOfDay,
  todaySession: null,
  recentSessions: [] as RoutineSessionRecord[],
};

export const useRoutineStore = create<RoutineStoreState>()(
  persist(
    (set, get) => ({
      ...initial,

      setLifecycle: (lifecycle) => set({ lifecycle }),

      startBuild: (scanId) =>
        set({
          lifecycle: 'building',
          activeScanId: scanId,
          buildFailureReason: null,
          buildProgress: {
            scanId,
            percent: ROUTINE_BUILD_PERCENT_BY_STAGE.reading_focus_areas,
            activeStage: 'reading_focus_areas',
            completedStages: [],
            activeProductStep: null,
            activeSubPhase: 'selecting_step',
            completedProductSteps: [],
            startedAt: new Date().toISOString(),
          },
        }),

      updateBuildProgress: (stage) =>
        set((state) => {
          if (!state.buildProgress) return state;
          const completedStages = Array.from(
            new Set([
              ...state.buildProgress.completedStages,
              ...stageHistoryUpTo(stage),
            ]),
          );
          return {
            buildProgress: {
              ...state.buildProgress,
              activeStage: stage,
              percent: ROUTINE_BUILD_PERCENT_BY_STAGE[stage],
              completedStages,
            },
          };
        }),

      setBuildProductStep: (step, subPhase) =>
        set((state) => {
          if (!state.buildProgress) return state;
          // Visual-only percent override: walk smoothly through the 4
          // product steps once the AI plan has landed. Mapping:
          //   cleanse selecting  → 22%
          //   cleanse finding    → 32%
          //   cleanse compat     → 40%
          //   treat   selecting  → 46%
          //   treat   finding    → 54%
          //   treat   compat     → 60%
          //   moisturize ...     → 66 / 72 / 78
          //   protect    ...     → 82 / 88 / 94
          const PRODUCT_STEP_ORDER: RoutineBuildProductStep[] = [
            'cleanse',
            'treat',
            'moisturize',
            'protect',
          ];
          const SUB_PHASE_OFFSET: Record<RoutineBuildSubPhase, number> = {
            selecting_step: 0,
            finding_best_match: 6,
            checking_compatibility: 12,
          };
          let nextPercent = state.buildProgress.percent;
          if (step) {
            const idx = PRODUCT_STEP_ORDER.indexOf(step);
            nextPercent = Math.min(
              94,
              22 + idx * 18 + SUB_PHASE_OFFSET[subPhase],
            );
          }
          return {
            buildProgress: {
              ...state.buildProgress,
              activeProductStep: step,
              activeSubPhase: subPhase,
              percent: nextPercent,
            },
          };
        }),

      completeBuildProductStep: (step) =>
        set((state) => {
          if (!state.buildProgress) return state;
          if (state.buildProgress.completedProductSteps.includes(step)) {
            return state;
          }
          return {
            buildProgress: {
              ...state.buildProgress,
              completedProductSteps: [
                ...state.buildProgress.completedProductSteps,
                step,
              ],
            },
          };
        }),

      completeBuild: (routine) =>
        set({
          lifecycle: 'ready_to_review',
          routine: { ...routine, status: 'ready_to_review' },
          buildProgress: {
            scanId: routine.scanId,
            percent: 100,
            activeStage: 'complete',
            completedStages: [
              'reading_focus_areas',
              'matching_step_types',
              'checking_shelf',
              'matching_products',
              'finalizing_plan',
            ],
            activeProductStep: null,
            activeSubPhase: 'checking_compatibility',
            completedProductSteps: [
              'cleanse',
              'treat',
              'moisturize',
              'protect',
            ],
            startedAt: get().buildProgress?.startedAt ?? new Date().toISOString(),
          },
          // Reset per-routine overrides — confirmations from a previous
          // routine don't carry over to a new plan.
          confirmedOwnedProductIds: {},
          skippedStepIds: {},
        }),

      failBuild: (reason) =>
        set({
          lifecycle: 'build_failed',
          buildFailureReason: reason,
          buildProgress: null,
        }),

      resetBuild: () =>
        set({
          lifecycle: 'scan_available',
          buildProgress: null,
          buildFailureReason: null,
        }),

      setRoutine: (routine) => set({ routine }),

      confirmOwned: (productId) =>
        set((state) => ({
          confirmedOwnedProductIds: {
            ...state.confirmedOwnedProductIds,
            [productId]: true,
          },
        })),

      unconfirmOwned: (productId) =>
        set((state) => {
          const next = { ...state.confirmedOwnedProductIds };
          delete next[productId];
          return { confirmedOwnedProductIds: next };
        }),

      skipStep: (stepId) =>
        set((state) => ({
          skippedStepIds: { ...state.skippedStepIds, [stepId]: true },
        })),

      unskipStep: (stepId) =>
        set((state) => {
          const next = { ...state.skippedStepIds };
          delete next[stepId];
          return { skippedStepIds: next };
        }),

      setSelectedTimeOfDay: (next) => set({ selectedTimeOfDay: next }),

      beginSession: (timeOfDay, dateKey) =>
        set((state) => {
          if (!state.routine) return state;
          return {
            lifecycle: 'session_in_progress',
            selectedTimeOfDay: timeOfDay,
            todaySession: {
              routineId: state.routine.id,
              scanId: state.routine.scanId,
              dateKey,
              timeOfDay,
              startedAt: new Date().toISOString(),
              completedStepIds: [],
              skippedStepIds: [],
              status: 'in_progress',
            },
          };
        }),

      completeSessionStep: (stepId) =>
        set((state) => {
          if (!state.todaySession) return state;
          if (state.todaySession.completedStepIds.includes(stepId))
            return state;
          return {
            todaySession: {
              ...state.todaySession,
              completedStepIds: [
                ...state.todaySession.completedStepIds,
                stepId,
              ],
            },
          };
        }),

      skipSessionStep: (stepId) =>
        set((state) => {
          if (!state.todaySession) return state;
          if (state.todaySession.skippedStepIds.includes(stepId)) return state;
          return {
            todaySession: {
              ...state.todaySession,
              skippedStepIds: [...state.todaySession.skippedStepIds, stepId],
            },
          };
        }),

      endSession: (status) =>
        set((state) => {
          if (!state.todaySession) return state;
          const ended: RoutineSessionRecord = {
            ...state.todaySession,
            status,
            completedAt: new Date().toISOString(),
          };
          const recent = [
            ended,
            ...state.recentSessions.filter(
              (s) =>
                !(s.dateKey === ended.dateKey && s.timeOfDay === ended.timeOfDay),
            ),
          ].slice(0, 14);
          return {
            lifecycle: status === 'complete' ? 'session_complete' : 'active',
            todaySession: ended,
            recentSessions: recent,
          };
        }),

      resetSession: () =>
        set((state) => ({
          lifecycle: state.routine ? 'active' : state.lifecycle,
          todaySession: null,
        })),

      clearAll: () => set({ ...initial }),
    }),
    {
      name: 'pura-routine-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lifecycle: state.lifecycle,
        activeScanId: state.activeScanId,
        routine: state.routine,
        confirmedOwnedProductIds: state.confirmedOwnedProductIds,
        skippedStepIds: state.skippedStepIds,
        selectedTimeOfDay: state.selectedTimeOfDay,
        todaySession: state.todaySession,
        recentSessions: state.recentSessions,
      }),
      version: 1,
    },
  ),
);

function stageHistoryUpTo(stage: RoutineBuildStage): RoutineBuildStage[] {
  const order: RoutineBuildStage[] = [
    'reading_focus_areas',
    'matching_step_types',
    'checking_shelf',
    'matching_products',
    'finalizing_plan',
    'complete',
  ];
  const idx = order.indexOf(stage);
  if (idx <= 0) return [];
  return order.slice(0, idx);
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/**
 * Compute the visible availability for a step. The persisted routine
 * holds the as-built availability; this selector layers user
 * confirmations on top.
 */
export function resolveStepAvailability(
  step: RoutineStep,
  confirmedOwnedIds: Record<string, true>,
  skippedStepIds: Record<string, true>,
): ProductAvailability {
  if (skippedStepIds[step.id]) return 'skipped';
  if (step.product && confirmedOwnedIds[step.product.id]) return 'owned';
  return step.availability;
}

/**
 * `canStart` for a given time of day. A user can start a morning or
 * evening routine when, after applying confirmations/skips, EVERY
 * required (non-optional) step is in `owned` OR `not_required` OR
 * `skipped`. Optional steps never block.
 */
export function canStartTimeOfDay(args: {
  routine: CustomRoutine | null;
  confirmedOwnedIds: Record<string, true>;
  skippedStepIds: Record<string, true>;
  timeOfDay: RoutineTimeOfDay;
}): boolean {
  const { routine, confirmedOwnedIds, skippedStepIds, timeOfDay } = args;
  if (!routine) return false;
  const steps =
    timeOfDay === 'morning' ? routine.morningSteps : routine.eveningSteps;
  if (steps.length === 0) return false;
  let hasAnyUsable = false;
  for (const step of steps) {
    const av = resolveStepAvailability(step, confirmedOwnedIds, skippedStepIds);
    if (!step.optional) {
      // Required step must be usable.
      if (av !== 'owned' && av !== 'skipped' && av !== 'not_required') {
        return false;
      }
    }
    if (av === 'owned' || av === 'not_required') hasAnyUsable = true;
  }
  return hasAnyUsable;
}

export function countUnconfirmedRequiredSteps(args: {
  routine: CustomRoutine | null;
  confirmedOwnedIds: Record<string, true>;
  skippedStepIds: Record<string, true>;
}): number {
  const { routine, confirmedOwnedIds, skippedStepIds } = args;
  if (!routine) return 0;
  const seen = new Set<string>();
  let n = 0;
  for (const step of [...routine.morningSteps, ...routine.eveningSteps]) {
    if (seen.has(step.id)) continue;
    seen.add(step.id);
    if (step.optional) continue;
    const av = resolveStepAvailability(step, confirmedOwnedIds, skippedStepIds);
    if (
      av === 'recommended' ||
      av === 'needs_confirmation' ||
      av === 'missing'
    ) {
      n += 1;
    }
  }
  return n;
}

export function todayDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function defaultTimeOfDayForNow(date: Date = new Date()): RoutineTimeOfDay {
  const h = date.getHours();
  return h >= 4 && h < 16 ? 'morning' : 'evening';
}

/**
 * Step icon glyph — one of the existing Glyph component options.
 * Centralized so routine UI and confirmation sheet stay consistent.
 */
export const STEP_TYPE_LABEL: Record<RoutineStepType, string> = {
  cleanse: 'Cleanse',
  treat: 'Treat',
  hydrate: 'Hydrate',
  protect: 'Protect',
};

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
  RoutineProduct,
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

  /**
   * Inline daily completion for the active routine page. Keyed by step id
   * and tracked separately for the morning and evening lists (the two
   * lists can hold steps that share an id), scoped to a local date so it
   * self-resets each day. Distinct from the focused-session flow
   * (`todaySession`): this is the casual at-a-glance check-off.
   */
  dailyChecklist: { dateKey: string; morning: string[]; evening: string[] } | null;

  /**
   * Ledger of local date keys (`YYYY-MM-DD`) on which the user checked off
   * at least one step (morning OR evening). Persistent and immutable for
   * past days — the streak engine walks it backward from today. Distinct
   * from `dailyChecklist`, which self-resets each day and cannot carry
   * history.
   */
  completionDates: string[];

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
  /** Toggle a step's done state on the daily checklist (date self-rolls). */
  toggleStepComplete: (timeOfDay: RoutineTimeOfDay, stepId: string) => void;
  /** Reorder a step within the given list (edit mode drag-and-drop). */
  reorderSteps: (timeOfDay: RoutineTimeOfDay, from: number, to: number) => void;
  /** Remove a step from the given list (edit mode delete). */
  removeRoutineStep: (timeOfDay: RoutineTimeOfDay, stepId: string) => void;
  /** Append a freshly built step to the given list (edit mode add). */
  addRoutineStep: (timeOfDay: RoutineTimeOfDay, step: RoutineStep) => void;
  /** Swap the product on a step (Customize sheet), matched by id across both lists. */
  swapStepProduct: (stepId: string, product: RoutineProduct) => void;
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
  dailyChecklist: null as {
    dateKey: string;
    morning: string[];
    evening: string[];
  } | null,
  completionDates: [] as string[],
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
          // A new routine starts the daily checklist fresh.
          dailyChecklist: null,
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

      toggleStepComplete: (timeOfDay, stepId) =>
        set((state) => {
          const today = todayDateKey();
          const base =
            state.dailyChecklist && state.dailyChecklist.dateKey === today
              ? state.dailyChecklist
              : { dateKey: today, morning: [] as string[], evening: [] as string[] };
          const list = timeOfDay === 'morning' ? base.morning : base.evening;
          const nextList = list.includes(stepId)
            ? list.filter((id) => id !== stepId)
            : [...list, stepId];
          const next =
            timeOfDay === 'morning'
              ? { dateKey: today, morning: nextList, evening: base.evening }
              : { dateKey: today, morning: base.morning, evening: nextList };
          // Keep the streak ledger exactly consistent with "≥1 completion
          // today": stamp today on the first check-off, drop it if the day
          // empties back out. Past days are never touched.
          const dates = state.completionDates ?? [];
          const hasAnyToday = next.morning.length > 0 || next.evening.length > 0;
          const hasStamp = dates.includes(today);
          let completionDates = dates;
          if (hasAnyToday && !hasStamp) {
            completionDates = [...dates, today].sort();
            if (completionDates.length > 400) {
              completionDates = completionDates.slice(-400);
            }
          } else if (!hasAnyToday && hasStamp) {
            completionDates = dates.filter((d) => d !== today);
          }
          return { dailyChecklist: next, completionDates };
        }),

      reorderSteps: (timeOfDay, from, to) =>
        set((state) => {
          if (!state.routine) return state;
          const steps =
            timeOfDay === 'morning'
              ? state.routine.morningSteps
              : state.routine.eveningSteps;
          if (
            from < 0 ||
            from >= steps.length ||
            to < 0 ||
            to >= steps.length ||
            from === to
          ) {
            return state;
          }
          const arr = steps.slice();
          const [moved] = arr.splice(from, 1);
          arr.splice(to, 0, moved);
          const patch =
            timeOfDay === 'morning'
              ? { morningSteps: renumber(arr) }
              : { eveningSteps: renumber(arr) };
          return { routine: { ...state.routine, ...patch } };
        }),

      removeRoutineStep: (timeOfDay, stepId) =>
        set((state) => {
          if (!state.routine) return state;
          const steps =
            timeOfDay === 'morning'
              ? state.routine.morningSteps
              : state.routine.eveningSteps;
          const nextSteps = renumber(steps.filter((s) => s.id !== stepId));
          if (nextSteps.length === steps.length) return state;
          const patch =
            timeOfDay === 'morning'
              ? { morningSteps: nextSteps }
              : { eveningSteps: nextSteps };
          let dailyChecklist = state.dailyChecklist;
          if (dailyChecklist) {
            dailyChecklist =
              timeOfDay === 'morning'
                ? {
                    ...dailyChecklist,
                    morning: dailyChecklist.morning.filter((id) => id !== stepId),
                  }
                : {
                    ...dailyChecklist,
                    evening: dailyChecklist.evening.filter((id) => id !== stepId),
                  };
          }
          return { routine: { ...state.routine, ...patch }, dailyChecklist };
        }),

      addRoutineStep: (timeOfDay, step) =>
        set((state) => {
          if (!state.routine) return state;
          const steps =
            timeOfDay === 'morning'
              ? state.routine.morningSteps
              : state.routine.eveningSteps;
          if (steps.some((s) => s.type === step.type)) return state;
          const patch =
            timeOfDay === 'morning'
              ? { morningSteps: renumber([...steps, step]) }
              : { eveningSteps: renumber([...steps, step]) };
          return { routine: { ...state.routine, ...patch } };
        }),

      swapStepProduct: (stepId, product) =>
        set((state) => {
          if (!state.routine) return state;
          // A step id can appear in both lists (a "both"-timed step); swap
          // in both so morning and evening never show different products
          // for the same step.
          const apply = (steps: RoutineStep[]) =>
            steps.map((s) =>
              s.id === stepId
                ? { ...s, product, availability: product.availability }
                : s,
            );
          return {
            routine: {
              ...state.routine,
              morningSteps: apply(state.routine.morningSteps),
              eveningSteps: apply(state.routine.eveningSteps),
            },
          };
        }),

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
        dailyChecklist: state.dailyChecklist,
        completionDates: state.completionDates,
      }),
      version: 1,
    },
  ),
);

/** Reassign 1-based `order` after an insert/remove/reorder. */
function renumber(steps: RoutineStep[]): RoutineStep[] {
  return steps.map((s, i) => ({ ...s, order: i + 1 }));
}

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
 * The step ids checked off for a given time of day, valid only for the
 * current local day. A checklist from a prior day reads as empty (it will
 * be overwritten on the next toggle), so the landing page always starts
 * each day clean without a separate reset pass.
 */
export function selectDailyDoneIds(
  checklist: { dateKey: string; morning: string[]; evening: string[] } | null,
  timeOfDay: RoutineTimeOfDay,
  date: Date = new Date(),
): string[] {
  if (checklist && checklist.dateKey === todayDateKey(date)) {
    return timeOfDay === 'morning' ? checklist.morning : checklist.evening;
  }
  return [];
}

/**
 * Consecutive-day completion streak, anchored to today. Counts the
 * unbroken run of days with ≥1 completion ending today, or — if today
 * has nothing yet — ending yesterday, so an active streak still reads
 * as "alive" first thing in the day rather than dropping to zero.
 *
 *   • `count` — number of consecutive days in the run (0 if broken).
 *   • `includesToday` — whether today itself is one of them.
 */
export function selectCompletionStreak(
  completionDates: string[] | undefined,
  date: Date = new Date(),
): { count: number; includesToday: boolean } {
  const set = new Set(completionDates ?? []);
  const includesToday = set.has(todayDateKey(date));
  const cursor = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (!includesToday) {
    // No completion today yet — see if the run is still carried by
    // yesterday. If not, the streak is broken.
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(todayDateKey(cursor))) {
      return { count: 0, includesToday: false };
    }
  }
  let count = 0;
  while (set.has(todayDateKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { count, includesToday };
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

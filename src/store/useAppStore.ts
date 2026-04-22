import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { askAssistant } from '@/api';
import {
  seedRoutine,
  seedMatches,
  seedScans,
  seedUserNew,
  seedUserPopulated,
} from '@/data/seed';
import type {
  AssistantMessage,
  InFlightScan,
  ProductMatch,
  RoutineStep,
  Scan,
  ScanResult,
  User,
} from '@/types';

export type AppearanceMode = 'light' | 'dark' | 'system';

export interface AppState {
  user: User | null;
  scans: Scan[];
  routine: RoutineStep[];
  matches: ProductMatch[];
  wishlist: string[];
  messages: AssistantMessage[];
  appearance: AppearanceMode;
  hasSeenScanTutorial: boolean;

  onboardingComplete: boolean;
  name: string;
  age: number | null;
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say' | null;
  skinType: 'oily' | 'dry' | 'combination' | 'sensitive' | null;
  concerns: string[];
  sensitivity: 'very' | 'somewhat' | 'not' | 'unsure' | null;
  sunExposure: 'rarely' | 'sometimes' | 'often' | 'unsure' | null;
  effort: 'minimal' | 'moderate' | 'enthusiast' | 'decide-for-me' | null;
  goal: 'clear' | 'calm' | 'bright' | null;
  attribution: string | null;
  subscriptionStatus: 'trial' | 'active' | 'none';
  hasAskedForReview: boolean;
  cameraDenied: boolean;

  contextualTodayNote: string | null;
  priceTier: 'drugstore' | 'mid' | 'prestige' | null;
  routineFitback: 'too-much' | 'right' | 'too-little' | null;
  hasAnsweredTodayContext: boolean;
  hasAnsweredPriceTier: boolean;
  hasAnsweredRoutineFitback: boolean;

  hasSeenProductsScrollHint: boolean;

  // v7.7 — scan analyzing choreography state. Transient except for
  // `latestResult`, which is persisted so returning users can see their last
  // reveal if they re-enter the stack without re-scanning.
  inFlightScan: InFlightScan | null;
  latestResult: ScanResult | null;

  assistantTyping: boolean;

  hasOnboarded: () => boolean;

  completeOnboarding: (user: User) => void;
  addScan: (scan: Scan) => void;
  markStepDone: (stepId: string) => void;
  resetStep: (stepId: string) => void;
  toggleWishlist: (productId: string) => void;
  pushUserMessage: (text: string, attachedProductIds?: string[]) => AssistantMessage;
  sendMessage: (text: string, attachedProductIds?: string[]) => Promise<void>;
  setAppearance: (mode: AppearanceMode) => void;
  setHasSeenScanTutorial: (seen: boolean) => void;

  setName: (name: string) => void;
  setAge: (age: number | null) => void;
  setGender: (g: AppState['gender']) => void;
  setSkinType: (t: AppState['skinType']) => void;
  setConcerns: (c: string[]) => void;
  setSensitivity: (s: AppState['sensitivity']) => void;
  setSunExposure: (s: AppState['sunExposure']) => void;
  setEffort: (e: AppState['effort']) => void;
  setGoal: (g: AppState['goal']) => void;
  setAttribution: (a: string | null) => void;
  setSubscriptionStatus: (s: AppState['subscriptionStatus']) => void;
  setHasAskedForReview: (seen: boolean) => void;
  setCameraDenied: (denied: boolean) => void;

  setContextualTodayNote: (note: string | null) => void;
  setPriceTier: (tier: AppState['priceTier']) => void;
  setRoutineFitback: (fb: AppState['routineFitback']) => void;
  setHasAnsweredTodayContext: (seen: boolean) => void;
  setHasAnsweredPriceTier: (seen: boolean) => void;
  setHasAnsweredRoutineFitback: (seen: boolean) => void;
  setHasSeenProductsScrollHint: (seen: boolean) => void;

  // v7.7 scan analyzing
  startScan: (photoUri: string) => void;
  setScanResult: (result: Omit<ScanResult, 'scanCount'>) => void;
  setCompositePhoto: (uri: string) => void;
  clearInFlightScan: () => void;

  finishOnboarding: () => void;

  devLoadPopulated: () => void;
  devResetToNewUser: () => void;
  devWipeAll: () => void;
}

const emptyTransient = {
  assistantTyping: false,
};

const blankState = {
  user: null as User | null,
  scans: [] as Scan[],
  routine: [] as RoutineStep[],
  matches: [] as ProductMatch[],
  wishlist: [] as string[],
  messages: [] as AssistantMessage[],
  appearance: 'light' as AppearanceMode,
  hasSeenScanTutorial: false,
  onboardingComplete: false,
  name: '',
  age: null as number | null,
  gender: null as AppState['gender'],
  skinType: null as AppState['skinType'],
  concerns: [] as string[],
  sensitivity: null as AppState['sensitivity'],
  sunExposure: null as AppState['sunExposure'],
  effort: null as AppState['effort'],
  goal: null as AppState['goal'],
  attribution: null as string | null,
  subscriptionStatus: 'none' as AppState['subscriptionStatus'],
  hasAskedForReview: false,
  cameraDenied: false,
  contextualTodayNote: null as string | null,
  priceTier: null as AppState['priceTier'],
  routineFitback: null as AppState['routineFitback'],
  hasAnsweredTodayContext: false,
  hasAnsweredPriceTier: false,
  hasAnsweredRoutineFitback: false,
  hasSeenProductsScrollHint: false,

  // v7.7 scan analyzing
  inFlightScan: null as InFlightScan | null,
  latestResult: null as ScanResult | null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...blankState,
      ...emptyTransient,

      hasOnboarded: () => !!get().user,

      completeOnboarding: (user) =>
        set({ user, scans: [], routine: [], matches: [], wishlist: [], messages: [] }),

      addScan: (scan) =>
        set((s) => {
          const nextScans = [...s.scans, scan];
          const routine = s.routine.length > 0 ? s.routine : seedRoutine.map(resetCompletedBeforeToday);
          const matches = s.matches.length > 0 ? s.matches : seedMatches;
          return { scans: nextScans, routine, matches };
        }),

      markStepDone: (stepId) =>
        set((s) => ({
          routine: s.routine.map((step) =>
            step.id === stepId ? { ...step, completedAt: new Date().toISOString() } : step
          ),
        })),

      resetStep: (stepId) =>
        set((s) => ({
          routine: s.routine.map((step) =>
            step.id === stepId ? { ...step, completedAt: null } : step
          ),
        })),

      toggleWishlist: (productId) =>
        set((s) => ({
          wishlist: s.wishlist.includes(productId)
            ? s.wishlist.filter((id) => id !== productId)
            : [...s.wishlist, productId],
        })),

      pushUserMessage: (text, attachedProductIds) => {
        const msg: AssistantMessage = {
          id: `m-${Date.now()}-u`,
          role: 'user',
          text,
          attachedProductIds,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ messages: [...s.messages, msg] }));
        return msg;
      },

      sendMessage: async (text, attachedProductIds) => {
        get().pushUserMessage(text, attachedProductIds);
        set({ assistantTyping: true });
        try {
          const scans = get().scans;
          const latestScan = scans[scans.length - 1];
          const reply = await askAssistant({
            text,
            attachedProductIds,
            latestScan,
            messageId: `m-${Date.now()}-a`,
          });
          set((s) => ({ messages: [...s.messages, reply] }));
        } finally {
          set({ assistantTyping: false });
        }
      },

      setAppearance: (mode) => set({ appearance: mode }),
      setHasSeenScanTutorial: (seen) => set({ hasSeenScanTutorial: seen }),

      setName: (name) => set({ name }),
      setAge: (age) => set({ age }),
      setGender: (gender) => set({ gender }),
      setSkinType: (skinType) => set({ skinType }),
      setConcerns: (concerns) => set({ concerns }),
      setSensitivity: (sensitivity) => set({ sensitivity }),
      setSunExposure: (sunExposure) => set({ sunExposure }),
      setEffort: (effort) => set({ effort }),
      setGoal: (goal) => set({ goal }),
      setAttribution: (attribution) => set({ attribution }),
      setSubscriptionStatus: (subscriptionStatus) => set({ subscriptionStatus }),
      setHasAskedForReview: (hasAskedForReview) => set({ hasAskedForReview }),
      setCameraDenied: (cameraDenied) => set({ cameraDenied }),

      setContextualTodayNote: (contextualTodayNote) => set({ contextualTodayNote }),
      setPriceTier: (priceTier) => set({ priceTier }),
      setRoutineFitback: (routineFitback) => set({ routineFitback }),
      setHasAnsweredTodayContext: (hasAnsweredTodayContext) => set({ hasAnsweredTodayContext }),
      setHasAnsweredPriceTier: (hasAnsweredPriceTier) => set({ hasAnsweredPriceTier }),
      setHasAnsweredRoutineFitback: (hasAnsweredRoutineFitback) => set({ hasAnsweredRoutineFitback }),
      setHasSeenProductsScrollHint: (hasSeenProductsScrollHint) => set({ hasSeenProductsScrollHint }),

      // ---------- v7.7 scan analyzing actions ----------
      startScan: (photoUri) =>
        set({
          inFlightScan: { photoUri, startedAt: Date.now() },
        }),

      setScanResult: (result) =>
        set((s) => ({
          latestResult: {
            ...result,
            scanCount: s.scans.length + 1,
          },
        })),

      setCompositePhoto: (uri) =>
        set((s) =>
          s.latestResult
            ? { latestResult: { ...s.latestResult, compositePhotoUri: uri } }
            : s
        ),

      clearInFlightScan: () => set({ inFlightScan: null }),

      finishOnboarding: () => {
        const s = get();
        const rawName = (s.name ?? '').trim();
        const safeName = rawName.length > 0 ? rawName : 'You';
        const initials = safeName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
        const user: User = {
          id: s.user?.id ?? `u-${Date.now()}`,
          name: safeName,
          initials,
          avatarColor: s.user?.avatarColor ?? '#C65D48',
          joinedAt: s.user?.joinedAt ?? new Date().toISOString(),
        };
        set({ user, onboardingComplete: true });
      },

      devLoadPopulated: () =>
        set({
          user: seedUserPopulated,
          scans: seedScans,
          routine: seedRoutine,
          matches: seedMatches,
          wishlist: [],
          messages: [],
          onboardingComplete: true,
          name: seedUserPopulated.name,
          skinType: 'combination',
          concerns: ['Breakouts', 'Redness'],
          sensitivity: 'somewhat',
          sunExposure: 'sometimes',
          effort: 'moderate',
          goal: 'clear',
        }),

      devResetToNewUser: () =>
        set({
          user: seedUserNew,
          scans: [],
          routine: [],
          matches: [],
          wishlist: [],
          messages: [],
          onboardingComplete: true,
          name: seedUserNew.name,
        }),

      devWipeAll: () => set({ ...blankState }),
    }),
    {
      name: 'pura-app-state-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        scans: state.scans,
        routine: state.routine,
        matches: state.matches,
        wishlist: state.wishlist,
        messages: state.messages,
        appearance: state.appearance,
        hasSeenScanTutorial: state.hasSeenScanTutorial,
        onboardingComplete: state.onboardingComplete,
        name: state.name,
        age: state.age,
        gender: state.gender,
        skinType: state.skinType,
        concerns: state.concerns,
        sensitivity: state.sensitivity,
        sunExposure: state.sunExposure,
        effort: state.effort,
        goal: state.goal,
        attribution: state.attribution,
        subscriptionStatus: state.subscriptionStatus,
        hasAskedForReview: state.hasAskedForReview,
        cameraDenied: state.cameraDenied,
        contextualTodayNote: state.contextualTodayNote,
        priceTier: state.priceTier,
        routineFitback: state.routineFitback,
        hasAnsweredTodayContext: state.hasAnsweredTodayContext,
        hasAnsweredPriceTier: state.hasAnsweredPriceTier,
        hasAnsweredRoutineFitback: state.hasAnsweredRoutineFitback,
        hasSeenProductsScrollHint: state.hasSeenProductsScrollHint,
        // v7.7 — persist the last reveal so returning users re-enter the
        // results screens cleanly. `inFlightScan` is explicitly NOT persisted:
        // a half-run choreography should never survive app kill.
        latestResult: state.latestResult,
      }),
    }
  )
);

function resetCompletedBeforeToday(step: RoutineStep): RoutineStep {
  if (!step.completedAt) return step;
  const completed = new Date(step.completedAt);
  const today = new Date();
  if (
    completed.getFullYear() === today.getFullYear() &&
    completed.getMonth() === today.getMonth() &&
    completed.getDate() === today.getDate()
  ) {
    return step;
  }
  return { ...step, completedAt: null };
}

// -----------------------------------------------------------------------------
// Routine selectors.
//
// `selectNextMorningStep` is safe to pass to `useAppStore(...)` because its
// terminal `.find()` returns an existing RoutineStep reference from the store
// array — if `s.routine` doesn't change, successive calls return the SAME
// reference, so useSyncExternalStore's snapshot check is a no-op.
//
// The previous `selectMorningRoutine / selectEveningRoutine / selectMorning-
// Progress / selectEveningProgress` helpers returned fresh arrays / objects on
// every call and caused a getSnapshot infinite loop when passed as Zustand
// selectors. They were removed — derive lengths/arrays in-component with a
// primitive selector (`s => s.routine.filter(...).length`) or select the raw
// `s.routine` once and derive with `useMemo`.
// -----------------------------------------------------------------------------
export const selectNextMorningStep = (s: AppState) =>
  s.routine
    .filter((r) => r.slot === 'morning')
    .sort((a, b) => a.order - b.order)
    .find((r) => !r.completedAt);


// ============================================================================
// Derived hooks â€” exported from the store directly so every import path works.
// These DO NOT live inside state (to avoid infinite getSnapshot loops).
// ============================================================================
import { useMemo as __useMemo } from 'react';
import { useShallow as __useShallow } from 'zustand/react/shallow';

export const useScans       = () => useAppStore((s) => s.scans);
export const useUser        = () => useAppStore((s) => s.user);
export const useRoutine     = () => useAppStore((s) => s.routine);
export const useMatches     = () => useAppStore((s) => s.matches);
export const useWishlist    = () => useAppStore((s) => s.wishlist);
export const useMessages    = () => useAppStore((s) => s.messages);
export const useAppearance  = () => useAppStore((s) => s.appearance);
export const useHasSeenScanTutorial = () => useAppStore((s) => s.hasSeenScanTutorial);
export const useOnboardingComplete  = () => useAppStore((s) => s.onboardingComplete);
export const useAssistantTyping     = () => useAppStore((s) => s.assistantTyping);

export const useActions = () =>
  useAppStore(
    __useShallow((s) => ({
      completeOnboarding: s.completeOnboarding,
      addScan: s.addScan,
      markStepDone: s.markStepDone,
      resetStep: s.resetStep,
      toggleWishlist: s.toggleWishlist,
      pushUserMessage: s.pushUserMessage,
      sendMessage: s.sendMessage,
      setAppearance: s.setAppearance,
      setHasSeenScanTutorial: s.setHasSeenScanTutorial,
      finishOnboarding: s.finishOnboarding,
      devLoadPopulated: s.devLoadPopulated,
      devResetToNewUser: s.devResetToNewUser,
      devWipeAll: s.devWipeAll,
    }))
  );

export const useHasScanned = () => {
  const scans = useScans();
  return scans.length > 0;
};

export const useLatestScan = () => {
  const scans = useScans();
  return __useMemo(() => scans[scans.length - 1], [scans]);
};

export const useFirstScan = () => {
  const scans = useScans();
  return __useMemo(() => scans[0], [scans]);
};

export const useDayNumber = () => {
  const scans = useScans();
  return __useMemo(() => {
    if (!scans.length) return 0;
    const first: any = scans[0];
    const stamp = first.capturedAt ?? first.createdAt;
    if (!stamp) return 1;
    const diff = Date.now() - new Date(stamp).getTime();
    return Math.max(1, Math.floor(diff / 86400000) + 1);
  }, [scans]);
};

export const useStreakDays      = () => useDayNumber();
export const useCyclePercent    = () => {
  const day = useDayNumber();
  return Math.min(100, Math.round((day / 84) * 100));
};
export const useProgressPercent = () => useCyclePercent();

// ---------- v7.7 scan analyzing selector hooks ----------
// These mirror the spec's `useSkinStore` API so call sites read as the spec
// prescribes without the store having to be a separate slice.

export const useInFlightScan = () => useAppStore((s) => s.inFlightScan);
export const useLatestResult = () => useAppStore((s) => s.latestResult);
export const useScanCount    = () => useAppStore((s) => s.scans.length);

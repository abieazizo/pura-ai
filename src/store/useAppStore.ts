import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { askAssistant } from '@/api';
import { palette } from '@/theme';
import {
  seedScans,
  seedUserNew,
  seedUserPopulated,
} from '@/data/seed';
import type {
  AssistantMessage,
  InFlightScan,
  Scan,
  ScanResult,
  User,
} from '@/types';

export type AppearanceMode = 'light' | 'dark' | 'system';

export interface AppState {
  user: User | null;
  scans: Scan[];
  /** v10.13 — user-built routine: product ids placed into morning and
   *  evening. Managed by AddToRoutineSheet's add/remove/move actions.
   *  "Saved" is the existing `wishlist`.
   *
   *  v10.14 — the previous rich `routine: RoutineStep[]` field (plus
   *  `markStepDone` / `resetStep` / `seedRoutine` / related selectors)
   *  was removed: every consumer had been migrated onto the slot
   *  arrays below, leaving the old shape as dead code that only
   *  bloated persisted storage and made the routine system confusing
   *  to reason about. This pair + `wishlist` is now the single source
   *  of truth for everything the user-facing Routine sub-tab reads. */
  userRoutineMorning: string[];
  userRoutineEvening: string[];
  /** v10.15 — `matches: ProductMatch[]` field removed. Was hydrated
   *  from `seedMatches` on first scan, persisted, and exported via
   *  `useMatches()`, but had zero UI consumers after v10+ product
   *  recommendation surfaces (BestForYouLead, CategoryFeed, ProductRow)
   *  migrated onto `getBestForYou()` which sorts `seedProducts` by their
   *  enriched `matchScore` directly. `seedMatches` is preserved in
   *  `data/seed.ts` because it still drives product enrichment via
   *  `_matchPercentByProductId` → `matchScoreFor(...)`; the store-level
   *  shadow of it was the dead part. */
  wishlist: string[];
  messages: AssistantMessage[];
  appearance: AppearanceMode;
  hasSeenScanTutorial: boolean;
  /** v10.11 — true once we've asked the OS for notification permission.
   *  The first add-to-morning/evening from AddToRoutineSheet triggers
   *  the contextual request, then this flag prevents re-prompting. */
  hasPromptedNotifications: boolean;

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
  toggleWishlist: (productId: string) => void;
  pushUserMessage: (text: string, attachedProductIds?: string[]) => AssistantMessage;
  sendMessage: (text: string, attachedProductIds?: string[]) => Promise<void>;
  setAppearance: (mode: AppearanceMode) => void;
  setHasSeenScanTutorial: (seen: boolean) => void;
  setHasPromptedNotifications: (prompted: boolean) => void;
  /** v10.13 — user-routine actions. Idempotent (no-op if productId is
   *  already in the target slot); moving from one slot to another is
   *  explicit via `moveUserRoutineProduct`. */
  addUserRoutineProduct: (slot: 'morning' | 'evening', productId: string) => void;
  removeUserRoutineProduct: (slot: 'morning' | 'evening', productId: string) => void;
  moveUserRoutineProduct: (productId: string, to: 'morning' | 'evening') => void;

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
  userRoutineMorning: [] as string[],
  userRoutineEvening: [] as string[],
  wishlist: [] as string[],
  messages: [] as AssistantMessage[],
  appearance: 'light' as AppearanceMode,
  hasSeenScanTutorial: false,
  hasPromptedNotifications: false,
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
        set({ user, scans: [], wishlist: [], messages: [] }),

      // v10.14 — `addScan` stopped hydrating the legacy RoutineStep[]
      // from `seedRoutine` on first scan.
      // v10.15 — also stopped shadowing `seedMatches` into a store
      // field. Product recommendations sort `seedProducts` by their
      // enriched `matchScore` directly (via `getBestForYou()` and
      // friends), so the store no longer needs a matches field.
      addScan: (scan) =>
        set((s) => ({ scans: [...s.scans, scan] })),

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
      setHasPromptedNotifications: (prompted) =>
        set({ hasPromptedNotifications: prompted }),

      addUserRoutineProduct: (slot, productId) =>
        set((state) => {
          const key = slot === 'morning' ? 'userRoutineMorning' : 'userRoutineEvening';
          const current = state[key];
          if (current.includes(productId)) return state;
          return { ...state, [key]: [...current, productId] };
        }),

      removeUserRoutineProduct: (slot, productId) =>
        set((state) => {
          const key = slot === 'morning' ? 'userRoutineMorning' : 'userRoutineEvening';
          return { ...state, [key]: state[key].filter((id) => id !== productId) };
        }),

      moveUserRoutineProduct: (productId, to) =>
        set((state) => {
          const fromMorning = state.userRoutineMorning.includes(productId);
          const fromEvening = state.userRoutineEvening.includes(productId);
          const nextMorning =
            to === 'morning'
              ? fromMorning
                ? state.userRoutineMorning
                : [...state.userRoutineMorning, productId]
              : state.userRoutineMorning.filter((id) => id !== productId);
          const nextEvening =
            to === 'evening'
              ? fromEvening
                ? state.userRoutineEvening
                : [...state.userRoutineEvening, productId]
              : state.userRoutineEvening.filter((id) => id !== productId);
          return {
            ...state,
            userRoutineMorning: nextMorning,
            userRoutineEvening: nextEvening,
          };
        }),

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
          avatarColor: s.user?.avatarColor ?? palette.clay,
          joinedAt: s.user?.joinedAt ?? new Date().toISOString(),
        };
        set({ user, onboardingComplete: true });
      },

      devLoadPopulated: () =>
        set({
          user: seedUserPopulated,
          scans: seedScans,
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
        userRoutineMorning: state.userRoutineMorning,
        userRoutineEvening: state.userRoutineEvening,
        wishlist: state.wishlist,
        messages: state.messages,
        appearance: state.appearance,
        hasSeenScanTutorial: state.hasSeenScanTutorial,
        hasPromptedNotifications: state.hasPromptedNotifications,
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

// v10.14 — `resetCompletedBeforeToday` helper + `selectNextMorningStep`
// selector + `useRoutine` / `useActions` hooks were all removed.
// They all operated on the legacy `routine: RoutineStep[]` field,
// which no user-facing surface reads after v10.13. The new
// `userRoutineMorning` / `userRoutineEvening` arrays are consumed
// directly in RoutineScreen via `useShallow`, no dedicated hooks
// needed.

// ============================================================================
// Derived hooks — exported from the store directly so every import path works.
// These DO NOT live inside state (to avoid infinite getSnapshot loops).
// ============================================================================
import { useMemo as __useMemo } from 'react';

export const useScans       = () => useAppStore((s) => s.scans);
export const useUser        = () => useAppStore((s) => s.user);
export const useWishlist    = () => useAppStore((s) => s.wishlist);
export const useMessages    = () => useAppStore((s) => s.messages);
export const useAppearance  = () => useAppStore((s) => s.appearance);
export const useHasSeenScanTutorial = () => useAppStore((s) => s.hasSeenScanTutorial);
export const useOnboardingComplete  = () => useAppStore((s) => s.onboardingComplete);
export const useAssistantTyping     = () => useAppStore((s) => s.assistantTyping);

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

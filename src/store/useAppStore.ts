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
import type {
  LiveProductCandidate,
  ProductIdentity,
  ProductMatch,
  ProgressExplanation,
  RoutineRecommendation,
  SearchSuggestionResult,
  SkinScoreExplanation,
} from '@/ai/ai-contracts';

export type AppearanceMode = 'light' | 'dark' | 'system';

/**
 * v18.9 — Skin conditions enum. Captures the conditions that
 * meaningfully change recommendation policy. "other" lets the user
 * mark something not in the list without forcing a free-text field
 * the AI can't reliably reason about.
 */
export type SkinCondition =
  | 'rosacea'
  | 'eczema'
  | 'dermatitis'
  | 'psoriasis'
  | 'acne_treatment'
  | 'melasma'
  | 'other';

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

  /**
   * v18.9 — Safety profile.
   *
   * Structured medical-adjacent flags the user can opt into during
   * onboarding (or update later from Profile > Safety preferences).
   * EVERY field defaults to a neutral "unknown" / empty so users who
   * never answer them get the standard recommendation experience.
   *
   * The profile is consulted by:
   *   • api/products.matchProductsForUser   (skinStateSummary)
   *   • api/products.getRoutineRecommendation (routine bias)
   *   • api/liveProducts.lookupForScan      (server prompt)
   *   • api/assistant                        (assistant grounding)
   *   • api/searchProducts                   (when scan + safety
   *                                           context attached)
   *
   * Wired via `buildSafetyProfile()` in src/utils/safetyProfile.ts
   * which reduces these fields to a derived `bias` signal the
   * server prompts read directly.
   */
  skinConditions: SkinCondition[];
  prescriptionFlag: 'yes' | 'no' | 'prefer-not-to-say' | null;
  fragranceSensitive: 'yes' | 'no' | 'unsure' | null;
  activeIrritation: 'yes' | 'no' | null;
  pregnancyCaution: 'yes' | 'no' | 'prefer-not-to-say' | null;
  avoidIngredients: string[];

  hasSeenProductsScrollHint: boolean;

  /**
   * v19.11 — Lighting Assist preference for the front-camera face
   * scan flow. When true, the ScanCaptureScreen renders a soft
   * white halo overlay around the camera preview that acts as a
   * screen-based ring light, materially improving facial
   * illumination for capturing redness, texture, and breakouts.
   * Persisted so users who like it don't have to re-enable on
   * every scan.
   */
  lightingAssistEnabled: boolean;

  // v7.7 — scan analyzing choreography state. Transient except for
  // `latestResult`, which is persisted so returning users can see their last
  // reveal if they re-enter the stack without re-scanning.
  inFlightScan: InFlightScan | null;
  latestResult: ScanResult | null;

  /**
   * v10.22 — AI-derived state hydrated by the post-scan composite
   * (analyzeFaceScan -> matchProductsForUser + explainSkinScore ->
   * generateRoutineRecommendation). Persisted so the app stays AI-
   * powered across cold starts even when the device is offline.
   *
   * `aiTopMatches` reorders the Products grid + Home pick.
   * `aiRoutine` powers the TODAY focus card and the routine plan.
   * `aiSearchSuggestions` powers the AISearchBar placeholder + chips.
   * `aiActiveProductIdentity` is set transiently when the user has
   * scanned a product image / barcode and the AssistantContext should
   * include it on its next answer.
   */
  aiTopMatches: ProductMatch[];
  aiRoutine: RoutineRecommendation | null;
  aiSearchSuggestions: SearchSuggestionResult | null;
  aiActiveProductIdentity: ProductIdentity | null;
  /**
   * v18.1 — Live product cache.
   *
   * Every `LiveProductCandidate` surfaced anywhere in the app gets
   * cached here by id. The cache lets ProductDetail resolve a
   * candidate by id (e.g. when the user taps a hero card on the
   * scan result and we navigate to detail), and lets components
   * across screens share the same live data without each one
   * firing its own AI call.
   *
   * Keyed by candidate.id (a stable AI-generated slug like
   * "the-ordinary-niacinamide-10-zinc-1"). Non-persisted —
   * regenerated per session by the live retrieval path.
   */
  liveProductsById: Record<string, LiveProductCandidate>;
  /** v10.26 — AI-derived progress narrative + score explanation,
   *  hydrated by `getProgressBundle()` (api/progress.ts) on Progress
   *  sub-tab mount. Surfaces in RoutineScreen's Progress segment as
   *  the lead narrative (replaces deterministic ProgressNarrative
   *  content) and the SkinScoreHero coach line. */
  aiProgress: ProgressExplanation | null;
  aiScoreExplanation: SkinScoreExplanation | null;

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
  /** v19.11 — front-camera lighting assist toggle. */
  setLightingAssistEnabled: (enabled: boolean) => void;

  // v7.7 scan analyzing
  startScan: (photoUri: string) => void;
  setScanResult: (result: Omit<ScanResult, 'scanCount'>) => void;
  setCompositePhoto: (uri: string) => void;
  clearInFlightScan: () => void;

  // v10.22 AI hydration setters — called by api/scan + api/products
  // when the AI gateway returns structured output.
  setAiTopMatches: (matches: ProductMatch[]) => void;
  setAiRoutine: (routine: RoutineRecommendation | null) => void;
  setAiSearchSuggestions: (s: SearchSuggestionResult | null) => void;
  setAiActiveProductIdentity: (i: ProductIdentity | null) => void;
  setAiProgressBundle: (
    progress: ProgressExplanation | null,
    score: SkinScoreExplanation | null
  ) => void;
  /**
   * v18.1 — write a live product candidate (or batch) to the
   * shared cache. Every retrieval call in `src/api/liveProducts.ts`
   * funnels through this so any screen that surfaces a candidate
   * also makes it resolvable by id.
   */
  cacheLiveProducts: (candidates: LiveProductCandidate[]) => void;

  /**
   * v18.9 — safety profile setters. Called by the new Safety
   * preferences panel in onboarding / Profile.
   */
  setSkinConditions: (next: SkinCondition[]) => void;
  setPrescriptionFlag: (v: AppState['prescriptionFlag']) => void;
  setFragranceSensitive: (v: AppState['fragranceSensitive']) => void;
  setActiveIrritation: (v: AppState['activeIrritation']) => void;
  setPregnancyCaution: (v: AppState['pregnancyCaution']) => void;
  setAvoidIngredients: (next: string[]) => void;

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

  // v19.11 — Lighting Assist defaults to OFF. The user opts in
  // explicitly from the scan UI; the preference persists from
  // there.
  lightingAssistEnabled: false,

  // v18.9 — safety profile defaults: every field neutral so users
  // who never opt in get the standard recommendation experience.
  skinConditions: [] as SkinCondition[],
  prescriptionFlag: null as AppState['prescriptionFlag'],
  fragranceSensitive: null as AppState['fragranceSensitive'],
  activeIrritation: null as AppState['activeIrritation'],
  pregnancyCaution: null as AppState['pregnancyCaution'],
  avoidIngredients: [] as string[],

  // v7.7 scan analyzing
  inFlightScan: null as InFlightScan | null,
  latestResult: null as ScanResult | null,

  // v10.22 AI-derived state
  aiTopMatches: [] as ProductMatch[],
  aiRoutine: null as RoutineRecommendation | null,
  aiSearchSuggestions: null as SearchSuggestionResult | null,
  aiActiveProductIdentity: null as ProductIdentity | null,

  // v18.1 — live product cache. Non-persisted; rebuilt per session
  // by every call into src/api/liveProducts.ts.
  liveProductsById: {} as Record<string, LiveProductCandidate>,

  // v10.26 AI progress hydration
  aiProgress: null as ProgressExplanation | null,
  aiScoreExplanation: null as SkinScoreExplanation | null,
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
      // v10.22 — when the scan carries an AI analysis, kick off the
      // post-scan composite (matching + routine + search suggestions)
      // in the background so the rest of the app has AI-derived
      // hydration ready when the user navigates around. Fires
      // fire-and-forget; failures are swallowed (the helpers fall
      // back to deterministic ordering / templates).
      addScan: (scan) => {
        set((s) => ({ scans: [...s.scans, scan] }));
        // v13.1 — fire the product matcher for EVERY new scan, not
        // only AI-driven ones. The matcher's deterministic fallback
        // (api/products.ts::buildDeterministicMatches) works against
        // `scan.concerns` so it produces a realistic ranking even
        // when AI is offline. Previously this was gated on
        // `scan.aiAnalysis` so non-AI scans left aiTopMatches empty,
        // which made the result screen + Products tab look
        // demo-heavy.
        Promise.resolve().then(async () => {
          try {
            const products = await import('@/api/products');
            await products.getMatchedProductsForUser({
              userId: 'current_user',
              basedOnScanId: scan.id,
            });
          } catch {
            /* swallowed — helpers fall back to seeded order */
          }
          // The branch below (search suggestions + routine recommendation)
          // remains AI-gated because those calls are pure-AI.
          if (!scan.aiAnalysis) return;
            try {
              const products = await import('@/api/products');
              await products.getSearchSuggestions('products');
            } catch {
              /* swallowed — AISearchBar uses its default placeholder */
            }
            try {
              const ai = await import('@/ai/aiGateway');
              const tel = await import('@/ai/aiTelemetry');
              if (!ai.aiGateway.isAvailable()) {
                tel.aiTelemetry.setFeatureSource(
                  'routine',
                  'fallback',
                  'no AI proxy configured; routine card falls back to deterministic tonight-focus'
                );
                return;
              }
              const a = scan.aiAnalysis!;
              const matchedProducts = get().aiTopMatches;
              const matchedProductsJson = JSON.stringify({
                matches: matchedProducts,
              });
              const existingRoutineJson = JSON.stringify({
                morning: get().userRoutineMorning,
                evening: get().userRoutineEvening,
                saved: get().wishlist,
              });
              const scanSummary = JSON.stringify({
                skin_score: a.skin_score,
                primary_concern: a.primary_concern,
                secondary_concerns: a.secondary_concerns,
                findings: a.findings,
                score_factors: a.score_factors,
                plan_inputs: a.plan_inputs,
              });
              const routine = await ai.aiGateway.generateRoutineRecommendation({
                scanSummary,
                matchedProductsJson,
                existingRoutineJson,
                basedOnScanId: scan.id,
              });
              set({ aiRoutine: routine });
              tel.aiTelemetry.setFeatureSource(
                'routine',
                'ai',
                `AI routine generated: ${routine.morning.length} morning + ${routine.evening.length} evening steps`
              );
            } catch {
              /* swallowed — TODAY focus card falls back to buildTonightFocus */
              try {
                const tel = await import('@/ai/aiTelemetry');
                tel.aiTelemetry.countFallback('generateRoutineRecommendation');
                tel.aiTelemetry.setFeatureSource(
                  'routine',
                  'fallback',
                  'AI routine call failed; deterministic tonight-focus used'
                );
              } catch {
                /* swallow */
              }
            }
          });
      },

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
      // v19.11 — Lighting Assist setter.
      setLightingAssistEnabled: (lightingAssistEnabled) =>
        set({ lightingAssistEnabled }),

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

      // v10.22 — AI hydration setters. Called from api/scan +
      // api/products after the AI gateway returns structured output.
      setAiTopMatches: (matches) => set({ aiTopMatches: matches }),
      setAiRoutine: (routine) => set({ aiRoutine: routine }),
      setAiSearchSuggestions: (s) => set({ aiSearchSuggestions: s }),
      setAiActiveProductIdentity: (i) =>
        set({ aiActiveProductIdentity: i }),
      setAiProgressBundle: (progress, score) =>
        set({ aiProgress: progress, aiScoreExplanation: score }),

      // v18.1 — merge incoming live candidates into the cache. Used
      // by every retrieval flow in src/api/liveProducts.ts so any
      // surface that displays a candidate also makes it resolvable
      // by id from any other surface.
      cacheLiveProducts: (candidates) =>
        set((state) => {
          if (candidates.length === 0) return state;
          const next = { ...state.liveProductsById };
          for (const c of candidates) {
            next[c.id] = c;
          }
          return { liveProductsById: next };
        }),

      // v18.9 — safety profile setters.
      setSkinConditions: (next) => set({ skinConditions: next }),
      setPrescriptionFlag: (v) => set({ prescriptionFlag: v }),
      setFragranceSensitive: (v) => set({ fragranceSensitive: v }),
      setActiveIrritation: (v) => set({ activeIrritation: v }),
      setPregnancyCaution: (v) => set({ pregnancyCaution: v }),
      setAvoidIngredients: (next) => set({ avoidIngredients: next }),

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
        // v19.11 — persist Lighting Assist so opting in once
        // carries across sessions.
        lightingAssistEnabled: state.lightingAssistEnabled,

        // v18.9 — persist the safety profile so flagged users keep
        // gentler recommendations across sessions.
        skinConditions: state.skinConditions,
        prescriptionFlag: state.prescriptionFlag,
        fragranceSensitive: state.fragranceSensitive,
        activeIrritation: state.activeIrritation,
        pregnancyCaution: state.pregnancyCaution,
        avoidIngredients: state.avoidIngredients,
        // v7.7 — persist the last reveal so returning users re-enter the
        // results screens cleanly. `inFlightScan` is explicitly NOT persisted:
        // a half-run choreography should never survive app kill.
        latestResult: state.latestResult,

        // v10.22 — persist AI hydration so the app stays AI-powered
        // across cold starts even when offline. Active product
        // identity is intentionally NOT persisted — it's tied to a
        // single transient scan/barcode session.
        aiTopMatches: state.aiTopMatches,
        aiRoutine: state.aiRoutine,
        aiSearchSuggestions: state.aiSearchSuggestions,
        aiProgress: state.aiProgress,
        aiScoreExplanation: state.aiScoreExplanation,

        // v18.4 — persist the live product cache so AI-retrieved
        // products attached to the user's routine, wishlist, or
        // chat history still resolve after a cold start. Without
        // this, a routine item with a live id ("the-ordinary-
        // niacinamide-10-zinc-1") would orphan because the in-
        // memory cache empties on app kill. The cache may grow
        // over a session; a future pass can prune entries older
        // than 30 days.
        liveProductsById: state.liveProductsById,
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

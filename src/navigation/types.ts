import type { Product, ProductTint } from '@/types';
import type { BarcodeResolution, LiveProductCandidate } from '@/ai/ai-contracts';

export type ProductsRowKind =
  | 'best-for-you'
  | 'best-overall'
  | 'natural'
  | 'new'
  | 'essentials';

/**
 * Question-first onboarding. The active arc is the questionnaire:
 * Splash → AuthChoice → Ask* → Processing → ProfileSummary → Tutorial,
 * which then hands off into the scan camera. Returning users take
 * Splash → SignIn → Tabs.
 *
 * Routes whose screens still exist on disk but are not mounted are kept
 * in the legacy section below for type back-compat. DO NOT navigate to
 * them from new code.
 */
export type OnboardingStackParamList = {
  // ---- Active question-first arc ----
  Splash: undefined;
  AuthChoice: undefined;
  /** Returning-user provider sign-in. */
  SignIn: undefined;
  AskName: undefined;
  AskAge: undefined;
  AskGender: undefined;
  AskSkinType: undefined;
  AskConcerns: undefined;
  AskSensitivity: undefined;
  AskSunExposure: undefined;
  AskEffort: undefined;
  AskGoal: undefined;
  AskAttribution: undefined;
  Processing: undefined;
  ProfileSummary: undefined;
  Tutorial: undefined;

  // ---- Kept on disk, not mounted (type back-compat only). DO NOT
  //      navigate to these from new code. ----
  Paywall: undefined;
  ReviewAsk: undefined;
  AskSkinBehavior: undefined;
  AskLifestyle: undefined;
  FirstScanInvitation: undefined;
  PlanReveal: undefined;
  // Scan-first (V2) survivors — unreachable. The 7 mounted V2 screens
  // (Welcome / CameraTrust / GuidedFirstScan / ScanReview / BaselineReveal
  // / TonightRoutine / SaveProgress) were deleted when the questionnaire
  // was restored.
  PrimaryGoalV2: undefined;
  ProcessingV2: undefined;
  SafetyCalibrationV2: undefined;
  RoutineSimplicityV2: undefined;
  PlanRevealV2: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  ScanTab: undefined;       // routes to ScanModal via tabPress listener
  ProductsTab: undefined;
  /** v10.11 — RoutineTab replaces the floating ProgressTab. Progress
   *  content is now embedded inside Routine so the user's daily action
   *  center (morning / evening / saved) and long-term trajectory live
   *  in one destination. */
  RoutineTab: undefined;
  /**
   * v29 — AI Assist no longer occupies a visible slot in the floating
   * dock; it lives behind the Me tab (the MeScreen surfaces a
   * prominent AI Assist row). The route stays registered here so
   * every existing `navigate('Tabs', { screen: 'AssistantTab' })`
   * call (Home command center, Routine helper, scan result follow-ups)
   * keeps working — the dock just doesn't render a tile for it.
   */
  AssistantTab: undefined;
  /** v29 — Me tab. Profile, AI Assist entry point, saved, settings. */
  MeTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  /** Full-screen "What should I do now?" plan (v9.1). */
  Plan: undefined;
  /** Routine is an internal destination (not a primary tab) as of v9.1. */
  Routine: undefined;
  // Products discovery is ALSO reachable from Home even though it now has
  // its own primary tab — recommendations from Home should deep-link into
  // specific products without making the user detour to the Products tab.
  Products: undefined;
  /**
   * v19.37 — `liveCandidate` is the optional full payload the
   * tapped card carries with it. ProductDetail uses it as the
   * primary render source; `productId` + the store cache become
   * fallbacks. Without this, a tapped candidate that the engine
   * generated but the cache hasn't yet persisted (rare race) would
   * land on "Product not found".
   */
  ProductDetail: {
    productId: string;
    tint?: ProductTint;
    liveCandidate?: LiveProductCandidate;
  };
  CategoryView: { kind: ProductsRowKind };
  /** v38 — the editorial "Browse by concern" index reached from the
   *  shop's single quiet browse line. A neutral catalog table of
   *  contents (no personalization, no filter state). */
  ConcernIndex: undefined;
};

/**
 * Retained for backward compatibility with screens that imported this name;
 * the product routes now live inside `HomeStackParamList` instead.
 */
export type ProductsStackParamList = HomeStackParamList;

export type RoutineStackParamList = {
  Routine: undefined;
};

export type AssistantStackParamList = {
  Assistant: undefined;
};

export type ProgressStackParamList = {
  Progress: undefined;
};

/**
 * v10.32 — `barcode` joins `face` and `product`. The Reticle, ModeSelector,
 * and Caption already had a barcode rendering path baked in since v6 but
 * the type previously collapsed it to `product`, so the camera never
 * surfaced barcode detection. v10.32 wires the full path.
 */
export type ScanModalMode = 'face' | 'product' | 'barcode';

export type ScanStackParamList = {
  /** First-run tutorial. Conditionally initial when `hasSeenScanTutorial === false`. */
  ScanTutorial: undefined;
  ScanCapture: { initialMode?: ScanModalMode } | undefined;
  ScanAnalyzing: { photoUri: string; mode: 'face' | 'product' };
  ScanResultsFace: { scanId: string };
  /** v19.0 — Layer 2 of the result split. Reached from the Overview
   *  screen via "See full skin map". Renders the face-focused crop
   *  + concern chips + insight panel + premium overlay. */
  ScanResultDetail: { scanId: string };
  ScanResultsProduct: { product: Product; matchPercent: number };
  /** v10.32 — barcode lookup loading state. The screen kicks off the
   *  AI gateway call on mount and replaces itself with BarcodeResult
   *  on completion (success or fail). */
  BarcodeAnalyzing: { barcodeValue: string };
  /** v10.32 — barcode lookup result. Rendered for both the found and
   *  not-found cases; the resolution shape carries enough info to
   *  branch the UI. */
  BarcodeResult: {
    barcodeValue: string;
    resolution: BarcodeResolution | null;
  };
};

export type RootStackParamList = {
  Onboarding: undefined;
  Tabs: undefined;
  ScanModal: { initialMode?: ScanModalMode } | undefined;
  ProductDetailModal: { productId: string };
  /**
   * v32 — the Pura Assist conversation. A root-level route so it covers
   * the floating tab dock (the reference shows no tab bar in
   * conversation). Opened from the Home tab's input dock; `initialMessage`
   * optionally pre-sends a question (e.g. a deep link / quick action).
   */
  AssistChat: { initialMessage?: string } | undefined;
  /** v10.25 — dev-only AI status & smoke-test surface. Reachable by
   *  tapping the AISourceBadge that floats in dev builds. The route
   *  is registered unconditionally; in production no UI surfaces a
   *  link to it. */
  AIDiagnostics: undefined;
  /** Dev-only gallery rendering each scan-result state with fixtures.
   *  Reachable from AIDiagnostics; never linked from user surfaces. */
  ScanResultsStatesDev: undefined;
};

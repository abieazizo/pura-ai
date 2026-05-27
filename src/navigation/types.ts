import type { Product, ProductTint } from '@/types';
import type { BarcodeResolution, LiveProductCandidate } from '@/ai/ai-contracts';

export type ProductsRowKind =
  | 'best-for-you'
  | 'best-overall'
  | 'natural'
  | 'new'
  | 'essentials';

/**
 * v25 — scan-first onboarding. The questionnaire-first arc is gone.
 * The active stack carries only the routes the new flow needs.
 * Legacy routes (`Splash`, `AskGoal`, etc.) are listed here for
 * back-compat with deep-link callers; they are not reachable from the
 * navigator. New code should target the v25 routes.
 */
export type OnboardingStackParamList = {
  // ---- v25 scan-first arc ----
  WelcomeV2: undefined;
  /** Legacy goal-before-scan route. v29 moves goal selection into
   *  BaselineRevealV2 (after the scan). Kept in the param list so old
   *  navigation calls compile, but unreachable from the navigator. */
  PrimaryGoalV2: undefined;
  CameraTrustV2: undefined;
  GuidedFirstScanV2: undefined;
  /** v29 — capture review (rejected vs approved). */
  ScanReviewV2: undefined;
  /** v29 — superseded by ScanReviewV2 + BaselineRevealV2; kept for
   *  back-compat type-checking, no longer mounted. */
  ProcessingV2: undefined;
  BaselineRevealV2: undefined;
  /** v29 — collapsed into TonightRoutineV2's inline sensitivity row.
   *  Routes kept for type back-compat only. */
  SafetyCalibrationV2: undefined;
  RoutineSimplicityV2: undefined;
  PlanRevealV2: undefined;
  /** v29 — single climax screen replacing Safety + Simplicity + Plan. */
  TonightRoutineV2: undefined;
  SaveProgressV2: undefined;
  /** Returning-user provider sign-in. Reused from v20.0. */
  SignIn: undefined;

  // ---- Legacy routes (preserved for back-compat type-checking only;
  //      unreachable in the new navigator). DO NOT navigate to these
  //      from new code — they are scheduled for removal. ----
  Splash: undefined;
  AuthChoice: undefined;
  AskGoal: undefined;
  AskConcerns: undefined;
  AskSkinBehavior: undefined;
  AskSkinType: undefined;
  AskSensitivity: undefined;
  AskEffort: undefined;
  AskLifestyle: undefined;
  AskSunExposure: undefined;
  AskAge: undefined;
  Processing: undefined;
  FirstScanInvitation: undefined;
  PlanReveal: undefined;
  ProfileSummary: undefined;
  Paywall: undefined;
  Tutorial: undefined;
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
  ProfileSheet: undefined;
  ProductDetailModal: { productId: string };
  /** v10.25 — dev-only AI status & smoke-test surface. Reachable by
   *  tapping the AISourceBadge that floats in dev builds. The route
   *  is registered unconditionally; in production no UI surfaces a
   *  link to it. */
  AIDiagnostics: undefined;
  /** Dev-only gallery rendering each scan-result state with fixtures.
   *  Reachable from AIDiagnostics; never linked from user surfaces. */
  ScanResultsStatesDev: undefined;
};

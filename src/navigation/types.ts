import type { Product, ProductTint } from '@/types';

export type ProductsRowKind =
  | 'best-for-you'
  | 'best-overall'
  | 'natural'
  | 'new'
  | 'essentials';

export type OnboardingStackParamList = {
  Splash: undefined;
  /** v10.6 — new-user path: Apple / Google / Email + returning-user tail. */
  AuthChoice: undefined;
  /** v10.8 — returning-user path: provider sign-in + email/password entry. */
  SignIn: undefined;
  // v10.11 — CameraPrimer / CameraPermission removed from the stack.
  // Camera permission is now requested contextually inside
  // ScanCaptureScreen at the first capture attempt.
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
  // v10.11 — NotificationPrimer / NotificationPermission removed.
  // Notification permission is requested from AddToRoutineSheet the
  // first time a user schedules a routine step.
  ReviewAsk: undefined;
  Paywall: undefined;
  /** v10.7 — 3-page product walkthrough. Final onboarding step; its
   *  completion routes directly into the Scan modal, not Home. */
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
  AssistantTab: undefined;
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
  ProductDetail: { productId: string; tint?: ProductTint };
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

export type ScanModalMode = 'face' | 'product';

export type ScanStackParamList = {
  /** First-run tutorial. Conditionally initial when `hasSeenScanTutorial === false`. */
  ScanTutorial: undefined;
  ScanCapture: { initialMode?: ScanModalMode } | undefined;
  ScanAnalyzing: { photoUri: string; mode: ScanModalMode };
  ScanResultsFace: { scanId: string };
  ScanResultsProduct: { product: Product; matchPercent: number };
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
};

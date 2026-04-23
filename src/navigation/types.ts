import type { Product, ProductTint } from '@/types';

export type ProductsRowKind =
  | 'best-for-you'
  | 'best-overall'
  | 'natural'
  | 'new'
  | 'essentials';

export type OnboardingStackParamList = {
  Splash: undefined;
  /** v10.6 — Apple / Google / Email + Sign-in. Sits between Splash and CameraPrimer. */
  AuthChoice: undefined;
  CameraPrimer: undefined;
  CameraPermission: undefined;
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
  NotificationPrimer: undefined;
  NotificationPermission: undefined;
  ReviewAsk: undefined;
  Paywall: undefined;
  /** v10.6 — 3-page product walkthrough between Paywall and Welcome. */
  Tutorial: undefined;
  Welcome: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  ScanTab: undefined;       // routes to ScanModal via tabPress listener
  ProductsTab: undefined;   // v9.1 — replaces the RoutineTab slot
  ProgressTab: undefined;
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
};

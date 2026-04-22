import type { Product, ProductTint } from '@/types';

export type ProductsRowKind =
  | 'best-for-you'
  | 'best-overall'
  | 'natural'
  | 'new'
  | 'essentials';

export type OnboardingStackParamList = {
  Splash: undefined;
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
  Welcome: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  ScanTab: undefined;       // routes to ScanModal via tabPress listener
  RoutineTab: undefined;
  ProgressTab: undefined;
  AssistantTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  // Products discovery lives inside the Home stack now that Products is no
  // longer a primary tab — Home's recommendation module and category
  // destinations push into these routes.
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

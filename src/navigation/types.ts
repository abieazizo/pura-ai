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
  ProductsTab: undefined;
  AssistantTab: undefined;
  ProgressTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  ProductDetail: { productId: string; tint?: ProductTint };
  CategoryView: { kind: ProductsRowKind };
};

export type ProductsStackParamList = {
  Products: undefined;
  ProductDetail: { productId: string; tint?: ProductTint };
  CategoryView: { kind: ProductsRowKind };
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

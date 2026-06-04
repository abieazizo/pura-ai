import type { Product, ProductTint } from '@/types';
import type { BarcodeResolution, LiveProductCandidate } from '@/ai/ai-contracts';
import type { PillarSelection } from '@/types/routine';

export type ProductsRowKind =
  | 'best-for-you'
  | 'best-overall'
  | 'natural'
  | 'new'
  | 'essentials';

/**
 * Scan-first onboarding. Exactly three screens precede the camera:
 * Splash → AskName → CameraPrimer → CameraPermission, which hands off into
 * the scan camera (or CameraDenied on refusal). Returning users take
 * Splash → SignIn → Tabs.
 *
 * The questionnaire arc (AuthChoice / AskAge / AskGender / AskSkinType /
 * AskConcerns / AskSensitivity / AskSunExposure / AskEffort / AskGoal /
 * AskAttribution / Processing / ProfileSummary / Tutorial) and the dead
 * V1/V2 graveyard (Welcome, Paywall, ReviewAsk, AskSkinBehavior,
 * AskLifestyle, FirstScanInvitation, PlanReveal, NotificationPermission,
 * and the entire onboarding/v2 tree) were DELETED in the scan-first
 * rebuild — both their screen files and their routes. AuthChoice survives
 * off this stack: it is repurposed as the post-scan "Save your skin
 * profile" screen.
 */
export type OnboardingStackParamList = {
  // ---- Active scan-first arc (three screens before the camera) ----
  Splash: undefined;
  AskName: undefined;
  CameraPrimer: undefined;
  CameraPermission: undefined;
  CameraDenied: undefined;
  /** Returning-user provider sign-in. */
  SignIn: undefined;
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

/**
 * Me tab stack. The Me screen is the root; each ACCOUNT / SUPPORT row
 * pushes one of the settings destinations. Mounted as a nested stack
 * inside `MeTab` (see TabNavigator) so the floating dock — which keys
 * active state off the tab route name — stays correct while these push.
 */
export type MeStackParamList = {
  Me: undefined;
  SkinProfileSettings: undefined;
  NotificationSettings: undefined;
  PrivacySettings: undefined;
  AppearanceSettings: undefined;
  HelpSupport: undefined;
  About: undefined;
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
  ScanCapture: { initialMode?: ScanModalMode } | undefined;
  ScanAnalyzing: { photoUri: string; mode: 'face' | 'product' };
  ScanResultsFace: { scanId: string };
  /** Post-scan reveal arc (surfaces 2–6: Skin Map → Focus → Insights →
   *  Plan → Ready). The face analyze step hands off here instead of
   *  straight to ScanResultsFace; the host resolves the canonical
   *  SkinState from `scanId`. "Build my routine" advances to ScanCeremony;
   *  "Skip for now" / exit closes the modal (the scan is already saved). */
  ScanReveal: { scanId: string };
  /** Reveal-arc surface 6.5 — the pre-build pillar picker. The user
   *  chooses which of the four pillars to include before the ceremony.
   *  "Build my routine" on the Ready screen routes here; this screen's
   *  CTA carries the selection into ScanCeremony. */
  BuildRoutinePicker: { scanId: string };
  /** Reveal-arc surface 7 — the deterministic ~13s Build Ceremony. Commits
   *  the routine + flips routine lifecycle to 'active' internally, then
   *  hands off to the Routine tab (surface 8). `selection` filters which
   *  pillars are built/animated; omitted = all four. */
  ScanCeremony: { scanId: string; selection?: PillarSelection };
  /** Post-scan account save ("Save your skin profile"), offered once after
   *  the first scan completes. Renders the repurposed AuthChoice screen. */
  SaveProfile: undefined;
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
  /** Dev-only gallery for the post-scan reveal arc (screens 1–6). Param
   *  selects which surface to render pixel-clean for screenshots; absent =
   *  tappable index. Reachable from AIDiagnostics; never linked in prod. */
  ScanRevealDev: { surface?: 1 | 2 | 3 | 4 | 5 | 6 | 'pager' | 'picker' | 'ceremony' | 'routine' } | undefined;
};

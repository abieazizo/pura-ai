/**
 * v25 — representative fixtures for every reviewable state.
 *
 * These fixtures power the post-onboarding redesign while the real
 * backend wiring is mid-flight. The Pura store + AI pipeline remain
 * the source of truth in production; this module gives every state
 * variant something concrete to render so reviewers can verify the
 * visual + interactive design.
 */

import type {
  FailedScanAttempt,
  ReliableScan,
  RoutineStepV25,
  SavedProductV25,
  SkinSignal,
} from './types';

export const FIX_BASELINE_SCAN: ReliableScan = {
  id: 'scan-baseline',
  date: '2026-05-19',
  dayLabel: 'Day 1',
  skinScore: 60,
  reliability: 'reliable',
  comparisonEligible: true,
  visibleSignals: [],
};

export const FIX_LATEST_RELIABLE: ReliableScan = {
  id: 'scan-latest',
  date: '2026-05-22',
  dayLabel: 'Day 4',
  skinScore: 62,
  reliability: 'reliable',
  comparisonEligible: true,
  visibleSignals: [],
};

export const FIX_FAILED_TODAY: FailedScanAttempt = {
  id: 'scan-failed-today',
  date: '2026-05-23',
  reliability: 'failed-lighting',
  counted: false,
  failureMessage:
    'Lighting and framing prevented a reliable comparison.',
};

export const FIX_SIGNALS: SkinSignal[] = [
  {
    id: 'breakouts',
    label: 'Breakouts',
    status: 'focus',
    interpretation: 'Mild activity remains around your chin.',
    nextAction: 'Keep tonight’s routine gentle.',
  },
  {
    id: 'hydration',
    label: 'Hydration',
    status: 'improving',
    interpretation: 'Less visible dryness than your baseline scan.',
    nextAction: 'Continue moisturizing consistently.',
  },
  {
    id: 'texture',
    label: 'Texture',
    status: 'stable',
    interpretation: 'No meaningful change measured yet.',
    nextAction: 'Avoid adding exfoliation tonight.',
  },
  {
    id: 'dark-marks',
    label: 'Dark marks',
    status: 'need-more-data',
    interpretation: 'Not enough reliable scans to measure change.',
    nextAction: 'Apply SPF daily.',
  },
];

export const FIX_HISTORICAL_INSIGHTS = [
  {
    title: 'Chin area was active',
    body: 'Keep tonight gentle after your scan.',
    badge: 'focus' as const,
  },
  {
    title: 'Hydration was improving',
    body: 'Moisturizer was helping.',
    badge: 'improving' as const,
  },
  {
    title: 'Texture remained stable',
    body: 'No extra exfoliation was needed.',
    badge: 'stable' as const,
  },
];

export const FIX_PLAN_CHANGE_INSIGHTS = [
  {
    title: 'Chin area needs calming care',
    body: 'Mild activity is showing around the breakout-prone area.',
    badge: 'focus' as const,
  },
  {
    title: 'Hydration is holding steady',
    body: 'No widespread dryness in tonight’s scan.',
    badge: 'stable' as const,
  },
  {
    title: 'No added exfoliation tonight',
    body: 'Avoid layering strong actives on the active area.',
    badge: 'avoid-tonight' as const,
  },
];

export const FIX_SAVED_MOISTURIZER: SavedProductV25 = {
  id: 'cerave-moisturizing-cream',
  name: 'CeraVe Moisturizing Cream',
  category: 'Moisturizer',
  compatibility: 'safe',
  routineUsage: 'Used tonight',
  ingredients: ['Ceramides', 'Hyaluronic acid', 'Glycerin'],
  whyInRoutine:
    'This moisturizer supports barrier hydration without adding strong active ingredients while your chin is active.',
  compatibilityNotes: [
    'No conflicts found tonight',
    'Compatible with gentle cleanse',
    'Suitable for barrier support',
  ],
};

export const FIX_SAVED_CLEANSER: SavedProductV25 = {
  id: 'vanicream-cleanser',
  name: 'Vanicream Cleanser',
  category: 'Cleanser',
  compatibility: 'safe',
  routineUsage: 'Optional tonight',
  ingredients: ['Glycerin', 'Niacinamide'],
};

export const FIX_SAVED_HYDRATION_SERUM: SavedProductV25 = {
  id: 'hydrating-serum',
  name: 'Hydrating Serum',
  category: 'Hydration serum',
  compatibility: 'paused-tonight',
  routineUsage: 'Not needed tonight',
};

export const FIX_CONFLICT_PRODUCT: SavedProductV25 = {
  id: 'exfoliating-acid-serum',
  name: 'Exfoliating Acid Serum',
  category: 'Treatment',
  compatibility: 'avoid-now',
  routineUsage: 'Avoid tonight',
  ingredients: ['Glycolic acid', 'Lactic acid'],
  whyInRoutine:
    'Pura paused this product while your chin is active so your barrier can settle.',
  whenToUse:
    'Pura can reconsider this product once irritation settles and future reliable scans show improved stability.',
};

export const FIX_ROUTINE_STEPS: RoutineStepV25[] = [
  {
    id: 'cleanse',
    order: 1,
    title: 'Gentle cleanse',
    priority: 'recommended',
    summary: 'Remove buildup without stripping skin.',
    expandedBody:
      'Use a gentle cleanser tonight. Avoid scrubs or exfoliating washes while your chin is active.',
    rationale:
      'Keeps the barrier comfortable while reducing irritation risk around breakout-prone areas.',
    completed: false,
    missingProductMessage: 'No cleanser added yet.',
    alternativeCompletion: 'I rinsed with water instead',
  },
  {
    id: 'moisturize',
    order: 2,
    title: 'Moisturize',
    priority: 'required',
    summary: 'Support your barrier.',
    expandedBody:
      'Support your barrier and prevent dryness while your skin is settling.',
    rationale:
      'Your scan found active chin breakouts without widespread irritation. Barrier support matters more than adding strong actives.',
    completed: false,
    assignedProduct: FIX_SAVED_MOISTURIZER,
  },
  {
    id: 'calm-chin',
    order: 3,
    title: 'Calm chin area',
    priority: 'recommended',
    summary: 'Keep this area simple tonight.',
    expandedBody:
      'Do not layer strong actives over the breakout-prone area tonight.',
    rationale:
      'No treatment needed tonight. Your cleanser and moisturizer are enough.',
    completed: false,
    noTreatmentTonight: true,
  },
];

export const FIX_AVOID_TONIGHT = [
  'Exfoliating acids on the chin area',
  'New retinoids',
  'Harsh physical scrubs',
  'Multiple unfamiliar active products',
];

export const FIX_CAPTURE_TIPS = [
  'Bright, even light',
  'Full face centered',
  'Avoid harsh shadows',
  'Hold still',
];

export const USER_NAME = 'Yara';

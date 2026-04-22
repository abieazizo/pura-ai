/**
 * v7.5 onboarding label maps — used by ProfileSummary to render the user's
 * stored enums as human strings. Kept as a single file so the copy lives
 * next to the questions themselves rather than buried inside the screens.
 */

import type { AppState } from '@/store/useAppStore';

const EM_DASH = '\u2014';

export const genderLabel = (g: AppState['gender']): string =>
  g === 'male'
    ? 'Male'
    : g === 'female'
    ? 'Female'
    : g === 'other'
    ? 'Other'
    : EM_DASH;

export const sensitivityLabel = (s: AppState['sensitivity']): string =>
  s === 'very'
    ? 'Very sensitive'
    : s === 'somewhat'
    ? 'Somewhat sensitive'
    : s === 'not'
    ? 'Not sensitive'
    : s === 'unsure'
    ? 'Unsure'
    : EM_DASH;

export const sunExposureLabel = (s: AppState['sunExposure']): string =>
  s === 'rarely'
    ? 'Rarely'
    : s === 'sometimes'
    ? 'Sometimes'
    : s === 'often'
    ? 'Often'
    : s === 'unsure'
    ? 'Unsure'
    : EM_DASH;

export const effortLabel = (e: AppState['effort']): string =>
  e === 'minimal'
    ? 'Minimal'
    : e === 'moderate'
    ? 'Moderate'
    : e === 'enthusiast'
    ? 'Enthusiast'
    : e === 'decide-for-me'
    ? 'Decide for me'
    : EM_DASH;

export const skinTypeLabel = (t: AppState['skinType']): string =>
  t === 'oily'
    ? 'Oily'
    : t === 'dry'
    ? 'Dry'
    : t === 'combination'
    ? 'Combination'
    : t === 'sensitive'
    ? 'Sensitive'
    : EM_DASH;

export const goalLabel = (g: AppState['goal']): string =>
  g === 'clear'
    ? 'Clearer skin'
    : g === 'calm'
    ? 'Calmer skin'
    : g === 'bright'
    ? 'Brighter skin'
    : EM_DASH;

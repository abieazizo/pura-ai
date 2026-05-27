/**
 * v20.0 — onboarding label + dynamic-copy maps.
 *
 * Two layers live here:
 *
 *   1. *Display labels* — the human-readable strings that ProfileSummary,
 *      PlanReveal, and Paywall render to show the user their answers.
 *
 *   2. *Composable copy fragments* — short noun phrases (e.g. `clear-skin`,
 *      `balanced`, `combination`) that the PlanReveal subheadline and
 *      Paywall personalized card splice into full sentences such as:
 *
 *        "Pura will start with a balanced clear-skin routine for
 *         combination skin, focused on breakouts and visible progress
 *         over one skin cycle."
 *
 * Both layers are deterministic — no AI calls — so they can run during
 * onboarding before the AI gateway is even available.
 */

import type { AppState } from '@/store/useAppStore';

const EM_DASH = '—';

/* ------------------------------------------------------------------ */
/* Display labels                                                     */
/* ------------------------------------------------------------------ */

export const genderLabel = (g: AppState['gender']): string =>
  g === 'male'
    ? 'Man'
    : g === 'female'
    ? 'Woman'
    : g === 'other'
    ? 'Non-binary'
    : g === 'prefer-not-to-say'
    ? 'Prefer not to say'
    : EM_DASH;

export const hormoneContextLabel = (
  h: AppState['hormoneContext']
): string =>
  h === 'none'
    ? 'No / not sure'
    : h === 'cycle'
    ? 'Cycle may affect my skin'
    : h === 'pregnancy_postpartum'
    ? 'Pregnancy or postpartum'
    : h === 'menopause'
    ? 'Menopause or perimenopause'
    : h === 'hrt'
    ? 'Hormone therapy'
    : h === 'prefer_not_to_say'
    ? 'Prefer not to say'
    : EM_DASH;

export const ageRangeLabel = (a: AppState['ageRange']): string =>
  a === 'under_18'
    ? 'Under 18'
    : a === '18-24'
    ? '18–24'
    : a === '25-34'
    ? '25–34'
    : a === '35-44'
    ? '35–44'
    : a === '45-54'
    ? '45–54'
    : a === '55+'
    ? '55+'
    : EM_DASH;

export const sensitivityLabel = (s: AppState['sensitivity']): string =>
  s === 'very'
    ? 'Very reactive'
    : s === 'somewhat'
    ? 'Somewhat reactive'
    : s === 'not'
    ? 'Not very reactive'
    : s === 'unsure'
    ? 'Not sure'
    : EM_DASH;

export const sunExposureLabel = (s: AppState['sunExposure']): string =>
  s === 'rarely'
    ? 'Mostly indoors'
    : s === 'sometimes'
    ? 'Mixed'
    : s === 'often'
    ? 'Outdoors often'
    : s === 'unsure'
    ? 'It varies'
    : EM_DASH;

export const effortLabel = (e: AppState['effort']): string =>
  e === 'minimal'
    ? 'Minimal'
    : e === 'moderate'
    ? 'Balanced'
    : e === 'enthusiast'
    ? 'Advanced'
    : e === 'decide-for-me'
    ? 'Adaptive'
    : EM_DASH;

export const effortDetailLabel = (e: AppState['effort']): string =>
  e === 'minimal'
    ? '2–3 steps, under 3 minutes'
    : e === 'moderate'
    ? '3–5 steps, realistic daily'
    : e === 'enthusiast'
    ? '5+ steps, actives and rotation'
    : e === 'decide-for-me'
    ? 'Start simple, adjust after scans'
    : EM_DASH;

export const skinTypeLabel = (t: AppState['skinType']): string =>
  t === 'oily'
    ? 'Oily'
    : t === 'dry'
    ? 'Dry'
    : t === 'combination'
    ? 'Combination'
    : t === 'balanced'
    ? 'Balanced'
    : t === 'not_sure'
    ? 'Not sure yet'
    : t === 'sensitive'
    ? 'Combination' /* legacy fallback */
    : EM_DASH;

export const goalLabel = (g: AppState['goal']): string =>
  g === 'clear'
    ? 'Clearer skin'
    : g === 'calm'
    ? 'Calmer skin'
    : g === 'bright'
    ? 'Brighter tone'
    : g === 'smoother'
    ? 'Smoother texture'
    : g === 'barrier'
    ? 'Stronger barrier'
    : g === 'simpler'
    ? 'Simpler routine'
    : EM_DASH;

/* ------------------------------------------------------------------ */
/* Composable copy fragments — for inline reveal/paywall sentences    */
/* ------------------------------------------------------------------ */

/** Short noun phrase that fits in "a __ routine" — e.g. "balanced". */
export const effortAdjective = (e: AppState['effort']): string =>
  e === 'minimal'
    ? 'minimal'
    : e === 'moderate'
    ? 'balanced'
    : e === 'enthusiast'
    ? 'advanced'
    : e === 'decide-for-me'
    ? 'adaptive'
    : 'personalized';

/** Hyphenated noun that fits in "a __ routine" — e.g. "clear-skin". */
export const goalAdjective = (g: AppState['goal']): string =>
  g === 'clear'
    ? 'clear-skin'
    : g === 'calm'
    ? 'calmer-skin'
    : g === 'bright'
    ? 'brighter-skin'
    : g === 'smoother'
    ? 'smoother-skin'
    : g === 'barrier'
    ? 'barrier-support'
    : g === 'simpler'
    ? 'simpler-routine'
    : 'skin';

/** Lowercase noun that fits in "for __ skin". */
export const skinTypeAdjective = (t: AppState['skinType']): string =>
  t === 'oily'
    ? 'oily'
    : t === 'dry'
    ? 'dry'
    : t === 'combination'
    ? 'combination'
    : t === 'balanced'
    ? 'balanced'
    : t === 'not_sure'
    ? 'your'
    : t === 'sensitive'
    ? 'combination'
    : 'your';

/** Lowercase noun that fits in "less __" / "focused on __". */
export const sensitivityAdjective = (
  s: AppState['sensitivity']
): string =>
  s === 'very'
    ? 'very-reactive'
    : s === 'somewhat'
    ? 'somewhat-reactive'
    : s === 'not'
    ? 'low-reactivity'
    : s === 'unsure'
    ? 'unknown-reactivity'
    : 'low-reactivity';

/**
 * Lowercased primary concern noun, e.g. "breakouts". Falls back to the
 * goal's natural concern when the user picked no concerns yet.
 */
export const primaryConcernPhrase = (
  concerns: string[] | undefined,
  goal: AppState['goal']
): string => {
  const first = (concerns ?? [])[0];
  if (first) return first.toLowerCase();
  switch (goal) {
    case 'clear':
      return 'breakouts';
    case 'calm':
      return 'redness';
    case 'bright':
      return 'dullness';
    case 'smoother':
      return 'texture';
    case 'barrier':
      return 'dryness';
    case 'simpler':
      return 'routine clarity';
    default:
      return 'skin clarity';
  }
};

/* ------------------------------------------------------------------ */
/* Reveal + paywall sentence builders                                 */
/* ------------------------------------------------------------------ */

export interface OnboardingSnapshot {
  effort: AppState['effort'];
  goal: AppState['goal'];
  skinType: AppState['skinType'];
  concerns: string[] | undefined;
}

/**
 * Plan reveal subheadline, e.g.:
 *
 *   "Pura will start with a balanced clear-skin routine for combination
 *    skin, focused on breakouts and visible progress over one skin
 *    cycle."
 *
 * Falls back to a graceful sentence if everything is null.
 */
export const planRevealSentence = (
  snap: OnboardingSnapshot
): string => {
  const { effort, goal, skinType, concerns } = snap;
  const allBlank = !effort && !goal && !skinType && (!concerns || concerns.length === 0);
  if (allBlank) {
    return 'Pura will start with a personalized routine focused on visible progress over one skin cycle.';
  }
  return `Pura will start with a ${effortAdjective(effort)} ${goalAdjective(
    goal
  )} routine for ${skinTypeAdjective(skinType)} skin, focused on ${primaryConcernPhrase(
    concerns,
    goal
  )} and visible progress over one skin cycle.`;
};

/**
 * Paywall personalized card body — slightly different rhythm from the
 * reveal sentence (adds "consistency,"). Same fallback behavior.
 */
export const paywallPersonalSentence = (
  snap: OnboardingSnapshot
): string => {
  const { effort, goal, skinType, concerns } = snap;
  const allBlank = !effort && !goal && !skinType && (!concerns || concerns.length === 0);
  if (allBlank) {
    return 'Based on your answers, Pura will start with a personalized routine focused on visible progress over one skin cycle.';
  }
  return `Based on your answers, Pura will start with a ${effortAdjective(
    effort
  )} routine for ${skinTypeAdjective(skinType)} skin, focused on ${primaryConcernPhrase(
    concerns,
    goal
  )}, consistency, and visible progress over one skin cycle.`;
};

/** Focus card body — "Pura will prioritize __" line. */
export const focusBody = (
  concerns: string[] | undefined,
  goal: AppState['goal']
): string => {
  const primary = primaryConcernPhrase(concerns, goal);
  switch (primary) {
    case 'breakouts':
      return 'Pura will prioritize fewer new breakouts, calmer texture, and routine consistency.';
    case 'texture':
      return 'Pura will prioritize a smoother surface, less roughness, and even tone.';
    case 'redness':
      return 'Pura will prioritize calmer skin, fewer flushes, and gentler actives.';
    case 'dark spots':
      return 'Pura will prioritize fading post-acne marks and supporting even tone.';
    case 'dryness':
      return 'Pura will prioritize barrier support, less tightness, and steady hydration.';
    case 'dullness':
      return 'Pura will prioritize more glow, brighter tone, and consistent gentle exfoliation.';
    case 'fine lines':
      return 'Pura will prioritize visible smoothness, hydration, and well-tolerated actives.';
    case 'product confusion':
    case 'routine clarity':
      return 'Pura will prioritize a clearer routine and confidence about what to use when.';
    default:
      return 'Pura will prioritize the concerns you marked and consistency that’s easy to keep.';
  }
};

/** Skin pattern card body — keyed by skin type. */
export const skinPatternBody = (t: AppState['skinType']): string =>
  t === 'oily'
    ? 'We’ll keep oil and shine in check while protecting your barrier.'
    : t === 'dry'
    ? 'We’ll layer hydration and barrier support so skin feels less tight.'
    : t === 'combination'
    ? 'We’ll balance oil through the T-zone while keeping drier areas supported.'
    : t === 'balanced'
    ? 'We’ll keep your routine simple and protect what’s already working.'
    : t === 'not_sure' || t === 'sensitive'
    ? 'Your first scan will refine this. We’ll start gentle and adjust quickly.'
    : 'We’ll calibrate the routine to how your skin actually behaves day to day.';

/** Effort card body — keyed by effort. */
export const effortBody = (e: AppState['effort']): string =>
  e === 'minimal'
    ? 'A short, dependable routine — cleanse, treat, moisturize.'
    : e === 'moderate'
    ? 'A realistic 3–5 step routine — enough structure to work, not so much that you quit.'
    : e === 'enthusiast'
    ? 'A fuller routine with rotation and actives, paced to your skin’s tolerance.'
    : e === 'decide-for-me'
    ? 'We’ll start simple and let your scans show when to add or remove a step.'
    : 'A routine built around what you’ll actually do.';

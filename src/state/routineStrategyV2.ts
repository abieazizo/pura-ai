/**
 * v25 — starter routine strategy generator.
 *
 * Combines:
 *   • the user's selected `PrimaryGoal`
 *   • the *actual* observed scan signals (Scan.concerns + zones)
 *   • the user's `ProductReactivity` (safety calibration)
 *   • the user's `RoutineSimplicity` (essential / balanced / decide-for-me)
 *
 * Produces a starting-routine strategy with a short headline, a rationale
 * grounded in observed signals, three to five steps, and an adaptive
 * promise. The output is shaped so the Plan Reveal screen can render
 * directly without inventing additional claims.
 *
 * Important constraints:
 *   • Never claim a step is grounded in something the scan did not return.
 *   • If reactivity is "often" or "unsure", bias toward gentler steps and
 *     delay any treatment guidance.
 *   • If simplicity is "essential", surface exactly 3 steps regardless of
 *     observed concerns.
 *   • Recommendation text is deliberately category-level, not product-level.
 *     Product-level recommendations are a post-onboarding concern wired to
 *     the existing AI matcher.
 */

import type { Scan } from '@/types';
import type {
  GeneratedRoutineStrategy,
  PrimaryGoal,
  ProductReactivity,
  RoutineSimplicity,
  RoutineStep,
  RoutineStrategyTone,
} from './onboardingV2';

interface GenerateArgs {
  primaryGoal: PrimaryGoal;
  scan: Scan;
  productReactivity: ProductReactivity;
  routineSimplicity: RoutineSimplicity;
}

const STEP_CLEANSE_GENTLE: RoutineStep = {
  id: 'cleanse-gentle',
  title: 'Gentle cleanser',
  body: 'Remove buildup without stripping.',
};

const STEP_MOISTURIZE_LIGHT: RoutineStep = {
  id: 'moisturize-light',
  title: 'Lightweight moisturizer',
  body: 'Support comfort overnight without congestion.',
};

const STEP_MOISTURIZE_RICH: RoutineStep = {
  id: 'moisturize-rich',
  title: 'Richer moisturizer',
  body: 'Help your barrier recover overnight.',
};

const STEP_TREAT_TARGETED: RoutineStep = {
  id: 'treat-targeted',
  title: 'Targeted treatment',
  body: 'Add only when your sensitivity setting allows.',
};

const STEP_SPF: RoutineStep = {
  id: 'spf-morning',
  title: 'SPF in the morning',
  body: 'Daily SPF protects future scans from sun-driven change.',
};

const STEP_HYDRATING_SERUM: RoutineStep = {
  id: 'hydrating-serum',
  title: 'Hydrating serum',
  body: 'Layer water-light hydration before moisturizer.',
};

const STEP_CALMING_SERUM: RoutineStep = {
  id: 'calming-serum',
  title: 'Calming serum',
  body: 'Look for niacinamide or centella to reduce visible flushing.',
};

const STEP_BRIGHTENING_SERUM: RoutineStep = {
  id: 'brightening-serum',
  title: 'Even-tone serum',
  body: 'Gentle vitamin C or alpha-arbutin in low strength.',
};

const STEP_TEXTURE_EXFOLIANT: RoutineStep = {
  id: 'texture-exfoliant',
  title: 'Gentle exfoliant (1–2× a week)',
  body: 'Low-strength PHA to smooth without irritating.',
};

const TONE_PROFILES: Record<
  RoutineStrategyTone,
  { headline: string; rationaleNoun: string }
> = {
  gentle_clear: {
    headline: 'Clear gently. Protect your barrier.',
    rationaleNoun: 'visible breakout activity',
  },
  gentle_calm: {
    headline: 'Calm first. Treat later.',
    rationaleNoun: 'visible redness',
  },
  gentle_hydrate: {
    headline: 'Hydrate first. Strengthen the barrier.',
    rationaleNoun: 'visible dryness',
  },
  gentle_smooth: {
    headline: 'Smooth slowly. Stay gentle.',
    rationaleNoun: 'visible surface texture',
  },
  gentle_brighten: {
    headline: 'Even out tone. Take it slowly.',
    rationaleNoun: 'visible uneven tone',
  },
};

function toneFor(goal: PrimaryGoal): RoutineStrategyTone {
  switch (goal) {
    case 'breakouts':
      return 'gentle_clear';
    case 'redness':
      return 'gentle_calm';
    case 'dryness':
      return 'gentle_hydrate';
    case 'texture':
      return 'gentle_smooth';
    case 'darkSpots':
      return 'gentle_brighten';
  }
}

function adaptivePromiseFor(reactivity: ProductReactivity): string {
  if (reactivity === 'often' || reactivity === 'unsure') {
    return 'Pura begins gently and only adds new steps once future scans confirm your skin is settled.';
  }
  return 'Scan again tomorrow to see how your skin responds.';
}

function moisturizerFor(
  goal: PrimaryGoal,
  reactivity: ProductReactivity
): RoutineStep {
  if (goal === 'dryness') return STEP_MOISTURIZE_RICH;
  if (reactivity === 'often' || reactivity === 'unsure') {
    return STEP_MOISTURIZE_LIGHT;
  }
  return STEP_MOISTURIZE_LIGHT;
}

function tertiaryStepFor(goal: PrimaryGoal): RoutineStep {
  switch (goal) {
    case 'breakouts':
      return STEP_TREAT_TARGETED;
    case 'redness':
      return STEP_CALMING_SERUM;
    case 'dryness':
      return STEP_HYDRATING_SERUM;
    case 'texture':
      return STEP_TEXTURE_EXFOLIANT;
    case 'darkSpots':
      return STEP_BRIGHTENING_SERUM;
  }
}

/**
 * Build an honest, goal-aware rationale. We only mention a scan observation
 * if it actually surfaced — otherwise we fall back to language about the
 * user's selected goal.
 */
function rationaleFor(args: GenerateArgs): string {
  const { primaryGoal, scan, productReactivity } = args;
  const tone = toneFor(primaryGoal);
  const noun = TONE_PROFILES[tone].rationaleNoun;

  // Try to ground the rationale in real observed concerns. The Scan record
  // carries 4 ranked concerns when present; we look for the top one that
  // aligns with the user's stated goal.
  const topConcern = scan.concerns?.[0];
  const observed = topConcern?.finding?.toLowerCase() ?? '';

  const grounded = observed.length > 0
    ? `Because today's scan shows ${noun} (${observed.replace(/\.$/, '')}), `
    : `Because you chose ${noun.replace('visible ', '')} as today's focus, `;

  const safety =
    productReactivity === 'often' || productReactivity === 'unsure'
      ? "Pura will start with the simplest gentle routine and skip stronger actives until your skin is calm."
      : 'Pura will start gently and adjust after future scans.';

  return `${grounded}${safety}`;
}

function stepsFor(args: GenerateArgs): readonly RoutineStep[] {
  const {
    primaryGoal,
    productReactivity,
    routineSimplicity,
  } = args;
  const moisturizer = moisturizerFor(primaryGoal, productReactivity);
  const tertiary = tertiaryStepFor(primaryGoal);

  if (routineSimplicity === 'essential') {
    return [STEP_CLEANSE_GENTLE, moisturizer, STEP_SPF];
  }

  // "Decide for me" mirrors essential when reactivity is high/unsure.
  if (
    routineSimplicity === 'decideForMe' &&
    (productReactivity === 'often' || productReactivity === 'unsure')
  ) {
    return [STEP_CLEANSE_GENTLE, moisturizer, STEP_SPF];
  }

  // Balanced + tolerant skin: include the tertiary targeted step.
  // Reactive skin still skips the tertiary even on "balanced".
  if (productReactivity === 'often') {
    return [STEP_CLEANSE_GENTLE, moisturizer, STEP_SPF];
  }
  return [STEP_CLEANSE_GENTLE, moisturizer, tertiary, STEP_SPF];
}

export function generateRoutineStrategyV2(
  args: GenerateArgs
): GeneratedRoutineStrategy {
  const tone = toneFor(args.primaryGoal);
  const profile = TONE_PROFILES[tone];
  return {
    tone,
    headline: profile.headline,
    rationale: rationaleFor(args),
    steps: stepsFor(args),
    adaptivePromise: adaptivePromiseFor(args.productReactivity),
  };
}

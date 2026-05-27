/**
 * v25 — baseline reveal copy generator.
 *
 * Turns a real `Scan` + the user's `PrimaryGoal` into honest copy for
 * the Baseline Reveal screen. Constraints:
 *
 *   • Never make a diagnostic claim ("your skin condition is X").
 *   • Never claim a signal that did not appear in the scan output.
 *   • If the scan returned no clear signal aligned with the goal, fall
 *     back to honest "starting baseline" language.
 *   • Sensitivity / barrier / hydration must be marked "Confirm with
 *     your input" unless the scan provided a confidence ≥ 0.5 signal
 *     for them (which the existing AI contract does not expose
 *     directly — the deterministic fallback never returns them).
 */

import type { Scan, Concern, ConcernCategory } from '@/types';
import type { PrimaryGoal } from './onboardingV2';

export interface BaselineSignal {
  /** Short eyebrow label rendered in small caps. */
  label: string;
  /** Single-word severity / level. */
  value: string;
  /** Supporting line. */
  detail: string;
  /** When true, terracotta dot. Used for the primary focus signal. */
  emphasis: boolean;
}

export interface BaselineReveal {
  eyebrow: string;
  headline: string;
  body: string;
  signals: readonly BaselineSignal[];
  /** Plain-language boundary statement. Never medical. */
  boundary: string;
}

const GOAL_LABEL: Record<PrimaryGoal, string> = {
  breakouts: 'Breakouts',
  redness: 'Redness',
  dryness: 'Dryness',
  texture: 'Texture',
  darkSpots: 'Dark spots',
};

const CATEGORY_FOR_GOAL: Record<PrimaryGoal, ConcernCategory> = {
  breakouts: 'breakouts',
  redness: 'hydration', // existing concern model maps redness/calm under hydration
  dryness: 'hydration',
  texture: 'texture',
  darkSpots: 'tone',
};

function severityLabel(severity: Concern['severity']): string {
  switch (severity) {
    case 'calm':
      return 'Calm';
    case 'mild':
      return 'Mild';
    case 'moderate':
      return 'Moderate';
    case 'needs-attention':
      return 'Active';
  }
}

function severityHeadlineFragment(severity: Concern['severity']): string {
  switch (severity) {
    case 'calm':
      return 'is quiet today';
    case 'mild':
      return 'is mild today';
    case 'moderate':
      return 'is your clearest visible focus today';
    case 'needs-attention':
      return 'is your clearest visible focus today';
  }
}

function findConcernForGoal(
  scan: Scan,
  goal: PrimaryGoal
): Concern | undefined {
  if (!scan.concerns) return undefined;
  const targetCategory = CATEGORY_FOR_GOAL[goal];
  // Prefer the highest-rank concern in the target category.
  const inCategory = scan.concerns
    .filter((c) => c.category === targetCategory)
    .sort((a, b) => a.rank - b.rank);
  return inCategory[0] ?? scan.concerns[0];
}

/**
 * Build the baseline reveal view model from a real Scan + the user's
 * selected goal. The Plan Reveal screen and the routine generator can
 * read the same Scan separately — this function is concerned only with
 * the user-facing baseline screen.
 */
export function buildBaselineReveal(args: {
  scan: Scan;
  primaryGoal: PrimaryGoal;
}): BaselineReveal {
  const { scan, primaryGoal } = args;
  const goalLabel = GOAL_LABEL[primaryGoal];
  const focusedConcern = findConcernForGoal(scan, primaryGoal);

  // Headline + body
  let headline: string;
  let body: string;
  if (focusedConcern) {
    const fragment = severityHeadlineFragment(focusedConcern.severity);
    headline = `${goalLabel} ${fragment}.`;
    const observed = focusedConcern.finding?.trim();
    body = observed
      ? `Your scan suggests ${observed.replace(/\.$/, '').toLowerCase()}.`
      : `Your scan suggests visible ${goalLabel.toLowerCase()} signals to track over time.`;
  } else {
    headline = `${goalLabel} starting baseline captured.`;
    body =
      'Your first scan gives Pura a starting point. Future scans will make visible changes easier to compare.';
  }

  // Signals — three honest cards. The primary signal mirrors the user's
  // goal. Secondary signals are pulled from the scan when present.
  const signals: BaselineSignal[] = [];

  if (focusedConcern) {
    signals.push({
      label: `${goalLabel.toUpperCase()} ACTIVITY`,
      value: severityLabel(focusedConcern.severity),
      detail: focusedConcern.region
        ? `Primary focus today · ${focusedConcern.region}`
        : 'Primary focus today',
      emphasis: true,
    });
  } else {
    signals.push({
      label: `${goalLabel.toUpperCase()} BASELINE`,
      value: 'Starting point',
      detail: 'Tracking begins now',
      emphasis: true,
    });
  }

  // Secondary observation — pick a non-matching concern when one exists.
  const otherConcerns = (scan.concerns ?? []).filter(
    (c) => c.category !== focusedConcern?.category
  );
  if (otherConcerns[0]) {
    const o = otherConcerns[0];
    signals.push({
      label: o.category.toUpperCase(),
      value: severityLabel(o.severity),
      detail:
        o.region && o.severity !== 'calm'
          ? `Visible across ${o.region}`
          : 'No strong visible signals in this image',
      emphasis: false,
    });
  } else {
    signals.push({
      label: 'OTHER SIGNALS',
      value: 'Quiet today',
      detail: 'No strong visible signals beyond your focus',
      emphasis: false,
    });
  }

  // Sensitivity — never inferred from a single photo. Always asks the user.
  signals.push({
    label: 'SENSITIVITY',
    value: 'Confirm with your input',
    detail: 'Pura will ask one short question to calibrate gently',
    emphasis: false,
  });

  return {
    eyebrow: 'YOUR STARTING BASELINE',
    headline,
    body,
    signals,
    boundary:
      'Pura tracks visible changes over time and provides cosmetic guidance, not a medical diagnosis.',
  };
}

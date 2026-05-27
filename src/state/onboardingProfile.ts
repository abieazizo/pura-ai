/**
 * v21.0 — Derived onboarding profile.
 *
 * Single deterministic place where the user's onboarding answers are
 * turned into the plan-shaping signals every downstream screen reads:
 *
 *   • startingApproach        — name of the "starting plan" headline
 *   • approachExplanation     — one-sentence WHY rendered on the
 *                                Profile Preview screen
 *   • routineIntensity        — light / balanced / advanced (informs
 *                                routine builder defaults)
 *   • activeTolerance         — cautious / moderate / open (drives
 *                                when actives can be introduced)
 *   • spfPriority             — low / med / high (drives SPF nags)
 *   • barrierPriority         — same scale, controls barrier-first
 *                                bias in the routine engine
 *   • breakoutPriority        — same scale, controls comedogenic
 *                                avoidance in product matching
 *   • tonePriority            — same scale, controls brightening
 *                                + dark-spot focus
 *   • scanFocusAreas          — what the first scan will look for
 *   • productAvoidList        — categories the first plan suppresses
 *   • firstRoutineTemplate    — short label for the seed template
 *
 * EVERY value is derived deterministically — no AI calls — so the
 * Profile Preview can render before the gateway is even available.
 *
 * Reads its inputs from a typed snapshot (not the full AppState) so
 * the helper is trivially testable and the call sites are explicit.
 */

import type { AppState } from '@/store/useAppStore';

export type Priority = 'low' | 'med' | 'high';

export interface OnboardingSnapshot {
  goal: AppState['goal'];
  concerns: string[];
  skinType: AppState['skinType'];
  sensitivity: AppState['sensitivity'];
  effort: AppState['effort'];
  sunExposure: AppState['sunExposure'];
  routineTiming: AppState['routineTiming'];
  patternContext: AppState['patternContext'];
}

export interface DerivedProfile {
  startingApproach: string;
  approachExplanation: string;
  routineIntensity: 'light' | 'balanced' | 'advanced';
  activeTolerance: 'cautious' | 'moderate' | 'open';
  spfPriority: Priority;
  barrierPriority: Priority;
  breakoutPriority: Priority;
  tonePriority: Priority;
  scanFocusAreas: string[];
  productAvoidList: string[];
  firstRoutineTemplate: 'barrier-first' | 'clear-skin' | 'calm-first' | 'tone-focus' | 'simple-start';
  /**
   * One-sentence "what this means" bullets — composed once so
   * Profile Preview, ScanProcessing, and FirstResult share copy.
   */
  meaningBullets: string[];
}

const SPEC_CONCERNS = new Set([
  'Breakouts',
  'Redness',
  'Dryness',
  'Texture',
  'Dark spots',
  'Dullness',
  'Oiliness',
  'Sensitivity',
]);

/* ------------------------------------------------------------------ */
/* Concern membership helpers                                         */
/* ------------------------------------------------------------------ */

const hasConcern = (concerns: string[], target: string) =>
  concerns.some((c) => c.toLowerCase() === target.toLowerCase());

const concernsLower = (concerns: string[]) =>
  concerns.map((c) => c.toLowerCase());

/* ------------------------------------------------------------------ */
/* Starting approach                                                  */
/* ------------------------------------------------------------------ */

/**
 * The headline label rendered on the Profile Preview "STARTING APPROACH"
 * card. Picks the lane the first plan will favor.
 */
function pickStartingApproach(snap: OnboardingSnapshot): {
  label: string;
  template: DerivedProfile['firstRoutineTemplate'];
} {
  const { goal, concerns, sensitivity, skinType } = snap;
  const reactive = sensitivity === 'very' || sensitivity === 'somewhat';
  const dryHeavy =
    skinType === 'dry' ||
    hasConcern(concerns, 'Dryness') ||
    goal === 'barrier';
  const breakoutHeavy =
    hasConcern(concerns, 'Breakouts') ||
    hasConcern(concerns, 'Oiliness') ||
    goal === 'clear';
  const redness =
    hasConcern(concerns, 'Redness') ||
    hasConcern(concerns, 'Sensitivity') ||
    goal === 'calm';
  const tone =
    hasConcern(concerns, 'Dark spots') ||
    hasConcern(concerns, 'Dullness') ||
    goal === 'bright';

  // Reactive + dry / breakout → barrier-first, breakout-aware
  if (reactive && (dryHeavy || breakoutHeavy)) {
    return {
      label: 'Barrier-first, breakout-aware',
      template: 'barrier-first',
    };
  }
  // Oily + breakouts → clear-skin focus
  if (breakoutHeavy && !reactive && !dryHeavy) {
    return {
      label: 'Clear-skin focused, not stripping',
      template: 'clear-skin',
    };
  }
  // Redness / sensitivity dominant → calm-first
  if (redness) {
    return {
      label: 'Calm-first, sensitivity-safe',
      template: 'calm-first',
    };
  }
  // Tone-focused
  if (tone) {
    return {
      label: 'Tone-focused, SPF-aware',
      template: 'tone-focus',
    };
  }
  // Dry / barrier dominant
  if (dryHeavy) {
    return {
      label: 'Barrier-first, recovery-led',
      template: 'barrier-first',
    };
  }
  // Default: simple start (covers "not sure" answers)
  return {
    label: 'Simple start, scan-refined',
    template: 'simple-start',
  };
}

/* ------------------------------------------------------------------ */
/* Approach explanation                                               */
/* ------------------------------------------------------------------ */

function buildApproachExplanation(
  snap: OnboardingSnapshot,
  approachLabel: string,
): string {
  const { goal, concerns, sensitivity, skinType } = snap;
  const reactive = sensitivity === 'very' || sensitivity === 'somewhat';

  if (approachLabel.startsWith('Barrier-first')) {
    const cues: string[] = [];
    if (goal === 'calm') cues.push('calmer skin');
    if (goal === 'barrier') cues.push('a stronger barrier');
    if (hasConcern(concerns, 'Breakouts')) cues.push('breakouts');
    if (hasConcern(concerns, 'Dryness')) cues.push('dryness');
    if (reactive) cues.push('reactive skin');
    if (cues.length === 0) cues.push('your answers');
    return `Because you chose ${joinCues(
      cues,
    )}, Pura will avoid aggressive routine jumps and lead with barrier support.`;
  }
  if (approachLabel.startsWith('Clear-skin')) {
    return 'Because you chose clearer skin and oiliness or breakouts, Pura will watch congestion while keeping your barrier protected.';
  }
  if (approachLabel.startsWith('Calm-first')) {
    return 'Because you flagged redness or sensitivity, Pura will lead with calming steps and introduce anything new slowly.';
  }
  if (approachLabel.startsWith('Tone-focused')) {
    return 'Because you chose brighter tone or dark spots, Pura will make SPF and tone support central to your plan.';
  }
  if (approachLabel.startsWith('Simple start')) {
    return 'Because you weren’t sure on some answers, Pura will start simple and refine your plan after your first scans.';
  }
  return 'Pura will personalize your plan around the answers you gave and refine it after your first scan.';
}

function joinCues(cues: string[]): string {
  if (cues.length === 0) return '';
  if (cues.length === 1) return cues[0];
  if (cues.length === 2) return `${cues[0]} and ${cues[1]}`;
  return `${cues.slice(0, -1).join(', ')}, and ${cues[cues.length - 1]}`;
}

/* ------------------------------------------------------------------ */
/* Priorities                                                         */
/* ------------------------------------------------------------------ */

function pickRoutineIntensity(
  snap: OnboardingSnapshot,
): DerivedProfile['routineIntensity'] {
  const { effort, sensitivity } = snap;
  // Heavily reactive skin pulls intensity down regardless of effort
  if (sensitivity === 'very') return 'light';
  if (effort === 'minimal') return 'light';
  if (effort === 'enthusiast') return 'advanced';
  return 'balanced';
}

function pickActiveTolerance(
  snap: OnboardingSnapshot,
): DerivedProfile['activeTolerance'] {
  const { sensitivity, concerns, skinType } = snap;
  if (sensitivity === 'very') return 'cautious';
  if (sensitivity === 'unsure') return 'cautious';
  if (sensitivity === 'somewhat') return 'moderate';
  if (skinType === 'dry' && hasConcern(concerns, 'Dryness')) return 'moderate';
  if (hasConcern(concerns, 'Sensitivity')) return 'cautious';
  return sensitivity === 'not' ? 'open' : 'moderate';
}

function pickPriority(
  conditions: { value: Priority; when: boolean }[],
  fallback: Priority,
): Priority {
  // Highest priority wins
  if (conditions.find((c) => c.when && c.value === 'high')) return 'high';
  if (conditions.find((c) => c.when && c.value === 'med')) return 'med';
  if (conditions.find((c) => c.when && c.value === 'low')) return 'low';
  return fallback;
}

function pickSpfPriority(snap: OnboardingSnapshot): Priority {
  const { sunExposure, goal, concerns } = snap;
  return pickPriority(
    [
      { value: 'high', when: sunExposure === 'often' },
      { value: 'high', when: goal === 'bright' },
      { value: 'high', when: hasConcern(concerns, 'Dark spots') },
      { value: 'med', when: sunExposure === 'sometimes' },
      { value: 'med', when: sunExposure === 'unsure' },
    ],
    'low',
  );
}

function pickBarrierPriority(snap: OnboardingSnapshot): Priority {
  const { goal, concerns, skinType, sensitivity } = snap;
  return pickPriority(
    [
      { value: 'high', when: goal === 'barrier' },
      { value: 'high', when: sensitivity === 'very' },
      { value: 'high', when: skinType === 'dry' && hasConcern(concerns, 'Dryness') },
      { value: 'med', when: hasConcern(concerns, 'Dryness') },
      { value: 'med', when: hasConcern(concerns, 'Sensitivity') },
      { value: 'med', when: sensitivity === 'somewhat' },
    ],
    'low',
  );
}

function pickBreakoutPriority(snap: OnboardingSnapshot): Priority {
  const { goal, concerns } = snap;
  return pickPriority(
    [
      { value: 'high', when: goal === 'clear' },
      { value: 'high', when: hasConcern(concerns, 'Breakouts') },
      { value: 'med', when: hasConcern(concerns, 'Oiliness') },
      { value: 'med', when: hasConcern(concerns, 'Texture') },
    ],
    'low',
  );
}

function pickTonePriority(snap: OnboardingSnapshot): Priority {
  const { goal, concerns } = snap;
  return pickPriority(
    [
      { value: 'high', when: goal === 'bright' },
      { value: 'high', when: hasConcern(concerns, 'Dark spots') },
      { value: 'med', when: hasConcern(concerns, 'Dullness') },
    ],
    'low',
  );
}

/* ------------------------------------------------------------------ */
/* Scan focus + product avoid list                                    */
/* ------------------------------------------------------------------ */

function pickScanFocusAreas(snap: OnboardingSnapshot): string[] {
  const { concerns, goal, sensitivity, skinType } = snap;
  const cl = concernsLower(concerns);
  // Always start with hydration + texture as a baseline
  const out = new Set<string>();
  out.add('Hydration signals');
  out.add('Texture');
  if (cl.includes('breakouts') || goal === 'clear') out.add('Breakouts');
  if (cl.includes('redness') || sensitivity === 'very') out.add('Redness');
  if (cl.includes('dryness') || skinType === 'dry' || goal === 'barrier') out.add('Barrier stress');
  if (cl.includes('dark spots') || goal === 'bright') out.add('Tone evenness');
  if (cl.includes('oiliness')) out.add('Oil patterns');
  if (cl.includes('sensitivity')) out.add('Sensitivity signals');
  return Array.from(out).slice(0, 5);
}

function pickProductAvoidList(snap: OnboardingSnapshot): string[] {
  const { sensitivity, concerns } = snap;
  const out: string[] = [];
  if (sensitivity === 'very' || hasConcern(concerns, 'Sensitivity')) {
    out.push('High-strength acids early on');
    out.push('Fragranced formulas');
  }
  if (hasConcern(concerns, 'Redness')) {
    out.push('Aggressive physical scrubs');
  }
  if (hasConcern(concerns, 'Dryness')) {
    out.push('Stripping foaming cleansers');
  }
  if (hasConcern(concerns, 'Breakouts')) {
    out.push('Heavy occlusive oils on active areas');
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Meaning bullets                                                    */
/* ------------------------------------------------------------------ */

function buildMeaningBullets(p: {
  routineIntensity: DerivedProfile['routineIntensity'];
  activeTolerance: DerivedProfile['activeTolerance'];
  barrierPriority: Priority;
  spfPriority: Priority;
}): string[] {
  const out: string[] = [];
  out.push(
    p.routineIntensity === 'light'
      ? 'Start with a short, gentle routine'
      : p.routineIntensity === 'advanced'
        ? 'Build a fuller routine, paced to your skin'
        : 'Start with a realistic, calm routine',
  );
  out.push(
    p.activeTolerance === 'cautious'
      ? 'Avoid stacking strong actives early'
      : p.activeTolerance === 'open'
        ? 'Introduce actives gradually with care'
        : 'Add actives one at a time, watching for irritation',
  );
  out.push('Adjust your plan after each scan');
  if (p.spfPriority === 'high') out.push('Keep SPF central to mornings');
  if (p.barrierPriority === 'high') out.push('Keep barrier support as a daily anchor');
  return out.slice(0, 4);
}

/* ------------------------------------------------------------------ */
/* Top-level builder                                                  */
/* ------------------------------------------------------------------ */

export function deriveOnboardingProfile(
  snap: OnboardingSnapshot,
): DerivedProfile {
  // Sanitize concerns to the spec set; tolerate legacy values
  const concerns = snap.concerns.filter((c) => SPEC_CONCERNS.has(c) || true);
  const normalizedSnap: OnboardingSnapshot = { ...snap, concerns };

  const approach = pickStartingApproach(normalizedSnap);
  const routineIntensity = pickRoutineIntensity(normalizedSnap);
  const activeTolerance = pickActiveTolerance(normalizedSnap);
  const spfPriority = pickSpfPriority(normalizedSnap);
  const barrierPriority = pickBarrierPriority(normalizedSnap);
  const breakoutPriority = pickBreakoutPriority(normalizedSnap);
  const tonePriority = pickTonePriority(normalizedSnap);

  return {
    startingApproach: approach.label,
    approachExplanation: buildApproachExplanation(
      normalizedSnap,
      approach.label,
    ),
    routineIntensity,
    activeTolerance,
    spfPriority,
    barrierPriority,
    breakoutPriority,
    tonePriority,
    scanFocusAreas: pickScanFocusAreas(normalizedSnap),
    productAvoidList: pickProductAvoidList(normalizedSnap),
    firstRoutineTemplate: approach.template,
    meaningBullets: buildMeaningBullets({
      routineIntensity,
      activeTolerance,
      barrierPriority,
      spfPriority,
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Plan-impact micro-copy                                             */
/* ------------------------------------------------------------------ */

/**
 * Returns the one-sentence "Plan impact" line for a single answer
 * selection. Used by the PlanImpactCard that fades in after a
 * meaningful selection. Returns null when the question has no
 * personalized impact line (e.g., trivial answers).
 */
export function planImpactForGoal(g: AppState['goal']): string | null {
  switch (g) {
    case 'clear':
      return 'Pura will focus on breakout patterns without over-drying your skin.';
    case 'calm':
      return 'Pura will prioritize gentle steps and avoid aggressive routine changes.';
    case 'smoother':
      return 'Pura will track texture changes while keeping exfoliation controlled.';
    case 'bright':
      return 'Pura will tune SPF and tone guidance around your skin’s tolerance.';
    case 'barrier':
      return 'Pura will start recovery-first and protect against irritation.';
    case 'simpler':
      return 'Pura will keep your first plan simple and easy to repeat.';
    default:
      return null;
  }
}

export function planImpactForConcerns(concerns: string[]): string | null {
  if (concerns.length === 0) return null;
  const cl = concerns.map((c) => c.toLowerCase());

  // High-signal pairs first
  if (cl.includes('breakouts') && cl.includes('dryness')) {
    return 'Pura will keep your plan breakout-aware without stripping your barrier.';
  }
  if (cl.includes('redness') && cl.includes('sensitivity')) {
    return 'Pura will avoid aggressive actives and prioritize calming steps.';
  }
  if (cl.includes('dark spots') && cl.includes('dullness')) {
    return 'Pura will make SPF and gradual tone support central to your plan.';
  }
  if (cl.includes('oiliness') && cl.includes('breakouts')) {
    return 'Pura will watch congestion while protecting your barrier.';
  }

  // Single-concern fallbacks
  const primary = cl[0];
  switch (primary) {
    case 'breakouts':
      return 'Pura will watch breakout patterns and help keep your routine from getting too harsh.';
    case 'dryness':
      return 'Pura will give barrier support more weight in your routine.';
    case 'redness':
      return 'Pura will avoid changes that may increase irritation.';
    case 'sensitivity':
      return 'Pura will start cautiously and introduce new steps slowly.';
    case 'texture':
      return 'Pura will track texture changes and pace exfoliation carefully.';
    case 'dark spots':
      return 'Pura will focus on SPF and gentle, gradual tone support.';
    case 'dullness':
      return 'Pura will keep your routine calm while adding gentle glow steps.';
    case 'oiliness':
      return 'Pura will help balance shine without stripping your barrier.';
    default:
      return null;
  }
}

export function planImpactForSkinBehavior(
  skinType: AppState['skinType'],
  sensitivity: AppState['sensitivity'],
): string | null {
  if (!skinType && !sensitivity) return null;

  const reactive = sensitivity === 'very' || sensitivity === 'somewhat';

  if (skinType === 'dry' && sensitivity === 'very') {
    return 'Pura will start barrier-first and avoid strong exfoliation early.';
  }
  if (skinType === 'combination' && sensitivity === 'somewhat') {
    return 'Pura will balance oil control with gentle, gradual active use.';
  }
  if (skinType === 'balanced' && sensitivity === 'not') {
    return 'Pura can start with a balanced routine and adjust based on scan changes.';
  }
  if (skinType === 'not_sure' && sensitivity === 'unsure') {
    return 'Pura will start simple and refine your profile after your first scans.';
  }
  if (skinType === 'oily' && !reactive) {
    return 'Pura will lean into oil-aware steps while keeping your barrier protected.';
  }
  if (reactive) {
    return 'Pura will introduce changes slowly and keep early steps gentle.';
  }
  if (skinType === 'dry') {
    return 'Pura will start with barrier and hydration as the daily anchors.';
  }
  return 'Pura will calibrate your first plan around how your skin actually behaves.';
}

export function planImpactForEffort(e: AppState['effort']): string | null {
  switch (e) {
    case 'minimal':
      return 'Your first routine will stay short and focus only on the highest-value steps.';
    case 'moderate':
      return 'Pura will build a realistic routine with room for treatment steps when your skin is ready.';
    case 'enthusiast':
      return 'Pura may rotate actives, but only if your skin signals tolerate it.';
    case 'decide-for-me':
      return 'Pura will start simple and increase only when your skin is ready.';
    default:
      return null;
  }
}

export function planImpactForLifestyle(
  sunExposure: AppState['sunExposure'],
  routineTiming: AppState['routineTiming'],
): string | null {
  if (!sunExposure && !routineTiming) return null;

  if (sunExposure === 'often') {
    return 'Pura will make SPF and recovery support more important in your plan.';
  }
  if (routineTiming === 'pm') {
    return 'Pura will focus your main treatment steps at night.';
  }
  if (routineTiming === 'am') {
    return 'Pura will lean your routine toward mornings, where you’re more consistent.';
  }
  if (routineTiming === 'inconsistent' && sunExposure === 'unsure') {
    return 'Pura will keep your plan flexible and easier to restart when your schedule changes.';
  }
  if (routineTiming === 'am_pm') {
    return 'Pura will pace your routine across morning and night to keep it steady.';
  }
  if (sunExposure === 'rarely') {
    return 'Pura will prioritize barrier and treatment steps, with SPF for the days you’re outside.';
  }
  return 'Pura will tune your routine around how you actually live week to week.';
}

export function planImpactForPattern(
  p: AppState['patternContext'],
): string | null {
  switch (p) {
    case 'cycle':
      return 'Pura may look for recurring breakout patterns over time.';
    case 'sensitivity_flares':
      return 'Pura will watch for sensitivity patterns before increasing routine intensity.';
    case 'none':
    case 'prefer_not_to_say':
    case null:
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Snapshot helper                                                    */
/* ------------------------------------------------------------------ */

/**
 * Build the snapshot needed by `deriveOnboardingProfile` from the full
 * store state, with sensible defaults when a value is missing.
 */
export function snapshotFromState(
  s: Pick<
    AppState,
    | 'goal'
    | 'concerns'
    | 'skinType'
    | 'sensitivity'
    | 'effort'
    | 'sunExposure'
    | 'routineTiming'
    | 'patternContext'
  >,
): OnboardingSnapshot {
  return {
    goal: s.goal,
    concerns: s.concerns ?? [],
    skinType: s.skinType,
    sensitivity: s.sensitivity,
    effort: s.effort,
    sunExposure: s.sunExposure,
    routineTiming: s.routineTiming,
    patternContext: s.patternContext,
  };
}

/* ------------------------------------------------------------------ */
/* Status helpers (account / scan / baseline)                         */
/* ------------------------------------------------------------------ */

export type AccountStatus = 'guest' | 'authed';
export type ScanStatus = 'none' | 'one' | 'many';
export type BaselineStatus = 'pending' | 'created';

export function deriveAccountStatus(user: AppState['user']): AccountStatus {
  return user && user.id ? 'authed' : 'guest';
}

export function deriveScanStatus(scanCount: number): ScanStatus {
  if (scanCount <= 0) return 'none';
  if (scanCount === 1) return 'one';
  return 'many';
}

export function deriveBaselineStatus(scanCount: number): BaselineStatus {
  return scanCount > 0 ? 'created' : 'pending';
}

/**
 * model — the routine experience's single derived view-model.
 *
 * The data-contract-first layer (per CLAUDE.md + the no-patch-loops rule):
 * screens NEVER read the raw routine/scan/AI shapes. They read THIS, a pure,
 * deterministic projection of the canonical inputs into fully-resolved, in-
 * voice content — greeting, the move sections that morph into the routine,
 * each step's throughline, the one focus action, the ritual script, calibrated
 * commerce, and the rescan progress bridge.
 *
 * Pure: every time-dependent input (now, streak, doneIds) is passed in, so the
 * same inputs always render the same experience (and the harness can drive it).
 */

import type {
  CustomRoutine,
  RoutineProduct,
  RoutineStep,
  RoutineStepType,
  RoutineTimeOfDay,
} from '@/types/routine';
import type { ConcernType, VisibleFinding } from '@/types/scanResults';
import {
  periodForHour,
  type RoutinePeriod,
} from '@/theme/routineAtmosphere';
import {
  assertVoice,
  doneLanding,
  pickEveningGreeting,
  pickMorningGreeting,
  VOICE,
} from './voice';
import {
  buildThroughline,
  completionBenefit,
  findingNoun,
  ritualLead,
} from './findings';

/**
 * A routine_focus "move" — the screen-2 cards. Persisted across the scan
 * modal's teardown by `src/state/routineFocusMoves.ts` (keyed by scanId) and
 * passed in by the tab screen; when absent (older scans), `deriveMoves` builds
 * honest fallback buckets so the morph never renders empty.
 */
export interface RoutineFocusMove {
  title: string;
  why: string;
  /** Scan finding ids this move addresses. */
  addresses: string[];
}

export type MatchHonesty = 'strong' | 'optional' | 'maybe skip this for now';

export interface ProductSlotVM {
  category: RoutineStepType;
  /** Present only when a curated pick exists; the routine works without it. */
  pick?: {
    id: string;
    brand: string;
    name: string;
    /** Calibrated — "should help", never "will fix". Traces to the finding. */
    whyHelps: string;
    price?: number;
    honesty: MatchHonesty;
    /** Flag the cheapest-that-works so the orb can point at it honestly. */
    cheapestThatWorks: boolean;
    /** Raw image refs (pure data — components resolve the catalog packshot by
     *  id first; these are the fallbacks for live, non-catalog products). */
    imageAsset?: number;
    imageUrl?: string;
  };
}

export interface StepVM {
  id: string;
  type: RoutineStepType;
  timeOfDay: RoutineTimeOfDay;
  /** Plain action line. */
  action: string;
  /** The throughline — traces to a finding. */
  throughline: string;
  /** Spoken ritual lead (Mode C), word-by-word. */
  ritualLead: string;
  /** Completion-as-care benefit (Mode C). */
  benefit: string;
  /** Seconds the product needs to settle; >0 shows the breathing ring. */
  absorbSeconds: number;
  /** The primary finding this step traces to, if resolved. */
  finding: VisibleFinding | null;
  concern: ConcernType | null;
  /** Completion-as-care plays here: the SPF, or the step carrying the scan's
   *  top finding. (The ritual also treats the last step as meaningful.) */
  meaningful: boolean;
  done: boolean;
  optional: boolean;
  product: ProductSlotVM;
}

export interface MoveVM {
  id: string;
  title: string;
  why: string;
  steps: StepVM[];
}

export interface RoutineCardVM {
  timeOfDay: RoutineTimeOfDay;
  /** "Your morning" / "Your evening". */
  title: string;
  steps: StepVM[];
}

export interface FocusVM {
  heroStep: StepVM | null;
  /** "Good morning - ready for your morning two steps? About 90 seconds." */
  prompt: string;
  durationLine: string;
  ctaLabel: string; // "Start this morning" / "Start tonight"
  total: number;
  doneCount: number;
  allComplete: boolean;
}

export interface BundleVM {
  intro: string;
  /** Honest commerce, said out loud: "you don't need a serum yet" when the
   *  basics genuinely cover it. Absent when there's nothing honest to flag. */
  honestNote?: string;
  items: {
    id: string;
    name: string;
    why: string;
    price?: number;
    honesty: MatchHonesty;
    imageAsset?: number;
    imageUrl?: string;
  }[];
  total?: number;
  alsoFree: string;
}

export interface YourRoutineModel {
  period: RoutinePeriod;
  timeOfDay: RoutineTimeOfDay;
  greeting: string;
  welcomeBack: string | null;
  firstReveal: string;
  productFree: string;
  progressBridge: string;
  /** Move sections — the screen-2 cards that morph into the routine. */
  moves: MoveVM[];
  am: RoutineCardVM;
  pm: RoutineCardVM;
  today: RoutineCardVM;
  focus: FocusVM;
  /** Today's steps, ordered, for the guided ritual. */
  ritualSteps: StepVM[];
  doneLandingLine: string;
  commerce: { anyPicks: boolean; bundle: BundleVM | null };
}

export interface BuildModelInput {
  routine: CustomRoutine;
  findings: VisibleFinding[];
  moves?: RoutineFocusMove[];
  timeOfDay: RoutineTimeOfDay;
  now: Date;
  streak: { count: number; includesToday: boolean };
  /** Step ids completed today for the active time of day. */
  doneIds: string[];
  /** Days since the user last completed anything (for welcome-back). */
  daysSinceLastUse?: number;
  /** Rescan-derived: skin is genuinely calmer lately (adaptive copy). */
  calmerLately?: boolean;
  /** Avoid repeating the previous greeting back-to-back. */
  lastGreeting?: string;
}

const ABSORB_BY_TYPE: Record<RoutineStepType, number> = {
  cleanse: 0,
  treat: 60,
  hydrate: 30,
  protect: 0,
};

export function buildYourRoutineModel(input: BuildModelInput): YourRoutineModel {
  const {
    routine,
    findings,
    timeOfDay,
    now,
    streak,
    doneIds,
    daysSinceLastUse = 0,
    calmerLately = false,
    lastGreeting,
  } = input;

  const findingById = new Map(findings.map((f) => [f.id, f]));
  const topFinding = [...findings].sort((a, b) => priorityRank(b) - priorityRank(a))[0] ?? null;

  const toStepVM = (step: RoutineStep, tod: RoutineTimeOfDay): StepVM => {
    const finding = resolvePrimaryFinding(step, findingById, findings);
    const concern = finding?.type ?? topFinding?.type ?? null;
    const isLast = false; // set per-card below where order is known
    return {
      id: step.id,
      type: step.type,
      timeOfDay: tod,
      action: step.directions || step.purpose,
      throughline: buildThroughline({ type: step.type, finding, fallbackConcern: concern }),
      ritualLead: ritualLead(step.type, isLast),
      benefit: completionBenefit({ type: step.type, concern }),
      absorbSeconds: ABSORB_BY_TYPE[step.type] ?? 0,
      finding,
      concern,
      meaningful:
        step.type === 'protect' || (!!finding && !!topFinding && finding.id === topFinding.id),
      done: doneIds.includes(step.id),
      optional: step.optional,
      product: toProductSlot(step, finding),
    };
  };

  const amSteps = routine.morningSteps.map((s) => toStepVM(s, 'morning'));
  const pmSteps = routine.eveningSteps.map((s) => toStepVM(s, 'evening'));
  // Fix the spoken "last one" lead now that order is known, per list.
  fixLastLead(amSteps);
  fixLastLead(pmSteps);

  const am: RoutineCardVM = { timeOfDay: 'morning', title: 'Your morning', steps: amSteps };
  const pm: RoutineCardVM = { timeOfDay: 'evening', title: 'Your evening', steps: pmSteps };
  const today = timeOfDay === 'morning' ? am : pm;

  // Greeting — varies, never repeats back-to-back, honest about real calm,
  // and never claims "two steps" when today holds three.
  const seed = daySeed(now);
  const stepCount = today.steps.length;
  const greeting =
    timeOfDay === 'morning'
      ? pickMorningGreeting({ seed, lastShown: lastGreeting, calmerLately, stepCount })
      : pickEveningGreeting({ seed, lastShown: lastGreeting, stepCount });

  const welcomeBack = daysSinceLastUse >= 2 ? VOICE.welcomeBack : null;

  // The one focus action — the first not-done step today.
  const heroStep = today.steps.find((s) => !s.done) ?? null;
  const doneCount = today.steps.filter((s) => s.done).length;
  const total = today.steps.length;
  const seconds = today.steps.reduce((acc, s) => acc + 30 + s.absorbSeconds, 0);
  const durationLine = phraseDuration(seconds);
  const focus: FocusVM = {
    heroStep,
    prompt: focusPrompt(timeOfDay, total, durationLine),
    durationLine,
    ctaLabel: timeOfDay === 'morning' ? 'Start this morning' : 'Start tonight',
    total,
    doneCount,
    allComplete: total > 0 && doneCount === total,
  };

  const moves = input.moves?.length
    ? mapProvidedMoves(input.moves, [...amSteps, ...pmSteps], findingById)
    : deriveMoves([...amSteps, ...pmSteps]);

  const commerce = buildCommerce([...amSteps, ...pmSteps], topFinding);

  return {
    // The screen IS the time of day — period tracks the real clock (midday is
    // reachable); the ritual inherits the hour it actually happens in.
    period: periodForHour(now.getHours()),
    timeOfDay,
    greeting,
    welcomeBack,
    firstReveal: VOICE.firstReveal,
    productFree: VOICE.productFree,
    progressBridge: progressBridge(topFinding),
    moves,
    am,
    pm,
    today,
    focus,
    ritualSteps: today.steps,
    doneLandingLine: doneLanding({ timeOfDay, seed }),
    commerce,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function priorityRank(f: VisibleFinding): number {
  const order = { primary: 3, high: 3, secondary: 2, medium: 2, supporting: 1, low: 1 } as Record<string, number>;
  return (order[f.priority as unknown as string] ?? 1) * (f.confidence ?? 0.5);
}

/** Match a step to its finding: by linked id first, else by aligned concern. */
function resolvePrimaryFinding(
  step: RoutineStep,
  byId: Map<string, VisibleFinding>,
  all: VisibleFinding[],
): VisibleFinding | null {
  for (const id of step.relatedFocusAreaIds ?? []) {
    const f = byId.get(id);
    if (f) return f;
  }
  const aligned = CONCERN_FOR_STEP[step.type];
  const match = all.find((f) => aligned.includes(f.type));
  return match ?? null;
}

/** Which concerns a step type naturally speaks to (for fallback matching). */
const CONCERN_FOR_STEP: Record<RoutineStepType, ConcernType[]> = {
  cleanse: ['redness', 'breakouts', 'oil_balance', 'barrier_stress'],
  treat: ['dark_marks', 'texture', 'breakouts', 'redness'],
  hydrate: ['dryness', 'barrier_stress', 'redness'],
  protect: ['dark_marks', 'redness'],
};

function toProductSlot(step: RoutineStep, finding: VisibleFinding | null): ProductSlotVM {
  const p: RoutineProduct | undefined = step.product;
  if (!p) return { category: step.type };
  const honesty: MatchHonesty = step.optional
    ? 'maybe skip this for now'
    : finding && priorityRank(finding) >= 2
      ? 'strong'
      : 'optional';
  return {
    category: step.type,
    pick: {
      id: p.id,
      brand: p.brand,
      name: p.name,
      whyHelps: calibrate(p.whyMatched, finding),
      price: (p as RoutineProduct & { price?: number }).price,
      honesty,
      cheapestThatWorks: honesty !== 'strong',
      imageAsset: p.imageAsset,
      imageUrl: p.imageUrl,
    },
  };
}

/** Any over-promise the voice must never carry — these REJECT the upstream
 *  copy outright (word-swapping a promise can garble grammar; a clean
 *  finding-derived line can't). */
const OVERPROMISE = /\bwill\b|\bguarantee[sd]?\b|\bfix(es|ed)?\b|\bcures?\b|\bclears?\b|\beliminates?\b|\berases?\b|\btransforms?\b/i;

/** Calibrate a product reason: "should help", never "will fix". */
function calibrate(why: string | undefined, finding: VisibleFinding | null): string {
  const clean = why?.trim();
  if (clean && !OVERPROMISE.test(clean) && lintClean(clean)) {
    return clean;
  }
  const noun = finding ? findingNoun(finding.type) : '';
  if (noun) return assertVoice('calibrate', `Should help with the ${noun} - gently, over time.`);
  return 'A solid, no-fuss pick. Should help.';
}

function lintClean(text: string): boolean {
  return !text.includes('!');
}

function fixLastLead(steps: StepVM[]): void {
  steps.forEach((s, i) => {
    s.ritualLead = ritualLead(s.type, i === steps.length - 1);
  });
}

function focusPrompt(tod: RoutineTimeOfDay, total: number, durationLine: string): string {
  const good = tod === 'morning' ? 'Good morning' : 'Good evening';
  const when = tod === 'morning' ? 'morning' : 'evening';
  const count = total === 1 ? 'one step' : total === 2 ? 'two steps' : total === 3 ? 'three steps' : `${total} steps`;
  return `${good} - ready for your ${when} ${count}? ${durationLine}`;
}

function phraseDuration(seconds: number): string {
  if (seconds <= 75) return 'About a minute.';
  if (seconds <= 105) return 'About 90 seconds.';
  if (seconds <= 150) return 'About two minutes.';
  return 'A couple of minutes.';
}

function progressBridge(top: VisibleFinding | null): string {
  const line = (() => {
    if (!top) return "Keep this up and we'll look for the change when you scan again.";
    const onCheeks = (top.zones ?? []).some((z) => z === 'left_cheek' || z === 'right_cheek');
    switch (top.type) {
      case 'redness':
        return onCheeks
          ? "Keep this up and we'll look for calmer cheeks when you scan again."
          : "Keep this up and we'll look for less redness when you scan again.";
      case 'dryness':
        return "Keep this up and we'll look for softer skin when you scan again.";
      case 'breakouts':
        return "Keep this up and we'll look for clearer skin when you scan again.";
      // Count nouns take "fading"/"smoother", never "less".
      case 'dark_marks':
        return "Keep this up and we'll look for those marks fading when you scan again.";
      case 'texture':
        return "Keep this up and we'll look for smoother patches when you scan again.";
      case 'under_eye_fatigue':
        return "Keep this up and we'll look for brighter eyes when you scan again.";
      case 'oil_balance':
        return "Keep this up and we'll look for less shine when you scan again.";
      case 'barrier_stress':
        return "Keep this up and we'll look for settled skin when you scan again.";
      default:
        return "Keep this up and we'll look for the change when you scan again.";
    }
  })();
  return assertVoice('progressBridge', line);
}

/** Map provided routine_focus moves onto the resolved steps. */
function mapProvidedMoves(
  moves: RoutineFocusMove[],
  steps: StepVM[],
  byId: Map<string, VisibleFinding>,
): MoveVM[] {
  const claimed = new Set<string>();
  const out: MoveVM[] = [];
  moves.slice(0, 3).forEach((m, i) => {
    const addr = new Set(m.addresses);
    const mine = steps.filter((s) => {
      if (claimed.has(s.id)) return false;
      const hit = (s.finding && addr.has(s.finding.id)) || addr.has(s.id);
      if (hit) claimed.add(s.id);
      return hit;
    });
    out.push({ id: `move-${i}`, title: m.title, why: m.why, steps: mine });
  });
  // Sweep any unclaimed steps into the nearest move so none vanish.
  const leftover = steps.filter((s) => !claimed.has(s.id));
  if (leftover.length && out.length) out[out.length - 1].steps.push(...leftover);
  return out.filter((m) => m.steps.length > 0);
}

/** Derive 2–3 move sections by grouping steps under a plain, in-voice title. */
function deriveMoves(steps: StepVM[]): MoveVM[] {
  const buckets: { key: string; title: string; why: (f: VisibleFinding | null) => string; steps: StepVM[] }[] = [
    { key: 'gentle', title: 'Be gentle', why: (f) => whyLine(f, 'A little redness to calm.'), steps: [] },
    { key: 'moisture', title: 'Bring moisture back', why: (f) => whyLine(f, 'Your skin wants more water.'), steps: [] },
    { key: 'protect', title: "Protect what you've got", why: () => 'The SPF does the long game.', steps: [] },
  ];
  const keyFor = (s: StepVM): string => {
    if (s.type === 'protect') return 'protect';
    if (s.type === 'hydrate') return 'moisture';
    if (s.concern === 'dryness') return 'moisture';
    return 'gentle';
  };
  for (const s of steps) buckets.find((b) => b.key === keyFor(s))!.steps.push(s);
  return buckets
    .filter((b) => b.steps.length > 0)
    .map((b, i) => ({ id: `move-${i}`, title: b.title, why: b.why(b.steps[0]?.finding ?? null), steps: b.steps }));
}

function whyLine(f: VisibleFinding | null, fallback: string): string {
  const noun = f ? findingNoun(f.type) : '';
  if (!noun) return fallback;
  return `There's a little ${noun} to look after.`;
}

function buildCommerce(steps: StepVM[], _top: VisibleFinding | null): YourRoutineModel['commerce'] {
  const stepsWithPicks = steps.filter((s) => s.product.pick);

  // Honest commerce, said out loud:
  //  • No (or only a skippable) treat pick → the orb says you don't need a
  //    serum yet; the basics are doing the work.
  //  • Exactly one non-essential pick aimed at redness → it's framed as the
  //    one upgrade the orb would pick. Not essential, but it'd help.
  const treatSlot = stepsWithPicks.find((s) => s.type === 'treat');
  const noSerumYet = !treatSlot || treatSlot.product.pick!.honesty === 'maybe skip this for now';
  const honestNote = noSerumYet ? VOICE.noSerumYet : undefined;

  const optionalRedness = stepsWithPicks.filter(
    (s) => s.concern === 'redness' && s.product.pick!.honesty !== 'strong',
  );
  if (optionalRedness.length === 1) {
    optionalRedness[0].product.pick!.whyHelps = VOICE.oneUpgradeForRedness;
  }

  const all = stepsWithPicks.map((s) => s.product.pick!) as NonNullable<ProductSlotVM['pick']>[];
  // Dedupe by product id — one product used in both AM and PM counts once.
  const seen = new Set<string>();
  const picks = all.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  if (picks.length === 0) return { anyPicks: false, bundle: null };
  const priced = picks.filter((p) => typeof p.price === 'number');
  const total = priced.length ? priced.reduce((a, p) => a + (p.price ?? 0), 0) : undefined;
  const bundle: BundleVM = {
    intro: "Here's everything for your routine - each one earns its place.",
    honestNote,
    items: picks.map((p) => ({
      id: p.id,
      name: p.name,
      why: p.whyHelps,
      price: p.price,
      honesty: p.honesty,
      imageAsset: p.imageAsset,
      imageUrl: p.imageUrl,
    })),
    total,
    alsoFree: 'You can also do this with what you have.',
  };
  return { anyPicks: true, bundle };
}

/** True day ordinal (UTC) — consecutive days ALWAYS differ by exactly 1, so
 *  seed rotation can never repeat across a month or leap-year boundary. */
function daySeed(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

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
  periodForRoutine,
  type RoutinePeriod,
} from '@/theme/routineAtmosphere';
import {
  doneLanding,
  pickEveningGreeting,
  pickMorningGreeting,
  VOICE,
} from './voice';
import {
  buildThroughline,
  completionBenefit,
  concernThe,
  findingNoun,
  ritualLead,
} from './findings';

/** A routine_focus "move" (from `@/state/v26/routineFocus` or derived). */
export interface RoutineFocusMove {
  title: string;
  why: string;
  /** Scan finding ids this move addresses. */
  addresses: string[];
}

export type MatchHonesty = 'strong' | 'optional' | 'maybe skip for now';

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
  items: { id: string; name: string; why: string; price?: number; honesty: MatchHonesty }[];
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

  // Greeting — varies, never repeats back-to-back, honest about real calm.
  const seed = daySeed(now);
  const greeting =
    timeOfDay === 'morning'
      ? pickMorningGreeting({ seed, lastShown: lastGreeting, calmerLately })
      : pickEveningGreeting({ seed, lastShown: lastGreeting });

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
    period: periodForRoutine(timeOfDay, now.getHours()),
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
    ? 'maybe skip for now'
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
    },
  };
}

/** Calibrate a product reason: "should help", never "will fix". */
function calibrate(why: string | undefined, finding: VisibleFinding | null): string {
  if (why && why.trim()) {
    return why.replace(/\bfix(es|ed)?\b/gi, 'should help').replace(/\bcures?\b/gi, 'should help');
  }
  if (finding) return `Should help with the ${findingNoun(finding.type)} - gently, over time.`;
  return 'A solid, no-fuss pick. Should help.';
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
  if (!top) return "Keep this up and we'll look for the change when you scan again.";
  const noun = findingNoun(top.type);
  const onCheeks = (top.zones ?? []).some((z) => z === 'left_cheek' || z === 'right_cheek');
  if (top.type === 'redness' && onCheeks) return "Keep this up and we'll look for calmer cheeks when you scan again.";
  if (top.type === 'dryness') return "Keep this up and we'll look for softer skin when you scan again.";
  if (top.type === 'breakouts') return "Keep this up and we'll look for clearer skin when you scan again.";
  return `Keep this up and we'll look for less ${noun} when you scan again.`;
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
  if (!f) return fallback;
  const noun = findingNoun(f.type);
  return `There's a little ${noun} to look after.`;
}

function buildCommerce(steps: StepVM[], _top: VisibleFinding | null): YourRoutineModel['commerce'] {
  const all = steps.map((s) => s.product.pick).filter(Boolean) as NonNullable<ProductSlotVM['pick']>[];
  // Dedupe by product id — one product used in both AM and PM counts once.
  const seen = new Set<string>();
  const picks = all.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  if (picks.length === 0) return { anyPicks: false, bundle: null };
  const priced = picks.filter((p) => typeof p.price === 'number');
  const total = priced.length ? priced.reduce((a, p) => a + (p.price ?? 0), 0) : undefined;
  const bundle: BundleVM = {
    intro: "Here's everything for your routine - each one earns its place.",
    items: picks.map((p) => ({ id: p.id, name: p.name, why: p.whyHelps, price: p.price, honesty: p.honesty })),
    total,
    alsoFree: 'You can also do this with what you have.',
  };
  return { anyPicks: true, bundle };
}

/** Stable day seed from a local date — moves greetings across days, not within. */
function daySeed(d: Date): number {
  return d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
}

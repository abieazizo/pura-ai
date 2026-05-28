/**
 * Pura Routine — build orchestrator.
 *
 * Drives the build through real async stages while reporting
 * progress to the routine store. Each stage represents actual work:
 *
 *   1. reading_focus_areas — gather scan + analysis from the store
 *   2. matching_step_types — request the AI plan (or fall back)
 *   3. checking_shelf — read the user's owned products
 *   4. matching_products — resolve linked product ids in catalog
 *   5. finalizing_plan — assemble the CustomRoutine
 *
 * The AI call is the long pole. Earlier stages have a small
 * floor delay so the UI can breathe; later stages only advance
 * once the AI gateway returns.
 */

import type {
  CustomRoutine,
  RoutineBuildProductStep,
  RoutineBuildStage,
  RoutineBuildSubPhase,
  RoutineStep,
} from '@/types/routine';
import type {
  ScanAnalysisResponse,
} from '@/types/scanResults';
import type { Scan } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useRoutineStore } from '@/state/routine/routineStore';
import {
  canGenerateRoutineFromScan,
  selectVisibleFindings,
  translateScanToAnalysis,
} from '@/services/scanResults/translateAnalysis';
import { generateAIRoutine } from './aiRoutineService';
import { matchProductForStep } from './productMatcherService';
import { getShelfProducts } from './shelfService';

interface BuildOptions {
  /** Min wall-clock time per non-AI stage. */
  minStageMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_MIN_STAGE_MS = 420;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('aborted'));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new Error('aborted'));
    });
  });
}

/**
 * Build a routine from a real scan + analysis. Calls the AI gateway
 * when available; falls back to a deterministic plan when not.
 */
const PRODUCT_STEPS_ORDER: RoutineBuildProductStep[] = [
  'cleanse',
  'treat',
  'moisturize',
  'protect',
];

const PRODUCT_SUB_PHASES: RoutineBuildSubPhase[] = [
  'selecting_step',
  'finding_best_match',
  'checking_compatibility',
];

async function walkProductSteps(
  routine: CustomRoutine,
  perSubPhaseMs: number,
  signal?: AbortSignal,
): Promise<void> {
  const store = useRoutineStore.getState();
  for (const step of PRODUCT_STEPS_ORDER) {
    // Only animate through steps the routine actually contains.
    const includedInRoutine =
      stepIncluded(routine.morningSteps, step) ||
      stepIncluded(routine.eveningSteps, step);
    if (!includedInRoutine) {
      store.setBuildProductStep(step, 'checking_compatibility');
      store.completeBuildProductStep(step);
      continue;
    }
    for (const sub of PRODUCT_SUB_PHASES) {
      store.setBuildProductStep(step, sub);
      await sleep(perSubPhaseMs, signal);
    }
    store.completeBuildProductStep(step);
  }
}

function stepIncluded(
  steps: RoutineStep[],
  type: RoutineBuildProductStep,
): boolean {
  const typeKey = type === 'moisturize' ? 'hydrate' : type;
  return steps.some((s) => s.type === typeKey);
}

export async function buildRoutineFromScan(args: {
  scanId: string;
  scan: Scan;
  analysis: ScanAnalysisResponse;
  options?: BuildOptions;
}): Promise<CustomRoutine> {
  const { scanId, scan, analysis } = args;
  const minStageMs = args.options?.minStageMs ?? DEFAULT_MIN_STAGE_MS;
  const signal = args.options?.signal;

  // Truth-first hard gates. Defense in depth: even if the caller
  // bypassed `beginRoutineFromAnalysis`, the build will fail loudly
  // here rather than producing a fake routine from invented findings.
  if (analysis.scanQuality.usability === 'retake_required') {
    throw new Error('Your scan needs to be retaken before we can build a routine.');
  }
  const supportedFindings = selectVisibleFindings(analysis);
  if (supportedFindings.length === 0) {
    throw new Error('No supported findings — a clearer scan is needed before creating a routine.');
  }
  if (!analysis.routineEligibility.allowed) {
    throw new Error(
      analysis.routineEligibility.reason ??
        'Scan results do not support a routine yet.',
    );
  }
  if (!canGenerateRoutineFromScan(analysis, supportedFindings)) {
    throw new Error('Routine eligibility check failed.');
  }

  const store = useRoutineStore.getState();
  const limitedByScan = analysis.scanQuality.usability === 'limited_results';

  // ---------- Phase 1 — Reading scan (real prep work) ----------
  store.updateBuildProgress('reading_focus_areas');
  await sleep(minStageMs, signal);

  // ---------- Phase 2 — Choosing steps (AI call) ----------
  store.updateBuildProgress('matching_step_types');

  const aiAnalysis = scan.aiAnalysis;
  let routine: CustomRoutine;

  // v34 — read the scan-derived routineSeed so deterministic logic
  // (and the explanation copy) can reflect the actual scan even when
  // the legacy aiAnalysis path is missing.
  const seed = scan.v2Analysis?.routine_seed ?? null;

  if (aiAnalysis) {
    try {
      const result = await generateAIRoutine({ scanId, analysis: aiAnalysis, signal });
      routine = result.routine;
    } catch {
      routine = buildDeterministicRoutine(scanId, analysis, limitedByScan, seed);
    }
  } else {
    routine = buildDeterministicRoutine(scanId, analysis, limitedByScan, seed);
  }

  // v34 — Even when the AI routine path returned a plan, weave the
  // scan-derived seed into the explanation lines so the user can see
  // the connection between scan findings and routine choices.
  if (seed) {
    const seedExplanation = buildSeedExplanation(seed, limitedByScan);
    routine = {
      ...routine,
      explanation: dedupeMerge(routine.explanation, seedExplanation, 3),
      excludedDirections: dedupeMerge(
        routine.excludedDirections ?? [],
        seed.avoid_tonight.map(
          (a) => `Avoiding ${a} based on your scan tonight`,
        ),
        4,
      ),
    };
  }

  // ---------- Phase 3 — Per-product step walkthrough ----------
  // The AI has returned the full plan. Visually walk through the four
  // product steps so the user sees the system "choosing" each one.
  store.updateBuildProgress('matching_products');
  await walkProductSteps(routine, Math.max(220, Math.round(minStageMs * 0.6)), signal);

  // ---------- Phase 4 — Checking shelf ----------
  store.updateBuildProgress('checking_shelf');
  void getShelfProducts();
  await sleep(Math.max(160, minStageMs * 0.4), signal);

  // ---------- Phase 5 — Finalizing plan ----------
  store.updateBuildProgress('finalizing_plan');
  routine = { ...routine, limitedByScan };
  await sleep(Math.max(160, minStageMs * 0.4), signal);

  return routine;
}

// ---------------------------------------------------------------------------
// Deterministic fallback — only used when the AI gateway is unavailable
// or fails. Generates a minimal, conservative plan from visible findings.
// ---------------------------------------------------------------------------

function buildDeterministicRoutine(
  scanId: string,
  analysis: ScanAnalysisResponse,
  limitedByScan: boolean,
  seed: import('@/types/scanResultV2').RoutineSeedV2 | null,
): CustomRoutine {
  const findings = analysis.findings.filter((f) => f.present && f.supportedByScan);
  const findingIds = findings.map((f) => f.id);
  const safeForActives = !limitedByScan && seed?.intensity !== 'gentle';

  // v34 — seed-aware step inclusion. When the seed says "treat" is
  // recommended, include it even if our concern filter would have
  // skipped it (the seed encodes the AI's holistic decision).
  const seedSteps = seed?.recommended_step_types ?? null;
  const wantsTreat = seedSteps ? seedSteps.includes('treat') : true;
  const wantsProtect = seedSteps ? seedSteps.includes('protect') : true;
  const wantsCleanse = seedSteps ? seedSteps.includes('cleanse') : true;
  const wantsMoisturize = seedSteps ? seedSteps.includes('moisturize') : true;

  const baseSteps: RoutineStep[] = [];
  if (wantsCleanse) {
    const cleanse = makeStep('cleanse', 1, 'both', findingIds, false);
    baseSteps.push({
      ...cleanse,
      purpose: seed?.step_taglines.cleanse ?? cleanse.purpose,
    });
  }

  const treatFindings = findings.filter((f) =>
    ['breakouts', 'dark_marks', 'texture', 'oil_balance'].includes(f.type),
  );
  if (wantsTreat && (treatFindings.length > 0 || seedSteps?.includes('treat')) && safeForActives) {
    const top = treatFindings[0];
    const step = makeStep('treat', 2, 'evening', top ? [top.id] : findingIds, false);
    baseSteps.push({
      ...step,
      purpose:
        seed?.step_taglines.treat ??
        (top
          ? `Targets visible ${top.displayName.toLowerCase()}.`
          : 'Targets your scan-supported focus areas.'),
    });
  }

  if (wantsMoisturize) {
    const moist = makeStep('hydrate', 3, 'both', findingIds, false);
    baseSteps.push({
      ...moist,
      purpose: seed?.step_taglines.moisturize ?? moist.purpose,
    });
  }
  if (wantsProtect) {
    const protect = makeStep('protect', 4, 'morning', findingIds, false);
    baseSteps.push({
      ...protect,
      purpose: seed?.step_taglines.protect ?? protect.purpose,
    });
  }

  const morningSteps = baseSteps
    .filter((s) => s.timing === 'morning' || s.timing === 'both')
    .map((s, i) => ({ ...s, order: i + 1 }));
  const eveningSteps = baseSteps
    .filter((s) => s.timing === 'evening' || s.timing === 'both')
    .map((s, i) => ({ ...s, order: i + 1 }));

  const excluded: string[] = [];
  if (limitedByScan) {
    excluded.push('Strong actives skipped while your scan settles in');
  }
  if (findings.some((f) => f.type === 'redness' || f.type === 'barrier_stress')) {
    excluded.push('Avoiding scrubs and high-strength exfoliants for now');
  }

  return {
    id: `routine-${scanId}-${Date.now()}`,
    scanId,
    createdAt: new Date().toISOString(),
    status: 'ready_to_review',
    morningSteps,
    eveningSteps,
    explanation: [
      findings[0]
        ? `Designed around ${findings[0].displayName.toLowerCase()}`
        : 'Based on your visible focus areas',
      'Organized into morning and evening steps',
      limitedByScan
        ? 'Limited plan — your scan suggested keeping things gentle'
        : 'Ready for product confirmation',
    ],
    excludedDirections: excluded,
    canStartMorning: false,
    canStartEvening: false,
    limitedByScan,
  };
}

function makeStep(
  type: RoutineStep['type'],
  order: number,
  timing: RoutineStep['timing'],
  relatedFocusAreaIds: string[],
  optional: boolean,
): RoutineStep {
  const matched = matchProductForStep({ type, relatedConcerns: [] });
  return {
    id: `det-step-${type}`,
    order,
    type,
    title: titleFor(type),
    purpose: purposeFor(type),
    directions: directionsFor(type),
    timing,
    frequency: frequencyFor(type, timing),
    optional,
    relatedFocusAreaIds,
    product: matched.product ?? undefined,
    availability: matched.product ? matched.availability : 'missing',
  };
}

function titleFor(t: RoutineStep['type']): string {
  return t === 'cleanse' ? 'Cleanse' : t === 'treat' ? 'Treat' : t === 'hydrate' ? 'Hydrate' : 'Protect';
}

function purposeFor(t: RoutineStep['type']): string {
  switch (t) {
    case 'cleanse':
      return 'Reset your skin without stripping the barrier.';
    case 'treat':
      return 'Targets your visible focus areas.';
    case 'hydrate':
      return 'Support your barrier and lock in moisture.';
    case 'protect':
      return 'Daily UV protection to support visible progress.';
  }
}

function directionsFor(t: RoutineStep['type']): string {
  switch (t) {
    case 'cleanse':
      return 'Massage lightly with a small amount, then rinse with lukewarm water.';
    case 'treat':
      return 'Apply a small amount to affected areas after cleansing.';
    case 'hydrate':
      return 'Apply an even layer over slightly damp skin.';
    case 'protect':
      return 'Apply a generous layer as your last morning step.';
  }
}

function frequencyFor(t: RoutineStep['type'], timing: RoutineStep['timing']): string {
  if (t === 'protect') return 'Daily, morning';
  if (t === 'treat') return '2× weekly to start';
  if (timing === 'both') return 'Daily';
  return timing === 'morning' ? 'Morning' : 'Evening';
}

// ---------------------------------------------------------------------------
// v34 — seed → explanation copy. Used by the routine ready screen to
// surface "Why this routine?" lines that are clearly tied to the scan.
// ---------------------------------------------------------------------------

function buildSeedExplanation(
  seed: import('@/types/scanResultV2').RoutineSeedV2,
  limitedByScan: boolean,
): string[] {
  const out: string[] = [];
  if (seed.skin_needs.length > 0) {
    out.push(`Designed around ${seed.skin_needs.slice(0, 2).join(' and ')}`);
  }
  if (seed.intensity === 'gentle') {
    out.push('Kept gentle to protect your barrier');
  } else if (seed.intensity === 'active') {
    out.push('Calibrated for visible results — your scan can handle it');
  } else {
    out.push('Calibrated to your scan — balanced, not aggressive');
  }
  if (limitedByScan) {
    out.push('Conservative plan while your scan settles in');
  }
  return out;
}

function dedupeMerge(a: string[], b: string[], cap: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [...a, ...b]) {
    const key = s.trim().toLowerCase();
    if (key.length === 0) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public entry: build kick-off used by the orchestrator screen.
// ---------------------------------------------------------------------------

export async function startRoutineBuild(args: {
  scanId: string;
  scan: Scan;
  analysis: ScanAnalysisResponse;
}): Promise<void> {
  const store = useRoutineStore.getState();
  store.startBuild(args.scanId);
  try {
    const routine = await buildRoutineFromScan({
      scanId: args.scanId,
      scan: args.scan,
      analysis: args.analysis,
    });
    useRoutineStore.getState().completeBuild(routine);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Build failed.';
    useRoutineStore.getState().failBuild(msg);
  }
}

/**
 * Reduce a built routine down to only steps whose product is `owned`
 * or `not_required`. Used when the user picks "Use only products I own".
 */
export function reduceToOwnedOnly(routine: CustomRoutine): CustomRoutine {
  const filter = (s: RoutineStep) =>
    s.availability === 'owned' || s.availability === 'not_required';
  return {
    ...routine,
    morningSteps: routine.morningSteps.filter(filter),
    eveningSteps: routine.eveningSteps.filter(filter),
  };
}

export function isShelfProduct(productId: string): boolean {
  const state = useAppStore.getState();
  return (
    state.userRoutineMorning.includes(productId) ||
    state.userRoutineEvening.includes(productId)
  );
}

// Re-export for legacy consumers (analysis adapter).
export { translateScanToAnalysis };

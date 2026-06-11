/**
 * The Pura recommendation engine — RULES-BASED, deterministic, auditable.
 * No LLM anywhere in here. (An optional polisher may later rephrase the
 * why-line's TONE; the deterministic line below always exists first.)
 *
 * HONESTY RULES — enforced in code, proven by scripts/verifyMoneyEngine.ts:
 *   R1  Rank by FIT to the findings. Price and tier appear NOWHERE in
 *       scoring or ordering (verified by price-shuffle invariance).
 *   R2  Every slot offers a budget alternative (or the pick IS budget).
 *   R3  Every pick carries a calibrated label: good match / optional /
 *       "you can skip this for now".
 *   R4  Steps the user already owns something for are SKIPPED (and the
 *       routine says so) — never re-sold.
 *   R5  A beginner never gets more than ONE real active treatment.
 *   R6  SPF is always in the routine. Always. Never skippable.
 *
 * The recommendation IS the routine: this output is what Tailoring feeds,
 * what "Your Routine" renders, and what locks at Confirm.
 */

import { REGION_LABEL, type SkinRead } from '@/types/skinRead';
import { COMMERCE_CATALOG } from './catalog';
import type {
  CommerceSku,
  EngineFinding,
  EngineInput,
  PickLabel,
  RecommendationSet,
  RoutinePick,
  RoutineSlot,
  RoutineStepKind,
} from './types';

const LEVEL_WEIGHT: Record<EngineFinding['level'], number> = {
  'a little': 1,
  some: 2,
  'a lot': 3,
};

// ── Findings adapter (the results flow's JSON → engine input) ──────────────

/** Build engine findings from the canonical SkinRead (screens 1–2's contract). */
export function engineFindingsFromSkinRead(read: SkinRead): EngineFinding[] {
  return read.findings
    .filter((f) => f.metric !== 'positive')
    .map((f) => ({
      id: f.id,
      metric: f.metric,
      level: f.level,
      regionPhrase: f.strongestRegion
        ? `your ${REGION_LABEL[f.strongestRegion].toLowerCase()}`
        : '',
    }));
}

// ── Fit scoring (R1: no price term — provably) ─────────────────────────────

/**
 * How well a SKU fits THESE findings. Pure concern-overlap weighted by the
 * plain-word level. `priceUsd`/`priceTier` are not read — the verifier proves
 * ranking is invariant under any price reassignment.
 */
export function fitScore(sku: CommerceSku, findings: EngineFinding[]): number {
  let score = 0;
  for (const f of findings) {
    const w = LEVEL_WEIGHT[f.level];
    if (sku.concerns.includes(f.metric as never)) score += 10 * w;
  }
  // Weak general-fit signal so universal staples beat mismatched specialists
  // when nothing matches, but never beat a true concern match (10+).
  if (sku.concerns.includes('all_skin')) score += 1;
  if (sku.concerns.includes('sensitive') && findings.some((f) => f.metric === 'redness')) {
    score += 2;
  }
  return score;
}

/** Stable, price-blind ordering: fit ↓, beginner-safe first, gentler first, id ↑. */
function rankSkus(skus: CommerceSku[], findings: EngineFinding[]): CommerceSku[] {
  const gentleness: Record<CommerceSku['activeStrength'], number> = {
    none: 0,
    gentle: 1,
    active: 2,
  };
  return [...skus].sort((a, b) => {
    const fa = fitScore(a, findings);
    const fb = fitScore(b, findings);
    if (fb !== fa) return fb - fa;
    if (a.beginnerSafe !== b.beginnerSafe) return a.beginnerSafe ? -1 : 1;
    if (gentleness[a.activeStrength] !== gentleness[b.activeStrength]) {
      return gentleness[a.activeStrength] - gentleness[b.activeStrength];
    }
    return a.id < b.id ? -1 : 1;
  });
}

// ── Why-lines (deterministic; the LLM may later rephrase tone ONLY) ────────

const STEP_TITLE: Record<RoutineStepKind, string> = {
  cleanse: 'Cleanse',
  treat: 'Treat',
  moisturize: 'Moisturize',
  protect: 'Protect',
};

const METRIC_PHRASE: Record<string, string> = {
  redness: 'the redness',
  dryness: 'the dry patches',
  dark_marks: 'the dark marks',
  breakouts: 'the breakouts',
  oil: 'the midday shine',
};

function whyLineFor(
  step: RoutineStepKind,
  target: EngineFinding | null,
  dryness: EngineFinding | undefined,
): string {
  if (step === 'treat' && target) {
    const what = METRIC_PHRASE[target.metric] ?? 'what stood out';
    return `${STEP_TITLE[step]} — for ${what}${target.regionPhrase ? ` on ${target.regionPhrase}` : ''}.`;
  }
  if (step === 'protect') {
    return 'Protect — daily sun cover is what keeps today’s progress from undoing itself.';
  }
  if (step === 'moisturize') {
    return dryness
      ? `Moisturize — for ${METRIC_PHRASE.dryness}${dryness.regionPhrase ? ` on ${dryness.regionPhrase}` : ''}.`
      : 'Moisturize — settles everything in so the rest can work.';
  }
  return 'Cleanse — the calm, clean start everything else builds on.';
}

// ── The engine ─────────────────────────────────────────────────────────────

export function buildRecommendation(
  input: EngineInput,
  catalog: readonly CommerceSku[] = COMMERCE_CATALOG,
): RecommendationSet {
  const findings = input.findings.filter((f) => f.metric !== 'positive');
  const beginner = input.beginner ?? true;
  const owned = new Set(input.tailoring.ownedSteps);

  // Findings strongest-first decide treat targets.
  const ordered = [...findings].sort(
    (a, b) => LEVEL_WEIGHT[b.level] - LEVEL_WEIGHT[a.level],
  );
  const heroFinding = ordered[0] ?? null;
  const secondFinding =
    ordered.find((f) => f.id !== heroFinding?.id && f.metric !== heroFinding?.metric) ?? null;
  const dryness = findings.find((f) => f.metric === 'dryness');
  const oilOnly =
    findings.length > 0 && findings.every((f) => f.metric === 'oil');

  const byStep = (step: RoutineStepKind) => catalog.filter((s) => s.step === step);

  const makePick = (
    sku: CommerceSku | undefined,
    step: RoutineStepKind,
    target: EngineFinding | null,
  ): RoutinePick | null =>
    sku
      ? {
          sku,
          whyLine: whyLineFor(step, target, dryness),
          findingIds: target
            ? [target.id]
            : findings.filter((f) => sku.concerns.includes(f.metric as never)).map((f) => f.id),
        }
      : null;

  /** R2 — the best-fit budget option for the slot (null iff pick is budget). */
  const budgetAltFor = (
    step: RoutineStepKind,
    pick: CommerceSku | undefined,
    target: EngineFinding | null,
  ): RoutinePick | null => {
    if (!pick || pick.priceTier === 'budget') return null;
    const alt = rankSkus(
      byStep(step).filter((s) => s.priceTier === 'budget' && s.id !== pick.id),
      target ? [target] : findings,
    )[0];
    return makePick(alt, step, target);
  };

  const slots: RoutineSlot[] = [];

  const pushSlot = (
    step: RoutineStepKind,
    target: EngineFinding | null,
    label: PickLabel,
    essential: boolean,
    candidates?: CommerceSku[],
  ) => {
    // R4 — owned steps are skipped, said plainly, never re-sold.
    if (owned.has(step)) {
      slots.push({
        step,
        time: step === 'protect' ? 'AM' : 'both',
        pick: null,
        budgetAlternative: null,
        label: 'skippable',
        skippedBecauseOwned: true,
        essential: false,
      });
      return;
    }
    const pool = candidates ?? byStep(step);
    const ranked = rankSkus(pool, target ? [target] : findings);
    const pick = ranked[0];
    slots.push({
      step,
      time: pick?.time ?? (step === 'protect' ? 'AM' : 'both'),
      pick: makePick(pick, step, target),
      budgetAlternative: budgetAltFor(step, pick, target),
      label,
      skippedBecauseOwned: false,
      essential,
    });
  };

  // CLEANSE — core, always essential.
  pushSlot('cleanse', null, 'good_match', true);

  // TREAT — targets the hero finding; only candidates that actually address it.
  if (heroFinding) {
    const pool = byStep('treat').filter((s) =>
      s.concerns.includes(heroFinding.metric as never),
    );
    pushSlot(
      'treat',
      heroFinding,
      heroFinding.level === 'a little' ? 'optional' : 'good_match',
      true,
      pool.length ? pool : undefined,
    );
  }

  // Second TREAT — full routine only, different concern, honest 'optional'.
  if (!owned.has('treat') && input.tailoring.depth === 'full' && secondFinding) {
    const pool = byStep('treat').filter(
      (s) =>
        s.concerns.includes(secondFinding.metric as never) &&
        s.id !== slots.find((sl) => sl.step === 'treat')?.pick?.sku.id,
    );
    if (pool.length) {
      const ranked = rankSkus(pool, [secondFinding]);
      slots.push({
        step: 'treat',
        time: ranked[0].time,
        pick: makePick(ranked[0], 'treat', secondFinding),
        budgetAlternative: budgetAltFor('treat', ranked[0], secondFinding),
        label: 'optional',
        skippedBecauseOwned: false,
        essential: false,
      });
    }
  }

  // MOISTURIZE — honest label: skippable for an oil-only profile.
  pushSlot(
    'moisturize',
    dryness ?? null,
    dryness ? 'good_match' : oilOnly ? 'skippable' : 'optional',
    !!dryness,
  );

  // PROTECT — R6: always present, always good_match, never skippable.
  pushSlot('protect', null, 'good_match', true);

  // R5 — beginner active cap: keep ONE real active (the hero's), demote others.
  if (beginner) {
    let kept = false;
    for (const slot of slots) {
      if (slot.pick?.sku.activeStrength !== 'active') continue;
      if (!kept) {
        kept = true;
        continue;
      }
      const target =
        findings.find((f) => slot.pick?.findingIds.includes(f.id)) ?? null;
      const gentler = rankSkus(
        byStep(slot.step).filter(
          (s) =>
            s.activeStrength !== 'active' &&
            (!target || s.concerns.includes(target.metric as never)),
        ),
        target ? [target] : findings,
      )[0];
      slot.pick = makePick(gentler, slot.step, target);
      slot.budgetAlternative = budgetAltFor(slot.step, gentler, target);
      slot.label = slot.pick ? 'optional' : 'skippable';
    }
  }

  const activeCount = slots.filter(
    (s) => !s.skippedBecauseOwned && s.pick?.sku.activeStrength === 'active',
  ).length;

  const inAm = (s: RoutineSlot) => s.time === 'AM' || s.time === 'both';
  const inPm = (s: RoutineSlot) =>
    (s.time === 'PM' || s.time === 'both') && s.step !== 'protect';

  return {
    slots,
    am: slots.filter(inAm),
    pm: slots.filter(inPm),
    basisFindingIds: findings.map((f) => f.id),
    tailoring: input.tailoring,
    activeCount,
  };
}

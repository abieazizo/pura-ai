/**
 * toRoutine — the bridge that makes the recommendation BECOME the routine
 * (the money flow's core principle, made real). It maps the user's chosen
 * commerce products onto the canonical `CustomRoutine` that Home + the ritual
 * consume — so what you pick is literally what's in your routine, with its real
 * packshot. Committed at Confirm via useRoutineStore.completeBuild.
 *
 * Pure + dependency-light (types only) so it's unit-testable headlessly.
 */
import type {
  CustomRoutine,
  ProductAvailability,
  RoutineProduct,
  RoutineStep,
  RoutineStepType,
} from '@/types/routine';
import type { CommerceSku } from '@/commerce/types';
import type { SelectedLine } from './YourRoutineScreen';

const STEP_TYPE: Record<string, RoutineStepType> = {
  cleanse: 'cleanse',
  treat: 'treat',
  moisturize: 'hydrate',
  protect: 'protect',
};
const STEP_TITLE: Record<string, string> = {
  cleanse: 'Cleanse',
  treat: 'Treat',
  moisturize: 'Moisturize',
  protect: 'Protect',
};
const FREQ: Record<string, string> = {
  cleanse: 'Daily',
  treat: 'Nightly',
  moisturize: 'Daily',
  protect: 'Every morning',
};

function productFrom(sku: CommerceSku, whyLine: string, availability: ProductAvailability): RoutineProduct {
  return {
    id: sku.id,
    brand: sku.brand,
    name: sku.name,
    imageAsset: typeof sku.image === 'number' ? sku.image : undefined,
    productType: STEP_TYPE[sku.step] ?? 'treat',
    whyMatched: whyLine,
    availability,
  };
}

/**
 * Build the committed routine from the Confirm-screen selection. A bought /
 * selected line becomes a `recommended` step carrying that exact product; the
 * product-free path ("I'll do it with what I have") keeps the SAME steps but
 * marks them `owned` (do it with what you have); an owned-skip slot becomes an
 * `owned` step with no product. SPF is never optional.
 */
export function routineFromSelection(lines: SelectedLine[], scanId: string, nowIso: string): CustomRoutine {
  let order = 0;
  const steps: RoutineStep[] = [];

  for (const line of lines) {
    const slot = line.slot;
    const timing = slot.time === 'AM' ? 'morning' : slot.time === 'PM' ? 'evening' : 'both';
    const type = STEP_TYPE[slot.step] ?? 'treat';

    if (slot.skippedBecauseOwned) {
      steps.push({
        id: `mstep-${order}`,
        order: order++,
        type,
        title: STEP_TITLE[slot.step] ?? 'Step',
        purpose: 'You’ve already got this one.',
        directions: 'Use the one you have.',
        timing,
        frequency: FREQ[slot.step] ?? 'Daily',
        optional: false,
        relatedFocusAreaIds: [],
        availability: 'owned',
      });
      continue;
    }
    if (!slot.pick) continue;

    const chosen = line.chosenId === slot.budgetAlternative?.sku.id ? slot.budgetAlternative! : slot.pick;
    const sku = chosen.sku;
    // Selected → recommended (in the plan to get); deselected / product-free →
    // owned (do it with what you have). SPF is never optional.
    const availability: ProductAvailability = line.selected ? 'recommended' : 'owned';

    steps.push({
      id: `mstep-${order}`,
      order: order++,
      type,
      title: STEP_TITLE[slot.step] ?? 'Step',
      purpose: chosen.whyLine,
      directions: sku.blurb,
      timing,
      frequency: FREQ[slot.step] ?? 'Daily',
      optional: slot.step !== 'protect' && slot.label !== 'good_match',
      relatedFocusAreaIds: chosen.findingIds,
      product: productFrom(sku, chosen.whyLine, availability),
      availability,
    });
  }

  const morningSteps = steps.filter((s) => s.timing === 'morning' || s.timing === 'both');
  // protect is a morning step only — keep it out of the evening list.
  const eveningSteps = steps.filter((s) => (s.timing === 'evening' || s.timing === 'both') && s.type !== 'protect');

  const anyOwned = (list: RoutineStep[]) => list.some((s) => s.availability === 'owned');

  return {
    id: `mroutine-${scanId}`,
    scanId,
    createdAt: nowIso,
    status: 'active',
    morningSteps,
    eveningSteps,
    explanation: [
      'Built from what your scan actually showed.',
      'Each step is a real product, picked for fit — and ranked only by fit, never price.',
    ],
    canStartMorning: morningSteps.length > 0 && (anyOwned(morningSteps) || morningSteps.some((s) => s.availability === 'recommended')),
    canStartEvening: eveningSteps.length > 0 && (anyOwned(eveningSteps) || eveningSteps.some((s) => s.availability === 'recommended')),
    limitedByScan: false,
  };
}

/**
 * Pura Routine — AI generation service.
 *
 * Wraps the existing `aiGateway.generateRoutineRecommendation` call
 * (gpt-5-mini, strict JSON schema, 90s timeout) and adapts its
 * output into the Routine domain's `CustomRoutine` shape.
 *
 * The AI never claims ownership of products. Linked product ids
 * from the response are resolved against the shop catalog; if a
 * step's `linked_product_id` matches the user's shelf, it lands as
 * `owned`; otherwise it lands as `needs_confirmation`.
 *
 * If the AI proxy is unavailable, this service throws — callers
 * (the build orchestrator) decide whether to fall back to a
 * deterministic plan or surface a failure.
 */

import { aiGateway } from '@/ai/aiGateway';
import { aiTelemetry } from '@/ai/aiTelemetry';
import type {
  FaceScanAnalysis,
  RoutineAction,
  RoutineRecommendation,
} from '@/ai/ai-contracts';
import { findShopProduct } from '@/screens/shop/shopCatalog';
import { useAppStore } from '@/store/useAppStore';
import type {
  CustomRoutine,
  ProductAvailability,
  RoutineProduct,
  RoutineStep,
  RoutineStepType,
  RoutineTimeOfDay,
} from '@/types/routine';
import {
  catalogProductToRoutineProduct,
  getShelfProductIds,
  stepTypeForCatalogProduct,
} from './shelfService';
import { matchProductForStep } from './productMatcherService';

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

/**
 * AI's `RoutineAction.title` is a headline-form sentence (e.g. "Calming
 * gel on chin"). For the routine step `title` we want a short label
 * — `Cleanse`, `Treat`, `Hydrate`, `Protect`. The AI's full sentence
 * is kept as `purpose`.
 */
function deriveStepType(action: RoutineAction): RoutineStepType {
  const lower = `${action.title} ${action.instruction}`.toLowerCase();
  if (/cleans|wash|rinse|foam|gel/.test(lower)) return 'cleanse';
  if (/spf|sun|uv/.test(lower)) return 'protect';
  if (/moistur|cream|barrier|lotion/.test(lower)) return 'hydrate';
  // Default treat for serums / acids / actives / spot
  return 'treat';
}

function titleForStepType(t: RoutineStepType): string {
  switch (t) {
    case 'cleanse':
      return 'Cleanse';
    case 'treat':
      return 'Treat';
    case 'hydrate':
      return 'Hydrate';
    case 'protect':
      return 'Protect';
  }
}

function frequencyFor(t: RoutineStepType, timing: RoutineTimeOfDay | 'both'): string {
  if (t === 'protect') return 'Daily, morning';
  if (t === 'treat') return '2× weekly to start';
  if (timing === 'both') return 'Daily';
  return timing === 'morning' ? 'Morning' : 'Evening';
}

function resolveProduct(
  linkedProductId: string | null,
  type: RoutineStepType,
  shelfIds: Set<string>,
): { product?: RoutineProduct; availability: ProductAvailability } {
  if (!linkedProductId) {
    return { availability: 'missing' };
  }
  const shop = findShopProduct(linkedProductId);
  if (!shop) {
    // AI linked an id outside the local catalog — treat as needing confirmation.
    return {
      product: {
        id: linkedProductId,
        brand: '',
        name: linkedProductId,
        productType: type,
        availability: 'needs_confirmation',
      },
      availability: 'needs_confirmation',
    };
  }
  if (shelfIds.has(linkedProductId)) {
    return {
      product: catalogProductToRoutineProduct(shop, 'owned', 'Already on your shelf'),
      availability: 'owned',
    };
  }
  return {
    product: catalogProductToRoutineProduct(
      shop,
      'needs_confirmation',
      'Matched from your scan',
    ),
    availability: 'needs_confirmation',
  };
}

function actionToStep(
  action: RoutineAction,
  timing: RoutineTimeOfDay | 'both',
  shelfIds: Set<string>,
  scanFindingIds: string[],
): RoutineStep {
  const type = deriveStepType(action);
  const { product, availability } = resolveProduct(
    action.linked_product_id,
    type,
    shelfIds,
  );

  // If AI didn't link a product, run the deterministic matcher so the
  // user still sees a real catalog option for the step.
  let resolvedProduct = product;
  let resolvedAvailability = availability;
  if (!resolvedProduct) {
    const matched = matchProductForStep({
      type,
      relatedConcerns: [],
    });
    if (matched.product) {
      resolvedProduct = matched.product;
      resolvedAvailability = matched.availability;
    }
  }

  return {
    id: `ai-step-${action.slot}-${action.step_order}`,
    order: action.step_order,
    type,
    title: titleForStepType(type),
    purpose: action.title || action.reason || titleForStepType(type),
    directions: action.instruction,
    timing,
    frequency: frequencyFor(type, timing),
    optional: false,
    relatedFocusAreaIds: scanFindingIds,
    product: resolvedProduct,
    availability: resolvedAvailability,
  };
}

function buildExplanationFromAi(
  rec: RoutineRecommendation,
  analysis: FaceScanAnalysis,
): string[] {
  const concernLabel =
    analysis.primary_concern && typeof analysis.primary_concern === 'string'
      ? `Designed around ${analysis.primary_concern.replace(/_/g, ' ')}`
      : 'Based on your visible focus areas';
  const out: string[] = [concernLabel, 'Organized into morning and evening steps'];
  if (rec.headline) out.push(rec.headline);
  else out.push('Ready for product confirmation');
  return out;
}

function buildExcludedDirections(rec: RoutineRecommendation, analysis: FaceScanAnalysis): string[] {
  const out: string[] = [];
  if (analysis.next_focus?.avoid && analysis.next_focus.avoid.length > 0) {
    out.push(...analysis.next_focus.avoid.slice(0, 2));
  }
  if (out.length === 0 && rec.headline.toLowerCase().includes('barrier')) {
    out.push('Avoiding strong actives while your barrier settles in');
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export interface GenerateAIRoutineArgs {
  scanId: string;
  analysis: FaceScanAnalysis;
  signal?: AbortSignal;
}

export interface AIRoutineResult {
  routine: CustomRoutine;
  recommendation: RoutineRecommendation;
  source: 'ai' | 'cached';
}

/**
 * Call the AI gateway (or reuse a cached recommendation from the
 * app store) and adapt the response into a `CustomRoutine`.
 *
 * Throws when:
 *   • the gateway is unavailable (no proxy configured)
 *   • the AI call fails / times out
 *   • the response is empty or unusable
 */
export async function generateAIRoutine(
  args: GenerateAIRoutineArgs,
): Promise<AIRoutineResult> {
  const { scanId, analysis } = args;

  // Try cache first — `useAppStore.aiRoutine` is populated automatically
  // after every scan, so often the build screen can render against a
  // recommendation that is already in memory.
  const cached = useAppStore.getState().aiRoutine;
  let recommendation: RoutineRecommendation | null = null;
  let source: 'ai' | 'cached' = 'ai';

  if (cached && cached.based_on_scan_id === scanId) {
    recommendation = cached;
    source = 'cached';
  } else {
    if (!aiGateway.isAvailable()) {
      throw new Error('AI proxy unavailable');
    }
    const matchedProducts = useAppStore.getState().aiTopMatches;
    const matchedProductsJson = JSON.stringify({ matches: matchedProducts });
    const existingRoutineJson = JSON.stringify({
      morning: useAppStore.getState().userRoutineMorning,
      evening: useAppStore.getState().userRoutineEvening,
      saved: useAppStore.getState().wishlist,
    });
    const scanSummary = JSON.stringify({
      skin_score: analysis.skin_score,
      primary_concern: analysis.primary_concern,
      secondary_concerns: analysis.secondary_concerns,
      findings: analysis.findings,
      score_factors: analysis.score_factors,
      plan_inputs: analysis.plan_inputs,
      next_focus: analysis.next_focus,
    });

    try {
      recommendation = await aiGateway.generateRoutineRecommendation({
        scanSummary,
        matchedProductsJson,
        existingRoutineJson,
        basedOnScanId: scanId,
      });
      // Persist freshly generated recommendation back into the app store
      // so other surfaces (Home today card, Assistant grounding) see it.
      useAppStore.setState({ aiRoutine: recommendation });
      aiTelemetry.setFeatureSource(
        'routine',
        'ai',
        `Routine builder used AI: ${recommendation.morning.length}am + ${recommendation.evening.length}pm`,
      );
    } catch (e) {
      aiTelemetry.countFallback('generateRoutineRecommendation');
      throw e instanceof Error ? e : new Error('Routine generation failed');
    }
  }

  if (!recommendation) {
    throw new Error('Routine generation returned empty plan');
  }

  // Adapt RoutineRecommendation → CustomRoutine
  const shelfIds = new Set(getShelfProductIds());
  const scanFindingIds = analysis.findings.map((f, i) => f.concern ?? `f${i}`);

  const morningSteps = recommendation.morning.map((a, i) =>
    actionToStep(
      { ...a, step_order: i + 1 },
      'morning',
      shelfIds,
      scanFindingIds,
    ),
  );
  const eveningSteps = recommendation.evening.map((a, i) =>
    actionToStep(
      { ...a, step_order: i + 1 },
      'evening',
      shelfIds,
      scanFindingIds,
    ),
  );

  const routine: CustomRoutine = {
    id: `routine-${scanId}-${Date.now()}`,
    scanId,
    createdAt: new Date().toISOString(),
    status: 'ready_to_review',
    morningSteps,
    eveningSteps,
    explanation: buildExplanationFromAi(recommendation, analysis),
    excludedDirections: buildExcludedDirections(recommendation, analysis),
    canStartMorning: false,
    canStartEvening: false,
    limitedByScan: false,
  };

  return { routine, recommendation, source };
}

/**
 * Surface metadata useful for the build screen's live reasoning rows
 * — these strings reflect the actual scan content rather than generic
 * fillers.
 */
export interface ReasoningStream {
  irritationLine: string;
  ingredientLine: string;
  avoidLine: string;
}

export function buildReasoningStream(
  analysis: FaceScanAnalysis | null,
): ReasoningStream {
  if (!analysis) {
    return {
      irritationLine: 'Checking irritation risk',
      ingredientLine: 'Matching calming ingredients',
      avoidLine: 'Avoiding conflicting actives',
    };
  }
  const sensitivity = analysis.score_factors?.sensitivity ?? 0;
  const redness = analysis.score_factors?.redness ?? 0;
  const breakouts = analysis.score_factors?.breakouts ?? 0;
  const irritationLine =
    sensitivity > 55 || redness > 55
      ? 'Checking irritation risk (elevated)'
      : 'Checking irritation risk';

  const primary =
    analysis.primary_concern && typeof analysis.primary_concern === 'string'
      ? analysis.primary_concern.replace(/_/g, ' ')
      : null;
  const ingredientLine = primary
    ? `Matching ingredients for ${primary}`
    : 'Matching calming ingredients';

  const avoid = analysis.next_focus?.avoid?.[0];
  const avoidLine = avoid
    ? `Avoiding ${avoid.toLowerCase()}`
    : breakouts > 60
    ? 'Avoiding pore-clogging ingredients'
    : 'Avoiding conflicting actives';

  return { irritationLine, ingredientLine, avoidLine };
}

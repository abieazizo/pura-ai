/**
 * Assistant API — v20.0.
 *
 * Builds a grounded `AssistantContext` from the live store + latest
 * scan and routes the question through `aiGateway.answerAssistant`
 * for an *enriched summary*. The structured answer (title, badge,
 * steps, avoid, why, CTAs, follow-ups) is ALWAYS produced locally
 * by the template engine in `@/utils/assistantTemplates`, so the
 * UI rhythm stays consistent regardless of AI availability.
 *
 * Hard rule: never expose implementation details to the user. No
 * "demo fallback", no "AI didn't respond", no "not live". On gateway
 * failure or unavailability, the response is built from saved skin
 * context and rendered as a polished structured answer.
 */

import type { AssistantMessage, Scan } from '@/types';
import { aiGateway, tryAi } from '@/ai/aiGateway';
import { aiLog } from '@/ai/aiLog';
import { aiTelemetry } from '@/ai/aiTelemetry';
import { useAppStore } from '@/store/useAppStore';
import { computeSkinScore } from '@/utils/skinScore';
import type {
  AssistantContext,
  ConcernType,
  FaceScanAnalysis,
  ProgressExplanation,
  SkinScoreExplanation,
} from '@/ai/ai-contracts';
import { seedProducts } from '@/data/seed';
// v19.15 — assistant grounding now flows through the canonical
// UserProfileContext selector instead of inlining the same
// composition logic. Single source of truth for user data.
import { selectUserProfileContext } from '@/state/canonical';
import { buildAiSkinContextFromStore } from '@/utils/aiSkinContext';
import {
  buildLocalAnswerFor,
  type AiStructuredAnswer,
} from '@/utils/assistantTemplates';

// ---------------------------------------------------------------------------
// Context builder.
//
// Pulls every grounding signal the assistant cares about from the
// live store + the supplied latestScan + utility outputs, and returns
// an AssistantContext that satisfies the contract in ai-contracts.ts.
// ---------------------------------------------------------------------------

// v19.15 — local mappers (mapAppSkinTypeToAiSkinType /
// mapGoalToTopGoal / mapSensitivityToTags) removed. Their logic
// now lives once in `selectUserProfileContext` and the canonical
// safety profile builder. This file no longer duplicates.

/**
 * Synthesise a SkinScoreExplanation from the current scans. When an AI
 * analysis is attached to the latest scan, prefer the structured why-
 * line and band; otherwise build something concrete from the
 * deterministic computeSkinScore() helper so the assistant still has
 * grounding.
 */
function buildLatestScoreContext(
  scans: Scan[]
): SkinScoreExplanation | null {
  if (scans.length === 0) return null;
  const latest = scans[scans.length - 1];
  const score = computeSkinScore(scans);
  const ai = latest.aiAnalysis;
  if (ai) {
    return {
      score: ai.skin_score.value,
      band: ai.skin_score.band,
      delta_reference:
        ai.skin_score.delta_vs_previous !== null
          ? 'previous_scan'
          : ai.skin_score.delta_vs_baseline !== null
          ? 'baseline'
          : 'none',
      delta_value:
        ai.skin_score.delta_vs_previous ??
        ai.skin_score.delta_vs_baseline ??
        null,
      short_status:
        ai.skin_score.delta_vs_previous !== null
          ? `${ai.skin_score.delta_vs_previous >= 0 ? '+' : ''}${ai.skin_score.delta_vs_previous} since last scan`
          : 'first reading',
      why_line: ai.skin_score.why_line,
      coach_line: ai.skin_score.explanation,
    };
  }
  // Deterministic fallback — built from computeSkinScore so the
  // assistant still gets a real number and label.
  return {
    score: score.value,
    band:
      score.value >= 85
        ? 'great'
        : score.value >= 70
        ? 'good'
        : score.value >= 55
        ? 'fair'
        : 'poor',
    delta_reference: score.deltaSinceLast !== null ? 'previous_scan' : 'none',
    delta_value: score.deltaSinceLast,
    short_status: score.headline,
    why_line: score.headline,
    coach_line: 'Stay consistent with your current routine tonight.',
  };
}

/**
 * Synthesise a lightweight ProgressExplanation from scans when no AI
 * progress bundle has run yet. Keeps the assistant grounded across
 * multi-scan users without requiring the full progress AI call.
 */
function buildLightweightProgressContext(
  scans: Scan[]
): ProgressExplanation | null {
  if (scans.length < 2) return null;
  const first = scans[0];
  const latest = scans[scans.length - 1];
  const delta = latest.overallScore - first.overallScore;
  const direction =
    delta > 0 ? 'improving' : delta < 0 ? 'sliding' : 'holding steady';
  return {
    strongest_improvement:
      delta > 0
        ? `Skin Score up ${delta} points since day 1.`
        : 'Holding day-1 score so far.',
    strongest_regression:
      delta < 0 ? `Skin Score down ${Math.abs(delta)} points since day 1.` : null,
    unchanged_summary: `${scans.length} scans recorded; trend ${direction}.`,
    short_narrative: `${scans.length} scans in. ${direction === 'improving' ? 'Net positive movement.' : direction === 'sliding' ? 'Net negative movement.' : 'Holding steady.'}`,
    compare_caption: `DAY 1 → DAY ${latest.dayNumber}`,
  };
}

function buildAssistantContext(latestScan: Scan | undefined): AssistantContext {
  const s = useAppStore.getState();
  // v19.15 — read user grounding from the canonical selector. The
  // selector handles displayName resolution, skinType normalization,
  // sensitivity tag composition, and safety-bias rollup in one
  // place. The AssistantContext shape (the wire contract to the
  // AI prompt) is unchanged — we just project the canonical
  // object onto it.
  const profile = selectUserProfileContext(s);

  return {
    user_profile: {
      display_name: profile.displayName,
      skin_type: profile.skinType,
      top_goals: profile.goals,
      sensitivities: profile.sensitivities,
    },
    latest_scan: latestScan?.aiAnalysis ?? scanToAnalysisLite(latestScan),
    latest_score: buildLatestScoreContext(s.scans),
    routine_snapshot: {
      morning_product_ids: s.userRoutineMorning,
      evening_product_ids: s.userRoutineEvening,
      saved_product_ids: s.wishlist,
    },
    progress_snapshot: buildLightweightProgressContext(s.scans),
    top_matches: s.aiTopMatches,
    active_product_identity: s.aiActiveProductIdentity,
  };
}

/**
 * When the latest scan has no AI analysis attached (deterministic
 * fallback ran), synthesise a minimal FaceScanAnalysis-shaped object
 * so the assistant context still carries the score / concerns. The AI
 * doesn't see this struct as authoritative — it's grounding context
 * only.
 */
function scanToAnalysisLite(scan: Scan | undefined): FaceScanAnalysis | null {
  if (!scan) return null;
  if (scan.aiAnalysis) return scan.aiAnalysis;
  const concernToAi = (c: NonNullable<Scan['concerns']>[number]): ConcernType => {
    switch (c.category) {
      case 'breakouts':
        return 'breakouts';
      case 'hydration':
        return 'hydration';
      case 'texture':
        return 'texture';
      case 'tone':
        return 'dark_marks';
    }
  };
  const concerns = scan.concerns ?? [];
  return {
    scan_id: scan.id,
    analyzed_at_iso: scan.capturedAt,
    image_quality: { usable: true, issues: [], confidence: 0.5 },
    skin_score: {
      value: scan.overallScore,
      band:
        scan.overallScore >= 85
          ? 'great'
          : scan.overallScore >= 70
          ? 'good'
          : scan.overallScore >= 55
          ? 'fair'
          : 'poor',
      delta_vs_previous: null,
      delta_vs_baseline: null,
      why_line: scan.summaryHeadline,
      explanation: scan.summaryBody,
    },
    primary_concern: concerns.length > 0 ? concernToAi(concerns[0]) : null,
    secondary_concerns: concerns.slice(1, 3).map(concernToAi),
    findings: concerns.map((c) => ({
      concern: concernToAi(c),
      severity:
        c.severity === 'calm'
          ? 'none'
          : c.severity === 'mild'
          ? 'mild'
          : c.severity === 'moderate'
          ? 'moderate'
          : 'high',
      direction_vs_previous:
        c.trend === 'improved'
          ? 'better'
          : c.trend === 'worsened'
          ? 'worse'
          : c.trend === 'new'
          ? 'new'
          : 'same',
      confidence: 0.5,
      regions: [],
      user_summary: c.finding,
      clinician_style_summary: c.interpretation,
      marker_priority: c.rank as 0 | 1 | 2 | 3,
    })),
    score_factors: {
      breakouts: 50,
      hydration: 50,
      texture: 50,
      dark_marks: 50,
      redness: 50,
      oiliness: 50,
      sensitivity: 50,
      pores: 50,
    },
    next_focus: { tonight: [], avoid: [] },
    plan_inputs: {
      target_concerns: concerns.map(concernToAi).slice(0, 2),
      preferred_product_categories: [],
      contraindication_tags: [],
    },
  };
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

export async function askAssistant(args: {
  text: string;
  attachedProductIds?: string[];
  latestScan?: Scan;
  messageId: string;
}): Promise<AssistantMessage> {
  // Build the structured answer skeleton from the local template engine.
  // This is the source of truth for the UI rhythm — the AI gateway only
  // supplies an *enriched summary* when available.
  const skinCtx = buildAiSkinContextFromStore();
  let enrichedSummary: string | null = null;
  let aiSucceeded = false;
  let context: AssistantContext | null = null;

  if (args.text.trim().length === 0) {
    // Empty-question guard — never burn an AI call.
    const structured = buildLocalAnswerFor(' ', skinCtx);
    return toAssistantMessage(args.messageId, structured, args.attachedProductIds);
  }

  // ---- Try to enrich via AI when available ----
  if (aiGateway.isAvailable()) {
    context = buildAssistantContext(args.latestScan);
    attachActiveProductIdentity(context, args.attachedProductIds);
    try {
      enrichedSummary = await tryAi(() =>
        aiGateway.answerAssistant({ context: context!, userQuestion: args.text })
      );
      aiSucceeded = enrichedSummary !== null && enrichedSummary.trim().length > 0;
    } catch {
      enrichedSummary = null;
      aiSucceeded = false;
    }
    if (!aiSucceeded) {
      aiLog.warn(
        'askAssistant',
        'AI enrichment unavailable; local structured answer carries the response'
      );
    }
  }

  // ---- Build the structured answer (always succeeds) ----
  const structured = buildLocalAnswerFor(args.text, skinCtx, enrichedSummary);

  // ---- Telemetry (internal only — never user-facing) ----
  if (aiSucceeded) {
    aiTelemetry.setFeatureSource(
      'assistant',
      'ai',
      `enriched via proxy (latest scan ${
        context?.latest_scan ? 'attached' : 'absent'
      }, ${context?.top_matches.length ?? 0} matches in context)`
    );
  } else {
    aiTelemetry.countFallback('answerAssistant');
    aiTelemetry.setFeatureSource(
      'assistant',
      'fallback',
      aiGateway.isAvailable()
        ? 'AI enrichment failed; structured answer served from saved skin context'
        : 'No proxy configured; structured answer served from saved skin context'
    );
  }

  // ---- Build grounding stamp (still useful for UI attribution) ----
  const groundedFrom: string[] = [];
  if (aiSucceeded && context) {
    if (context.latest_scan) groundedFrom.push('latest scan');
    if (context.latest_score) groundedFrom.push('Skin Score');
    if (
      context.routine_snapshot.morning_product_ids.length > 0 ||
      context.routine_snapshot.evening_product_ids.length > 0
    ) {
      groundedFrom.push('routine');
    }
    if (context.top_matches.length > 0) {
      groundedFrom.push(`${context.top_matches.length} matches`);
    }
    if (context.progress_snapshot) groundedFrom.push('progress');
    if (context.active_product_identity) groundedFrom.push('active product');
  } else if (skinCtx.hasScan) {
    groundedFrom.push('saved scan');
  }

  return toAssistantMessage(
    args.messageId,
    structured,
    args.attachedProductIds,
    groundedFrom
  );
}

function toAssistantMessage(
  id: string,
  structured: AiStructuredAnswer,
  attachedProductIds?: string[],
  groundedFrom?: string[]
): AssistantMessage {
  return {
    id,
    role: 'assistant',
    text: flattenStructuredToText(structured),
    structured,
    attachedProductIds,
    createdAt: new Date().toISOString(),
    groundedFrom: groundedFrom && groundedFrom.length > 0 ? groundedFrom : undefined,
  };
}

function flattenStructuredToText(s: AiStructuredAnswer): string {
  const parts = [s.title, s.summary];
  if (s.steps?.length) parts.push(s.steps.map((x) => `• ${x}`).join('\n'));
  if (s.avoid?.length) {
    parts.push(`Avoid: ${s.avoid.join(' · ')}`);
  }
  if (s.why) parts.push(s.why);
  return parts.filter(Boolean).join('\n\n');
}

function attachActiveProductIdentity(
  context: AssistantContext,
  attachedProductIds?: string[]
) {
  if (
    context.active_product_identity ||
    !attachedProductIds ||
    attachedProductIds.length === 0
  ) {
    return;
  }
  const attachedId = attachedProductIds[0];
  const liveById = useAppStore.getState().liveProductsById;
  const live = liveById[attachedId];
  if (live) {
    context.active_product_identity = {
      source: 'image',
      confidence: 0.95,
      resolved: true,
      brand: live.brand,
      product_name: live.name,
      canonical_title: `${live.brand} ${live.name}`,
      product_category: live.category,
      likely_concerns_supported: live.concernTags,
      key_claims: live.ingredientsHighlights,
      barcode_value: null,
      catalog_lookup_key: live.id,
      packaging_notes: live.shortDescription,
    };
    return;
  }
  const p = seedProducts.find((sp) => sp.id === attachedId);
  if (p) {
    context.active_product_identity = {
      source: 'image',
      confidence: 0.95,
      resolved: true,
      brand: p.brand,
      product_name: p.name,
      canonical_title: `${p.brand} ${p.name}`,
      product_category:
        (p.category as
          | 'cleanser'
          | 'serum'
          | 'moisturizer'
          | 'spot_treatment'
          | 'toner'
          | 'spf'
          | 'mask') ?? 'unknown',
      likely_concerns_supported: [],
      key_claims: p.keyIngredients ?? [],
      barcode_value: null,
      catalog_lookup_key: p.id,
      packaging_notes: '',
    };
  }
}

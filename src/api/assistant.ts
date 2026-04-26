/**
 * Assistant API — v10.22.
 *
 * Builds a grounded `AssistantContext` from the live store + latest
 * scan and routes the question through `aiGateway.answerAssistant`.
 * Falls back to the deterministic `buildAssistantReply` mock only
 * when the gateway has no transport configured (or when a call fails).
 */

import type { AssistantMessage, Scan } from '@/types';
import { buildAssistantReply } from '@/utils/assistantMock';
import { aiGateway } from '@/ai/aiGateway';
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

// ---------------------------------------------------------------------------
// Context builder.
//
// Pulls every grounding signal the assistant cares about from the
// live store + the supplied latestScan + utility outputs, and returns
// an AssistantContext that satisfies the contract in ai-contracts.ts.
// ---------------------------------------------------------------------------

function mapAppSkinTypeToAiSkinType(
  s: ReturnType<typeof useAppStore.getState>['skinType']
): AssistantContext['user_profile']['skin_type'] {
  switch (s) {
    case 'oily':
      return 'oily';
    case 'dry':
      return 'dry';
    case 'combination':
      return 'combination';
    case 'sensitive':
      return 'sensitive';
    default:
      return 'unknown';
  }
}

function mapGoalToTopGoal(
  g: ReturnType<typeof useAppStore.getState>['goal']
): string[] {
  switch (g) {
    case 'clear':
      return ['clear breakouts'];
    case 'calm':
      return ['calm sensitivity'];
    case 'bright':
      return ['brighten dark marks'];
    default:
      return [];
  }
}

function mapSensitivityToTags(
  s: ReturnType<typeof useAppStore.getState>['sensitivity']
): string[] {
  switch (s) {
    case 'very':
      return ['fragrance', 'high-strength actives', 'physical scrubs'];
    case 'somewhat':
      return ['fragrance'];
    case 'not':
    case 'unsure':
    default:
      return [];
  }
}

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
  const scans = s.scans;
  const aiActive = s.aiActiveProductIdentity;

  return {
    user_profile: {
      skin_type: mapAppSkinTypeToAiSkinType(s.skinType),
      top_goals: mapGoalToTopGoal(s.goal),
      sensitivities: mapSensitivityToTags(s.sensitivity),
    },
    latest_scan: latestScan?.aiAnalysis ?? scanToAnalysisLite(latestScan),
    latest_score: buildLatestScoreContext(scans),
    routine_snapshot: {
      morning_product_ids: s.userRoutineMorning,
      evening_product_ids: s.userRoutineEvening,
      saved_product_ids: s.wishlist,
    },
    progress_snapshot: buildLightweightProgressContext(scans),
    top_matches: s.aiTopMatches,
    active_product_identity: aiActive,
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
  if (aiGateway.isAvailable()) {
    try {
      const context = buildAssistantContext(args.latestScan);
      // If the user attached products and the active identity slot is
      // empty, surface the first attached product to the AI as the
      // "active product" so it has a concrete object to reason about.
      if (
        !context.active_product_identity &&
        args.attachedProductIds &&
        args.attachedProductIds.length > 0
      ) {
        const p = seedProducts.find(
          (sp) => sp.id === args.attachedProductIds![0]
        );
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
      const text = await aiGateway.answerAssistant({
        context,
        userQuestion: args.text,
      });
      return {
        id: args.messageId,
        role: 'assistant',
        text: text.length > 0 ? text : 'I couldn’t produce an answer for that one — try rephrasing?',
        attachedProductIds: args.attachedProductIds,
        createdAt: new Date().toISOString(),
      };
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          '[askAssistant] AI path failed, using deterministic fallback:',
          e instanceof Error ? e.message : String(e)
        );
      }
      // fall through
    }
  }

  return buildAssistantReply(args);
}

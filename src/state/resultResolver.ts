/**
 * Pura AI — canonical result-state resolver (v19.16, Phase 6B/6C).
 *
 * SINGLE source of truth for:
 *   1. Scan-quality branching (Phase 6B):
 *        Branch A — `imageQuality.confidence < 0.4`  → blocked_retake_required
 *        Branch B — `0.4 ≤ confidence < 0.7`        → low_confidence_result
 *        Branch C — `confidence ≥ 0.7`              → normal_result
 *   2. Result-state resolution (Phase 6C):
 *        transforms canonical SkinState + RecommendationContext
 *        into ONE UI-ready ResultViewModel that drives:
 *          • whether navigation to the result screen is blocked
 *          • whether the soft warning banner appears
 *          • which copy the soft warning shows
 *          • whether hero product loading / ready / unavailable
 *          • whether the scan-quality note appears
 *          • whether skin-map language softens
 *
 * Do NOT duplicate this logic in CaptureScreen, ResultScreen,
 * SkinMapScreen, AssistantScreen, or anywhere else. The resolver
 * is the only place thresholds live.
 */

import type { RecommendationContext, SkinState } from '@/types/canonical';
import {
  SCAN_BLOCKED_MESSAGE,
  SCAN_LOW_CONFIDENCE_MESSAGE,
} from '@/copy/scanMicroCopy';

// ---------------------------------------------------------------------------
// Thresholds — single source of truth.
// ---------------------------------------------------------------------------

export const QUALITY_THRESHOLD_BLOCK = 0.4;
export const QUALITY_THRESHOLD_WARN = 0.7;

// ---------------------------------------------------------------------------
// Output types.
// ---------------------------------------------------------------------------

export type ScanQualityBranch =
  | 'blocked_retake_required'
  | 'low_confidence_result'
  | 'normal_result';

export type ResultStateMode =
  | 'blocked_retake_required'
  | 'low_confidence_result'
  | 'normal_result'
  | 'result_with_products_loading'
  | 'result_with_products_ready'
  | 'result_with_products_unavailable';

/**
 * UI-ready view-model. Every result/scan/map screen should read
 * from this rather than re-deriving thresholds or copy.
 */
export interface ResultViewModel {
  /** The active scan-quality branch (A/B/C). */
  branch: ScanQualityBranch;
  /** The composite result-state mode (branch + product status). */
  mode: ResultStateMode;
  /** True when the result screen must NOT render normal content. */
  navigationBlocked: boolean;
  /** True when the soft confidence banner should appear. */
  showWarningBanner: boolean;
  /** Banner copy. Empty string when no banner. */
  warningMessage: string;
  /** Block-state primary headline. Empty string when not blocked. */
  blockedHeadline: string;
  /** Plain-English explanation of the dominant quality issue. */
  blockedDetail: string;
  /** True when the inline scan-quality note ("based on partial scan…")
   *  belongs at the bottom of ResultScreen. */
  showScanQualityNote: boolean;
  /** Skin-map specificity. UI consumers should soften wording when
   *  this is `'soft'`. */
  skinMapPrecision: 'precise' | 'soft' | 'suppressed';
  /** Whether the hero product is loading vs ready vs unavailable. */
  productState: 'loading' | 'ready' | 'unavailable' | 'empty';
  /** Whether the result screen has any actionable content (= NOT
   *  blocked AND NOT (product unavailable + summary missing)). */
  hasUsableResult: boolean;
}

// ---------------------------------------------------------------------------
// Issue copy.
// ---------------------------------------------------------------------------

/**
 * Pick the single most useful cause from the AI's image-quality
 * issue list. Prioritise things the user can act on quickly.
 */
function dominantIssueCopy(issues: SkinState['imageQuality']['issues']): string {
  const set = new Set(issues);
  if (set.has('partial_face' as never) || (set as Set<string>).has('partial_face'))
    return 'Part of your face is out of frame.';
  if (set.has('blurry' as never) || (set as Set<string>).has('blurry'))
    return 'The photo looks a little blurry.';
  if (set.has('low_light' as never) || (set as Set<string>).has('low_light'))
    return 'The room is a bit dark.';
  if (set.has('angled' as never) || (set as Set<string>).has('angled'))
    return 'Try holding the camera straight on.';
  if (set.has('occluded' as never) || (set as Set<string>).has('occluded'))
    return 'Something is covering part of your skin.';
  return 'Lighting or angle made parts hard to read.';
}

// ---------------------------------------------------------------------------
// Resolver — the single function every screen should call.
// ---------------------------------------------------------------------------

/**
 * Resolve a canonical ResultViewModel from the canonical SkinState +
 * (optional) RecommendationContext. When skinState is null (the
 * scan didn't produce a state at all), returns a blocked view-model
 * so the UI shows the recovery state, never an empty result.
 *
 * When recommendation is null/undefined, productState defaults to
 * `'loading'` so the screen shows the hero loading skeleton.
 */
export function resolveScanResultState(args: {
  skinState: SkinState | null;
  recommendation?: RecommendationContext | null;
}): ResultViewModel {
  const { skinState, recommendation } = args;

  // No skin state at all → hard block. The user must retake.
  if (!skinState) {
    return {
      branch: 'blocked_retake_required',
      mode: 'blocked_retake_required',
      navigationBlocked: true,
      showWarningBanner: false,
      warningMessage: '',
      blockedHeadline: SCAN_BLOCKED_MESSAGE,
      blockedDetail: 'We couldn’t read this photo at all.',
      showScanQualityNote: false,
      skinMapPrecision: 'suppressed',
      productState: 'unavailable',
      hasUsableResult: false,
    };
  }

  const conf = skinState.imageQuality.confidence;

  // Branch A — Hard block. The existing SkinImageQuality contract
  // uses `usable: boolean` for the equivalent of the prompt spec's
  // `canProceed`. We reference `usable` directly so the resolver
  // stays aligned with the canonical type.
  if (conf < QUALITY_THRESHOLD_BLOCK || !skinState.imageQuality.usable) {
    return {
      branch: 'blocked_retake_required',
      mode: 'blocked_retake_required',
      navigationBlocked: true,
      showWarningBanner: false,
      warningMessage: '',
      blockedHeadline: SCAN_BLOCKED_MESSAGE,
      blockedDetail: dominantIssueCopy(skinState.imageQuality.issues),
      showScanQualityNote: false,
      skinMapPrecision: 'suppressed',
      productState: 'unavailable',
      hasUsableResult: false,
    };
  }

  // Resolve product state from the recommendation context.
  const productState = resolveProductState(recommendation);

  // Branch B — Soft warning.
  if (conf < QUALITY_THRESHOLD_WARN) {
    return {
      branch: 'low_confidence_result',
      mode: composeMode('low_confidence_result', productState),
      navigationBlocked: false,
      showWarningBanner: true,
      warningMessage: SCAN_LOW_CONFIDENCE_MESSAGE,
      blockedHeadline: '',
      blockedDetail: '',
      showScanQualityNote: true,
      skinMapPrecision: 'soft',
      productState,
      hasUsableResult: true,
    };
  }

  // Branch C — Normal flow.
  return {
    branch: 'normal_result',
    mode: composeMode('normal_result', productState),
    navigationBlocked: false,
    showWarningBanner: false,
    warningMessage: '',
    blockedHeadline: '',
    blockedDetail: '',
    showScanQualityNote: false,
    skinMapPrecision: 'precise',
    productState,
    hasUsableResult: true,
  };
}

function resolveProductState(
  recommendation: RecommendationContext | null | undefined
): 'loading' | 'ready' | 'unavailable' | 'empty' {
  if (!recommendation) return 'loading';
  switch (recommendation.availabilityState) {
    case 'available':
      return recommendation.heroProduct ? 'ready' : 'empty';
    case 'loading':
      return 'loading';
    case 'empty':
      return 'empty';
    case 'unavailable':
      return 'unavailable';
    default:
      return 'loading';
  }
}

/**
 * Compose the rich `ResultStateMode` from the branch + product state.
 * Branch A is its own mode; Branches B and C inherit the product
 * state when products are loading / ready / unavailable.
 */
function composeMode(
  branch: 'low_confidence_result' | 'normal_result',
  productState: 'loading' | 'ready' | 'unavailable' | 'empty'
): ResultStateMode {
  if (productState === 'loading') return 'result_with_products_loading';
  if (productState === 'ready') return 'result_with_products_ready';
  if (productState === 'unavailable')
    return 'result_with_products_unavailable';
  // empty falls through to the branch's base mode.
  return branch;
}

/**
 * Convenience: short-form check for "should we route the user to the
 * recovery state?" — useful in navigators / route guards.
 */
export function isResultBlocked(skinState: SkinState | null): boolean {
  return resolveScanResultState({ skinState }).navigationBlocked;
}

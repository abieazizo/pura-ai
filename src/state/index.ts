/**
 * Pura AI — canonical state barrel (v19.15).
 *
 * Single import path for the three canonical objects + selectors.
 * Type contracts live in `@/types/canonical`; selectors live here.
 * Screens and APIs should import from `@/state` so the contract
 * stays stable as internals evolve.
 */

// Re-export type contracts from the dedicated types module so
// consumers don't need two import paths.
export type {
  SkinState,
  SkinConcernSummary,
  SkinZoneFinding,
  SkinImageQuality,
  SkinScoreBand,
  ConfidenceTier,
  UserProfileContext,
  AppSkinType,
  RoutineEffort,
  BudgetPreference,
  RecommendationContext,
  RecommendationAvailability,
  RecommendationIntent,
  CandidateScore,
} from '@/types/canonical';

// Selectors + deterministic scorer.
export {
  selectSkinState,
  selectUserProfileContext,
  buildRecommendationContext,
  selectCanonicalBundle,
  scoreCandidateLocal,
} from './canonical';

// v19.16 — canonical result-state resolver. SINGLE source of
// truth for scan-quality branching + result-state composition.
export {
  resolveScanResultState,
  isResultBlocked,
  QUALITY_THRESHOLD_BLOCK,
  QUALITY_THRESHOLD_WARN,
  type ResultViewModel,
  type ScanQualityBranch,
  type ResultStateMode,
} from './resultResolver';

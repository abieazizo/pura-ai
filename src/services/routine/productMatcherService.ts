/**
 * Pura Routine — product matcher.
 *
 * Deterministic. Given a routine step requirement plus the user's
 * shelf, returns the best catalog match (or null). The matcher
 * NEVER claims ownership — it only proposes products; the user
 * confirms.
 *
 * Matching priority:
 *   1. Owned shelf product of the required type → availability: owned.
 *   2. Catalog product whose `concernTags` overlap the step's related
 *      findings → availability: recommended.
 *   3. Generic top-rated catalog product of the required type →
 *      availability: recommended.
 *   4. Nothing → availability: missing.
 */

import {
  SHOP_CATALOG,
  type ConcernKey,
  type ShopCatalogProduct,
} from '@/screens/shop/shopCatalog';
import type {
  ConcernType,
} from '@/types/scanResults';
import type {
  ProductAvailability,
  RoutineProduct,
  RoutineStepType,
} from '@/types/routine';
import {
  catalogProductToRoutineProduct,
  findOwnedProductForStep,
  stepTypeForCatalogProduct,
} from './shelfService';

const CONCERN_TO_TAGS: Partial<Record<ConcernType, ConcernKey[]>> = {
  breakouts: ['breakouts'],
  dark_marks: ['marks', 'bright'],
  texture: ['breakouts', 'marks'],
  dryness: ['hydration', 'barrier'],
  redness: ['barrier'],
  barrier_stress: ['barrier', 'hydration'],
  oil_balance: ['breakouts'],
  under_eye_fatigue: ['hydration', 'bright'],
};

function matchesStepType(p: ShopCatalogProduct, type: RoutineStepType): boolean {
  return stepTypeForCatalogProduct(p) === type;
}

function scoreCatalog(
  p: ShopCatalogProduct,
  tags: ConcernKey[],
): number {
  let score = p.affinityHint ?? 0;
  for (const t of tags) {
    if (p.concernTags.includes(t)) score += 25;
  }
  if (p.rating) score += Math.round(p.rating);
  return score;
}

export interface MatchResult {
  product: RoutineProduct | null;
  availability: ProductAvailability;
  whyMatched?: string;
}

export function matchProductForStep(args: {
  type: RoutineStepType;
  relatedConcerns: ConcernType[];
  excludeIds?: string[];
}): MatchResult {
  // 1) Owned shelf product wins.
  const owned = findOwnedProductForStep(args.type);
  if (owned) {
    return {
      product: owned,
      availability: 'owned',
      whyMatched: 'Already on your shelf',
    };
  }

  // 2) Catalog matches for the required step type.
  const candidates = SHOP_CATALOG.filter(
    (p) => matchesStepType(p, args.type) && !args.excludeIds?.includes(p.id),
  );
  if (candidates.length === 0) {
    return {
      product: null,
      availability: 'missing',
    };
  }

  const tags: ConcernKey[] = [];
  for (const c of args.relatedConcerns) {
    const mapped = CONCERN_TO_TAGS[c];
    if (mapped) tags.push(...mapped);
  }

  const ranked = candidates
    .map((p) => ({ p, score: scoreCatalog(p, tags) }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0].p;
  const why = buildWhyMatched(top, args.type, tags);
  return {
    product: catalogProductToRoutineProduct(top, 'recommended', why),
    availability: 'needs_confirmation',
    whyMatched: why,
  };
}

function buildWhyMatched(
  p: ShopCatalogProduct,
  type: RoutineStepType,
  tags: ConcernKey[],
): string {
  const overlap = p.concernTags.filter((t) => tags.includes(t));
  if (overlap.length > 0) {
    const label = overlap[0];
    const friendly: Record<ConcernKey, string> = {
      breakouts: 'visible breakouts',
      hydration: 'dryness',
      marks: 'post-acne marks',
      barrier: 'barrier stress',
      bright: 'uneven tone',
    };
    return `Matched for ${friendly[label]}`;
  }
  switch (type) {
    case 'cleanse':
      return 'Gentle daily cleanse';
    case 'treat':
      return 'Targeted treatment';
    case 'hydrate':
      return 'Barrier-supporting hydration';
    case 'protect':
      return 'Daily UV protection';
  }
}

/**
 * Suggest alternates the user can swap to during product confirmation.
 */
export function alternatesForStep(args: {
  type: RoutineStepType;
  relatedConcerns: ConcernType[];
  excludeId?: string;
  limit?: number;
}): RoutineProduct[] {
  const tags: ConcernKey[] = [];
  for (const c of args.relatedConcerns) {
    const mapped = CONCERN_TO_TAGS[c];
    if (mapped) tags.push(...mapped);
  }
  return SHOP_CATALOG.filter(
    (p) => matchesStepType(p, args.type) && p.id !== args.excludeId,
  )
    .map((p) => ({ p, score: scoreCatalog(p, tags) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, args.limit ?? 4)
    .map(({ p }) => catalogProductToRoutineProduct(p, 'recommended'));
}

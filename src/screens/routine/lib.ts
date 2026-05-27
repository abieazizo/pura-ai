/**
 * Routine sub-tab shared helpers.
 *
 * Pulled out of `RoutineTabContent.tsx` so the visual sections can be
 * split into focused files without each one re-implementing the
 * live-cache + seed-catalog hydration logic.
 */

import { useAppStore } from '@/store/useAppStore';
import { seedProducts } from '@/data/seed';
import type { LiveProductCandidate } from '@/ai/ai-contracts';
import type { Product, ProductCategory } from '@/types';

/**
 * Resolve a list of product ids to fully-shaped `Product` objects.
 *
 * Reads the live-product cache first (AI-retrieved products that may
 * not be in the seed catalog), then falls back to the seed catalog for
 * legacy ids. Anything that doesn't resolve in either store is
 * silently dropped — never substituted with a fake product.
 */
export function hydrate(ids: string[]): Product[] {
  if (ids.length === 0) return [];
  const liveById = useAppStore.getState().liveProductsById;
  const out: Product[] = [];
  for (const id of ids) {
    const live = liveById[id];
    if (live) {
      out.push(liveCandidateToRoutineProduct(live));
      continue;
    }
    const seed = seedProducts.find((p) => p.id === id);
    if (seed) out.push(seed);
  }
  return out;
}

/**
 * Adapt a `LiveProductCandidate` (AI-retrieved) into the legacy
 * `Product` shape the routine row renderer expects. Category mapping
 * follows the existing convention: `spot_treatment → treatment`,
 * `unknown → serum`.
 */
export function liveCandidateToRoutineProduct(
  c: LiveProductCandidate
): Product {
  const adaptedCategory =
    c.category === 'spot_treatment'
      ? 'treatment'
      : c.category === 'unknown'
      ? 'serum'
      : c.category;
  return {
    id: c.id,
    brand: c.brand,
    name: c.name,
    category: adaptedCategory as Product['category'],
    imageUri: c.imageUrl ?? '',
    ingredients: c.ingredientsHighlights,
    keyIngredients: c.ingredientsHighlights,
    description: c.shortDescription,
    tint: 'sand',
    rating: 0,
    reviewCount: 0,
    matchScore: c.matchScore,
    tags: [],
    addedDate: c.sourceTimestamp,
    price: c.price ?? 0,
    imageUrl: c.imageUrl ?? undefined,
    buyUrl: c.productUrl ?? undefined,
  };
}

/** Plain-English label for the routine step kicker. */
export function productCategoryLabel(c: ProductCategory): string {
  switch (c) {
    case 'cleanser':
      return 'CLEANSER';
    case 'toner':
      return 'TONER';
    case 'serum':
      return 'SERUM';
    case 'moisturizer':
      return 'MOISTURIZER';
    case 'spf':
      return 'SPF';
    case 'treatment':
      return 'TREATMENT';
    case 'mask':
      return 'MASK';
    default:
      return String(c).toUpperCase();
  }
}

export type InnerSegment = 'morning' | 'evening' | 'saved';

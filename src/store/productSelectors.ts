/**
 * v18.3 — productSelectors.ts is now reduced to a single emergency
 * fallback: `searchProducts(query)`.
 *
 * The legacy goal selectors (`getBestForYou`, `getBestOverall`,
 * `getNatural`, `getNew`, `getEssentials`, `getGoalBreakouts`, etc.)
 * have been deleted — every consumer (HomeScreen, ProductsScreen,
 * CategoryFeed, PlanScreen) now sources its content from the live
 * retrieval engine in `src/api/liveProducts.ts`.
 *
 * `searchProducts` remains because the Products tab's search bar
 * uses it as a HIDDEN emergency fallback when the live retrieval
 * call returns zero candidates. It is never the primary search path
 * — `lookupLiveProducts()` always fires first. When live retrieval
 * succeeds, the user never sees these results.
 */

import type { Product } from '@/types';
import { seedProducts } from '@/data/seed';
import { useAppStore } from '@/store/useAppStore';

/**
 * Multi-token fuzzy search across the seeded catalog. Used ONLY as
 * an emergency fallback by `ProductsScreen` when `lookupLiveProducts()`
 * returned empty. Sorted by fuzzy relevance with an aiTopMatches
 * boost when the user has scanned.
 */
export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const STOP = new Set([
    'for', 'to', 'with', 'and', 'or', 'a', 'an', 'the', 'of', 'in',
    'on', 'my', 'me', 'i', 'is', 'has', 'have',
  ]);
  const tokens = q
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9-]/g, ''))
    .filter((t) => t.length > 1 && !STOP.has(t));
  if (tokens.length === 0) {
    return seedProducts.filter((p) =>
      `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q)
    );
  }

  function haystackFor(p: Product): string {
    return [
      p.name,
      p.brand,
      p.category,
      (p.keyIngredients ?? []).join(' '),
      (p.ingredients ?? []).join(' '),
      (p.tags ?? []).join(' '),
      (p.goodFor ?? []).join(' '),
      p.description ?? '',
    ]
      .join(' ')
      .toLowerCase();
  }

  function relevanceFor(p: Product, hay: string): number {
    let score = 0;
    for (const t of tokens) {
      if (p.name.toLowerCase().includes(t)) score += 4;
      if (p.brand.toLowerCase().includes(t)) score += 4;
      if (p.category.toLowerCase().includes(t)) score += 3;
      if ((p.keyIngredients ?? []).some((k) => k.toLowerCase().includes(t))) {
        score += 3;
      }
      if (hay.includes(t)) score += 1;
    }
    return score;
  }

  const matches = seedProducts
    .map((p) => {
      const hay = haystackFor(p);
      const allMatch = tokens.every((t) => hay.includes(t));
      return allMatch ? { p, score: relevanceFor(p, hay) } : null;
    })
    .filter((x): x is { p: Product; score: number } => x !== null)
    .sort((a, b) => b.score - a.score);

  // v17.1 / v18.3 — when the user has scanned, give a boost to
  // products the AI matched to THEIR scan. Tunable but small —
  // a strong fuzzy match still wins over a weak AI pick.
  const aiMatches = useAppStore.getState().aiTopMatches;
  if (aiMatches.length === 0) {
    return matches.map((m) => m.p);
  }
  const aiOrder = new Map<string, number>();
  aiMatches.forEach((m, i) => aiOrder.set(m.product_id, i));
  const blended = matches.map((m) => {
    const aiIdx = aiOrder.get(m.p.id);
    if (aiIdx === undefined) return { ...m, blended: m.score };
    const aiBoost = Math.max(1, 6 - Math.floor(aiIdx * 0.6));
    return { ...m, blended: m.score + aiBoost };
  });
  blended.sort((a, b) => b.blended - a.blended);
  return blended.map((m) => m.p);
}

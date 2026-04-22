import type { Product, ProductCategory } from '@/types';
import { seedProducts } from '@/data/seed';

/**
 * v7.6 catalog selectors. Pure functions operating on `seedProducts` —
 * not attached to the Zustand store because they derive from static seed
 * data, not user state.
 *
 * When seed data moves to a real backend, each selector becomes an API
 * call; the signatures stay identical so call sites at the screen level
 * don't change.
 */

const ROW_LIMIT = 10;

export function getBestForYou(): Product[] {
  return [...seedProducts]
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, ROW_LIMIT);
}

export function getBestOverall(): Product[] {
  return [...seedProducts]
    .sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.reviewCount - a.reviewCount;
    })
    .slice(0, ROW_LIMIT);
}

export function getNatural(): Product[] {
  return seedProducts
    .filter(
      (p) => p.tags.includes('natural') || p.tags.includes('clean')
    )
    .slice(0, ROW_LIMIT);
}

export function getNew(): Product[] {
  const sixtyDaysMs = 60 * 86400000;
  const cutoff = Date.now() - sixtyDaysMs;
  return [...seedProducts]
    .filter((p) => new Date(p.addedDate).getTime() >= cutoff)
    .sort(
      (a, b) =>
        new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime()
    )
    .slice(0, ROW_LIMIT);
}

/**
 * One pick per essential category — cleanser → serum → moisturizer → spf.
 * Within each category we prefer the highest-match-score product so the
 * "Essentials" row stays personal even for users who haven't scanned.
 */
export function getEssentials(): Product[] {
  const ORDER: ProductCategory[] = [
    'cleanser',
    'serum',
    'moisturizer',
    'spf',
  ];
  return ORDER.map((cat) => {
    return [...seedProducts]
      .filter((p) => p.category === cat)
      .sort((a, b) => b.matchScore - a.matchScore)[0];
  }).filter((p): p is Product => !!p);
}

/**
 * Debounced fuzzy filter used by the Products search bar. Matches name,
 * brand, category, or key ingredients. Case-insensitive.
 */
export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  return seedProducts.filter((p) => {
    if (p.name.toLowerCase().includes(q)) return true;
    if (p.brand.toLowerCase().includes(q)) return true;
    if (p.category.toLowerCase().includes(q)) return true;
    if (p.keyIngredients.some((k) => k.toLowerCase().includes(q))) return true;
    return false;
  });
}

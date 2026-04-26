import type { Product, ProductCategory } from '@/types';
import { seedProducts } from '@/data/seed';
import { useAppStore } from '@/store/useAppStore';

/**
 * v7.6 catalog selectors. Pure functions operating on `seedProducts` —
 * not attached to the Zustand store because they derive from static seed
 * data, not user state.
 *
 * v10.22 — `getBestForYou` now consults `store.aiTopMatches` first.
 * When the AI gateway has run, the user's actual ranking lives there;
 * the seeded `matchScore` ordering is the documented fallback for
 * users with no AI configured (or who haven't scanned yet).
 *
 * When seed data moves to a real backend, each selector becomes an API
 * call; the signatures stay identical so call sites at the screen level
 * don't change.
 */

const ROW_LIMIT = 10;

export function getBestForYou(): Product[] {
  // v10.22 — prefer AI-derived ranking when present.
  const aiMatches = useAppStore.getState().aiTopMatches;
  if (aiMatches.length > 0) {
    const ordered: Product[] = [];
    const seen = new Set<string>();
    for (const m of aiMatches) {
      const p = seedProducts.find((sp) => sp.id === m.product_id);
      if (p && !seen.has(p.id)) {
        ordered.push(p);
        seen.add(p.id);
      }
      if (ordered.length >= ROW_LIMIT) return ordered;
    }
    if (ordered.length > 0) {
      // Pad with seeded order so the row never shrinks below ROW_LIMIT.
      for (const p of [...seedProducts].sort(
        (a, b) => b.matchScore - a.matchScore
      )) {
        if (ordered.length >= ROW_LIMIT) break;
        if (!seen.has(p.id)) {
          ordered.push(p);
          seen.add(p.id);
        }
      }
      return ordered;
    }
  }
  // Deterministic fallback — original v7.6 ranking.
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

// ---------------------------------------------------------------------------
// v10.9 — goal-specific selectors feeding the unified CategoryRail.
//
// Each `getGoalX` selector returns products whose tag / keyIngredient /
// category maps to the goal. Products that have been hand-tagged with
// the matching ProductTag win first; when tags are sparse, we fall
// back to key-ingredient heuristics so the feed is never empty.
// ---------------------------------------------------------------------------

const BREAKOUT_HINTS = [
  'salicylic',
  'niacinamide',
  'benzoyl',
  'zinc',
  'tea tree',
];
const HYDRATION_HINTS = [
  'hyaluronic',
  'glycerin',
  'squalane',
  'ceramide',
  'panthenol',
];
const TEXTURE_HINTS = [
  'aha',
  'bha',
  'pha',
  'lactic',
  'glycolic',
  'mandelic',
  'retinol',
];
const DARK_MARK_HINTS = [
  'vitamin c',
  'tranexamic',
  'niacinamide',
  'arbutin',
  'kojic',
  'azelaic',
];

function matchesHint(product: Product, hints: string[]): boolean {
  const haystack = [
    product.name.toLowerCase(),
    product.description.toLowerCase(),
    ...product.keyIngredients.map((k) => k.toLowerCase()),
  ].join(' ');
  return hints.some((h) => haystack.includes(h));
}

export function getGoalBreakouts(): Product[] {
  return [...seedProducts]
    .filter((p) => matchesHint(p, BREAKOUT_HINTS))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, ROW_LIMIT);
}

export function getGoalHydration(): Product[] {
  return [...seedProducts]
    .filter((p) => matchesHint(p, HYDRATION_HINTS))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, ROW_LIMIT);
}

export function getGoalTexture(): Product[] {
  return [...seedProducts]
    .filter((p) => matchesHint(p, TEXTURE_HINTS))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, ROW_LIMIT);
}

export function getGoalDarkMarks(): Product[] {
  return [...seedProducts]
    .filter((p) => matchesHint(p, DARK_MARK_HINTS))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, ROW_LIMIT);
}

export function getGoalSensitive(): Product[] {
  return [...seedProducts]
    .filter(
      (p) =>
        p.tags.includes('sensitive-safe') ||
        p.tags.includes('fragrance-free')
    )
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, ROW_LIMIT);
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

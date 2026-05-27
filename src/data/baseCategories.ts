/**
 * v22.2 — Base category registry.
 *
 * These categories ALWAYS exist for every account regardless of
 * personalization. Personalization only changes:
 *   - which one is highlighted as "Best for you"
 *   - ranking order
 *   - which curated products surface first
 *
 * Categories never disappear because a user doesn't have a profile
 * or hasn't scanned. "Hydration" is always available.
 */

import {
  CURATED_PRODUCTS,
  curatedForCategory,
  type CuratedProduct,
} from './curatedProducts';

export interface BaseCategory {
  /** Stable identifier (used as the category tag in curatedProducts). */
  id: string;
  /** User-facing label ("Hydration"). */
  label: string;
  /** One-line plain-English description. */
  description: string;
  /** Alternative phrasings the search normalizer maps to this category. */
  aliases: string[];
  /** Concern axes this category addresses. */
  concernTags: string[];
  /** Ingredients to boost when ranking within this category. */
  ingredientBoosts: string[];
  /** Ingredients/categories to demote within this category. */
  demoteTerms: string[];
  /** Curated product ids that should always be available here. */
  curatedProductIds: string[];
  /** Minimum visible products for this category (typically 6). */
  minResults: number;
}

export const BASE_CATEGORIES: readonly BaseCategory[] = [
  {
    id: 'best-for-you',
    label: 'Best for you',
    description: 'Picks matched to your skin profile + latest scan',
    aliases: ['best for me', 'best for my skin', 'recommended', 'for you'],
    concernTags: [],
    ingredientBoosts: [],
    demoteTerms: [],
    curatedProductIds: [],
    minResults: 6,
  },
  {
    id: 'hydration',
    label: 'Hydration',
    description: 'Plumping serums + lightweight hydrators',
    // v22.5 — 'moisturizer' removed from hydration aliases. Hydration
    // is a CONCERN (a goal: "I want plumper skin"). Moisturizer is a
    // CATEGORY (a product format: "I want a cream-format product").
    // Conflating the two caused `best for moisturizer` to resolve to
    // the hydration category, which then surfaced hyaluronic SERUMS
    // as top picks for a moisturizer query.
    aliases: [
      'hydration',
      'hydrating',
      'dry skin',
      'dehydrated',
      'hydrating serum',
      'plump skin',
    ],
    concernTags: ['hydration'],
    ingredientBoosts: [
      'hyaluronic acid',
      'glycerin',
      'panthenol',
      'beta-glucan',
      'squalane',
      'ceramides',
    ],
    demoteTerms: ['salicylic', 'glycolic', 'retinol'],
    curatedProductIds: curatedIdsFor('hydration'),
    minResults: 6,
  },
  {
    id: 'breakouts',
    label: 'Breakouts',
    description: 'Acne-safe treatments + oil control',
    aliases: [
      'breakouts',
      'acne',
      'pimples',
      'clogged pores',
      'blemishes',
      'spot treatment',
      'pimple',
    ],
    concernTags: ['breakouts', 'pores', 'oiliness'],
    ingredientBoosts: [
      'salicylic acid',
      'benzoyl peroxide',
      'azelaic acid',
      'niacinamide',
      'adapalene',
    ],
    demoteTerms: ['heavy occlusive', 'fragrance'],
    curatedProductIds: curatedIdsFor('breakouts'),
    minResults: 6,
  },
  {
    id: 'redness',
    label: 'Redness',
    description: 'Calming, soothing, fragrance-free support',
    aliases: [
      'redness',
      'sensitive',
      'irritation',
      'rosacea',
      'calming',
      'soothing',
      'cica',
    ],
    concernTags: ['redness', 'sensitivity'],
    ingredientBoosts: [
      'azelaic acid',
      'centella',
      'cica',
      'panthenol',
      'green tea',
      'oat',
      'niacinamide',
    ],
    demoteTerms: ['fragrance', 'glycolic', 'retinol'],
    curatedProductIds: curatedIdsFor('redness'),
    minResults: 6,
  },
  {
    id: 'texture',
    label: 'Texture',
    description: 'Smoothing + resurfacing for rough or uneven skin',
    aliases: [
      'texture',
      'bumps',
      'rough skin',
      'uneven',
      'smooth skin',
      'resurfacing',
    ],
    concernTags: ['texture'],
    ingredientBoosts: [
      'lactic acid',
      'mandelic acid',
      'salicylic acid',
      'retinoid',
      'peptide',
    ],
    demoteTerms: [],
    curatedProductIds: curatedIdsFor('texture'),
    minResults: 6,
  },
  {
    id: 'dark spots',
    label: 'Dark spots',
    description: 'Brightening, post-acne marks, uneven tone',
    aliases: [
      'dark spots',
      'hyperpigmentation',
      'acne marks',
      'post acne marks',
      'uneven tone',
      'pigmentation',
      'brightening',
    ],
    concernTags: ['dark_marks'],
    ingredientBoosts: [
      'vitamin c',
      'tranexamic acid',
      'azelaic acid',
      'alpha arbutin',
      'niacinamide',
      'kojic acid',
    ],
    demoteTerms: [],
    curatedProductIds: curatedIdsFor('dark spots'),
    minResults: 6,
  },
  {
    id: 'sunscreen',
    label: 'Sunscreen',
    description: 'Daily SPF — acne-safe, sensitive-safe options',
    aliases: ['spf', 'sunscreen', 'sun protection', 'daily sunscreen', 'sun cream'],
    concernTags: ['sun_protection'],
    ingredientBoosts: [
      'zinc oxide',
      'avobenzone',
      'broad spectrum',
      'modern filters',
    ],
    demoteTerms: [],
    curatedProductIds: curatedIdsFor('sunscreen'),
    minResults: 6,
  },
  {
    id: 'barrier repair',
    label: 'Barrier repair',
    description: 'Ceramide + panthenol support for compromised barrier',
    aliases: [
      'barrier',
      'barrier repair',
      'damaged barrier',
      'flaky',
      'stinging',
      'irritated',
    ],
    concernTags: ['sensitivity', 'hydration'],
    ingredientBoosts: [
      'ceramides',
      'cholesterol',
      'fatty acids',
      'panthenol',
      'squalane',
      'petrolatum',
    ],
    demoteTerms: ['glycolic', 'retinol', 'salicylic'],
    curatedProductIds: curatedIdsFor('barrier repair'),
    minResults: 6,
  },
  {
    id: 'gentle cleansers',
    label: 'Gentle cleansers',
    description: 'Non-stripping cleansers for daily use',
    aliases: ['cleanser', 'face wash', 'gentle cleanser', 'wash'],
    concernTags: ['sensitivity'],
    ingredientBoosts: ['glycerin', 'ceramides', 'mild surfactants'],
    demoteTerms: ['sulfate', 'alcohol denat'],
    curatedProductIds: curatedIdsFor('gentle cleansers'),
    minResults: 6,
  },
  {
    id: 'exfoliation',
    label: 'Exfoliation',
    description: 'AHA / BHA / PHA chemical exfoliants',
    aliases: [
      'exfoliant',
      'chemical exfoliant',
      'aha',
      'bha',
      'pha',
      'gentle chemical exfoliant',
      'lactic acid',
      'salicylic acid',
      'mandelic acid',
      'peel',
    ],
    concernTags: ['texture', 'pores'],
    ingredientBoosts: [
      'salicylic acid',
      'lactic acid',
      'mandelic acid',
      'glycolic acid',
      'pha',
    ],
    demoteTerms: [],
    curatedProductIds: curatedIdsFor('exfoliation'),
    minResults: 6,
  },
  {
    id: 'moisturizer',
    label: 'Moisturizer',
    description: 'Daily face creams + lightweight lotions',
    aliases: [
      'moisturizer',
      'face cream',
      'cream',
      'lotion',
      'daily moisturizer',
      'lightweight moisturizer',
    ],
    concernTags: ['hydration'],
    ingredientBoosts: [
      'ceramides',
      'glycerin',
      'squalane',
      'dimethicone',
      'panthenol',
    ],
    demoteTerms: [],
    curatedProductIds: curatedIdsFor('moisturizer'),
    minResults: 6,
  },
];

function curatedIdsFor(categoryId: string): string[] {
  return curatedForCategory(categoryId).map((p) => p.id);
}

export function getBaseCategory(id: string): BaseCategory | undefined {
  return BASE_CATEGORIES.find((c) => c.id === id);
}

/**
 * Resolve a raw user query to a base category via alias match.
 * Used by the deterministic typed-search planner so even when AI
 * is unreachable, "gentle chemical exfoliant" → exfoliation.
 */
export function resolveCategoryFromQuery(rawQuery: string): BaseCategory | null {
  const q = rawQuery.trim().toLowerCase();
  if (q.length === 0) return null;

  // v22.5 — Priority 1: EXACT category-id match wins ahead of any
  // alias/substring match. A query of "moisturizer" or "best for
  // moisturizer" resolves to the moisturizer category directly, not
  // to hydration (which used to win on alias collision).
  for (const cat of BASE_CATEGORIES) {
    if (cat.id === 'best-for-you') continue;
    if (q === cat.id) return cat;
    // "best for {category-id}" pattern.
    if (q === `best for ${cat.id}`) return cat;
    if (q === `best ${cat.id}`) return cat;
  }
  // Priority 2: category-id appears as a whole-token substring in
  // the query. Whole-token check prevents accidental alias mining
  // (e.g. "redness" shouldn't pull in "best dryness" via the "ness"
  // suffix).
  for (const cat of BASE_CATEGORIES) {
    if (cat.id === 'best-for-you') continue;
    const idTokenRe = new RegExp(`\\b${escapeRegex(cat.id)}\\b`, 'i');
    if (idTokenRe.test(q)) return cat;
  }
  // Priority 3: exact alias match.
  for (const cat of BASE_CATEGORIES) {
    if (cat.id === 'best-for-you') continue;
    for (const alias of cat.aliases) {
      if (q === alias) return cat;
    }
  }
  // Priority 4: substring/alias match — score by alias length so a
  // longer (more specific) alias outranks a short one.
  let best: { cat: BaseCategory; score: number } | null = null;
  for (const cat of BASE_CATEGORIES) {
    if (cat.id === 'best-for-you') continue;
    for (const alias of cat.aliases) {
      // Token-aware match: require alias as a word boundary in q OR
      // q as a word boundary in alias. Plain `includes` could match
      // "moisturi" inside "moisturizing" — wanted — but also "red"
      // inside "credentials" — not wanted. Word boundaries fix it.
      const aliasRe = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i');
      if (aliasRe.test(q) || q.split(/\s+/).some((tok) => alias.includes(tok))) {
        const score = alias.length;
        if (!best || score > best.score) best = { cat, score };
      }
    }
    // Ingredient match also resolves the category, weighted by
    // ingredient name length so "salicylic acid" beats "acid".
    for (const ing of cat.ingredientBoosts) {
      const ingLower = ing.toLowerCase();
      const ingRe = new RegExp(`\\b${escapeRegex(ingLower)}\\b`, 'i');
      if (ingRe.test(q)) {
        const score = ingLower.length;
        if (!best || score > best.score) best = { cat, score };
      }
    }
  }
  return best?.cat ?? null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

void CURATED_PRODUCTS;
export type { CuratedProduct };

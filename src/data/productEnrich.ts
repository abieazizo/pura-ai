/**
 * v7.6 — enrichment layer applied over `seedProducts` at module load time.
 *
 * Seed data was written before we added `tint`, `rating`, `matchScore`,
 * `tags`, etc. Rather than rewriting the seed entry-by-entry, this file
 * layers those fields on top of existing products via a deterministic
 * hash + a few per-product overrides for the fields that have strong
 * intent (Beauty of Joseon → "natural"; CeraVe → "dermatologist-tested").
 *
 * `seedProducts` imports from this module to avoid a circular dependency
 * with the raw seed array.
 */

import type {
  Product,
  ProductTag,
  ProductTint,
  IngredientDetail,
} from '@/types';

// ---------------- deterministic helpers ----------------

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const TINTS: ProductTint[] = ['sand', 'clay', 'moss'];

export function tintFor(id: string): ProductTint {
  return TINTS[hashString(id) % 3];
}

/** 0..1, stable per id. Used to derive rating / reviewCount. */
function unit(id: string, salt: string): number {
  const h = hashString(`${id}:${salt}`);
  return (h % 10000) / 10000;
}

export function ratingFor(id: string): number {
  // 3.6..5.0 — weighted toward 4.3+ so the ★★★★☆ row reads like a stocked
  // catalog, not a chaotic marketplace.
  const base = 3.6 + unit(id, 'rating') * 1.4;
  return Math.round(base * 10) / 10;
}

export function reviewCountFor(id: string): number {
  // 80..24,000 — visible range, still tabular-friendly.
  const u = unit(id, 'reviews');
  const scaled = Math.pow(u, 1.8) * 24000;
  return Math.round(80 + scaled);
}

/** ISO date within the last N days, deterministic per id. */
export function addedDateFor(id: string, withinDays = 90): string {
  const u = unit(id, 'added');
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(u * withinDays));
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

// ---------------- tag + match heuristics ----------------

/**
 * Brand / keyword rules. Conservative — if we can't prove a tag applies,
 * we don't claim it.
 */
export function tagsFor(p: Pick<Product, 'brand' | 'name' | 'ingredients'>): ProductTag[] {
  const tags = new Set<ProductTag>();
  const brand = p.brand.toLowerCase();
  const name = p.name.toLowerCase();
  const ingr = p.ingredients.join(' ').toLowerCase();

  // Natural / clean
  if (
    brand.includes('beauty of joseon') ||
    brand.includes('anua') ||
    brand.includes('bonajour') ||
    brand.includes('innisfree') ||
    name.includes('heartleaf') ||
    name.includes('green tea') ||
    name.includes('rice') ||
    name.includes('ginseng')
  ) {
    tags.add('natural');
    tags.add('clean');
  }

  // Dermatologist-tested — safer bets
  if (
    brand.includes('cerave') ||
    brand.includes('la roche-posay') ||
    brand.includes('cetaphil') ||
    brand.includes("paula's choice")
  ) {
    tags.add('dermatologist-tested');
  }

  // Fragrance-free — name or ingredient signal
  if (
    name.includes('fragrance-free') ||
    brand.includes('cerave') ||
    brand.includes('la roche-posay') ||
    !ingr.includes('fragrance')
  ) {
    // Add only when we genuinely see no fragrance/parfum/limonene/linalool.
    if (
      !ingr.includes('fragrance') &&
      !ingr.includes('parfum') &&
      !ingr.includes('limonene') &&
      !ingr.includes('linalool')
    ) {
      tags.add('fragrance-free');
    }
  }

  // Sensitive-safe — only when BOTH fragrance-free and non-active
  if (
    tags.has('fragrance-free') &&
    !name.includes('bha') &&
    !name.includes('retinoid') &&
    !name.includes('retinol') &&
    !name.includes('lactic') &&
    !name.includes('azelaic')
  ) {
    tags.add('sensitive-safe');
  }

  return Array.from(tags);
}

/**
 * Match score override — where we have a seed `ProductMatch` for this
 * product, use its percent. Otherwise synthesize a neutral score (55..78)
 * so the "Best for you" row has something to show pre-scan.
 */
export function matchScoreFor(
  id: string,
  overrides: Record<string, number>
): number {
  const hit = overrides[id];
  if (typeof hit === 'number') return hit;
  const u = unit(id, 'match');
  return Math.round(55 + u * 23);
}

// ---------------- optional detail field fills ----------------

export function formulationFor(category: Product['category']): string {
  // Remapped at render time — "Common product" is forbidden per spec §3.15.
  // We seed a cleaner default here so the remap is rarely hit.
  return 'Over-the-counter';
}

export function timeOfUseFor(category: Product['category']): Product['timeOfUse'] {
  if (category === 'spf') return 'Morning';
  if (category === 'treatment') return 'Evening';
  if (category === 'mask') return 'Evening';
  return 'Both';
}

export function skinTypesFor(category: Product['category']): string[] {
  switch (category) {
    case 'cleanser':
      return ['Dry', 'Normal', 'Oily', 'Combination'];
    case 'moisturizer':
      return ['Dry', 'Normal', 'Combination'];
    case 'spf':
      return ['All skin types'];
    case 'serum':
    case 'treatment':
      return ['Normal', 'Oily', 'Combination'];
    default:
      return ['All skin types'];
  }
}

export function goodForFor(category: Product['category']): string[] {
  switch (category) {
    case 'cleanser':
      return ['Daily use', 'Removing SPF'];
    case 'serum':
      return ['Breakouts', 'Texture'];
    case 'moisturizer':
      return ['Barrier repair', 'Hydration'];
    case 'spf':
      return ['Daily UV protection'];
    case 'treatment':
      return ['Chin clarity', 'Texture'];
    case 'toner':
      return ['Calming', 'Preparing skin for serums'];
    case 'mask':
      return ['Weekly reset'];
  }
}

/**
 * Default how-to-use copy by category. Optional — some products ship
 * their own via `howToUseFor` overrides later.
 */
export function howToUseFor(category: Product['category']): string {
  switch (category) {
    case 'cleanser':
      return 'Wet face. Massage a dime-sized amount for thirty seconds. Rinse with lukewarm water.';
    case 'toner':
      return 'Pat three to four drops onto damp skin with your palms. Do not rub.';
    case 'serum':
      return 'Apply two or three drops to damp skin. Focus on the areas you want to treat.';
    case 'moisturizer':
      return 'A pea-sized amount across the face and neck. Seal in any active layers.';
    case 'spf':
      return 'Two finger-lengths as the final step of your morning routine. Reapply every two hours outdoors.';
    case 'treatment':
      return 'Apply with a cotton pad every other evening. Do not combine with other acids the same night.';
    case 'mask':
      return 'Once or twice a week in place of your moisturizer. Leave on for ten minutes, then rinse.';
  }
}

/**
 * Derive a structured ingredient list from the string[] ingredients on
 * seed. We tag each ingredient with a short "purpose" — this is shown as
 * the right-hand caption in IngredientsPanel rows.
 */
const PURPOSE_DICT: Array<[string, string]> = [
  ['niacinamide', 'Pore + sebum'],
  ['zinc', 'Sebum regulation'],
  ['salicylic', 'Clears pores'],
  ['hyaluronic', 'Hydration'],
  ['ceramide', 'Barrier repair'],
  ['glycerin', 'Hydration'],
  ['panthenol', 'Soothing'],
  ['heartleaf', 'Calming'],
  ['green tea', 'Antioxidant'],
  ['tranexamic', 'Brightening'],
  ['retinoid', 'Smoothing'],
  ['retinol', 'Smoothing'],
  ['lactic', 'Gentle exfoliation'],
  ['vitamin c', 'Brightening'],
  ['vitamin e', 'Antioxidant'],
  ['rice', 'Brightening'],
  ['ginseng', 'Revitalizing'],
  ['shea', 'Nourishing'],
  ['azelaic', 'Clears + calms'],
  ['thermal water', 'Soothing'],
  ['fragrance', 'Scent (common irritant)'],
  ['parfum', 'Scent (common irritant)'],
  ['alcohol denat', 'Solvent (can dry skin)'],
  ['tea tree oil', 'Essential oil'],
  ['lavender oil', 'Essential oil'],
  ['eucalyptus', 'Essential oil'],
  ['limonene', 'Fragrance (common irritant)'],
  ['linalool', 'Fragrance (common irritant)'],
];

export function deriveIngredientList(raw: string[]): IngredientDetail[] {
  return raw.map((r) => {
    const lower = r.toLowerCase();
    const match = PURPOSE_DICT.find(([k]) => lower.includes(k));
    // Capitalize each word for display.
    const title = r
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return { name: title, purpose: match ? match[1] : 'Supportive' };
  });
}

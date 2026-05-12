/**
 * v22.2 — Curated skincare product catalog.
 *
 * Real, mainstream-recognized skincare products with stable metadata.
 * Used as the deterministic fallback layer when the AI proxy fails
 * (or before AI runs to seed the candidate pool). Replaces the
 * "two weak fallback items" UX the user reported.
 *
 * Source of truth for category-mapped product display. Brand + name
 * + ingredients are real and verifiable; price is approximate USD;
 * imageUrl is intentionally left null on most entries so the client's
 * existing premium placeholder fires (we don't ship fake image URLs).
 *
 * Tags use the same vocabulary as the base category registry so
 * filtering is a simple set intersection.
 */

import type { LiveProductCandidate } from '@/ai/ai-contracts';

export interface CuratedProduct {
  id: string;
  brand: string;
  name: string;
  price: number;
  /** Categories this product fits (matches BASE_CATEGORIES ids). */
  categoryTags: string[];
  /** Concern axes this product addresses. */
  concernTags: string[];
  /** Key ingredients — drives ingredient-match scoring. */
  ingredientTags: string[];
  /** Skin types this product is appropriate for. */
  skinTypeTags: string[];
  /** Skin profiles to AVOID recommending this product to. */
  avoidForTags?: string[];
  /** 'gentle' | 'medium' | 'strong'. Drives sensitivity demotion. */
  strength?: 'gentle' | 'medium' | 'strong';
  /** Short why-this-fits line shown on the card. */
  reason: string;
  /** Higher = preferred when scores tie. Range 0-100. */
  trustedScore: number;
  /** Real product page URL when known. */
  productUrl?: string;
}

export const CURATED_PRODUCTS: readonly CuratedProduct[] = [
  // ── EXFOLIATION / BHA / AHA / PHA ─────────────────────────────────
  {
    id: 'curated-paulas-2bha-liquid',
    brand: "Paula's Choice",
    name: 'Skin Perfecting 2% BHA Liquid Exfoliant',
    price: 35,
    categoryTags: ['exfoliation', 'breakouts'],
    concernTags: ['breakouts', 'pores', 'texture', 'oiliness'],
    ingredientTags: ['salicylic acid', 'bha'],
    skinTypeTags: ['oily', 'combination', 'acne-prone'],
    strength: 'medium',
    reason: 'BHA exfoliant — clears clogged pores, smooths texture',
    trustedScore: 95,
    productUrl: 'https://www.paulaschoice.com/',
  },
  {
    id: 'curated-ordinary-lactic-5',
    brand: 'The Ordinary',
    name: 'Lactic Acid 5% + HA',
    price: 10,
    categoryTags: ['exfoliation', 'texture'],
    concernTags: ['texture', 'dark_marks', 'hydration'],
    ingredientTags: ['lactic acid', 'hyaluronic acid'],
    skinTypeTags: ['dry', 'sensitive', 'combination'],
    strength: 'gentle',
    reason: 'Gentle AHA — smooths texture without harshness',
    trustedScore: 92,
    productUrl: 'https://theordinary.com/',
  },
  {
    id: 'curated-ordinary-mandelic-10',
    brand: 'The Ordinary',
    name: 'Mandelic Acid 10% + HA',
    price: 12,
    categoryTags: ['exfoliation', 'texture', 'dark spots'],
    concernTags: ['texture', 'dark_marks', 'sensitivity'],
    ingredientTags: ['mandelic acid', 'hyaluronic acid'],
    skinTypeTags: ['sensitive', 'dry', 'combination'],
    strength: 'gentle',
    reason: 'Sensitive-safe AHA — gentle on barrier, even on dark spots',
    trustedScore: 90,
    productUrl: 'https://theordinary.com/',
  },
  {
    id: 'curated-cosrx-bha-blackhead',
    brand: 'COSRX',
    name: 'BHA Blackhead Power Liquid',
    price: 25,
    categoryTags: ['exfoliation', 'breakouts'],
    concernTags: ['pores', 'breakouts', 'oiliness'],
    ingredientTags: ['betaine salicylate', 'bha'],
    skinTypeTags: ['oily', 'combination', 'acne-prone'],
    strength: 'medium',
    reason: 'Pore-targeting BHA — softer than salicylic, daily-safe',
    trustedScore: 88,
    productUrl: 'https://www.cosrx.com/',
  },

  // ── HYDRATION ──────────────────────────────────────────────────────
  {
    id: 'curated-ordinary-ha-2-b5',
    brand: 'The Ordinary',
    name: 'Hyaluronic Acid 2% + B5',
    price: 10,
    categoryTags: ['hydration'],
    concernTags: ['hydration'],
    ingredientTags: ['hyaluronic acid', 'panthenol'],
    skinTypeTags: ['dry', 'oily', 'combination', 'sensitive'],
    strength: 'gentle',
    reason: 'Affordable hydration boost — plumps without weight',
    trustedScore: 90,
    productUrl: 'https://theordinary.com/',
  },
  {
    id: 'curated-lrp-hyalu-b5',
    brand: 'La Roche-Posay',
    name: 'Hyalu B5 Serum',
    price: 40,
    categoryTags: ['hydration'],
    concernTags: ['hydration', 'sensitivity'],
    ingredientTags: ['hyaluronic acid', 'vitamin b5', 'panthenol'],
    skinTypeTags: ['dry', 'sensitive', 'combination'],
    strength: 'gentle',
    reason: 'Multi-weight HA + B5 — plumping, sensitive-safe',
    trustedScore: 95,
    productUrl: 'https://www.laroche-posay.us/',
  },
  {
    id: 'curated-cosrx-snail-96',
    brand: 'COSRX',
    name: 'Advanced Snail 96 Mucin Power Essence',
    price: 25,
    categoryTags: ['hydration', 'barrier repair'],
    concernTags: ['hydration', 'sensitivity', 'redness'],
    ingredientTags: ['snail mucin', 'humectants'],
    skinTypeTags: ['dry', 'sensitive', 'combination', 'oily'],
    strength: 'gentle',
    reason: 'Cult favorite hydration + barrier soothing',
    trustedScore: 90,
    productUrl: 'https://www.cosrx.com/',
  },
  {
    id: 'curated-byoma-hydrating-serum',
    brand: 'Byoma',
    name: 'Hydrating Serum',
    price: 17,
    categoryTags: ['hydration', 'barrier repair'],
    concernTags: ['hydration', 'sensitivity'],
    ingredientTags: ['glycerin', 'squalane', 'ceramides'],
    skinTypeTags: ['dry', 'sensitive', 'combination'],
    strength: 'gentle',
    reason: 'Lightweight hydration with ceramide barrier support',
    trustedScore: 85,
    productUrl: 'https://byoma.com/',
  },

  // ── BREAKOUTS / ACNE ──────────────────────────────────────────────
  {
    id: 'curated-lrp-effaclar-duo',
    brand: 'La Roche-Posay',
    name: 'Effaclar Duo Acne Treatment',
    price: 32,
    categoryTags: ['breakouts'],
    concernTags: ['breakouts'],
    ingredientTags: ['benzoyl peroxide', 'niacinamide'],
    skinTypeTags: ['oily', 'acne-prone'],
    avoidForTags: ['sensitive', 'rosacea'],
    strength: 'medium',
    reason: 'Benzoyl peroxide acne treatment — visible breakouts',
    trustedScore: 92,
    productUrl: 'https://www.laroche-posay.us/',
  },
  {
    id: 'curated-differin-adapalene',
    brand: 'Differin',
    name: 'Adapalene Gel 0.1%',
    price: 18,
    categoryTags: ['breakouts', 'texture'],
    concernTags: ['breakouts', 'texture', 'pores'],
    ingredientTags: ['adapalene', 'retinoid'],
    skinTypeTags: ['oily', 'combination', 'acne-prone'],
    avoidForTags: ['sensitive', 'pregnant'],
    strength: 'strong',
    reason: 'Prescription-grade retinoid — introduce slowly + use SPF',
    trustedScore: 95,
    productUrl: 'https://www.differin.com/',
  },
  {
    id: 'curated-ordinary-niacinamide-10',
    brand: 'The Ordinary',
    name: 'Niacinamide 10% + Zinc 1%',
    price: 6,
    categoryTags: ['breakouts'],
    concernTags: ['oiliness', 'breakouts', 'pores'],
    ingredientTags: ['niacinamide', 'zinc'],
    skinTypeTags: ['oily', 'combination', 'acne-prone'],
    strength: 'gentle',
    reason: 'Oil-control + blemish support — sensitivity-safe',
    trustedScore: 88,
    productUrl: 'https://theordinary.com/',
  },
  {
    id: 'curated-naturium-azelaic-10',
    brand: 'Naturium',
    name: 'Azelaic Topical Acid 10%',
    price: 20,
    categoryTags: ['breakouts', 'redness', 'dark spots'],
    concernTags: ['breakouts', 'redness', 'dark_marks'],
    ingredientTags: ['azelaic acid'],
    skinTypeTags: ['sensitive', 'oily', 'combination', 'rosacea-prone'],
    strength: 'gentle',
    reason: 'Multi-tasker — calms redness, treats breakouts, fades marks',
    trustedScore: 90,
    productUrl: 'https://naturium.com/',
  },

  // ── REDNESS / SENSITIVE ───────────────────────────────────────────
  {
    id: 'curated-ordinary-azelaic-10',
    brand: 'The Ordinary',
    name: 'Azelaic Acid Suspension 10%',
    price: 12,
    categoryTags: ['redness', 'breakouts', 'dark spots'],
    concernTags: ['redness', 'breakouts', 'dark_marks'],
    ingredientTags: ['azelaic acid'],
    skinTypeTags: ['sensitive', 'oily', 'rosacea-prone'],
    strength: 'gentle',
    reason: 'Affordable azelaic — calms, brightens, sensitivity-safe',
    trustedScore: 90,
    productUrl: 'https://theordinary.com/',
  },
  {
    id: 'curated-lrp-cicaplast-b5',
    brand: 'La Roche-Posay',
    name: 'Cicaplast Balm B5',
    price: 17,
    categoryTags: ['redness', 'barrier repair'],
    concernTags: ['redness', 'sensitivity', 'hydration'],
    ingredientTags: ['panthenol', 'madecassoside'],
    skinTypeTags: ['sensitive', 'dry', 'rosacea-prone'],
    strength: 'gentle',
    reason: 'Multipurpose calming balm — redness, irritation, dryness',
    trustedScore: 92,
    productUrl: 'https://www.laroche-posay.us/',
  },
  {
    id: 'curated-avene-cicalfate',
    brand: 'Avène',
    name: 'Cicalfate+ Restorative Protective Cream',
    price: 28,
    categoryTags: ['redness', 'barrier repair'],
    concernTags: ['redness', 'sensitivity'],
    ingredientTags: ['copper-zinc', 'thermal water'],
    skinTypeTags: ['sensitive', 'dry', 'rosacea-prone'],
    strength: 'gentle',
    reason: 'Calming restorative — redness, post-procedure recovery',
    trustedScore: 90,
    productUrl: 'https://www.aveneusa.com/',
  },
  {
    id: 'curated-boj-calming-serum',
    brand: 'Beauty of Joseon',
    name: 'Calming Serum Green Tea + Panthenol',
    price: 17,
    categoryTags: ['redness', 'hydration'],
    concernTags: ['redness', 'sensitivity', 'hydration'],
    ingredientTags: ['green tea', 'panthenol'],
    skinTypeTags: ['sensitive', 'combination', 'rosacea-prone'],
    strength: 'gentle',
    reason: 'Soothing calming serum — redness + light hydration',
    trustedScore: 88,
    productUrl: 'https://beautyofjoseon.com/',
  },

  // ── DARK SPOTS ─────────────────────────────────────────────────────
  {
    id: 'curated-naturium-tranexamic-5',
    brand: 'Naturium',
    name: 'Tranexamic Topical Acid 5%',
    price: 22,
    categoryTags: ['dark spots'],
    concernTags: ['dark_marks'],
    ingredientTags: ['tranexamic acid', 'kojic acid', 'niacinamide'],
    skinTypeTags: ['sensitive', 'oily', 'combination', 'dry'],
    strength: 'gentle',
    reason: 'Multi-acid dark spot treatment — gentle, post-acne marks',
    trustedScore: 90,
    productUrl: 'https://naturium.com/',
  },
  {
    id: 'curated-good-molecules-discoloration',
    brand: 'Good Molecules',
    name: 'Discoloration Correcting Serum',
    price: 12,
    categoryTags: ['dark spots'],
    concernTags: ['dark_marks'],
    ingredientTags: ['tranexamic acid', 'niacinamide'],
    skinTypeTags: ['sensitive', 'oily', 'combination', 'dry'],
    strength: 'gentle',
    reason: 'Affordable dark spot serum — well tolerated',
    trustedScore: 85,
    productUrl: 'https://goodmolecules.com/',
  },
  {
    id: 'curated-ordinary-alpha-arbutin',
    brand: 'The Ordinary',
    name: 'Alpha Arbutin 2% + HA',
    price: 12,
    categoryTags: ['dark spots'],
    concernTags: ['dark_marks'],
    ingredientTags: ['alpha arbutin', 'hyaluronic acid'],
    skinTypeTags: ['sensitive', 'oily', 'combination', 'dry'],
    strength: 'gentle',
    reason: 'Tyrosinase inhibitor — uneven tone, melanin support',
    trustedScore: 87,
    productUrl: 'https://theordinary.com/',
  },

  // ── SUNSCREEN ──────────────────────────────────────────────────────
  {
    id: 'curated-boj-relief-sun-spf50',
    brand: 'Beauty of Joseon',
    name: 'Relief Sun: Rice + Probiotics SPF 50',
    price: 18,
    categoryTags: ['sunscreen'],
    concernTags: ['sun_protection'],
    ingredientTags: ['rice extract', 'modern filters'],
    skinTypeTags: ['oily', 'combination', 'dry', 'sensitive'],
    strength: 'gentle',
    reason: 'Lightweight Korean SPF 50 — no white cast, daily-safe',
    trustedScore: 95,
    productUrl: 'https://beautyofjoseon.com/',
  },
  {
    id: 'curated-lrp-anthelios-melt',
    brand: 'La Roche-Posay',
    name: 'Anthelios Melt-in Milk SPF 60',
    price: 38,
    categoryTags: ['sunscreen'],
    concernTags: ['sun_protection', 'sensitivity'],
    ingredientTags: ['broad spectrum', 'avobenzone'],
    skinTypeTags: ['sensitive', 'dry', 'combination'],
    strength: 'gentle',
    reason: 'Sensitive-safe high SPF — body + face',
    trustedScore: 92,
    productUrl: 'https://www.laroche-posay.us/',
  },
  {
    id: 'curated-supergoop-unseen-40',
    brand: 'Supergoop!',
    name: 'Unseen Sunscreen SPF 40',
    price: 38,
    categoryTags: ['sunscreen'],
    concernTags: ['sun_protection'],
    ingredientTags: ['modern filters'],
    skinTypeTags: ['oily', 'combination', 'dry'],
    strength: 'gentle',
    reason: 'Invisible primer SPF — wears under makeup',
    trustedScore: 90,
    productUrl: 'https://supergoop.com/',
  },
  {
    id: 'curated-eltamd-uv-clear-46',
    brand: 'EltaMD',
    name: 'UV Clear SPF 46',
    price: 43,
    categoryTags: ['sunscreen'],
    concernTags: ['sun_protection', 'breakouts', 'redness'],
    ingredientTags: ['zinc oxide', 'niacinamide'],
    skinTypeTags: ['oily', 'acne-prone', 'sensitive', 'rosacea-prone'],
    strength: 'gentle',
    reason: 'Acne-safe + sensitivity-friendly mineral SPF',
    trustedScore: 95,
    productUrl: 'https://eltamd.com/',
  },

  // ── MOISTURIZER / BARRIER REPAIR ──────────────────────────────────
  {
    id: 'curated-cerave-pm-lotion',
    brand: 'CeraVe',
    name: 'PM Facial Moisturizing Lotion',
    price: 18,
    categoryTags: ['moisturizer', 'barrier repair'],
    concernTags: ['hydration', 'sensitivity', 'breakouts'],
    ingredientTags: ['ceramides', 'niacinamide', 'hyaluronic acid'],
    skinTypeTags: ['oily', 'combination', 'acne-prone', 'sensitive'],
    strength: 'gentle',
    reason: 'Lightweight ceramide moisturizer — acne-safe',
    trustedScore: 95,
    productUrl: 'https://www.cerave.com/',
  },
  {
    id: 'curated-vanicream-moisturizer',
    brand: 'Vanicream',
    name: 'Daily Facial Moisturizer',
    price: 15,
    categoryTags: ['moisturizer', 'barrier repair'],
    concernTags: ['hydration', 'sensitivity'],
    ingredientTags: ['ceramides', 'hyaluronic acid'],
    skinTypeTags: ['sensitive', 'dry', 'eczema-prone'],
    strength: 'gentle',
    reason: 'Fragrance-free — sensitive skin barrier support',
    trustedScore: 92,
    productUrl: 'https://www.vanicream.com/',
  },
  {
    id: 'curated-lrp-toleriane-double',
    brand: 'La Roche-Posay',
    name: 'Toleriane Double Repair Moisturizer',
    price: 23,
    categoryTags: ['moisturizer', 'barrier repair'],
    concernTags: ['hydration', 'sensitivity', 'redness'],
    ingredientTags: ['ceramide', 'niacinamide', 'glycerin'],
    skinTypeTags: ['sensitive', 'dry', 'normal'],
    strength: 'gentle',
    reason: 'Barrier-repair daily moisturizer — sensitive-safe',
    trustedScore: 90,
    productUrl: 'https://www.laroche-posay.us/',
  },
  {
    id: 'curated-fab-ultra-repair',
    brand: 'First Aid Beauty',
    name: 'Ultra Repair Cream',
    price: 38,
    categoryTags: ['moisturizer', 'barrier repair'],
    concernTags: ['hydration', 'sensitivity', 'redness'],
    ingredientTags: ['colloidal oatmeal', 'shea butter', 'ceramides'],
    skinTypeTags: ['dry', 'sensitive', 'eczema-prone'],
    strength: 'gentle',
    reason: 'Rich barrier repair — very dry + irritated skin',
    trustedScore: 90,
    productUrl: 'https://www.firstaidbeauty.com/',
  },

  // ── CLEANSERS ──────────────────────────────────────────────────────
  {
    id: 'curated-cerave-hydrating-cleanser',
    brand: 'CeraVe',
    name: 'Hydrating Facial Cleanser',
    price: 15,
    categoryTags: ['gentle cleansers'],
    concernTags: ['hydration', 'sensitivity'],
    ingredientTags: ['ceramides', 'hyaluronic acid'],
    skinTypeTags: ['dry', 'sensitive', 'normal'],
    strength: 'gentle',
    reason: 'Non-stripping cleanser with ceramides',
    trustedScore: 95,
    productUrl: 'https://www.cerave.com/',
  },
  {
    id: 'curated-lrp-toleriane-cleanser',
    brand: 'La Roche-Posay',
    name: 'Toleriane Hydrating Gentle Cleanser',
    price: 17,
    categoryTags: ['gentle cleansers'],
    concernTags: ['sensitivity', 'hydration'],
    ingredientTags: ['glycerin', 'niacinamide'],
    skinTypeTags: ['dry', 'sensitive'],
    strength: 'gentle',
    reason: 'Sensitive-skin gentle cleanser, fragrance-free',
    trustedScore: 92,
    productUrl: 'https://www.laroche-posay.us/',
  },
  {
    id: 'curated-vanicream-cleanser',
    brand: 'Vanicream',
    name: 'Gentle Facial Cleanser',
    price: 11,
    categoryTags: ['gentle cleansers'],
    concernTags: ['sensitivity'],
    ingredientTags: ['mild surfactants'],
    skinTypeTags: ['sensitive', 'eczema-prone', 'dry'],
    strength: 'gentle',
    reason: 'Ultra-gentle, fragrance-free, dye-free',
    trustedScore: 90,
    productUrl: 'https://www.vanicream.com/',
  },
  {
    id: 'curated-cerave-foaming-cleanser',
    brand: 'CeraVe',
    name: 'Foaming Facial Cleanser',
    price: 15,
    categoryTags: ['gentle cleansers'],
    concernTags: ['oiliness', 'breakouts'],
    ingredientTags: ['ceramides', 'niacinamide'],
    skinTypeTags: ['oily', 'combination', 'acne-prone'],
    strength: 'gentle',
    reason: 'Daily foam cleanser for oily/combination skin',
    trustedScore: 92,
    productUrl: 'https://www.cerave.com/',
  },
];

/** Fast index by id. */
export const CURATED_BY_ID: Map<string, CuratedProduct> = new Map(
  CURATED_PRODUCTS.map((p) => [p.id, p])
);

/**
 * Convert a CuratedProduct into the canonical LiveProductCandidate
 * shape the engine + UI expects. Image left null on purpose —
 * client placeholder renders the brand + name premium card.
 */
export function curatedToLiveCandidate(p: CuratedProduct): LiveProductCandidate {
  const concernEnumSafe = p.concernTags.filter((c) =>
    [
      'breakouts',
      'redness',
      'hydration',
      'texture',
      'dark_marks',
      'oiliness',
      'sensitivity',
      'pores',
    ].includes(c)
  ) as LiveProductCandidate['concernTags'];
  return {
    id: p.id,
    brand: p.brand,
    name: p.name,
    category: deriveCategory(p),
    concernTags: concernEnumSafe,
    skinTypeTags: p.skinTypeTags,
    ingredientsHighlights: p.ingredientTags,
    price: p.price,
    currency: 'USD',
    merchantName: p.productUrl ? new URL(p.productUrl).hostname : null,
    productUrl: p.productUrl ?? null,
    imageUrl: null,
    imageSource: 'none',
    imageQuality: null,
    imageQualityReason: 'curated catalog (no image attached)',
    shortDescription: p.reason,
    matchReason: p.reason,
    availability: 'available',
    sourceTimestamp: new Date().toISOString(),
    matchScore: Math.min(100, p.trustedScore),
  };
}

function deriveCategory(p: CuratedProduct): LiveProductCandidate['category'] {
  if (p.categoryTags.includes('moisturizer')) return 'moisturizer';
  if (p.categoryTags.includes('gentle cleansers')) return 'cleanser';
  if (p.categoryTags.includes('sunscreen')) return 'spf';
  if (p.categoryTags.includes('exfoliation')) return 'spot_treatment';
  if (p.categoryTags.includes('barrier repair')) return 'moisturizer';
  if (p.categoryTags.includes('breakouts')) return 'spot_treatment';
  return 'serum';
}

/**
 * v22.2 — return all curated products that match a category id.
 * Set of category ids is the source of truth for "which products
 * belong in this category".
 */
export function curatedForCategory(categoryId: string): CuratedProduct[] {
  return CURATED_PRODUCTS.filter((p) =>
    p.categoryTags.some((t) => t.toLowerCase() === categoryId.toLowerCase())
  );
}

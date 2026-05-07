/**
 * Pura AI — deterministic seed catalog retrieval (v19.17).
 *
 * The PRIMARY product retrieval engine. Replaces the previous
 * AI-first `lookupForScan` / `lookupLiveProducts` as the default
 * source of recommendation candidates. AI is no longer responsible
 * for the candidate set in the result-screen and products-screen
 * paths — it is reserved (Phase 2 of the refactor) for optional
 * rerank + concise explanation only.
 *
 * Rules followed:
 *   • Pure function. No AI calls. Synchronous.
 *   • Returns LiveProductCandidate[] so the existing canonical
 *     RecommendationContext + scoreCandidateLocal infrastructure
 *     consumes it without changes.
 *   • No fabrication. Every field maps from a real seed product
 *     (`src/data/seed.ts` :: `seedProducts`). When a seed field
 *     is absent we leave the candidate field null — never invent.
 *   • Filters by query / concern / category when the caller
 *     provides them. When none are provided, returns the broadest
 *     match-score-sorted set.
 */

import type {
  ConcernType,
  LiveProductCandidate,
  ProductCategory as AIProductCategory,
} from '@/ai/ai-contracts';
import type { Product, ProductCategory as AppProductCategory } from '@/types';
import { seedProducts } from '@/data/seed';

// ---------------------------------------------------------------------------
// App `ProductCategory` (`'treatment'` etc.) → AI contract
// `ProductCategory` (`'spot_treatment'` etc.). The two enums diverged
// historically; the seed catalog uses the app shape, the canonical
// candidate uses the AI shape. This mapper keeps them in sync.
// ---------------------------------------------------------------------------

function appCategoryToAiCategory(c: AppProductCategory): AIProductCategory {
  switch (c) {
    case 'cleanser':
      return 'cleanser';
    case 'toner':
      return 'toner';
    case 'serum':
      return 'serum';
    case 'moisturizer':
      return 'moisturizer';
    case 'spf':
      return 'spf';
    case 'mask':
      return 'mask';
    case 'treatment':
      return 'spot_treatment';
    default:
      return 'unknown';
  }
}

// ---------------------------------------------------------------------------
// Concern → keyword index. Maps the canonical ConcernType to a
// list of phrases / ingredient names that signal a seed product is
// a plausible match for that concern. Used by `productMatchesConcern`.
// ---------------------------------------------------------------------------

const CONCERN_KEYWORDS: Record<ConcernType, readonly string[]> = {
  breakouts: [
    'salicylic',
    'bha',
    'azelaic',
    'benzoyl',
    'breakout',
    'acne',
    'spot',
    'congestion',
    'clog',
    'oil',
  ],
  redness: [
    'redness',
    'rosacea',
    'centella',
    'cica',
    'azelaic',
    'panthenol',
    'soothing',
    'calm',
    'heartleaf',
    'mucin',
  ],
  hydration: [
    'hyaluronic',
    'glycerin',
    'ceramide',
    'snail',
    'mucin',
    'hydrating',
    'moistur',
    'panthenol',
    'squalane',
  ],
  texture: [
    'glycolic',
    'lactic',
    'aha',
    'pha',
    'retinol',
    'retinal',
    'retinoid',
    'resurfacing',
    'texture',
    'smoothing',
  ],
  dark_marks: [
    'vitamin c',
    'ascorbic',
    'azelaic',
    'tranexamic',
    'discoloration',
    'pigmentation',
    'dark mark',
    'dark spot',
    'brighten',
    'niacinamide',
  ],
  oiliness: [
    'niacinamide',
    'salicylic',
    'bha',
    'mattifying',
    'oil control',
    'oily',
  ],
  sensitivity: [
    'sensitive',
    'gentle',
    'fragrance-free',
    'fragrance free',
    'centella',
    'cica',
    'panthenol',
    'ceramide',
    'soothing',
  ],
  pores: [
    'niacinamide',
    'salicylic',
    'bha',
    'pore',
    'minimizing',
    'tightening',
  ],
};

// ---------------------------------------------------------------------------
// Concern → tag inference. Walks a seed product's ingredient list +
// description + tags to decide which canonical concerns it plausibly
// addresses. Used to populate ProductCandidate.concernTags
// deterministically.
// ---------------------------------------------------------------------------

function deriveConcernTags(p: Product): ConcernType[] {
  const corpus = (
    [
      p.name,
      p.description,
      ...(p.keyIngredients ?? []),
      ...(p.ingredients ?? []),
      ...(p.tags ?? []).map((t) => String(t)),
      ...(p.goodFor ?? []),
    ]
      .join(' ')
      .toLowerCase()
  );
  const tags: ConcernType[] = [];
  for (const concern of Object.keys(CONCERN_KEYWORDS) as ConcernType[]) {
    if (CONCERN_KEYWORDS[concern].some((kw) => corpus.includes(kw))) {
      tags.push(concern);
    }
  }
  return tags;
}

function productMatchesConcern(p: Product, concern: ConcernType): boolean {
  return deriveConcernTags(p).includes(concern);
}

// ---------------------------------------------------------------------------
// Seed → ProductCandidate adapter. Maps a Product (rich seed shape)
// to a LiveProductCandidate (canonical recommendation shape).
// ---------------------------------------------------------------------------

import {
  sephoraSearchUrl,
  BRAND_DTC,
  hostOf,
  merchantNameForHost,
} from '@/lib/commerceEnrichment';

function deriveMerchantFromBuyUrl(
  buyUrl: string | undefined,
  brand: string,
  name: string
): { productUrl: string; merchantName: string } {
  if (buyUrl) {
    const host = hostOf(buyUrl);
    if (host) {
      return {
        productUrl: buyUrl,
        merchantName: merchantNameForHost(host),
      };
    }
  }
  // Fall back to BRAND_DTC by lowercase brand match.
  const brandKey = brand.trim().toLowerCase();
  const dtc = BRAND_DTC[brandKey];
  if (dtc) {
    return {
      productUrl: `https://www.${dtc.host}/`,
      merchantName: `${dtc.merchant} (DTC)`,
    };
  }
  // Final fallback — Sephora search.
  return {
    productUrl: sephoraSearchUrl(brand, name),
    merchantName: 'Sephora (search)',
  };
}

function toCandidate(p: Product): LiveProductCandidate {
  const merchant = deriveMerchantFromBuyUrl(p.buyUrl, p.brand, p.name);
  return {
    id: p.id,
    brand: p.brand,
    name: p.name,
    category: appCategoryToAiCategory(p.category),
    concernTags: deriveConcernTags(p),
    skinTypeTags: p.skinTypes ?? [],
    ingredientsHighlights: p.keyIngredients ?? [],
    price: typeof p.priceUsd === 'number' ? p.priceUsd : p.price ?? null,
    currency: 'USD',
    merchantName: merchant.merchantName,
    productUrl: merchant.productUrl,
    imageUrl: p.imageUrl ?? p.imageUri ?? null,
    imageSource: p.imageUrl || p.imageUri ? 'merchant' : 'none',
    shortDescription: p.description ?? '',
    matchReason: '',
    availability: 'available',
    sourceTimestamp: new Date().toISOString(),
    matchScore: typeof p.matchScore === 'number' ? p.matchScore : 70,
  };
}

// ---------------------------------------------------------------------------
// Public retrieval API.
// ---------------------------------------------------------------------------

export interface SeedSearchOpts {
  /** Free-text query. Matched against brand + name + description. */
  query?: string | null;
  /** Canonical concern axis. Filters to products plausibly
   *  addressing this concern via `deriveConcernTags`. */
  concern?: ConcernType | null;
  /** Optional category filter (cleanser / serum / etc.). */
  category?: string | null;
  /** Hard cap on returned candidates. Default 12. */
  limit?: number;
}

/**
 * Retrieve candidates from the seed catalog. Pure, synchronous,
 * deterministic. Returns LiveProductCandidate[] sorted by the
 * seed product's matchScore desc (a stable starting order; the
 * downstream local scorer reorders by user fit).
 */
export function retrieveSeedCandidates(
  opts: SeedSearchOpts = {}
): LiveProductCandidate[] {
  const limit = Math.max(1, Math.min(50, opts.limit ?? 12));

  let products: Product[] = seedProducts;

  // Category filter.
  if (opts.category && opts.category !== 'unknown') {
    const cat = opts.category;
    products = products.filter((p) => p.category === cat);
  }

  // Concern filter.
  if (opts.concern) {
    const c = opts.concern;
    products = products.filter((p) => productMatchesConcern(p, c));
  }

  // Free-text query filter — broad substring match.
  const q = opts.query?.trim().toLowerCase() ?? '';
  if (q.length > 0) {
    products = products.filter((p) => {
      const haystack = [
        p.brand,
        p.name,
        p.description,
        ...(p.keyIngredients ?? []),
      ]
        .join(' ')
        .toLowerCase();
      // Match any whitespace-separated token; works for "best
      // niacinamide serum for redness" → matches "niacinamide" OR
      // "serum" OR "redness"-bearing products.
      const tokens = q.split(/\s+/).filter((t) => t.length >= 3);
      if (tokens.length === 0) return haystack.includes(q);
      return tokens.some((t) => haystack.includes(t));
    });
  }

  // Sort by matchScore desc — stable starting order.
  products = [...products].sort(
    (a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0)
  );

  // Map → ProductCandidate, cap at limit.
  return products.slice(0, limit).map(toCandidate);
}

// ---------------------------------------------------------------------------
// Filter step (Step C in the v19.17 refactor pipeline).
// ---------------------------------------------------------------------------

/**
 * Drop candidates that are obviously unusable for a CTA.
 * Specifically:
 *   • no productUrl   → CTA cannot link anywhere; drop.
 *   • blank brand+name → cannot render a card; drop.
 * Empty/null imageUrl is OK — the card has a brand-wordmark
 * placeholder for that case (existing v19.x behaviour).
 */
export function filterUsableCandidates(
  candidates: LiveProductCandidate[]
): LiveProductCandidate[] {
  return candidates.filter((c) => {
    if (!c.productUrl || c.productUrl.trim().length === 0) return false;
    if (!c.brand?.trim() || !c.name?.trim()) return false;
    return true;
  });
}

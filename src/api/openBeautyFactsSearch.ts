/**
 * Pura AI — Open Beauty Facts (OBF) live product search (v19.23).
 *
 * THE non-AI live retrieval path. Hits OBF's public search API
 * directly from the client, returns real products (real brand,
 * real name, real ingredients, real images), NO auth required,
 * NO AI proxy, NO server roundtrip. This is what makes the
 * recommendation engine "live" without being "AI-dependent".
 *
 * Endpoint:
 *   GET https://world.openbeautyfacts.org/cgi/search.pl
 *       ?search_terms={query}
 *       &page_size={n}
 *       &json=1
 *
 * The same OBF API is already in use server-side for barcode
 * lookups (`server/lib/barcodeLookup.ts`). This module is the
 * search-text counterpart, called from the client.
 *
 * Failure handling
 *   • 5-second AbortController timeout — search must feel
 *     responsive; we'd rather fall back than hang.
 *   • Network failure / 4xx / 5xx / parse failure → throw.
 *     The shared recommendation engine catches and falls back
 *     to the seed catalog.
 *   • CORS-friendly: OBF allows third-party clients explicitly.
 *
 * No new npm dep — uses fetch (RN's bundled Node fetch).
 */

import type {
  LiveProductCandidate,
  ProductCategory,
} from '@/ai/ai-contracts';
import {
  BRAND_DTC,
  sephoraSearchUrl,
} from '@/lib/commerceEnrichment';

// ---------------------------------------------------------------------------
// OBF search response shape (subset — we only read what we use).
// ---------------------------------------------------------------------------

interface OBFProduct {
  code?: string;
  _id?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  categories?: string;
  image_url?: string;
  image_small_url?: string;
  image_thumb_url?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
}

interface OBFSearchResponse {
  count?: number;
  page?: number;
  page_size?: number;
  products?: OBFProduct[];
}

// ---------------------------------------------------------------------------
// Constants.
// ---------------------------------------------------------------------------

const OBF_SEARCH_URL = 'https://world.openbeautyfacts.org/cgi/search.pl';
const OBF_PRODUCT_BASE = 'https://world.openbeautyfacts.org/product';
const OBF_TIMEOUT_MS = 5_000;
const DEFAULT_PAGE_SIZE = 12;
const USER_AGENT = 'PuraAI/19.23 (https://pura.app)';

// Skincare-only categories on OBF. The search endpoint returns
// food + beauty entries; we filter to plausible cosmetics by
// keyword on the categories field.
const COSMETIC_CATEGORY_PATTERNS: RegExp[] = [
  /cosmetic/i,
  /skincare/i,
  /skin care/i,
  /beauty/i,
  /serum/i,
  /cleanser/i,
  /moisturi[sz]er/i,
  /sunscreen/i,
  /toner/i,
  /face care/i,
];

const CATEGORY_MAP: Array<[RegExp, ProductCategory]> = [
  [/cleanser|wash|foam|micellar/i, 'cleanser'],
  [/serum|essence|ampoule|booster/i, 'serum'],
  [/moisturi[sz]er|cream|lotion|emulsion/i, 'moisturizer'],
  [/sun ?(screen|cream)|spf|sunblock/i, 'spf'],
  [/toner|tonique/i, 'toner'],
  [/mask|masque/i, 'mask'],
  [/spot|treatment|acid/i, 'spot_treatment'],
];

function inferCategory(categories: string): ProductCategory {
  if (!categories) return 'unknown';
  for (const [re, cat] of CATEGORY_MAP) {
    if (re.test(categories)) return cat;
  }
  return 'unknown';
}

function looksLikeCosmetic(p: OBFProduct): boolean {
  const cats = p.categories ?? '';
  if (cats.length === 0) return false;
  return COSMETIC_CATEGORY_PATTERNS.some((re) => re.test(cats));
}

// ---------------------------------------------------------------------------
// Brand normalization.
// ---------------------------------------------------------------------------

/**
 * OBF stores `brands` as a comma-separated string. Pick the first
 * trimmed entry as the canonical brand. Uppercase the first letter
 * of each word for display (OBF data is mixed case).
 */
function pickPrimaryBrand(brands: string | undefined): string {
  if (!brands) return '';
  const first = brands.split(',')[0]?.trim() ?? '';
  if (first.length === 0) return '';
  return first.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Merchant + URL derivation.
// ---------------------------------------------------------------------------

function deriveMerchant(brand: string, name: string): {
  productUrl: string;
  merchantName: string;
} {
  const brandKey = brand.trim().toLowerCase();
  const dtc = BRAND_DTC[brandKey];
  if (dtc) {
    return {
      productUrl: `https://www.${dtc.host}/`,
      merchantName: `${dtc.merchant} (DTC)`,
    };
  }
  // Sephora-search fallback — always works for major beauty brands.
  return {
    productUrl: sephoraSearchUrl(brand, name),
    merchantName: 'Sephora (search)',
  };
}

// ---------------------------------------------------------------------------
// OBF → LiveProductCandidate adapter.
// ---------------------------------------------------------------------------

function toCandidate(p: OBFProduct): LiveProductCandidate | null {
  const code = p.code ?? p._id ?? '';
  const name = (p.product_name_en || p.product_name || p.generic_name || '')
    .trim();
  const brand = pickPrimaryBrand(p.brands);
  if (code.length === 0) return null;
  if (name.length === 0 || brand.length === 0) return null;

  const category = inferCategory(p.categories ?? '');
  const merchant = deriveMerchant(brand, name);
  const imageUrl =
    p.image_url || p.image_small_url || p.image_thumb_url || null;
  void OBF_PRODUCT_BASE; // OBF product page kept around for future
                         // "view on OBF" affordance. Not used today —
                         // the BRAND_DTC / Sephora-search merchant
                         // URL is the actionable link.
  const ingredients = (p.ingredients_text_en || p.ingredients_text || '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 80)
    .slice(0, 5);

  return {
    id: `obf-${code}`,
    brand,
    name,
    category,
    concernTags: [],
    skinTypeTags: [],
    ingredientsHighlights: ingredients,
    price: null,
    currency: 'USD',
    merchantName: merchant.merchantName,
    productUrl: merchant.productUrl,
    imageUrl,
    imageSource: imageUrl ? 'obf' : 'none',
    shortDescription: '',
    matchReason: '',
    availability: 'available',
    sourceTimestamp: new Date().toISOString(),
    matchScore: 75, // baseline — local scorer reorders
  };
}

// ---------------------------------------------------------------------------
// Public search API.
// ---------------------------------------------------------------------------

export interface OpenBeautyFactsSearchOpts {
  /** Free-text query. Required. */
  query: string;
  /** Default 12. Max 24 (OBF page_size cap honored). */
  pageSize?: number;
  /** Override the bounded timeout (ms). Default 5_000. */
  timeoutMs?: number;
}

/**
 * Search OBF for products matching `query`. Returns mapped
 * `LiveProductCandidate[]` filtered to plausible cosmetics.
 * Throws on network failure / non-2xx / parse failure / timeout.
 *
 * The shared recommendation engine catches throws and falls back
 * to the seed catalog.
 */
export async function searchOpenBeautyFacts(
  opts: OpenBeautyFactsSearchOpts
): Promise<LiveProductCandidate[]> {
  const query = opts.query.trim();
  if (query.length === 0) return [];
  const pageSize = Math.max(1, Math.min(24, opts.pageSize ?? DEFAULT_PAGE_SIZE));
  const timeoutMs = opts.timeoutMs ?? OBF_TIMEOUT_MS;

  const url =
    `${OBF_SEARCH_URL}` +
    `?search_terms=${encodeURIComponent(query)}` +
    `&page_size=${pageSize}` +
    `&json=1`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`OBF search HTTP ${res.status}`);
  }
  const body = (await res.json()) as OBFSearchResponse;
  const raw = Array.isArray(body.products) ? body.products : [];

  const candidates: LiveProductCandidate[] = [];
  for (const p of raw) {
    if (!looksLikeCosmetic(p)) continue;
    const c = toCandidate(p);
    if (c) candidates.push(c);
  }
  return candidates;
}

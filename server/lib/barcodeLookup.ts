/**
 * Server-side barcode → product lookup.
 *
 * v10.30 — wired to **Open Beauty Facts** (OBF) as the real lookup
 * source. OBF is an open, public-domain product database; their REST
 * API resolves a barcode (UPC/EAN) to brand, product name, category,
 * and ingredients with no auth required:
 *
 *   GET https://world.openbeautyfacts.org/api/v2/product/<barcode>.json
 *
 * The endpoint is meant for hot-linking — the OBF docs explicitly
 * encourage third-party apps to use it. For real product photography
 * OBF also exposes a stable image URL pattern under
 * `images.openbeautyfacts.org/images/products/...` (used elsewhere
 * in the app, not here).
 *
 * Failure handling
 *   • 4-second AbortController timeout — barcode scans must feel
 *     instant; we'd rather fall through than hang the user.
 *   • Network failure / 404 / parse failure → fall back to the small
 *     local dev catalog so smoke tests still pass without a network.
 *   • Returns `null` only when neither OBF nor the local catalog has
 *     the barcode; the AI's normalization step will then mark the
 *     resolution as `fallback_needed: true`.
 *
 * No new npm dep — uses Node's built-in `fetch` (Node 18+).
 */

import type { BarcodeLookupResult } from '../../src/ai/ai-contracts';

interface LocalCatalogEntry {
  brand: string;
  product_name: string;
  category: BarcodeLookupResult['product_category'];
  key_claims: string[];
  packaging_notes: string;
}

/**
 * Tiny dev catalog used when OBF doesn't have the barcode (or when
 * the lookup is for a product slug, like the verifyAi smoke test
 * which sends `gentle-foam-cleanser` rather than a real UPC).
 */
const localCatalog: Record<string, LocalCatalogEntry> = {
  'gentle-foam-cleanser': {
    brand: 'Acme',
    product_name: 'Gentle Foam Cleanser',
    category: 'cleanser',
    key_claims: ['glycerin', 'panthenol', 'fragrance-free'],
    packaging_notes:
      'White soft-touch tube, 150ml, sky-blue cap. EN/FR labelling.',
  },
  'salicylic-spot-treatment': {
    brand: 'Acme',
    product_name: 'Spot Treatment 2%',
    category: 'spot_treatment',
    key_claims: ['salicylic acid 2%'],
    packaging_notes:
      'Tinted glass bottle with dropper, 30ml, amber colour. EN labelling only.',
  },
  'hydra-niacinamide-serum': {
    brand: 'Acme',
    product_name: 'Hydra Niacinamide Serum',
    category: 'serum',
    key_claims: ['niacinamide 5%', 'hyaluronic acid'],
    packaging_notes:
      'Frosted glass bottle with pipette, 30ml, white outer carton.',
  },
};

const OBF_TIMEOUT_MS = 4_000;
const OBF_CATEGORY_MAP: Array<[
  RegExp,
  BarcodeLookupResult['product_category']
]> = [
  [/cleanser|wash|foam|micellar|gel-douche|gel douche/i, 'cleanser'],
  [/serum|essence|ampoule|booster/i, 'serum'],
  [/moisturi[sz]er|cream|lotion|emulsion/i, 'moisturizer'],
  [/sun ?(screen|cream)|spf|sunblock/i, 'spf'],
  [/toner|tonique|astringent/i, 'toner'],
  [/spot ?treatment|acne|blemish/i, 'spot_treatment'],
  [/mask|masque|sheet ?mask/i, 'mask'],
];

function inferCategoryFromObf(
  productName: string | undefined,
  categoriesTags: string[] | undefined
): BarcodeLookupResult['product_category'] {
  const haystack = [
    productName ?? '',
    ...(categoriesTags ?? []),
  ]
    .join(' ')
    .toLowerCase();
  for (const [re, cat] of OBF_CATEGORY_MAP) {
    if (re.test(haystack)) return cat;
  }
  return 'unknown';
}

interface OpenBeautyFactsResponse {
  status?: number;
  product?: {
    brands?: string;
    product_name?: string;
    generic_name?: string;
    categories_tags?: string[];
    ingredients_tags?: string[];
    ingredients_text?: string;
    code?: string;
    quantity?: string;
    packaging?: string;
    labels?: string;
  };
}

async function tryOpenBeautyFacts(
  barcodeValue: string
): Promise<BarcodeLookupResult | null> {
  // OBF expects digits only. If the lookup is a slug (smoke test) skip.
  if (!/^\d{6,14}$/.test(barcodeValue)) return null;
  const url = `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(barcodeValue)}.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OBF_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        // OBF asks for a User-Agent identifying the calling app so
        // they can spot abuse. This is good hygiene + helps if we
        // ever need to ask them for higher rate limits.
        'User-Agent': 'pura-ai/0.1 (https://github.com/pura-ai)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    return null;
  }
  clearTimeout(timer);
  if (!res.ok) return null;
  let body: OpenBeautyFactsResponse;
  try {
    body = (await res.json()) as OpenBeautyFactsResponse;
  } catch {
    return null;
  }
  // OBF returns status:0 when the barcode isn't found.
  if (body.status !== 1 || !body.product) return null;
  const p = body.product;

  const brand =
    p.brands && p.brands.length > 0
      ? p.brands.split(',')[0].trim()
      : null;
  const productName =
    p.product_name && p.product_name.length > 0
      ? p.product_name
      : p.generic_name && p.generic_name.length > 0
      ? p.generic_name
      : null;
  const category = inferCategoryFromObf(
    productName ?? undefined,
    p.categories_tags
  );

  // Extract a short list of "key claims" from the labels field
  // (e.g. "Vegan, Cruelty-free") and the first few ingredient tags.
  const labelClaims =
    typeof p.labels === 'string'
      ? p.labels
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .slice(0, 5)
      : [];
  const ingredientClaims = (p.ingredients_tags ?? [])
    .slice(0, 5)
    .map((t) => t.replace(/^en:/, '').replace(/-/g, ' '));
  const keyClaims =
    labelClaims.length > 0 ? labelClaims : ingredientClaims;

  const packagingNotes = [
    p.quantity ? p.quantity : null,
    p.packaging ? p.packaging : null,
  ]
    .filter((s): s is string => !!s && s.length > 0)
    .join(' · ');

  return {
    matched_catalog_product_id: p.code ?? barcodeValue,
    brand,
    product_name: productName,
    canonical_title:
      brand && productName ? `${brand} ${productName}` : productName,
    product_category: category,
    likely_concerns_supported: [],
    key_claims: keyClaims,
    barcode_value: barcodeValue,
    catalog_lookup_key: p.code ?? null,
    packaging_notes: packagingNotes.length > 0 ? packagingNotes : '',
  };
}

function localFallback(barcodeValue: string): BarcodeLookupResult | null {
  const entry = localCatalog[barcodeValue];
  if (!entry) return null;
  return {
    matched_catalog_product_id: barcodeValue,
    brand: entry.brand,
    product_name: entry.product_name,
    canonical_title: `${entry.brand} ${entry.product_name}`,
    product_category: entry.category,
    likely_concerns_supported: [],
    key_claims: entry.key_claims,
    barcode_value: barcodeValue,
    catalog_lookup_key: barcodeValue,
    packaging_notes: entry.packaging_notes,
  };
}

export async function lookupBarcodeServerSide(
  barcodeValue: string
): Promise<BarcodeLookupResult | null> {
  // Try the real OBF lookup first.
  const obf = await tryOpenBeautyFacts(barcodeValue);
  if (obf !== null) return obf;
  // Then the local dev catalog (used by smoke tests + offline).
  return localFallback(barcodeValue);
}

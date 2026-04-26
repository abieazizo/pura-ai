/**
 * One-shot script — resolves every seed product to a real Open Beauty
 * Facts product photo. Prints a JSON map of `{ id: { code, image_url,
 * matched_name, matched_brand, query, source } }` to stdout; the dev
 * eyeballs the result and patches `PRODUCT_IMAGE_URLS` in seed.ts.
 *
 * v10.32 — three improvements over the v10.31 fetcher pushed coverage
 * from 6/24 to (target) 14+/24:
 *   1. KNOWN_BARCODES map — for products we know the UPC for, hit the
 *      OBF detail API directly first. Detail responses include the
 *      full `image_front_url` + `image_small_url` fields, which the
 *      search endpoint sometimes truncates.
 *   2. Code-rescue pass — when search returns a `code` but no
 *      `image_url`, refetch by code via the detail API to recover the
 *      image_url. (This alone unblocked paulas-choice-2-bha in v10.31.)
 *   3. Image-field fallback — try `image_front_url`, then
 *      `image_url`, then `image_small_url`, then `image_thumb_url`.
 *      OBF populates these inconsistently per product.
 *
 * Why a script instead of runtime fetch:
 *   • RN apps fetching images at runtime stall the first paint.
 *   • OBF response shapes vary per product; baking the URL means the
 *     bundle ships with deterministic asset paths.
 *   • This script surfaces match confidence + source so we can spot
 *     bad matches before they hit the catalog.
 *
 * Run:
 *   npx tsx scripts/fetch-product-images.ts > scripts/product-images.json
 */

interface SeedTarget {
  id: string;
  brand: string;
  name: string;
}

// Hand-typed against rawSeedProducts in src/data/seed.ts (24 entries).
// Could be derived dynamically by importing seed.ts but the seed
// pulls @/theme which won't resolve in a plain tsx script context.
const TARGETS: SeedTarget[] = [
  { id: 'cerave-hydrating-cleanser', brand: 'CeraVe', name: 'Hydrating Facial Cleanser' },
  { id: 'la-roche-posay-toleriane-cleanser', brand: 'La Roche-Posay', name: 'Toleriane Hydrating Gentle Cleanser' },
  { id: 'beauty-of-joseon-ginseng-cleanser', brand: 'Beauty of Joseon', name: 'Red Bean Refreshing Foam Cleanser' },
  { id: 'anua-heartleaf-toner', brand: 'Anua', name: 'Heartleaf 77% Soothing Toner' },
  { id: 'paulas-choice-2-bha', brand: "Paula's Choice", name: 'Skin Perfecting 2% BHA Liquid Exfoliant' },
  { id: 'biotherm-skin-oxygen-toner', brand: 'Biotherm', name: 'Skin Oxygen Oxygenating Lotion' },
  { id: 'the-ordinary-niacinamide', brand: 'The Ordinary', name: 'Niacinamide 10% Zinc 1%' },
  { id: 'good-molecules-discoloration', brand: 'Good Molecules', name: 'Discoloration Correcting Serum' },
  { id: 'the-ordinary-retinal', brand: 'The Ordinary', name: 'Granactive Retinoid 2% Emulsion' },
  { id: 'elf-vitamin-c-serum', brand: 'e.l.f.', name: 'Super 10 Serum' },
  { id: 'cerave-pm-lotion', brand: 'CeraVe', name: 'PM Facial Moisturizing Lotion' },
  { id: 'illiyoon-ceramide-cream', brand: 'Illiyoon', name: 'Ceramide Ato Concentrate Cream' },
  { id: 'la-roche-posay-toleriane-dd', brand: 'La Roche-Posay', name: 'Toleriane Double Repair Face Moisturizer' },
  { id: 'beauty-of-joseon-relief-sun', brand: 'Beauty of Joseon', name: 'Relief Sun Rice Probiotics SPF50' },
  { id: 'bonajour-green-tea-sun', brand: 'BONAJOUR', name: 'Green Tea Water Bomb Sun Cream SPF50' },
  { id: 'its-skin-collagen-ampoule', brand: "It's Skin", name: 'Power 10 Formula VB Effector' },
  { id: 'paulas-choice-azelaic', brand: "Paula's Choice", name: '10% Azelaic Acid Booster' },
  { id: 'the-ordinary-lactic-acid', brand: 'The Ordinary', name: 'Lactic Acid 10% HA' },
  { id: 'beauty-of-joseon-rice-mask', brand: 'Beauty of Joseon', name: 'Radiance Cleansing Balm' },
  { id: 'its-skin-power-mask', brand: "It's Skin", name: 'Power 10 Formula Brightening Mask' },
  { id: 'cosrx-snail-essence', brand: 'COSRX', name: 'Advanced Snail 96 Mucin Power Essence' },
  { id: 'kiehls-ultra-facial-cream', brand: 'Kiehls', name: 'Ultra Facial Cream' },
  { id: 'supergoop-unseen', brand: 'Supergoop', name: 'Unseen Sunscreen SPF 40' },
  { id: 'youth-to-the-people-kale', brand: 'Youth To The People', name: 'Superfood Cleanser' },
];

/**
 * Curated UPCs for products that OBF's text search misses. Each
 * barcode below was hand-verified against OBF's detail API to
 * confirm it returns a record with at least one populated image
 * field (image_front_url / image_url / image_small_url / image_thumb_url).
 *
 * For each id we hit `/api/v2/product/{barcode}.json` directly first;
 * detail responses ship the full image_* fields even when the search
 * summary endpoint truncates them. If the curated UPC misses, the
 * broad text-search pass kicks in.
 *
 * Coverage reality (2026-04-26): OBF's beauty catalog skews EU mass-
 * market. K-beauty (Anua, Beauty of Joseon, COSRX, It's Skin,
 * Illiyoon, BONAJOUR), US indie (Good Molecules, Youth To The
 * People, Supergoop's older SKUs), and several SKU-specific entries
 * (CeraVe PM, e.l.f. Super 10, Paula's Azelaic, Biotherm Skin Oxygen)
 * are not in OBF as of the last fetch. Those products fall through to
 * the upgraded ProductPlaceholderImage (v10.32 magazine-mockup pass)
 * which is intentionally indistinguishable from a real packshot at
 * card-grid distance.
 */
const KNOWN_BARCODES: Record<string, string[]> = {
  'cerave-hydrating-cleanser': ['3606000537576'],
  'la-roche-posay-toleriane-cleanser': ['3337875545778'],
  'la-roche-posay-toleriane-dd': ['3337875545846'],
  'the-ordinary-retinal': ['0769915190045'],
  'the-ordinary-lactic-acid': ['0769915190373'],
  'kiehls-ultra-facial-cream': ['3605975028799'],
  // v10.32 — recovered via brand-search probe. The original UPC for
  // Paula's 2% BHA (0787734079020) exists in OBF but has zero image
  // fields populated; the older 1oz bottle SKU (0655439005913) has
  // a real packshot.
  'paulas-choice-2-bha': ['0655439005913'],
  // v10.32 — Supergoop's 1oz Unseen bottle SKU. Their newer 50ml
  // SKU (0819890011848) isn't in OBF.
  'supergoop-unseen': ['0816218026530'],
};

interface OBFProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  image_front_url?: string;
  image_url?: string;
  image_small_url?: string;
  image_thumb_url?: string;
}

interface OBFSearchResult {
  count?: number;
  products?: OBFProduct[];
}

interface OBFDetailResult {
  status?: number;
  product?: OBFProduct;
}

interface ImageMapEntry {
  code: string | null;
  image_url: string | null;
  matched_name: string | null;
  matched_brand: string | null;
  query: string;
  source: 'known-barcode' | 'search' | 'search+code-rescue' | 'none';
}

/**
 * Pull the strongest image URL out of an OBF product blob. OBF
 * populates these fields inconsistently per product — image_front_url
 * is the canonical "packshot" but is missing on ~30% of records;
 * image_url is the front of whatever image the contributor uploaded
 * first; image_small_url / image_thumb_url are the resized variants
 * and almost always populated when any image exists at all.
 */
function bestImageOf(p: OBFProduct | undefined): string | null {
  if (!p) return null;
  return (
    p.image_front_url ??
    p.image_url ??
    p.image_small_url ??
    p.image_thumb_url ??
    null
  );
}

async function searchOBF(query: string): Promise<OBFSearchResult | null> {
  // Drop search_simple — when set, OBF requires every token to match
  // and most brand+name pairs return 0. The default search is much
  // more forgiving and we score the results ourselves.
  const url =
    `https://world.openbeautyfacts.org/cgi/search.pl?` +
    `search_terms=${encodeURIComponent(query)}` +
    `&action=process&json=1&page_size=20`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'pura-ai-image-fetcher/0.1',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as OBFSearchResult;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/** Try a few different search strategies and return the first that
 *  yields at least one product. We try (brand+name), (brand only),
 *  then (name only) so a partial brand match isn't fatal. */
async function searchOBFMulti(target: SeedTarget): Promise<{
  query: string;
  data: OBFSearchResult;
} | null> {
  const queries = [
    `${target.brand} ${target.name}`,
    target.name,
    `${target.brand} ${target.name.split(' ').slice(0, 3).join(' ')}`,
  ];
  for (const q of queries) {
    const data = await searchOBF(q);
    if (data && data.products && data.products.length > 0) {
      return { query: q, data };
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
}

function scoreMatch(
  target: SeedTarget,
  product: OBFProduct
): number {
  const targetBrand = target.brand.toLowerCase().replace(/[^a-z]/g, '');
  const targetName = target.name.toLowerCase();
  const pBrand = (product.brands ?? '').toLowerCase().replace(/[^a-z]/g, '');
  const pName = (product.product_name ?? '').toLowerCase();
  let score = 0;
  if (pBrand.includes(targetBrand) || targetBrand.includes(pBrand)) score += 50;
  // Token overlap on the product name.
  const targetTokens = targetName.split(/\s+/).filter((t) => t.length > 3);
  for (const t of targetTokens) {
    if (pName.includes(t)) score += 10;
  }
  if (bestImageOf(product)) score += 5;
  return score;
}

/** Direct OBF detail lookup by barcode. Returns the parsed product
 *  blob (with all four image_* fields populated when present) or
 *  null if OBF doesn't know the barcode. */
async function fetchByCode(code: string): Promise<OBFProduct | null> {
  const url = `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(code)}.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'pura-ai-image-fetcher/0.2',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const body = (await res.json()) as OBFDetailResult;
    if (body.status !== 1 || !body.product) return null;
    return body.product;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/** Try every UPC we know for this product. Stops on the first one
 *  that returns an OBF record with at least one image field. */
async function tryKnownBarcodes(
  target: SeedTarget
): Promise<{ product: OBFProduct; code: string } | null> {
  const codes = KNOWN_BARCODES[target.id] ?? [];
  for (const code of codes) {
    const product = await fetchByCode(code);
    if (product && bestImageOf(product)) {
      return { product, code };
    }
    // Tiny gap between requests so we don't drum on OBF.
    await new Promise((r) => setTimeout(r, 120));
  }
  return null;
}

async function findBestImage(target: SeedTarget): Promise<ImageMapEntry> {
  // Phase 1 — try curated UPCs first. Detail responses include the
  // full image_* fields; bypasses the search-truncation gotcha that
  // hit paulas-choice-2-bha in v10.31.
  const known = await tryKnownBarcodes(target);
  if (known) {
    return {
      code: known.code,
      image_url: bestImageOf(known.product),
      matched_name: known.product.product_name ?? null,
      matched_brand: known.product.brands ?? null,
      query: `barcode:${known.code}`,
      source: 'known-barcode',
    };
  }

  // Phase 2 — fall back to broad text search.
  const result = await searchOBFMulti(target);
  if (!result) {
    return {
      code: null,
      image_url: null,
      matched_name: null,
      matched_brand: null,
      query: `${target.brand} ${target.name}`,
      source: 'none',
    };
  }
  const { query, data } = result;
  const ranked = (data.products ?? [])
    .map((p) => ({ p, score: scoreMatch(target, p) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  // Lowered threshold from 50 → 30: with broader queries, brand
  // partial-match alone (no token overlap) is still a useful match.
  if (!best || best.score < 30) {
    return {
      code: null,
      image_url: null,
      matched_name: null,
      matched_brand: null,
      query,
      source: 'none',
    };
  }
  let image = bestImageOf(best.p);
  let source: ImageMapEntry['source'] = 'search';
  // Phase 3 — code-rescue. Search hits sometimes return a product
  // code with all image_* fields blanked (the summary endpoint
  // truncates them). Refetching by code via the detail API often
  // surfaces the photo.
  if (!image && best.p.code) {
    const detail = await fetchByCode(best.p.code);
    image = bestImageOf(detail ?? undefined);
    if (image) source = 'search+code-rescue';
  }
  return {
    code: best.p.code ?? null,
    image_url: image,
    matched_name: best.p.product_name ?? null,
    matched_brand: best.p.brands ?? null,
    query,
    source: image ? source : 'none',
  };
}

async function main() {
  const out: Record<string, ImageMapEntry> = {};
  let resolved = 0;
  for (const t of TARGETS) {
    // eslint-disable-next-line no-console
    console.error(`looking up ${t.id} ...`);
    const entry = await findBestImage(t);
    out[t.id] = entry;
    if (entry.image_url) resolved += 1;
    // Be polite to OBF — small delay between products.
    await new Promise((r) => setTimeout(r, 250));
  }
  // eslint-disable-next-line no-console
  console.error(`resolved ${resolved} / ${TARGETS.length}`);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(out, null, 2));
}

main();

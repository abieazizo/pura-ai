/**
 * One-shot script — searches Open Beauty Facts for each seed product
 * and prints a JSON map of `{ id: { code, image_url, brand_match,
 * name_match } }` for the best match. The dev pipes the output into
 * scripts/apply-product-images.ts (or eyeballs and patches seed.ts
 * by hand) to bake real product photography into the catalog.
 *
 * Why a script instead of runtime fetch:
 *   • RN apps fetching images at runtime stalls the first paint.
 *   • OBF response shapes vary per product; baking the URL means the
 *     bundle ships with deterministic asset paths.
 *   • This script also surfaces match confidence so we can spot
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

interface OBFSearchResult {
  count?: number;
  products?: Array<{
    code?: string;
    product_name?: string;
    brands?: string;
    image_front_url?: string;
    image_url?: string;
  }>;
}

interface ImageMapEntry {
  code: string | null;
  image_url: string | null;
  matched_name: string | null;
  matched_brand: string | null;
  query: string;
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
  product: { product_name?: string; brands?: string }
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
  if (product.image_front_url || product.image_url) score += 5;
  return score;
}

async function findBestImage(target: SeedTarget): Promise<ImageMapEntry> {
  const result = await searchOBFMulti(target);
  if (!result) {
    return {
      code: null,
      image_url: null,
      matched_name: null,
      matched_brand: null,
      query: `${target.brand} ${target.name}`,
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
    };
  }
  const image = best.p.image_front_url ?? best.p.image_url ?? null;
  return {
    code: best.p.code ?? null,
    image_url: image,
    matched_name: best.p.product_name ?? null,
    matched_brand: best.p.brands ?? null,
    query,
  };
}

async function main() {
  const out: Record<string, ImageMapEntry> = {};
  for (const t of TARGETS) {
    // eslint-disable-next-line no-console
    console.error(`looking up ${t.id} ...`);
    const entry = await findBestImage(t);
    out[t.id] = entry;
    // Be polite to OBF — small delay between searches.
    await new Promise((r) => setTimeout(r, 250));
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(out, null, 2));
}

main();

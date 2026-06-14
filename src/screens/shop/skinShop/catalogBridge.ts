/**
 * catalogBridge — resolve any product id into a unified `ShopProduct`.
 *
 * The Shop must reorder whatever the user KEPT in their routine, but routine ids
 * can come from either catalog (the two overlap but aren't identical):
 *   • COMMERCE_CATALOG (src/commerce/catalog.ts) — has affiliate URLs, metric
 *     concern tags, price tier, packshots. The preferred source.
 *   • SHOP_CATALOG (src/screens/shop/shopCatalog.ts) — packshots + ConcernKey
 *     tags but no affiliate URL; we synthesize a tagged Amazon search handoff.
 * An id resolvable to neither is treated as unknown → dropped (never surface a
 * broken product).
 *
 * NOTE: SHOP_CATALOG is `require()`d LAZILY inside the resolver. Its module body
 * does top-level image `require()`s that throw under Node (the tsx verifier), so
 * importing it eagerly would crash the verifier. The lazy+guarded require lets
 * the engine run identically under Metro (images resolve) and Node (falls back).
 */

import type { ImageSourcePropType } from 'react-native';
import { COMMERCE_CATALOG } from '@/commerce/catalog';
import type { CommerceSku, ConcernTag, PriceTier, RoutineStepKind } from '@/commerce/types';
import type {
  ShopCatalogProduct,
  ConcernKey,
  ShopCategory,
} from '@/screens/shop/shopCatalog';
import { typicalLifespanDays, lifespanForStep } from './lifespan';
import type { ShopProduct } from './types';

/** A tagged Amazon search — the same handoff shape the commerce catalog uses. */
export function amazonSearch(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=puraai-20`;
}

const commerceById = new Map(COMMERCE_CATALOG.map((s) => [s.id, s]));

export function skuToShopProduct(sku: CommerceSku): ShopProduct {
  return {
    id: sku.id,
    brand: sku.brand,
    name: sku.name,
    image: (sku.image ?? null) as ImageSourcePropType | null,
    affiliateUrl: sku.affiliateUrl,
    step: sku.step,
    concerns: [...sku.concerns],
    priceUsd: sku.priceUsd,
    priceTier: sku.priceTier,
    blurb: sku.blurb,
    typicalLifespanDays: typicalLifespanDays(sku),
    source: 'commerce',
  };
}

// SHOP_CATALOG mappings onto the commerce vocabularies.
const CATEGORY_STEP: Record<ShopCategory, RoutineStepKind> = {
  cleanser: 'cleanse',
  toner: 'treat',
  serum: 'treat',
  treatment: 'treat',
  moisturizer: 'moisturize',
  spf: 'protect',
  mask: 'treat',
};

const CONCERNKEY_TAGS: Record<ConcernKey, ConcernTag[]> = {
  breakouts: ['breakouts'],
  hydration: ['dryness'],
  marks: ['dark_marks'],
  barrier: ['sensitive', 'redness'],
  bright: ['dark_marks'],
};

function priceTierFromPrice(p: number): PriceTier {
  if (p < 22) return 'budget';
  if (p < 45) return 'mid';
  return 'premium';
}

function shopToShopProduct(p: ShopCatalogProduct): ShopProduct {
  const step = CATEGORY_STEP[p.category];
  const concerns = Array.from(
    new Set(p.concernTags.flatMap((k) => CONCERNKEY_TAGS[k] ?? [])),
  );
  return {
    id: p.id,
    brand: p.brand,
    name: p.name,
    image: p.catalogPackshot,
    // No affiliate URL on shop products → an honest tagged search handoff.
    affiliateUrl: amazonSearch(`${p.brand} ${p.name}`),
    step,
    concerns,
    priceUsd: p.price,
    priceTier: priceTierFromPrice(p.price),
    blurb: p.benefitLine ?? null,
    typicalLifespanDays: lifespanForStep(step),
    source: 'shop',
  };
}

let shopCatalogCache: ShopCatalogProduct[] | null = null;
function shopCatalog(): ShopCatalogProduct[] {
  if (shopCatalogCache) return shopCatalogCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@/screens/shop/shopCatalog') as {
      SHOP_CATALOG: ShopCatalogProduct[];
    };
    shopCatalogCache = mod.SHOP_CATALOG ?? [];
  } catch {
    // Node/tsx: top-level image require() threw — the shop fallback is simply
    // unavailable in that environment (commerce ids still resolve).
    shopCatalogCache = [];
  }
  return shopCatalogCache;
}

/**
 * Resolve an id (from the kept routine) into a unified product. Commerce first
 * (affiliate + lifespan + metric tags), then the shop catalog, else null.
 */
export function resolveProduct(id: string): ShopProduct | null {
  const sku = commerceById.get(id);
  if (sku) return skuToShopProduct(sku);
  const shop = shopCatalog().find((p) => p.id === id);
  if (shop) return shopToShopProduct(shop);
  return null;
}

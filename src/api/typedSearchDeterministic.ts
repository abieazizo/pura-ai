/**
 * v22.2 — Deterministic typed-search planner + result builder.
 *
 * Lives entirely client-side, never throws, requires no network.
 * Used as the PRIMARY fallback when the AI planner errors (proxy
 * down, race timeout, invalid plan). Produces a curated catalog
 * result so the user sees a strong same-intent list even when AI
 * is unavailable — no more "2 weak fallback items" UX.
 *
 * Also exposes a live-result quality filter that rejects obvious
 * promo / shelf-photo / non-product junk before any AI sees it.
 */

import type { ConcernType, LiveProductCandidate } from '@/ai/ai-contracts';
import type { UserProfileContext, SkinState } from '@/types/canonical';
import {
  BASE_CATEGORIES,
  resolveCategoryFromQuery,
  type BaseCategory,
} from '@/data/baseCategories';
import { interpretSearchIntent } from './queryIntent';
import {
  CURATED_PRODUCTS,
  CURATED_BY_ID,
  curatedForCategory,
  curatedToLiveCandidate,
  type CuratedProduct,
} from '@/data/curatedProducts';

/**
 * Score a curated product against the resolved category + the
 * user's profile/scan. Higher = better.
 */
function scoreCurated(
  p: CuratedProduct,
  category: BaseCategory,
  profile: UserProfileContext,
  skinState: SkinState | null,
  // v22.12 — optional explicit ingredient signals from the parsed
  // query intent. When the user typed an ingredient (e.g.
  // "niacinamide serum"), products tagged with that ingredient get
  // a large boost so the hero is actually the niacinamide product,
  // not the generic top-trusted product in the resolved category.
  desiredIngredients?: readonly string[]
): number {
  let score = p.trustedScore;

  // Category match: huge boost.
  if (p.categoryTags.some((t) => t === category.id)) score += 30;

  // Concern overlap with category's concernTags.
  for (const concern of category.concernTags) {
    if (p.concernTags.includes(concern)) score += 8;
  }

  // Ingredient match against category ingredient boosts.
  const ingLower = p.ingredientTags.map((i) => i.toLowerCase());
  for (const boost of category.ingredientBoosts) {
    if (ingLower.some((i) => i.includes(boost.toLowerCase()))) score += 4;
  }

  // v22.12 — explicit-ingredient boost. Higher weight than category
  // ingredient boosts because this came from the USER QUERY, not
  // from the category's generic ingredient list.
  if (desiredIngredients && desiredIngredients.length > 0) {
    for (const want of desiredIngredients) {
      const wantNorm = want.toLowerCase();
      if (ingLower.some((i) => i.includes(wantNorm))) {
        score += 24; // dominant signal — pushes ingredient products to top
      }
    }
  }

  // Skin profile alignment.
  if (profile.skinType && p.skinTypeTags.includes(profile.skinType)) {
    score += 12;
  }

  // Top-concern alignment from the scan.
  const topConcerns = (skinState?.topConcerns ?? []).map((c) =>
    String(c.concern)
  );
  for (const c of topConcerns) {
    if (p.concernTags.includes(c)) score += 10;
  }

  // Sensitivity-aware demotion.
  const sensitivities = profile.sensitivities ?? [];
  const isSensitive =
    profile.skinType === 'sensitive' ||
    sensitivities.some((s) => /sensitiv|reactive|rosacea/i.test(s));
  if (isSensitive && p.strength === 'strong') score -= 25;

  // avoidForTags is a hard demotion when applicable.
  for (const av of p.avoidForTags ?? []) {
    if (
      profile.skinType === av ||
      sensitivities.some((s) => s.toLowerCase().includes(av))
    ) {
      score -= 35;
    }
  }

  return score;
}

export interface DeterministicSearchOutcome {
  category: BaseCategory;
  dominantProductFamily: string;
  candidates: LiveProductCandidate[];
  userNeedSummary: string;
  searchIntentLabel: string;
  ranked: CuratedProduct[];
}

/**
 * v22.2 — DETERMINISTIC TYPED-SEARCH PLANNER.
 *
 * Never throws. Never requires network. Resolves a category from
 * the raw query (alias match → substring → ingredient hint), then
 * returns the top curated products for that category scored against
 * the user profile + scan.
 */
export function planTypedSearchDeterministic(
  rawQuery: string,
  profile: UserProfileContext,
  skinState: SkinState | null
): DeterministicSearchOutcome {
  // v22.12 — INTENT-FIRST RESOLUTION. The previous version only ran
  // `resolveCategoryFromQuery(rawQuery)`, which used substring matching
  // on raw text. That mis-routed queries like:
  //   "niacinamide serum"  → Hydration (because 'niacinamide' is a
  //                           hydration ingredient boost)
  //   "hydrating cleanser" → Hydration (because 'hydrating' beat
  //                           'cleanser' on substring score)
  // We now parse the query into structured intent and prefer the
  // explicit product-type signal over substring matches. The raw
  // alias resolver is still the fallback when no productType is
  // extracted.
  const intent = interpretSearchIntent(rawQuery, profile, skinState);
  // v22.12 — full intent-aware resolution. We try, in order:
  //   1. Modifier override (e.g. 'barrier' modifier → barrier repair
  //      category) for vague queries that lack a productType.
  //   2. Combined productType + concern map (categoryFromIntent).
  //   3. Raw substring alias resolver (last resort for queries that
  //      neither extract a productType nor a recognized modifier).
  const modifierCategory = categoryFromModifiers(
    intent.modifiers,
    intent.interpretedProductType
  );
  const intentCategory = categoryFromIntent(
    intent.interpretedProductType,
    intent.interpretedConcern
  );
  const resolved =
    modifierCategory ?? intentCategory ?? resolveCategoryFromQuery(rawQuery);
  // v22.6 — when the query is vague AND the user has a scan, route
  // to the category that matches the user's TOP scan concern. Previous
  // behavior defaulted to 'hydration' regardless of the user's actual
  // need, so a user with breakouts typing "best for me" got hydration
  // products. Personalization now drives the vague-query fallback.
  const category =
    resolved ??
    categoryFromTopConcern(skinState) ??
    categoryFromProfileSkinType(profile) ??
    BASE_CATEGORIES.find((c) => c.id === 'hydration')!;

  // v22.12 — pass parsed desiredIngredients into the scorer so
  // ingredient-named queries surface the right product as hero.
  const desiredIngredients = intent.desiredIngredients ?? [];
  const scored = CURATED_PRODUCTS.map((p) => ({
    p,
    score: scoreCurated(p, category, profile, skinState, desiredIngredients),
  })).sort((a, b) => b.score - a.score);

  // Hard-filter to candidates matching this category. If too few,
  // also accept curated products tagged with overlapping concerns.
  const inCategory = scored.filter((s) =>
    s.p.categoryTags.some((t) => t === category.id)
  );
  const overlap = scored.filter((s) =>
    s.p.concernTags.some((c) => category.concernTags.includes(c))
  );
  // Dedupe; prefer in-category.
  const seen = new Set<string>();
  const merged: typeof scored = [];
  for (const s of inCategory) {
    if (seen.has(s.p.id)) continue;
    seen.add(s.p.id);
    merged.push(s);
  }
  for (const s of overlap) {
    if (seen.has(s.p.id)) continue;
    if (merged.length >= 18) break;
    seen.add(s.p.id);
    merged.push(s);
  }

  const ranked = merged.map((s) => s.p);
  const candidates = ranked.map(curatedToLiveCandidate);

  const userNeedSummary = buildUserNeedSummary(category, profile, skinState);
  return {
    category,
    dominantProductFamily: mapCategoryToFamily(category.id),
    candidates,
    userNeedSummary,
    searchIntentLabel: `${category.label} — curated for ${
      profile.skinType ?? 'your skin'
    }`,
    ranked,
  };
}

/**
 * v22.12 — intent-aware category resolver. Combines the parsed
 * productType + concern signals to pick a category that matches
 * the user's full intent.
 *
 *   productType=serum + concern=dark_marks  → dark spots
 *   productType=serum + concern=redness     → redness
 *   productType=serum + concern=hydration   → hydration
 *   productType=cleanser                    → gentle cleansers
 *   productType=moisturizer                 → moisturizer
 *   productType=exfoliant                   → exfoliation
 *   productType=spf                         → sunscreen
 *
 * Returns null when neither productType nor concern is usable —
 * caller falls through to the alias-substring resolver.
 */
function categoryFromIntent(
  productType: string | null,
  concern: string | null
): BaseCategory | null {
  // v22.12 — Authority order:
  //   1. Format-decisive product types keep their category map even
  //      if a concern is present. ("acne-safe moisturizer" stays in
  //      moisturizer category; "gentle chemical exfoliant" stays in
  //      exfoliation.)
  //   2. `serum` is a format-only signal — concern decides which
  //      shelf (dark spots / redness / breakouts / etc).
  //   3. No productType → concern decides directly.
  const FORMAT_DECISIVE = new Set([
    'moisturizer',
    'cleanser',
    'spf',
    'exfoliant',
    'mask',
    'spot_treatment',
    'toner',
    'eye_cream',
  ]);
  if (productType && FORMAT_DECISIVE.has(productType)) {
    return categoryFromProductType(productType);
  }
  if (concern) {
    // v26.2 — typed concern map. Keying on `ConcernType` instead of
    // a loose string lets TypeScript catch typos in the call sites
    // (e.g. `dark_mark` vs `dark_marks`) at build time.
    const concernMap: Partial<Record<ConcernType, string>> = {
      dark_marks: 'dark spots',
      redness: 'redness',
      breakouts: 'breakouts',
      texture: 'texture',
      hydration: 'hydration',
      pores: 'breakouts',
      sensitivity: 'redness',
      oiliness: 'breakouts',
    };
    const concernCatId = concernMap[concern as ConcernType];
    if (concernCatId) {
      return BASE_CATEGORIES.find((c) => c.id === concernCatId) ?? null;
    }
  }
  return categoryFromProductType(productType);
}

/**
 * v22.12 — modifier-driven category override. Used for vague queries
 * that don't extract a productType but carry a strong modifier
 * (e.g. "barrier repair" → barrier repair category). Runs BEFORE
 * the productType+concern map so the modifier wins even when the
 * concern map would route elsewhere.
 *
 * v26.2 — expanded to the full modifier vocabulary. `barrier` always
 * wins because barrier repair isn't a productType so the modifier is
 * the only categorical hint. The remaining modifiers only override
 * when no productType was extracted (the modifier is the user's
 * strongest signal). Otherwise they fall through to bias scoring
 * downstream without changing the shelf.
 */
function categoryFromModifiers(
  modifiers: readonly string[],
  productType: string | null
): BaseCategory | null {
  if (modifiers.includes('barrier')) {
    return BASE_CATEGORIES.find((c) => c.id === 'barrier repair') ?? null;
  }
  // Once we have a productType, the format decides the shelf — the
  // modifier merely biases ranking (e.g. "oil-free moisturizer"
  // stays in moisturizer; oil-free preference is handled in scoring).
  if (productType) return null;
  if (modifiers.includes('oil-free')) {
    return BASE_CATEGORIES.find((c) => c.id === 'breakouts') ?? null;
  }
  if (modifiers.includes('chemical') || modifiers.includes('physical')) {
    return BASE_CATEGORIES.find((c) => c.id === 'exfoliation') ?? null;
  }
  if (modifiers.includes('gentle')) {
    // Solo "gentle" with no productType → calming/sensitivity shelf.
    return BASE_CATEGORIES.find((c) => c.id === 'redness') ?? null;
  }
  return null;
}

/**
 * v22.12 — map an explicit `interpretedProductType` to a base
 * category. The mapping reflects the CATEGORY shelf the user
 * actually wants when they type a format-shaped query:
 *
 *   "niacinamide serum"  → productType=serum → breakouts shelf
 *   "hydrating cleanser" → productType=cleanser → gentle cleansers
 *   "best moisturizer"   → productType=moisturizer → moisturizer
 *   "gentle exfoliant"   → productType=exfoliant → exfoliation
 *
 * Returns null when the product type is unknown — the caller falls
 * through to the alias-substring resolver.
 *
 * Note: serum maps to `breakouts` because the curated catalog tags
 * its strongest serums (BHA, niacinamide, retinol, AHA) under
 * breakouts/texture, not under hydration. If you want a hydration-
 * specific serum, type "hydrating serum" — that triggers the
 * substring resolver, which finds 'hydrating serum' as a hydration
 * alias.
 */
function categoryFromProductType(
  productType: string | null
): BaseCategory | null {
  if (!productType) return null;
  const mapping: Record<string, string> = {
    moisturizer: 'moisturizer',
    cleanser: 'gentle cleansers',
    serum: 'breakouts',
    toner: 'exfoliation',
    spf: 'sunscreen',
    mask: 'breakouts',
    spot_treatment: 'breakouts',
    exfoliant: 'exfoliation',
    eye_cream: 'hydration',
  };
  const catId = mapping[productType];
  if (!catId) return null;
  return BASE_CATEGORIES.find((c) => c.id === catId) ?? null;
}

/**
 * v22.6 — vague-query category fallback driven by the user's top
 * scan concern. Returns null when no scan or no recognizable
 * concern; caller falls through to other defaults.
 */
function categoryFromTopConcern(
  skinState: SkinState | null
): BaseCategory | null {
  const top = skinState?.topConcerns?.[0]?.concern as ConcernType | undefined;
  if (!top) return null;
  // v26.2 — typed concern → category map (matches the Browse-by-goal
  // rail). `Partial<Record<ConcernType, …>>` catches typos at build
  // time and stays in sync with the canonical concern union.
  const CONCERN_TO_CATEGORY: Partial<Record<ConcernType, string>> = {
    breakouts: 'breakouts',
    redness: 'redness',
    hydration: 'hydration',
    texture: 'texture',
    dark_marks: 'dark spots',
    oiliness: 'breakouts', // oily/acne-prone share the breakouts shelf
    sensitivity: 'redness',
    pores: 'breakouts',
  };
  const catId = CONCERN_TO_CATEGORY[top];
  if (!catId) return null;
  return BASE_CATEGORIES.find((c) => c.id === catId) ?? null;
}

/**
 * v22.6 — last-resort fallback: profile skin type → category. Used
 * only when there's no scan concern and the query is vague.
 */
function categoryFromProfileSkinType(
  profile: UserProfileContext
): BaseCategory | null {
  if (!profile.skinType) return null;
  switch (profile.skinType) {
    case 'dry':
      return BASE_CATEGORIES.find((c) => c.id === 'hydration') ?? null;
    case 'oily':
    case 'combination':
      return BASE_CATEGORIES.find((c) => c.id === 'breakouts') ?? null;
    case 'sensitive':
      return BASE_CATEGORIES.find((c) => c.id === 'redness') ?? null;
    default:
      return null;
  }
}

function buildUserNeedSummary(
  category: BaseCategory,
  profile: UserProfileContext,
  skinState: SkinState | null
): string {
  const top = skinState?.topConcerns?.[0]?.concern ?? null;
  const skin = profile.skinType ?? 'unknown';
  if (top && skin !== 'unknown') {
    return `${category.label} curated for ${skin} skin, focused on ${String(
      top
    ).replace(/_/g, ' ')}.`;
  }
  if (skin !== 'unknown') {
    return `${category.label} curated for ${skin} skin.`;
  }
  return `${category.label} — curated picks.`;
}

function mapCategoryToFamily(catId: string): string {
  switch (catId) {
    case 'moisturizer':
    case 'hydration':
      return 'moisturizer';
    case 'exfoliation':
      return 'chemical_exfoliant';
    case 'breakouts':
      return 'blemish_support';
    case 'redness':
    case 'barrier repair':
      return 'serum_texture';
    case 'sunscreen':
      return 'spf';
    case 'gentle cleansers':
      return 'cleanser';
    case 'dark spots':
    case 'texture':
      return 'serum_texture';
    default:
      return 'other';
  }
}

// ===========================================================================
// v22.2 — LIVE RESULT QUALITY FILTER.
//
// Filters obvious promo / shelf-photo / non-real-product entries
// from OBF live search results BEFORE they enter the candidate pool.
// The user reported "OLAY Face serum luminous cica promo" as a hero
// — exactly the kind of entry this filter rejects.
// ===========================================================================

const PROMO_PATTERNS: RegExp[] = [
  /\bpromo\b/i,
  /\bbundle\b/i,
  /\bgift set\b/i,
  /\bcombo\b/i,
  /\bvalue pack\b/i,
  /\bfamily pack\b/i,
  /\brefill\b/i,
  /\bsample\b/i,
  /\btester\b/i,
  /\bsachet\b/i,
  /\btravel size\b/i,
  /\btrial size\b/i,
  /\bmini\b/i,
  /\bduo set\b/i,
  /\bstarter set\b/i,
  /luminous .* promo/i,
];

const NON_SKINCARE_NOISE: RegExp[] = [
  /makeup|lipstick|foundation|mascara|eyeshadow|blush/i,
  /perfume|cologne|fragrance only/i,
  /shampoo|conditioner|hair mask/i,
  /toothpaste|deodorant/i,
];

/**
 * v22.2 — quality-filter a live candidate list. Drops promo / sample /
 * bundle entries and non-skincare noise. The engine uses this BEFORE
 * scoring + trust partition so weak entries never reach the user.
 */
export function filterLiveQuality(
  candidates: readonly LiveProductCandidate[]
): LiveProductCandidate[] {
  return candidates.filter((c) => {
    const corpus = `${c.name ?? ''} ${c.shortDescription ?? ''}`;
    if (PROMO_PATTERNS.some((re) => re.test(corpus))) return false;
    if (NON_SKINCARE_NOISE.some((re) => re.test(corpus))) return false;
    // Reject candidates with no brand AND no real name.
    const brand = (c.brand ?? '').trim();
    const name = (c.name ?? '').trim();
    if (brand.length < 2 && name.length < 6) return false;
    return true;
  });
}

/**
 * v22.2 — minimum-6 enforcement. Given a primary candidate list
 * (from AI / live / etc), top up from curated products for the
 * resolved category until we have at least `minResults` entries.
 * Dedupes by id. Never duplicates.
 */
export function ensureMinimumResults(
  candidates: readonly LiveProductCandidate[],
  category: BaseCategory,
  profile: UserProfileContext,
  skinState: SkinState | null,
  minResults: number = 6
): LiveProductCandidate[] {
  const seen = new Set<string>(candidates.map((c) => c.id));
  const out: LiveProductCandidate[] = [...candidates];
  if (out.length >= minResults) return out;

  // Top up from curated catalog ranked against this category.
  const scored = CURATED_PRODUCTS.map((p) => ({
    p,
    score: scoreCurated(p, category, profile, skinState),
  }))
    .filter((s) =>
      s.p.categoryTags.some((t) => t === category.id) ||
      s.p.concernTags.some((c) => category.concernTags.includes(c))
    )
    .sort((a, b) => b.score - a.score);

  for (const s of scored) {
    if (out.length >= minResults) break;
    if (seen.has(s.p.id)) continue;
    seen.add(s.p.id);
    out.push(curatedToLiveCandidate(s.p));
  }
  return out;
}

/**
 * Get curated category products for a category id (for "Browse by goal"
 * surfaces that don't go through search).
 */
export function getProductsForCategory(
  categoryId: string,
  profile: UserProfileContext,
  skinState: SkinState | null
): LiveProductCandidate[] {
  const category = BASE_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return [];
  if (categoryId === 'best-for-you') {
    // Best for you: pick across categories using the user's profile.
    const scored = CURATED_PRODUCTS.map((p) => ({
      p,
      // Score against a synthetic "user need" category that prefers
      // the user's top concern.
      score: scoreCurated(p, category, profile, skinState),
    })).sort((a, b) => b.score - a.score);
    return scored.slice(0, 12).map((s) => curatedToLiveCandidate(s.p));
  }
  return curatedForCategory(categoryId)
    .map((p) => ({
      p,
      score: scoreCurated(p, category, profile, skinState),
    }))
    .sort((a, b) => b.score - a.score)
    .map((s) => curatedToLiveCandidate(s.p));
}

void CURATED_BY_ID;

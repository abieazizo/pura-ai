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

import type { LiveProductCandidate } from '@/ai/ai-contracts';
import type { UserProfileContext, SkinState } from '@/types/canonical';
import {
  BASE_CATEGORIES,
  resolveCategoryFromQuery,
  type BaseCategory,
} from '@/data/baseCategories';
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
  skinState: SkinState | null
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
  // Resolve category. If the query is vague ("best for me"), default
  // to hydration (universally relevant, sensitivity-safe).
  const resolved = resolveCategoryFromQuery(rawQuery);
  const category =
    resolved ??
    BASE_CATEGORIES.find((c) => c.id === 'hydration')!;

  // Score every curated product, sort desc, take top 18.
  const scored = CURATED_PRODUCTS.map((p) => ({
    p,
    score: scoreCurated(p, category, profile, skinState),
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

/**
 * Pura Shop — personalization scorer.
 *
 * Takes a typed snapshot of the user's profile (post-onboarding +
 * post-scan state) and produces a 0–100 score per catalog product
 * reflecting how well it fits THIS user. The scorer is deterministic
 * and pure so we can reason about its output, test it, and explain
 * the result back to the user via "matched factors."
 *
 * Inputs are intentionally narrow — the shop doesn't peek at AI
 * outputs (canonical state law) and doesn't peek at the store
 * directly. Callers (`useShopViewModel`) compose this snapshot from
 * the store inside their memoized block.
 *
 * Scoring buckets (max contribution → final score):
 *   • Concern match               +35   (per primary concern hit)
 *   • Skin type alignment         +14
 *   • Sensitivity safety          +12   (gentle-tagged products win when sensitive)
 *   • Goal alignment              +10
 *   • Routine timing fit          +6    (AM/PM matches `routineTiming`)
 *   • Has ingredient(s) the user explicitly avoids → −30 hard penalty
 *   • Affinity hint (baseline pop)  scaled 0..23
 *
 * Final score is clamped to [0, 100] and rounded.
 *
 * "Matched factors" are returned alongside the score so the UI can
 * say e.g. "Picked for your active breakouts + sensitive skin."
 */

import type { ShopCatalogProduct, ConcernKey } from './shopCatalog';

export interface UserProfileSnapshot {
  primaryConcern: string | null;
  /** Full concern list, lowercased. */
  concerns: string[];
  skinType: string | null;
  sensitivity: string | null;
  goal: string | null;
  routineTiming: string | null;
  /** Lowercased ingredient names the user has flagged to avoid. */
  avoidIngredients: string[];
  fragranceSensitive: boolean;
  hasScan: boolean;
}

export interface UserMatch {
  score: number;
  factors: MatchedFactor[];
}

export type MatchedFactorKind =
  | 'concern'
  | 'skinType'
  | 'sensitivity'
  | 'goal'
  | 'timing'
  | 'baseline';

export interface MatchedFactor {
  kind: MatchedFactorKind;
  label: string;
  weight: number;
}

// ---------------------------------------------------------------------------
// Concern keyword → catalog `concernTags` mapping.
// User-facing concern strings ("Breakouts", "Active breakouts", "Texture",
// "Hydration", "Marks", "Redness", "Sensitivity") map to the closed set
// of catalog concern keys.
// ---------------------------------------------------------------------------

function concernToKey(c: string): ConcernKey | null {
  const s = c.toLowerCase();
  if (s.includes('break')) return 'breakouts';
  if (s.includes('mark') || s.includes('discol') || s.includes('scar')) return 'marks';
  if (s.includes('hydra') || s.includes('dehydr')) return 'hydration';
  if (s.includes('barr') || s.includes('sensit') || s.includes('red')) return 'barrier';
  if (s.includes('bright') || s.includes('dull') || s.includes('tone')) return 'bright';
  return null;
}

// ---------------------------------------------------------------------------
// Skin-type fit. Each product implicitly suits certain skin types based
// on category + benefit copy; we encode the few known overrides here.
// ---------------------------------------------------------------------------

const SKIN_TYPE_BONUS: Record<string, (p: ShopCatalogProduct) => number> = {
  oily: (p) =>
    p.concernTags.includes('breakouts') || /sebum|oil|bha|salicyl/i.test(p.benefitLine)
      ? 14
      : 4,
  combination: (p) =>
    p.concernTags.includes('breakouts') || p.concernTags.includes('hydration')
      ? 12
      : 6,
  dry: (p) =>
    p.concernTags.includes('hydration') || p.concernTags.includes('barrier')
      ? 14
      : /salicyl|bha|retinol|acid/i.test(p.benefitLine)
        ? 0
        : 6,
  balanced: () => 8,
  sensitive: (p) =>
    p.concernTags.includes('barrier') || /gentle|calm|soothe|relief/i.test(p.benefitLine)
      ? 14
      : /salicyl|bha|retinol|10%|acid/i.test(p.benefitLine)
        ? 0
        : 4,
  not_sure: () => 6,
};

// ---------------------------------------------------------------------------
// Goal alignment.
// ---------------------------------------------------------------------------

const GOAL_KEYWORD: Record<string, RegExp> = {
  clear: /breakout|pore|sebum|salicyl|bha|niacin/i,
  calm: /calm|soothe|sensitiv|heartleaf|gentle/i,
  bright: /bright|dull|tone|vitamin|tranex|niacin/i,
  smoother: /texture|smooth|exfoli|bha|aha|lactic|retin/i,
  barrier: /barrier|ceramid|panthen|hyaluron/i,
};

// ---------------------------------------------------------------------------
// Ingredient hints — used for the avoid-list hard-penalty.
// ---------------------------------------------------------------------------

const INGREDIENT_HINTS: Record<string, RegExp> = {
  fragrance: /fragrance|parfum/i,
  alcohol: /alcohol denat|sd alcohol|ethanol/i,
  retinol: /retinol|retinoid|retinal|retinyl/i,
  salicylic: /salicyl|bha/i,
  niacinamide: /niacinamide|nicotinamide/i,
  vitaminc: /vitamin c|ascorbic/i,
};

function productContainsIngredient(
  p: ShopCatalogProduct,
  ingredient: string,
): boolean {
  const key = ingredient.toLowerCase().trim();
  const hint = INGREDIENT_HINTS[key];
  if (hint) return hint.test(p.benefitLine) || hint.test(p.name);
  // Fallback: literal substring on benefit + name.
  return (
    p.benefitLine.toLowerCase().includes(key) ||
    p.name.toLowerCase().includes(key)
  );
}

// ---------------------------------------------------------------------------
// scoreForUser — the main entry point.
// ---------------------------------------------------------------------------

export function scoreForUser(
  product: ShopCatalogProduct,
  profile: UserProfileSnapshot,
): UserMatch {
  const factors: MatchedFactor[] = [];
  let score = 0;

  // 1. Concern match — primary signal. Each matching concern adds.
  const userConcernKeys = new Set<ConcernKey>();
  for (const c of profile.concerns) {
    const k = concernToKey(c);
    if (k) userConcernKeys.add(k);
  }
  if (profile.primaryConcern) {
    const k = concernToKey(profile.primaryConcern);
    if (k) userConcernKeys.add(k);
  }

  let concernHits = 0;
  for (const tag of product.concernTags) {
    if (userConcernKeys.has(tag)) {
      concernHits += 1;
      factors.push({
        kind: 'concern',
        label: concernLabel(tag),
        weight: 35,
      });
    }
  }
  if (concernHits === 0 && userConcernKeys.size > 0) {
    // No match at all → big drag.
    score -= 8;
  }
  score += Math.min(70, concernHits * 35);

  // 2. Skin type fit.
  if (profile.skinType) {
    const bonusFn = SKIN_TYPE_BONUS[profile.skinType];
    if (bonusFn) {
      const bonus = bonusFn(product);
      score += bonus;
      if (bonus >= 10) {
        factors.push({
          kind: 'skinType',
          label: prettySkinType(profile.skinType),
          weight: bonus,
        });
      }
    }
  }

  // 3. Sensitivity safety.
  if (profile.sensitivity === 'very' || profile.sensitivity === 'somewhat') {
    const gentle =
      product.concernTags.includes('barrier') ||
      /gentle|calm|soothe|relief|hydra/i.test(product.benefitLine);
    const harsh =
      /retinol|retinoid|salicyl|acid|10%|bha|aha/i.test(product.name + ' ' + product.benefitLine) &&
      !gentle;
    if (gentle) {
      score += 12;
      factors.push({ kind: 'sensitivity', label: 'sensitive skin', weight: 12 });
    } else if (harsh) {
      score -= 14;
    }
  }

  // 4. Goal alignment.
  if (profile.goal) {
    const re = GOAL_KEYWORD[profile.goal];
    if (re && (re.test(product.benefitLine) || re.test(product.name))) {
      score += 10;
      factors.push({ kind: 'goal', label: prettyGoal(profile.goal), weight: 10 });
    }
  }

  // 5. Routine timing.
  if (profile.routineTiming && product.usageLine) {
    const usage = product.usageLine.toLowerCase();
    if (profile.routineTiming === 'am' && usage.includes('am')) {
      score += 6;
      factors.push({ kind: 'timing', label: 'AM step', weight: 6 });
    } else if (profile.routineTiming === 'pm' && usage.includes('pm')) {
      score += 6;
      factors.push({ kind: 'timing', label: 'PM step', weight: 6 });
    }
  }

  // 6. Avoid-ingredient hard penalty.
  for (const ing of profile.avoidIngredients) {
    if (productContainsIngredient(product, ing)) {
      score -= 30;
    }
  }
  if (profile.fragranceSensitive && /fragrance|parfum/i.test(product.benefitLine)) {
    score -= 10;
  }

  // 7. Affinity hint baseline — scaled so it never dominates the
  //    concern signal but still gives ties a meaningful tiebreaker.
  const baseline = Math.min(23, Math.round(((product.affinityHint ?? 0) / 100) * 23));
  score += baseline;
  if (factors.length === 0) {
    factors.push({ kind: 'baseline', label: 'best-seller fit', weight: baseline });
  }

  // Clamp + round.
  const final = Math.max(0, Math.min(100, Math.round(score)));
  return { score: final, factors };
}

// ---------------------------------------------------------------------------
// Pretty-print helpers.
// ---------------------------------------------------------------------------

function concernLabel(k: ConcernKey): string {
  switch (k) {
    case 'breakouts': return 'active breakouts';
    case 'marks': return 'post-acne marks';
    case 'hydration': return 'hydration';
    case 'barrier': return 'sensitive skin';
    case 'bright': return 'dullness';
  }
}

function prettySkinType(t: string): string {
  switch (t) {
    case 'oily': return 'oily skin';
    case 'combination': return 'combination skin';
    case 'dry': return 'dry skin';
    case 'balanced': return 'balanced skin';
    case 'sensitive': return 'sensitive skin';
    default: return 'your skin type';
  }
}

function prettyGoal(g: string): string {
  switch (g) {
    case 'clear': return 'clearer skin';
    case 'calm': return 'calmer skin';
    case 'bright': return 'brighter skin';
    case 'smoother': return 'smoother texture';
    case 'barrier': return 'stronger barrier';
    case 'simpler': return 'a simpler routine';
    default: return 'your goal';
  }
}

/**
 * Compose a single-line "matched for…" subline from the top factors.
 * Used as the hero card's section subline.
 */
export function describeMatch(match: UserMatch): string {
  const top = match.factors
    .filter((f) => f.kind !== 'baseline')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((f) => f.label);
  if (top.length === 0) {
    return 'Tonight’s top pick across the catalog.';
  }
  if (top.length === 1) {
    return `Picked for your ${top[0]}.`;
  }
  return `Picked for your ${top[0]} + ${top[1]}.`;
}

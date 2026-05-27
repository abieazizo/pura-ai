/**
 * Pura Shop — search utilities.
 *
 * Pulled out of useShopViewModel because:
 *   • Token math is a pure function — better tested + reused
 *     here than buried inside a hook closure.
 *   • Levenshtein-style "did you mean?" needs a dictionary of
 *     searchable tokens drawn from the catalog; isolating it
 *     keeps the VM small.
 */

import { useEffect, useState } from 'react';
import { SHOP_CATALOG, type ShopCatalogProduct } from './shopCatalog';

// ---------------------------------------------------------------------------
// useDebouncedValue — small hook so we don't recompute the view model
// on every single keystroke. 110ms is short enough to feel live but
// long enough to skip the intermediate states of a quick word.
// ---------------------------------------------------------------------------

export function useDebouncedValue<T>(value: T, delayMs = 110): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

// ---------------------------------------------------------------------------
// Ingredient synonyms — drives both search and the badge tagging.
// Each catalog product gets enriched with the union of its declared
// ingredients + any synonyms hinted at by its name + benefit copy.
// ---------------------------------------------------------------------------

export const INGREDIENT_SYNONYMS: Record<string, readonly string[]> = {
  bha: ['salicylic acid', 'salicylic', 'beta hydroxy'],
  aha: ['glycolic', 'lactic acid', 'alpha hydroxy'],
  retinol: ['retinoid', 'retinal', 'retinyl'],
  niacinamide: ['vitamin b3', 'nicotinamide'],
  'vitamin c': ['ascorbic', 'tetra ascorbate'],
  ceramide: ['ceramides'],
  hyaluronic: ['hyaluronate', 'sodium hyaluronate'],
  centella: ['cica'],
  tranexamic: ['tranexamic acid'],
  spf: ['sunscreen', 'sun protection', 'uv'],
};

// ---------------------------------------------------------------------------
// Tokenization
// ---------------------------------------------------------------------------

export interface SearchTokens {
  short: string[]; // length 1 — prefix matchers
  long: string[];  // length 2+ — substring matchers
}

export function tokenize(raw: string): SearchTokens {
  if (!raw) return { short: [], long: [] };
  const cleaned = raw
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9%+]/g, ''))
    .filter((t) => t.length > 0);
  const short: string[] = [];
  const long: string[] = [];
  for (const t of cleaned) {
    if (t.length === 1) short.push(t);
    else long.push(t);
  }
  return { short, long };
}

export function ingredientHaystackFor(p: ShopCatalogProduct): string {
  const seed = [
    p.brand,
    p.name,
    p.shortName ?? '',
    p.benefitLine,
    p.badge?.label ?? '',
    p.concernTags.join(' '),
    p.category, // <- now searchable
  ].join(' ').toLowerCase();
  const extras: string[] = [];
  for (const [primary, syns] of Object.entries(INGREDIENT_SYNONYMS)) {
    if (seed.includes(primary) || syns.some((s) => seed.includes(s))) {
      extras.push(primary, ...syns);
    }
  }
  return [seed, ...extras].join(' ');
}

export function matchesQuery(p: ShopCatalogProduct, tokens: SearchTokens): boolean {
  if (tokens.short.length === 0 && tokens.long.length === 0) return true;
  const hay = ingredientHaystackFor(p);
  for (const t of tokens.long) {
    if (!hay.includes(t)) return false;
  }
  if (tokens.short.length > 0) {
    const words = hay.split(/\s+/);
    for (const t of tokens.short) {
      if (!words.some((w) => w.startsWith(t))) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Did you mean? — Levenshtein-distance suggestion against the catalog
// dictionary. Returns the closest single-word match if the user typed
// a multi-letter query that didn't hit anything.
// ---------------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  // Two-row dynamic programming buffer.
  let prev = new Array<number>(bl + 1);
  let cur = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    cur[0] = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(
        cur[j - 1] + 1,         // insertion
        prev[j] + 1,            // deletion
        prev[j - 1] + cost,     // substitution
      );
    }
    [prev, cur] = [cur, prev];
  }
  return prev[bl];
}

let _dict: string[] | null = null;
function dictionary(): string[] {
  if (_dict) return _dict;
  const set = new Set<string>();
  for (const p of SHOP_CATALOG) {
    const hay = ingredientHaystackFor(p);
    for (const w of hay.split(/\s+/)) {
      const cleaned = w.replace(/[^a-z0-9]/g, '');
      if (cleaned.length >= 4) set.add(cleaned);
    }
  }
  _dict = Array.from(set);
  return _dict;
}

/**
 * Suggest the closest dictionary word to the user's query. Returns
 * null when no good suggestion exists (distance too far, query too
 * short to suggest against, or the query already matched something).
 */
export function suggestSearchTerm(query: string): string | null {
  const cleaned = query.toLowerCase().trim();
  if (cleaned.length < 4) return null;
  const dict = dictionary();
  let bestWord: string | null = null;
  let bestDist = Infinity;
  for (const w of dict) {
    if (w === cleaned) return null; // already matches
    const d = levenshtein(cleaned, w);
    if (d < bestDist) {
      bestDist = d;
      bestWord = w;
    }
  }
  // Accept the suggestion only when it's close enough to feel like a
  // true typo correction. Tunable: 2 edits on a 5-letter word, 3 on
  // a 7+ letter word.
  const tolerance = Math.max(2, Math.floor(cleaned.length / 4));
  if (bestWord && bestDist <= tolerance) return bestWord;
  return null;
}

// ---------------------------------------------------------------------------
// Popular searches — shown as quick-shortcut chips when the user
// has focused the search input but hasn't typed anything yet.
// ---------------------------------------------------------------------------

export const POPULAR_SEARCHES: readonly string[] = [
  'BHA',
  'Niacinamide',
  'SPF',
  'Vitamin C',
  'Ceramide',
  'Snail mucin',
] as const;

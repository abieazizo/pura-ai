/**
 * v22.12 — deterministic verification script for the Products tab
 * recommendation engine. Drives the engine through each goal +
 * each named query without any React/runtime coupling, then prints
 * a compact human-readable report of what the user would see.
 *
 * Run with:
 *   npx tsx scripts/verifyProductsTab.ts
 *
 * The script imports the deterministic typed-search planner +
 * curated catalog + base categories directly. It does NOT call the
 * AI proxy or any network resource — every output is reproducible
 * from the bundled product data.
 */

import {
  planTypedSearchDeterministic,
  getProductsForCategory,
} from '../src/api/typedSearchDeterministic';
import { BASE_CATEGORIES } from '../src/data/baseCategories';
import { interpretSearchIntent } from '../src/api/queryIntent';
import { scoreTrustForCandidate, buildWhyItFits } from '../src/api/candidateTrust';
import {
  FORBIDDEN_SUMMARY_PATTERNS,
  sanitizeUserNeedSummary,
} from '../src/api/summaryGuards';
import type {
  UserProfileContext,
  SkinState,
} from '../src/types/canonical';

// ---------------------------------------------------------------------------
// Fixture: a representative user with a recent scan.
// ---------------------------------------------------------------------------

const fixtureProfile: UserProfileContext = {
  displayName: 'Test User',
  skinType: 'combination',
  sensitivities: ['fragrance'],
  goals: ['reduce breakouts', 'even tone'],
  prescriptionFlag: false,
};

const fixtureScan: SkinState = {
  id: 'fixture-scan',
  capturedAt: new Date().toISOString(),
  imageQuality: {
    confidence: 0.84,
    usable: true,
    issues: [],
  },
  topConcerns: [
    { concern: 'breakouts', severity: 'mild', region: 'forehead' },
    { concern: 'dark_marks', severity: 'mild', region: 'cheeks' },
  ],
  summaryHeadline: 'Mild forehead breakouts with light post-acne marks.',
  whyThisMatters: null,
  preferredRoutineSlot: null,
  scoreBand: 'good',
  scoreNumeric: 78,
  scoreTrend: 'stable',
} as unknown as SkinState;

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

const GOALS: Array<{ id: string; label: string }> = [
  { id: 'best-for-you', label: 'Best for your skin' },
  { id: 'breakouts', label: 'Breakouts' },
  { id: 'hydration', label: 'Hydration' },
  { id: 'texture', label: 'Texture' },
  { id: 'dark spots', label: 'Dark marks' },
  { id: 'gentle cleansers', label: 'Sensitive' },
  { id: 'barrier repair', label: 'Barrier' },
];

const QUERIES = [
  'gentle chemical exfoliant',
  'niacinamide serum',
  'barrier repair',
  'hydrating cleanser',
  'dark spot serum',
  'acne-safe moisturizer',
  'asdfghjkl unknown nonsense query',
];

function fmt(label: string): string {
  return `\n══════════════════════════════════════════════════════\n${label}\n══════════════════════════════════════════════════════`;
}

// ---------------------------------------------------------------------------
// Goal verification.
// ---------------------------------------------------------------------------

console.log(fmt('GOAL VERIFICATION'));

for (const goal of GOALS) {
  console.log(`\n── Goal: ${goal.label} (id=${goal.id}) ──`);
  const cat = BASE_CATEGORIES.find((c) => c.id === goal.id);
  if (!cat) {
    console.log(`  ✗ Category id ${goal.id} not found in BASE_CATEGORIES`);
    continue;
  }
  const candidates = getProductsForCategory(
    goal.id,
    fixtureProfile,
    fixtureScan
  );
  if (candidates.length === 0) {
    console.log('  status: empty');
    continue;
  }
  console.log(`  status: ready_${candidates.length >= 3 ? 'exact' : 'partial'}`);
  console.log(`  count: ${candidates.length}`);
  console.log(`  hero: ${candidates[0].brand} — ${candidates[0].name}`);
  console.log(`  hero reason: ${candidates[0].matchReason}`);
  console.log(`  alternatives:`);
  for (const alt of candidates.slice(1, 4)) {
    console.log(`    • ${alt.brand} — ${alt.name}`);
    console.log(`      reason: ${alt.matchReason}`);
  }
}

// ---------------------------------------------------------------------------
// Search verification.
// ---------------------------------------------------------------------------

console.log(fmt('SEARCH VERIFICATION'));

for (const query of QUERIES) {
  console.log(`\n── Query: "${query}" ──`);
  const intent = interpretSearchIntent(query, fixtureProfile, fixtureScan);
  console.log(`  intent.mode: ${intent.mode}`);
  console.log(`  intent.productType: ${intent.interpretedProductType ?? '(none)'}`);
  console.log(`  intent.concern: ${intent.interpretedConcern ?? '(none)'}`);
  console.log(`  intent.strictness: ${intent.strictness}`);
  console.log(`  intent.modifiers: [${intent.modifiers.join(', ')}]`);
  console.log(`  intent.ingredients: [${intent.desiredIngredients.join(', ')}]`);

  const outcome = planTypedSearchDeterministic(
    query,
    fixtureProfile,
    fixtureScan
  );
  console.log(`  resolvedCategory: ${outcome.category.label}`);
  console.log(`  dominantFamily: ${outcome.dominantProductFamily}`);
  console.log(`  userNeedSummary: ${outcome.userNeedSummary}`);
  console.log(`  searchIntentLabel: ${outcome.searchIntentLabel}`);

  if (outcome.candidates.length === 0) {
    console.log('  hero: (no candidates)');
    continue;
  }

  // Score each candidate against the query intent to see the fit band.
  const scored = outcome.candidates.slice(0, 4).map((c) => {
    const s = scoreTrustForCandidate({
      candidate: c,
      intent,
      profile: fixtureProfile,
      skinState: fixtureScan,
      matchedProbes: [],
    });
    const reason = buildWhyItFits({
      candidate: c,
      intent,
      score: s.score,
      skinFit: null,
    });
    return { c, s, reason };
  });

  const hero = scored[0];
  console.log(`  hero: ${hero.c.brand} — ${hero.c.name}`);
  console.log(
    `    fitBand: ${hero.s.score.fitBand}, relevance: ${hero.s.score.relevancePercent}%`
  );
  console.log(`    reason: ${hero.reason}`);

  console.log('  top alternatives:');
  for (const a of scored.slice(1)) {
    console.log(
      `    • ${a.c.brand} — ${a.c.name} (${a.s.score.fitBand}, ${a.s.score.relevancePercent}%)`
    );
    console.log(`      reason: ${a.reason}`);
  }
}

// ---------------------------------------------------------------------------
// Assertions — fail the script if any guarantee is broken.
// ---------------------------------------------------------------------------

console.log(fmt('ASSERTIONS'));

const FORBIDDEN_PATTERNS = [
  /\buser needs\b/i,
  /\bthe user\b/i,
  /\bverified\b/i,
  /\bclinically proven\b/i,
  /\bguaranteed\b/i,
  /\bcures?\b/i,
  /\bundefined\b/i,
  /\bnull\b/i,
];

let failures = 0;

// Assertion 1: every known query produces a useful (non-empty) summary
// and avoids forbidden phrases.
const KNOWN_QUERIES = QUERIES.slice(0, 6); // last is the unknown one
for (const query of KNOWN_QUERIES) {
  const intent = interpretSearchIntent(query, fixtureProfile, fixtureScan);
  const outcome = planTypedSearchDeterministic(query, fixtureProfile, fixtureScan);
  if (!intent.recognized) {
    console.log(`  ✗ "${query}" — intent.recognized must be true`);
    failures++;
  }
  if (outcome.candidates.length === 0) {
    console.log(`  ✗ "${query}" — expected candidates, got 0`);
    failures++;
  }
  for (const re of FORBIDDEN_PATTERNS) {
    if (re.test(outcome.userNeedSummary)) {
      console.log(`  ✗ "${query}" — userNeedSummary matched forbidden ${re}`);
      failures++;
    }
  }
}

// Assertion 2: NON-EMPTY noise queries (queries the user actually
// typed letters into) must be `recognized=false`. Empty/whitespace
// queries are a different state — when there's a scan, the engine
// intentionally falls back to the scan's top concern. We only assert
// the unrecognized contract for queries that carry meaningful text.
const NOISE_QUERIES = [
  'asdfghjkl unknown nonsense query',
  'umbrella', // real word, not a product/concern/ingredient
  'qzqzqzq',  // alphanumeric noise
];
for (const noise of NOISE_QUERIES) {
  const noiseIntent = interpretSearchIntent(noise, fixtureProfile, fixtureScan);
  if (noiseIntent.recognized) {
    console.log(`  ✗ "${noise}" — recognized must be false (got true)`);
    failures++;
  } else {
    console.log(`  ✓ "${noise}" — intent.recognized=false`);
  }
}

// Assertion 2b: empty query WITH a scan IS recognized (intentional
// fallback to scan top concern). Empty query WITHOUT a scan is NOT
// recognized — that's the new-user empty state.
const emptyWithScan = interpretSearchIntent('', fixtureProfile, fixtureScan);
if (!emptyWithScan.recognized) {
  console.log(
    `  ✗ empty query with scan should be recognized (scan fallback)`
  );
  failures++;
} else {
  console.log(`  ✓ empty query + scan → recognized=true (scan fallback)`);
}
const emptyNoScan = interpretSearchIntent('', fixtureProfile, null);
if (emptyNoScan.recognized) {
  console.log(`  ✗ empty query without scan should NOT be recognized`);
  failures++;
} else {
  console.log(`  ✓ empty query + no scan → recognized=false`);
}

// Assertion 3: every goal produces a hero candidate via getProductsForCategory.
for (const goal of GOALS) {
  const cs = getProductsForCategory(goal.id, fixtureProfile, fixtureScan);
  if (cs.length === 0) {
    console.log(`  ✗ goal "${goal.label}" — expected candidates, got 0`);
    failures++;
  } else {
    console.log(`  ✓ goal "${goal.label}" — ${cs.length} candidates, hero: ${cs[0].name}`);
  }
}

// v26.2 — Assertion 4: `buildWhyItFits` never returns an empty string
// for any of the 7 known queries. An empty caption is the kind of
// silent regression the UI can't recover from — surface it loudly.
for (const query of KNOWN_QUERIES) {
  const intent = interpretSearchIntent(query, fixtureProfile, fixtureScan);
  const outcome = planTypedSearchDeterministic(query, fixtureProfile, fixtureScan);
  if (outcome.candidates.length === 0) continue;
  for (const c of outcome.candidates.slice(0, 3)) {
    const s = scoreTrustForCandidate({
      candidate: c,
      intent,
      profile: fixtureProfile,
      skinState: fixtureScan,
      matchedProbes: [],
    });
    const reason = buildWhyItFits({
      candidate: c,
      intent,
      score: s.score,
      skinFit: null,
    });
    if (!reason || reason.trim().length === 0) {
      console.log(`  ✗ "${query}" — buildWhyItFits returned empty for ${c.brand} — ${c.name}`);
      failures++;
    }
  }
}

// v26.2 — Assertion 5: format-decisive routing. A query that names
// a specific product format MUST keep its top-3 results in-format —
// no cleansers/serums/exfoliants slipping into a moisturizer search.
// This is the regression that drove the FORMAT_DECISIVE set; the
// assertion makes sure it can't quietly break again.
const FORMAT_PROBES: Array<{
  query: string;
  forbiddenCategories: readonly string[];
}> = [
  {
    query: 'acne-safe moisturizer',
    forbiddenCategories: ['gentle cleansers', 'exfoliation'],
  },
  {
    query: 'hydrating cleanser',
    forbiddenCategories: ['moisturizer', 'exfoliation', 'sunscreen'],
  },
  {
    query: 'gentle chemical exfoliant',
    forbiddenCategories: ['moisturizer', 'gentle cleansers', 'sunscreen'],
  },
];
for (const probe of FORMAT_PROBES) {
  const outcome = planTypedSearchDeterministic(
    probe.query,
    fixtureProfile,
    fixtureScan
  );
  const top3 = outcome.ranked.slice(0, 3);
  for (const p of top3) {
    for (const forbidden of probe.forbiddenCategories) {
      if (p.categoryTags.some((t) => t === forbidden)) {
        console.log(
          `  ✗ "${probe.query}" — top-3 includes ${forbidden} product ${p.brand} ${p.name}`
        );
        failures++;
      }
    }
  }
  if (top3.length > 0) {
    console.log(
      `  ✓ "${probe.query}" — top-3 stays in-format (cat=${outcome.category.id})`
    );
  }
}

// v26.2 — Assertion 6: the FORBIDDEN_SUMMARY_PATTERNS export must be
// reachable and cover at least the core leak vectors (third-person,
// fake-trust, null/undefined/NaN). The verify script and the runtime
// sanitizer share this list — drift here is a silent bug.
// Hints are substrings expected to appear in at least one pattern's
// source. Word-boundary metachars in the live patterns (`\b...\b`)
// mean we substring-match rather than source-equality.
const REQUIRED_PATTERN_HINTS = ['user needs', 'the user', 'undefined', 'null', 'verified'];
if (!Array.isArray(FORBIDDEN_SUMMARY_PATTERNS) || FORBIDDEN_SUMMARY_PATTERNS.length < 8) {
  console.log(
    `  ✗ FORBIDDEN_SUMMARY_PATTERNS missing or under-populated (got ${FORBIDDEN_SUMMARY_PATTERNS?.length ?? 'n/a'})`
  );
  failures++;
} else {
  for (const hint of REQUIRED_PATTERN_HINTS) {
    const present = FORBIDDEN_SUMMARY_PATTERNS.some((re) =>
      re.source.toLowerCase().includes(hint)
    );
    if (!present) {
      console.log(
        `  ✗ FORBIDDEN_SUMMARY_PATTERNS is missing a pattern covering "${hint}"`
      );
      failures++;
    }
  }
  console.log(
    `  ✓ FORBIDDEN_SUMMARY_PATTERNS exported with ${FORBIDDEN_SUMMARY_PATTERNS.length} patterns`
  );
}

// v26.2 — Assertion 7: sanitizer behavior probes. Drive the sanitizer
// through known-bad inputs and confirm it returns null (forcing UI
// fallback). Then drive a known-clean input and confirm it survives.
// Each probe is constructed so the forbidden phrase SURVIVES the
// sanitizer's leading-prefix strip. E.g. "the user" appears mid-
// string, not as a leading "The user needs …" prefix (which is a
// separate legal cleanup branch).
const SANITIZER_REJECTS: Array<{ input: string; reason: string }> = [
  { input: 'Hydration tailored to the user with combination skin.', reason: 'embedded third-person leak' },
  { input: 'Hydration that is undefined for combination skin.', reason: 'undefined leak' },
  { input: 'Clinically proven cure for breakouts.', reason: 'fake-trust + cure' },
  { input: 'A calming serum for sensitive skin and', reason: 'trailing conjunction' },
  { input: 'Lightweight hydration,', reason: 'trailing comma fragment' },
  { input: 'Hi', reason: 'too short' },
];
for (const probe of SANITIZER_REJECTS) {
  const out = sanitizeUserNeedSummary(probe.input);
  if (out !== null) {
    console.log(
      `  ✗ sanitizer should reject (${probe.reason}) "${probe.input}" — got "${out}"`
    );
    failures++;
  } else {
    console.log(`  ✓ sanitizer rejects ${probe.reason}`);
  }
}
const cleanInput = 'Calming hydration curated for sensitive skin.';
const cleanOut = sanitizeUserNeedSummary(cleanInput);
if (cleanOut !== cleanInput) {
  console.log(`  ✗ sanitizer altered clean input: "${cleanInput}" → "${cleanOut}"`);
  failures++;
} else {
  console.log(`  ✓ sanitizer preserves clean input verbatim`);
}

if (failures > 0) {
  console.log(`\n✗ VERIFICATION FAILED — ${failures} assertion(s) broke.`);
  process.exit(1);
}

console.log(fmt('VERIFICATION COMPLETE — all assertions PASS'));

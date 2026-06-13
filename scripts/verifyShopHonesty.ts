/**
 * verifyShopHonesty — the Shop feed's honesty contract (habit step 5).
 * Run: npx tsx scripts/verifyShopHonesty.ts
 *
 *  • concern filters speak SCAN language (redness/dryness/dark marks/
 *    breakouts) — never jargon, never marketing taxonomy
 *  • every user-facing line in the catalog is jargon-free and hype-free
 *  • every product ships a real packshot (the type already requires it)
 *  • no swipe deck anywhere in the shop module
 *  • the link-health quarantine exists and the commerce engine respects it
 *
 * Catalog copy is linted from SOURCE (the shop catalog requires image assets
 * at module scope, so it can't be imported under tsx — same constraint as
 * the packshots themselves).
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

let pass = 0;
let fail = 0;
const failures: string[] = [];
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    pass += 1;
    console.log(`  ✓ ${name}`);
  } else {
    fail += 1;
    failures.push(name + (detail ? ` — ${detail}` : ''));
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const SHOP = join(__dirname, '../src/screens/shop');
// 'actives' is the cosmetic-jargon NOUN (plural); 'active breakouts' is plain
// English and stays legal.
const JARGON = /\b(barrier|sebum|actives|exfoliants?|t-zone|erythema|hyperpigmentation|glabella|perioral)\b/i;
const HYPE = /\b(miracle|transform|glow.?up|radiant|flawless|perfect skin|amazing|magic)\b/i;

// ── 1 · Filter chips speak scan language ───────────────────────────────────
console.log('\n— Concern filters in scan language —');
const vmSrc = readFileSync(join(SHOP, 'useShopViewModel.ts'), 'utf8');
const chipLabels = [...vmSrc.matchAll(/key:\s*'[a-z]+',\s*label:\s*'([^']+)'/g)].map((m) => m[1]);
check(`chips found (${chipLabels.join(', ')})`, chipLabels.length >= 4);
const SCAN_WORDS = new Set(['All', 'Breakouts', 'Dryness', 'Dark marks', 'Redness', 'Oil', 'Shine']);
for (const label of chipLabels) {
  check(`chip "${label}" is scan language`, SCAN_WORDS.has(label));
}
check('no jargon in any chip label', chipLabels.every((l) => !JARGON.test(l)));

// ── 2 · Catalog copy: every user-facing string honest ──────────────────────
console.log('\n— Catalog copy: jargon-free, hype-free —');
const catSrc = readFileSync(join(SHOP, 'shopCatalog.ts'), 'utf8');
// OUR voice: benefit/usage lines + badge labels. Product NAMES are facts —
// "2% BHA Liquid Exfoliant" is Paula's name for it, not our copy — so names
// are swept for hype only (below), never for the manufacturer's own terms.
const userStrings = [
  ...catSrc.matchAll(/(?:benefitLine|usageLine):\s*'([^']+)'/g),
  ...catSrc.matchAll(/label:\s*'([^']+)'/g),
].map((m) => m[1]);
const nameStrings = [...catSrc.matchAll(/(?:name|shortName):\s*'([^']+)'/g)].map((m) => m[1]);
check(`catalog user strings swept (${userStrings.length})`, userStrings.length >= 20);
const jargonHits = userStrings.filter((s) => JARGON.test(s));
check('zero jargon in catalog copy', jargonHits.length === 0, jargonHits.slice(0, 4).join(' | '));
const hypeHits = [...userStrings, ...nameStrings].filter((s) => HYPE.test(s));
check('zero hype in catalog copy (names included)', hypeHits.length === 0, hypeHits.slice(0, 4).join(' | '));

// Other shop user-copy modules (personalization reasons, stack model lines).
for (const f of ['personalization.ts', 'shopStackModel.ts']) {
  const src = readFileSync(join(SHOP, f), 'utf8');
  const strings = [...src.matchAll(/return\s+'([^']{12,})'/g), ...src.matchAll(/:\s*'([^']{20,})'/g)].map((m) => m[1]);
  const hits = strings.filter((s) => JARGON.test(s));
  check(`${f}: user copy jargon-free (${strings.length} strings)`, hits.length === 0, hits.slice(0, 3).join(' | '));
}

// ── 2b · Concern LABELS everywhere speak scan language ─────────────────────
// The seam that slipped the first pass: the "what I saw" chips (shopStackModel
// humanConcern) and the browse index (ConcernIndexScreen) had their OWN label
// maps saying 'Hydration'/'Barrier' — product taxonomy, not the scan's words.
console.log('\n— Concern labels (every shop surface) in scan language —');
const BENEFIT_LABELS = /'(Hydration|Oiliness|Barrier|Brightness)'/g;

// shopStackModel.humanConcern — the chip labels.
const stackSrc = readFileSync(join(SHOP, 'shopStackModel.ts'), 'utf8');
const humanBlock = stackSrc.slice(stackSrc.indexOf('function humanConcern'));
const humanBody = humanBlock.slice(0, humanBlock.indexOf('\n}'));
const humanReturns = [...humanBody.matchAll(/return '([^']+)'/g)].map((m) => m[1]);
check(`humanConcern returns swept (${humanReturns.join(', ')})`, humanReturns.length >= 6);
check("humanConcern maps hydration→'Dryness' (the flagged fix)", humanReturns.includes('Dryness'));
check("humanConcern never says 'Hydration' or 'Oiliness'",
  !humanReturns.includes('Hydration') && !humanReturns.includes('Oiliness'),
  humanReturns.filter((l) => l === 'Hydration' || l === 'Oiliness').join(','));

// ConcernIndexScreen — the browse-by-concern index titles + blurbs.
const idxSrc = readFileSync(join(SHOP, 'ConcernIndexScreen.tsx'), 'utf8');
const idxBlock = idxSrc.slice(idxSrc.indexOf('CONCERN_INDEX'), idxSrc.indexOf('] as const'));
const idxStrings = [...idxBlock.matchAll(/(?:title|blurb):\s*'([^']+)'/g)].map((m) => m[1]);
check(`concern index strings swept (${idxStrings.length})`, idxStrings.length >= 8);
check('concern index has zero jargon (catches the old "Barrier" title + "moisture barrier")',
  idxStrings.every((s) => !JARGON.test(s)), idxStrings.filter((s) => JARGON.test(s)).join(' | '));
const idxTitles = [...idxBlock.matchAll(/title:\s*'([^']+)'/g)].map((m) => m[1]);
check('concern index titles are scan language (Dryness/Redness/Dark marks present)',
  idxTitles.includes('Dryness') && idxTitles.includes('Redness') && idxTitles.includes('Dark marks'),
  idxTitles.join(', '));

// personalization.concernLabel — the reason-sentence nouns.
const persSrc2 = readFileSync(join(SHOP, 'personalization.ts'), 'utf8');
const concernLabelBlock = persSrc2.slice(persSrc2.indexOf('function concernLabel'));
check("personalization concernLabel says 'dryness', not 'hydration'",
  /case 'hydration': return 'dryness'/.test(concernLabelBlock));

// ── 3 · Real images required · no swipe deck ───────────────────────────────
console.log('\n— Structure —');
check('packshot is REQUIRED by the type (no fallback path)',
  /catalogPackshot:\s*ImageSourcePropType;/.test(catSrc) && /Required — there is no fallback/.test(catSrc));
const shopFiles = readdirSync(SHOP).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
const swipe = shopFiles.filter((f) => /swiper|swipe.?deck|Tinder/i.test(readFileSync(join(SHOP, f), 'utf8')));
check('no swipe deck in the shop module', swipe.length === 0, swipe.join(','));
check('price on the catalog entry', /price:\s*number;/.test(catSrc));

// ── 4 · Link health: quarantine exists + engine respects it ────────────────
console.log('\n— Link health —');
const lhPath = join(__dirname, '../src/commerce/linkHealth.json');
check('linkHealth.json exists (run scripts/checkLinkHealth.ts to refresh)', existsSync(lhPath));
if (existsSync(lhPath)) {
  const lh = JSON.parse(readFileSync(lhPath, 'utf8')) as {
    checkedAt: string;
    checked: number;
    quarantined: Array<{ id: string; reason: string }>;
  };
  check(`ledger is real (${lh.checked} URLs checked at ${lh.checkedAt.slice(0, 10)})`, lh.checked > 30);
  // The guard: quarantined ids never reach the engine's pickable pool.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { healthyCatalog, isQuarantined } = require('../src/commerce/linkHealth');
  const { COMMERCE_CATALOG } = require('../src/commerce/catalog');
  const pool = healthyCatalog(COMMERCE_CATALOG);
  check('healthyCatalog excludes every quarantined id',
    pool.every((s: { id: string }) => !isQuarantined(s.id)));
  check('guard is a filter, not a rewrite (pool ⊆ catalog)',
    pool.length <= COMMERCE_CATALOG.length && pool.length >= COMMERCE_CATALOG.length - lh.quarantined.length);
  // Engine integration: a quarantined id can never be picked.
  const { buildRecommendation } = require('../src/commerce/engine');
  const set = buildRecommendation(
    { findings: [{ id: 'f1', metric: 'redness', level: 'a lot', regionPhrase: 'your cheeks' }], tailoring: { depth: 'full', ownedSteps: [] } },
    pool,
  );
  const pickedIds: string[] = set.slots.flatMap((s: { pick: { sku: { id: string } } | null; budgetAlternative: { sku: { id: string } } | null }) =>
    [s.pick?.sku.id, s.budgetAlternative?.sku.id].filter(Boolean) as string[]);
  check('engine fed the healthy pool picks zero quarantined products',
    pickedIds.every((id) => !isQuarantined(id)));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('FAILURES:\n  - ' + failures.join('\n  - '));
  process.exit(1);
}
console.log('SHOP: honest 10/10 contract holds.');

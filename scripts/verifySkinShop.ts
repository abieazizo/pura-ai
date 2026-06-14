/**
 * verifySkinShop — proves the Shop engine's honesty rules hold IN CODE.
 * Run: npx tsx scripts/verifySkinShop.ts
 *
 * Proves:
 *   • no scan → notScanned, zero products (never a catalog)
 *   • picks derive from findings; clearing a finding changes the picks
 *   • pick ranking is FIT-based and price-BLIND (price-shuffle invariance)
 *   • finding-echo data (tint + strength) rides every pick
 *   • the collection reflects the kept routine
 *   • restockSoon appears ONLY with a real confirmed-got date + lifespan
 *   • a dead-link product is hidden from picks AND the collection
 *   • the concern filter returns only the relevant subset
 *   • evolution: an improved finding marks its picks "less needed now"
 *   • a non-budget pick offers a budget alternative
 */

import { buildSkinShop } from '../src/screens/shop/skinShop/engine';
import { typicalLifespanDays } from '../src/screens/shop/skinShop/lifespan';
import { COMMERCE_CATALOG } from '../src/commerce/catalog';
import type { ConcernType, Severity } from '../src/ai/ai-contracts';
import type { SkinConcernSummary, SkinState } from '../src/types/canonical';

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

const NOW = Date.parse('2026-06-14T00:00:00.000Z');
const isoDaysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

const finding = (
  concern: ConcernType,
  severity: Severity,
  opts: {
    confidence?: number;
    regions?: string[];
    direction?: SkinConcernSummary['direction'];
  } = {},
): SkinConcernSummary => ({
  concern,
  severity,
  rank: 1,
  confidence: opts.confidence ?? 0.8,
  regions: opts.regions ?? ['left cheek'],
  summary: '',
  direction: opts.direction ?? 'same',
});

const skin = (findings: SkinConcernSummary[]) =>
  ({ topConcerns: findings } as Pick<SkinState, 'topConcerns'>);

const base = {
  routineMorning: [] as string[],
  routineEvening: [] as string[],
  confirmedGotAt: {} as Record<string, string>,
  now: NOW,
};

// ── 1. notScanned ───────────────────────────────────────────────────────────
console.log('\n— Empty state (no scan) —');
{
  const m = buildSkinShop({ ...base, skinState: null });
  check('status is notScanned', m.status === 'notScanned');
  check('no picks', m.picks.length === 0);
  check('no concerns', m.concerns.length === 0);
  check('no collection', m.collection.length === 0);
  check('no featuredRestock', m.featuredRestock === null);
  check('honesty flags still present', !!m.honesty.worksWithoutBuying && !!m.honesty.affiliateDisclosure);
}

// ── 2. picks derive from findings; clearing a finding changes them ───────────
console.log('\n— Picks derive from findings —');
{
  const both = buildSkinShop({ ...base, skinState: skin([finding('breakouts', 'high'), finding('redness', 'moderate')]) });
  const onlyRed = buildSkinShop({ ...base, skinState: skin([finding('redness', 'moderate')]) });

  check('picks exist for a scanned user', both.picks.length > 0);
  check('a breakouts pick exists when breakouts is a finding', both.picks.some((p) => p.echo.concern === 'breakouts'));
  check('a redness pick exists when redness is a finding', both.picks.some((p) => p.echo.concern === 'redness'));
  check('clearing breakouts removes all breakouts picks', onlyRed.picks.every((p) => p.echo.concern === 'redness'));
  const bothIds = both.picks.map((p) => p.product.id).sort().join(',');
  const redIds = onlyRed.picks.map((p) => p.product.id).sort().join(',');
  check('changing the findings changes the picks', bothIds !== redIds, `${bothIds} vs ${redIds}`);
  check('every pick is tied to a finding id', both.picks.every((p) => !!p.forFindingId && p.forFindingId === p.echo.findingId));
  check('tight set per finding (≤ 3 each)', maxPerFinding(both.picks) <= 3, `max=${maxPerFinding(both.picks)}`);
  check('every pick has ONE plain why-line tied to its finding', both.picks.every((p) => /^For the /.test(p.whyLine)));
}

// ── 3. finding-echo data (tint + strength) ──────────────────────────────────
console.log('\n— Finding-echo data —');
{
  const m = buildSkinShop({ ...base, skinState: skin([finding('breakouts', 'high'), finding('redness', 'mild')]) });
  check('every pick exposes a tint hex', m.picks.every((p) => /^#[0-9A-Fa-f]{6}$/.test(p.echo.tintHex)));
  check('every pick exposes a strength in [0,1]', m.picks.every((p) => p.echo.strength >= 0 && p.echo.strength <= 1));
  check('every pick exposes its tint family (metric)', m.picks.every((p) => typeof p.echo.metric === 'string' && p.echo.metric.length > 0));
  check('high-severity finding has greater strength than mild', strengthOf(m, 'breakouts') > strengthOf(m, 'redness'));
}

// ── 4. ranking is FIT-based, price-BLIND ────────────────────────────────────
console.log('\n— Price-blind ranking —');
{
  const st = skin([finding('breakouts', 'high'), finding('dark_marks', 'moderate'), finding('redness', 'moderate')]);
  const real = buildSkinShop({ ...base, skinState: st });
  // Invert price MAGNITUDE (keep tier — tier is the honest budget path, not a
  // commission lever) and reverse array order; picks must be identical.
  const scrambled = [...COMMERCE_CATALOG].reverse().map((s) => ({ ...s, priceUsd: 1000 - s.priceUsd }));
  const shuffled = buildSkinShop({ ...base, skinState: st, catalog: scrambled });
  const a = real.picks.map((p) => p.product.id).join('>');
  const b = shuffled.picks.map((p) => p.product.id).join('>');
  check('pick identity + order invariant under price reshuffle', a === b, `${a} vs ${b}`);
}

// ── 5. collection reflects the kept routine ─────────────────────────────────
console.log('\n— Collection = kept routine —');
{
  const m = buildSkinShop({
    ...base,
    skinState: skin([finding('breakouts', 'high')]),
    routineMorning: ['cerave-hydrating-cleanser'],
    routineEvening: ['paulas-choice-2-bha'],
  });
  check('collection holds exactly the kept ids', sameSet(m.collection.map((c) => c.product.id), ['cerave-hydrating-cleanser', 'paulas-choice-2-bha']));
  check('every collection item has a reorder url', m.collection.every((c) => /^https?:\/\//.test(c.reorderUrl)));
  check('morning vs evening slot is tracked', m.collection.find((c) => c.product.id === 'cerave-hydrating-cleanser')?.slot === 'morning');
}

// ── 6. restock real ONLY with confirmed date + lifespan; NEVER faked ─────────
console.log('\n— Restock honesty —');
{
  const noConfirm = buildSkinShop({
    ...base,
    skinState: skin([finding('breakouts', 'high')]),
    routineEvening: ['paulas-choice-2-bha'],
  });
  check('no confirmation → restock NOT real', noConfirm.collection.every((c) => c.restock.isReal === false));
  check('no confirmation → restockSoon false', noConfirm.collection.every((c) => c.restock.restockSoon === false));
  check('no confirmation → daysLeft null', noConfirm.collection.every((c) => c.restock.daysLeft === null));
  check('no confirmation → featuredRestock null', noConfirm.featuredRestock === null);

  const life = typicalLifespanDays({ id: 'paulas-choice-2-bha', step: 'treat' }); // 60
  const overdue = buildSkinShop({
    ...base,
    skinState: skin([finding('breakouts', 'high')]),
    routineEvening: ['paulas-choice-2-bha'],
    confirmedGotAt: { 'paulas-choice-2-bha': isoDaysAgo(80) },
  });
  const od = overdue.collection.find((c) => c.product.id === 'paulas-choice-2-bha')!;
  check('confirmed + past lifespan → restock real', od.restock.isReal === true);
  check('confirmed + past lifespan → restockSoon true', od.restock.restockSoon === true);
  check('daysLeft computed from real lifespan', od.restock.daysLeft === life - 80, `daysLeft=${od.restock.daysLeft}`);
  check('featuredRestock = the most-due item', overdue.featuredRestock?.product.id === 'paulas-choice-2-bha');

  const fresh = buildSkinShop({
    ...base,
    skinState: skin([finding('breakouts', 'high')]),
    routineEvening: ['paulas-choice-2-bha'],
    confirmedGotAt: { 'paulas-choice-2-bha': isoDaysAgo(5) },
  });
  const fr = fresh.collection.find((c) => c.product.id === 'paulas-choice-2-bha')!;
  check('confirmed but fresh → real but NOT soon', fr.restock.isReal === true && fr.restock.restockSoon === false);
  check('fresh featuredRestock null', fresh.featuredRestock === null);
}

// ── 7. dead links hidden ────────────────────────────────────────────────────
console.log('\n— Link health —');
{
  const dead = (id: string) => id === 'paulas-choice-2-bha';
  const m = buildSkinShop({
    ...base,
    skinState: skin([finding('breakouts', 'high')]),
    routineEvening: ['paulas-choice-2-bha'],
    isDead: dead,
  });
  check('dead product never appears as a pick', m.picks.every((p) => p.product.id !== 'paulas-choice-2-bha'));
  check('dead product never appears as a budget alt', m.picks.every((p) => p.budgetAlternative?.id !== 'paulas-choice-2-bha'));
  check('dead product hidden from the collection', m.collection.every((c) => c.product.id !== 'paulas-choice-2-bha'));
}

// ── 8. concern filter ───────────────────────────────────────────────────────
console.log('\n— Concern filter —');
{
  const m = buildSkinShop({ ...base, skinState: skin([finding('breakouts', 'high'), finding('redness', 'moderate')]) });
  check('concerns exposed in scan language', sameSet(m.concerns.map((c) => c.label), ['Breakouts', 'Redness']));
  check('filter returns only the relevant concern', m.filterPicksByConcern('redness').every((p) => p.echo.concern === 'redness'));
  check('filter(all) returns every pick', m.filterPicksByConcern('all').length === m.picks.length);
  check('a concern with picks reports a non-zero count', m.concerns.every((c) => c.count === m.picks.filter((p) => p.echo.concern === c.concern).length));
}

// ── 9. evolution: improved finding → less needed now ────────────────────
console.log('\n— Evolution —');
{
  const improved = buildSkinShop({ ...base, skinState: skin([finding('breakouts', 'high', { direction: 'better' })]) });
  check('improved finding → picks lessNeededNow', improved.picks.length > 0 && improved.picks.every((p) => p.lessNeededNow === true));
  check('improved finding → label softened to skippable', improved.picks.every((p) => p.label === 'skippable'));
  const worse = buildSkinShop({ ...base, skinState: skin([finding('breakouts', 'high', { direction: 'worse' })]) });
  check('worsening finding → NOT lessNeededNow', worse.picks.every((p) => p.lessNeededNow === false));
}

// ── 10. budget alternative ──────────────────────────────────────────────────
console.log('\n— Budget alternative —');
{
  const m = buildSkinShop({ ...base, skinState: skin([finding('breakouts', 'high'), finding('redness', 'moderate')]) });
  const nonBudget = m.picks.filter((p) => p.product.priceTier !== 'budget');
  check('there is at least one non-budget pick to test', nonBudget.length > 0);
  check('every non-budget pick offers a budget alternative', nonBudget.every((p) => p.budgetAlternative !== null && p.budgetAlternative.priceTier === 'budget'));
  check('a budget pick offers no redundant alternative', m.picks.filter((p) => p.product.priceTier === 'budget').every((p) => p.budgetAlternative === null));
}

// ── helpers ─────────────────────────────────────────────────────────────────
function maxPerFinding(picks: { forFindingId: string }[]): number {
  const counts = new Map<string, number>();
  for (const p of picks) counts.set(p.forFindingId, (counts.get(p.forFindingId) ?? 0) + 1);
  return Math.max(0, ...counts.values());
}
function strengthOf(m: { picks: { echo: { concern: string; strength: number } }[] }, concern: string): number {
  return m.picks.find((p) => p.echo.concern === concern)?.echo.strength ?? -1;
}
function sameSet(a: string[], b: string[]): boolean {
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && [...sa].every((x) => sb.has(x));
}

// ── summary ─────────────────────────────────────────────────────────────────
console.log(`\n${fail === 0 ? '✅' : '❌'} verifySkinShop: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  • ${f}`);
  process.exit(1);
}

/**
 * verifyMoneyEngine — proves the recommendation engine's honesty rules hold
 * IN CODE (money flow step 1). Run: npx tsx scripts/verifyMoneyEngine.ts
 *
 * R1 fit-ranked, price-blind (invariance under price reassignment)
 * R2 budget alternative always offered (or pick is already budget)
 * R3 calibrated labels incl. honest "skippable"
 * R4 owned steps skipped, never re-sold
 * R5 beginner ≤ 1 real active
 * R6 SPF always in the routine
 * + catalog integrity, jargon ban in user-facing copy, schema ties to findings.
 */

import { COMMERCE_CATALOG, catalogBudgetCoverage } from '../src/commerce/catalog';
import { buildRecommendation, engineFindingsFromSkinRead, fitScore } from '../src/commerce/engine';
import type { CommerceSku, EngineFinding, EngineInput } from '../src/commerce/types';
import { normalizeSkinRead } from '../src/screens/scan/firstFinding/normalizeSkinRead';

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

const f = (id: string, metric: EngineFinding['metric'], level: EngineFinding['level'], regionPhrase = 'your cheeks'): EngineFinding =>
  ({ id, metric, level, regionPhrase });

const T = (depth: 'essentials' | 'full' | 'choose' = 'essentials', ownedSteps: EngineInput['tailoring']['ownedSteps'] = []) =>
  ({ depth, ownedSteps });

console.log('\n— Catalog integrity —');
check(`~40 SKUs (got ${COMMERCE_CATALOG.length})`, COMMERCE_CATALOG.length >= 38);
for (const seed of ['cerave-hydrating-cleanser', 'boj-relief-sun', 'kiehls-ultra-facial', 'paulas-choice-2-bha']) {
  check(`seed product present: ${seed}`, COMMERCE_CATALOG.some((s) => s.id === seed));
}
const cover = catalogBudgetCoverage();
for (const step of ['cleanse', 'treat', 'moisturize', 'protect']) {
  check(`budget coverage for ${step} (${cover[step] ?? 0})`, (cover[step] ?? 0) >= 1);
}
check('every SKU has affiliateUrl + price + blurb',
  COMMERCE_CATALOG.every((s) => s.affiliateUrl.startsWith('https://') && s.priceUsd > 0 && s.blurb.length > 10));
const JARGON = /\b(barrier|sebum|actives?\b|exfoliant|t-zone|erythema|hyperpigmentation)\b/i;
check('no jargon in any blurb', COMMERCE_CATALOG.every((s) => !JARGON.test(s.blurb)),
  COMMERCE_CATALOG.filter((s) => JARGON.test(s.blurb)).map((s) => s.id).join(','));
// Image requires resolve to asset ids under Metro only (tsx sees null), so
// packshot coverage is asserted against the catalog SOURCE + files on disk.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const catalogSrc = readFileSync(join(__dirname, '../src/commerce/catalog.ts'), 'utf8');
const imageRefs = [...catalogSrc.matchAll(/require\('\.\.\/\.\.\/(assets\/[^']+)'\)/g)].map((m) => m[1]);
check(`≥10 SKUs ship a real packshot image (${imageRefs.length} refs)`, imageRefs.length >= 10);
check('every referenced packshot file exists on disk',
  imageRefs.every((p) => existsSync(join(__dirname, '..', p))),
  imageRefs.filter((p) => !existsSync(join(__dirname, '..', p))).join(','));

console.log('\n— R1: fit-ranked, price-blind —');
const redness: EngineInput = { findings: [f('f1', 'redness', 'a lot')], tailoring: T(), beginner: true };
const baseSet = buildRecommendation(redness);
const pricesOne: CommerceSku[] = COMMERCE_CATALOG.map((s) => ({ ...s, priceUsd: 1 }));
const prices999: CommerceSku[] = COMMERCE_CATALOG.map((s) => ({ ...s, priceUsd: 999 }));
const idsOf = (set: ReturnType<typeof buildRecommendation>) => set.slots.map((s) => s.pick?.sku.id ?? 'none').join('|');
check('picks identical when every price = $1', idsOf(buildRecommendation(redness, pricesOne)) === idsOf(baseSet));
check('picks identical when every price = $999', idsOf(buildRecommendation(redness, prices999)) === idsOf(baseSet));
const treatPick = baseSet.slots.find((s) => s.step === 'treat')?.pick;
check('redness treat pick actually addresses redness',
  !!treatPick && treatPick.sku.concerns.includes('redness'), treatPick?.sku.id);
const rednessSkus = COMMERCE_CATALOG.filter((s) => s.step === 'treat' && s.concerns.includes('redness'));
check('treat pick is the max-fit candidate (not the priciest)',
  !!treatPick && rednessSkus.every((s) => fitScore(s, redness.findings) <= fitScore(treatPick.sku, redness.findings)));

console.log('\n— Depth genuinely diverges (no inert choices) —');
const twoConcern = (depth: 'essentials' | 'full' | 'choose') =>
  buildRecommendation({ findings: [f('h', 'redness', 'a lot'), f('s', 'dark_marks', 'some')], tailoring: T(depth), beginner: false });
const treatCount = (set: ReturnType<typeof buildRecommendation>) => set.slots.filter((s) => s.step === 'treat').length;
const essTreats = treatCount(twoConcern('essentials'));
const fullTreats = treatCount(twoConcern('full'));
const chooseTreats = treatCount(twoConcern('choose'));
check("'full' adds a second treat 'essentials' does not (depths are not the same output)", fullTreats > essTreats,
  `essentials=${essTreats} full=${fullTreats}`);
check("'choose' shows the COMPLETE set like 'full' — it is NOT a silent clone of 'essentials'", chooseTreats === fullTreats && chooseTreats > essTreats,
  `choose=${chooseTreats} full=${fullTreats} essentials=${essTreats}`);

console.log('\n— R2: budget alternative always —');
for (const set of [baseSet, buildRecommendation({ findings: [f('f1', 'dark_marks', 'some'), f('f2', 'dryness', 'a little')], tailoring: T('full') })]) {
  for (const slot of set.slots) {
    if (slot.skippedBecauseOwned || !slot.pick) continue;
    check(`${slot.step}: budget pick or budget alternative`,
      slot.pick.sku.priceTier === 'budget' || !!slot.budgetAlternative,
      `pick=${slot.pick.sku.id}`);
    if (slot.budgetAlternative) {
      check(`${slot.step}: alternative is genuinely budget tier`, slot.budgetAlternative.sku.priceTier === 'budget');
    }
  }
}

console.log('\n— R3: calibrated labels —');
const oily = buildRecommendation({ findings: [f('f1', 'oil', 'some')], tailoring: T() });
check("oil-only profile → moisturize is 'skippable' (you can skip this for now)",
  oily.slots.find((s) => s.step === 'moisturize')?.label === 'skippable');
const mild = buildRecommendation({ findings: [f('f1', 'redness', 'a little')], tailoring: T() });
check("'a little' hero finding → treat is 'optional', not oversold",
  mild.slots.find((s) => s.step === 'treat')?.label === 'optional');
check("strong finding → treat is 'good_match'",
  baseSet.slots.find((s) => s.step === 'treat')?.label === 'good_match');

console.log('\n— R4: owned steps skipped —');
const owns = buildRecommendation({ findings: [f('f1', 'redness', 'some')], tailoring: T('essentials', ['cleanse']) });
const ownedSlot = owns.slots.find((s) => s.step === 'cleanse');
check('owned cleanse → skippedBecauseOwned, nothing sold', !!ownedSlot?.skippedBecauseOwned && ownedSlot.pick === null);
check('owned cleanse still appears in the plan (the routine tells them)', !!ownedSlot);

console.log('\n— R5: beginner active cap —');
const heavy: EngineInput = {
  findings: [f('f1', 'dark_marks', 'a lot'), f('f2', 'breakouts', 'a lot')],
  tailoring: T('full'),
  beginner: true,
};
const beginnerSet = buildRecommendation(heavy);
check(`beginner gets ≤1 real active (got ${beginnerSet.activeCount})`, beginnerSet.activeCount <= 1);
const expert = buildRecommendation({ ...heavy, beginner: false });
check('non-beginner is allowed more', expert.activeCount >= beginnerSet.activeCount);

console.log('\n— R6: SPF always —');
for (const [name, input] of [
  ['redness', redness],
  ['no findings at all', { findings: [], tailoring: T() }],
  ['oil-only', { findings: [f('f1', 'oil', 'some')], tailoring: T() }],
] as const) {
  const set = buildRecommendation(input as EngineInput);
  const spf = set.slots.find((s) => s.step === 'protect');
  check(`SPF present with a pick (${name})`, !!spf?.pick);
  check(`SPF is good_match, never skippable (${name})`, spf?.label === 'good_match');
}
const ownsSpf = buildRecommendation({ findings: [], tailoring: T('essentials', ['protect']) });
check('owned SPF → step still in plan, just not re-sold',
  !!ownsSpf.slots.find((s) => s.step === 'protect')?.skippedBecauseOwned);

console.log('\n— Schema ties to findings + structure —');
const why = baseSet.slots.find((s) => s.step === 'treat')?.pick?.whyLine ?? '';
check(`treat why-line ties to the finding ("${why}")`, /redness/.test(why) && /cheeks/.test(why));
check('treat slot carries the finding id', baseSet.slots.find((s) => s.step === 'treat')?.pick?.findingIds.includes('f1') === true);
check('essentials flagged (cleanse+treat+protect)',
  ['cleanse', 'treat', 'protect'].every((st) => baseSet.slots.find((s) => s.step === st)?.essential === true));
check('protect is AM-only in the day split',
  baseSet.am.some((s) => s.step === 'protect') && !baseSet.pm.some((s) => s.step === 'protect'));
const pmTreat = buildRecommendation({ findings: [f('f1', 'breakouts', 'a lot')], tailoring: T() });
check('PM-only treat (BHA) lands in the PM list',
  pmTreat.pm.some((s) => s.step === 'treat'), pmTreat.slots.find((s) => s.step === 'treat')?.pick?.sku.id);
check('no jargon in any why-line',
  [baseSet, oily, mild, beginnerSet].every((set) => set.slots.every((s) => !s.pick || !JARGON.test(s.pick.whyLine))));

console.log('\n— Adapter: raw AI read → REAL normalizer → engine findings —');
// Exercises the production pipeline end-to-end: a raw model payload through the
// canonical normalizer (the same one screens 1–2 trust), then the adapter.
const { read: normalized } = normalizeSkinRead({
  opening_line: 'Your skin looks mostly calm — one thing stood out.',
  findings: [
    {
      name: 'A little redness',
      what_i_see: 'Your cheeks look a touch warmer and pinker than the rest of your face.',
      level: 'some',
      spots: [
        { place: 'left cheek', strength: 0.6, size: 0.25 },
        { place: 'right cheek', strength: 0.4, size: 0.2 },
      ],
      what_it_means: 'Skin that warms up like this is usually just a bit sensitive that day.',
      do_this: 'Tonight, wash with something gentle and skip anything that tingles.',
      how_sure: 'pretty sure',
    },
  ],
  good_things: ['Even tone across your forehead'],
  photo_check: { clear: true, whole_face_shown: true, better_photo_would_help: false },
  sure_level: 'pretty sure',
});
check('raw read normalizes to a SkinRead', !!normalized);
const adapted = normalized ? engineFindingsFromSkinRead(normalized) : [];
check(`normalized read adapts to ${adapted.length} engine findings (>0)`, adapted.length > 0);
check('adapted findings carry region phrases', adapted.some((a) => a.regionPhrase.length > 0));
const fromFixture = buildRecommendation({ findings: adapted, tailoring: T('full') });
check('full set builds from the REAL normalized findings', fromFixture.slots.length >= 4 && !!fromFixture.slots.find((s) => s.step === 'protect')?.pick);
const fxWhy = fromFixture.slots.find((s) => s.step === 'treat')?.pick?.whyLine ?? '';
check(`pipeline why-line ties to the real region ("${fxWhy}")`, /redness/.test(fxWhy) && /cheek/.test(fxWhy));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('FAILURES:\n  - ' + failures.join('\n  - '));
  process.exit(1);
}
console.log('MONEY ENGINE: ALL HONESTY RULES HOLD.');

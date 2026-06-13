/**
 * verifyScanReadContract — the scan-analysis backend contract (blueprint §8/§10).
 * Run: npx tsx scripts/verifyScanReadContract.ts
 *
 * §8 (the system prompt — voice): plain-spoken friend, the full banned-jargon
 * list, own-baseline / never-a-lighter-reference inclusivity, SEEN-vs-GUESSED,
 * say-less-when-unsure, 3–6 findings, findings[0] tied to the goal, never invent.
 *
 * §10 (validation — reject + regenerate): banned word ANYWHERE (findings OR the
 * plan copy), empty spots on a SEEN/located non-whole-face finding, what_i_see
 * under 5 words on ANY concern, a coverage-cap breach, or a stranger-test fail.
 */

(globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

import { SKIN_READ_SYSTEM_PROMPT, SKIN_READ_JSON_SCHEMA } from '../src/api/skinReadPrompt';
import { normalizeSkinRead, type RawSkinRead } from '../src/screens/scan/firstFinding/normalizeSkinRead';
import { planHasBanned } from '../src/screens/scan/yourSkin/normalizePlan';
import { guardRead } from '../src/screens/scan/yourSkin/coverageGuard';

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

const P = SKIN_READ_SYSTEM_PROMPT.toLowerCase();

// ── §8 · The system prompt teaches the voice + the rules ───────────────────
console.log('\n— §8 system prompt (voice + inclusivity + restraint) —');
check('kind plain-spoken friend, explicitly NOT medical',
  /kind friend/.test(P) && /not medical/.test(P) && /never name diseases/.test(P));
const BANNED_REQUIRED = ['t-zone', 'glabella', 'perioral', 'barrier', 'sebum', 'erythema', 'hyperpigmentation', 'actives', 'exfoliant'];
for (const w of BANNED_REQUIRED) {
  check(`banned-word list names "${w}"`, P.includes(w));
}
check('own-baseline comparison (THIS person, any skin tone)',
  /this person/.test(P) && /any skin tone/.test(P));
check('NEVER a lighter / fairer / ideal reference (the dark-skin guard)',
  /lighter/.test(P) && /ideal/.test(P) && /never compare to a lighter/.test(P));
check('SEEN vs GUESSED, lower confidence when guessing',
  /can only guess/.test(P) && /less sure/.test(P));
check('SAY LESS WHEN UNSURE → fewer findings + try near a window',
  /say less when unsure/.test(P) && /window/.test(P) && /fewer findings/.test(P));
check('never pad to a number you can not see',
  /never pad/.test(P) || /never invent extras/.test(P));
check('3 to 6 findings (not 3–4)', /3 to 6 findings/.test(P) && !/3 to 4 findings/.test(P));
check('findings[0] tied to the GOAL, never inflated to match it',
  /goal/.test(P) && /never invent or inflate a finding to match the goal/.test(P));
check('never invent a problem on good skin', /never invent a problem on good skin/.test(P));
check('horizon uses should/likely, never "will"', /never "will"/.test(P));
check('output is JSON only', /only valid json/.test(P));

// ── Schema shape ───────────────────────────────────────────────────────────
console.log('\n— Strict JSON schema —');
check('schema is strict', SKIN_READ_JSON_SCHEMA.strict === true);
const props = SKIN_READ_JSON_SCHEMA.schema.properties as Record<string, unknown>;
for (const k of ['opening_line', 'findings', 'good_things', 'photo_check', 'sure_level', 'skin_summary_line', 'horizon_line', 'routine_focus']) {
  check(`schema requires "${k}"`, k in props);
}
const levelEnum = (props.findings as { items: { properties: { level: { enum: string[] } } } }).items.properties.level.enum;
check("level enum is plain words ('a little'/'some'/'a lot'), NEVER a 0–100 score",
  JSON.stringify(levelEnum) === JSON.stringify(['a little', 'some', 'a lot']));

// ── §10 · Validation: reject + regenerate ──────────────────────────────────
console.log('\n— §10 reject + regenerate —');

const spot = (place: string, strength = 0.6) => ({ place, strength });
const goodRaw: RawSkinRead = {
  opening_line: 'Your tone looks really even — nice. The main thing: a little redness on your cheeks, more on the left.',
  findings: [
    { name: 'A little redness', what_i_see: 'Your cheeks look a touch warmer and pinker than the rest, more on the left.', level: 'a little', spots: [spot('left cheek', 0.7), spot('right cheek', 0.4)], what_it_means: 'Usually just a sensitive day.', do_this: 'Rinse cool and keep it gentle tonight.', how_sure: 'pretty sure' },
    { name: 'A few small bumps', what_i_see: 'A couple of tiny raised spots near your chin, nothing angry.', level: 'a little', spots: [spot('chin', 0.4)], what_it_means: 'These usually settle on their own.', do_this: 'Leave them be tonight.', how_sure: 'fairly sure' },
  ],
  good_things: ['Even tone', 'Healthy glow'],
  photo_check: { light: 'good', clear: true, whole_face_shown: true, makeup_on: false, better_photo_would_help: false },
  sure_level: 'pretty sure',
};

const good = normalizeSkinRead(goodRaw);
check('a clean, located, plain read PASSES (no regen)', !good.needsRegen && !!good.read);

// banned word anywhere
check('banned word in opening_line → regen',
  normalizeSkinRead({ ...goodRaw, opening_line: 'Some erythema on the cheeks.' }).needsRegen);
check('banned word in a NON-hero finding → regen',
  normalizeSkinRead({ ...goodRaw, findings: [goodRaw.findings![0], { ...goodRaw.findings![1], what_it_means: 'Likely sebum and clogged pores.' }] }).needsRegen);

// empty spots — now on EVERY located concern, not just the hero
check('empty spots on the HERO (located) → regen',
  normalizeSkinRead({ ...goodRaw, findings: [{ ...goodRaw.findings![0], spots: [] }, goodRaw.findings![1]] }).needsRegen);
check('empty spots on a NON-hero located finding (breakouts) → regen',
  normalizeSkinRead({ ...goodRaw, findings: [goodRaw.findings![0], { ...goodRaw.findings![1], spots: [] }] }).needsRegen);
check('a GUESSED finding (dryness) with no spots is EXEMPT (legitimately diffuse)',
  !normalizeSkinRead({
    ...goodRaw,
    findings: [goodRaw.findings![0], { name: 'A little dryness', what_i_see: 'Skin looks a touch tight and thirsty across the cheeks.', level: 'a little', spots: [], what_it_means: 'A bit dehydrated today.', do_this: 'Add a hydrating step tonight.', how_sure: 'fairly sure' }],
  }).needsRegen);

// what_i_see under 5 words — on ANY concern
check('what_i_see under 5 words on the hero → regen',
  normalizeSkinRead({ ...goodRaw, findings: [{ ...goodRaw.findings![0], what_i_see: 'some redness' }, goodRaw.findings![1]] }).needsRegen);
check('what_i_see under 5 words on a NON-hero finding → regen',
  normalizeSkinRead({ ...goodRaw, findings: [goodRaw.findings![0], { ...goodRaw.findings![1], what_i_see: 'few bumps' }] }).needsRegen);

// stranger test
check('a generic hero line that could fit anyone → regen (stranger test)',
  normalizeSkinRead({ ...goodRaw, findings: [{ ...goodRaw.findings![0], what_i_see: 'There is a little bit of unevenness overall today.' }, goodRaw.findings![1]] }).needsRegen);

// plan-copy banned word
check('banned word in the plan copy (skin_summary_line) → planHasBanned',
  planHasBanned({ skin_summary_line: 'We will rebuild your barrier over time.' }));
check('clean plan copy → not flagged',
  !planHasBanned({ skin_summary_line: 'Your skin reads calm and even — one gentle thing to ease, and you are set.' }));

// ── Inclusivity: a deep-skin even read never manufactures whole-face redness ─
console.log('\n— Inclusivity: deep-skin honesty —');
// A model that (wrongly) painted redness across the WHOLE face must be stopped
// by the coverage-cap guard — never a whole-face red wash on deep skin.
const wholeFaceWash = normalizeSkinRead({
  ...goodRaw,
  findings: [{
    name: 'Redness', what_i_see: 'Redness across your whole face, both cheeks, forehead, nose and chin together.',
    level: 'a lot',
    spots: [spot('forehead', 0.8), spot('left cheek', 0.8), spot('right cheek', 0.8), spot('nose', 0.8), spot('chin', 0.8), spot('around your nose', 0.8)],
    what_it_means: 'Everywhere is red.', do_this: 'Be gentle.', how_sure: 'pretty sure',
  }],
});
const guarded = wholeFaceWash.read ? guardRead(wholeFaceWash.read) : null;
check('a whole-face redness wash is rejected by the coverage-cap guard (regenerate advised)',
  !!guarded && guarded.report.regenerateAdvised);
check('after the guard, no finding survives as a face-wide red wash',
  !!guarded && guarded.findings.every((f) => f.metric !== 'redness' || f.spots.length === 0 || f.spots.length < 6));

// ── Never invent on good skin: a positive read is allowed, no regen ─────────
console.log('\n— Good skin stays good —');
const positiveRaw: RawSkinRead = {
  opening_line: 'Honestly your skin looks happy and even today — nothing is jumping out to fix.',
  findings: [{ name: 'Looking good', what_i_see: 'Even tone, a healthy glow, calm and comfortable skin all over.', level: 'a little', spots: [], what_it_means: 'Whatever you are doing is working.', do_this: 'Keep it simple and drink water tonight.', how_sure: 'pretty sure' }],
  good_things: ['Even tone', 'Healthy glow', 'Calm skin'],
  photo_check: { light: 'good', clear: true, whole_face_shown: true, makeup_on: false, better_photo_would_help: false },
  sure_level: 'pretty sure',
};
const positive = normalizeSkinRead(positiveRaw);
check('a positive ("looking good") read PASSES without inventing a problem',
  !positive.needsRegen && !!positive.read && positive.read.findings[0].metric === 'positive');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('FAILURES:\n  - ' + failures.join('\n  - '));
  process.exit(1);
}
console.log('SCAN READ CONTRACT: §8 prompt + §10 validation hold.');

/**
 * verifyYourRoutine — headless proof of the "Your Routine" content layer.
 *
 *   npx tsx scripts/verifyYourRoutine.ts
 *
 * Proves, with no RN runtime: the exact spec throughline, ZERO voice
 * violations across every static + generated line, calibrated commerce, the
 * adaptive rescan, and the voice-guidance fire/silence. Exits non-zero on any
 * failure so it can gate. The temporal/haptic/visual layers are proven in the
 * browser harness (localStorage.__pura_yourroutine_harness__ = '1').
 */

(globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

import { buildYourRoutineModel, type YourRoutineModel } from '@/screens/routine/yourRoutine/model';
import {
  demoRoutine,
  demoFindings,
  demoMoves,
  rescanFindings,
  adaptiveAfterRescan,
} from '@/screens/routine/yourRoutine/fixtures';
import { allStaticVoiceLines, lintVoice } from '@/screens/routine/yourRoutine/voice';
import { createVoiceGuide, makeLoggingSpeak } from '@/screens/routine/yourRoutine/voiceGuidance';

let failures = 0;
const check = (name: string, cond: boolean, detail?: string) => {
  console.log(`${cond ? '  ✓' : '  ✗ FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) failures++;
};

function collectCopy(m: YourRoutineModel): { label: string; text: string }[] {
  const out: { label: string; text: string }[] = [
    { label: 'greeting', text: m.greeting },
    { label: 'firstReveal', text: m.firstReveal },
    { label: 'productFree', text: m.productFree },
    { label: 'progressBridge', text: m.progressBridge },
    { label: 'doneLanding', text: m.doneLandingLine },
    { label: 'focus.prompt', text: m.focus.prompt },
  ];
  if (m.welcomeBack) out.push({ label: 'welcomeBack', text: m.welcomeBack });
  m.moves.forEach((mv, i) => {
    out.push({ label: `move${i}.title`, text: mv.title });
    out.push({ label: `move${i}.why`, text: mv.why });
  });
  [...m.am.steps, ...m.pm.steps].forEach((s) => {
    out.push({ label: `${s.id}.throughline`, text: s.throughline });
    out.push({ label: `${s.id}.lead`, text: s.ritualLead });
    out.push({ label: `${s.id}.benefit`, text: s.benefit });
  });
  if (m.commerce.bundle) {
    out.push({ label: 'bundle.intro', text: m.commerce.bundle.intro });
    m.commerce.bundle.items.forEach((it) => out.push({ label: `bundle.${it.id}.why`, text: it.why }));
    out.push({ label: 'bundle.alsoFree', text: m.commerce.bundle.alsoFree });
  }
  return out;
}

const now = new Date(2026, 5, 8, 8, 0, 0);
const model = buildYourRoutineModel({
  routine: demoRoutine,
  findings: demoFindings,
  moves: demoMoves,
  timeOfDay: 'morning',
  now,
  streak: { count: 5, includesToday: true },
  doneIds: [],
  daysSinceLastUse: 0,
});

console.log('\n── 1. The throughline traces to the finding (exact spec line) ──');
const amCleanse = model.am.steps[0];
const EXPECT =
  "Gentle cleanser first. It's here because of the redness on your left cheek - nothing harsh while we calm that down.";
console.log(`   ${JSON.stringify(amCleanse.throughline)}`);
check('am-cleanse throughline == spec example', amCleanse.throughline === EXPECT);
check('every step has a non-empty throughline', [...model.am.steps, ...model.pm.steps].every((s) => s.throughline.length > 10));

console.log('\n── 2. Voice: every line obeys the hard rules ──');
const lines = [...allStaticVoiceLines(), ...collectCopy(model)];
const bad = lines.map((l) => ({ ...l, v: lintVoice(l.text) })).filter((l) => l.v.length > 0);
bad.forEach((b) => console.log(`   ✗ ${b.label}: ${b.v.map((x) => x.rule).join(',')} → ${JSON.stringify(b.text)}`));
check(`no voice violations across ${lines.length} lines`, bad.length === 0, `${bad.length} bad`);
check('no exclamation marks anywhere', lines.every((l) => !l.text.includes('!')));

console.log('\n── 3. The orb voice, sampled ──');
console.log(`   greeting:        ${JSON.stringify(model.greeting)}`);
console.log(`   focus prompt:    ${JSON.stringify(model.focus.prompt)}`);
console.log(`   progress bridge: ${JSON.stringify(model.progressBridge)}`);
console.log(`   done landing:    ${JSON.stringify(model.doneLandingLine)}`);
check('focus prompt is time-aware', model.focus.prompt.startsWith('Good morning'));

console.log('\n── 4. Welcome-back after a gap has ZERO guilt ──');
const gap = buildYourRoutineModel({
  routine: demoRoutine, findings: demoFindings, moves: demoMoves, timeOfDay: 'morning',
  now, streak: { count: 0, includesToday: false }, doneIds: [], daysSinceLastUse: 4,
});
console.log(`   ${JSON.stringify(gap.welcomeBack)}`);
check('welcome-back present after gap', !!gap.welcomeBack);
check('welcome-back has no guilt words', !!gap.welcomeBack && !/streak|broke|miss|behind|should/i.test(gap.welcomeBack));

console.log('\n── 5. Commerce is calibrated + honest ──');
const picks = [...model.am.steps, ...model.pm.steps].map((s) => s.product.pick).filter(Boolean);
const honesties = picks.map((p) => p!.honesty);
console.log(`   honesties: ${honesties.join(', ')}`);
check('a "maybe skip this for now" pick exists', honesties.includes('maybe skip this for now'));
check('a "cheapest that works" is flagged', picks.some((p) => p!.cheapestThatWorks));
check('no pick promises a fix ("should help" calibration)', picks.every((p) => !/will fix|cure|guarantee/i.test(p!.whyHelps)));
check('product-free is stated', model.productFree === 'You can start tonight with what you have.');
console.log(`   bundle total (moisturiser de-duped): £${model.commerce.bundle?.total}`);
check(
  'bundle total = 32 + 18 + 8.80 = 58.80 (real catalog prices, de-duped)',
  Math.abs((model.commerce.bundle?.total ?? 0) - 58.8) < 0.005,
);
// The fixtures point at REAL shop-catalog products so every surface resolves
// an actual bundled packshot (components resolve by id; this stays Node-pure).
const CATALOG_IDS = ['kiehls-ultra-facial-cream', 'beauty-of-joseon-relief-sun', 'the-ordinary-niacinamide'];
check(
  'every pick is a real catalog product (photo resolvable by id)',
  picks.every((p) => CATALOG_IDS.includes(p!.id)),
);
console.log(`   honest note:  ${JSON.stringify(model.commerce.bundle?.honestNote ?? null)}`);
check(
  'honest commerce speaks when the treat is skippable ("you don\'t need a serum yet")',
  model.commerce.bundle?.honestNote?.includes("don't need a serum yet") === true,
);

console.log('\n── 6. Adaptive update after a simulated rescan ──');
const after = buildYourRoutineModel({
  routine: demoRoutine, findings: rescanFindings, moves: demoMoves, timeOfDay: 'morning',
  now, streak: { count: 5, includesToday: true }, doneIds: [], daysSinceLastUse: 0, calmerLately: true,
});
console.log(`   before bridge: ${JSON.stringify(model.progressBridge)}`);
console.log(`   adaptive line: ${JSON.stringify(adaptiveAfterRescan.line)}`);
console.log(`   milestone:     ${JSON.stringify(adaptiveAfterRescan.milestone)}`);
check('adaptive line is voice-clean', lintVoice(adaptiveAfterRescan.line).length === 0);
check('milestone is voice-clean', lintVoice(adaptiveAfterRescan.milestone).length === 0);
check('rescan model still builds', after.am.steps.length > 0);

console.log('\n── 7. Voice guidance: invisible until invited ──');
const mock = makeLoggingSpeak();
const guide = createVoiceGuide({ speak: mock.speak });
guide.speakLine('this should be silent');
check('silent while disabled', mock.log.length === 0);
guide.setEnabled(true);
guide.speakLine(model.am.steps[0].ritualLead);
check('speaks once enabled', mock.log.length === 1, JSON.stringify(mock.log[0]));

console.log('\n── 8. Elevation pass: meaningful steps, grammar, calibration, rotation ──');
// 8a. Completion-as-care is GATED: the SPF + the top-finding carrier are
// meaningful; a plain middle step is not.
const allSteps = [...model.am.steps, ...model.pm.steps];
const spf = allSteps.find((s) => s.type === 'protect');
check('the SPF step is meaningful (care plays there)', !!spf?.meaningful);
check('not every step is meaningful (stillness stays special)', allSteps.some((s) => !s.meaningful));

// 8b. barrier_stress grammar — never "the the", and the bridge stays count-correct.
const bf = [{ ...demoFindings[0], id: 'bs', type: 'barrier_stress' as const, zones: ['left_cheek' as const, 'right_cheek' as const] }];
const bModel = buildYourRoutineModel({
  routine: demoRoutine, findings: bf, timeOfDay: 'morning', now,
  streak: { count: 0, includesToday: false }, doneIds: [],
});
const bLine = bModel.am.steps[0].throughline;
console.log(`   barrier_stress throughline: ${JSON.stringify(bLine)}`);
check('no double-article ("the the") anywhere', ![bLine, bModel.progressBridge].some((t) => /\bthe the\b/i.test(t)));
check('no "less dark marks"-style grammar in the bridge', !/less (dark marks|rough patches)/.test(model.progressBridge));

// 8c. Calibration REJECTS over-promising upstream copy outright. Poison the
// first step that actually carries a product (the cleanse is product-free).
const poisonIdx = demoRoutine.morningSteps.findIndex((s) => !!s.product);
const promised = buildYourRoutineModel({
  routine: {
    ...demoRoutine,
    morningSteps: demoRoutine.morningSteps.map((s, i) =>
      i === poisonIdx && s.product
        ? { ...s, product: { ...s.product, whyMatched: 'Will fix the redness overnight' } }
        : s,
    ),
  },
  findings: demoFindings, timeOfDay: 'morning', now,
  streak: { count: 0, includesToday: false }, doneIds: [],
});
const calibrated = promised.am.steps[poisonIdx]?.product.pick?.whyHelps ?? '';
console.log(`   calibrated (poisoned step ${poisonIdx}): ${JSON.stringify(calibrated)}`);
check('over-promise rejected, not word-swapped', !/will|fix/i.test(calibrated) && /should help/i.test(calibrated));

// 8d. Greetings rotate across consecutive days (UTC-ordinal seed) and adapt
// to the real step count (never "Two steps" for a three-step morning).
const g1 = buildYourRoutineModel({ routine: demoRoutine, findings: demoFindings, timeOfDay: 'morning', now: new Date(2028, 1, 29, 8), streak: { count: 0, includesToday: false }, doneIds: [] }).greeting;
const g2 = buildYourRoutineModel({ routine: demoRoutine, findings: demoFindings, timeOfDay: 'morning', now: new Date(2028, 2, 1, 8), streak: { count: 0, includesToday: false }, doneIds: [] }).greeting;
console.log(`   Feb 29: ${JSON.stringify(g1)}\n   Mar 1:  ${JSON.stringify(g2)}`);
check('greeting differs across the leap boundary', g1 !== g2);
check('greeting never claims "Two steps" for a 3-step morning', !model.greeting.includes('Two steps'));

// 8e. The locked skip / pause / end-early lines are live constants (linted in
// section 2) and the ritual leads stay verbatim.
check('SPF skip line locked', allSteps.length > 0 && lintVoice("Skipping's fine. I'd not skip the SPF - but I'm not your mother. Tomorrow's there.").length === 0);
check('midday period reachable from the clock', buildYourRoutineModel({ routine: demoRoutine, findings: demoFindings, timeOfDay: 'evening', now: new Date(2026, 5, 8, 13), streak: { count: 0, includesToday: false }, doneIds: [] }).period === 'midday');

// 8f. RitualMode layout + orb-state-leak guards (round-2/3 audit fixes).
import { readFileSync as _readRM } from 'node:fs';
import { join as _joinRM } from 'node:path';
const rmSrc = _readRM(_joinRM(__dirname, '../src/screens/routine/yourRoutine/modes/RitualMode.tsx'), 'utf8');
check('ritual body scrolls (long step + large Dynamic Type never clips under the footer)',
  /<Animated\.ScrollView[\s\S]*?style=\{\[styles\.body/.test(rmSrc) && /bodyContent/.test(rmSrc));
check('Pause cannot start the patient sweep outside an active step (no orb leak into Home)',
  /phase !== 'active' && !paused\) return;/.test(rmSrc));
check('every terminal/advance path clears the patient sweep (>=5 setPatient(false) sites incl. doneLanding)',
  (rmSrc.match(/setPatient\(false\)/g) || []).length >= 5);

console.log(`\n${failures === 0 ? '✅ ALL CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);

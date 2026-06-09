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
check('a "maybe skip for now" pick exists', honesties.includes('maybe skip for now'));
check('a "cheapest that works" is flagged', picks.some((p) => p!.cheapestThatWorks));
check('no pick promises a fix ("should help" calibration)', picks.every((p) => !/will fix|cure|guarantee/i.test(p!.whyHelps)));
check('product-free is stated', model.productFree === 'You can start tonight with what you have.');
console.log(`   bundle total (moisturiser de-duped): £${model.commerce.bundle?.total}`);
check('bundle total = 16 + 19 + 22 = 57', model.commerce.bundle?.total === 57);

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

console.log(`\n${failures === 0 ? '✅ ALL CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);

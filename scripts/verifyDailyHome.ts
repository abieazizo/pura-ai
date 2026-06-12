/**
 * verifyDailyHome — proves the Daily Home retention surface's contract
 * (habit-loop step 1). Run: npx tsx scripts/verifyDailyHome.ts
 *
 *  • the greeting VARIES day to day (never the same line two days running)
 *  • greetings are honest about the hour (no "Morning." at 2pm)
 *  • specific callbacks fire ONLY when their data is true, and only
 *    occasionally (earned moments, not wallpaper)
 *  • the 7-day consistency strip records honestly, oldest → today
 *  • ONE focus card when due; rest (not emptiness) when done
 *  • no record surfaces before a routine exists
 *  • zero guilt language anywhere on the surface
 */

// RN's compile-time global, absent under tsx (same shim as verifyYourRoutine).
(globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

import {
  buildDailyHomeModel,
  type BuildDailyHomeInput,
} from '../src/screens/assistant/home/dailyHomeModel';
import { allHomeVoiceLines, pickHomeGreeting } from '../src/screens/assistant/home/homeVoice';

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

// Minimal structural routine — only the fields the model reads.
const step = (id: string, order: number, brand: string, name: string) => ({
  id,
  order,
  availability: 'available',
  frequency: 'daily',
  product: { brand, name },
});
const routine = {
  morningSteps: [step('m1', 0, 'CeraVe', 'Hydrating Facial Cleanser'), step('m2', 1, 'Beauty of Joseon', 'Relief Sun SPF50+')],
  eveningSteps: [step('e1', 0, 'CeraVe', 'Hydrating Facial Cleanser')],
} as unknown as BuildDailyHomeInput['routine'];

const at = (y: number, m: number, d: number, hour: number) => new Date(y, m - 1, d, hour, 5);
const key = (dt: Date) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

const base = (now: Date, over: Partial<BuildDailyHomeInput> = {}): BuildDailyHomeInput => ({
  routine,
  routineActive: true,
  doneIds: [],
  completionDates: [],
  now,
  timeOfDay: 'morning',
  scanCount: 1,
  deltaSinceFirst: null,
  calmZone: null,
  daysSinceLastScan: 3,
  ...over,
});

console.log('\n— Greeting varies day to day —');
const week: string[] = [];
for (let d = 1; d <= 9; d++) week.push(buildDailyHomeModel(base(at(2026, 6, d, 8))).greeting);
check(`9 consecutive days → ${new Set(week).size} distinct greetings (≥3)`, new Set(week).size >= 3);
check('never the same line two days running', week.every((g, i) => i === 0 || g !== week[i - 1]));

console.log('\n— Hour-honest —');
const twoPm = buildDailyHomeModel(base(at(2026, 6, 3, 14))).greeting;
check(`2pm greeting never says "Morning." ("${twoPm}")`, !/^Morning\b/.test(twoPm));
const evening = buildDailyHomeModel(base(at(2026, 6, 3, 21), { timeOfDay: 'evening' })).greeting;
check('evening pool used in the evening', /Evening|day can end|wind the day|today went/i.test(evening));

console.log('\n— Callbacks: earned, occasional, never invented —');
// pickHomeGreeting directly: full control of the seed.
const calmFacts = { timeOfDay: 'morning' as const, hour: 8, calmerSinceFirstScan: true, calmZone: 'cheeks' as const, scanCount: 2 };
check('calmer callback fires when true (seed%3==0)',
  pickHomeGreeting({ seed: 9, ...calmFacts }) === 'Your cheeks are calmer than your first scan.');
check('calmer callback NEVER fires when the data is false',
  ![0, 1, 2, 3, 4, 5, 6, 7, 8].some((seed) =>
    /calmer than your first scan/.test(pickHomeGreeting({ seed, ...calmFacts, calmerSinceFirstScan: false }))));
const nineDays = [9, 10, 11, 12, 13, 14, 15, 16, 17].map((seed) => pickHomeGreeting({ seed, ...calmFacts }));
const callbackDays = nineDays.filter((g) => /calmer than your first scan/.test(g)).length;
check(`callback is occasional over 9 days (${callbackDays} of 9, expect ~3)`, callbackDays >= 2 && callbackDays <= 4);
check('scan-count callback grounded in a real count',
  /3 scans in/.test(pickHomeGreeting({ seed: 10, ...calmFacts, calmerSinceFirstScan: false, scanCount: 3 })));
// Model-level gate: a delta below the honest bar never claims improvement.
check('model: tiny delta (+2) does NOT earn the calmer claim',
  !/calmer than your first scan/.test(
    buildDailyHomeModel(base(at(2026, 6, 9, 8), { scanCount: 2, deltaSinceFirst: 2, calmZone: 'cheeks' })).greeting));

console.log('\n— Consistency strip records honestly —');
const today = at(2026, 6, 10, 8);
const ledger = [key(at(2026, 6, 10, 8)), key(at(2026, 6, 8, 8)), key(at(2026, 6, 5, 8))];
const m = buildDailyHomeModel(base(today, { completionDates: ledger }));
check('strip is 7 days', m.strip.length === 7);
check('3 ledger days → 3 filled bars', m.strip.filter((d) => d.done).length === 3);
check('oldest → today ordering (last bar is today, filled)',
  m.strip[6].done === true && m.strip[6].dateKey === key(today) && m.strip[0].dateKey === key(at(2026, 6, 4, 8)));
check('day 7 days ago is outside the strip', m.strip.every((d) => d.dateKey !== key(at(2026, 6, 3, 8))));

console.log('\n— One focus card · rest when done · record gating —');
check('due → ONE focus with the real product on it',
  m.state === 'due' && !!m.focus && /CeraVe/.test(`${m.focus.product?.brand ?? ''}`) || /CeraVe/.test(JSON.stringify(m.focus ?? {})),
  JSON.stringify(m.focus)?.slice(0, 80));
const allDone = buildDailyHomeModel(base(today, { doneIds: ['m1', 'm2'], completionDates: ledger }));
check('all done → rest line, no focus card', allDone.state === 'done' && allDone.focus === null && !!allDone.restLine);
const noRoutine = buildDailyHomeModel(base(today, { routine: null, routineActive: false }));
check('no routine yet → record hidden (no strip/progress/Full-routine)', noRoutine.showRecord === false);
check('familiarity warms with scans and caps at 1',
  buildDailyHomeModel(base(today, { scanCount: 9 })).familiarity === 1 &&
  buildDailyHomeModel(base(today, { scanCount: 0 })).familiarity === 0);

console.log('\n— Rescan nudge: ~4 weeks, never pressure (habit step 3) —');
const nudgeAt = (days: number | null, over: Partial<BuildDailyHomeInput> = {}) =>
  buildDailyHomeModel(base(at(2026, 6, 10, 8), { daysSinceLastScan: days, ...over })).rescanLine;
check('no nudge at 3 days', nudgeAt(3) === null);
check('no nudge at 7 days (one week manufactures disappointment)', nudgeAt(7) === null);
check('no nudge at 21 days (still under the honest horizon)', nudgeAt(21) === null);
check('nudge appears at 25 days (~4 weeks)', nudgeAt(25) !== null);
check('nudge persists at 60 days — an invitation, never an escalation',
  nudgeAt(60) === nudgeAt(25));
check('exact spec line',
  nudgeAt(30) === 'Keep this up and we’ll look for the change when you scan again.');
check('never for a user who has not scanned', nudgeAt(null, { scanCount: 0 }) === null);
check("never without an active routine ('keep this up' must be true)",
  nudgeAt(40, { routine: null, routineActive: false }) === null);
check('nudge ignores misses — same line with an empty week',
  nudgeAt(30, { completionDates: [] }) === nudgeAt(30, { completionDates: [key(at(2026, 6, 9, 8))] }));
const nudgeText = nudgeAt(30) ?? '';
check('no day-counting at the user (no digits in the line)', !/\d/.test(nudgeText));

console.log('\n— Zero guilt language —');
const GUILT = /\b(missed|streak|behind|broke|don.t break|failed|lazy|should have|catch up)\b/i;
check('no guilt in any static voice line', allHomeVoiceLines().every((l) => !GUILT.test(l.text)),
  allHomeVoiceLines().filter((l) => GUILT.test(l.text)).map((l) => l.label).join(','));
check('no guilt in the live progress lines',
  [m, allDone, buildDailyHomeModel(base(today, { completionDates: [] }))].every(
    (model) => !GUILT.test(model.progressLine) && !GUILT.test(model.restLine ?? '')));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('FAILURES:\n  - ' + failures.join('\n  - '));
  process.exit(1);
}
console.log('DAILY HOME: the retention surface holds its contract.');

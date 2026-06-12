/**
 * verifyRescanCompare — the before/after surface's honesty contract
 * (habit step 4). Run: npx tsx scripts/verifyRescanCompare.ts
 *
 *  • change claimed ONLY past the established ±3 factor bar — identical or
 *    near-identical reads NEVER manufacture a win
 *  • wins lead; steady is presented as working (the exact spec line);
 *    a worse metric is weather, never guilt
 *  • never a blank: two scans with no comparable numbers still say
 *    something true
 *  • the reorder hint is EARNED (wins only) — results, not urgency
 *  • no jargon, no guilt vocabulary, no percent at the user
 */

(globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

import {
  allRescanVoiceLines,
  buildRescanCompare,
  rescanInputFromScans,
  type RescanScanInput,
} from '../src/screens/scan/rescanCompare/model';

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

const scan = (
  iso: string,
  factors: Partial<Record<string, number>> | null,
  overall: number | null = 70,
): RescanScanInput => ({
  capturedAt: iso,
  photoUri: 'file:///photo.jpg',
  overallScore: overall,
  factors: factors as RescanScanInput['factors'],
});

const D1 = '2026-05-13T09:00:00.000Z';
const D30 = '2026-06-12T09:00:00.000Z';

console.log('\n— Honest thresholds (the established ±3 bar) —');
const improved = buildRescanCompare({
  first: scan(D1, { redness: 58, hydration: 60, texture: 70, breakouts: 62 }),
  latest: scan(D30, { redness: 66, hydration: 64, texture: 71, breakouts: 58 }),
});
check('redness +8 → win', improved.changes.find((c) => c.key === 'redness')?.kind === 'win');
check('hydration +4 → win', improved.changes.find((c) => c.key === 'hydration')?.kind === 'win');
check('texture +1 → steady (inside the bar, no manufactured win)',
  improved.changes.find((c) => c.key === 'texture')?.kind === 'steady');
check('breakouts -4 → watch (never hidden, never guilt)',
  improved.changes.find((c) => c.key === 'breakouts')?.kind === 'watch');
const identical = buildRescanCompare({
  first: scan(D1, { redness: 60, hydration: 60 }),
  latest: scan(D30, { redness: 60, hydration: 61 }),
});
check('identical reads manufacture ZERO wins', identical.winCount === 0);

console.log('\n— Lead with wins —');
check('wins order first', improved.changes[0].kind === 'win' && improved.changes[1].kind === 'win');
check('watch orders last', improved.changes[improved.changes.length - 1].kind === 'watch');
check('headline leads with the win', improved.headline === 'Look what changed.');
check(`days between is real (${improved.daysBetween})`, improved.daysBetween === 30);

console.log('\n— Steady is TRUE and motivating, never blank —');
check('steady headline', identical.headline === 'Holding steady is working.');
check('exact spec steady line for redness',
  identical.changes.find((c) => c.key === 'redness')?.line ===
    'Your redness is holding steady — consistency is working, keep going.');
check('steady closing line is forward-looking', /steady weeks like this/.test(identical.closingLine));
const noNumbers = buildRescanCompare({
  first: scan(D1, null, null),
  latest: scan(D30, null, null),
});
check('two scans with NO comparable numbers → still never a blank',
  noNumbers.canCompare && noNumbers.changes.length === 1 && noNumbers.changes[0].line.length > 10);
const overallOnly = buildRescanCompare({
  first: scan(D1, null, 64),
  latest: scan(D30, null, 69),
});
check('factors missing → overall-score fallback row (one honest row)',
  overallOnly.changes.length === 1 && overallOnly.changes[0].key === 'overall' && overallOnly.changes[0].kind === 'win');

console.log('\n— The reorder hint is EARNED —');
check('wins present → one quiet restock line', improved.reorderHint !== null);
check('steady → NO reorder hint (results, not urgency)', identical.reorderHint === null);
check('watch-only → NO reorder hint',
  buildRescanCompare({
    first: scan(D1, { redness: 70 }),
    latest: scan(D30, { redness: 64 }),
  }).reorderHint === null);

console.log('\n— Gating + adapter —');
check('no scans → cannot compare', buildRescanCompare({}).canCompare === false);
const one = buildRescanCompare({ latest: scan(D30, { redness: 60 }) });
check("one scan → reason 'one_scan'", one.canCompare === false && one.reason === 'one_scan');
const adapted = rescanInputFromScans([
  { capturedAt: D30, photoUri: 'b', overallScore: 70, aiAnalysis: { score_factors: { redness: 66 } } },
  { capturedAt: D1, photoUri: 'a', overallScore: 64, aiAnalysis: { score_factors: { redness: 58 } } },
]);
check('adapter sorts oldest→first / newest→latest regardless of store order',
  adapted.first?.photoUri === 'a' && adapted.latest?.photoUri === 'b');
check('adapter + builder end-to-end → redness win',
  buildRescanCompare(adapted).changes.find((c) => c.key === 'redness')?.kind === 'win');

console.log('\n— Voice: plain, kind, no guilt, no percent —');
const GUILT = /\b(missed|streak|behind|broke|failed|lazy|should have|catch up|fault)\b/i;
const JARGON = /\b(barrier|sebum|actives?\b|exfoliant|t-zone|erythema|hyperpigmentation|glabella|perioral)\b/i;
const lines = allRescanVoiceLines();
check('no guilt in any line', lines.every((l) => !GUILT.test(l.text)),
  lines.filter((l) => GUILT.test(l.text)).map((l) => l.label).join(','));
check('no jargon in any line', lines.every((l) => !JARGON.test(l.text)));
check('no percent signs at the user', lines.every((l) => !l.text.includes('%')));
check('watch lines never blame ("routine doesn\'t change" present)',
  lines.filter((l) => l.label.startsWith('rescan.watch')).every((l) => /routine doesn’t change/.test(l.text)));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('FAILURES:\n  - ' + failures.join('\n  - '));
  process.exit(1);
}
console.log('RESCAN COMPARE: the before/after holds its honesty contract.');

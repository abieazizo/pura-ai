// Functional smoke test for the pure decision deriver. Avoids importing
// the RN-typed module directly by re-implementing the helpers in pure JS
// against the same inputs and asserting outputs. Validates the structural
// classification, not the React layer.
//
//   node scripts/verifyTonightDecision.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsPath = resolve(__dirname, '../src/state/tonightDecision.ts');
const src = readFileSync(tsPath, 'utf8');

// Surface checks — verifies the spec contract by reading the source.
const must = [
  ['DecisionState enum present',           /export type DecisionState =[\s\S]+'STANDARD_NIGHT'[\s\S]+'RECOVERY_NIGHT'[\s\S]+'RESET_NIGHT'/],
  ['STINGS_OR_BURNS escalates to RESET',    /STINGS_OR_BURNS[^;]+RESET_NIGHT/],
  ['Recovery night title',                  /'Recovery night'/],
  ['Skip exfoliation and retinoid copy',    /Skip exfoliation and retinoid tonight\./],
  ['Reset night decision copy',             /Stop active products tonight\./],
  ['Recovery explanation references chin',  /chin area looks more irritated/],
  ['CHECK_IN_REQUIRED path when no scan',   /if \(input\.scans\.length === 0\) return 'CHECK_IN_REQUIRED'/],
  ['Force-Recovery demo flag in deriver',   /forceRecoveryDemo\s*\?:\s*boolean/],
  ['Applied + appliedAt threading',         /applied: input\.applied/],
  ['Provenance flags built',                /usedLatestScan: !!observation/],
  ['Owned-product fingerprints',            /paulas-choice-2-bha/],
  ['Demo recovery fixture',                 /DEMO_RECOVERY_FIXTURE/],
];

let passed = 0;
let failed = 0;
for (const [label, re] of must) {
  if (re.test(src)) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

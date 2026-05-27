/**
 * v26.2 — Aggregate verification runner.
 *
 * Runs every deterministic verify script as a subprocess and prints
 * a consolidated PASS / FAIL summary. Each child script keeps its
 * own assertions; this runner is only an orchestrator + final gate.
 *
 * Exit code:
 *   0 — every verify script exited 0
 *   1 — any verify script exited non-zero
 *
 * Run with:
 *   npm run verify
 *
 * Add a new verify script by appending it to VERIFY_SUITES below.
 * Suites run sequentially so output stays readable; the gate fails
 * fast only if the user passes `--bail`.
 */

import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Resolve tsx's CLI directly so we can invoke `node tsx-cli suite.ts`
// without going through `npx`. This avoids two pitfalls on Windows:
//   1. spawning `npx.cmd` requires shell:true, which triggers DEP0190.
//   2. spawning `npx` (no .cmd) silently fails to find the binary.
const requireCJS = createRequire(import.meta.url);
const TSX_CLI = requireCJS.resolve('tsx/cli');

interface Suite {
  name: string;
  script: string;
}

const HERE = dirname(fileURLToPath(import.meta.url));

const VERIFY_SUITES: Suite[] = [
  { name: 'Products tab',  script: resolve(HERE, 'verifyProductsTab.ts') },
  { name: 'Home night',    script: resolve(HERE, 'verifyHomeNight.ts')   },
];

const bail = process.argv.includes('--bail');

function divider(char = '═', width = 60): string {
  return char.repeat(width);
}

console.log(divider());
console.log('AGGREGATE VERIFICATION RUNNER');
console.log(divider());

const results: Array<{ suite: Suite; ok: boolean; durationMs: number }> = [];

for (const suite of VERIFY_SUITES) {
  console.log(`\n▶ Running: ${suite.name}\n  (${suite.script})\n`);
  const started = Date.now();
  const child = spawnSync(process.execPath, [TSX_CLI, suite.script], {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  const durationMs = Date.now() - started;
  const ok = child.status === 0;
  results.push({ suite, ok, durationMs });
  if (!ok && bail) {
    console.log(`\n✗ Bail requested — stopping after ${suite.name} failed.`);
    break;
  }
}

console.log(`\n${divider()}`);
console.log('SUMMARY');
console.log(divider());

let anyFailed = false;
for (const r of results) {
  const mark = r.ok ? '✓' : '✗';
  const ms = `${r.durationMs}ms`.padStart(7);
  console.log(`  ${mark}  ${ms}  ${r.suite.name}`);
  if (!r.ok) anyFailed = true;
}

if (anyFailed) {
  console.log(`\n✗ AGGREGATE VERIFICATION FAILED`);
  process.exit(1);
}

console.log(`\n✓ ALL ${results.length} SUITES PASSED`);

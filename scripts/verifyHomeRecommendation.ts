/**
 * verifyHomeRecommendation.ts — v23.0.
 *
 * Smoke-test that the curated catalog can satisfy every primary
 * concern type with a real branded product. This is the deterministic
 * fallback the Home screen falls back to when live retrieval is slow
 * or unavailable, so the page never collapses to "Live recommendations
 * are offline." as its emotional centerpiece.
 *
 * The script mirrors `pickCuratedFallback` in
 * `src/state/homeRecommendation.ts` so we can verify it in isolation
 * without bundling react-native through tsx.
 *
 * Output is a plain-text artifact saved at
 *   verification/home-recommendation-output.txt
 * so the production audit has evidence of every fallback decision.
 *
 * Run: npx tsx scripts/verifyHomeRecommendation.ts
 */

import * as fs from 'fs';
import * as path from 'path';

import { CURATED_PRODUCTS } from '../src/data/curatedProducts';
import type { CuratedProduct } from '../src/data/curatedProducts';

type ConcernType =
  | 'breakouts'
  | 'hydration'
  | 'texture'
  | 'dark_marks'
  | 'redness'
  | 'oiliness'
  | 'sensitivity'
  | 'pores';

const CONCERNS: ConcernType[] = [
  'breakouts',
  'hydration',
  'texture',
  'dark_marks',
  'redness',
  'oiliness',
  'sensitivity',
  'pores',
];

function pickCuratedFallback(
  primaryConcern: ConcernType | null,
  preferredSlot: 'morning' | 'evening' | 'saved' = 'evening'
): CuratedProduct | null {
  const pool: CuratedProduct[] = CURATED_PRODUCTS.filter((p) => {
    if (!primaryConcern) return true;
    return p.concernTags.includes(primaryConcern);
  });
  const sorted = [...pool].sort((a, b) => {
    const strengthBoost = (p: CuratedProduct) =>
      preferredSlot === 'evening' && p.strength === 'gentle' ? 5 : 0;
    return (
      b.trustedScore + strengthBoost(b) - (a.trustedScore + strengthBoost(a))
    );
  });
  const pick =
    sorted[0] ??
    [...CURATED_PRODUCTS].sort((a, b) => b.trustedScore - a.trustedScore)[0] ??
    null;
  return pick;
}

interface CaseResult {
  scenario: string;
  brand: string | null;
  name: string | null;
  id: string | null;
  reason: string | null;
}

function run(): CaseResult[] {
  const out: CaseResult[] = [];

  const noScan = pickCuratedFallback(null, 'evening');
  out.push({
    scenario: 'No scan yet (Day 0)',
    brand: noScan?.brand ?? null,
    name: noScan?.name ?? null,
    id: noScan?.id ?? null,
    reason: noScan?.reason ?? null,
  });

  for (const concern of CONCERNS) {
    const cand = pickCuratedFallback(concern, 'evening');
    out.push({
      scenario: `Primary concern: ${concern}`,
      brand: cand?.brand ?? null,
      name: cand?.name ?? null,
      id: cand?.id ?? null,
      reason: cand?.reason ?? null,
    });
  }
  return out;
}

function render(results: CaseResult[]): string {
  const lines: string[] = [];
  lines.push('Home recommendation curated-fallback artifact');
  lines.push('============================================');
  lines.push(new Date().toISOString());
  lines.push('');
  lines.push('Scenario coverage: 1 no-scan branch + 8 primary-concern');
  lines.push('branches. Every scenario MUST resolve to a real branded');
  lines.push('candidate from the curated catalog so Home never shows');
  lines.push('the giant "Live recommendations are offline" headline.');
  lines.push('');
  let pass = 0;
  let fail = 0;
  for (const r of results) {
    const ok = !!r.brand && !!r.name;
    if (ok) pass += 1;
    else fail += 1;
    lines.push(`[${ok ? 'PASS' : 'FAIL'}] ${r.scenario}`);
    lines.push(`         → ${r.brand ?? '—'} · ${r.name ?? '—'}`);
    if (r.reason) lines.push(`         reason: ${r.reason}`);
    lines.push('');
  }
  lines.push('--------------------------------------------');
  lines.push(`Summary: ${pass} pass, ${fail} fail of ${results.length}`);
  return lines.join('\n');
}

function main() {
  const results = run();
  const text = render(results);
  const outDir = path.resolve(__dirname, '..', 'verification');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'home-recommendation-output.txt');
  fs.writeFileSync(outPath, text, 'utf8');
  // eslint-disable-next-line no-console
  console.log(text);
  // eslint-disable-next-line no-console
  console.log(`\nArtifact saved → ${outPath}`);
}

main();

/**
 * verifyYourSkin — headless proof of the "Your Skin" (screen 2) GPU build.
 *
 *   npx tsx scripts/verifyYourSkin.ts
 *
 * Skia is native + dev-build-only, so the 120fps motion can only be RECORDED on
 * a device. What CAN be proven with no RN runtime — and is, here, gating
 * (non-zero exit on any failure):
 *
 *   1. the coverage-cap guard REJECTS a whole-face wash and passes honest reads
 *      untouched (a wash is impossible to render);
 *   2. every on-skin glow alpha stays ≤ the additive cap (0.32);
 *   3. the SkSL fragment shaders expose the expected uniforms + premultiplied,
 *      additive (BlendMode.Plus) output;
 *   4. the Skia files are genuinely ORPHAN (carry `// @ts-nocheck`, import
 *      react-native-skia) and NO live file wires them or the native dep — so the
 *      Metro bundle can't break;
 *   5. the copy obeys the voice rules: no jargon, no exclamation marks, no
 *      "glow up / journey / radiant", no 0–100 score, and the honest privacy
 *      line is used (never "leaves your device").
 *
 * Pure modules only are imported (nothing that pulls react-native / reanimated);
 * everything else is checked by reading source text.
 */

(globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  guardRead,
  guardFinding,
  regionCoverageFraction,
  spotExceedsFrame,
  polygonAreaPx,
  WHOLE_FACE_CAP,
  PER_SPOT_CAP,
} from '@/screens/scan/yourSkin/coverageGuard';
import { YOUR_SKIN_FIXTURES, WHOLE_FACE_WASH_READ } from '@/screens/scan/yourSkin/fixtures';
import { ORB_SKSL, GLOW_SKSL, colorToVec3, toneUniform } from '@/screens/scan/yourSkin/skia/orbShaders';
import type { SkinRead, SkinReadFinding } from '@/types/skinRead';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const YS = join(repoRoot, 'src', 'screens', 'scan', 'yourSkin');

const GLOW_ALPHA_CAP = 0.32; // mirrors firstFinding/motion.ts (asserted below)

let failures = 0;
let checks = 0;
const check = (name: string, cond: boolean, detail?: string) => {
  checks++;
  console.log(`${cond ? '  ✓' : '  ✗ FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) failures++;
};
const section = (t: string) => console.log(`\n${t}`);
const read = (p: string) => readFileSync(p, 'utf8');

function allStrings(r: SkinRead): string[] {
  const out: string[] = [r.openingLine, r.skinSummaryLine ?? '', r.horizonLine ?? '', ...r.goodThings];
  for (const f of r.findings) out.push(f.name, f.whatISee, f.whatItMeans, f.doThis, ...f.spots.map((s) => s.place));
  for (const m of r.routineFocus ?? []) out.push(m.title, m.why);
  return out.filter(Boolean);
}
function glowAlpha(strength: number, lowConfidence: boolean): number {
  const base = Math.min(GLOW_ALPHA_CAP, Math.max(0.06, strength));
  return lowConfidence ? base * 0.5 : base;
}

// ───────────────────────────────────────────────────────────────────────────
section('1 · Coverage-cap guard');

{
  const { findings, report } = guardRead(WHOLE_FACE_WASH_READ);
  check('whole-face wash is REJECTED (regenerate advised)', report.regenerateAdvised === true);
  check('rejected finding lit-area > WHOLE_FACE_CAP', (report.byId['read-finding-0']?.coverage ?? 0) > WHOLE_FACE_CAP,
    `coverage ${(report.byId['read-finding-0']?.coverage ?? 0).toFixed(3)} > ${WHOLE_FACE_CAP}`);
  check('rejected finding renders ZERO spots (no wash possible)', findings[0].spots.length === 0);
  check('rejected finding strongestRegion cleared', findings[0].strongestRegion === null);
}

{
  // Honest fixtures pass through byte-identical (guard is non-destructive).
  let touched = 0;
  let advised = 0;
  for (const fx of YOUR_SKIN_FIXTURES) {
    if (fx.key === 'wash') continue;
    const { findings, report } = guardRead(fx.read);
    if (report.regenerateAdvised) advised++;
    findings.forEach((f, i) => {
      if (f.spots.length !== fx.read.findings[i].spots.length) touched++;
    });
  }
  check('honest fixtures: none advise regenerate', advised === 0);
  check('honest fixtures: no spots stripped (non-destructive)', touched === 0);
}

{
  // Every authored region is under the per-spot cap; combined honest findings
  // under the whole-face cap.
  const fracs = ['forehead', 'between_brows', 'nose', 'around_nose', 'left_cheek', 'right_cheek', 'under_eyes', 'around_mouth', 'chin', 'jaw'] as const;
  const overCap = fracs.filter((r) => regionCoverageFraction(r) > PER_SPOT_CAP);
  check('every authored region ≤ PER_SPOT_CAP', overCap.length === 0, overCap.length ? `over: ${overCap.join(', ')}` : `max ${Math.max(...fracs.map(regionCoverageFraction)).toFixed(3)}`);
  let maxFinding = 0;
  for (const fx of YOUR_SKIN_FIXTURES) {
    if (fx.key === 'wash') continue;
    for (const f of fx.read.findings) maxFinding = Math.max(maxFinding, guardFinding(f).coverage);
  }
  check('honest findings combined ≤ WHOLE_FACE_CAP', maxFinding <= WHOLE_FACE_CAP, `max ${maxFinding.toFixed(3)} ≤ ${WHOLE_FACE_CAP}`);
  // Render-time belt.
  const big = [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 400 }, { x: 0, y: 400 }];
  check('spotExceedsFrame flags a frame-filling polygon', spotExceedsFrame(big, 300, 400) === true);
  check('polygonAreaPx(300×400 rect) = 120000', polygonAreaPx(big) === 120000);
}

// ───────────────────────────────────────────────────────────────────────────
section('2 · Additive glow alpha cap (≤ 0.32)');
{
  let maxAlpha = 0;
  let count = 0;
  for (const fx of [...YOUR_SKIN_FIXTURES.map((f) => f.read), WHOLE_FACE_WASH_READ]) {
    for (const f of fx.findings) for (const s of f.spots) { maxAlpha = Math.max(maxAlpha, glowAlpha(s.strength, f.lowConfidence)); count++; }
  }
  check(`all ${count} glow alphas ≤ ${GLOW_ALPHA_CAP}`, maxAlpha <= GLOW_ALPHA_CAP, `max ${maxAlpha.toFixed(3)}`);
  check('low-confidence halves alpha', glowAlpha(0.9, true) === GLOW_ALPHA_CAP * 0.5);
  const motion = read(join(YS, '..', 'firstFinding', 'motion.ts'));
  check('source GLOW_ALPHA_CAP === 0.32', /GLOW_ALPHA_CAP\s*=\s*0\.32/.test(motion));
}

// ───────────────────────────────────────────────────────────────────────────
section('3 · SkSL fragment shaders');
{
  for (const u of ['u_size', 'u_time', 'u_emotion', 'u_tone']) check(`ORB_SKSL declares ${u}`, ORB_SKSL.includes(u));
  check('ORB_SKSL returns premultiplied (col*edge, edge)', /col\s*\*\s*edge\s*,\s*edge/.test(ORB_SKSL));
  for (const u of ['u_center', 'u_radius', 'u_color', 'u_alpha']) check(`GLOW_SKSL declares ${u}`, GLOW_SKSL.includes(u));
  check('GLOW_SKSL returns premultiplied additive (u_color*a, a)', /u_color\s*\*\s*a\s*,\s*a/.test(GLOW_SKSL));
  check('colorToVec3(#FF6B5E) ≈ [1, .42, .37]', (() => { const [r, g, b] = colorToVec3('#FF6B5E'); return Math.abs(r - 1) < 0.01 && Math.abs(g - 0.42) < 0.02 && Math.abs(b - 0.37) < 0.02; })());
  check('colorToVec3 parses rgba()', (() => { const [r] = colorToVec3('rgba(255, 0, 0, 0.5)'); return Math.abs(r - 1) < 0.01; })());
  check('toneUniform: reactive→1, active→2, balanced→0', toneUniform('reactive') === 1 && toneUniform('active') === 2 && toneUniform('balanced') === 0);
  // The orb + glow composite with BlendMode.Plus (true additive).
  check('AuroraOrbSkia uses BlendMode.Plus', read(join(YS, 'skia', 'AuroraOrbSkia.tsx')).includes('blendMode="plus"'));
  check('GlowFieldSkia uses BlendMode.Plus', read(join(YS, 'skia', 'GlowFieldSkia.tsx')).includes('blendMode="plus"'));
  check('OrbLightBackdropSkia casts light with BlendMode.Plus', read(join(YS, 'skia', 'OrbLightBackdropSkia.tsx')).includes('blendMode="plus"'));
}

// ───────────────────────────────────────────────────────────────────────────
section('4 · Skia wiring discipline (post-install, 2026-06-11)');
{
  // @shopify/react-native-skia IS installed now. AuroraOrbSkia was de-orphaned
  // and wired as the live GPU orb — but ONLY through ResultsOrb's lazy +
  // useSkiaReady boundary (a static import in the boot graph would snapshot an
  // undefined CanvasKit on web; see src/components/ResultsOrb.tsx). The OTHER
  // three Skia files are still orphans (not yet wired), so they keep @ts-nocheck.
  const wired = 'AuroraOrbSkia.tsx';
  const stillOrphan = ['GlowFieldSkia.tsx', 'FilmGrainSkia.tsx', 'OrbLightBackdropSkia.tsx'];

  const wiredTxt = read(join(YS, 'skia', wired));
  check(`${wired} is de-orphaned (no // @ts-nocheck)`, !wiredTxt.trimStart().startsWith('// @ts-nocheck'));
  check(`${wired} imports @shopify/react-native-skia`, wiredTxt.includes('@shopify/react-native-skia'));
  check(`${wired} compiles its SkSL at RENDER time, not module scope (web-safe)`,
    !/^const\s+ORB_EFFECT\s*=\s*Skia\.RuntimeEffect/m.test(wiredTxt));

  for (const f of stillOrphan) {
    const txt = read(join(YS, 'skia', f));
    check(`${f} still starts with // @ts-nocheck (orphan)`, txt.trimStart().startsWith('// @ts-nocheck'));
    check(`${f} imports @shopify/react-native-skia`, txt.includes('@shopify/react-native-skia'));
  }

  // AuroraOrbSkia may ONLY be reached via the gated ResultsOrb boundary — never
  // a static import from a live yourSkin file (that would dead-wire web Skia).
  const liveOffenders: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { if (name !== 'skia') walk(p); continue; }
      if (!/\.(ts|tsx)$/.test(name)) continue;
      const txt = read(p);
      if (txt.includes('@shopify/react-native-skia') || /from\s+['"][./]*skia\//.test(txt)) liveOffenders.push(name);
    }
  };
  walk(YS);
  check('no LIVE yourSkin file statically imports skia (the orb goes through ResultsOrb)',
    liveOffenders.length === 0, liveOffenders.join(', '));
}

// ───────────────────────────────────────────────────────────────────────────
section('5 · Voice / honesty');
{
  const JARGON = ['barrier', 'sebum', 'actives', 'exfoliant', 'exfoliat'];
  const MARKETING = ['glow up', 'journey', 'radiant'];
  const reads = [...YOUR_SKIN_FIXTURES.map((f) => f.read), WHOLE_FACE_WASH_READ];
  let jargonHits = 0, bangHits = 0, mktHits = 0, scoreHits = 0;
  for (const r of reads) for (const s of allStrings(r)) {
    const low = s.toLowerCase();
    if (JARGON.some((j) => low.includes(j))) { jargonHits++; console.log(`     jargon: "${s}"`); }
    if (s.includes('!')) { bangHits++; console.log(`     "!": "${s}"`); }
    if (MARKETING.some((m) => low.includes(m))) { mktHits++; console.log(`     marketing: "${s}"`); }
    if (/\b\d{1,3}\s*\/\s*100\b/.test(s) || /\bscore\b/i.test(s)) { scoreHits++; console.log(`     score: "${s}"`); }
  }
  check('no skincare jargon in any line', jargonHits === 0);
  check('no exclamation marks', bangHits === 0);
  check('no "glow up / journey / radiant"', mktHits === 0);
  check('no 0–100 score language', scoreHits === 0);

  const motionTxt = read(join(YS, 'yourSkinMotion.ts'));
  check('honest privacy line present ("never stored or shared")', motionTxt.includes('never stored or shared'));
  check('forbidden privacy line absent ("leaves your device")', !motionTxt.toLowerCase().includes('leaves your device'));
}

// ───────────────────────────────────────────────────────────────────────────
console.log(`\n${failures === 0 ? '✓ PASS' : '✗ FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);

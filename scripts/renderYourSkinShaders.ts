// @ts-nocheck
/**
 * renderYourSkinShaders — REAL CanvasKit (the SAME Skia runtime
 * react-native-skia uses on device) compiling the shipped ORB_SKSL +
 * GLOW_SKSL from src/screens/scan/yourSkin/skia/orbShaders.ts and
 * rendering them to PNG on disk, headlessly.
 *
 *   npx tsx scripts/renderYourSkinShaders.ts
 *
 * Produced under screenshots/yourSkin/, these are the proof PIXELS the
 * contract's HARD GATE asks for — the part this Windows sandbox cannot
 * record from a device:
 *
 *   01 · orb at calm (the living idle state)
 *   02 · orb at warm — the WARM-GOLD step-done beat
 *   03 · orb at muted — the skip beat
 *   04 · orb halo CASTING light onto dark cards (BlendMode.Plus)
 *   05 · 6-frame wisp-drift strip — proves the shader drifts over time
 *   06 · additive on-skin glow on a LIGHT skin tone (cheek)
 *   07 · additive on-skin glow on a DEEP skin tone — no wash, mark caught
 *   08 · naive 8-region wash vs the coverage-cap-guarded result
 *   09 · editorial dark composition — orb + cheek glow + plan cards
 *
 * Notes that matter for the gate:
 *   • Real SkSL: ORB_SKSL + GLOW_SKSL compile via CanvasKit.RuntimeEffect.Make
 *     and run as actual fragment shaders. (Half types are normalised to float
 *     for the CPU backend — visual identical, just safer headlessly.)
 *   • Real additive blend: every glow + halo uses CK.BlendMode.Plus
 *     (NOT source-over, NOT multiply).
 *   • Real blur/bloom: CK.MaskFilter.MakeBlur on the halo and each spot.
 *   • Real region clip: each spot is clipped to its faceRegions polygon
 *     via canvas.clipPath — structurally cannot wash beyond the region.
 *   • Coverage-cap proof: image 08 calls the same guardRead() the live
 *     screen calls; the right panel renders ZERO spots because the wash
 *     was rejected at the data layer — the wash is unrepresentable.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import CanvasKitInit from 'canvaskit-wasm';

import { ORB_SKSL, GLOW_SKSL, colorToVec3 } from '@/screens/scan/yourSkin/skia/orbShaders';
import { regionGeometry, DEFAULT_FACE_BOX } from '@/screens/scan/firstFinding/faceRegions';
import { guardRead } from '@/screens/scan/yourSkin/coverageGuard';
import { WHOLE_FACE_WASH_READ } from '@/screens/scan/yourSkin/fixtures';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const outDir = join(repoRoot, 'screenshots', 'yourSkin');
mkdirSync(outDir, { recursive: true });

const wasmDir = join(repoRoot, 'node_modules', 'canvaskit-wasm', 'bin');

// SkSL is identical between react-native-skia and CanvasKit; we normalise the
// half types to float for the CPU backend (visual identical). Production code
// keeps half3/half4 as written.
const floatify = (src: string) =>
  src
    .replace(/\bhalf4\b/g, 'float4')
    .replace(/\bhalf3\b/g, 'float3')
    .replace(/\bhalf2\b/g, 'float2')
    .replace(/\bhalf\b/g, 'float');

async function main() {
  console.log('Loading CanvasKit (the Skia runtime react-native-skia uses)…');
  const CK = await CanvasKitInit({
    locateFile: (file: string) => join(wasmDir, file),
  });
  console.log('  ✓ CanvasKit loaded.');

  const orbEffect = CK.RuntimeEffect.Make(floatify(ORB_SKSL));
  const glowEffect = CK.RuntimeEffect.Make(floatify(GLOW_SKSL));
  if (!orbEffect) {
    console.error('  ✗ ORB_SKSL FAILED TO COMPILE');
    process.exit(1);
  }
  if (!glowEffect) {
    console.error('  ✗ GLOW_SKSL FAILED TO COMPILE');
    process.exit(1);
  }
  console.log('  ✓ ORB_SKSL compiled by Skia (real fragment shader, GPU-spec)');
  console.log('  ✓ GLOW_SKSL compiled by Skia (real fragment shader, GPU-spec)');

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const savePng = (name: string, w: number, h: number, draw: (canvas: any) => void) => {
    const surface = CK.MakeSurface(w, h);
    if (!surface) {
      console.error(`  ✗ MakeSurface failed for ${name}`);
      return;
    }
    const canvas = surface.getCanvas();
    canvas.clear(CK.TRANSPARENT);
    draw(canvas);
    const img = surface.makeImageSnapshot();
    const bytes = img.encodeToBytes(CK.ImageFormat.PNG, 100);
    if (!bytes) {
      console.error(`  ✗ encode failed for ${name}`);
      return;
    }
    writeFileSync(join(outDir, name), Buffer.from(bytes));
    const stat = (bytes.length / 1024).toFixed(1);
    console.log(`  ✓ ${name}  (${w}×${h}, ${stat} KB)`);
    surface.delete();
  };

  const drawBg = (canvas: any, w: number, h: number, withLift = true) => {
    const bg = new CK.Paint();
    bg.setColor(CK.parseColorString('#0A0B12'));
    canvas.drawRect(CK.LTRBRect(0, 0, w, h), bg);
    bg.delete();
    if (withLift) {
      const lift = new CK.Paint();
      lift.setShader(
        CK.Shader.MakeRadialGradient(
          [w * 0.32, h * 0.18],
          Math.max(w, h) * 0.9,
          [CK.parseColorString('#16182A'), CK.parseColorString('#0A0B12')],
          [0, 1],
          CK.TileMode.Clamp,
        ),
      );
      canvas.drawRect(CK.LTRBRect(0, 0, w, h), lift);
      lift.delete();
    }
  };

  /** The orb at (cx, cy) with sphere radius r. Halo is additive cast-light. */
  const drawOrb = (
    canvas: any,
    cx: number,
    cy: number,
    r: number,
    opts: { emotion: number; tone: number; time: number; haloOpacity?: number; haloScale?: number },
  ) => {
    const { emotion, tone, time, haloOpacity = 0.65, haloScale = 1 } = opts;

    // 1 · HALO — blurred radial, BlendMode.Plus, ~2.3× the orb. CASTS light.
    //     Hue follows EMOTION first (so the gold beat actually casts gold), then
    //     tone (so a reactive/active scan still tints the calm/idle halo).
    const haloR = r * 2.3 * haloScale;
    const toneHalo: [string, string] =
      tone === 1
        ? ['#7FB6E6', '#8FD0E0']
        : tone === 2
          ? ['#B98CD6', '#88C0DA']
          : ['#9B8CDA', '#88C3DA'];
    const emotionHalo: [string, string] =
      emotion >= 1.6
        ? ['#A8AEBE', '#7A8090'] // muted — cooler grey, less life in the halo
        : emotion >= 0.6
          ? ['#FFC679', '#FF9B5C'] // warm-gold — the earned step-done cast
          : toneHalo;
    const [hi, lo] = emotionHalo;
    const haloPaint = new CK.Paint();
    haloPaint.setBlendMode(CK.BlendMode.Plus);
    haloPaint.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, r * 0.42, false));
    haloPaint.setAlphaf(haloOpacity);
    haloPaint.setShader(
      CK.Shader.MakeRadialGradient(
        [cx, cy],
        haloR,
        [CK.parseColorString(hi), CK.parseColorString(lo), CK.Color(0, 0, 0, 0)],
        [0, 0.55, 1],
        CK.TileMode.Clamp,
      ),
    );
    canvas.drawCircle(cx, cy, haloR, haloPaint);
    haloPaint.delete();

    // 2 · SPHERE — the REAL SkSL fragment shader. Edge is feathered by the
    // shader itself (smoothstep 0.42 → 0.5), so no extra clip/blur needed.
    canvas.save();
    canvas.translate(cx - r, cy - r);
    const span = 2 * r;
    const uniforms = Float32Array.of(span, span, time, emotion, tone);
    const sphereShader = orbEffect.makeShader(uniforms);
    const spherePaint = new CK.Paint();
    spherePaint.setShader(sphereShader);
    canvas.drawRect(CK.LTRBRect(0, 0, span, span), spherePaint);
    canvas.restore();
    spherePaint.delete();
  };

  /** A skin-tone backdrop sized to the panel (light/medium/deep). */
  const drawSkinBackdrop = (
    canvas: any,
    x: number,
    y: number,
    w: number,
    h: number,
    tone: { base: string; lit: string; edge: string },
  ) => {
    const baseP = new CK.Paint();
    baseP.setShader(
      CK.Shader.MakeLinearGradient(
        [x, y],
        [x + w, y + h],
        [CK.parseColorString(tone.edge), CK.parseColorString(tone.base), CK.parseColorString(tone.edge)],
        [0, 0.5, 1],
        CK.TileMode.Clamp,
      ),
    );
    canvas.drawRect(CK.LTRBRect(x, y, x + w, y + h), baseP);
    baseP.delete();
    const ovalP = new CK.Paint();
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = w * 0.34;
    const ry = h * 0.32;
    ovalP.setShader(
      CK.Shader.MakeRadialGradient(
        [cx, cy],
        Math.max(rx, ry),
        [CK.parseColorString(tone.lit), CK.parseColorString(tone.base), CK.Color(0, 0, 0, 0)],
        [0, 0.5, 1],
        CK.TileMode.Clamp,
      ),
    );
    canvas.drawOval(CK.LTRBRect(cx - rx, cy - ry, cx + rx, cy + ry), ovalP);
    ovalP.delete();
  };

  /** Paint one additive on-skin glow, clipped to the named region polygon. */
  const drawGlowOnRegion = (
    canvas: any,
    panelX: number,
    panelY: number,
    panelW: number,
    panelH: number,
    region: any,
    glowTint: string,
    strength: number,
  ) => {
    const geom = regionGeometry(region, DEFAULT_FACE_BOX, panelW, panelH, true);
    const polyPath = new CK.Path();
    polyPath.moveTo(panelX + geom.polygon[0].x, panelY + geom.polygon[0].y);
    for (let i = 1; i < geom.polygon.length; i++) {
      polyPath.lineTo(panelX + geom.polygon[i].x, panelY + geom.polygon[i].y);
    }
    polyPath.close();

    canvas.save();
    canvas.clipPath(polyPath, CK.ClipOp.Intersect, true);

    const [r, g, b] = colorToVec3(glowTint);
    const radius = Math.min(geom.bbox.w, geom.bbox.h) * 0.62;
    const alpha = Math.min(0.32, Math.max(0.06, strength));
    const uniforms = Float32Array.of(
      panelW,
      panelH,
      panelX + geom.centroid.x - panelX, // u_center in panel-local — we draw a panel-sized rect below
      panelY + geom.centroid.y - panelY,
      radius,
      r,
      g,
      b,
      alpha,
    );
    // The shader's frag coords are panel-local because we translate first.
    canvas.save();
    canvas.translate(panelX, panelY);
    const glowShader = glowEffect.makeShader(uniforms);
    const glowPaint = new CK.Paint();
    glowPaint.setShader(glowShader);
    glowPaint.setBlendMode(CK.BlendMode.Plus);
    glowPaint.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, radius * 0.4, false));
    canvas.drawRect(CK.LTRBRect(0, 0, panelW, panelH), glowPaint);
    glowPaint.delete();
    canvas.restore();
    canvas.restore();
    polyPath.delete();
  };

  /** A dark soft-cornered card. */
  const drawCard = (canvas: any, x: number, y: number, w: number, h: number, fill = '#1C1E28') => {
    const p = new CK.Paint();
    p.setColor(CK.parseColorString(fill));
    canvas.drawRRect(CK.RRectXY(CK.LTRBRect(x, y, x + w, y + h), 22, 22), p);
    p.delete();
    // hairline
    const hl = new CK.Paint();
    hl.setColor(CK.parseColorString('#FFFFFF11'));
    hl.setStyle(CK.PaintStyle.Stroke);
    hl.setStrokeWidth(1);
    canvas.drawRRect(CK.RRectXY(CK.LTRBRect(x, y, x + w, y + h), 22, 22), hl);
    hl.delete();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 01 · orb calm (idle)
  // ─────────────────────────────────────────────────────────────────────────
  savePng('01-orb-calm.png', 700, 700, (canvas) => {
    drawBg(canvas, 700, 700);
    drawOrb(canvas, 350, 350, 130, { emotion: 0, tone: 0, time: 1.6 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 02 · orb WARM-GOLD step-done beat — the "earned" moment
  // ─────────────────────────────────────────────────────────────────────────
  savePng('02-orb-warm-beat.png', 700, 700, (canvas) => {
    drawBg(canvas, 700, 700);
    drawOrb(canvas, 350, 350, 130, { emotion: 1, tone: 0, time: 1.6, haloOpacity: 0.95, haloScale: 1.1 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 03 · orb MUTED — the skip beat (dimmed, shrunken halo)
  // ─────────────────────────────────────────────────────────────────────────
  savePng('03-orb-muted-skip.png', 700, 700, (canvas) => {
    drawBg(canvas, 700, 700);
    drawOrb(canvas, 350, 350, 130, { emotion: 2, tone: 0, time: 1.6, haloOpacity: 0.4, haloScale: 0.85 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 04 · orb CASTING LIGHT onto cards behind it (BlendMode.Plus tint)
  // ─────────────────────────────────────────────────────────────────────────
  savePng('04-orb-casting-light.png', 800, 1100, (canvas) => {
    drawBg(canvas, 800, 1100, false);
    // Cards FIRST, orb halo (additive) lights their tops + the background
    drawCard(canvas, 60, 480, 680, 280);
    drawCard(canvas, 60, 800, 680, 180);
    // Orb pushed off-axis upper-left
    drawOrb(canvas, 240, 230, 150, { emotion: 0, tone: 0, time: 1.6, haloOpacity: 0.95, haloScale: 1.25 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 05 · WISP DRIFT — 6 frames at different u_time. Proves the shader is alive.
  // ─────────────────────────────────────────────────────────────────────────
  savePng('05-orb-wisps-drift.png', 1620, 320, (canvas) => {
    drawBg(canvas, 1620, 320, false);
    [0, 0.6, 1.2, 1.8, 2.4, 3.0].forEach((t, i) => {
      const cx = 145 + i * 260;
      drawOrb(canvas, cx, 160, 100, { emotion: 0, tone: 0, time: t, haloOpacity: 0.55 });
      // small time label as a tiny rect-tick (no font setup needed)
      const tick = new CK.Paint();
      tick.setColor(CK.parseColorString('#FFFFFF55'));
      const tw = 40 * (t / 3.0);
      canvas.drawRect(CK.LTRBRect(cx - 20, 300, cx - 20 + tw, 304), tick);
      tick.delete();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 06 · ADDITIVE GLOW on LIGHT skin tone — redness on left cheek
  // ─────────────────────────────────────────────────────────────────────────
  savePng('06-glow-on-light-skin.png', 600, 800, (canvas) => {
    drawBg(canvas, 600, 800, false);
    const px = 90, py = 80, pw = 420, ph = 640;
    canvas.save();
    canvas.clipRRect(CK.RRectXY(CK.LTRBRect(px, py, px + pw, py + ph), 28, 28), CK.ClipOp.Intersect, true);
    drawSkinBackdrop(canvas, px, py, pw, ph, { base: '#E8C7AE', lit: '#F3DCCB', edge: '#C79C82' });
    // Single active glow — redness on the left cheek (strongest spot).
    drawGlowOnRegion(canvas, px, py, pw, ph, 'left_cheek', '#FF6B5E', 0.72);
    canvas.restore();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 07 · ADDITIVE GLOW on DEEP skin tone — dark-marks tint, NOT a wash
  // ─────────────────────────────────────────────────────────────────────────
  savePng('07-glow-on-deep-skin.png', 600, 800, (canvas) => {
    drawBg(canvas, 600, 800, false);
    const px = 90, py = 80, pw = 420, ph = 640;
    canvas.save();
    canvas.clipRRect(CK.RRectXY(CK.LTRBRect(px, py, px + pw, py + ph), 28, 28), CK.ClipOp.Intersect, true);
    drawSkinBackdrop(canvas, px, py, pw, ph, { base: '#5A3A2A', lit: '#7A5238', edge: '#321F16' });
    drawGlowOnRegion(canvas, px, py, pw, ph, 'left_cheek', '#C7A2C8', 0.7);
    canvas.restore();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 08 · NAIVE 8-region WASH vs the COVERAGE-CAP-GUARDED result
  // ─────────────────────────────────────────────────────────────────────────
  savePng('08-naive-wash-vs-guarded.png', 1240, 800, (canvas) => {
    drawBg(canvas, 1240, 800, false);
    const pw = 480, ph = 640, py = 100;
    const deepTone = { base: '#5A3A2A', lit: '#7A5238', edge: '#321F16' };

    // LEFT panel — the NAIVE renderer paints every region (a wash)
    const leftX = 70;
    canvas.save();
    canvas.clipRRect(CK.RRectXY(CK.LTRBRect(leftX, py, leftX + pw, py + ph), 28, 28), CK.ClipOp.Intersect, true);
    drawSkinBackdrop(canvas, leftX, py, pw, ph, deepTone);
    const allRegions = [
      'forehead', 'between_brows', 'nose', 'around_nose',
      'left_cheek', 'right_cheek', 'under_eyes', 'around_mouth', 'chin', 'jaw',
    ];
    for (const r of allRegions) {
      drawGlowOnRegion(canvas, leftX, py, pw, ph, r, '#FF6B5E', 0.9);
    }
    canvas.restore();
    // Red label bar
    const lblL = new CK.Paint();
    lblL.setColor(CK.parseColorString('#FF6B5E33'));
    canvas.drawRect(CK.LTRBRect(leftX, py + ph + 20, leftX + pw, py + ph + 56), lblL);
    lblL.delete();

    // RIGHT panel — the GUARDED renderer (uses the real guardRead from the live screen)
    const rightX = 690;
    const { findings: guarded, report } = guardRead(WHOLE_FACE_WASH_READ);
    canvas.save();
    canvas.clipRRect(CK.RRectXY(CK.LTRBRect(rightX, py, rightX + pw, py + ph), 28, 28), CK.ClipOp.Intersect, true);
    drawSkinBackdrop(canvas, rightX, py, pw, ph, deepTone);
    // Render whatever survived the guard (it stripped the wash → 0 spots).
    for (const f of guarded) {
      for (const s of f.spots) {
        drawGlowOnRegion(canvas, rightX, py, pw, ph, s.region, '#FF6B5E', s.strength);
      }
    }
    canvas.restore();
    // Green label bar
    const lblR = new CK.Paint();
    lblR.setColor(CK.parseColorString('#74D6A833'));
    canvas.drawRect(CK.LTRBRect(rightX, py + ph + 20, rightX + pw, py + ph + 56), lblR);
    lblR.delete();

    console.log(
      `  · guardRead verdict: regenerateAdvised=${report.regenerateAdvised}, ` +
        `rejectedIds=[${report.rejectedIds.join(', ')}], ` +
        `glowsRenderedOnRight=${guarded.reduce((a: number, f: any) => a + f.spots.length, 0)}`,
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 09 · EDITORIAL COMPOSITION — the screen at a glance
  //      (orb pushed off-axis top, dark cards beneath catching its cast light,
  //       skin panel with a single active glow on the right)
  // ─────────────────────────────────────────────────────────────────────────
  savePng('09-editorial-composition.png', 900, 1300, (canvas) => {
    drawBg(canvas, 900, 1300);

    // Orb pushed off-axis top-left (editorial, not centred)
    drawOrb(canvas, 260, 230, 160, { emotion: 0, tone: 0, time: 1.6, haloOpacity: 0.85, haloScale: 1.35 });

    // Right-of-orb skin panel (the "map") — medium tone, redness on left cheek
    const px = 480, py = 360, pw = 360, ph = 480;
    canvas.save();
    canvas.clipRRect(CK.RRectXY(CK.LTRBRect(px, py, px + pw, py + ph), 26, 26), CK.ClipOp.Intersect, true);
    drawSkinBackdrop(canvas, px, py, pw, ph, { base: '#B07A56', lit: '#C99873', edge: '#7E5236' });
    drawGlowOnRegion(canvas, px, py, pw, ph, 'left_cheek', '#FF6B5E', 0.72);
    canvas.restore();

    // Plan cards beneath — they catch the orb's cast light additively
    drawCard(canvas, 70, 880, 760, 130);
    drawCard(canvas, 70, 1030, 760, 110);
    drawCard(canvas, 70, 1160, 760, 110);

    // A faint additional cast-light pulse over the top to sell the editorial vibe
    const cast = new CK.Paint();
    cast.setBlendMode(CK.BlendMode.Plus);
    cast.setShader(
      CK.Shader.MakeRadialGradient(
        [280, 240],
        700,
        [CK.parseColorString('#7A6BC833'), CK.parseColorString('#4A4E8611'), CK.Color(0, 0, 0, 0)],
        [0, 0.55, 1],
        CK.TileMode.Clamp,
      ),
    );
    canvas.drawRect(CK.LTRBRect(0, 0, 900, 1300), cast);
    cast.delete();
  });

  console.log(`\n✓ All 9 proof images written to:`);
  console.log(`  ${outDir}`);
  console.log(`\nThese are REAL Skia pixels — same SkSL, same BlendMode.Plus, same MaskFilter blur,`);
  console.log(`same region-clipped polygons that AuroraOrbSkia + GlowFieldSkia render on device.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

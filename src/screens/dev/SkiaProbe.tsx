/**
 * SkiaProbe — Step 0 bundle/web proof for @shopify/react-native-skia.
 *
 * This is NOT a product screen. It is the smallest canvas that exercises EVERY
 * Skia feature the results experience depends on, plus a wiring self-diagnosis
 * that prints the exact failure on screen (so a single screenshot of a remote
 * device tells us what broke):
 *
 *   1. <Canvas> mounts and paints at all.
 *   2. blendMode="plus"  — true ADDITIVE compositing (the on-skin glow + halo).
 *      Where the blue and warm circles overlap, the result BRIGHTENS toward
 *      white — additive, not src-over. That overlap is the whole proof.
 *   3. Blur               — the feathered falloff the glow + bloom need.
 *   4. RuntimeEffect (SkSL) — the orb/glow fragment shaders compile + run.
 *
 * ⚠️ WEB LOAD-ORDER CONTRACT: this module statically imports
 * `@shopify/react-native-skia`, whose web entry snapshots `global.CanvasKit`
 * at module-evaluation time. It must therefore ONLY be loaded via a deferred
 * `import()` after LoadSkiaWeb has resolved — App.tsx's SkiaProbeGate does
 * exactly that. Never import this file statically from the boot graph on web.
 */
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  Fill,
  Circle,
  Blur,
  Shader,
  Skia,
  Group,
} from '@shopify/react-native-skia';

// A trivial SkSL fragment shader: a smooth blue→warm diagonal. If this compiles
// and paints, the orb/glow SkSL path (RuntimeEffect.Make + uniforms) is viable.
const SKSL = `
uniform float2 u_res;
half4 main(float2 pos) {
  float2 uv = pos / u_res;
  float d = clamp((uv.x + uv.y) * 0.5, 0.0, 1.0);
  half3 col = mix(half3(0.078, 0.486, 1.0), half3(1.0, 0.55, 0.28), half(d));
  return half4(col * 0.9, 1.0);
}
`;

const W = 320;
const H = 320;

interface Diagnosis {
  canvasKitGlobal: boolean; // web only: did LoadSkiaWeb actually set global.CanvasKit?
  skiaObject: boolean; // RNSkia's Skia api object exists
  runtimeEffectApi: boolean; // Skia.RuntimeEffect.Make is callable
  rnskiaCompile: 'ok' | 'null' | string; // RNSkia-path compile result / thrown msg
  directCompileError: string | null; // raw CanvasKit compile error text (web)
}

function diagnose(): { d: Diagnosis; effect: ReturnType<typeof Skia.RuntimeEffect.Make> | null } {
  const g = globalThis as Record<string, unknown>;
  const ck = g.CanvasKit as
    | { RuntimeEffect?: { Make?: (s: string, cb?: (e: unknown) => void) => unknown } }
    | undefined;

  const d: Diagnosis = {
    canvasKitGlobal: Platform.OS !== 'web' || !!ck,
    skiaObject: !!Skia,
    runtimeEffectApi: !!(Skia && Skia.RuntimeEffect && typeof Skia.RuntimeEffect.Make === 'function'),
    rnskiaCompile: 'null',
    directCompileError: null,
  };

  let effect: ReturnType<typeof Skia.RuntimeEffect.Make> | null = null;
  if (d.runtimeEffectApi) {
    try {
      effect = Skia.RuntimeEffect.Make(SKSL);
      d.rnskiaCompile = effect ? 'ok' : 'null';
    } catch (e) {
      d.rnskiaCompile = `threw: ${e instanceof Error ? e.message : String(e)}`;
    }
  } else {
    d.rnskiaCompile = 'RuntimeEffect API missing';
  }

  // Web: also compile through RAW CanvasKit with the error callback, which
  // hands back the actual SkSL compiler message — the ground truth.
  if (Platform.OS === 'web' && ck?.RuntimeEffect?.Make) {
    try {
      let err: string | null = null;
      const fx = ck.RuntimeEffect.Make(SKSL, (e: unknown) => {
        err = String(e);
      });
      d.directCompileError = fx ? null : (err ?? 'returned null without error text');
    } catch (e) {
      d.directCompileError = `threw: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return { d, effect };
}

export function SkiaProbe() {
  const { d, effect } = diagnose();
  const allOk = d.canvasKitGlobal && d.skiaObject && d.runtimeEffectApi && d.rnskiaCompile === 'ok';

  // Expose for headless checks.
  if (Platform.OS === 'web' && typeof globalThis !== 'undefined') {
    (globalThis as Record<string, unknown>).__SKIA_PROBE__ = { ...d, allOk };
  }

  const Row = ({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) => (
    <Text style={[styles.row, { color: ok ? '#7FD8A4' : '#FF7A7A' }]}>
      {ok ? '✓' : '✗'} {label}
      {detail ? `  —  ${detail}` : ''}
    </Text>
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.root}>
      <Text style={styles.label} accessibilityRole="header">
        SKIA_PROBE
      </Text>

      <View style={styles.diag}>
        <Row label="CanvasKit global present" ok={d.canvasKitGlobal} />
        <Row label="RNSkia Skia object" ok={d.skiaObject} />
        <Row label="RuntimeEffect API wired" ok={d.runtimeEffectApi} />
        <Row
          label="SkSL compile (RNSkia path)"
          ok={d.rnskiaCompile === 'ok'}
          detail={d.rnskiaCompile !== 'ok' ? d.rnskiaCompile : undefined}
        />
        {d.directCompileError ? (
          <Text style={[styles.row, { color: '#FFB37A' }]} selectable>
            SkSL compiler said: {d.directCompileError}
          </Text>
        ) : null}
      </View>

      <View style={styles.canvasWrap}>
        <Canvas style={{ width: W, height: H }}>
          {/* dark theater background — same token as the results experience */}
          <Fill color="#0A0B12" />

          {/* SkSL shader patch (top-left quadrant) — proves RuntimeEffect runs */}
          {effect ? (
            <Group clip={{ x: 16, y: 16, width: 120, height: 120 }}>
              <Fill>
                <Shader source={effect} uniforms={{ u_res: [W, H] }} />
              </Fill>
            </Group>
          ) : null}

          {/* Two ADDITIVE blurred circles. The overlap is the proof of plus. */}
          <Circle cx={150} cy={210} r={64} color="#147CFF" blendMode="plus">
            <Blur blur={18} />
          </Circle>
          <Circle cx={210} cy={210} r={64} color="#FF7A3C" blendMode="plus">
            <Blur blur={18} />
          </Circle>
        </Canvas>
      </View>

      <Text style={styles.foot}>
        {allOk
          ? 'Expect: a blue→warm shader square top-left, and two glowing circles whose overlap is BRIGHTER than either circle (additive).'
          : 'Something above is red — that line is the exact failure. Screenshot this screen.'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0A0B12' },
  root: { alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 48, minHeight: '100%' },
  label: { color: '#EAF2FF', fontSize: 22, fontWeight: '700', letterSpacing: 1 },
  diag: { gap: 6, maxWidth: 340, alignSelf: 'center' },
  row: { fontSize: 13, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  canvasWrap: { width: W, height: H, borderRadius: 16, overflow: 'hidden' },
  foot: { color: '#6F7E93', fontSize: 12, maxWidth: 320, textAlign: 'center' },
});

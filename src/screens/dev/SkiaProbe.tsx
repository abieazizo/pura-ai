/**
 * SkiaProbe — Step 0 bundle/web proof for @shopify/react-native-skia.
 *
 * This is NOT a product screen. It is the smallest possible canvas that
 * exercises EVERY Skia feature the results experience depends on, so we can
 * prove the GPU path actually renders (on web via CanvasKit, on a dev client
 * natively) BEFORE building any feature on top of it:
 *
 *   1. <Canvas> mounts and paints at all.
 *   2. blendMode="plus"  — true ADDITIVE compositing (the on-skin glow + halo).
 *      Where the blue and warm circles overlap, the result BRIGHTENS toward
 *      white — additive, not src-over. That overlap is the whole proof.
 *   3. Blur               — the feathered falloff the glow + bloom need.
 *   4. RuntimeEffect (SkSL) — the orb/glow fragment shaders compile + run.
 *
 * It also writes window.__SKIA_PROBE__ with the outcome so a headless check can
 * read pass/fail without a screenshot.
 */
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  Fill,
  Circle,
  Blur,
  Shader,
  Skia,
  Group,
} from '@shopify/react-native-skia';
import { useSkiaReady } from '@/skia/useSkiaReady';

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

export function SkiaProbe() {
  const skiaReady = useSkiaReady();

  if (!skiaReady) {
    return (
      <View style={styles.root}>
        <Text style={styles.label}>SKIA_PROBE</Text>
        <Text style={styles.sub}>loading CanvasKit (WASM)…</Text>
      </View>
    );
  }

  let shaderOk = false;
  let effect: ReturnType<typeof Skia.RuntimeEffect.Make> | null = null;
  try {
    effect = Skia.RuntimeEffect.Make(SKSL);
    shaderOk = !!effect;
  } catch (e) {
    shaderOk = false;
  }

  // Record the outcome for the headless verifier (web only).
  if (Platform.OS === 'web' && typeof globalThis !== 'undefined') {
    (globalThis as Record<string, unknown>).__SKIA_PROBE__ = {
      mounted: true,
      shaderCompiled: shaderOk,
      platform: Platform.OS,
    };
  }

  return (
    <View style={styles.root}>
      <Text style={styles.label} accessibilityRole="header">
        SKIA_PROBE
      </Text>
      <Text style={styles.sub}>
        shader: {shaderOk ? 'compiled' : 'FAILED'} · plus-blend overlap should brighten
      </Text>

      <View style={styles.canvasWrap}>
        <Canvas style={{ width: W, height: H }}>
          {/* dark theater background — same token as the results experience */}
          <Fill color="#0A0B12" />

          {/* SkSL shader patch (top-left quadrant) — proves RuntimeEffect runs */}
          {effect ? (
            <Group
              clip={{ x: 16, y: 16, width: 120, height: 120 }}
            >
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
        If the two circles' overlap is brighter than either circle, additive
        compositing works.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0B12', alignItems: 'center', justifyContent: 'center', gap: 12 },
  label: { color: '#EAF2FF', fontSize: 22, fontWeight: '700', letterSpacing: 1 },
  sub: { color: '#9FB3CC', fontSize: 13 },
  canvasWrap: { width: W, height: H, borderRadius: 16, overflow: 'hidden' },
  foot: { color: '#6F7E93', fontSize: 12, maxWidth: 320, textAlign: 'center' },
});

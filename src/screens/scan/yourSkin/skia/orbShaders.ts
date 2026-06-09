/**
 * orbShaders — the SkSL fragment-shader sources for the "Your Skin" GPU path.
 *
 * These are PLAIN STRINGS, so this file is import-safe even though
 * `@shopify/react-native-skia` is not installed (the components that COMPILE
 * them — AuroraOrbSkia / GlowFieldSkia — are the orphans). Keeping the SkSL in
 * one reviewable place is the spirit of the project's "single dial board" rule:
 * the look is tunable here without touching the render plumbing.
 *
 * Two real fragment shaders, exactly as the brief specifies:
 *   • ORB_SKSL  — the living aurora sphere (drifting wisps, off-centre core
 *                 luminosity, feathered edge), emotion-mixed calm/warm/muted and
 *                 biased by the canonical scanTone.
 *   • GLOW_SKSL — the on-skin additive bloom: a soft radial with a hot inner
 *                 core that falls to nothing before the clip edge, drawn with
 *                 BlendMode.Plus so it ADDS light on every skin tone.
 *
 * Colour convention: shaders return PREMULTIPLIED colour (`rgb * a, a`) so the
 * Paint's BlendMode.Plus adds light cleanly (no source-over darkening).
 */

// ─────────────────────────────────────────────────────────────────────────────
// ORB — the aurora sphere. uv in 0..1; emotion 0 calm · 1 warm · 2 muted;
// tone 0 balanced · 1 reactive(cooler) · 2 active(magenta). u_time in seconds.
// ─────────────────────────────────────────────────────────────────────────────

export const ORB_SKSL = /* glsl */ `
uniform float2 u_size;
uniform float  u_time;      // seconds (Skia clock / 1000)
uniform float  u_emotion;   // 0 calm, 1 warm, 2 muted
uniform float  u_tone;      // 0 balanced, 1 reactive (cool), 2 active (magenta)

half4 main(float2 fc) {
  float2 uv = fc / u_size;
  float2 c  = float2(0.5);
  float  d  = distance(uv, c);

  // Off-centre light origin (upper-left) → the sphere reads lit, not flat.
  float2 lo  = float2(0.37, 0.31);
  float  core = smoothstep(0.5, 0.0, distance(uv, lo));

  // Drifting aurora wisps — three bands at different speeds/axes so the light
  // flows rather than pulses uniformly.
  float t  = u_time;
  float w1 = sin(uv.x * 6.0 + t * 0.7) * 0.5 + 0.5;
  float w2 = sin(uv.y * 5.0 - t * 0.5) * 0.5 + 0.5;
  float w3 = sin((uv.x + uv.y) * 4.0 + t * 0.35) * 0.5 + 0.5;
  float wisp = mix(w1, w3, 0.5);

  // CALM palette, tone-biased. Balanced = violet→blue; reactive leans cooler;
  // active nudges toward a soft magenta. (scanTone-aware, per the orb spec.)
  half3 calmLo = mix(half3(0.61, 0.55, 0.95), half3(0.45, 0.62, 0.92), clamp(u_tone, 0.0, 1.0));
  half3 calmHi = mix(half3(0.69, 0.78, 1.00), half3(0.62, 0.72, 0.98), clamp(u_tone, 0.0, 1.0));
  float act = clamp(u_tone - 1.0, 0.0, 1.0);
  calmLo = mix(calmLo, half3(0.74, 0.55, 0.86), act);
  calmHi = mix(calmHi, half3(0.84, 0.70, 0.95), act);

  half3 calm  = mix(calmLo, calmHi, wisp);
  half3 warm  = mix(half3(1.00, 0.72, 0.42), half3(1.00, 0.86, 0.55), w1);
  half3 muted = mix(half3(0.60, 0.63, 0.71), half3(0.70, 0.74, 0.81), w1);

  // Emotion mix: calm ↔ warm ↔ muted (0..2).
  half3 col = u_emotion < 1.0
    ? mix(calm, warm, u_emotion)
    : mix(warm, muted, u_emotion - 1.0);

  col += half3(core) * 0.6;     // inner luminosity
  col += half3(0.04) * w2;      // faint second band for depth

  float edge = smoothstep(0.5, 0.42, d);   // feathered sphere edge
  return half4(col * edge, edge);          // premultiplied → Paint blends Plus
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// ON-SKIN GLOW — a soft additive bloom. Fades to 0 BEFORE the clip-polygon edge
// so the region clip is a safety boundary, never the visible edge. u_alpha is
// already capped (≤ GLOW_ALPHA_CAP, halved on low confidence) by the caller.
// ─────────────────────────────────────────────────────────────────────────────

export const GLOW_SKSL = /* glsl */ `
uniform float2 u_size;
uniform float2 u_center;   // bloom centre, layer px
uniform float  u_radius;   // feather radius, px
uniform half3  u_color;    // the light we ADD (metric tint glow colour)
uniform float  u_alpha;    // peak alpha, already capped ≤ 0.32

half4 main(float2 fc) {
  float d     = distance(fc, u_center) / max(u_radius, 1.0);
  float core  = smoothstep(1.0, 0.0, d);   // 1 at centre → 0 at edge
  float bloom = pow(core, 1.6);            // soft, hot inner core
  float a     = bloom * u_alpha;
  return half4(u_color * a, a);            // premultiplied additive
}
`;

/** Parse "#RRGGBB" / "rgb(r,g,b)" / "rgba(...)" → [r,g,b] in 0..1 for a half3
 *  uniform. Lives here so both the orb and glow read colours the same way. */
export function colorToVec3(input: string): [number, number, number] {
  const s = input.trim();
  if (s.startsWith('#')) {
    const h = s.slice(1);
    const hex = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
    ];
  }
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const [r, g, b] = m[1].split(',').map((v) => parseFloat(v.trim()));
    return [(r || 0) / 255, (g || 0) / 255, (b || 0) / 255];
  }
  return [1, 1, 1];
}

/** scanTone → the orb's `u_tone` uniform. Keeps the orb scan-aware in one place. */
export function toneUniform(scanTone: 'reactive' | 'active' | 'balanced' | 'none'): number {
  switch (scanTone) {
    case 'reactive':
      return 1; // cooler, water-like
    case 'active':
      return 2; // warmer magenta
    default:
      return 0; // balanced
  }
}

/** emotion word → the orb's `u_emotion` target. */
export const ORB_EMOTION = { calm: 0, warm: 1, muted: 2 } as const;
export type OrbEmotion = keyof typeof ORB_EMOTION;

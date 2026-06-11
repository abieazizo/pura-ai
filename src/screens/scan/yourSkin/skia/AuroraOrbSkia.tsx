/**
 * AuroraOrbSkia — the FULL-FIDELITY, GPU orb for "Your Skin" (screen 2).
 *
 * ⚠️ ORPHAN BY DESIGN. Nothing imports this file by default, so Metro never
 * bundles it and the (uninstalled) Skia package cannot break the build. The
 * `// @ts-nocheck` keeps the project typecheck green until the dependency exists.
 * It is a drop-in superset of `AssistantAuroraOrb` (same props: state, size,
 * scanTone) plus an imperative emotion handle — so enabling it is a one-line
 * import swap (see ./README.md).
 *
 * WHY SKIA (and why the RN/SVG fallback can't fully do this): the living orb is
 * a real SkSL FRAGMENT SHADER (orbShaders.ORB_SKSL) running per-pixel on the
 * GPU — drifting aurora wisps, an off-centre core, a feathered sphere edge —
 * something a stack of blurred <Ellipse>s only approximates. Around it a large
 * additive HALO (BlendMode.Plus, MaskFilter blur ~30, ~2.3× the orb) CASTS
 * light: it tints whatever sits behind it, which is the whole point of the
 * editorial composition (headline + card tops catch the orb's light).
 *
 * Motion is 100% Reanimated worklets on the UI thread:
 *   • u_time         ← Skia useClock() (GPU frame clock)
 *   • breathing      ← scale 1↔1.04, withRepeat(withTiming 5200ms inOut)
 *   • halo opacity   ← counter-phase to the breath (exhale = brighter cast)
 *   • u_emotion      ← a SharedValue. stepDone() → withTiming(warm,600)→calm +
 *                       Haptics.Medium + happy upturned eyes; stepSkip() →
 *                       withTiming(muted)→calm + a dimmed, shrunken halo.
 *
 * Reduce Motion: wisps freeze (clock paused), breathing/halo pulse stop, the orb
 * holds a calm steady state — still a luminous GPU sphere, never a dead circle.
 */

import React, { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Canvas,
  Circle,
  Fill,
  Group,
  Path,
  Paint,
  Blur,
  RadialGradient,
  Shader,
  Skia,
  vec,
  useClock,
} from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import {
  ORB_SKSL,
  ORB_EMOTION,
  toneUniform,
  type OrbEmotion,
} from './orbShaders';

export type AssistantOrbState = 'idle' | 'listening' | 'thinking' | 'responding';
export type AssistantScanTone = 'reactive' | 'active' | 'balanced' | 'none';

export interface AuroraOrbSkiaHandle {
  /** A finished step: warm-gold beat + Medium haptic + happy eyes, then calm. */
  stepDone(): void;
  /** A skipped step: muted beat + dimmed/shrunken halo, then calm. No haptic. */
  stepSkip(): void;
}

export interface AuroraOrbSkiaProps {
  state: AssistantOrbState;
  /** Footprint in px (drop-in with AssistantAuroraOrb). Default 92. */
  size?: number;
  scanTone?: AssistantScanTone;
  /** Initial steady emotion (rarely needed; beats are driven via the ref). */
  emotion?: OrbEmotion;
  /** Force-disable motion (tests / dev gallery). Defaults to the OS setting. */
  forceReduceMotion?: boolean;
}

// Geometry, all fractions of `size` (matches the RN orb so it drops in 1:1).
const CORE_R = 0.35;          // sphere radius
const HALO_SCALE = 2.3;       // additive cast-light halo ≈ 2.3× the orb
const CANVAS_SPAN = 2.5;      // canvas is larger than `size` so the halo isn't clipped

// Face anchors (fractions of size), mirroring AssistantAuroraOrb's minimalist face.
const EYE_DX = 0.12;
const EYE_Y = 0.50;
const BROW_Y = 0.44;
const NOSE_Y = 0.54;

// State → halo/breath energy (kept close to the RN orb's STATE table).
const STATE_ENERGY: Record<AssistantOrbState, { haloBase: number; breathMs: number; breathAmp: number }> = {
  idle:       { haloBase: 0.55, breathMs: 5200, breathAmp: 1.04 },
  listening:  { haloBase: 0.70, breathMs: 2600, breathAmp: 1.05 },
  thinking:   { haloBase: 0.85, breathMs: 2200, breathAmp: 1.06 },
  responding: { haloBase: 0.72, breathMs: 3000, breathAmp: 1.045 },
};

const TONE_HALO: Record<AssistantScanTone, [string, string]> = {
  balanced: ['#9B8CDA', '#88C3DA'],
  reactive: ['#7FB6E6', '#8FD0E0'],
  active:   ['#B98CD6', '#88C0DA'],
  none:     ['#9A8FD6', '#90C2DC'],
};

export const AuroraOrbSkia = forwardRef<AuroraOrbSkiaHandle, AuroraOrbSkiaProps>(
  function AuroraOrbSkia(
    { state, size = 92, scanTone = 'balanced', emotion = 'calm', forceReduceMotion },
    ref,
  ) {
    const sysReduce = useReduceMotion();
    const reduce = forceReduceMotion ?? sysReduce;

    // Compile the fragment shader at RENDER time (never module scope): on web the
    // SkiaGate only mounts this component once CanvasKit is ready, so deferring
    // the compile here guarantees Skia.RuntimeEffect exists. Memoised → once/mount.
    const ORB_EFFECT = useMemo(() => Skia.RuntimeEffect.Make(ORB_SKSL), []);

    const span = Math.round(size * CANVAS_SPAN);
    const cx = span / 2;
    const cy = span / 2;
    const coreR = size * CORE_R;
    const haloR = coreR * HALO_SCALE;
    const tone = toneUniform(scanTone);
    const [haloA, haloB] = TONE_HALO[scanTone] ?? TONE_HALO.balanced;

    // ── Clock (wisp drift). Paused under Reduce Motion (held at a calm frame). ──
    const clock = useClock();
    const energy = STATE_ENERGY[state] ?? STATE_ENERGY.idle;

    // ── Breathing + counter-phase halo ──────────────────────────────────────
    const breath = useSharedValue(1);
    const emotionV = useSharedValue(ORB_EMOTION[emotion] ?? 0);
    const happy = useSharedValue(0);       // 0 dot eyes → 1 upturned "happy" eyes
    const haloDim = useSharedValue(1);     // skip beat shrinks/dims the halo

    useEffect(() => {
      if (reduce) {
        cancelAnimation(breath);
        breath.value = 1;
        return;
      }
      breath.value = withRepeat(
        withSequence(
          withTiming(energy.breathAmp, { duration: energy.breathMs, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: energy.breathMs, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      return () => cancelAnimation(breath);
    }, [reduce, energy.breathAmp, energy.breathMs, breath]);

    // ── Shader uniforms (UI-thread derived) ─────────────────────────────────
    const uniforms = useDerivedValue(() => {
      'worklet';
      const t = reduce ? 1.6 : clock.value / 1000;   // a fixed, pleasing frame when reduced
      return {
        u_size: [size, size],
        u_time: t,
        u_emotion: emotionV.value,
        u_tone: tone,
      };
    }, [size, tone, reduce]);

    // Breath transform around the orb centre.
    const orbTransform = useDerivedValue(() => {
      'worklet';
      return [{ scale: breath.value }];
    });

    // Halo opacity = base × (exhale brighter) × dim. breath 1..amp → 1..0 phase.
    const haloOpacity = useDerivedValue(() => {
      'worklet';
      const amp = energy.breathAmp - 1 || 0.0001;
      const phase = (breath.value - 1) / amp;        // 0 at rest, 1 at peak inhale
      const counter = 1 - 0.35 * phase;              // brighter on the exhale
      return energy.haloBase * counter * haloDim.value;
    }, [energy.haloBase, energy.breathAmp]);

    const haloTransform = useDerivedValue(() => {
      'worklet';
      const s = 0.92 + 0.08 * haloDim.value;          // shrinks slightly on skip
      return [{ scale: s }];
    });

    // ── Emotion beats (imperative) ──────────────────────────────────────────
    const fireMedium = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    };
    useImperativeHandle(
      ref,
      (): AuroraOrbSkiaHandle => ({
        stepDone() {
          runOnJS(fireMedium)();
          if (reduce) {
            emotionV.value = withSequence(
              withTiming(ORB_EMOTION.warm, { duration: 1 }),
              withDelay(420, withTiming(ORB_EMOTION.calm, { duration: 1 })),
            );
            happy.value = withSequence(withTiming(1, { duration: 1 }), withDelay(620, withTiming(0, { duration: 1 })));
            return;
          }
          emotionV.value = withSequence(
            withTiming(ORB_EMOTION.warm, { duration: 600, easing: Easing.out(Easing.cubic) }),
            withDelay(380, withTiming(ORB_EMOTION.calm, { duration: 700, easing: Easing.inOut(Easing.ease) })),
          );
          happy.value = withSequence(
            withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }),
            withDelay(560, withTiming(0, { duration: 360, easing: Easing.inOut(Easing.ease) })),
          );
        },
        stepSkip() {
          if (reduce) {
            emotionV.value = withSequence(
              withTiming(ORB_EMOTION.muted, { duration: 1 }),
              withDelay(420, withTiming(ORB_EMOTION.calm, { duration: 1 })),
            );
            return;
          }
          emotionV.value = withSequence(
            withTiming(ORB_EMOTION.muted, { duration: 520, easing: Easing.out(Easing.cubic) }),
            withDelay(260, withTiming(ORB_EMOTION.calm, { duration: 640, easing: Easing.inOut(Easing.ease) })),
          );
          haloDim.value = withSequence(
            withTiming(0.55, { duration: 420, easing: Easing.out(Easing.cubic) }),
            withDelay(220, withTiming(1, { duration: 680, easing: Easing.inOut(Easing.ease) })),
          );
        },
      }),
      [reduce],
    );

    // ── Face paths (Skia) — dot eyes (calm) cross-fading to upturned (happy). ──
    const eyePaths = useMemo(() => {
      const dx = EYE_DX * size;
      const eyeY = EYE_Y * size;
      const r = 0.026 * size;
      const dot = (sx: number) => {
        const p = Skia.Path.Make();
        p.addCircle(cx + sx, cy - size / 2 + eyeY, r);
        return p;
      };
      const arc = (sx: number) => {
        const p = Skia.Path.Make();
        const ax = cx + sx;
        const ay = cy - size / 2 + eyeY;
        const w = 0.055 * size;
        p.moveTo(ax - w, ay + r * 0.6);
        p.quadTo(ax, ay - r * 1.1, ax + w, ay + r * 0.6);   // upturned smile-eye
        return p;
      };
      return {
        leftDot: dot(-dx),
        rightDot: dot(dx),
        leftArc: arc(-dx),
        rightArc: arc(dx),
      };
    }, [size, cx, cy]);

    const browPath = useMemo(() => {
      const dx = EYE_DX * size;
      const browY = cy - size / 2 + BROW_Y * size;
      const w = 0.05 * size;
      const p = Skia.Path.Make();
      for (const s of [-dx, dx]) {
        const bx = cx + s;
        p.moveTo(bx - w, browY + 2);
        p.quadTo(bx, browY - 3, bx + w, browY + 2);
      }
      return p;
    }, [size, cx, cy]);

    // Short nose LINE (no mouth) — mirrors AssistantAuroraOrb's minimalist face
    // so the Skia orb reads as the same character, per the spec's face anatomy.
    const nosePath = useMemo(() => {
      const p = Skia.Path.Make();
      const nx = cx;
      const ny = cy - size / 2 + NOSE_Y * size;
      const len = 0.06 * size;
      p.moveTo(nx, ny);
      p.lineTo(nx, ny + len);
      return p;
    }, [size, cx, cy]);

    const dotOpacity = useDerivedValue(() => 1 - happy.value);
    const arcOpacity = useDerivedValue(() => happy.value);

    const wrap: ViewStyle = {
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
    };

    if (!ORB_EFFECT) {
      // Shader failed to compile (should never happen) — fail honest, not ugly.
      return <View accessibilityRole="image" accessibilityLabel="Pura Assist" style={wrap} />;
    }

    return (
      <View accessibilityRole="image" accessibilityLabel="Pura Assist" style={wrap} pointerEvents="none">
        <Canvas style={{ position: 'absolute', width: span, height: span, left: (size - span) / 2, top: (size - span) / 2 }}>
          {/* 1 · Additive cast-light HALO — blurred radial, BlendMode.Plus, ~2.3× */}
          <Group
            transform={haloTransform}
            origin={vec(cx, cy)}
            opacity={haloOpacity}
            layer={
              <Paint>
                <Blur blur={Math.max(12, size * 0.34)} />
              </Paint>
            }
            blendMode="plus"
          >
            <Circle cx={cx} cy={cy} r={haloR}>
              <RadialGradient
                c={vec(cx, cy)}
                r={haloR}
                colors={[haloA, haloB, 'rgba(0,0,0,0)']}
                positions={[0, 0.55, 1]}
              />
            </Circle>
          </Group>

          {/* 2 · The aurora sphere — real SkSL fragment shader, breathing. */}
          <Group transform={orbTransform} origin={vec(cx, cy)}>
            <Group
              transform={[
                { translateX: cx - coreR },
                { translateY: cy - coreR },
                { scale: (2 * coreR) / size },
              ]}
              layer={
                <Paint>
                  <Blur blur={Math.max(0.6, size * 0.02)} />
                </Paint>
              }
            >
              {/* The SkSL sphere occupies its own [0..size] box; this group
                  transform maps that box to a centred sphere of radius coreR.
                  The shader's OWN feathered alpha (edge smoothstep 0.42→0.5) is
                  the visible edge — no hard clip, so the feather is preserved
                  and the sphere fills ~70% of the footprint like the RN orb. */}
              <Fill>
                <Shader source={ORB_EFFECT} uniforms={uniforms} />
              </Fill>
            </Group>

            {/* 3 · The minimalist face. Eyes cross-fade dot → upturned on warm. */}
            <Group opacity={dotOpacity}>
              <Path path={eyePaths.leftDot} color="#FFFFFF" />
              <Path path={eyePaths.rightDot} color="#FFFFFF" />
            </Group>
            <Group opacity={arcOpacity}>
              <Path path={eyePaths.leftArc} style="stroke" strokeWidth={Math.max(1.4, size * 0.02)} strokeCap="round" color="#FFFFFF" />
              <Path path={eyePaths.rightArc} style="stroke" strokeWidth={Math.max(1.4, size * 0.02)} strokeCap="round" color="#FFFFFF" />
            </Group>
            <Path path={browPath} style="stroke" strokeWidth={Math.max(1.2, size * 0.018)} strokeCap="round" color="rgba(255,255,255,0.92)" />
            <Path path={nosePath} style="stroke" strokeWidth={Math.max(1, size * 0.014)} strokeCap="round" color="rgba(255,255,255,0.82)" />
          </Group>
        </Canvas>
      </View>
    );
  },
);

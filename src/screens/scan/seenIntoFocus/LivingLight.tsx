/**
 * LivingLight — the companion at the top of the "Seen Into Focus" moment.
 *
 * A calm aurora of light that WAKES, leans toward the face and breathes while
 * it examines, then POPS and "turns to you" at the settle, blooming a warm cast
 * toward the viewer. It is the apparent source of the warm key that tracks the
 * gaze on the photo below.
 *
 * IMPLEMENTATION CHOICE (decide-and-justify): this is built with the app's
 * proven RNSVG aurora technique — transparent-fading radial gradients that
 * feather softly without a blur filter, exactly like the shipped
 * AssistantAuroraOrb. That means it renders IDENTICALLY with or without Skia
 * and stays on-brand. Skia is reserved for the face compositor (animated blur +
 * a moving clarity mask + soft-light), which genuinely cannot be done in
 * RN/SVG. Motion is 100% Reanimated UI-thread transforms/opacity — nothing
 * animates layout or a blur radius.
 *
 * Driven entirely by two shared values from the screen (`progress` 0→1 over
 * SETTLE, `settle` 0→1 during the 300ms pop) plus one internal breathing clock,
 * so the companion never re-renders mid-beat.
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { COMPANION, SETTLE, easeIO } from './motion';

export interface LivingLightProps {
  size: number;
  /** Master timeline, 0→1 over SETTLE (linear in time). */
  progress: SharedValue<number>;
  /** Settle pop, 0→1 over COMPANION.settleMs once the examination ends. */
  settle: SharedValue<number>;
  reduceMotion: boolean;
  /**
   * Minimal vector face (two soft eyes + a faint smile). Defaults to TRUE to
   * match Pura's established companion identity (AssistantAuroraOrb has a
   * face); kept whisper-soft so it never competes with the user's photo. The
   * aurora is composed to look right with it off, too.
   */
  showFace?: boolean;
}

export function LivingLight({
  size,
  progress,
  settle,
  reduceMotion,
  showFace = true,
}: LivingLightProps) {
  // One looping breathing phase (radians). Drives sine breathing + blob drift.
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(
      withTiming(Math.PI * 2, {
        duration: COMPANION.breathPeriodMs,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => cancelAnimation(phase);
  }, [phase]);

  // Reduced motion → breathe minimally and don't drift the blobs.
  const breathAmp = reduceMotion ? 0.012 : COMPANION.breathScale.amp;
  const glowAmp = reduceMotion ? 0.012 : COMPANION.breathGlow.amp;
  const driftAmp = reduceMotion ? 0 : 1;

  // ── Phase math, all on the UI thread. ──────────────────────────────────────
  // glow → opacity of the glow layers · scale/lean → container transform.
  const wake = useDerivedValue(() => {
    'worklet';
    const t = progress.value * SETTLE;
    return easeIO(Math.min(1, Math.max(0, t / COMPANION.wakeMs)));
  });

  const glow = useDerivedValue(() => {
    'worklet';
    const breathing = COMPANION.breathGlow.base + glowAmp * Math.sin(phase.value);
    const examining = COMPANION.wakeGlow.from + (breathing - COMPANION.wakeGlow.from) * wake.value;
    return examining + (COMPANION.settleGlow - examining) * settle.value;
  });

  const scale = useDerivedValue(() => {
    'worklet';
    const breathing = COMPANION.breathScale.base + breathAmp * Math.sin(phase.value);
    const examining =
      COMPANION.wakeScale.from + (breathing - COMPANION.wakeScale.from) * wake.value;
    // Settle pop: overshoot to 1.06 then resolve to 1.0.
    const s = settle.value;
    const pop =
      s < 0.5
        ? examining + (COMPANION.settleScalePop.from - examining) * easeIO(s * 2)
        : COMPANION.settleScalePop.from +
          (COMPANION.settleScalePop.to - COMPANION.settleScalePop.from) * easeIO((s - 0.5) * 2);
    return pop;
  });

  const containerStyle = useAnimatedStyle(() => {
    const leanY = COMPANION.leanPx * wake.value * (1 - settle.value);
    return {
      transform: [{ translateY: leanY }, { scale: scale.value }],
    };
  });

  const glowLayerStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const castStyle = useAnimatedStyle(() => ({ opacity: settle.value * COMPANION.castGlow }));

  // Geometry as fractions of size.
  const S = size;
  const C = S / 2;
  const sphereR = S * 0.3;
  const glowR = S * 0.5;
  const blobDefs = useMemo(
    () => [
      { color: COMPANION.blobs[0], r: S * 0.2, x: C - S * 0.06, y: C - S * 0.05 },
      { color: COMPANION.blobs[1], r: S * 0.17, x: C + S * 0.07, y: C + S * 0.02 },
      { color: COMPANION.blobs[2], r: S * 0.13, x: C + S * 0.01, y: C + S * 0.08 },
    ],
    [S, C],
  );

  // Per-blob drift — desynced sines. Three explicit hooks (fixed order).
  const blob0Style = useAnimatedStyle(() => {
    const p = phase.value;
    return {
      transform: [
        { translateX: Math.sin(p + 0.0) * S * 0.05 * driftAmp },
        { translateY: Math.cos(p * 0.8) * S * 0.04 * driftAmp },
      ],
    };
  });
  const blob1Style = useAnimatedStyle(() => {
    const p = phase.value;
    return {
      transform: [
        { translateX: Math.sin(p + 1.7) * S * 0.045 * driftAmp },
        { translateY: Math.cos(p * 0.8 + 2.3) * S * 0.05 * driftAmp },
      ],
    };
  });
  const blob2Style = useAnimatedStyle(() => {
    const p = phase.value;
    return {
      transform: [
        { translateX: Math.sin(p + 3.4) * S * 0.04 * driftAmp },
        { translateY: Math.cos(p * 0.8 + 4.6) * S * 0.035 * driftAmp },
      ],
    };
  });
  const blobStyles = [blob0Style, blob1Style, blob2Style];

  return (
    <Animated.View
      style={[{ width: S, height: S }, containerStyle]}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {/* A · Outer glow — atmospheric diffusion, brightens with `glow`. */}
      <Animated.View style={[StyleSheet.absoluteFill, glowLayerStyle]}>
        <Svg width={S} height={S}>
          <Defs>
            <RadialGradient id="ll-glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={COMPANION.outerGlow} stopOpacity={0.55} />
              <Stop offset="0.55" stopColor={COMPANION.outerGlow} stopOpacity={0.18} />
              <Stop offset="1" stopColor={COMPANION.outerGlow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={C} cy={C} r={glowR} fill="url(#ll-glow)" />
        </Svg>
      </Animated.View>

      {/* B · Sphere body — the "gains its color" radial. */}
      <Svg width={S} height={S} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="ll-sphere" cx="42%" cy="38%" r="62%">
            <Stop offset="0" stopColor={COMPANION.sphere[0]} stopOpacity={1} />
            <Stop offset="0.55" stopColor={COMPANION.sphere[1]} stopOpacity={1} />
            <Stop offset="1" stopColor={COMPANION.sphere[2]} stopOpacity={1} />
          </RadialGradient>
          <RadialGradient id="ll-sheen" cx="38%" cy="30%" r="40%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={C} cy={C} r={sphereR} fill="url(#ll-sphere)" />
        <Ellipse cx={C - sphereR * 0.28} cy={C - sphereR * 0.34} rx={sphereR * 0.5} ry={sphereR * 0.38} fill="url(#ll-sheen)" />
      </Svg>

      {/* D · Aurora wisps — drifting, additive (approximates Screen blend). */}
      {blobDefs.map((b, i) => (
        <Animated.View key={i} style={[StyleSheet.absoluteFill, blobStyles[i]]}>
          <Svg width={S} height={S}>
            <Defs>
              <RadialGradient id={`ll-blob-${i}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={b.color} stopOpacity={0.85} />
                <Stop offset="0.6" stopColor={b.color} stopOpacity={0.3} />
                <Stop offset="1" stopColor={b.color} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={b.x} cy={b.y} r={b.r} fill={`url(#ll-blob-${i})`} />
          </Svg>
        </Animated.View>
      ))}

      {/* E · Minimal face — two soft eyes + a faint smile. Whisper-soft. */}
      {showFace && (
        <Svg width={S} height={S} style={StyleSheet.absoluteFill}>
          <Ellipse cx={C - sphereR * 0.36} cy={C - sphereR * 0.06} rx={sphereR * 0.085} ry={sphereR * 0.12} fill={COMPANION.faceInk} />
          <Ellipse cx={C + sphereR * 0.36} cy={C - sphereR * 0.06} rx={sphereR * 0.085} ry={sphereR * 0.12} fill={COMPANION.faceInk} />
          <Path
            d={`M ${C - sphereR * 0.34} ${C + sphereR * 0.34} Q ${C} ${C + sphereR * 0.52} ${C + sphereR * 0.34} ${C + sphereR * 0.34}`}
            stroke={COMPANION.faceInk}
            strokeWidth={Math.max(1, sphereR * 0.04)}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      )}

      {/* Warm cast toward the viewer — blooms only at settle ("turns to you"). */}
      <Animated.View style={[StyleSheet.absoluteFill, castStyle]} pointerEvents="none">
        <Svg width={S} height={S}>
          <Defs>
            <RadialGradient id="ll-cast" cx="50%" cy="74%" r="46%">
              <Stop offset="0" stopColor={COMPANION.castColor} stopOpacity={0.9} />
              <Stop offset="1" stopColor={COMPANION.castColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={C} cy={C + S * 0.22} r={S * 0.42} fill="url(#ll-cast)" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

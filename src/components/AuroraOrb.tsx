/**
 * AuroraOrb — the living companion at the heart of Pura's onboarding.
 *
 * Screen 1 births it (a point of light blooms into a glowing aurora orb, gains
 * its color, and opens its eyes). Screens 2+ turn it into the user's COMPANION
 * and INTERVIEWER: it gazes, speaks, leans in, and REACTS distinctly to answers.
 *
 * This is a SELF-CONTAINED, SIZE-DRIVEN component: every internal dimension is
 * a fraction of the `size` prop, so one instance can be reused as a shared
 * element across onboarding screens (the OrbHost mounts it once and re-targets
 * it). It owns no layout assumptions beyond "center me in a box".
 *
 * TWO control surfaces:
 *   • Declarative props — `state` (awakening | idle), `familiarity` (0→1
 *     warmth), `performanceTier`, `reduceMotion`. Rarely change → cheap.
 *   • Imperative handle (ref) — the cinematic controls a host sequences in a
 *     timeline: setGaze, setExpression, emphasisPulse, react, shimmer,
 *     blinkNow, setFamiliarity. Each animates a UI-thread shared value, so the
 *     orb never re-renders mid-beat.
 *
 * Visual anatomy (bottom → top):
 *   A  Ground glow   — light cast on the porcelain surface (2.2× core)
 *   B  Halo          — atmospheric diffusion (1.4× core); brightens on react
 *   ·  Ripples       — breath rings emanating outward, forever
 *   C  Core orb      — body (pale+full crossfade "gains color") + glossy sheen
 *   ·  Warmth        — familiarity overlay (warms + fullens as it gets to know)
 *   ·  React glow    — cool-bright bloom when it acknowledges an answer
 *   D  Aurora wisps  — soft internal flow, three desynced rotations
 *   ·  Shimmer       — Screen 2's atmospheric "then I'll read your skin" sweep
 *   E  The face      — two dot eyes (gaze + blink), two brows (raise/tilt per
 *                      expression), a nose line (no mouth)
 *
 * Soft edges are built from radial gradients that fade to transparent — this
 * RNSVG build ships no blur filter, and transparent-fading gradients feather
 * identically on web and native. All color literals come from `auroraOrb`.
 *
 * Performance: ALL animation is Reanimated UI-thread transforms / opacity /
 * stroke-dashoffset. NOTHING animates layout or blur radius. The performance
 * tier trims ripple + wisp count on low-end devices. Holds 60fps (120 on
 * ProMotion); profile on a budget Android before shipping.
 */

import React, {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { PixelRatio, Platform, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Line,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedSensor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  SensorType,
  type SharedValue,
} from 'react-native-reanimated';
import { auroraOrb as C } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(Line);

export type AuroraOrbState = 'awakening' | 'idle';

/** Where the eyes look. */
export type OrbGaze = 'down' | 'forward' | 'driftLeft' | 'driftRight';

/** Sustained facial expressions (brows + eye openness). */
export type OrbExpression =
  | 'neutral'
  | 'warm'
  | 'focused'
  | 'curious'
  | 'reassuring';

/**
 * The five distinct reactions for Screen 3's goal question. Each is a
 * deliberately different expression + glow choreography so the user FEELS the
 * orb respond to *their* answer — never a canned one-size animation.
 */
export type OrbReaction =
  | 'calmClear' // softens, warm glow, slow contented double-blink
  | 'breakouts' // sharpens to focused, single brighter pulse
  | 'aging' // steadies, slow confident pulse
  | 'darkSpots' // curious attentive head-tilt
  | 'unsure'; // the warmest bloom — "that's exactly what I'm here for"

export type OrbPerfTier = 'high' | 'low';

/**
 * Imperative control surface. A host (OrbHost) grabs this via ref and
 * sequences the cinematic beats; every method animates a UI-thread shared
 * value, so calling them never triggers a React re-render.
 */
export interface AuroraOrbHandle {
  setGaze(dir: OrbGaze): void;
  setExpression(expr: OrbExpression): void;
  /** Screen 2's "leans in on you" — brightness +8% + scale 1.0→1.03→1.0. */
  emphasisPulse(): void;
  /** One of the five distinct goal-question reactions. */
  react(key: OrbReaction): void;
  /** Screen 2's atmospheric shimmer (degrades to a brightening sweep). */
  shimmer(): void;
  blinkNow(): void;
  /** Animate the orb-as-progress warmth to v (0→1). */
  setFamiliarity(v: number): void;
}

export interface AuroraOrbProps {
  /** Core orb diameter in px. Everything inside scales from this. */
  size: number;
  /**
   * 'awakening' plays the full birth timeline (first launch). 'idle' renders
   * the orb fully formed and runs only the living-idle loops (repeat launch /
   * after a sibling has already awoken it).
   */
  state: AuroraOrbState;
  /**
   * Orb-as-progress warmth, 0→1. The companion's glow warms + fullens as the
   * user answers more questions. Drives the same shared value as the handle's
   * setFamiliarity; either path works.
   */
  familiarity?: number;
  /**
   * Render fidelity. 'high' = full layer count (ProMotion / high-end). 'low'
   * = fewer ripples + wisps for budget devices. Defaults to an auto heuristic.
   */
  performanceTier?: OrbPerfTier;
  /** Device-tilt parallax (front plane up to ~8px). No-op without a gyro. */
  enableParallax?: boolean;
  /** When true: fully-formed, completely static (no birth, no idle motion). */
  reduceMotion?: boolean;
  /** Fires once the face has opened its eyes + brows + first blink (~T=2480ms
   *  in awakening; immediately in idle/static). Lets a host chain off "alive". */
  onAwake?: () => void;
}

// Awakening timeline (ms from mount). Mirrors the cold-open spec exactly.
const T = {
  seed: 100,
  bloom: 350,
  ground: 350,
  halo: 500,
  wisps: 800,
  ripple: 1000,
  eyeL: 1700,
  eyeR: 1760,
  brows: 1900,
  nose: 2050,
  blink: 2300,
  breath: 1100,
  drift: 2000,
} as const;

const RIPPLE_COUNT_HIGH = 5;
const RIPPLE_COUNT_LOW = 3;
const RIPPLE_PERIOD = 3000;
const RIPPLE_STAGGER = 700;

// Easings (authored once).
const EASE_OUT = Easing.out(Easing.cubic);
const EASE_OUT_QUAD = Easing.out(Easing.quad);
const EASE_IN_QUAD = Easing.in(Easing.quad);
const EASE_IO = Easing.inOut(Easing.sin);
const EASE_IO_CUBIC = Easing.inOut(Easing.cubic);

// Expression presets → brow raise (−1..1), brow tilt (−1..1, + = inner-up),
// eye openness (1 = neutral). These are the orb's emotional vocabulary.
const EXPRESSIONS: Record<
  OrbExpression,
  { raise: number; tilt: number; eyeOpen: number }
> = {
  neutral: { raise: 0, tilt: 0, eyeOpen: 1 },
  warm: { raise: 0.5, tilt: 0.35, eyeOpen: 0.82 },
  focused: { raise: -0.35, tilt: -0.4, eyeOpen: 1.06 },
  curious: { raise: 0.45, tilt: 0.7, eyeOpen: 1.0 },
  reassuring: { raise: 0.35, tilt: 0.22, eyeOpen: 0.9 },
};

// Auto performance tier — a weak heuristic when the host doesn't pass one.
// Budget Androids tend to report a lower pixel ratio; iOS is treated as high.
function autoTier(): OrbPerfTier {
  if (Platform.OS === 'android' && PixelRatio.get() < 2.5) return 'low';
  return 'high';
}

export const AuroraOrb = forwardRef<AuroraOrbHandle, AuroraOrbProps>(
  function AuroraOrb(
    {
      size,
      state,
      familiarity = 0,
      performanceTier,
      enableParallax = false,
      reduceMotion = false,
      onAwake,
    },
    ref,
  ) {
    const uid = useId();
    const ids = useMemo(
      () => ({
        bodyFull: `aurora-bodyFull-${uid}`,
        bodyPale: `aurora-bodyPale-${uid}`,
        hiFull: `aurora-hiFull-${uid}`,
        hiPale: `aurora-hiPale-${uid}`,
        specular: `aurora-specular-${uid}`,
        halo: `aurora-halo-${uid}`,
        ground: `aurora-ground-${uid}`,
        wispC: `aurora-wispC-${uid}`,
        wispV: `aurora-wispV-${uid}`,
        seed: `aurora-seed-${uid}`,
        driftV: `aurora-driftV-${uid}`,
        driftC: `aurora-driftC-${uid}`,
        warm: `aurora-warm-${uid}`,
        react: `aurora-react-${uid}`,
        shimmer: `aurora-shimmer-${uid}`,
      }),
      [uid],
    );

    // 'static' = formed + frozen; 'awakening' = full birth; 'idle' = formed + alive.
    const mode: 'static' | 'awakening' | 'idle' = reduceMotion
      ? 'static'
      : state === 'awakening'
        ? 'awakening'
        : 'idle';
    const born = mode === 'awakening';
    const tier: OrbPerfTier = performanceTier ?? autoTier();
    const tierLow = tier === 'low';
    const rippleCount = tierLow ? RIPPLE_COUNT_LOW : RIPPLE_COUNT_HIGH;

    // Refs so the imperative handle reads the latest mode/tier without
    // re-creating its closures every render.
    const animsOffRef = useRef(mode === 'static');
    animsOffRef.current = mode === 'static';
    const tierLowRef = useRef(tierLow);
    tierLowRef.current = tierLow;

    // ---- Geometry (all fractions of `size`) ---------------------------------
    const S = size;
    const half = S / 2;
    const GROUND = S * 2.2;
    const HALO = S * 1.45;
    const RIPPLE = S * 1.04; // ring base diameter (orb edge), scales to 1.6×
    const seedScale = 8 / S; // the 8px point the core blooms from
    const stroke = Math.max(1.6, S * 0.0085);
    const eyeR = S * 0.023; // dot radius (~4.6% dia)
    const eyeSep = S * 0.086; // half-separation (centers ~17% apart — see note)
    const eyeY = S * 0.42;
    const browY = S * 0.322;
    const noseX = half;
    const noseY1 = S * 0.485;
    const noseY2 = S * 0.55;
    const noseLen = noseY2 - noseY1;
    const xL = half - eyeSep; // left eye center x
    const xR = half + eyeSep; // right eye center x

    // Brow mini-boxes — each brow lives in its OWN positioned SVG so it can be
    // raised / tilted with a transform around ITS center (a brow rotated inside
    // the full-orb SVG would swing across the face). Authored inner → outer so
    // the birth dash-reveal still grows AWAY from center.
    const browBW = S * 0.16; // box width
    const browArc = S * 0.022; // arc lift
    const browBH = browArc + stroke * 2.4; // box height (room for arc + caps)
    const browYB = browBH - stroke * 1.2; // local baseline
    const browPeak = browYB - browArc; // local arc peak
    // Left brow: inner end = right (x = BW−stroke), outer = left.
    const browLPath = `M ${browBW - stroke} ${browYB} Q ${browBW / 2} ${browPeak} ${stroke} ${browYB}`;
    // Right brow: inner end = left, outer = right.
    const browRPath = `M ${stroke} ${browYB} Q ${browBW / 2} ${browPeak} ${browBW - stroke} ${browYB}`;
    const browDash = browBW; // ≥ path length

    // ---- Shared values (init to formed for idle/static; pre-birth for born) --
    const seedO = useSharedValue(0);
    const seedS = useSharedValue(born ? 0.8 : 1);
    const bloom = useSharedValue(born ? 0 : 1); // 0 = seed-size, 1 = full
    const sat = useSharedValue(born ? 0.3 : 1); // 0.3 = pale, 1 = full color
    const haloO = useSharedValue(born ? 0 : 0.7);
    const haloS = useSharedValue(born ? 0.6 : 1);
    const groundO = useSharedValue(born ? 0 : 1);
    const wispO = useSharedValue(born ? 0 : 0.22);
    const eyeLO = useSharedValue(born ? 0 : 1);
    const eyeRO = useSharedValue(born ? 0 : 1);
    const browLO = useSharedValue(born ? 0 : 1); // draw progress 0→1
    const browRO = useSharedValue(born ? 0 : 1);
    const noseO = useSharedValue(born ? 0 : 1);
    const blink = useSharedValue(1); // 1 = open, 0.08 = shut
    const breath = useSharedValue(1);
    const drift = useSharedValue(0); // hue-drift phase
    const r1 = useSharedValue(0);
    const r2 = useSharedValue(0);
    const r3 = useSharedValue(0);
    const ripples = [
      useSharedValue(0),
      useSharedValue(0),
      useSharedValue(0),
      useSharedValue(0),
      useSharedValue(0),
    ];

    // ---- Companion control shared values (driven by the handle) ------------
    const gazeX = useSharedValue(0); // −1..1 (look left/right)
    const gazeY = useSharedValue(0); // −1..1 (look up/down; + = down)
    const ambientX = useSharedValue(0); // tiny autonomous gaze drift
    const ambientY = useSharedValue(0);
    const browRaise = useSharedValue(0); // −1..1
    const browTilt = useSharedValue(0); // −1..1 (+ = inner-up)
    const eyeOpen = useSharedValue(1); // sustained openness (expression)
    const glowBoost = useSharedValue(0); // 0..~0.3 reaction brightness
    const leanScale = useSharedValue(1); // emphasis / take-the-floor lean
    const orbTilt = useSharedValue(0); // −1..1 → ±deg head-tilt (curious)
    const warmth = useSharedValue(familiarity); // 0..1 familiarity
    const shimmerAmp = useSharedValue(0); // 0..1 shimmer opacity envelope
    const shimmerPos = useSharedValue(0); // 0..1 shimmer sweep position

    // ---- Gyro parallax (front plane). Hook always called; output ignored when
    //      disabled or under reduce-motion. No-op (zeros) without a sensor. -----
    const sensor = useAnimatedSensor(SensorType.ROTATION, { interval: 'auto' });
    const tiltX = useSharedValue(0);
    const tiltY = useSharedValue(0);
    const parallaxOn =
      enableParallax && !reduceMotion && !tierLow && Platform.OS !== 'web';
    useAnimatedReaction(
      () => (parallaxOn ? sensor.sensor.value : null),
      (cur) => {
        if (!cur) return;
        const clamp = (v: number) => Math.max(-0.5, Math.min(0.5, v));
        tiltX.value = clamp(cur.roll ?? 0) / 0.5; // [-1, 1]
        tiltY.value = clamp((cur.pitch ?? 0) - 0.25) / 0.5;
      },
    );
    // Heavily damped followers → the orb LAGS the device, reading as weight.
    const lagX = useDerivedValue(() =>
      withSpring(tiltX.value, { damping: 25, stiffness: 70, mass: 1 }),
    );
    const lagY = useDerivedValue(() =>
      withSpring(tiltY.value, { damping: 25, stiffness: 70, mass: 1 }),
    );

    const onAwakeRef = useRef(onAwake);
    onAwakeRef.current = onAwake;
    const pendingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Apply an expression preset to brows + eye openness. Plain JS — assigning
    // `.value = withTiming(...)` from the JS thread is the standard pattern.
    const applyExpression = (expr: OrbExpression, dur: number) => {
      const p = EXPRESSIONS[expr];
      const opts = { duration: dur, easing: EASE_IO_CUBIC };
      browRaise.value = withTiming(p.raise, opts);
      browTilt.value = withTiming(p.tilt, opts);
      eyeOpen.value = withTiming(p.eyeOpen, opts);
    };

    // ---- Imperative handle -------------------------------------------------
    useImperativeHandle(
      ref,
      (): AuroraOrbHandle => ({
        setGaze(dir) {
          const off = animsOffRef.current;
          const dur = off ? 0 : 360;
          const x = dir === 'driftLeft' ? -0.6 : dir === 'driftRight' ? 0.6 : 0;
          const y = dir === 'down' ? 1 : 0;
          gazeX.value = withTiming(x, { duration: dur, easing: EASE_IO_CUBIC });
          gazeY.value = withTiming(y, { duration: dur, easing: EASE_IO_CUBIC });
        },
        setExpression(expr) {
          applyExpression(expr, animsOffRef.current ? 0 : 360);
        },
        emphasisPulse() {
          if (animsOffRef.current) return;
          leanScale.value = withSequence(
            withTiming(1.03, { duration: 200, easing: EASE_IO }),
            withTiming(1.0, { duration: 200, easing: EASE_IO }),
          );
          glowBoost.value = withSequence(
            withTiming(0.1, { duration: 200, easing: EASE_OUT }),
            withTiming(0, { duration: 260, easing: EASE_IN_QUAD }),
          );
        },
        react(key) {
          runReaction(key);
        },
        shimmer() {
          if (animsOffRef.current) return;
          // Degrade to a plain brightening sweep on low-end devices — never a
          // literal "scan" sweep.
          if (tierLowRef.current) {
            glowBoost.value = withSequence(
              withTiming(0.16, { duration: 600, easing: EASE_OUT }),
              withTiming(0, { duration: 600, easing: EASE_IN_QUAD }),
            );
            return;
          }
          shimmerPos.value = 0;
          shimmerPos.value = withTiming(1, {
            duration: 1200,
            easing: EASE_IO_CUBIC,
          });
          shimmerAmp.value = withSequence(
            withTiming(0.9, { duration: 320, easing: EASE_OUT }),
            withDelay(280, withTiming(0, { duration: 600, easing: EASE_IN_QUAD })),
          );
          glowBoost.value = withSequence(
            withTiming(0.07, { duration: 360, easing: EASE_OUT }),
            withTiming(0, { duration: 700, easing: EASE_IN_QUAD }),
          );
        },
        blinkNow() {
          if (animsOffRef.current) return;
          blink.value = withSequence(
            withTiming(0.08, { duration: 90, easing: EASE_IN_QUAD }),
            withTiming(1, { duration: 110, easing: EASE_OUT_QUAD }),
          );
        },
        setFamiliarity(v) {
          const t = Math.max(0, Math.min(1, v));
          warmth.value = animsOffRef.current
            ? t
            : withTiming(t, { duration: 900, easing: EASE_IO });
        },
      }),
      // Shared values are stable; refs carry the latest mode/tier. Built once.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    // The five distinct reactions. Each pairs an expression with a unique glow
    // curve + motion accent so they read as genuinely different acknowledgements.
    function runReaction(key: OrbReaction) {
      const off = animsOffRef.current;
      if (off) {
        // Reduce motion: snap to the expression, no glow/motion choreography.
        const exprByKey: Record<OrbReaction, OrbExpression> = {
          calmClear: 'warm',
          breakouts: 'focused',
          aging: 'reassuring',
          darkSpots: 'curious',
          unsure: 'warm',
        };
        applyExpression(exprByKey[key], 0);
        return;
      }
      switch (key) {
        case 'calmClear': {
          applyExpression('warm', 420);
          // slow contented double-blink
          blink.value = withSequence(
            withTiming(0.12, { duration: 150, easing: EASE_IN_QUAD }),
            withTiming(1, { duration: 240, easing: EASE_OUT_QUAD }),
            withDelay(90, withTiming(0.12, { duration: 150, easing: EASE_IN_QUAD })),
            withTiming(1, { duration: 260, easing: EASE_OUT_QUAD }),
          );
          glowBoost.value = withSequence(
            withTiming(0.12, { duration: 520, easing: EASE_OUT }),
            withTiming(0.05, { duration: 700, easing: EASE_IO }),
          );
          break;
        }
        case 'breakouts': {
          applyExpression('focused', 200); // brows snap level/furrowed
          glowBoost.value = withSequence(
            withTiming(0.2, { duration: 170, easing: EASE_OUT }),
            withTiming(0.07, { duration: 520, easing: EASE_IO }),
          );
          blink.value = withSequence(
            withTiming(0.08, { duration: 80, easing: EASE_IN_QUAD }),
            withTiming(1, { duration: 110, easing: EASE_OUT_QUAD }),
          );
          break;
        }
        case 'aging': {
          applyExpression('reassuring', 520);
          // slow confident pulse — rises, holds, eases off
          glowBoost.value = withSequence(
            withTiming(0.11, { duration: 700, easing: EASE_IO }),
            withDelay(180, withTiming(0.05, { duration: 700, easing: EASE_IO })),
          );
          break;
        }
        case 'darkSpots': {
          applyExpression('curious', 420);
          // attentive head-tilt + a small considering glance
          orbTilt.value = withSequence(
            withTiming(0.9, { duration: 380, easing: EASE_IO }),
            withDelay(360, withTiming(0, { duration: 480, easing: EASE_IO })),
          );
          gazeX.value = withSequence(
            withTiming(0.35, { duration: 380, easing: EASE_IO_CUBIC }),
            withDelay(260, withTiming(0, { duration: 460, easing: EASE_IO_CUBIC })),
          );
          glowBoost.value = withSequence(
            withTiming(0.08, { duration: 460, easing: EASE_OUT }),
            withTiming(0.04, { duration: 600, easing: EASE_IO }),
          );
          break;
        }
        case 'unsure': {
          applyExpression('warm', 460); // the WARMEST bloom
          glowBoost.value = withSequence(
            withTiming(0.24, { duration: 420, easing: EASE_OUT }),
            withTiming(0.09, { duration: 820, easing: EASE_IO }),
          );
          // halo breathes outward; warmth blooms then settles back to its base
          const base = warmth.value;
          haloS.value = withSequence(
            withTiming(1.12, { duration: 480, easing: EASE_OUT }),
            withTiming(1, { duration: 760, easing: EASE_IO }),
          );
          warmth.value = withSequence(
            withTiming(Math.min(1, base + 0.18), { duration: 480, easing: EASE_OUT }),
            withTiming(base, { duration: 900, easing: EASE_IO }),
          );
          break;
        }
      }
    }

    // ---- The master timeline -------------------------------------------------
    useEffect(() => {
      if (mode === 'static') {
        // Formed + frozen, but still expressive: settle to the warmth we were
        // handed so reduce-motion users still see orb-as-progress as state.
        warmth.value = familiarity;
        onAwakeRef.current?.();
        return; // nothing animates
      }

      // Continuous wisp rotation runs the moment the orb exists, at desynced
      // periods, so they fade in already-moving and never sync.
      r1.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1, false);
      r2.value = withRepeat(withTiming(1, { duration: 11000, easing: Easing.linear }), -1, false);
      if (!tierLow) {
        r3.value = withRepeat(withTiming(1, { duration: 13000, easing: Easing.linear }), -1, false);
      }

      // Breath — sine, never a hard stop at the extremes.
      breath.value = withDelay(
        born ? T.breath : 0,
        withRepeat(
          withSequence(
            withTiming(1.025, { duration: 4000, easing: EASE_IO }),
            withTiming(1.0, { duration: 4000, easing: EASE_IO }),
          ),
          -1,
          false,
        ),
      );

      // Hue drift — violet/cyan balance shifts ~5% over 15s, forever.
      drift.value = withDelay(
        born ? T.drift : 0,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 15000, easing: EASE_IO }),
            withTiming(0, { duration: 15000, easing: EASE_IO }),
          ),
          -1,
          false,
        ),
      );

      // Ambient gaze drift — tiny, slow, desynced, so the eyes are never frozen
      // even when "looking forward". Added to explicit gaze in the style.
      ambientX.value = withRepeat(
        withSequence(
          withTiming(0.15, { duration: 5200, easing: EASE_IO }),
          withTiming(-0.15, { duration: 6100, easing: EASE_IO }),
        ),
        -1,
        true,
      );
      ambientY.value = withRepeat(
        withSequence(
          withTiming(0.1, { duration: 7000, easing: EASE_IO }),
          withTiming(-0.08, { duration: 8200, easing: EASE_IO }),
        ),
        -1,
        true,
      );

      // Ripples — staggered, each a 3s expand+fade, forever (count by tier).
      const rippleBase = born ? T.ripple : 0;
      ripples.forEach((rp, i) => {
        if (i >= rippleCount) return;
        rp.value = withDelay(
          rippleBase + i * RIPPLE_STAGGER,
          withRepeat(
            withTiming(1, { duration: RIPPLE_PERIOD, easing: EASE_OUT }),
            -1,
            false,
          ),
        );
      });

      if (!born) {
        // Idle launch: already formed; just signal "alive".
        warmth.value = familiarity;
        onAwakeRef.current?.();
      } else {
        // ===== THE AWAKENING ===================================================
        // Seed of light → fades as the bloom takes over.
        seedO.value = withDelay(
          T.seed,
          withSequence(
            withTiming(0.6, { duration: 250, easing: EASE_OUT }),
            withDelay(180, withTiming(0, { duration: 420, easing: EASE_OUT_QUAD })),
          ),
        );
        seedS.value = withDelay(T.seed, withTiming(1, { duration: 250, easing: EASE_OUT }));

        // The bloom — spring from seed to full size with a ~2% micro-overshoot
        // (damping 18). Color saturates in lock-step (pale → full crossfade).
        bloom.value = withDelay(
          T.bloom,
          withSpring(1, { mass: 1.2, stiffness: 90, damping: 18 }),
        );
        sat.value = withDelay(T.bloom, withTiming(1, { duration: 700, easing: EASE_OUT }));
        groundO.value = withDelay(T.ground, withTiming(1, { duration: 500, easing: EASE_OUT }));
        haloO.value = withDelay(T.halo, withTiming(0.7, { duration: 500, easing: EASE_OUT }));
        haloS.value = withDelay(T.halo, withTiming(1, { duration: 500, easing: EASE_OUT }));
        wispO.value = withDelay(T.wisps, withTiming(0.22, { duration: 600, easing: EASE_OUT }));
        eyeLO.value = withDelay(T.eyeL, withTiming(1, { duration: 250, easing: EASE_OUT }));
        eyeRO.value = withDelay(T.eyeR, withTiming(1, { duration: 250, easing: EASE_OUT }));
        browLO.value = withDelay(T.brows, withTiming(1, { duration: 400, easing: EASE_IO_CUBIC }));
        browRO.value = withDelay(T.brows, withTiming(1, { duration: 400, easing: EASE_IO_CUBIC }));
        noseO.value = withDelay(T.nose, withTiming(1, { duration: 250, easing: EASE_IO_CUBIC }));
        blink.value = withDelay(
          T.blink,
          withSequence(
            withTiming(0.08, { duration: 90, easing: EASE_IN_QUAD }),
            withTiming(1, { duration: 90, easing: EASE_OUT_QUAD }),
          ),
        );
        warmth.value = withDelay(T.bloom, withTiming(familiarity, { duration: 700, easing: EASE_OUT }));
        const awakeTimer = setTimeout(() => onAwakeRef.current?.(), T.blink + 200);
        pendingTimers.current.push(awakeTimer);
      }

      // ===== Random idle blinks (after the first) =============================
      let cancelled = false;
      const scheduleBlink = (firstDelay: number) => {
        const tmr = setTimeout(function tick() {
          if (cancelled) return;
          blink.value = withSequence(
            withTiming(0.08, { duration: 90, easing: EASE_IN_QUAD }),
            withTiming(1, { duration: 110, easing: EASE_OUT_QUAD }),
          );
          const next = 4000 + Math.random() * 2000;
          const t2 = setTimeout(tick, next);
          pendingTimers.current.push(t2);
        }, firstDelay);
        pendingTimers.current.push(tmr);
      };
      scheduleBlink(born ? T.blink + 4500 : 2200);

      return () => {
        cancelled = true;
        [
          seedO, seedS, bloom, sat, haloO, haloS, groundO, wispO, eyeLO, eyeRO,
          browLO, browRO, noseO, blink, breath, drift, r1, r2, r3,
          gazeX, gazeY, ambientX, ambientY, browRaise, browTilt, eyeOpen,
          glowBoost, leanScale, orbTilt, warmth, shimmerAmp, shimmerPos,
          ...ripples,
        ].forEach(cancelAnimation);
        pendingTimers.current.forEach(clearTimeout);
        pendingTimers.current = [];
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    // Keep warmth in sync if the familiarity PROP changes while mounted.
    useEffect(() => {
      if (mode === 'static') {
        warmth.value = familiarity;
      } else {
        warmth.value = withTiming(familiarity, { duration: 900, easing: EASE_IO });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [familiarity]);

    // ---- Animated styles -----------------------------------------------------
    // Orb plane (core + halo + face) — bloom scale × breath × lean × warmth
    // fullening, plus the curious head-tilt and parallax.
    const orbPlane = useAnimatedStyle(() => ({
      transform: [
        { translateX: lagX.value * 8 },
        { translateY: lagY.value * 8 },
        { rotate: `${orbTilt.value * 3}deg` },
        {
          scale:
            interpolate(bloom.value, [0, 1], [seedScale, 1]) *
            breath.value *
            leanScale.value *
            (1 + warmth.value * 0.03),
        },
      ],
    }));
    // Ground glow plane — shallower parallax so the orb floats ABOVE the surface.
    const groundPlane = useAnimatedStyle(() => ({
      opacity: groundO.value * (0.97 + (breath.value - 1) / 0.025 * 0.03),
      transform: [{ translateX: lagX.value * 5 }, { translateY: lagY.value * 5 }],
    }));
    const haloStyle = useAnimatedStyle(() => ({
      opacity: haloO.value + glowBoost.value * 0.5 + warmth.value * 0.1,
      transform: [{ scale: haloS.value }],
    }));
    const paleStyle = useAnimatedStyle(() => ({
      opacity: interpolate(sat.value, [0.3, 1], [1, 0], 'clamp'),
    }));
    const fullStyle = useAnimatedStyle(() => ({
      opacity: interpolate(sat.value, [0.3, 1], [0, 1], 'clamp'),
    }));
    const warmStyle = useAnimatedStyle(() => ({ opacity: warmth.value * 0.12 }));
    const reactStyle = useAnimatedStyle(() => ({ opacity: glowBoost.value }));
    const wispStyle = useAnimatedStyle(() => ({ opacity: wispO.value }));
    const seedStyle = useAnimatedStyle(() => ({
      opacity: seedO.value,
      transform: [{ scale: seedS.value }],
    }));
    const driftVStyle = useAnimatedStyle(() => ({
      opacity: wispO.value * interpolate(drift.value, [0, 1], [1, 0.2], 'clamp'),
    }));
    const driftCStyle = useAnimatedStyle(() => ({
      opacity: wispO.value * interpolate(drift.value, [0, 1], [0.2, 1], 'clamp'),
    }));
    const shimmerStyle = useAnimatedStyle(() => ({
      opacity: shimmerAmp.value,
      transform: [
        { translateX: interpolate(shimmerPos.value, [0, 1], [-S * 0.34, S * 0.34]) },
        { scale: interpolate(shimmerPos.value, [0, 0.5, 1], [0.92, 1.04, 0.96]) },
      ],
    }));
    const rot1 = useAnimatedStyle(() => ({ transform: [{ rotate: `${r1.value * 360}deg` }] }));
    const rot2 = useAnimatedStyle(() => ({ transform: [{ rotate: `${-r2.value * 360}deg` }] }));
    const rot3 = useAnimatedStyle(() => ({ transform: [{ rotate: `${r3.value * 360}deg` }] }));

    // Eyes — gaze (explicit + ambient) translate, blink × sustained openness.
    const eyeLStyle = useAnimatedStyle(() => ({
      opacity: interpolate(eyeLO.value, [0, 0.2, 1], [0, 1, 1], 'clamp'),
      transform: [
        { translateX: (gazeX.value + ambientX.value) * S * 0.03 },
        { translateY: (gazeY.value + ambientY.value) * S * 0.03 },
        { scaleY: interpolate(eyeLO.value, [0, 1], [0.08, 1]) * blink.value * eyeOpen.value },
      ],
    }));
    const eyeRStyle = useAnimatedStyle(() => ({
      opacity: interpolate(eyeRO.value, [0, 0.2, 1], [0, 1, 1], 'clamp'),
      transform: [
        { translateX: (gazeX.value + ambientX.value) * S * 0.03 },
        { translateY: (gazeY.value + ambientY.value) * S * 0.03 },
        { scaleY: interpolate(eyeRO.value, [0, 1], [0.08, 1]) * blink.value * eyeOpen.value },
      ],
    }));
    // Brows — raise (translateY) + tilt (rotate around own center, mirrored) +
    // a touch of gaze. Inner-up when tilt > 0 (warm / curious); furrow when < 0.
    const browLStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: (gazeX.value + ambientX.value) * S * 0.012 },
        { translateY: -browRaise.value * S * 0.045 + (gazeY.value + ambientY.value) * S * 0.012 },
        { rotate: `${-browTilt.value * 12}deg` },
      ],
    }));
    const browRStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: (gazeX.value + ambientX.value) * S * 0.012 },
        { translateY: -browRaise.value * S * 0.045 + (gazeY.value + ambientY.value) * S * 0.012 },
        { rotate: `${browTilt.value * 12}deg` },
      ],
    }));
    const browLProps = useAnimatedProps(() => ({
      strokeDashoffset: (1 - browLO.value) * browDash,
    }));
    const browRProps = useAnimatedProps(() => ({
      strokeDashoffset: (1 - browRO.value) * browDash,
    }));
    const noseProps = useAnimatedProps(() => ({
      strokeDashoffset: (1 - noseO.value) * noseLen,
    }));

    // Centering helper: absolutely center a `d`-diameter layer in the S box.
    const centered = (d: number, dyFrac = 0) => ({
      position: 'absolute' as const,
      left: (S - d) / 2,
      top: (S - d) / 2 + S * dyFrac,
      width: d,
      height: d,
    });

    return (
      <View
        style={[styles.root, { width: S, height: S }]}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {/* LAYER A — ground glow (shallow parallax, breathes with the orb) */}
        <Animated.View style={[centered(GROUND, 0.08), groundPlane]}>
          <Svg width={GROUND} height={GROUND}>
            <Defs>
              <RadialGradient id={ids.ground} cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={C.groundGlow0} />
                <Stop offset="45%" stopColor={C.groundGlowMid} />
                <Stop offset="100%" stopColor={C.groundGlowEdge} />
              </RadialGradient>
            </Defs>
            <Circle cx={GROUND / 2} cy={GROUND / 2} r={GROUND / 2} fill={`url(#${ids.ground})`} />
          </Svg>
        </Animated.View>

        {/* All inner layers share the orb plane (bloom/breath/lean/tilt/parallax) */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, orbPlane]}>
          {/* LAYER B — halo */}
          <Animated.View style={[centered(HALO), haloStyle]}>
            <Svg width={HALO} height={HALO}>
              <Defs>
                <RadialGradient id={ids.halo} cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={C.halo0} />
                  <Stop offset="40%" stopColor={C.halo40} />
                  <Stop offset="70%" stopColor={C.halo70} />
                  <Stop offset="100%" stopColor={C.halo100} />
                </RadialGradient>
              </Defs>
              <Circle cx={HALO / 2} cy={HALO / 2} r={HALO / 2} fill={`url(#${ids.halo})`} />
            </Svg>
          </Animated.View>

          {/* Breath ripples (count by performance tier) */}
          {ripples.map((rp, i) =>
            i < rippleCount ? (
              <Ripple
                key={i}
                phase={rp}
                diameter={RIPPLE}
                positionStyle={centered(RIPPLE)}
                borderWidth={Math.max(1, S * 0.004)}
              />
            ) : null,
          )}

          {/* LAYER C — core orb. Pale + full crossfade ("gains color"). Each is a
              centered body (feathered edge) + an off-center sheen + a glossy
              specular catchlight on the full (color) version. */}
          <Animated.View style={[centered(S), paleStyle]}>
            <Svg width={S} height={S}>
              <Defs>
                <RadialGradient id={ids.bodyPale} cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={C.corePale25} />
                  <Stop offset="38%" stopColor={C.corePale55} />
                  <Stop offset="70%" stopColor={C.corePale80} />
                  <Stop offset="90%" stopColor={C.corePale94} />
                  <Stop offset="100%" stopColor={C.corePale100} />
                </RadialGradient>
                <RadialGradient id={ids.hiPale} cx="40%" cy="33%" r="54%">
                  <Stop offset="0%" stopColor={C.corePale0} />
                  <Stop offset="52%" stopColor={C.paleHiMid} />
                  <Stop offset="100%" stopColor={C.paleHiEdge} />
                </RadialGradient>
              </Defs>
              <Circle cx={half} cy={half} r={half} fill={`url(#${ids.bodyPale})`} />
              <Circle cx={half} cy={half} r={half} fill={`url(#${ids.hiPale})`} />
            </Svg>
          </Animated.View>

          <Animated.View style={[centered(S), fullStyle]}>
            <Svg width={S} height={S}>
              <Defs>
                <RadialGradient id={ids.bodyFull} cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={C.coreFull25} />
                  <Stop offset="38%" stopColor={C.coreFull55} />
                  <Stop offset="70%" stopColor={C.coreFull80} />
                  <Stop offset="90%" stopColor={C.coreFull94} />
                  <Stop offset="100%" stopColor={C.coreFull100} />
                </RadialGradient>
                <RadialGradient id={ids.hiFull} cx="40%" cy="33%" r="54%">
                  <Stop offset="0%" stopColor={C.coreFull0} />
                  <Stop offset="52%" stopColor={C.coreHiMid} />
                  <Stop offset="100%" stopColor={C.coreHiEdge} />
                </RadialGradient>
                <RadialGradient id={ids.specular} cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={C.specular0} />
                  <Stop offset="100%" stopColor={C.specularEdge} />
                </RadialGradient>
              </Defs>
              <Circle cx={half} cy={half} r={half} fill={`url(#${ids.bodyFull})`} />
              <Circle cx={half} cy={half} r={half} fill={`url(#${ids.hiFull})`} />
              {/* Glossy specular catchlight (upper-left), small + bright. */}
              <Circle cx={S * 0.35} cy={S * 0.29} r={S * 0.15} fill={`url(#${ids.specular})`} />
            </Svg>
          </Animated.View>

          {/* Warmth — familiarity overlay (warms + fullens as it gets to know) */}
          <Animated.View style={[centered(S * 0.96), warmStyle]} pointerEvents="none">
            <Svg width={S * 0.96} height={S * 0.96}>
              <Defs>
                <RadialGradient id={ids.warm} cx="50%" cy="52%" r="50%">
                  <Stop offset="0%" stopColor={C.warmGlow0} />
                  <Stop offset="55%" stopColor={C.warmGlowMid} />
                  <Stop offset="100%" stopColor={C.warmGlowEdge} />
                </RadialGradient>
              </Defs>
              <Circle cx={S * 0.48} cy={S * 0.48} r={S * 0.48} fill={`url(#${ids.warm})`} />
            </Svg>
          </Animated.View>

          {/* React glow — cool-bright bloom on acknowledgement */}
          <Animated.View style={[centered(S * 0.98), reactStyle]} pointerEvents="none">
            <Svg width={S * 0.98} height={S * 0.98}>
              <Defs>
                <RadialGradient id={ids.react} cx="50%" cy="46%" r="52%">
                  <Stop offset="0%" stopColor={C.reactGlow0} />
                  <Stop offset="50%" stopColor={C.reactGlowMid} />
                  <Stop offset="100%" stopColor={C.reactGlowEdge} />
                </RadialGradient>
              </Defs>
              <Circle cx={S * 0.49} cy={S * 0.49} r={S * 0.49} fill={`url(#${ids.react})`} />
            </Svg>
          </Animated.View>

          {/* LAYER D — aurora wisps (three desynced rotations) + hue-drift pair.
              The third wisp + drift pair are trimmed on the low tier. */}
          <Animated.View style={[centered(S), styles.center, wispStyle]} pointerEvents="none">
            <Animated.View style={[styles.fill, styles.center, rot1]}>
              <WispEllipse id={ids.wispC} w={S * 0.62} h={S * 0.3} c0={C.wispCyan0} c1={C.wispCyanEdge} dx={-S * 0.06} dy={-S * 0.05} />
            </Animated.View>
            <Animated.View style={[styles.fill, styles.center, rot2]}>
              <WispEllipse id={ids.wispV} w={S * 0.58} h={S * 0.26} c0={C.wispViolet0} c1={C.wispVioletEdge} dx={S * 0.05} dy={S * 0.06} />
            </Animated.View>
            {!tierLow && (
              <Animated.View style={[styles.fill, styles.center, rot3]}>
                <WispEllipse id={`${ids.wispC}-b`} w={S * 0.5} h={S * 0.22} c0={C.wispCyan0} c1={C.wispCyanEdge} dx={S * 0.04} dy={-S * 0.03} />
              </Animated.View>
            )}
          </Animated.View>

          {!tierLow && (
            <>
              {/* Idle hue-drift overlay — violet ⇄ cyan balance */}
              <Animated.View style={[centered(S * 0.9), driftVStyle]} pointerEvents="none">
                <Svg width={S * 0.9} height={S * 0.9}>
                  <Defs>
                    <RadialGradient id={ids.driftV} cx="42%" cy="40%" r="55%">
                      <Stop offset="0%" stopColor={C.driftViolet0} />
                      <Stop offset="100%" stopColor={C.driftVioletEdge} />
                    </RadialGradient>
                  </Defs>
                  <Circle cx={S * 0.45} cy={S * 0.45} r={S * 0.45} fill={`url(#${ids.driftV})`} />
                </Svg>
              </Animated.View>
              <Animated.View style={[centered(S * 0.9), driftCStyle]} pointerEvents="none">
                <Svg width={S * 0.9} height={S * 0.9}>
                  <Defs>
                    <RadialGradient id={ids.driftC} cx="60%" cy="62%" r="55%">
                      <Stop offset="0%" stopColor={C.driftCyan0} />
                      <Stop offset="100%" stopColor={C.driftCyanEdge} />
                    </RadialGradient>
                  </Defs>
                  <Circle cx={S * 0.45} cy={S * 0.45} r={S * 0.45} fill={`url(#${ids.driftC})`} />
                </Svg>
              </Animated.View>
            </>
          )}

          {/* Atmospheric shimmer — Screen 2's "then I'll read your skin" beat.
              A soft highlight that organizes, sweeps once, and dissolves. NOT a
              scan UI. Sits below the face so the face stays crisp on top. */}
          <Animated.View style={[centered(S * 0.86), shimmerStyle]} pointerEvents="none">
            <Svg width={S * 0.86} height={S * 0.86}>
              <Defs>
                <RadialGradient id={ids.shimmer} cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={C.shimmerSweep0} />
                  <Stop offset="100%" stopColor={C.shimmerSweepEdge} />
                </RadialGradient>
              </Defs>
              <Ellipse cx={S * 0.43} cy={S * 0.43} rx={S * 0.2} ry={S * 0.43} fill={`url(#${ids.shimmer})`} />
            </Svg>
          </Animated.View>

          {/* LAYER E — the face. Eyes are Views (crisp scaleY blink + gaze);
              brows are individually transformable mini-SVGs (raise/tilt per
              expression); the nose is a stroke-dashoffset draw-on. No mouth. */}
          <Animated.View
            style={[styles.eyeDot, eyeLStyle, { width: eyeR * 2, height: eyeR * 2, borderRadius: eyeR, left: xL - eyeR, top: eyeY - eyeR }]}
          />
          <Animated.View
            style={[styles.eyeDot, eyeRStyle, { width: eyeR * 2, height: eyeR * 2, borderRadius: eyeR, left: xR - eyeR, top: eyeY - eyeR }]}
          />

          {/* Left brow */}
          <Animated.View
            style={[
              { position: 'absolute', left: xL - browBW / 2, top: browY - browBH / 2, width: browBW, height: browBH },
              browLStyle,
            ]}
            pointerEvents="none"
          >
            <Svg width={browBW} height={browBH}>
              <AnimatedPath
                d={browLPath}
                stroke={C.face}
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={browDash}
                animatedProps={browLProps}
              />
            </Svg>
          </Animated.View>

          {/* Right brow */}
          <Animated.View
            style={[
              { position: 'absolute', left: xR - browBW / 2, top: browY - browBH / 2, width: browBW, height: browBH },
              browRStyle,
            ]}
            pointerEvents="none"
          >
            <Svg width={browBW} height={browBH}>
              <AnimatedPath
                d={browRPath}
                stroke={C.face}
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={browDash}
                animatedProps={browRProps}
              />
            </Svg>
          </Animated.View>

          {/* Nose */}
          <View style={[centered(S)]} pointerEvents="none">
            <Svg width={S} height={S}>
              <AnimatedLine
                x1={noseX}
                y1={noseY1}
                x2={noseX}
                y2={noseY2}
                stroke={C.face}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={noseLen}
                animatedProps={noseProps}
              />
            </Svg>
          </View>
        </Animated.View>

        {/* Seed of light — sits above everything early, fades as the bloom wins */}
        <Animated.View style={[centered(S * 0.12), styles.center, seedStyle]} pointerEvents="none">
          <Svg width={S * 0.12} height={S * 0.12}>
            <Defs>
              <RadialGradient id={ids.seed} cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={C.seedCore} />
                <Stop offset="55%" stopColor={C.seedHalo} />
                <Stop offset="100%" stopColor={C.seedEdge} />
              </RadialGradient>
            </Defs>
            <Circle cx={S * 0.06} cy={S * 0.06} r={S * 0.06} fill={`url(#${ids.seed})`} />
          </Svg>
        </Animated.View>
      </View>
    );
  },
);

// One breath ring. Each owns its own animated style so we never call hooks in
// a loop. Scales 1 → 1.6 and fades 0.26 → 0 over its 3s life, forever.
function Ripple({
  phase,
  diameter,
  positionStyle,
  borderWidth,
}: {
  phase: SharedValue<number>;
  diameter: number;
  positionStyle: object;
  borderWidth: number;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(phase.value, [0, 0.15, 1], [0, 0.26, 0], 'clamp'),
    transform: [{ scale: interpolate(phase.value, [0, 1], [1, 1.6]) }],
  }));
  return (
    <Animated.View style={[positionStyle, style]} pointerEvents="none">
      <View
        style={{
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          borderWidth,
          borderColor: C.ripple,
        }}
      />
    </Animated.View>
  );
}

// Soft internal wisp — a blurred-feel ellipse built from a transparent-fading
// radial. Offset within its rotating frame so rotation traces a gentle orbit.
function WispEllipse({
  id,
  w,
  h,
  c0,
  c1,
  dx,
  dy,
}: {
  id: string;
  w: number;
  h: number;
  c0: string;
  c1: string;
  dx: number;
  dy: number;
}) {
  const bw = w * 2;
  const bh = h * 2;
  return (
    <Svg width={bw} height={bh} style={{ marginLeft: dx, marginTop: dy }}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={c0} />
          <Stop offset="100%" stopColor={c1} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={bw / 2} cy={bh / 2} rx={w / 2} ry={h / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  center: { alignItems: 'center', justifyContent: 'center' },
  fill: { ...StyleSheet.absoluteFillObject },
  eyeDot: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
});

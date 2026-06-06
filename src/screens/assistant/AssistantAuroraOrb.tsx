/**
 * AssistantAuroraOrb — Pura Assist's character is a soft glowing aurora orb.
 *
 * A diffused sphere of cyan / violet / soft-blue light with a minimalist white
 * vector face floating on top. It is not a robot and not a human face — a
 * calm, considered digital presence that knows your skin. This replaces the
 * old user-face-photo avatar (AssistantFaceLive) entirely.
 *
 * Layer stack (bottom → top), each an independently-animated layer so all
 * per-frame motion lives on Animated.View transforms (scale / opacity /
 * translate / rotate) — the most robust path on RN, no per-frame SVG attribute
 * mutation:
 *
 *   1. Ambient ripples  — five stroked rings emanating from the orb edge,
 *                         phase-staggered into a meditative pulse.
 *   2. Glow halo        — large blurred radial behind the core (soft fog),
 *                         with a thinking-state "boost" overlay.
 *   3. Core orb         — off-centre radial gradient (light from upper-left)
 *                         + a soft blur, giving a flat SVG circle dimension.
 *                         Carries the listening "brightening flash" overlay.
 *   4. Aurora wisps     — blurred ellipses rotating inside the orb at
 *                         different speeds → flowing aurora light.
 *   5. Face             — white eyebrows (SVG arcs), dot eyes (Views) and a
 *                         single short nose line (View). No mouth. Expression
 *                         is carried by eyebrow motion + eye position only.
 *
 * The orb reacts to four conversation states (idle · listening · thinking ·
 * responding) and subtly tints to the user's most recent scan (scanTone). It
 * fully honours iOS Reduce Motion: ripples + breathing + blinks + wisp
 * rotation are dropped and the orb shows state only via a calm opacity pulse.
 *
 * Everything internal is authored as a fraction of the `size` prop, so the
 * component scales cleanly from a 32px avatar to a 240px full-screen presence.
 *
 * PALETTE NOTE: the aurora palette (cyan / violet / blue / magenta) is a
 * bespoke character palette that does not exist in the `puraAssist` UI tokens
 * (blue / green / purple only). Rather than scatter magic hex through the JSX,
 * the whole palette lives in the single `AURORA` table below — one documented
 * source of truth for the orb's colour, the spirit of the no-hex-literals rule.
 */

import React, { useEffect, useId, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  FeGaussianBlur,
  Filter,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { useReduceMotion } from '@/hooks/useReduceMotion';

// ---------------------------------------------------------------------------
// Public contract
// ---------------------------------------------------------------------------

export type AssistantOrbState = 'idle' | 'listening' | 'thinking' | 'responding';
export type AssistantScanTone = 'reactive' | 'active' | 'balanced' | 'none';

export interface AssistantAuroraOrbProps {
  state: AssistantOrbState;
  /** Footprint in px. Internal layout is all relative to this. Default 92. */
  size?: number;
  /** Subtle tint shift to the user's most recent scan. Default 'balanced'. */
  scanTone?: AssistantScanTone;
}

// ---------------------------------------------------------------------------
// Geometry — all fractions of `size`. The core orb fills ~70% of the box so
// the minimalist face stays legible; ripples + halo fill the rest.
// ---------------------------------------------------------------------------

const CORE_R = 0.35; // core orb radius  (diameter 0.70 · size)
const HALO_R = 0.43; // halo radius      (≈1.23 · orb diameter), blurred
const RIPPLE_MAX_R = 0.5; // outermost ripple radius at peak (box edge)
const RIPPLE_COUNT = 5;
const WISP_COUNT = 3;

const D = CORE_R * 2; // orb diameter as a fraction of size
const CORE_TOP = 0.5 - CORE_R; // y of orb top, fraction of size

// Face anchors, expressed in spec terms ("% from top of orb", "% of diameter")
// then resolved against the core orb's box.
const BROW_Y = CORE_TOP + 0.32 * D;
const EYE_Y = CORE_TOP + 0.44 * D;
const NOSE_TOP_Y = CORE_TOP + 0.48 * D;
const FEATURE_DX = 0.13 * D; // ± horizontal offset of eyes / eyebrows
const BROW_W = 0.14 * D;
const BROW_H = 0.06 * D;
const EYE_D = 0.05 * D; // a touch above the spec's 4% for legibility at 56px
const NOSE_W = 2;
const NOSE_LEN = 0.06 * D;

// State-driven face motion, as fractions of size (orb-height percentages).
const BROW_RAISE = 0.02 * D; // eyebrows lift on attention
const EYE_DOWN = 0.02 * D; // eyes look down (thinking)
const EYE_UP = 0.012 * D; // eyes look up (listening)
const EYE_UP_RESPOND = 0.008 * D;
const EYE_SCAN = 0.006 * D; // horizontal "reading" drift (responding)
const BROW_TILT = 2; // degrees of curiosity tilt (thinking)
const BLINK_SQUASH = 0.16; // eye scaleY at the bottom of a blink

// ---------------------------------------------------------------------------
// State → motion parameters
// ---------------------------------------------------------------------------

interface StateParams {
  breathAmp: number; // peak breathing scale
  breathMs: number; // half-cycle
  ripplePeriod: number; // full ripple cycle
  rippleOpacity: number; // peak ring opacity (just-born)
  wispScale: number; // wisp rotation speed multiplier (1 = base)
  haloBoost: number; // thinking halo overlay opacity
}

const STATE: Record<AssistantOrbState, StateParams> = {
  idle: { breathAmp: 1.025, breathMs: 2000, ripplePeriod: 3000, rippleOpacity: 0.22, wispScale: 1, haloBoost: 0 },
  listening: { breathAmp: 1.03, breathMs: 1500, ripplePeriod: 2200, rippleOpacity: 0.28, wispScale: 1.15, haloBoost: 0.25 },
  thinking: { breathAmp: 1.04, breathMs: 1500, ripplePeriod: 1600, rippleOpacity: 0.34, wispScale: 1.7, haloBoost: 1 },
  responding: { breathAmp: 1.03, breathMs: 1750, ripplePeriod: 2500, rippleOpacity: 0.26, wispScale: 1.2, haloBoost: 0.35 },
};

const TRANSITION = { duration: 400, easing: Easing.out(Easing.cubic) } as const;
const EASE_IO = Easing.inOut(Easing.ease);

// ---------------------------------------------------------------------------
// Aurora palette — the single source of truth for the orb's colour. Each tone
// is a deliberate, *subtle* shift the user should feel rather than see.
// ---------------------------------------------------------------------------

interface GStop {
  offset: string;
  color: string;
  opacity: number;
}
interface Tone {
  core: GStop[]; // off-centre radial — the visible sphere
  halo: GStop[]; // centred radial — the soft fog behind
  ripple: string; // ring stroke
  wisps: string[]; // inner aurora bands (WISP_COUNT entries)
}

const AURORA: Record<AssistantScanTone, Tone> = {
  // BALANCED — the canonical cyan / violet / blue blend.
  balanced: {
    core: [
      { offset: '0%', color: '#E0F0FF', opacity: 0.95 },
      { offset: '25%', color: '#A89CE0', opacity: 0.85 },
      { offset: '55%', color: '#7A6BC8', opacity: 0.75 },
      { offset: '80%', color: '#6B86C4', opacity: 0.6 },
      { offset: '100%', color: '#8B7CB8', opacity: 0.4 },
    ],
    halo: [
      { offset: '0%', color: '#9B8CDA', opacity: 0.35 },
      { offset: '40%', color: '#7BA5E0', opacity: 0.2 },
      { offset: '70%', color: '#88C3DA', opacity: 0.12 },
      { offset: '100%', color: '#88C3DA', opacity: 0 },
    ],
    ripple: '#A8B5E8',
    wisps: ['#D6F0FF', '#C9BEF0', '#BCD4F2'],
  },

  // REACTIVE — sensitivity / redness flagged. Leans cooler, water-like, calm.
  reactive: {
    core: [
      { offset: '0%', color: '#DFF4FF', opacity: 0.95 },
      { offset: '25%', color: '#93C3E8', opacity: 0.85 },
      { offset: '55%', color: '#5E8FD0', opacity: 0.75 },
      { offset: '80%', color: '#5E86C8', opacity: 0.62 },
      { offset: '100%', color: '#7FA6CE', opacity: 0.4 },
    ],
    halo: [
      { offset: '0%', color: '#7FB6E6', opacity: 0.34 },
      { offset: '40%', color: '#76B2E2', opacity: 0.2 },
      { offset: '70%', color: '#8FD0E0', opacity: 0.13 },
      { offset: '100%', color: '#8FD0E0', opacity: 0 },
    ],
    ripple: '#9DBEEA',
    wisps: ['#DAF4FF', '#B6DAF4', '#C7E6F4'],
  },

  // ACTIVE — breakouts / inflammation flagged. A subtle warm magenta, more
  // vibrant — attentive, focused.
  active: {
    core: [
      { offset: '0%', color: '#FDEFFF', opacity: 0.95 },
      { offset: '25%', color: '#C49AD8', opacity: 0.86 },
      { offset: '55%', color: '#8A6BC6', opacity: 0.78 },
      { offset: '80%', color: '#7E78C6', opacity: 0.62 },
      { offset: '100%', color: '#A981C2', opacity: 0.42 },
    ],
    halo: [
      { offset: '0%', color: '#B98CD6', opacity: 0.36 },
      { offset: '40%', color: '#8F90DE', opacity: 0.21 },
      { offset: '70%', color: '#88C0DA', opacity: 0.12 },
      { offset: '100%', color: '#88C0DA', opacity: 0 },
    ],
    ripple: '#C2A6E6',
    wisps: ['#F2DCFF', '#CDBEF2', '#BCD4F2'],
  },

  // NONE — no scan yet. ~15% less saturation, gentler and more neutral.
  none: {
    core: [
      { offset: '0%', color: '#EAF2FB', opacity: 0.9 },
      { offset: '25%', color: '#AEB8D2', opacity: 0.78 },
      { offset: '55%', color: '#8089AE', opacity: 0.68 },
      { offset: '80%', color: '#7C8AAC', opacity: 0.52 },
      { offset: '100%', color: '#93A0BE', opacity: 0.36 },
    ],
    halo: [
      { offset: '0%', color: '#9AA8C8', opacity: 0.28 },
      { offset: '40%', color: '#8FA4C2', opacity: 0.16 },
      { offset: '70%', color: '#98B4C6', opacity: 0.1 },
      { offset: '100%', color: '#98B4C6', opacity: 0 },
    ],
    ripple: '#AEB6CE',
    wisps: ['#DCE6F2', '#C2CADE', '#CAD6E6'],
  },
};

const WHITE = '#FFFFFF';

// Blur is in SVG user units (= px here). Scale with size, and ease off on
// Android where large SVG blur is comparatively expensive.
function blurFor(size: number, base: number): number {
  const scaled = (size / 92) * base;
  return Platform.OS === 'android' ? scaled * 0.65 : scaled;
}

// ---------------------------------------------------------------------------
// Ambient ripple ring — born at the orb edge, expands to the box edge, fades.
// All five share one master phase and are offset by index, so a fresh ring
// appears every period / RIPPLE_COUNT (the meditative pulse).
// ---------------------------------------------------------------------------

function Ripple({
  index,
  phase,
  size,
  color,
  peakOpacity,
}: {
  index: number;
  phase: SharedValue<number>;
  size: number;
  color: string;
  peakOpacity: SharedValue<number>;
}) {
  const coreR = CORE_R * size;
  const maxScale = (RIPPLE_MAX_R * size) / coreR;

  const style = useAnimatedStyle(() => {
    'worklet';
    const lp = (phase.value + index / RIPPLE_COUNT) % 1;
    const scale = interpolate(lp, [0, 1], [1, maxScale]);
    // quick birth, long fade — inner rings read bright, outer ones faint.
    const opacity = interpolate(lp, [0, 0.12, 1], [0, peakOpacity.value, 0]);
    return { opacity, transform: [{ scale }] };
  });

  return (
    <Animated.View style={[styles.fill, style]} pointerEvents="none">
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={coreR}
          stroke={color}
          strokeWidth={1}
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Aurora wisp — a heavily-blurred ellipse orbiting the orb centre.
// ---------------------------------------------------------------------------

function Wisp({
  rotation,
  size,
  color,
  uid,
  index,
}: {
  rotation: SharedValue<number>;
  size: number;
  color: string;
  uid: string;
  index: number;
}) {
  const style = useAnimatedStyle(() => {
    'worklet';
    return { transform: [{ rotateZ: `${rotation.value}deg` }] };
  });

  const rx = 0.26 * D * size;
  const ry = 0.13 * D * size;
  // Each wisp sits on a slightly different radius / angle so they don't stack.
  const lift = (0.06 + index * 0.03) * D * size;
  const cx = size / 2;
  const cy = size / 2 - lift;
  const std = blurFor(size, 7);
  const fid = `${uid}-wisp-${index}`;

  return (
    <Animated.View style={[styles.fill, style]} pointerEvents="none">
      <Svg width={size} height={size}>
        <Defs>
          <Filter id={fid} x="-60%" y="-60%" width="220%" height="220%">
            <FeGaussianBlur stdDeviation={std} />
          </Filter>
        </Defs>
        <Ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill={color}
          fillOpacity={0.2}
          filter={`url(#${fid})`}
        />
      </Svg>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// One eyebrow — a gentle upward arc whose wrapper lifts / tilts by state.
// ---------------------------------------------------------------------------

function Brow({
  side,
  raise,
  tilt,
  size,
}: {
  side: 'left' | 'right';
  raise: SharedValue<number>;
  tilt: SharedValue<number>;
  size: number;
}) {
  const w = BROW_W * size;
  const h = BROW_H * size;
  const cx = size / 2 + (side === 'left' ? -FEATURE_DX : FEATURE_DX) * size;
  const sign = side === 'left' ? -1 : 1; // asymmetric curiosity tilt

  const style = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateY: -raise.value },
        { rotateZ: `${sign * tilt.value}deg` },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.absCentered,
        { width: w, height: h, left: cx - w / 2, top: BROW_Y * size - h / 2 },
        style,
      ]}
    >
      <Svg width={w} height={h}>
        <Path
          d={`M 0 ${h * 0.85} Q ${w / 2} ${h * 0.1} ${w} ${h * 0.85}`}
          stroke={WHITE}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Orb
// ---------------------------------------------------------------------------

export function AssistantAuroraOrb({
  state,
  size = 92,
  scanTone = 'balanced',
}: AssistantAuroraOrbProps) {
  const reduce = useReduceMotion();
  const uid = useId().replace(/:/g, ''); // SVG ids must be selector-safe
  const tone = AURORA[scanTone] ?? AURORA.balanced;

  // ---- Shared values -----------------------------------------------------
  const breath = useSharedValue(1);
  const flutter = useSharedValue(1); // responding speech-rhythm micro-pulse
  const flash = useSharedValue(1); // listening brightening (scale)
  const flashGlow = useSharedValue(0); // listening brightening (overlay opacity)
  const haloBoost = useSharedValue(STATE[state].haloBoost);
  const rmPulse = useSharedValue(1); // reduced-motion opacity pulse
  const ripplePhase = useSharedValue(0);
  const rippleOpacity = useSharedValue(STATE[state].rippleOpacity);
  const wisp = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const browRaise = useSharedValue(0);
  const browTilt = useSharedValue(0);
  const eyeTx = useSharedValue(0);
  const eyeTy = useSharedValue(0);
  const blink = useSharedValue(1);

  const prevState = useRef(state);

  // ---- Breathing + responding flutter ------------------------------------
  useEffect(() => {
    if (reduce) {
      cancelAnimation(breath);
      cancelAnimation(flutter);
      breath.value = 1;
      flutter.value = 1;
      return;
    }
    const p = STATE[state];
    breath.value = withRepeat(
      withSequence(
        withTiming(p.breathAmp, { duration: p.breathMs, easing: EASE_IO }),
        withTiming(1, { duration: p.breathMs, easing: EASE_IO }),
      ),
      -1,
      false,
    );
    if (state === 'responding') {
      flutter.value = withRepeat(
        withSequence(
          withTiming(1.015, { duration: 200, easing: EASE_IO }),
          withTiming(1, { duration: 200, easing: EASE_IO }),
        ),
        -1,
        false,
      );
    } else {
      flutter.value = withTiming(1, { duration: 300 });
    }
    return () => {
      cancelAnimation(breath);
      cancelAnimation(flutter);
    };
  }, [state, reduce, breath, flutter]);

  // ---- Reduced-motion calm opacity pulse (thinking only) ------------------
  useEffect(() => {
    if (!reduce) {
      cancelAnimation(rmPulse);
      rmPulse.value = 1;
      return;
    }
    if (state === 'thinking') {
      rmPulse.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 750, easing: EASE_IO }),
          withTiming(1, { duration: 750, easing: EASE_IO }),
        ),
        -1,
        false,
      );
    } else {
      rmPulse.value = withTiming(1, { duration: 400 });
    }
    return () => cancelAnimation(rmPulse);
  }, [state, reduce, rmPulse]);

  // ---- Ripple cadence -----------------------------------------------------
  useEffect(() => {
    if (reduce) {
      cancelAnimation(ripplePhase);
      return;
    }
    const p = STATE[state];
    rippleOpacity.value = withTiming(p.rippleOpacity, TRANSITION);
    ripplePhase.value = withRepeat(
      withTiming(1, { duration: p.ripplePeriod, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(ripplePhase);
  }, [state, reduce, ripplePhase, rippleOpacity]);

  // ---- Aurora wisp rotation (slow drift; static under reduced motion) -----
  useEffect(() => {
    const base = [9000, 11500, 13500];
    if (reduce) {
      wisp.forEach((w) => cancelAnimation(w));
      return;
    }
    const k = STATE[state].wispScale;
    wisp.forEach((w, i) => {
      const from = w.value % 360;
      w.value = from;
      w.value = withRepeat(
        withTiming(from + 360, { duration: base[i] / k, easing: Easing.linear }),
        -1,
        false,
      );
    });
    return () => wisp.forEach((w) => cancelAnimation(w));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, reduce]);

  // ---- Halo boost ---------------------------------------------------------
  useEffect(() => {
    haloBoost.value = withTiming(reduce ? 0 : STATE[state].haloBoost, TRANSITION);
  }, [state, reduce, haloBoost]);

  // ---- Eyebrows + eye gaze (state-driven) --------------------------------
  useEffect(() => {
    if (reduce) {
      browRaise.value = withTiming(0, TRANSITION);
      browTilt.value = withTiming(0, TRANSITION);
      eyeTx.value = withTiming(0, TRANSITION);
      eyeTy.value = withTiming(0, TRANSITION);
      return;
    }
    const r = BROW_RAISE * size;
    switch (state) {
      case 'listening':
        browRaise.value = withTiming(r * 0.7, TRANSITION);
        browTilt.value = withTiming(0, TRANSITION);
        eyeTx.value = withTiming(0, TRANSITION);
        eyeTy.value = withTiming(-EYE_UP * size, TRANSITION);
        break;
      case 'thinking':
        browRaise.value = withTiming(r, TRANSITION);
        browTilt.value = withTiming(BROW_TILT, TRANSITION);
        eyeTx.value = withTiming(0, TRANSITION);
        eyeTy.value = withTiming(EYE_DOWN * size, TRANSITION);
        break;
      case 'responding':
        browRaise.value = withTiming(r * 0.3, TRANSITION);
        browTilt.value = withTiming(0, TRANSITION);
        eyeTy.value = withTiming(-EYE_UP_RESPOND * size, TRANSITION);
        // gentle left-right "reading" scan
        eyeTx.value = withDelay(
          400,
          withRepeat(
            withSequence(
              withTiming(EYE_SCAN * size, { duration: 1200, easing: EASE_IO }),
              withTiming(-EYE_SCAN * size, { duration: 1200, easing: EASE_IO }),
            ),
            -1,
            true,
          ),
        );
        break;
      default: // idle
        browRaise.value = withTiming(0, TRANSITION);
        browTilt.value = withTiming(0, TRANSITION);
        eyeTx.value = withTiming(0, TRANSITION);
        eyeTy.value = withTiming(0, TRANSITION);
    }
    return () => {
      cancelAnimation(eyeTx);
    };
  }, [state, reduce, size, browRaise, browTilt, eyeTx, eyeTy]);

  // ---- Listening brightening flash (on entering listening) ----------------
  useEffect(() => {
    const entered = prevState.current !== state;
    prevState.current = state;
    if (reduce || !entered || state !== 'listening') return;
    flash.value = withSequence(
      withTiming(1.08, { duration: 125, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 125, easing: Easing.out(Easing.quad) }),
    );
    flashGlow.value = withSequence(
      withTiming(0.6, { duration: 125, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) }),
    );
  }, [state, reduce, flash, flashGlow]);

  // ---- Idle / thinking blink scheduler -----------------------------------
  useEffect(() => {
    if (reduce) {
      cancelAnimation(blink);
      blink.value = 1;
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const doBlink = () => {
      blink.value = withSequence(
        withTiming(BLINK_SQUASH, { duration: 90, easing: Easing.in(Easing.quad) }),
        withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) }),
      );
    };
    const schedule = () => {
      const [min, max] = state === 'thinking' ? [2200, 3600] : [4000, 6000];
      const wait = min + Math.random() * (max - min);
      timer = setTimeout(() => {
        if (cancelled) return;
        doBlink();
        schedule();
      }, wait);
    };
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state, reduce, blink]);

  // ---- Composed styles ---------------------------------------------------
  const containerStyle = useAnimatedStyle(() => ({
    opacity: rmPulse.value,
    transform: [{ scale: breath.value * flutter.value * flash.value }],
  }));
  const haloBoostStyle = useAnimatedStyle(() => ({ opacity: haloBoost.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashGlow.value }));
  const eyesStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: eyeTx.value }, { translateY: eyeTy.value }],
  }));
  const blinkStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));

  // ---- Static SVG fragments (re-render only on tone / size change) --------
  const coreR = CORE_R * size;
  const haloR = HALO_R * size;
  const coreBlur = blurFor(size, 1.6);
  const haloBlur = blurFor(size, 10);
  const eyeOffset = FEATURE_DX * size;
  const eyeCx = size / 2;

  return (
    <Animated.View
      accessibilityRole="image"
      accessibilityLabel="Pura Assist"
      style={[{ width: size, height: size }, styles.box, containerStyle]}
    >
      {/* LAYER 1 — ambient ripples */}
      {!reduce &&
        Array.from({ length: RIPPLE_COUNT }).map((_, i) => (
          <Ripple
            key={i}
            index={i}
            phase={ripplePhase}
            size={size}
            color={tone.ripple}
            peakOpacity={rippleOpacity}
          />
        ))}

      {/* LAYER 2 — glow halo (base + thinking boost overlay) */}
      <View style={styles.fill} pointerEvents="none">
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id={`${uid}-halo`} cx="50%" cy="50%" r="50%">
              {tone.halo.map((s, i) => (
                <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
              ))}
            </RadialGradient>
            <Filter id={`${uid}-haloBlur`} x="-50%" y="-50%" width="200%" height="200%">
              <FeGaussianBlur stdDeviation={haloBlur} />
            </Filter>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={haloR}
            fill={`url(#${uid}-halo)`}
            filter={`url(#${uid}-haloBlur)`}
          />
        </Svg>
      </View>
      <Animated.View style={[styles.fill, haloBoostStyle]} pointerEvents="none">
        <Svg width={size} height={size}>
          {/* Self-contained defs: on native each <Svg> is its own document,
              so url(#id) cannot reference the base halo's gradient/filter. */}
          <Defs>
            <RadialGradient id={`${uid}-halo2`} cx="50%" cy="50%" r="50%">
              {tone.halo.map((s, i) => (
                <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
              ))}
            </RadialGradient>
            <Filter id={`${uid}-haloBlur2`} x="-50%" y="-50%" width="200%" height="200%">
              <FeGaussianBlur stdDeviation={haloBlur} />
            </Filter>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={haloR}
            fill={`url(#${uid}-halo2)`}
            filter={`url(#${uid}-haloBlur2)`}
          />
        </Svg>
      </Animated.View>

      {/* LAYER 3 — core orb (off-centre gradient + soft blur) */}
      <View style={styles.fill} pointerEvents="none">
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient
              id={`${uid}-core`}
              cx="40%"
              cy="35%"
              r="72%"
              fx="40%"
              fy="35%"
            >
              {tone.core.map((s, i) => (
                <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
              ))}
            </RadialGradient>
            <Filter id={`${uid}-coreBlur`} x="-30%" y="-30%" width="160%" height="160%">
              <FeGaussianBlur stdDeviation={coreBlur} />
            </Filter>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={coreR}
            fill={`url(#${uid}-core)`}
            filter={`url(#${uid}-coreBlur)`}
          />
        </Svg>
      </View>

      {/* LAYER 4 — aurora wisps (clipped to the orb so they never spill) */}
      <View
        pointerEvents="none"
        style={[
          styles.absCentered,
          {
            width: coreR * 2,
            height: coreR * 2,
            left: size / 2 - coreR,
            top: size / 2 - coreR,
            borderRadius: coreR,
            overflow: 'hidden',
          },
        ]}
      >
        {Array.from({ length: WISP_COUNT }).map((_, i) => (
          <Wisp
            key={i}
            index={i}
            rotation={wisp[i]}
            size={coreR * 2}
            color={tone.wisps[i] ?? tone.wisps[0]}
            uid={uid}
          />
        ))}
      </View>

      {/* LAYER 3b — listening brightening flash (over the core) */}
      <Animated.View style={[styles.fill, flashStyle]} pointerEvents="none">
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id={`${uid}-flash`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={WHITE} stopOpacity={0.9} />
              <Stop offset="55%" stopColor={tone.wisps[0]} stopOpacity={0.4} />
              <Stop offset="100%" stopColor={tone.wisps[0]} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={coreR} fill={`url(#${uid}-flash)`} />
        </Svg>
      </Animated.View>

      {/* LAYER 5 — the face */}
      <Brow side="left" raise={browRaise} tilt={browTilt} size={size} />
      <Brow side="right" raise={browRaise} tilt={browTilt} size={size} />

      <Animated.View style={[styles.fill, eyesStyle]} pointerEvents="none">
        {(['left', 'right'] as const).map((side) => (
          <Animated.View
            key={side}
            style={[
              styles.eye,
              {
                width: EYE_D * size,
                height: EYE_D * size,
                borderRadius: (EYE_D * size) / 2,
                left:
                  eyeCx +
                  (side === 'left' ? -eyeOffset : eyeOffset) -
                  (EYE_D * size) / 2,
                top: EYE_Y * size - (EYE_D * size) / 2,
              },
              blinkStyle,
            ]}
          />
        ))}
      </Animated.View>

      <View
        pointerEvents="none"
        style={[
          styles.nose,
          {
            width: NOSE_W,
            height: NOSE_LEN * size,
            left: size / 2 - NOSE_W / 2,
            top: NOSE_TOP_Y * size,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absCentered: {
    position: 'absolute',
  },
  eye: {
    position: 'absolute',
    backgroundColor: WHITE,
  },
  nose: {
    position: 'absolute',
    backgroundColor: WHITE,
    borderRadius: NOSE_W / 2,
    opacity: 0.92,
  },
});

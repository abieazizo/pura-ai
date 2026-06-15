/**
 * RitualTheater — the dark theater backdrop for ACT 2 (the ritual).
 *
 * A pure, pointer-transparent backdrop that frames the SINGLE shared AuroraOrb
 * (driven by flow/motion.ts via OrbHost — NEVER mounted here) so it reads as a
 * living companion and the ONLY warm light in a cinematic near-black room.
 *
 * Layers, back to front:
 *   (a) a full-bleed base of ritualTone.base (near-black) — STATIC;
 *   (b) a soft RADIAL LIFT toward ritualTone.orbLift centered on the orb's rest
 *       center (cx, cy) — a genuine SVG RadialGradient POOL of light, never a
 *       flat fill — so the orb appears to sit in its own glow. The pool is a true
 *       room-filling lift (radius ≈ 2.6× the orb radius — it reaches well past
 *       the silhouette and falls to fully-transparent before the edges), so the
 *       near-black room is genuinely LIFTED, not merely rimmed. The pool TRACKS
 *       the orb (if cx/cy/size shift, the light follows) and it LIVES: the reach
 *       swells and recedes on a slow ~9s sine, deliberately phase-decoupled from
 *       the breathing ring (~5.5s) and the orb's own micro-breath (~4s) so
 *       nothing beats in lockstep; and it BLOOMS UP as the descent lands (an
 *       additive entrance lift biased LATE — peaking once the pool is already
 *       most of the way faded in — so "the room takes the orb in" actually reads
 *       rather than swelling invisibly while the pool is still half-transparent);
 *   (c) ~4% static film grain (ritualTone.grain) over the whole field — STATIC.
 *
 * NO orb, NO disc, NO text, NO controls are rendered here (the shared OrbHost
 * orb floats above this backdrop). The warmth lives only in the orb's gold.
 *
 * MOTION (this pass) — all Reanimated worklets, NEVER setTimeout/Animated:
 *   • the breath: a local withRepeat(withTiming(..., inOut.sin), -1, true) on the
 *     pool's radius + opacity, matching the Atmosphere drift idiom (the codebase's
 *     established way to make a backdrop breathe). The base + grain never move.
 *   • the entrance: an OPTIONAL `enter` SharedValue (the host threads the descent
 *     `p` from useDescent, 0 = overview → 1 = ritual) fades the whole pool in and
 *     adds a brief LATE settle bloom as it arrives, so the lift rises WITH the
 *     orb's carry-over rather than appearing fully-formed. Absent → presents at
 *     rest (already arrived), so the theater is safe to mount with cx/cy/size.
 *   • Reduce Motion: the breath loop is cancelled and held at its mid/rest reach;
 *     the entrance degrades to a clean cross-fade (no swell), the live OS flip is
 *     honored mid-session — matching the BreathingRing / Atmosphere idiom.
 *   • perfTier 'low': drops the grain layer AND freezes the breath at rest (one
 *     full-bleed SVG re-rasterizing under a continuous scale is the classic web
 *     jank source on the orb screens) — matching Atmosphere's perfTier idiom.
 *
 * Grain is platform-split, matching the sibling Atmosphere idiom: SVG
 * feTurbulence on web (react-native-svg stubs FeTurbulence on native), and a
 * pre-rasterized alpha-noise PNG tiled + tinted on iOS/Android — real grain on
 * every platform, never a silent no-op.
 *
 * No hex lives here — every color reads a NAMED token from @/theme/routineFlow.
 */

import React, { useEffect } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  FeColorMatrix,
  FeTurbulence,
  Filter,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { ritualTone } from '@/theme/routineFlow';

interface RitualTheaterProps {
  /** Orb rest center X in screen coords — the pool of light tracks it. */
  cx: number;
  /** Orb rest center Y in screen coords. */
  cy: number;
  /** Orb diameter; the lift radius scales from it so the pool fills the room. */
  size: number;
  /**
   * Stills the pool's breath + the entrance swell (held at a calm rest).
   * REQUIRED (no default) — matching RitualBreathingRingProps — so a host can
   * never silently animate against the user's OS Reduce Motion setting.
   */
  reduceMotion: boolean;
  /**
   * The host's descent progress (the SAME `p` from `useDescent` that carries the
   * orb over): 0 = overview, 1 = ritual. The pool fades in + settle-blooms as it
   * crosses 1, so the lift arrives WITH the orb. Omit to present at full rest
   * (the theater then mounts with cx/cy/size alone — integration-safe).
   */
  enter?: SharedValue<number>;
  /**
   * 'low' drops the grain layer AND freezes the pool breath (budget devices /
   * web compositor budget) — matching the sibling Atmosphere idiom. Default
   * 'high'.
   */
  perfTier?: 'high' | 'low';
}

// The pool of light fills the room: radius ≈ 2.6× the orb RADIUS (≈1.3× the orb
// DIAMETER). It reaches well past the silhouette and falls to fully-transparent
// before the screen edges, so the near-black base is genuinely LIFTED into a
// soft pool the orb sits inside — not a thin rim hugging its edge.
const LIFT_RADIUS_FACTOR = 2.6;
// A floor so a transient size<=0 (pre-measure) never yields a zero/NaN radius.
const MIN_LIFT_RADIUS = 1;

// The pool's breath: how much the reach swells at the top of the breath (+8% of
// the rest radius) — a barely-there swell so the room feels alive, not pulsing.
const BREATH_REACH = 0.08;
// One leg of the breath. 4.5s out + 4.5s back (auto-reverse) = a ~9s full breath
// — slower than the breathing ring (~5.5s) and the orb micro-breath (~4s), so the
// three never lock into one beat (the same decoupling Atmosphere uses for drift).
const BREATH_LEG_MS = 4500;
// The pool's opacity dips slightly at the swelled top so the swell reads as a
// softening-out rather than a brightening (a held breath, not a flare). The REST
// endpoint is the token's full lift; the dip stays shallow so "the only warm
// light in the room" never drops far below its intended strength.
const OPACITY_REST = 1; // both endpoints — full token-defined lift
const OPACITY_BREATH = 0.9; // the softest point, mid-breath (shallow dip)
// Reduce-motion / low-tier rest: the mid reach + mid opacity (a calm, fully-
// present pool that does not breathe).
const REST_REACH = BREATH_REACH / 2;
const REST_OPACITY = (OPACITY_REST + OPACITY_BREATH) / 2;
// The entrance settle bloom: a brief extra reach as the descent lands, added on
// TOP of the breath so the pool "opens" to receive the orb. Biased LATE so it
// peaks once the pool is already most of the way in (≈85% opacity) — at the old
// a=0.5 peak the pool was only half-faded-in and the swell read as nothing.
const ENTER_BLOOM = 0.12;
// Where the settle bloom peaks along the entrance (a≈0.82 — late, where the pool
// is bright enough for the swell to actually register).
const BLOOM_PEAK_A = 0.82;

/**
 * The dark theater. Pure backdrop: position absolute fill, pointerEvents none,
 * accessibility-inert (purely decorative — no role, no label).
 */
export function RitualTheater({
  cx,
  cy,
  size,
  reduceMotion,
  enter,
  perfTier = 'high',
}: RitualTheaterProps) {
  // The breath is frozen on the low tier (avoid re-rasterizing a full-bleed SVG
  // under a continuous scale) AND under reduce motion — both hold at rest.
  const stillPool = reduceMotion || perfTier === 'low';

  // Guard a transient/garbage measure (cx,cy = 0,0 on the first frame before the
  // host reports the orb target): clamp the base radius so it never goes negative
  // or NaN; the SVG re-renders when cx/cy/size change.
  const baseRadius = Math.max(MIN_LIFT_RADIUS, (size / 2) * LIFT_RADIUS_FACTOR);

  // t: 0 at the rest endpoints, 1 at the swelled mid-breath. A local sine loop —
  // the established idiom for a living backdrop (Atmosphere drives its drift the
  // same way); motion.ts owns the entrance/advance/orb-emotion, not ambient loops.
  const breath = useSharedValue(0);
  useEffect(() => {
    if (stillPool) {
      cancelAnimation(breath); // assignment alone won't stop a running loop
      breath.value = 0;
      return;
    }
    breath.value = 0;
    breath.value = withRepeat(
      withTiming(1, { duration: BREATH_LEG_MS, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(breath);
  }, [stillPool, breath]);

  // The entrance factor (0→1). When the host threads the descent `p`, the pool
  // tracks it; absent, it sits at 1 (already arrived). A derived value so the
  // worklet reads one number whether or not `enter` was provided.
  const arrived = useDerivedValue(() => (enter ? enter.value : 1));

  // The lift's animated radius + opacity. The breath swells/softens the reach;
  // the entrance fades the pool in and adds a LATE settle bloom that fades back
  // into the resting breath. Under reduce-motion / low-tier the breath holds at
  // its mid rest and the entrance is a pure cross-fade (no swell). Radius is
  // clamped so a zero/garbage measure can never produce a negative/NaN radius.
  const liftStyle = useAnimatedStyle(() => {
    const a = arrived.value; // 0..1 entrance
    const reachK = stillPool ? REST_REACH : breath.value * BREATH_REACH;
    // The settle bloom is a triangular pulse peaking at BLOOM_PEAK_A (late) and
    // 0 at both ends, so the pool opens to receive the orb just as it brightens,
    // then relaxes into its resting breath. (Old a*(1-a)*4 peaked at a=0.5 —
    // exactly when the pool was still half-transparent and the swell read as
    // nothing.)
    const bloom = stillPool ? 0 : trianglePulse(a, BLOOM_PEAK_A) * ENTER_BLOOM;
    const scale = Math.max(0, 1 + reachK + bloom);

    const breathOpacity = stillPool
      ? REST_OPACITY
      : OPACITY_REST + breath.value * (OPACITY_BREATH - OPACITY_REST);

    return {
      opacity: a * breathOpacity,
      transform: [
        { translateX: cx },
        { translateY: cy },
        { scale },
        { translateX: -cx },
        { translateY: -cy },
      ],
    };
  });

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* (a) Near-black base — static, the only constant of the room. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: ritualTone.base }]} />

      {/* (b) The living radial pool of light behind the orb (in PIXEL coords so
              it tracks the orb exactly). The wrapper scales about (cx, cy) so the
              pool breathes + blooms on its own center without re-rendering SVG. */}
      <Animated.View style={[StyleSheet.absoluteFill, liftStyle]} pointerEvents="none">
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient
              id="ritualOrbLift"
              gradientUnits="userSpaceOnUse"
              cx={cx}
              cy={cy}
              r={baseRadius}
            >
              <Stop offset="0" stopColor={ritualTone.orbLift} stopOpacity={1} />
              <Stop offset="1" stopColor={ritualTone.orbLift} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#ritualOrbLift)" />
        </Svg>
      </Animated.View>

      {/* (c) ~4% static film grain over the whole field (dropped on the low tier
              to spare the web compositor — matching the Atmosphere idiom). */}
      {perfTier !== 'low' && (
        <FilmGrain color={ritualTone.grain.color} opacity={ritualTone.grain.opacity} />
      )}
    </View>
  );
}

/**
 * A triangular pulse in [0,1]: 0 at a=0 and a=1, 1 at a=peak. Lets the entrance
 * bloom crest LATE (peak≈0.82) so the swell lands while the pool is already
 * bright — not at the a=0.5 midpoint where it was still half-transparent.
 */
function trianglePulse(a: number, peak: number): number {
  'worklet';
  if (a <= 0 || a >= 1) return 0;
  return a < peak ? a / peak : (1 - a) / (1 - peak);
}

// The pre-rasterized alpha-noise tile for native (see scripts/genGrainPng.cjs).
// Same root-relative depth as components/Atmosphere.tsx (both 5 dirs deep).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GRAIN_TILE = require('../../../../../../assets/grain/grain96.png');

/**
 * Static film grain. Web: SVG fractal noise recolored to the grain tint (the
 * matrix alpha row passes 1.0 — the Svg-level opacity owns the ~4% percentage).
 * Native: the noise PNG tiled full-screen, tintColor = the grain tint. Static
 * on every platform — nothing animates here.
 */
function FilmGrain({ color, opacity }: { color: string; opacity: number }) {
  if (Platform.OS !== 'web') {
    // Touch-through is owned by the RitualTheater root (pointerEvents="none");
    // RN's Image type doesn't accept pointerEvents, so we don't set it here —
    // matching the sibling Atmosphere's native grain branch.
    return (
      <Image
        source={GRAIN_TILE}
        resizeMode="repeat"
        style={[StyleSheet.absoluteFillObject, { opacity, tintColor: color }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    );
  }
  const { r, g, b } = hexToUnit(color);
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} opacity={opacity}>
        <Defs>
          <Filter id="ritualGrain">
            <FeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={11} />
            <FeColorMatrix
              type="matrix"
              values={`0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 1 0`}
            />
          </Filter>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" filter="url(#ritualGrain)" />
      </Svg>
    </View>
  );
}

/** Hex → unit RGB triplet for the feColorMatrix grain tint. */
function hexToUnit(hex: string): { r: string; g: string; b: string } {
  const m = hex.replace('#', '');
  const v = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const num = parseInt(v.slice(0, 6), 16);
  return {
    r: (((num >> 16) & 255) / 255).toFixed(3),
    g: (((num >> 8) & 255) / 255).toFixed(3),
    b: ((num & 255) / 255).toFixed(3),
  };
}

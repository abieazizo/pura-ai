/**
 * AuroraOrb — the living companion at the heart of Pura's onboarding cold open.
 *
 * A single point of light is born, blooms into a glowing aurora orb, gains its
 * color, and opens its eyes — becoming a calm, present face that blinks back at
 * the user. This is a SELF-CONTAINED, SIZE-DRIVEN component: every internal
 * dimension is a fraction of the `size` prop, so the same instance can be
 * reused as a shared element across onboarding screens (Screen 2 will shrink &
 * reposition it). It owns no layout assumptions beyond "center me in a box".
 *
 * Visual anatomy (bottom → top):
 *   A  Ground glow   — light cast on the porcelain surface (2.2× core)
 *   B  Halo          — atmospheric diffusion (1.4× core)
 *   ·  Ripples       — breath rings emanating outward, forever
 *   C  Core orb      — body; a centered radial fading to transparent (even
 *                      feathered edge) + an off-center sheen for dimension.
 *                      Pale & full versions crossfade so it "gains color".
 *   D  Aurora wisps  — soft internal flow, three desynced rotations
 *   E  The face      — two dot eyes, two sketched brows, a nose line (no mouth)
 *
 * Soft edges are built from radial gradients that fade to transparent — this
 * RNSVG build ships no blur filter, and transparent-fading gradients feather
 * identically on web and native. All color literals come from `auroraOrb`.
 *
 * Animation is Reanimated-only (UI thread): transforms, opacity, and two
 * stroke-dashoffset draw-ons (the brows + nose). Nothing layout-thrashes, so
 * the whole sequence holds 60fps.
 */

import React, { useEffect, useId, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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

export interface AuroraOrbProps {
  /** Core orb diameter in px. Everything inside scales from this. */
  size: number;
  /**
   * 'awakening' plays the full birth timeline (first launch). 'idle' renders
   * the orb fully formed and runs only the living-idle loops (repeat launch /
   * after a sibling has already awoken it).
   */
  state: AuroraOrbState;
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

const RIPPLE_COUNT = 5;
const RIPPLE_PERIOD = 3000;
const RIPPLE_STAGGER = 700;

export function AuroraOrb({
  size,
  state,
  enableParallax = false,
  reduceMotion = false,
  onAwake,
}: AuroraOrbProps) {
  const uid = useId();
  const ids = useMemo(
    () => ({
      bodyFull: `aurora-bodyFull-${uid}`,
      bodyPale: `aurora-bodyPale-${uid}`,
      hiFull: `aurora-hiFull-${uid}`,
      hiPale: `aurora-hiPale-${uid}`,
      halo: `aurora-halo-${uid}`,
      ground: `aurora-ground-${uid}`,
      wispC: `aurora-wispC-${uid}`,
      wispV: `aurora-wispV-${uid}`,
      seed: `aurora-seed-${uid}`,
      driftV: `aurora-driftV-${uid}`,
      driftC: `aurora-driftC-${uid}`,
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
  const browHalf = S * 0.07; // half brow width (~14% total)
  const browLift = S * 0.02;
  const noseX = half;
  const noseY1 = S * 0.485;
  const noseY2 = S * 0.55;
  const browLen = S * 0.17; // dash length ≥ brow path length
  const noseLen = noseY2 - noseY1;

  // Brow paths, authored INNER → OUTER so the dash reveal grows AWAY from
  // center (the spec's "outward from center"). Gentle upward arc.
  const xL = half - eyeSep; // left eye center x
  const xR = half + eyeSep; // right eye center x
  const browLPath = `M ${xL + browHalf} ${browY} Q ${xL} ${browY - browLift} ${xL - browHalf} ${browY}`;
  const browRPath = `M ${xR - browHalf} ${browY} Q ${xR} ${browY - browLift} ${xR + browHalf} ${browY}`;

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

  // ---- Gyro parallax (front plane). Hook always called; output ignored when
  //      disabled or under reduce-motion. No-op (zeros) without a sensor. -----
  const sensor = useAnimatedSensor(SensorType.ROTATION, { interval: 'auto' });
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const parallaxOn = enableParallax && !reduceMotion && Platform.OS !== 'web';
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

  // ---- The master timeline -------------------------------------------------
  useEffect(() => {
    if (mode === 'static') {
      onAwakeRef.current?.();
      return; // formed + frozen; nothing animates
    }

    // Continuous wisp rotation runs the moment the orb exists, at three
    // desynced periods, so they fade in already-moving and never sync.
    r1.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1, false);
    r2.value = withRepeat(withTiming(1, { duration: 11000, easing: Easing.linear }), -1, false);
    r3.value = withRepeat(withTiming(1, { duration: 13000, easing: Easing.linear }), -1, false);

    // Breath — sine, never a hard stop at the extremes.
    breath.value = withDelay(
      born ? T.breath : 0,
      withRepeat(
        withSequence(
          withTiming(1.025, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
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
          withTiming(1, { duration: 15000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 15000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );

    // Ripples — five rings, staggered, each a 3s expand+fade, forever.
    const rippleBase = born ? T.ripple : 0;
    ripples.forEach((rp, i) => {
      rp.value = withDelay(
        rippleBase + i * RIPPLE_STAGGER,
        withRepeat(
          withTiming(1, { duration: RIPPLE_PERIOD, easing: Easing.out(Easing.cubic) }),
          -1,
          false,
        ),
      );
    });

    if (!born) {
      // Idle launch: already formed; just signal "alive".
      onAwakeRef.current?.();
    } else {
      // ===== THE AWAKENING ===================================================
      // Seed of light → fades as the bloom takes over.
      seedO.value = withDelay(
        T.seed,
        withSequence(
          withTiming(0.6, { duration: 250, easing: Easing.out(Easing.cubic) }),
          withDelay(180, withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) })),
        ),
      );
      seedS.value = withDelay(T.seed, withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) }));

      // The bloom — spring from seed to full size with a ~2% micro-overshoot
      // (damping 18). Color saturates in lock-step (pale → full crossfade).
      bloom.value = withDelay(
        T.bloom,
        withSpring(1, { mass: 1.2, stiffness: 90, damping: 18 }),
      );
      sat.value = withDelay(
        T.bloom,
        withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
      );

      // Ground glow blooms with the body.
      groundO.value = withDelay(T.ground, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));

      // Halo exhale.
      haloO.value = withDelay(T.halo, withTiming(0.7, { duration: 500, easing: Easing.out(Easing.cubic) }));
      haloS.value = withDelay(T.halo, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));

      // Aurora wisps fade in already-moving.
      wispO.value = withDelay(T.wisps, withTiming(0.22, { duration: 600, easing: Easing.out(Easing.cubic) }));

      // Eyes open — each a 1px line expanding to a full dot, asymmetric stagger.
      eyeLO.value = withDelay(T.eyeL, withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) }));
      eyeRO.value = withDelay(T.eyeR, withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) }));

      // Brows sketch (stroke-dashoffset draw, outward from center).
      browLO.value = withDelay(T.brows, withTiming(1, { duration: 400, easing: Easing.inOut(Easing.cubic) }));
      browRO.value = withDelay(T.brows, withTiming(1, { duration: 400, easing: Easing.inOut(Easing.cubic) }));

      // Nose line draws.
      noseO.value = withDelay(T.nose, withTiming(1, { duration: 250, easing: Easing.inOut(Easing.cubic) }));

      // First blink, then signal alive.
      blink.value = withDelay(
        T.blink,
        withSequence(
          withTiming(0.08, { duration: 90, easing: Easing.in(Easing.quad) }),
          withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
        ),
      );
      const awakeTimer = setTimeout(() => onAwakeRef.current?.(), T.blink + 200);
      pendingTimers.current.push(awakeTimer);
    }

    // ===== Random idle blinks (after the first) =============================
    let cancelled = false;
    const scheduleBlink = (firstDelay: number) => {
      const tmr = setTimeout(function tick() {
        if (cancelled) return;
        blink.value = withSequence(
          withTiming(0.08, { duration: 90, easing: Easing.in(Easing.quad) }),
          withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }),
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
        browLO, browRO, noseO, blink, breath, drift, r1, r2, r3, ...ripples,
      ].forEach(cancelAnimation);
      pendingTimers.current.forEach(clearTimeout);
      pendingTimers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ---- Animated styles -----------------------------------------------------
  // Orb plane (core + halo + face) — bloom scale × breath × parallax.
  const orbPlane = useAnimatedStyle(() => ({
    transform: [
      { translateX: lagX.value * 8 },
      { translateY: lagY.value * 8 },
      { scale: interpolate(bloom.value, [0, 1], [seedScale, 1]) * breath.value },
    ],
  }));
  // Ground glow plane — shallower parallax so the orb floats ABOVE the surface.
  const groundPlane = useAnimatedStyle(() => ({
    opacity: groundO.value * (0.97 + (breath.value - 1) / 0.025 * 0.03),
    transform: [{ translateX: lagX.value * 5 }, { translateY: lagY.value * 5 }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloO.value,
    transform: [{ scale: haloS.value }],
  }));
  const paleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sat.value, [0.3, 1], [1, 0], 'clamp'),
  }));
  const fullStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sat.value, [0.3, 1], [0, 1], 'clamp'),
  }));
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
  const rot1 = useAnimatedStyle(() => ({ transform: [{ rotate: `${r1.value * 360}deg` }] }));
  const rot2 = useAnimatedStyle(() => ({ transform: [{ rotate: `${-r2.value * 360}deg` }] }));
  const rot3 = useAnimatedStyle(() => ({ transform: [{ rotate: `${r3.value * 360}deg` }] }));

  const eyeLStyle = useAnimatedStyle(() => ({
    opacity: interpolate(eyeLO.value, [0, 0.2, 1], [0, 1, 1], 'clamp'),
    transform: [{ scaleY: interpolate(eyeLO.value, [0, 1], [0.08, 1]) * blink.value }],
  }));
  const eyeRStyle = useAnimatedStyle(() => ({
    opacity: interpolate(eyeRO.value, [0, 0.2, 1], [0, 1, 1], 'clamp'),
    transform: [{ scaleY: interpolate(eyeRO.value, [0, 1], [0.08, 1]) * blink.value }],
  }));
  const browLProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - browLO.value) * browLen,
  }));
  const browRProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - browRO.value) * browLen,
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
      accessibilityRole="image"
      accessibilityLabel="Pura"
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

      {/* B + ripples + C + D + E all share the orb plane (bloom/breath/parallax) */}
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

        {/* Breath ripples */}
        {ripples.map((rp, i) => (
          <Ripple
            key={i}
            phase={rp}
            diameter={RIPPLE}
            positionStyle={centered(RIPPLE)}
            borderWidth={Math.max(1, S * 0.004)}
          />
        ))}

        {/* LAYER C — core orb. Pale + full crossfade ("gains color"). Each is a
            centered body (feathered edge) + an off-center sheen. */}
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
              <RadialGradient id={ids.hiPale} cx="40%" cy="34%" r="42%">
                <Stop offset="0%" stopColor={C.corePale0} />
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
              <RadialGradient id={ids.hiFull} cx="40%" cy="34%" r="42%">
                <Stop offset="0%" stopColor={C.coreFull0} />
                <Stop offset="100%" stopColor={C.coreHiEdge} />
              </RadialGradient>
            </Defs>
            <Circle cx={half} cy={half} r={half} fill={`url(#${ids.bodyFull})`} />
            <Circle cx={half} cy={half} r={half} fill={`url(#${ids.hiFull})`} />
          </Svg>
        </Animated.View>

        {/* LAYER D — aurora wisps (three desynced rotations) + hue-drift pair */}
        <Animated.View style={[centered(S), styles.center, wispStyle]} pointerEvents="none">
          <Animated.View style={[styles.fill, styles.center, rot1]}>
            <WispEllipse id={ids.wispC} w={S * 0.62} h={S * 0.3} c0={C.wispCyan0} c1={C.wispCyanEdge} dx={-S * 0.06} dy={-S * 0.05} />
          </Animated.View>
          <Animated.View style={[styles.fill, styles.center, rot2]}>
            <WispEllipse id={ids.wispV} w={S * 0.58} h={S * 0.26} c0={C.wispViolet0} c1={C.wispVioletEdge} dx={S * 0.05} dy={S * 0.06} />
          </Animated.View>
          <Animated.View style={[styles.fill, styles.center, rot3]}>
            <WispEllipse id={`${ids.wispC}-b`} w={S * 0.5} h={S * 0.22} c0={C.wispCyan0} c1={C.wispCyanEdge} dx={S * 0.04} dy={-S * 0.03} />
          </Animated.View>
        </Animated.View>

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

        {/* LAYER E — the face. Eyes are Views (crisp scaleY blink); brows + nose
            are stroke-dashoffset draw-ons. Pure white, round caps, no mouth. */}
        <Animated.View
          style={[styles.eyeDot, eyeLStyle, { width: eyeR * 2, height: eyeR * 2, borderRadius: eyeR, left: xL - eyeR, top: eyeY - eyeR }]}
        />
        <Animated.View
          style={[styles.eyeDot, eyeRStyle, { width: eyeR * 2, height: eyeR * 2, borderRadius: eyeR, left: xR - eyeR, top: eyeY - eyeR }]}
        />
        <View style={[centered(S)]} pointerEvents="none">
          <Svg width={S} height={S}>
            <AnimatedPath
              d={browLPath}
              stroke={C.face}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={browLen}
              animatedProps={browLProps}
            />
            <AnimatedPath
              d={browRPath}
              stroke={C.face}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={browLen}
              animatedProps={browRProps}
            />
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
}

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

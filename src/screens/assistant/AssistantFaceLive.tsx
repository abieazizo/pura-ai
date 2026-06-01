/**
 * AssistantFaceLive — Pura Assist's avatar IS the user's own scanned face.
 *
 * No 3D, no remote asset, no face detection. We take the most recent scan
 * photo from app state and present it inside a circular mask, then layer
 * subtle motion on top — a blink, a soft "gaze" glow that drifts, and a
 * thinking mesh — so the face reads as alive and attentive without ever
 * claiming precision we don't have. This is the Pura differentiator: the
 * assistant is literally looking back with the face it just analyzed.
 *
 * Five stacked layers inside one circular container (bottom → top):
 *   1. Pura Blue halo (container background tint)
 *   2. Cropped face photo (scaled-up Image, fixed heuristic crop — NO landmarks)
 *   3. Blink bar (Porcelain eyelid sweeping the eye line)
 *   4. Eye-focus glow (feathered Pura Blue radial, suggests gaze)
 *   5. Thinking mesh (thin Pura Blue triangulation, thinking-state only)
 *
 * When there is no scan we never show a stock face — we show a subdued
 * Pura "P" mark instead.
 *
 * Reads ONLY puraAssist tokens + shared font families (no hex literals).
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Line,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { puraAssist } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export type AssistantFaceState = 'idle' | 'thinking' | 'landing';

export interface AssistantFaceLiveProps {
  state: AssistantFaceState;
  subdued?: boolean;
}

// ---------------------------------------------------------------------------
// Geometry — everything is authored in the BASE (idle) coordinate space; the
// whole container scales up to MAX while thinking via a single transform, so
// inner layers never need to be re-measured.
// ---------------------------------------------------------------------------

const BASE_SIZE = 56;
const MAX_SIZE = 92;
const MAX_SCALE = MAX_SIZE / BASE_SIZE; // ≈ 1.643

const EYE_BOX = 24; // feathered-glow sprite box (in base units)
const px = (f: number) => f * BASE_SIZE;

// Eye-line is at 38% down the face; blink + gaze both anchor here.
const EYE_LINE = BASE_SIZE * 0.38;

// Thinking mesh — 15 connected segments over the central face area, kept well
// inside the circle so the clip never cuts a node awkwardly.
const MESH: ReadonlyArray<readonly [number, number, number, number]> = [
  [18, 14, 38, 14], // brow line
  [18, 14, 19, 23], // L brow → L eye
  [38, 14, 37, 23], // R brow → R eye
  [19, 23, 37, 23], // eye line
  [19, 23, 28, 26], // L eye → nose top
  [37, 23, 28, 26], // R eye → nose top
  [28, 26, 28, 34], // nose bridge
  [19, 23, 15, 30], // L eye → L cheek
  [37, 23, 41, 30], // R eye → R cheek
  [15, 30, 22, 40], // L cheek → mouth L
  [41, 30, 34, 40], // R cheek → mouth R
  [28, 34, 22, 40], // nose → mouth L
  [28, 34, 34, 40], // nose → mouth R
  [22, 40, 28, 45], // mouth L → chin
  [34, 40, 28, 45], // mouth R → chin
];

export function AssistantFaceLive({ state, subdued = false }: AssistantFaceLiveProps) {
  const reduce = useReduceMotion();
  const scans = useAppStore((s) => s.scans);
  const photoUri =
    scans.length > 0 ? scans[scans.length - 1].photoUri : undefined;

  // No usable scan → subdued "P" mark (never a stock face).
  const placeholder = subdued || !photoUri;
  const baseOpacity = placeholder ? 0.6 : 1;

  // ---- Shared values ----
  const sizeScale = useSharedValue(state === 'thinking' ? MAX_SCALE : 1);
  const breath = useSharedValue(1);
  const pop = useSharedValue(1);
  const rmOpacity = useSharedValue(1);
  const blink = useSharedValue(0);
  const eyeTx = useSharedValue(0);
  const eyeTy = useSharedValue(0);
  const mesh = useSharedValue(0);

  // ---- Size transition + landing pop --------------------------------------
  useEffect(() => {
    if (reduce) {
      // Size still changes, but linearly and with no pop.
      sizeScale.value = withTiming(state === 'thinking' ? MAX_SCALE : 1, {
        duration: 300,
        easing: Easing.linear,
      });
      pop.value = 1;
      return;
    }
    if (state === 'thinking') {
      sizeScale.value = withTiming(MAX_SCALE, {
        duration: 300,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
    } else if (state === 'landing') {
      sizeScale.value = withTiming(1, {
        duration: 400,
        easing: Easing.inOut(Easing.ease),
      });
      pop.value = withSequence(
        withTiming(1.05, { duration: 175, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 175, easing: Easing.out(Easing.quad) }),
      );
    } else {
      sizeScale.value = withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [state, reduce, sizeScale, pop]);

  // ---- Breathing (skipped under reduced motion; runs even when subdued so
  //      the "P" mark breathes too) -----------------------------------------
  useEffect(() => {
    if (reduce) {
      cancelAnimation(breath);
      breath.value = 1;
      return;
    }
    const amp = state === 'thinking' ? 1.04 : 1.025;
    breath.value = withRepeat(
      withSequence(
        withTiming(amp, { duration: 1750, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1750, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(breath);
  }, [state, reduce, breath]);

  // ---- Reduced-motion: replace all transitions with a calm opacity pulse ---
  useEffect(() => {
    if (!reduce) {
      cancelAnimation(rmOpacity);
      rmOpacity.value = 1;
      return;
    }
    rmOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(rmOpacity);
  }, [reduce, rmOpacity]);

  // ---- Eye-focus drift / gaze cycle ---------------------------------------
  useEffect(() => {
    if (reduce || placeholder) {
      cancelAnimation(eyeTx);
      cancelAnimation(eyeTy);
      eyeTx.value = 0;
      eyeTy.value = 0;
      return;
    }
    if (state === 'thinking') {
      const left = px(-0.12);
      const right = px(0.12);
      const down = px(0.08);
      eyeTx.value = withRepeat(
        withSequence(
          withTiming(left, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(right, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      eyeTy.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1000 }),
          withTiming(0, { duration: 1000 }),
          withTiming(down, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else if (state === 'idle') {
      const d = px(0.03);
      eyeTy.value = withTiming(0, { duration: 600 });
      eyeTx.value = withRepeat(
        withSequence(
          withTiming(-d, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(d, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      // landing — settle gaze to centre
      cancelAnimation(eyeTx);
      cancelAnimation(eyeTy);
      eyeTx.value = withTiming(0, { duration: 300 });
      eyeTy.value = withTiming(0, { duration: 300 });
    }
    return () => {
      cancelAnimation(eyeTx);
      cancelAnimation(eyeTy);
    };
  }, [state, reduce, placeholder, eyeTx, eyeTy]);

  // ---- Thinking mesh fade --------------------------------------------------
  useEffect(() => {
    if (reduce || placeholder) {
      cancelAnimation(mesh);
      mesh.value = 0;
      return;
    }
    mesh.value =
      state === 'thinking'
        ? withTiming(0.25, { duration: 250, easing: Easing.out(Easing.ease) })
        : withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) });
  }, [state, reduce, placeholder, mesh]);

  // ---- Blink scheduler -----------------------------------------------------
  useEffect(() => {
    if (reduce || placeholder) {
      blink.value = 0;
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const doBlink = (slow: boolean) => {
      blink.value = withSequence(
        withTiming(1, {
          duration: slow ? 180 : 120,
          easing: Easing.in(Easing.quad),
        }),
        withTiming(1, { duration: slow ? 90 : 60 }),
        withTiming(0, {
          duration: slow ? 200 : 120,
          easing: Easing.out(Easing.quad),
        }),
      );
    };

    // Landing gets a single, slower blink and no repeat.
    if (state === 'landing') {
      doBlink(true);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    const schedule = () => {
      const [min, max] = state === 'thinking' ? [1500, 2500] : [4000, 6000];
      const wait = min + Math.random() * (max - min);
      timer = setTimeout(() => {
        if (cancelled) return;
        doBlink(false);
        schedule();
      }, wait);
    };
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state, reduce, placeholder, blink]);

  // ---- Animated styles -----------------------------------------------------
  const containerStyle = useAnimatedStyle(() => ({
    opacity: baseOpacity * rmOpacity.value,
    transform: [{ scale: sizeScale.value * breath.value * pop.value }],
  }));
  const blinkStyle = useAnimatedStyle(() => ({ opacity: blink.value }));
  const eyeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: eyeTx.value }, { translateY: eyeTy.value }],
  }));
  const meshStyle = useAnimatedStyle(() => ({ opacity: mesh.value }));

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
      accessibilityRole="image"
      accessibilityLabel={
        placeholder ? 'Pura Assist' : 'Pura Assist, reading your scan'
      }
    >
      {placeholder ? (
        <View style={styles.placeholderFill}>
          <Text style={styles.pGlyph}>P</Text>
        </View>
      ) : (
        <>
          {/* Layer 2 — cropped face photo */}
          <Image
            source={{ uri: photoUri }}
            style={styles.facePhoto}
            contentFit="cover"
            transition={120}
          />

          {/* Layer 3 — blink (Porcelain eyelid) */}
          <Animated.View style={[styles.blinkBar, blinkStyle]} />

          {/* Layer 4 — eye-focus glow (feathered radial) */}
          <Animated.View style={[styles.eyeGlow, eyeStyle]}>
            <Svg width={EYE_BOX} height={EYE_BOX}>
              <Defs>
                <RadialGradient id="eyeFocus" cx="50%" cy="50%" r="50%">
                  <Stop
                    offset="0%"
                    stopColor={puraAssist.blue}
                    stopOpacity={0.5}
                  />
                  <Stop
                    offset="100%"
                    stopColor={puraAssist.blue}
                    stopOpacity={0}
                  />
                </RadialGradient>
              </Defs>
              <Circle
                cx={EYE_BOX / 2}
                cy={EYE_BOX / 2}
                r={EYE_BOX / 2}
                fill="url(#eyeFocus)"
              />
            </Svg>
          </Animated.View>

          {/* Layer 5 — thinking mesh */}
          <Animated.View style={[styles.meshWrap, meshStyle]}>
            <Svg width={BASE_SIZE} height={BASE_SIZE}>
              {MESH.map(([x1, y1, x2, y2], i) => (
                <Line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={puraAssist.blue}
                  strokeWidth={0.75}
                  strokeLinecap="round"
                />
              ))}
            </Svg>
          </Animated.View>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Layer 1 — halo lives on the container background tint.
  container: {
    width: BASE_SIZE,
    height: BASE_SIZE,
    borderRadius: BASE_SIZE / 2,
    backgroundColor: puraAssist.blue05,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  facePhoto: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: BASE_SIZE * 2.2,
    height: BASE_SIZE * 2.2,
    transform: [
      { translateX: -BASE_SIZE * 0.6 },
      { translateY: -BASE_SIZE * 0.75 },
    ],
  },
  blinkBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: EYE_LINE,
    height: BASE_SIZE * 0.12,
    borderRadius: 2,
    backgroundColor: puraAssist.bg, // Porcelain
    pointerEvents: 'none',
  },
  eyeGlow: {
    position: 'absolute',
    width: EYE_BOX,
    height: EYE_BOX,
    left: BASE_SIZE * 0.5 - EYE_BOX / 2,
    top: EYE_LINE - EYE_BOX / 2,
    pointerEvents: 'none',
  },
  meshWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: BASE_SIZE,
    height: BASE_SIZE,
    pointerEvents: 'none',
  },
  placeholderFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: puraAssist.blue08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pGlyph: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 28,
    lineHeight: 32,
    color: puraAssist.ink,
    opacity: 0.7,
  },
});

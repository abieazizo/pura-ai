import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, {
  Defs,
  Ellipse,
  RadialGradient as SvgRadialGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { palette } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

/**
 * SplashScreen — "The Clearing".
 *
 * The boot is the breath before a mirror shows you yourself. The screen
 * begins as a cold, fogged black mirror. A porcelain patch CLEARS from the
 * center — an oval, face-shaped, not a circle — the way a hand wipes fog
 * from glass. The name "Pura" surfaces in that cleared patch. It holds for
 * one quiet beat, then the clearing floods outward and the porcelain becomes
 * the app itself. One word: Recognition. The reference object: clearing fog
 * from a mirror.
 *
 * Buried detail (one idea, three coherences): this boot is the SCAN RETICLE,
 * pre-echoed.
 *   SHAPE  — the cleared patch is a face-oval (ryRatio 1.12) at face height
 *            (46%), echoing the reticle that will later hold your real face.
 *   COLOR  — the only color in an otherwise black->porcelain boot is the
 *            scan-blue rim leaking light at the clearing's edge.
 *   RHYTHM — that rim breathes on the reticle's EXACT 3500ms inOut(sin)
 *            "The Breath" curve, so the boot and the scanner share one tempo.
 *
 * Timeline (full-motion path), home by ~1880ms:
 *   140ms       : the clearing begins opening (decelerate, 680ms)
 *   620ms       : "Pura" surfaces (backEaseOut, 420ms)
 *   820ms       : clearing settled at coin size; one soft haptic; breath begins
 *   ~1480ms     : HOLD ends once systemReady; the clearing floods (outQuart,
 *                 400ms). "Pura" dissolves INTO the light (220ms) so the
 *                 flood overtakes the name — never a static white-with-name beat.
 *   ~1880ms     : full porcelain -> onReady(). Home's canvas is the same
 *                 #FCFDFF, so the handoff is invisible.
 *
 * DOWNGRADE-safe port: the clearing is built from SCALE + OPACITY only, over
 * STATIC SVG radial gradients. No animated gradient stops, no SVG masks (both
 * Android-risky). The black->porcelain flood is carried by a porcelain disc
 * scaled past the screen's far corner, with a solid porcelain cap as a final
 * seal so the last frame is guaranteed clean on every device size.
 *
 * Reduce Motion: no growth, no flood physics, no breath. Black cross-dissolves
 * to porcelain (300ms), "Pura" fades in, holds, fades out -> onReady().
 *
 * Contract (unchanged): mounts at app root; calls onReady() exactly once when
 * the boot is complete AND `systemReady` is true; honors a minimum hold so a
 * fast cold start still gets the full ceremony and a slow start never shows a
 * spinner — it simply holds, breathing, until ready.
 */

export interface SplashScreenProps {
  onReady: () => void;
  systemReady?: boolean;
}

// Geometry of the clearing.
const RY_RATIO = 1.12; // face-oval, not a circle (echoes the scan Reticle)
const CENTER_Y = 0.46; // face height

// Timeline (ms) — ported verbatim from the locked splash-lab "The Clearing".
const OPEN_START = 140;
const OPEN_DUR = 680;
const WM_IN = 620;
const WM_DUR = 420;
const HOLD_AT = 820; // OPEN_START + OPEN_DUR — clearing settled
const FLOOD_DUR = 400;
const WM_OUT_DUR = 220;
const WM_OUT_Y_DUR = 260;
const RIM_OUT_DUR = 300;
const BREATH_MS = 3500; // Reticle "The Breath" — the literal constant, not a guess

// Minimum hold before the flood may begin. Full path lands home by ~1880ms;
// a slow systemReady simply extends the breathing hold.
const MIN_HOLD_MS_FULL = 1480;
const MIN_HOLD_MS_REDUCED = 900;

// Eases — mirror the lab's named curves exactly.
const DECELERATE = Easing.bezier(0, 0, 0.2, 1);
const BACK_OUT = Easing.bezier(0.22, 1, 0.36, 1);
const EMPHASIZED = Easing.bezier(0.2, 0, 0, 1);
const OUT_QUART = Easing.out(Easing.poly(4));
const OUT_CUBIC = Easing.out(Easing.cubic);
const IN_CUBIC = Easing.in(Easing.cubic);
const BREATH_EASE = Easing.inOut(Easing.sin);

export function SplashScreen({ onReady, systemReady = true }: SplashScreenProps) {
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();

  const [phase, setPhase] = useState<'open' | 'settle' | 'depart'>('open');
  const holdElapsedAtRef = useRef<number>(Date.now());
  const firedRef = useRef(false);

  // The clearing (porcelain disc + scan-blue rim share one scale).
  const clearScale = useSharedValue(0);
  const discOpacity = useSharedValue(0);
  const rimOpacity = useSharedValue(0); // tracks the clearing's own open curve
  const breath = useSharedValue(0); // 0..1, the Reticle breath

  // Wordmark.
  const wmOpacity = useSharedValue(0);
  const wmTranslate = useSharedValue(10);

  // Porcelain flood cap — final clean-frame seal.
  const capOpacity = useSharedValue(0);

  // ——— Geometry (device-relative; lab was authored at 390x844) ———
  const COIN_R = Math.round(Math.min(width, height) * 0.385); // ~150 on a 390-wide screen
  const BASE_W = COIN_R * 2;
  const BASE_H = Math.round(COIN_R * 2 * RY_RATIO);
  const discLeft = width / 2 - BASE_W / 2;
  const discTop = height * CENTER_Y - BASE_H / 2;

  // Flood must cover the far corner with SOLID porcelain (plateau ~0.5 of R).
  const needX = width / 2 / 0.5;
  const needY = (height * Math.max(CENTER_Y, 1 - CENTER_Y)) / 0.5;
  const maxScale = Math.max(3.9, needX / COIN_R, needY / (COIN_R * RY_RATIO)) * 1.06;

  // Wordmark — PuraNightHome's serif voice (InstrumentSerif-SemiBold, ink),
  // a touch grander: -0.019/px tracking (= -0.95 at 50px).
  const WM_SIZE = Math.round(Math.min(width / 390, 1.2) * 50);
  const WM_LS = -0.019 * WM_SIZE;
  const WM_LINE = Math.round(WM_SIZE * 1.16);
  const wmTop = height * CENTER_Y - WM_LINE / 2;

  // ——— Arrival sequence ———
  useEffect(() => {
    if (reduceMotion) {
      // Calm cross-dissolve: black -> porcelain, name in, hold.
      capOpacity.value = withTiming(1, { duration: 300, easing: OUT_CUBIC });
      wmTranslate.value = 0;
      wmOpacity.value = withDelay(
        220,
        withTiming(1, { duration: 220, easing: OUT_CUBIC })
      );
      const t = setTimeout(() => setPhase('settle'), 300);
      holdElapsedAtRef.current = Date.now() + MIN_HOLD_MS_REDUCED;
      return () => clearTimeout(t);
    }

    // The clearing opens: porcelain disc + scan-blue rim grow together.
    clearScale.value = withDelay(
      OPEN_START,
      withTiming(1, { duration: OPEN_DUR, easing: DECELERATE })
    );
    discOpacity.value = withDelay(
      OPEN_START,
      withTiming(1, { duration: 220, easing: OUT_CUBIC })
    );
    rimOpacity.value = withDelay(
      OPEN_START,
      withTiming(0.9, { duration: OPEN_DUR, easing: DECELERATE })
    );

    // "Pura" surfaces in the cleared patch.
    wmOpacity.value = withDelay(
      WM_IN,
      withTiming(1, { duration: WM_DUR, easing: BACK_OUT })
    );
    wmTranslate.value = withDelay(
      WM_IN,
      withTiming(0, { duration: WM_DUR, easing: BACK_OUT })
    );

    // The rim breathes on the Reticle's exact tempo, starting as it settles.
    breath.value = withDelay(
      HOLD_AT,
      withRepeat(withTiming(1, { duration: BREATH_MS, easing: BREATH_EASE }), -1, true)
    );

    // One soft, ceremonial haptic at the moment of recognition.
    const settleTimer = setTimeout(() => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      setPhase('settle');
    }, HOLD_AT);

    holdElapsedAtRef.current = Date.now() + MIN_HOLD_MS_FULL;
    return () => clearTimeout(settleTimer);
  }, [
    reduceMotion,
    clearScale,
    discOpacity,
    rimOpacity,
    breath,
    wmOpacity,
    wmTranslate,
    capOpacity,
  ]);

  // Depart — flood/cross-dissolve, fires when the hold has played its minimum
  // AND systemReady is true.
  useEffect(() => {
    if (phase !== 'settle') return;
    if (!systemReady) return;

    const remaining = Math.max(0, holdElapsedAtRef.current - Date.now());
    const t = setTimeout(() => {
      setPhase('depart');

      const fire = () => {
        if (!firedRef.current) {
          firedRef.current = true;
          onReady();
        }
      };

      if (reduceMotion) {
        // Porcelain is already present; dissolve the name into it.
        wmOpacity.value = withTiming(
          0,
          { duration: 200, easing: IN_CUBIC },
          (done) => {
            if (done) runOnJS(fire)();
          }
        );
        return;
      }

      // The clearing floods outward and becomes the app.
      clearScale.value = withTiming(maxScale, {
        duration: FLOOD_DUR,
        easing: OUT_QUART,
      });
      // Scan-blue rim races out with the edge.
      rimOpacity.value = withTiming(0, {
        duration: RIM_OUT_DUR,
        easing: IN_CUBIC,
      });
      // "Pura" dissolves INTO the light, ahead of the flood completing.
      wmOpacity.value = withTiming(0, {
        duration: WM_OUT_DUR,
        easing: OUT_CUBIC,
      });
      wmTranslate.value = withTiming(-14, {
        duration: WM_OUT_Y_DUR,
        easing: EMPHASIZED,
      });
      // Porcelain cap seals the final frame; onReady fires when it's fully
      // opaque, so Home (also #FCFDFF) takes over on a clean, identical frame.
      const half = Math.round(FLOOD_DUR * 0.5);
      capOpacity.value = withDelay(
        half,
        withTiming(1, { duration: half, easing: OUT_CUBIC }, (done) => {
          if (done) runOnJS(fire)();
        })
      );
    }, remaining);

    return () => clearTimeout(t);
  }, [
    phase,
    systemReady,
    reduceMotion,
    maxScale,
    clearScale,
    rimOpacity,
    wmOpacity,
    wmTranslate,
    capOpacity,
    onReady,
  ]);

  const discStyle = useAnimatedStyle(() => ({
    opacity: discOpacity.value,
    transform: [{ scale: clearScale.value }],
  }));

  const rimStyle = useAnimatedStyle(() => {
    const b = breath.value;
    return {
      opacity: rimOpacity.value * (0.55 + 0.2 * b),
      transform: [{ scale: clearScale.value * (1 + 0.012 * b) }],
    };
  });

  const wmStyle = useAnimatedStyle(() => ({
    opacity: wmOpacity.value,
    transform: [{ translateY: wmTranslate.value }],
  }));

  const capStyle = useAnimatedStyle(() => ({ opacity: capOpacity.value }));

  const discGeom = {
    width: BASE_W,
    height: BASE_H,
    left: discLeft,
    top: discTop,
  };

  // Light status-bar icons over the black mirror; dark once it floods white.
  const barStyle = reduceMotion || phase === 'depart' ? 'dark' : 'light';

  return (
    <View style={styles.root}>
      <StatusBar style={barStyle} />

      {/* The porcelain clearing — opaque center feathering to transparent. */}
      <Animated.View
        style={[styles.layer, discGeom, discStyle]}
        pointerEvents="none"
      >
        <Svg width={BASE_W} height={BASE_H}>
          <Defs>
            <SvgRadialGradient id="puraPorcelain" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={palette.bg} stopOpacity={1} />
              <Stop offset="0.55" stopColor={palette.bg} stopOpacity={1} />
              <Stop offset="1" stopColor={palette.bg} stopOpacity={0} />
            </SvgRadialGradient>
          </Defs>
          <Ellipse
            cx={BASE_W / 2}
            cy={BASE_H / 2}
            rx={BASE_W / 2}
            ry={BASE_H / 2}
            fill="url(#puraPorcelain)"
          />
        </Svg>
      </Animated.View>

      {/* Scan-blue rim — light leaking at the clearing's edge, breathing. */}
      <Animated.View
        style={[styles.layer, discGeom, rimStyle]}
        pointerEvents="none"
      >
        <Svg width={BASE_W} height={BASE_H}>
          <Ellipse
            cx={BASE_W / 2}
            cy={BASE_H / 2}
            rx={BASE_W / 2 - 8}
            ry={BASE_H / 2 - 8}
            stroke={palette.clay}
            strokeWidth={6}
            opacity={0.18}
            fill="none"
          />
          <Ellipse
            cx={BASE_W / 2}
            cy={BASE_H / 2}
            rx={BASE_W / 2 - 8}
            ry={BASE_H / 2 - 8}
            stroke={palette.clay}
            strokeWidth={1.5}
            opacity={0.7}
            fill="none"
          />
        </Svg>
      </Animated.View>

      {/* Porcelain flood cap — final clean-frame seal. */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, styles.cap, capStyle]}
        pointerEvents="none"
      />

      {/* "Pura" — surfaces in the cleared patch, dissolves into the flood. */}
      <Animated.View
        style={[styles.wordmarkWrap, { top: wmTop, height: WM_LINE }, wmStyle]}
        pointerEvents="none"
      >
        <Text
          style={[styles.wordmark, { fontSize: WM_SIZE, lineHeight: WM_LINE, letterSpacing: WM_LS }]}
          maxFontSizeMultiplier={1.1}
          allowFontScaling={false}
        >
          Pura
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgInk, // #05070B — the cold, fogged black mirror (frame 0)
  },
  layer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cap: {
    backgroundColor: palette.bg, // #FCFDFF — identical to Home's canvas
  },
  wordmarkWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: 'InstrumentSerif-SemiBold',
    color: palette.ink, // #080A0F
    textAlign: 'center',
  },
});

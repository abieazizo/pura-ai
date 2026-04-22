import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export interface SplashScreenProps {
  /**
   * Called once — when the arrival animation has reached its minimum hold AND
   * the caller has signaled system-readiness. The outer splash gate in App.tsx
   * unmounts this component when it fires.
   */
  onReady: () => void;
  /**
   * Whether hydration + fonts have landed. Passed from App.tsx. While false,
   * the intro holds on the settled frame (pulse continues, but the exit
   * animation is deferred). Defaults true so callers that don't wire it
   * still get a timed dismiss.
   */
  systemReady?: boolean;
}

/**
 * AppIntro — v9 raster-drop arrival sequence.
 *
 * Plays on every app open (cold or warm). Three phases:
 *
 *   1. ARRIVE (0–520ms)
 *      The drop materializes from opacity 0, scale 0.72 → 1.0, out-cubic.
 *      A radial glow fades in behind it. Bottom-of-screen PURA wordmark
 *      stays hidden.
 *
 *   2. SETTLE (520ms → MIN_HOLD 1300ms, then waits for systemReady)
 *      Drop breathes subtly (scale 1.0 ↔ 1.025 @ 3.4s period).
 *      Glow pulses (opacity 0.4 ↔ 0.55 @ 2.2s period).
 *      PURA wordmark fades in (400ms) at t=740ms.
 *      This phase holds indefinitely until (min-hold elapsed AND
 *      systemReady === true).
 *
 *   3. DEPART (up to 560ms)
 *      Drop opacity 1→0, scale 1.0→1.06. Wordmark opacity 1→0.
 *      Background gradient stays rendered so the handoff to the app is a
 *      flat dissolve, not a bright flash.
 *      At end: onReady() fires; App.tsx unmounts this component.
 *
 * Reduce Motion: skips breath, pulse, scale — plays a flat fade-in (380ms)
 * + wordmark (200ms) + fade-out (300ms). Total ~900ms (+ readiness wait).
 */

const ASSET = require('../../../assets/brand/pura-drop.png');

const MIN_HOLD_MS = 1300;
const MIN_HOLD_MS_REDUCED = 600;

export function SplashScreen({ onReady, systemReady = true }: SplashScreenProps) {
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();

  const [phase, setPhase] = useState<'arrive' | 'settle' | 'depart' | 'done'>(
    'arrive'
  );
  const holdElapsedAtRef = useRef<number>(Date.now());
  const firedRef = useRef(false);

  // Drop
  const dropOpacity = useSharedValue(0);
  const dropScale = useSharedValue(0.72);
  const dropBreath = useSharedValue(0);

  // Glow
  const glowOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(0);

  // Wordmark
  const wordmarkOpacity = useSharedValue(0);

  // Arrival sequence.
  useEffect(() => {
    if (reduceMotion) {
      dropOpacity.value = withTiming(1, {
        duration: 380,
        easing: Easing.out(Easing.cubic),
      });
      dropScale.value = 1;
      glowOpacity.value = withTiming(0.3, { duration: 380 });
      wordmarkOpacity.value = withDelay(
        300,
        withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })
      );
      const t = setTimeout(() => setPhase('settle'), 380);
      holdElapsedAtRef.current = Date.now() + MIN_HOLD_MS_REDUCED;
      return () => clearTimeout(t);
    }

    // Full cinematic arrival.
    dropOpacity.value = withTiming(1, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });
    dropScale.value = withTiming(1, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });
    glowOpacity.value = withDelay(
      80,
      withTiming(0.42, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    );
    wordmarkOpacity.value = withDelay(
      740,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );

    const settleTimer = setTimeout(() => {
      setPhase('settle');
      // Start breathing + pulse loops once the arrival settles.
      dropBreath.value = withRepeat(
        withTiming(1, {
          duration: 3400,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true
      );
      glowPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    }, 520);

    holdElapsedAtRef.current = Date.now() + MIN_HOLD_MS;

    return () => clearTimeout(settleTimer);
  }, [
    reduceMotion,
    dropOpacity,
    dropScale,
    dropBreath,
    glowOpacity,
    glowPulse,
    wordmarkOpacity,
  ]);

  // Depart — fires when settle is done AND systemReady.
  useEffect(() => {
    if (phase !== 'settle') return;
    if (!systemReady) return;

    const remaining = Math.max(0, holdElapsedAtRef.current - Date.now());
    const t = setTimeout(() => {
      setPhase('depart');

      if (reduceMotion) {
        dropOpacity.value = withTiming(
          0,
          { duration: 300, easing: Easing.in(Easing.cubic) },
          (done) => {
            if (done && !firedRef.current) {
              firedRef.current = true;
              runOnJS(onReady)();
            }
          }
        );
        wordmarkOpacity.value = withTiming(0, { duration: 200 });
        glowOpacity.value = withTiming(0, { duration: 300 });
        return;
      }

      dropOpacity.value = withTiming(0, {
        duration: 560,
        easing: Easing.in(Easing.cubic),
      });
      dropScale.value = withTiming(
        1.06,
        { duration: 560, easing: Easing.out(Easing.cubic) },
        (done) => {
          if (done && !firedRef.current) {
            firedRef.current = true;
            runOnJS(onReady)();
          }
        }
      );
      wordmarkOpacity.value = withTiming(0, {
        duration: 320,
        easing: Easing.in(Easing.cubic),
      });
      glowOpacity.value = withTiming(0, {
        duration: 560,
        easing: Easing.in(Easing.cubic),
      });
    }, remaining);

    return () => clearTimeout(t);
  }, [
    phase,
    systemReady,
    reduceMotion,
    dropOpacity,
    dropScale,
    wordmarkOpacity,
    glowOpacity,
    onReady,
  ]);

  // The composite drop transform: arrival scale + gentle breath (1 ↔ 1.025).
  const dropStyle = useAnimatedStyle(() => ({
    opacity: dropOpacity.value,
    transform: [
      { scale: dropScale.value * (1 + dropBreath.value * 0.025) },
    ],
  }));

  // The glow disc: arrival fade + pulsing during settle.
  const glowStyle = useAnimatedStyle(() => ({
    opacity:
      glowOpacity.value * (1 + glowPulse.value * 0.32),
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
  }));

  // Drop size — 42% of the shorter window edge, clamped to [120, 220].
  const dropSize = Math.max(120, Math.min(220, Math.min(width, height) * 0.42));
  const glowSize = dropSize * 2.1;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Background — cool paper with a subtle top-down tint so the drop
          sits in air, not on a flat block of pixels. */}
      <LinearGradient
        colors={[palette.bg, palette.bgDeep, palette.bg]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          {/* Glow — radial azure fill, soft edges via large border-radius. */}
          <Animated.View
            style={[
              styles.glow,
              {
                width: glowSize,
                height: glowSize,
                borderRadius: glowSize / 2,
              },
              glowStyle,
            ]}
            pointerEvents="none"
          />

          {/* Drop — the actual brand asset. */}
          <Animated.View style={[styles.dropWrap, dropStyle]}>
            <Image
              source={ASSET}
              style={{ width: dropSize, height: dropSize }}
              contentFit="contain"
              transition={0}
            />
          </Animated.View>

          {/* PURA wordmark — fades in during settle, out during depart. */}
          <Animated.View style={[styles.wordmarkWrap, wordmarkStyle]}>
            <Text style={styles.wordmark} maxFontSizeMultiplier={1.1}>
              PURA
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  safe: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: palette.clay,
    // Very low alpha; the animated style layers more opacity on top.
    opacity: 0.08,
  },
  dropWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkWrap: {
    position: 'absolute',
    bottom: '18%',
  },
  wordmark: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 4,
    color: palette.ink,
  },
});

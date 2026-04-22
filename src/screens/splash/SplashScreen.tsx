import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient as SvgRadialGradient, Stop } from 'react-native-svg';
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
import * as Haptics from 'expo-haptics';
import { palette } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

/**
 * AppIntro — v9.1 cinematic water-drop arrival.
 *
 * Physics, not decoration. The drop falls from above, lands at center,
 * impacts with a subtle squash, sends out two concentric ripples, and
 * settles into a gentle breath while the "Pura AI" wordmark fades in.
 * When backing systems are ready it fades out.
 *
 * Timeline (full-motion path):
 *   0     t  : drop starts offscreen above, opacity 0, scale 1.15
 *   0..600ms : FALL — translateY animates from −120 to 0 with an ease-in
 *              cubic (gravity), opacity 0→1 over the first 280ms
 *   600ms    : IMPACT — haptic medium. Squash: scaleX 1→1.06→1,
 *              scaleY 1→0.94→1, 240ms total
 *   720ms    : RIPPLE 1 begins (scale 0.2→3, opacity 0.55→0, 1400ms)
 *   900ms    : RIPPLE 2 begins (staggered)
 *   1000ms   : wordmark "Pura AI" fades in over 420ms
 *   1400ms+  : SETTLE — infinite breath at 1.0↔1.018, 3.8s period.
 *              Holds until (min-hold AND systemReady).
 *   depart   : opacity 1→0, scale 1→1.06 over 520ms → onReady()
 *
 * Reduce Motion: no fall, no squash, no ripple, no breath. Fade-in (300ms)
 * → wordmark fade-in (220ms) → hold → fade-out (260ms).
 */

export interface SplashScreenProps {
  onReady: () => void;
  systemReady?: boolean;
}

const ASSET = require('../../../assets/brand/pura-drop.png');

const MIN_HOLD_MS_FULL = 1900;
const MIN_HOLD_MS_REDUCED = 900;

export function SplashScreen({ onReady, systemReady = true }: SplashScreenProps) {
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();

  const [phase, setPhase] = useState<'fall' | 'settle' | 'depart'>('fall');
  const holdElapsedAtRef = useRef<number>(Date.now());
  const firedRef = useRef(false);

  // Drop
  const dropOpacity = useSharedValue(0);
  const dropTranslateY = useSharedValue(-120);
  const dropScale = useSharedValue(1.12);
  const dropSquashX = useSharedValue(0); // 0 = no squash, 1 = peak squash
  const dropSquashY = useSharedValue(0);
  const dropBreath = useSharedValue(0);

  // Ripples
  const ripple1 = useSharedValue(0); // progress 0..1
  const ripple2 = useSharedValue(0);

  // Glow
  const glowOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(0);

  // Wordmark
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkTranslateY = useSharedValue(8);

  // Kick off the arrival sequence.
  useEffect(() => {
    if (reduceMotion) {
      // Reduce-motion path: flat fade + wordmark, no physics.
      dropTranslateY.value = 0;
      dropScale.value = 1;
      dropOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      glowOpacity.value = withTiming(0.3, { duration: 300 });
      wordmarkOpacity.value = withDelay(
        220,
        withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) })
      );
      wordmarkTranslateY.value = withDelay(
        220,
        withTiming(0, { duration: 220 })
      );

      const t = setTimeout(() => setPhase('settle'), 300);
      holdElapsedAtRef.current = Date.now() + MIN_HOLD_MS_REDUCED;
      return () => clearTimeout(t);
    }

    // ——— Full cinematic path ———

    // FALL — offscreen above → 0, opacity 0 → 1
    dropTranslateY.value = withTiming(0, {
      duration: 600,
      easing: Easing.bezier(0.32, 0, 0.67, 0.94), // gravity-like ease-in
    });
    dropScale.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    dropOpacity.value = withTiming(1, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });

    // IMPACT at 600ms — squash then restore
    const impactTimer = setTimeout(() => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}

      dropSquashX.value = withSequence(
        withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) })
      );
      dropSquashY.value = withSequence(
        withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) })
      );
    }, 600);

    // RIPPLE 1 at 720ms
    const r1Timer = setTimeout(() => {
      ripple1.value = withTiming(1, {
        duration: 1400,
        easing: Easing.out(Easing.cubic),
      });
    }, 720);

    // RIPPLE 2 at 900ms
    const r2Timer = setTimeout(() => {
      ripple2.value = withTiming(1, {
        duration: 1400,
        easing: Easing.out(Easing.cubic),
      });
    }, 900);

    // Glow — fade in with the drop, pulse during settle
    glowOpacity.value = withDelay(
      120,
      withTiming(0.44, {
        duration: 560,
        easing: Easing.out(Easing.cubic),
      })
    );

    // Wordmark — fade in + slight rise after settle begins
    wordmarkOpacity.value = withDelay(
      1000,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
    );
    wordmarkTranslateY.value = withDelay(
      1000,
      withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) })
    );

    // Settle phase begins at 1400ms
    const settleTimer = setTimeout(() => {
      setPhase('settle');
      // Gentle breath on the drop
      dropBreath.value = withRepeat(
        withTiming(1, {
          duration: 3800,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true
      );
      // Glow pulses
      glowPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    }, 1400);

    holdElapsedAtRef.current = Date.now() + MIN_HOLD_MS_FULL;

    return () => {
      clearTimeout(impactTimer);
      clearTimeout(r1Timer);
      clearTimeout(r2Timer);
      clearTimeout(settleTimer);
    };
  }, [
    reduceMotion,
    dropOpacity,
    dropTranslateY,
    dropScale,
    dropSquashX,
    dropSquashY,
    dropBreath,
    ripple1,
    ripple2,
    glowOpacity,
    glowPulse,
    wordmarkOpacity,
    wordmarkTranslateY,
  ]);

  // Depart — fires when settle has played its minimum AND systemReady is true.
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
        dropOpacity.value = withTiming(
          0,
          { duration: 260, easing: Easing.in(Easing.cubic) },
          (done) => done && runOnJS(fire)()
        );
        wordmarkOpacity.value = withTiming(0, { duration: 200 });
        glowOpacity.value = withTiming(0, { duration: 260 });
        return;
      }

      dropOpacity.value = withTiming(0, {
        duration: 520,
        easing: Easing.in(Easing.cubic),
      });
      dropScale.value = withTiming(
        1.06,
        { duration: 520, easing: Easing.out(Easing.cubic) },
        (done) => done && runOnJS(fire)()
      );
      wordmarkOpacity.value = withTiming(0, {
        duration: 280,
        easing: Easing.in(Easing.cubic),
      });
      glowOpacity.value = withTiming(0, {
        duration: 520,
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

  // Compose drop transform: translateY (fall) + scale (arrival) * breath * squash
  const dropStyle = useAnimatedStyle(() => {
    const breathScale = 1 + dropBreath.value * 0.018;
    // squash: peak sX = 1.06, peak sY = 0.94 at squash=1
    const squashX = 1 + dropSquashX.value * 0.06;
    const squashY = 1 - dropSquashY.value * 0.06;
    return {
      opacity: dropOpacity.value,
      transform: [
        { translateY: dropTranslateY.value },
        { scale: dropScale.value * breathScale },
        { scaleX: squashX },
        { scaleY: squashY },
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * (1 + glowPulse.value * 0.34),
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkTranslateY.value }],
  }));

  // Ripple size — scales 0.2 → 3.0 in SVG from center
  const ripple1Style = useAnimatedStyle(() => ({
    opacity: (1 - ripple1.value) * 0.55,
    transform: [{ scale: 0.2 + ripple1.value * 2.8 }],
  }));
  const ripple2Style = useAnimatedStyle(() => ({
    opacity: (1 - ripple2.value) * 0.42,
    transform: [{ scale: 0.2 + ripple2.value * 2.8 }],
  }));

  // Drop size — 58% of shorter window edge, clamped. Bigger than v9 (was 42%).
  const dropSize = Math.max(180, Math.min(300, Math.min(width, height) * 0.58));
  const glowSize = dropSize * 2.3;
  const rippleSize = dropSize * 0.55;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Soft radial-ish bg — cool paper with a slight bright center */}
      <LinearGradient
        colors={[palette.bg, '#F2F6FB', palette.bg]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          {/* Radial glow disc — azure, largest and behind everything */}
          <Animated.View
            style={[
              styles.glowDisc,
              {
                width: glowSize,
                height: glowSize,
                borderRadius: glowSize / 2,
              },
              glowStyle,
            ]}
            pointerEvents="none"
          >
            <Svg width="100%" height="100%" viewBox="0 0 100 100">
              <Defs>
                <SvgRadialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
                  <Stop offset="0" stopColor={palette.clay} stopOpacity={0.55} />
                  <Stop offset="0.55" stopColor={palette.clay} stopOpacity={0.18} />
                  <Stop offset="1" stopColor={palette.clay} stopOpacity={0} />
                </SvgRadialGradient>
              </Defs>
              <Circle cx="50" cy="50" r="50" fill="url(#glow)" />
            </Svg>
          </Animated.View>

          {/* Ripple 1 — behind the drop, centered on the drop's impact point */}
          <Animated.View
            style={[
              styles.ripple,
              {
                width: rippleSize,
                height: rippleSize,
                borderRadius: rippleSize / 2,
              },
              ripple1Style,
            ]}
            pointerEvents="none"
          />
          <Animated.View
            style={[
              styles.ripple,
              {
                width: rippleSize,
                height: rippleSize,
                borderRadius: rippleSize / 2,
              },
              ripple2Style,
            ]}
            pointerEvents="none"
          />

          {/* Drop — the brand asset, falls in + impacts + breathes */}
          <Animated.View style={[styles.dropWrap, dropStyle]}>
            <Image
              source={ASSET}
              style={{ width: dropSize, height: dropSize }}
              contentFit="contain"
              transition={0}
            />
          </Animated.View>

          {/* "Pura AI" wordmark — fades in after the ripples */}
          <Animated.View style={[styles.wordmarkWrap, wordmarkStyle]}>
            <Text style={styles.wordmark} maxFontSizeMultiplier={1.1}>
              Pura AI
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
  glowDisc: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    borderWidth: 1.25,
    borderColor: palette.clay,
    // iOS / Android both respect this as a thin azure ring
    ...Platform.select({
      ios: {},
      android: {},
    }),
  },
  dropWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkWrap: {
    position: 'absolute',
    bottom: '16%',
  },
  wordmark: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 28,
    letterSpacing: -0.4,
    color: palette.ink,
  },
});

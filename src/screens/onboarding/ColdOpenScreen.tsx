/**
 * ColdOpenScreen — Screen 1 of onboarding. The first thing a user ever sees.
 *
 * The whole screen is an "awakening": a point of light is born, blooms into a
 * living aurora orb (see AuroraOrb), gains a face, and blinks at the user while
 * the hero line focuses into existence word by word. The emotional thesis,
 * delivered through motion: the user has a face — and now Pura has one too, and
 * it just blinked at them.
 *
 * Three launch variants:
 *   • first   — full awakening (held breath → seed → bloom → face → text …)
 *   • repeat  — pre-onboarding return: a short ~600ms fully-formed cross-fade
 *   • reduce  — Reduce Motion: a static, complete, beautiful cross-fade
 *
 * The orb is a standalone, size-driven component so it can persist as a shared
 * element into Screen 2 (the exit already shrinks & repositions it to prove
 * the transition works). The button is tappable the moment it appears and
 * gracefully interrupts the sequence — the user is never trapped waiting.
 *
 * All color literals come from the `auroraOrb` token namespace.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  interpolateColor,
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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuroraOrb } from '@/components/AuroraOrb';
import { auroraOrb as C, dsAmbient, dsGradient, ds, dsRadius } from '@/theme';
import { hapt } from '@/utils/haptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { ORB_SIZES, targetFor } from './orb/orbLayout';

const SEEN_KEY = '@pura/coldOpenSeen';

// The hero stacks as an editorial masthead: three dramatic display-scale lines,
// each its own baseline. "knows." carries the living glow. Cinematic, not a
// centered caption.
const HERO_LINES = [['Your', 'face'], ['already'], ['knows.']] as const;
const HERO_WORDS = HERO_LINES.flat() as readonly string[];

export type ColdOpenVariant = 'first' | 'repeat' | 'reduce';

export interface ColdOpenScreenProps {
  /** Advance to Screen 2. Called after the exit transition (orb has shrunk). */
  onContinue?: () => void;
  /** Returning user tapped "Sign in". */
  onSignIn?: () => void;
  /** Dev override so all three variants are testable without clearing storage. */
  forceVariant?: ColdOpenVariant;
}

export function ColdOpenScreen({ onContinue, onSignIn, forceVariant }: ColdOpenScreenProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { width, height } = Dimensions.get('window');

  // The orb is now the luminous MASTHEAD — a jewel that crowns the editorial
  // headline rather than dominating center. The dramatic display serif is the
  // hero; the orb is its living signature above the masthead rule.
  const orbSize = Math.min(Math.round(width * 0.42), 176);

  // 'boot' (deciding) → 'held' (the 400ms inhale, first-launch only) → 'run'.
  const [phase, setPhase] = useState<'boot' | 'held' | 'run'>('boot');
  const [variant, setVariant] = useState<ColdOpenVariant | null>(forceVariant ?? null);
  const [buttonReady, setButtonReady] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const exiting = useRef(false);

  // ---- Decide the variant (reduce-motion > first-launch flag) -------------
  useEffect(() => {
    let cancelled = false;
    const decide = async () => {
      let seen = false;
      try {
        seen = (await AsyncStorage.getItem(SEEN_KEY)) === '1';
      } catch {
        // storage unavailable → treat as a fresh, full awakening
      }
      if (cancelled) return;
      const v: ColdOpenVariant = forceVariant ?? (reduceMotion ? 'reduce' : seen ? 'repeat' : 'first');
      setVariant(v);
      AsyncStorage.setItem(SEEN_KEY, '1').catch(() => {});
      if (v === 'first') {
        setPhase('held');
        const t = setTimeout(() => !cancelled && setPhase('run'), 400);
        timers.current.push(t);
      } else {
        setPhase('run');
      }
    };
    decide();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Timeline shared values ---------------------------------------------
  const bgN = useSharedValue(forceVariant === 'first' || (!forceVariant && !reduceMotion) ? 0 : 1);
  const w0 = useSharedValue(0);
  const w1 = useSharedValue(0);
  const w2 = useSharedValue(0);
  const w3 = useSharedValue(0);
  const words = [w0, w1, w2, w3];
  const knowsN = useSharedValue(0); // "knows" glow
  const sublineN = useSharedValue(0);
  const buttonN = useSharedValue(0); // rise + opacity
  const quietN = useSharedValue(0); // sign-in + trust whisper
  const shadowBreath = useSharedValue(0); // button breathing shadow
  const shimmer = useSharedValue(-1); // label shimmer sweep position (-1..1)

  // Exit
  const pressN = useSharedValue(1); // button compress
  const exitContent = useSharedValue(0); // content lift+fade
  const exitOrb = useSharedValue(0); // orb persist/shrink/reposition

  // ---- The seam: the orb's exit flight ends EXACTLY where the interview
  // seats its persistent orb (the shared question target), so the cross-route
  // cross-fade swaps two perfectly superimposed orbs — one continuous
  // companion, no lateral jump. The masthead orb's resting center comes from
  // flex layout, so it is MEASURED (not derived) and the deltas live in
  // shared values the exit transform reads on the UI thread.
  const seamTarget = targetFor('question', width, height, insets.top);
  // Pre-measure fallback = the analytic masthead seat (cluster padding 28 −
  // orbMast marginLeft 6 + half the orb). measureInWindow refines it.
  const exitDx = useSharedValue(seamTarget.cx - (22 + orbSize / 2));
  const exitDy = useSharedValue(-height * 0.16);
  const orbMastRef = useRef<View>(null);
  const measureOrb = useCallback(() => {
    orbMastRef.current?.measureInWindow?.((x, y, w, h) => {
      if (typeof x !== 'number' || Number.isNaN(x) || w <= 0) return;
      exitDx.value = seamTarget.cx - (x + w / 2);
      exitDy.value = seamTarget.cy - (y + h / 2);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seamTarget.cx, seamTarget.cy]);

  // ---- Text-plane parallax (3px). Orb owns its own 8px/5px planes. --------
  const sensor = useAnimatedSensor(SensorType.ROTATION, { interval: 'auto' });
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const parallaxOn = !reduceMotion && Platform.OS !== 'web';
  useAnimatedReaction(
    () => (parallaxOn ? sensor.sensor.value : null),
    (cur) => {
      if (!cur) return;
      const clamp = (v: number) => Math.max(-0.5, Math.min(0.5, v));
      tiltX.value = clamp(cur.roll ?? 0) / 0.5;
      tiltY.value = clamp((cur.pitch ?? 0) - 0.25) / 0.5;
    },
  );
  const lagX = useDerivedValue(() => withSpring(tiltX.value, { damping: 25, stiffness: 70 }));
  const lagY = useDerivedValue(() => withSpring(tiltY.value, { damping: 25, stiffness: 70 }));

  // ---- Per-variant focus-word config --------------------------------------
  const wordCfg = useMemo(() => {
    if (variant === 'first') {
      return { dy: 14, scaleFrom: 0.97, delays: [1200, 1320, 1440, 1560], dur: 500 };
    }
    // repeat / reduce → pure cross-fade together
    return { dy: 0, scaleFrom: 1, delays: [0, 0, 0, 0], dur: 600 };
  }, [variant]);

  // ---- Fire the timeline once we enter 'run' ------------------------------
  useEffect(() => {
    if (phase !== 'run' || !variant) return;
    const first = variant === 'first';
    // Forcing the 'reduce' variant must render fully static even when the OS
    // Reduce-Motion flag is off (dev harness + correctness).
    const reduce = reduceMotion || variant === 'reduce';
    const ec = Easing.out(Easing.cubic);

    // Background: warm inhale → porcelain (first launch only; else already porcelain).
    bgN.value = withTiming(1, { duration: first ? 400 : 600, easing: Easing.out(Easing.quad) });

    // Hero words.
    words.forEach((wv, i) => {
      wv.value = withDelay(wordCfg.delays[i], withTiming(1, { duration: wordCfg.dur, easing: ec }));
    });

    // "knows" glow: bloom to 0.5, settle to 0.3, then drift 0.3↔0.4 forever.
    const settleGlow = () => {
      if (reduce) {
        knowsN.value = 0.3;
        return;
      }
      knowsN.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    };
    if (reduce) {
      knowsN.value = withTiming(0.3, { duration: 600 });
    } else {
      knowsN.value = withDelay(
        first ? 2000 : 200,
        withSequence(
          withTiming(0.5, { duration: 400, easing: ec }),
          withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        ),
      );
      const gt = setTimeout(settleGlow, (first ? 2000 : 200) + 1000);
      timers.current.push(gt);
    }

    // Subline.
    sublineN.value = withDelay(first ? 2100 : 120, withTiming(1, { duration: first ? 500 : 600, easing: ec }));

    // Button rise (no overshoot) + tappable the moment it appears.
    buttonN.value = withDelay(first ? 2600 : 200, withTiming(1, { duration: first ? 380 : 600, easing: ec }));
    const bt = setTimeout(() => setButtonReady(true), first ? 2600 : 220);
    timers.current.push(bt);

    // Quiet lines surface (no movement).
    quietN.value = withDelay(
      first ? 3800 : 320,
      withTiming(1, { duration: first ? 800 : 600, easing: Easing.inOut(Easing.quad) }),
    );

    // Living idle: button breathing shadow + a first shimmer 1.5s after settle.
    if (!reduce) {
      shadowBreath.value = withDelay(
        first ? 2700 : 300,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        ),
      );
      const shimmerDelay = (first ? 2600 : 300) + 1500;
      const st = setTimeout(() => {
        shimmer.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) }),
            withDelay(15000, withTiming(-1, { duration: 0 })),
          ),
          -1,
          false,
        );
      }, shimmerDelay);
      timers.current.push(st);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, variant]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      [bgN, w0, w1, w2, w3, knowsN, sublineN, buttonN, quietN, shadowBreath, shimmer, pressN, exitContent, exitOrb].forEach(
        cancelAnimation,
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ---- Exit transition -----------------------------------------------------
  const handleLetsLook = useCallback(() => {
    if (exiting.current) return;
    exiting.current = true;
    hapt.tap();
    AccessibilityInfo.announceForAccessibility?.('Opening Pura');

    // Reduce Motion: no flight, no lift — a brief complete fade, the orb
    // snaps to its interview seat (the seeded orb takes over in place), and
    // the advance fires at the fade's end instead of holding the user 720ms.
    if (reduceMotion || variant === 'reduce') {
      exitContent.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
      exitOrb.value = 1;
      const tr = setTimeout(() => {
        onContinue ? onContinue() : console.log('[ColdOpen] exit → Screen 2');
        if (!onContinue) {
          exiting.current = false;
          exitContent.value = 0;
          exitOrb.value = 0;
        }
      }, 260);
      timers.current.push(tr);
      return;
    }

    pressN.value = withSequence(
      withTiming(0.96, { duration: 100, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 14, stiffness: 320, mass: 1 }),
    );

    const t1 = setTimeout(() => {
      exitContent.value = withTiming(1, { duration: 350, easing: Easing.in(Easing.cubic) });
      exitOrb.value = withTiming(1, { duration: 500, easing: Easing.inOut(Easing.cubic) });
    }, 150);
    const t2 = setTimeout(() => {
      onContinue ? onContinue() : console.log('[ColdOpen] exit → Screen 2');
      // If no host advances us, reset so a dev preview can replay.
      if (!onContinue) {
        exiting.current = false;
        exitContent.value = 0;
        exitOrb.value = 0;
      }
    }, 720);
    timers.current.push(t1, t2);
  }, [onContinue, reduceMotion, variant]);

  // ---- Animated styles -----------------------------------------------------
  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(bgN.value, [0, 1], [C.heldBreathBg, C.porcelain]),
  }));

  // Ambient porcelain wash — blooms in only as the inhale resolves to the
  // settled ground (bgN 0→1), so the held-breath warm field stays pure. Adds
  // tasteful color-based depth where the flat porcelain read thin.
  const ambientStyle = useAnimatedStyle(() => ({ opacity: bgN.value }));

  const textPlane = useAnimatedStyle(() => ({
    transform: [{ translateX: lagX.value * 3 }, { translateY: lagY.value * 3 }],
  }));

  const contentExitStyle = useAnimatedStyle(() => ({
    opacity: 1 - exitContent.value,
    transform: [{ translateY: -20 * exitContent.value }],
  }));

  // Orb persists through the exit: flies (x AND y) from its measured masthead
  // seat to the interview's question target, shrinking to that beat's exact
  // size — so the interview's seeded orb is perfectly superimposed when the
  // 280ms cross-fade swaps the instances.
  const orbTargetScale = ORB_SIZES.question / orbSize;
  const orbExitStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: exitDx.value * exitOrb.value },
      { translateY: exitDy.value * exitOrb.value },
      { scale: interpolate(exitOrb.value, [0, 1], [1, orbTargetScale]) },
    ],
  }));

  const buttonRiseStyle = useAnimatedStyle(() => ({
    opacity: buttonN.value,
    transform: [
      { translateY: interpolate(buttonN.value, [0, 1], [variant === 'first' ? 24 : 12, 0]) },
      { scale: pressN.value },
    ],
  }));
  const shadowBreathStyle = useAnimatedStyle(() => ({
    opacity: buttonN.value * interpolate(shadowBreath.value, [0, 1], [0.55, 1]),
    transform: [{ scale: interpolate(shadowBreath.value, [0, 1], [0.99, 1.04]) }],
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [-1, -0.6, 0, 0.6, 1], [0, 0, 0.9, 0, 0], 'clamp'),
    transform: [{ translateX: shimmer.value * (width - 48) }],
  }));
  const sublineStyle = useAnimatedStyle(() => ({
    opacity: sublineN.value,
    transform: [{ translateY: interpolate(sublineN.value, [0, 1], [variant === 'first' ? 10 : 0, 0]) }],
  }));
  const quietStyle = useAnimatedStyle(() => ({ opacity: quietN.value }));

  const showContent = phase === 'run';

  return (
    <Animated.View style={[styles.root, bgStyle]}>
      {/* Ambient porcelain atmosphere — a vertical sky wash plus a soft veil
          grounding the CTA zone, so the field carries gradient depth instead
          of reading as flat paper. Sits beneath all content; fades in with
          the settle (never during the held-breath inhale). pointerEvents none. */}
      <Animated.View style={[StyleSheet.absoluteFill, ambientStyle]} pointerEvents="none">
        <LinearGradient
          colors={dsAmbient.day.sky}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={dsGradient.pageVeil}
          locations={[0, 0.6, 1]}
          start={{ x: 0.5, y: 0.45 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Editorial masthead: a luminous orb signature crowns a left-anchored
          display-scale serif headline. The TYPE is the hero — oversized,
          stacked, confident — with the orb as its living mark and a hairline
          masthead rule grounding the composition. */}
      <View style={[styles.cluster, { paddingTop: insets.top }]} pointerEvents="box-none">
        {showContent && (
          <Animated.View style={[styles.masthead, textPlane]} pointerEvents="box-none">
            {/* The orb persists through the exit (only orbExitStyle — shrinks +
                lifts toward Screen 2), proving the shared-element handoff; the
                copy below fades/lifts independently. */}
            <Animated.View
              ref={orbMastRef}
              onLayout={measureOrb}
              style={[styles.orbMast, orbExitStyle]}
              pointerEvents="none"
            >
              {/* Portrait-frame medallion behind the orb — the shared Cycle 12
                  imagery language (a rounded-portrait hairline frame, matching
                  the scan capture card), so even the first beat frames the
                  companion as a portrait subject. Travels with the orb through
                  the shared-element exit (it's inside orbExitStyle). */}
              <View
                style={[
                  styles.orbFrame,
                  {
                    width: Math.round(orbSize * 1.34),
                    height: Math.round(orbSize * 1.34 * 1.16),
                    left: Math.round((orbSize - orbSize * 1.34) / 2),
                    top: Math.round((orbSize - orbSize * 1.34 * 1.16) / 2),
                  },
                ]}
                pointerEvents="none"
              />
              <AuroraOrb
                size={orbSize}
                state={variant === 'first' ? 'awakening' : 'idle'}
                reduceMotion={reduceMotion || variant === 'reduce'}
                enableParallax={!(reduceMotion || variant === 'reduce')}
              />
            </Animated.View>

            <Animated.View style={contentExitStyle} pointerEvents="none">
              <Animated.Text style={[styles.kicker, sublineStyle]} maxFontSizeMultiplier={1.2}>
                MEET PURA
              </Animated.Text>

              <View style={styles.heroBlock}>
                {(() => {
                  let idx = -1;
                  return HERO_LINES.map((line, li) => (
                    <View key={`line-${li}`} style={styles.heroLine}>
                      {line.map((word) => {
                        idx += 1;
                        const i = idx;
                        return (
                          <FocusWord
                            key={word}
                            text={word}
                            value={words[i]}
                            dy={wordCfg.dy}
                            scaleFrom={wordCfg.scaleFrom}
                            glowValue={i === HERO_WORDS.length - 1 ? knowsN : undefined}
                          />
                        );
                      })}
                    </View>
                  ));
                })()}
              </View>

              <Animated.View style={[styles.mastRule, sublineStyle]} pointerEvents="none" />

              <Animated.Text style={[styles.subline, sublineStyle]} maxFontSizeMultiplier={1.2}>
                Pura reads what your skin needs — and builds the routine that fits.
              </Animated.Text>
            </Animated.View>
          </Animated.View>
        )}
      </View>

      {/* Bottom group: button, sign-in, trust whisper. */}
      {showContent && (
        <Animated.View
          style={[styles.bottom, { paddingBottom: insets.bottom + 14 }, contentExitStyle]}
          pointerEvents="box-none"
        >
          {/* Breathing shadow underlay (porcelain rect; only its drop shadow
              shows, and it breathes via opacity/scale — the button never moves). */}
          <Animated.View style={[styles.shadowHost, shadowBreathStyle]} pointerEvents="none" />

          <Animated.View style={[styles.buttonRise, buttonRiseStyle]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Let’s look"
              disabled={!buttonReady}
              onPress={handleLetsLook}
              style={styles.button}
            >
              <Text style={styles.buttonLabel} maxFontSizeMultiplier={1.2}>
                Let’s look.
              </Text>
              {/* Shimmer sweep. */}
              <Animated.View style={[styles.shimmerWrap, shimmerStyle]} pointerEvents="none">
                <LinearGradient
                  colors={[C.shimmerEdge, C.shimmerMid, C.shimmerEdge]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.shimmerFill}
                />
              </Animated.View>
            </Pressable>
          </Animated.View>

          <Animated.View style={quietStyle} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Already with Pura? Sign in"
              onPress={() => (onSignIn ? onSignIn() : console.log('[ColdOpen] sign in'))}
              hitSlop={10}
              style={styles.signInHit}
            >
              <Text style={styles.signIn} maxFontSizeMultiplier={1.2}>
                Already with Pura? <Text style={styles.signInStrong}>Sign in</Text>
              </Text>
            </Pressable>
            <Text style={styles.trust} maxFontSizeMultiplier={1.15}>
              No account needed · Photos never stored or shared.
            </Text>
          </Animated.View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ---- Hero focus word (+ optional "knows" glow) ----------------------------
function FocusWord({
  text,
  value,
  dy,
  scaleFrom,
  glowValue,
}: {
  text: string;
  value: SharedValue<number>;
  dy: number;
  scaleFrom: number;
  glowValue?: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(value.value, [0, 1], [0, 1], 'clamp'),
    transform: [
      { translateY: interpolate(value.value, [0, 1], [dy, 0]) },
      { scale: interpolate(value.value, [0, 1], [scaleFrom, 1]) },
    ],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowValue ? glowValue.value : 0 }));

  return (
    <Animated.View style={[styles.wordWrap, style]}>
      {glowValue && (
        <Animated.Text style={[styles.heroWord, styles.heroGlow, glowStyle]} maxFontSizeMultiplier={1.15}>
          {text}
        </Animated.Text>
      )}
      <Text style={styles.heroWord} maxFontSizeMultiplier={1.15}>
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.porcelain },
  // Editorial poster: the masthead is pinned to a strong left baseline grid and
  // sits in the upper two-thirds, leaving dramatic whitespace above the CTA.
  cluster: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  masthead: { alignItems: 'flex-start' },
  // The orb crowns the headline as a luminous signature, nudged left so it
  // reads as a mark on the masthead rather than a centered centerpiece.
  orbMast: { alignItems: 'flex-start', marginLeft: -6, marginBottom: 18 },
  // Portrait-frame medallion behind the orb mark (Cycle 12 shared imagery
  // language) — a soft rounded-portrait hairline frame + faint bloom.
  orbFrame: {
    position: 'absolute',
    borderRadius: dsRadius.xxl,
    borderWidth: 1,
    borderColor: ds.hairline,
    backgroundColor: dsAmbient.day.glow,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 3.4,
    color: C.signIn,
    marginBottom: 14,
  },
  heroBlock: { alignSelf: 'stretch' },
  heroLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  wordWrap: { marginRight: 12 },
  // Dramatic display-scale serif — the cinematic hero. Tight leading stacks the
  // lines into a single confident block. Sized so "Your face" holds one line on
  // a standard width; on the narrowest devices flex-wrap stacks it gracefully.
  heroWord: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 70,
    lineHeight: 67,
    letterSpacing: -2.4,
    color: C.heroInk,
    textAlign: 'left',
  },
  heroGlow: {
    position: 'absolute',
    color: C.knowsGlow,
    textShadowColor: C.knowsGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 26,
  },
  // Hairline masthead rule — the editorial signature that separates the display
  // headline from the supporting line.
  mastRule: {
    height: 2,
    width: 64,
    borderRadius: 1,
    backgroundColor: C.heroInk,
    opacity: 0,
    marginTop: 26,
    marginBottom: 18,
  },
  subline: {
    fontFamily: 'Inter-Regular',
    fontSize: 17,
    lineHeight: 26,
    letterSpacing: -0.1,
    color: C.subInk,
    textAlign: 'left',
    maxWidth: 320,
    opacity: 0,
  },
  bottom: { paddingHorizontal: 28, alignItems: 'stretch' },
  shadowHost: {
    position: 'absolute',
    left: 28,
    right: 28,
    top: 0,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.porcelain,
    shadowColor: C.buttonShadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonRise: { alignSelf: 'stretch' },
  button: {
    height: 58,
    alignSelf: 'stretch',
    borderRadius: 29,
    backgroundColor: C.buttonInk,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    letterSpacing: -0.2,
    color: C.buttonLabel,
  },
  shimmerWrap: { position: 'absolute', top: 0, bottom: 0, width: 120 },
  shimmerFill: { flex: 1 },
  signInHit: { alignItems: 'center', marginTop: 20 },
  signIn: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    letterSpacing: -0.1,
    color: C.signIn,
    textAlign: 'center',
  },
  signInStrong: { fontFamily: 'Inter-SemiBold', color: C.signIn },
  trust: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.2,
    color: C.trust,
    textAlign: 'center',
    marginTop: 12,
  },
});

export default ColdOpenScreen;

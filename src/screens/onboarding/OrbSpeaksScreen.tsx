/**
 * Screen 2 — "the orb introduces itself" (OrbSpeaksScreen).
 *
 * The orb arrives from Screen 1 as the SAME element (the interview's OrbProvider
 * seeds it at Screen 1's exit spot), settles at ~22%, then SPEAKS:
 *
 *   T≈0     orb settles (spring)
 *   +700    looks DOWN toward the words, brows soften warm
 *   +800    line 1 writes word-by-word: "First, let me get to know you."
 *   +1460   leans in on "you" (emphasisPulse — brightness +8% + scale)
 *   +1700   looks FORWARD (addresses the user)
 *   +1900   the promise fades in: "Then I'll read your skin." + atmospheric shimmer
 *   +2000   the reply CTA rises (tappable instantly)
 *
 * No progress chrome, no skip — this is the emotional intro. Reduce-motion:
 * orb static, both lines + CTA cross-fade together; the conceit carries on the
 * first-person copy + spatial composition.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useOrb } from './orb/OrbHost';
import { OrbSpeech } from './orb/OrbSpeech';
import { OrbButton } from './orb/OrbButton';
import { useStepTransition } from './orb/useStepTransition';
import { orbBottom, targetFor } from './orb/orbLayout';

const LINE1 = 'First, let me get to know you.';
const LINE2 = "Then I'll read your skin.";
const WORD_STAGGER = 110;
const LINE1_DELAY = 800; // after settle
const EMPHASIS_WORD_INDEX = 6; // "you."

export interface OrbSpeaksScreenProps {
  onAdvance: () => void;
}

export function OrbSpeaksScreen({ onAdvance }: OrbSpeaksScreenProps) {
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const orb = useOrb();
  const { style: exitStyle, runExit } = useStepTransition(reduceMotion, { enter: false });

  const target = targetFor('speaks', width, height, insets.top);
  const lineTop = orbBottom(target) + 28;

  const [speak1, setSpeak1] = useState(reduceMotion);
  const [line2, setLine2] = useState(reduceMotion);
  const [cta, setCta] = useState(reduceMotion);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Line 2 + CTA appearance springs.
  const line2A = useSharedValue(reduceMotion ? 1 : 0);
  const ctaA = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    // The orb arrives as the same element and settles at ~22%.
    orb.show();
    orb.moveTo(target);
    orb.setGaze('forward');

    if (reduceMotion) {
      orb.setExpression('warm');
      line2A.value = withTiming(1, { duration: 600 });
      ctaA.value = withTiming(1, { duration: 600 });
      AccessibilityInfo.announceForAccessibility?.(`${LINE1} ${LINE2}`);
      return;
    }

    const push = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timers.current.push(t);
    };

    // +700 — look down toward the words, brows soften warm.
    push(() => {
      orb.setGaze('down');
      orb.setExpression('warm');
    }, 700);
    // +800 — line 1 begins writing word-by-word.
    push(() => {
      setSpeak1(true);
      AccessibilityInfo.announceForAccessibility?.(LINE1);
    }, LINE1_DELAY);
    // +1460 — lean in on "you".
    push(() => orb.emphasisPulse(), LINE1_DELAY + EMPHASIS_WORD_INDEX * WORD_STAGGER);
    // +1700 — return gaze forward (address the user).
    push(() => orb.setGaze('forward'), 1700);
    // +1900 — the promise + atmospheric shimmer.
    push(() => {
      setLine2(true);
      line2A.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
      orb.shimmer();
      AccessibilityInfo.announceForAccessibility?.(LINE2);
    }, 1900);
    // +2000 — the reply rises (tappable instantly once mounted).
    push(() => {
      setCta(true);
      ctaA.value = withSpring(1, { mass: 1, stiffness: 150, damping: 18 });
    }, 2000);

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const line2Style = useAnimatedStyle(() => ({
    opacity: line2A.value,
    transform: [{ translateY: (1 - line2A.value) * 10 }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaA.value,
    transform: [{ translateY: (1 - ctaA.value) * 24 }],
  }));

  const handleAdvance = () => {
    // Content lifts away; the orb persists and flows to the name beat.
    runExit(onAdvance);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <Animated.View style={[StyleSheet.absoluteFill, exitStyle]} pointerEvents="box-none">
        {/* Spoken lines — tied just below the orb so its gaze connects to them. */}
        <View style={[styles.lines, { top: lineTop }]} pointerEvents="none">
          {speak1 && (
            <OrbSpeech
              text={LINE1}
              reduceMotion={reduceMotion}
              textStyle={styles.line1}
              accessibilityRole="header"
              wordStagger={WORD_STAGGER}
              wordDuration={450}
            />
          )}
          {line2 && (
            <Animated.Text
              style={[styles.line2, line2Style]}
              maxFontSizeMultiplier={1.2}
            >
              {LINE2}
            </Animated.Text>
          )}
        </View>

        {/* The user's reply. */}
        {cta && (
          <Animated.View style={[styles.ctaWrap, ctaStyle, { paddingBottom: insets.bottom + 24 }]}>
            <OrbButton
              label="Okay, get to know me."
              onPress={handleAdvance}
              reduceMotion={reduceMotion}
            />
          </Animated.View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  lines: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  line1: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: palette.ink,
    textAlign: 'center',
  },
  line2: {
    fontFamily: 'InstrumentSerif-Regular',
    fontStyle: 'italic',
    fontSize: 17,
    lineHeight: 24,
    color: palette.inkSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});

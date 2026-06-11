/**
 * SynthesisBeat — the short "putting this together for you" moment between the
 * last question and the camera permission. No chrome, no CTA, no question: the
 * orb grows back to presence size, warms fully, shimmers once, and speaks a
 * single line — then the flow advances on its own. The beat exists so the scan
 * feels PREPARED FOR (the orb did something with the answers), not queued.
 *
 * Kept deliberately brief (~2s; shorter under reduce-motion) — it's a breath,
 * not a loading screen.
 */

import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useOrb } from './orb/OrbHost';
import { OrbSpeech } from './orb/OrbSpeech';
import { orbBottom, targetFor } from './orb/orbLayout';
import { useOnboardingTheme } from './orb/onboardingTheme';

const LINE = 'Putting this together for you.';
const HOLD_MS = 2050; // line ≈ 5 words · 110ms + settle — then advance
const HOLD_REDUCED_MS = 1300;

export interface SynthesisBeatProps {
  onDone: () => void;
}

export function SynthesisBeat({ onDone }: SynthesisBeatProps) {
  const reduceMotion = useReduceMotion();
  const { colors } = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const orb = useOrb();
  const doneRef = useRef(false);

  // The orb returns to its larger "presence" size — the statement beat — and
  // sits a touch higher than the questions so the line breathes.
  const target = targetFor('speaks', width, height, insets.top);
  const lineTop = orbBottom(target) + 20;

  useEffect(() => {
    orb.show();
    orb.moveTo(target);
    orb.setGaze('forward');
    orb.setExpression('warm');
    orb.setFamiliarity(1); // fully warmed — it knows them now
    if (!reduceMotion) orb.shimmer(); // the "working with it" sweep
    AccessibilityInfo.announceForAccessibility?.(LINE);

    const t = setTimeout(
      () => {
        if (doneRef.current) return;
        doneRef.current = true;
        onDone();
      },
      reduceMotion ? HOLD_REDUCED_MS : HOLD_MS,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.base }]}>
      <View style={[styles.lines, { top: lineTop }]} pointerEvents="none">
        <OrbSpeech
          text={LINE}
          reduceMotion={reduceMotion}
          textStyle={[styles.line, { color: colors.serif }]}
          wordStagger={95}
          wordDuration={320}
          maxWidth={width - 48}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  lines: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  line: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
});

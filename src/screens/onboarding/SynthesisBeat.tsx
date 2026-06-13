/**
 * SynthesisBeat — the hinge from "learning" to "looking": the one moment the
 * orb proves it heard the five answers and turns them toward the scan. The orb
 * grows back to presence size, BLOOMS to full warmth (held back through the
 * questions so this is a visible final lift, not a confirmation of a bar
 * already full), and names the user's GOAL back to them before "Now, the scan."
 *
 * The line is a function of the goal — the single beat that converts five
 * independent reactions into a companion who LISTENED. No fake precision (it
 * names the goal the user chose, nothing about the photo); no exclamation.
 *
 * Kept tight (~1.6s; shorter under reduce-motion) — a breath that does real
 * work, not a loading screen.
 */

import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useOrb } from './orb/OrbHost';
import { OrbSpeech } from './orb/OrbSpeech';
import { orbBottom, targetFor } from './orb/orbLayout';
import { useOnboardingTheme } from './orb/onboardingTheme';

// Goal → the orb's closing line. The first sentence names what they came for
// (proof it listened); the second is readiness. The "unsure" path leads
// honestly (no agenda — the orb reads what's there).
const SYNTHESIS_LINE: Record<string, string> = {
  calm: 'Redness first. I know what to look for.',
  clear: 'Breakouts first. I know where to look.',
  barrier: 'Dryness first. I know what to look for.',
  bright: 'Even tone first. I know what to look for.',
  unsure: 'No agenda — I’ll read what’s actually there.',
};
const SYNTHESIS_FALLBACK = 'I know what to look for.';

function synthesisLine(goalId: string | null | undefined): string {
  if (!goalId) return SYNTHESIS_FALLBACK;
  return SYNTHESIS_LINE[goalId] ?? SYNTHESIS_FALLBACK;
}

const HOLD_MS = 1700; // a touch longer — the line now carries two short sentences
const HOLD_REDUCED_MS = 1050;

export interface SynthesisBeatProps {
  onDone: () => void;
  /** The user's chosen goal id (calm/clear/barrier/bright/unsure) or null —
   *  names the closing line so the orb proves it heard them. */
  goalId?: string | null;
}

export function SynthesisBeat({ onDone, goalId }: SynthesisBeatProps) {
  const reduceMotion = useReduceMotion();
  const { colors } = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const orb = useOrb();
  const doneRef = useRef(false);

  const line = synthesisLine(goalId);

  // The orb returns to its larger "presence" size — the statement beat — and
  // sits a touch higher than the questions so the line breathes.
  const target = targetFor('speaks', width, height, insets.top);
  const lineTop = orbBottom(target) + 20;

  useEffect(() => {
    orb.show();
    orb.moveTo(target);
    orb.setGaze('forward'); // eye contact for the closing line
    orb.setExpression('warm');
    orb.setFamiliarity(1); // the final bloom — warmth was capped at ~0.85
    if (!reduceMotion) {
      orb.shimmer(); // the "working with it" sweep
      orb.bloomOnce({ peak: 1.12, ms: 1100 }); // a visible "it's ready" lift
    }
    AccessibilityInfo.announceForAccessibility?.(line);

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
          text={line}
          reduceMotion={reduceMotion}
          textStyle={[styles.line, { color: colors.serif }]}
          wordStagger={92}
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

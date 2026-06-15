/**
 * StepInstruction — ONE short, kind instruction line for the live ritual step.
 *
 * The brief is strict here: exactly ONE line. The caller chooses which source it
 * comes from (the plain `action` or the finding `throughline`) — this component
 * never shows both, never an AM/PM duplicate, never "calm and simple" filler. It
 * just renders the one chosen string, kindly, on the dark canvas.
 *
 * Motion (structural only — the MOTION role refines later): an optional
 * word-by-word reveal, each word starting 55ms after the last and fading over
 * 150ms, driven by ONE progress shared value on the UI thread — so Pause
 * genuinely freezes it mid-word and Resume continues over the remaining time.
 * Reduced motion shows the whole line at once. Either way the full text is ONE
 * accessible label, so VoiceOver reads the instruction as a single coherent
 * phrase (never word-by-word).
 *
 * Tokens only: type from `flowType`, color passed in from `ritualTone`.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { flowType } from '../type';

/** Per-word reveal cadence (ms between word starts) + each word's fade. */
const WORD_STAGGER_MS = 55;
const WORD_FADE_MS = 150;

export interface StepInstructionProps {
  /** The ONE chosen instruction line (action OR throughline — never both). */
  text: string;
  /** Ink/muted color for the line (from `ritualTone`). */
  color: string;
  reduceMotion: boolean;
  /** Pause freezes the reveal mid-word; resume continues over what's left. */
  paused: boolean;
}

export function StepInstruction({ text, color, reduceMotion, paused }: StepInstructionProps) {
  // Whole-text branch: reduce-motion, or a degenerate single token. One Text,
  // shown immediately — no per-word machinery, no transform to still.
  const words = text.trim().length ? text.trim().split(/\s+/) : [text];
  const wholeText = reduceMotion || words.length <= 1;

  if (wholeText) {
    return (
      <Text
        style={[flowType.uiName, styles.line, { color }]}
        maxFontSizeMultiplier={1.4}
      >
        {text}
      </Text>
    );
  }

  return (
    <WordReveal text={text} words={words} color={color} paused={paused} />
  );
}

/** The word-by-word reveal — one linear progress value drives every word. */
function WordReveal({
  text,
  words,
  color,
  paused,
}: {
  text: string;
  words: string[];
  color: string;
  paused: boolean;
}) {
  const totalMs = words.length * WORD_STAGGER_MS + WORD_FADE_MS;
  const p = useSharedValue(0); // 0→1 across totalMs, LINEAR (eased per-word on read)

  // Start (or restart when the text changes) the reveal from zero — but only if
  // the ritual is running. If a step mounts while PAUSED, the words hold at the
  // start and the pause/resume effect below begins the reveal on resume, so the
  // reveal never plays out behind a paused screen.
  useEffect(() => {
    p.value = 0;
    if (!paused) {
      p.value = withTiming(1, { duration: totalMs, easing: Easing.linear });
    }
    return () => cancelAnimation(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // Pause freezes the reveal where it is; resume continues over only the
  // REMAINING time so the cadence stays honest (never a restart, never a jump).
  useEffect(() => {
    if (paused) {
      cancelAnimation(p);
    } else if (p.value < 1) {
      p.value = withTiming(1, {
        duration: Math.max(60, (1 - p.value) * totalMs),
        easing: Easing.linear,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  return (
    <Text
      style={[flowType.uiName, styles.line, { color }]}
      accessible
      accessibilityLabel={text}
      maxFontSizeMultiplier={1.4}
    >
      {words.map((w, i) => (
        <Word key={i} p={p} index={i} totalMs={totalMs} last={i === words.length - 1}>
          {w}
        </Word>
      ))}
    </Text>
  );
}

function Word({
  p,
  index,
  totalMs,
  last,
  children,
}: {
  p: SharedValue<number>;
  index: number;
  totalMs: number;
  last: boolean;
  children: string;
}) {
  const style = useAnimatedStyle(() => {
    const elapsed = p.value * totalMs;
    const local = (elapsed - index * WORD_STAGGER_MS) / WORD_FADE_MS;
    return { opacity: Math.max(0, Math.min(1, local)) };
  });
  return (
    <Animated.Text style={style} importantForAccessibility="no">
      {children}
      {last ? '' : ' '}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  line: { marginTop: 16 },
});

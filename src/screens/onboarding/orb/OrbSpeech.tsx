/**
 * OrbSpeech — the orb's VOICE, in motion.
 *
 * The typographic voice system says: anything the orb "speaks" is Instrument
 * Serif, tied spatially just below the orb, and (when motion is on) arrives
 * word-by-word. This component is that arrival.
 *
 * LAYOUT CONTRACT (the no-overflow guarantee). The full line is laid out in its
 * FINAL wrapped position from the first frame — every word already sits where it
 * will end up, just FAINT (the same ink at a low opacity floor, never gray).
 * The reveal then fades each word from that floor up to full opacity on a
 * stagger. Because nothing moves (opacity only — no translateY) and the line is
 * pre-wrapped, the layout NEVER shifts and a long line can NEVER overflow
 * horizontally: the word row is a single width-bounded flex-wrap container, so
 * the words wrap onto as many lines as needed and stay within the margins.
 *
 * Why opacity-only on separate word views (not a single <Text> with nested
 * animated words): nested <Text> are virtual nodes on native — you cannot
 * animate an individual word's opacity inside one Text. Separate <Animated.Text>
 * in a bounded flex-wrap row animate identically on web + native AND wrap
 * correctly, which is what the no-overflow + fade-in-place contract requires.
 * The reduce-motion path renders the whole line as ONE <Text>, so it can use
 * `numberOfLines` + `adjustsFontSizeToFit` for an exact fit.
 *
 * Callers pass the serif `textStyle`; OrbSpeech owns the per-word motion and the
 * timing model (startDelay / wordStagger / wordDuration) — which a host can
 * mirror to time a synced beat (e.g. Screen 2's "lean in on *you*", or a
 * reaction's blink). `accentWords` get a WHISPER of distinction (a faint
 * Pura-Blue tint via `accentStyle`).
 *
 * Accessibility: the whole line is exposed to VoiceOver as ONE label
 * (`accessibilityLabel={text}`); the animated word fragments are hidden from
 * the a11y tree so the conversation is read naturally, not word-by-word.
 */

import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type AccessibilityRole,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { blue } from '@/theme';

const EASE_OUT = Easing.out(Easing.cubic);

// Un-revealed words sit at this opacity — faint, but the SAME ink (never gray),
// and already in their final wrapped position so the line can't shift/overflow.
const OPACITY_FLOOR = 0.1;

// Default whisper-of-distinction for accent words when a caller marks
// `accentWords` but passes no explicit `accentStyle`. Pulled from the brand
// ramp (blue[600]) so every accented word across the orb's voice reads as the
// SAME considered Pura-Blue — never a one-off tint. Callers that pass their
// own `accentStyle` (e.g. a theme-aware serifAccent) still override this.
const DEFAULT_ACCENT: TextStyle = { color: blue[600] };

const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');

export interface OrbSpeechProps {
  text: string;
  /** Serif voice styling (fontFamily / size / color / letterSpacing …). */
  textStyle?: StyleProp<TextStyle>;
  reduceMotion: boolean;
  /** Begin the reveal. Flip false→true to (re)trigger. Default true. */
  play?: boolean;
  startDelay?: number; // ms before the first word
  wordStagger?: number; // ms between word starts (default 110)
  wordDuration?: number; // ms per word (default 450)
  align?: 'center' | 'left';
  onDone?: () => void;
  accessibilityRole?: AccessibilityRole;
  style?: StyleProp<ViewStyle>;
  maxWidth?: number;
  /** Words (e.g. an interpolated {goal} phrase) that get the accent style. */
  accentWords?: string[];
  /** The whisper-of-distinction style merged onto accent words. */
  accentStyle?: StyleProp<TextStyle>;
  /** Static-path fit guards (used by the reduce-motion single <Text> render). */
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
}

export function OrbSpeech({
  text,
  textStyle,
  reduceMotion,
  play = true,
  startDelay = 0,
  wordStagger = 110,
  wordDuration = 450,
  align = 'center',
  onDone,
  accessibilityRole = 'text',
  style,
  maxWidth,
  accentWords,
  accentStyle,
  numberOfLines,
  adjustsFontSizeToFit,
  minimumFontScale,
}: OrbSpeechProps) {
  const words = React.useMemo(() => text.split(' '), [text]);
  const accentSet = React.useMemo(
    () => new Set((accentWords ?? []).map(clean).filter(Boolean)),
    [accentWords],
  );
  const isAccent = (w: string) => accentSet.has(clean(w));

  if (reduceMotion) {
    return (
      <ReducedSpeech
        text={text}
        words={words}
        textStyle={textStyle}
        align={align}
        onDone={onDone}
        accessibilityRole={accessibilityRole}
        style={style}
        maxWidth={maxWidth}
        isAccent={isAccent}
        accentStyle={accentStyle}
        numberOfLines={numberOfLines}
        adjustsFontSizeToFit={adjustsFontSizeToFit}
        minimumFontScale={minimumFontScale}
      />
    );
  }

  // Outer is a COLUMN at full width (capped by maxWidth). Its single child — the
  // word row — therefore STRETCHES to that bounded width, which is what makes
  // flex-wrap actually wrap (a row whose width is content-sized never wraps).
  return (
    <View
      accessible
      accessibilityRole={accessibilityRole}
      accessibilityLabel={text}
      style={[styles.outer, maxWidth != null && { maxWidth }, style]}
    >
      <View
        style={[
          styles.row,
          { justifyContent: align === 'center' ? 'center' : 'flex-start' },
        ]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        pointerEvents="none"
      >
        {words.map((w, i) => (
          <Word
            key={`${w}-${i}`}
            word={w}
            textStyle={textStyle}
            accent={isAccent(w)}
            accentStyle={accentStyle}
            play={play}
            delay={startDelay + i * wordStagger}
            duration={wordDuration}
            isLast={i === words.length - 1}
            onDone={onDone}
          />
        ))}
      </View>
    </View>
  );
}

function Word({
  word,
  textStyle,
  accent,
  accentStyle,
  play,
  delay,
  duration,
  isLast,
  onDone,
}: {
  word: string;
  textStyle?: StyleProp<TextStyle>;
  accent?: boolean;
  accentStyle?: StyleProp<TextStyle>;
  play: boolean;
  delay: number;
  duration: number;
  isLast: boolean;
  onDone?: () => void;
}) {
  // 0 = faint floor, 1 = fully revealed. Starts faint so the word already
  // occupies its final spot — the reveal is a pure fade in place.
  const p = useSharedValue(0);

  useEffect(() => {
    if (!play) {
      p.value = 0;
      return;
    }
    if (isLast && onDone) {
      p.value = withDelay(
        delay,
        withTiming(1, { duration, easing: EASE_OUT }, (finished) => {
          if (finished) runOnJS(onDone)();
        }),
      );
    } else {
      p.value = withDelay(delay, withTiming(1, { duration, easing: EASE_OUT }));
    }
  }, [play, delay, duration, isLast, onDone, p]);

  // Opacity-only: floor → 1. No transform, so the wrapped layout never shifts.
  const aStyle = useAnimatedStyle(() => ({
    opacity: OPACITY_FLOOR + (1 - OPACITY_FLOOR) * p.value,
  }));

  return (
    <Animated.Text
      allowFontScaling
      maxFontSizeMultiplier={1.6}
      style={[textStyle, accent && (accentStyle ?? DEFAULT_ACCENT), styles.word, aStyle]}
    >
      {word}
    </Animated.Text>
  );
}

function ReducedSpeech({
  text,
  words,
  textStyle,
  align,
  onDone,
  accessibilityRole,
  style,
  maxWidth,
  isAccent,
  accentStyle,
  numberOfLines,
  adjustsFontSizeToFit,
  minimumFontScale,
}: {
  text: string;
  words: string[];
  textStyle?: StyleProp<TextStyle>;
  align?: 'center' | 'left';
  onDone?: () => void;
  accessibilityRole?: AccessibilityRole;
  style?: StyleProp<ViewStyle>;
  maxWidth?: number;
  isAccent: (w: string) => boolean;
  accentStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
}) {
  useEffect(() => {
    onDone?.();
  }, [onDone]);
  // The whole line at once (FIX 2 reduce-motion rule). A single <Text> can use
  // the native fit guards so a long line shrinks to fit rather than overflow.
  return (
    <View style={[styles.outer, maxWidth != null && { maxWidth }, style]}>
      <Text
        accessibilityRole={accessibilityRole}
        accessibilityLabel={text}
        maxFontSizeMultiplier={1.6}
        numberOfLines={numberOfLines}
        adjustsFontSizeToFit={adjustsFontSizeToFit}
        minimumFontScale={minimumFontScale}
        style={[textStyle, { textAlign: align }]}
      >
        {words.map((w, i) => (
          <Text key={`${w}-${i}`} style={isAccent(w) ? (accentStyle ?? DEFAULT_ACCENT) : undefined}>
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </Text>
        ))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full-width column → its child row stretches to this width and so wraps.
  outer: { width: '100%' },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    width: '100%',
  },
  // Trailing space between words; the wrap handles line breaks.
  word: { marginRight: 6 },
});

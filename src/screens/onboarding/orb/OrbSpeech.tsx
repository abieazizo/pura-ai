/**
 * OrbSpeech — the orb's VOICE, in motion.
 *
 * The typographic voice system says: anything the orb "speaks" is Instrument
 * Serif, tied spatially just below the orb, and (when motion is on) arrives
 * word-by-word. This component is that arrival. Each word fades + rises + comes
 * into focus (a scale settle, since this RNSVG/RN build can't animate blur
 * radius per frame) on a stagger.
 *
 * Callers pass the serif `textStyle`; OrbSpeech only owns the per-word motion
 * and the timing model (startDelay / wordStagger / wordDuration) — which a host
 * can mirror to time a synced beat (e.g. Screen 2's "lean in on *you*").
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

const EASE_OUT = Easing.out(Easing.cubic);

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
}: OrbSpeechProps) {
  const words = React.useMemo(() => text.split(' '), [text]);

  if (reduceMotion) {
    return (
      <ReducedSpeech
        text={text}
        textStyle={textStyle}
        align={align}
        onDone={onDone}
        accessibilityRole={accessibilityRole}
        style={style}
        maxWidth={maxWidth}
      />
    );
  }

  return (
    <View
      accessible
      accessibilityRole={accessibilityRole}
      accessibilityLabel={text}
      style={[
        styles.row,
        { justifyContent: align === 'center' ? 'center' : 'flex-start' },
        maxWidth != null && { maxWidth },
        style,
      ]}
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
  play,
  delay,
  duration,
  isLast,
  onDone,
}: {
  word: string;
  textStyle?: StyleProp<TextStyle>;
  play: boolean;
  delay: number;
  duration: number;
  isLast: boolean;
  onDone?: () => void;
}) {
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

  const aStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [
      { translateY: (1 - p.value) * 12 },
      { scale: 0.97 + p.value * 0.03 },
    ],
  }));

  return (
    <Animated.Text
      allowFontScaling
      maxFontSizeMultiplier={1.2}
      style={[textStyle, styles.word, aStyle]}
    >
      {word}
    </Animated.Text>
  );
}

function ReducedSpeech({
  text,
  textStyle,
  align,
  onDone,
  accessibilityRole,
  style,
  maxWidth,
}: Pick<
  OrbSpeechProps,
  'text' | 'textStyle' | 'align' | 'onDone' | 'accessibilityRole' | 'style' | 'maxWidth'
>) {
  useEffect(() => {
    onDone?.();
  }, [onDone]);
  return (
    <View
      style={[
        { alignItems: align === 'center' ? 'center' : 'flex-start' },
        maxWidth != null && { maxWidth },
        style,
      ]}
    >
      <Text
        accessibilityRole={accessibilityRole}
        maxFontSizeMultiplier={1.2}
        style={[textStyle, { textAlign: align }]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  // Trailing space between words; the wrap handles line breaks.
  word: { marginRight: 6 },
});

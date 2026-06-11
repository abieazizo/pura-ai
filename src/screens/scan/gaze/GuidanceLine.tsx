/**
 * GuidanceLine — the ONE calm instruction.
 *
 * A single Instrument Serif line beneath the gaze frame, driven by
 * the engine's primaryHint. Always encouraging, never error-red,
 * never a blob over the face. Swaps with a gentle rise-and-fade so
 * changing guidance reads as the companion adjusting its voice, not
 * an alert firing. Announced politely to screen readers.
 *
 * While fill light is active a small warm note sits above it —
 * "Adding a little light for you." — the only second line allowed.
 */

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { gaze } from './gazeTokens';
import { MOTION } from './gazeMotion';

export interface GuidanceLineProps {
  text: string;
  fillLightActive: boolean;
}

export function GuidanceLine({ text, fillLightActive }: GuidanceLineProps) {
  const reduceMotion = useReduceMotion();

  // Double-buffered text so the old line fades down as the new rises.
  const [shown, setShown] = useState(text);
  const fade = useSharedValue(1);
  const pendingRef = useRef(text);
  useEffect(() => {
    if (text === shown) return;
    pendingRef.current = text;
    if (reduceMotion) {
      setShown(text);
      return;
    }
    fade.value = withTiming(0, { duration: MOTION.HINT_SWAP_MS / 2, easing: MOTION.easeOut });
    const t = setTimeout(() => {
      setShown(pendingRef.current);
      fade.value = withTiming(1, { duration: MOTION.HINT_SWAP_MS / 2, easing: MOTION.easeOut });
    }, MOTION.HINT_SWAP_MS / 2);
    return () => clearTimeout(t);
  }, [text, shown, fade, reduceMotion]);

  const lineStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: (1 - fade.value) * 5 }],
  }));

  const note = useSharedValue(0);
  useEffect(() => {
    note.value = withTiming(fillLightActive ? 1 : 0, {
      duration: MOTION.FILL_MS,
      easing: MOTION.easeInOut,
    });
  }, [fillLightActive, note]);
  const noteStyle = useAnimatedStyle(() => ({
    opacity: note.value,
    transform: [{ translateY: (1 - note.value) * 4 }],
  }));

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={noteStyle}>
        <Text style={styles.note} maxFontSizeMultiplier={1.2}>
          Adding a little light for you.
        </Text>
      </Animated.View>
      <Animated.View style={lineStyle}>
        <Text
          style={styles.line}
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
        >
          {shown}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  line: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 23,
    lineHeight: 28,
    letterSpacing: -0.2,
    color: gaze.guidance,
    textAlign: 'center',
    textShadowColor: gaze.guidanceShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  note: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14.5,
    lineHeight: 18,
    color: gaze.fillLightNote,
    textAlign: 'center',
    textShadowColor: gaze.guidanceShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
});

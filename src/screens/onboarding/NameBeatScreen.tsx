/**
 * Name beat — "the orb asks your name" (NameBeatScreen).
 *
 * The natural bridge from "let me get to know you" to the questions: the orb's
 * first real act of getting to know the user. It flows in (continuous, shrinks
 * to ~80px at ~18%), asks "So — what should I call you?", takes a name, then
 * gives a tiny warm acknowledgment — a glow pulse + "Lovely to meet you,
 * [Name]." — and advances. Light and fast; a single warm exchange.
 *
 * The name is stored globally and threads through every later orb line as a
 * warmth multiplier; "I'd rather not say" stores nothing and the orb falls back
 * to a warm neutral "you".
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useAppStore } from '@/store/useAppStore';
import { hapt } from '@/utils/haptics';
import { useOrb } from './orb/OrbHost';
import { OrbSpeech } from './orb/OrbSpeech';
import { OrbButton } from './orb/OrbButton';
import { useStepTransition } from './orb/useStepTransition';
import { orbBottom, targetFor } from './orb/orbLayout';

const QUESTION = 'So — what should I call you?';
// ONE clean border: an ink hairline at rest, Pura Blue on focus.
const BORDER_REST = 'rgba(8,10,15,0.12)';
const BORDER_FOCUS = '#147CFF';

export interface NameBeatScreenProps {
  onAdvance: () => void;
}

function nameError(v: string): string | null {
  const t = v.trim();
  if (t.length === 0) return null; // empty just disables; no scold
  if (t.length > 30) return 'Just a name is perfect.';
  const digits = (t.match(/\d/g) ?? []).length;
  if (digits >= 3) return 'Just a name is perfect.';
  if (!/[\p{L}]/u.test(t)) return 'Just a name is perfect.'; // symbols only
  return null;
}

export function NameBeatScreen({ onAdvance }: NameBeatScreenProps) {
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const orb = useOrb();
  const storedName = useAppStore((s) => s.name);
  const setName = useAppStore((s) => s.setName);
  const { style: exitStyle, runExit } = useStepTransition(reduceMotion, { enter: false });

  const target = targetFor('name', width, height, insets.top);
  const lineTop = orbBottom(target) + 22;

  const [value, setValue] = useState(storedName ?? '');
  const [phase, setPhase] = useState<'asking' | 'ack'>('asking');
  const [ackText, setAckText] = useState('');
  const [askPlay, setAskPlay] = useState(reduceMotion);
  const focus = useSharedValue(value ? 1 : 0);
  const bodyA = useSharedValue(reduceMotion ? 1 : 0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const err = nameError(value);
  const canContinue = value.trim().length >= 1 && !err;

  useEffect(() => {
    // Continuous arrival; shrink + settle high; warm gaze.
    orb.show();
    orb.moveTo(target);
    orb.setGaze('forward');
    orb.setExpression('warm');

    if (reduceMotion) {
      bodyA.value = 1;
      AccessibilityInfo.announceForAccessibility?.(QUESTION);
      return;
    }
    // Keep it light: ~300ms beat, then the orb asks; the field follows.
    const t1 = setTimeout(() => {
      setAskPlay(true);
      AccessibilityInfo.announceForAccessibility?.(QUESTION);
    }, 320);
    const t2 = setTimeout(() => {
      bodyA.value = withTiming(1, { duration: 420 });
    }, 700);
    timers.current.push(t1, t2);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: bodyA.value,
    transform: [{ translateY: (1 - bodyA.value) * 12 }],
  }));
  const fieldStyle = useAnimatedStyle(() => ({
    borderColor: focus.value > 0.5 ? BORDER_FOCUS : BORDER_REST,
  }));

  const acknowledge = (name: string | null) => {
    // Persist (empty string = "I'd rather not say" → warm neutral fallback).
    setName(name ?? '');
    hapt.tap();

    const first = name ? name.trim().split(/\s+/)[0] : '';
    const line = first ? `Lovely to meet you, ${first}.` : 'Lovely to meet you.';
    setAckText(line);
    setPhase('ack');
    AccessibilityInfo.announceForAccessibility?.(line);

    // A designed warm beat: the orb's eyes curve up into a smile + a glow bloom
    // lands AS the line does (full happy reaction, the warmest register).
    orb.reactArchetype('warm', { lineMs: 1300 });

    // Fade the field out under the ack, then hold the warm beat before advancing.
    if (!reduceMotion) {
      bodyA.value = withTiming(0, { duration: 260 });
    }
    const t = setTimeout(() => runExit(onAdvance), reduceMotion ? 600 : 1800);
    timers.current.push(t);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <Animated.View style={[StyleSheet.absoluteFill, exitStyle]} pointerEvents="box-none">
        {/* The orb's question / acknowledgment, tied just below the orb. */}
        <View style={[styles.lines, { top: lineTop }]} pointerEvents="none">
          {phase === 'asking'
            ? askPlay && (
                <OrbSpeech
                  key="ask"
                  text={QUESTION}
                  reduceMotion={reduceMotion}
                  textStyle={styles.voice}
                  accessibilityRole="header"
                  wordStagger={95}
                  wordDuration={420}
                />
              )
            : (
                <OrbSpeech
                  key="ack"
                  text={ackText}
                  reduceMotion={reduceMotion}
                  textStyle={styles.voice}
                  accessibilityRole="header"
                  wordStagger={70}
                  wordDuration={300}
                />
              )}
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Spacer pushes the field below the orb + question. */}
          <View style={{ height: Math.max(0, lineTop - insets.top + 64) }} />

          {phase === 'asking' && (
            <Animated.View style={[styles.body, bodyStyle]}>
              <Animated.View style={[styles.field, fieldStyle]}>
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  autoFocus={!reduceMotion}
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={32}
                  returnKeyType="done"
                  onSubmitEditing={() => canContinue && acknowledge(value.trim())}
                  onFocus={() => {
                    focus.value = withTiming(1, { duration: 200 });
                  }}
                  onBlur={() => {
                    focus.value = withTiming(value.length > 0 ? 1 : 0, { duration: 200 });
                  }}
                  style={[
                    styles.input,
                    // Remove the browser's default focus ring on web — THAT inner
                    // blue ring (atop the field border) was the "double border".
                    Platform.OS === 'web' && ({ outlineWidth: 0, outlineStyle: 'none' } as any),
                  ]}
                  accessibilityLabel="Your name"
                  textAlign="center"
                />
                {value.length === 0 && (
                  <View style={styles.placeholderWrap} pointerEvents="none">
                    <Text style={styles.placeholder}>Your name</Text>
                  </View>
                )}
              </Animated.View>

              <Text style={styles.helper} maxFontSizeMultiplier={1.2}>
                {err ?? ' '}
              </Text>

              <Pressable
                onPress={() => acknowledge(null)}
                accessibilityRole="button"
                accessibilityLabel="I'd rather not say"
                hitSlop={8}
                style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.skipText} maxFontSizeMultiplier={1.2}>
                  I'd rather not say
                </Text>
              </Pressable>
            </Animated.View>
          )}

          <View style={styles.flex} />

          {phase === 'asking' && (
            <View style={{ paddingBottom: insets.bottom + 12 }}>
              <OrbButton
                label="Continue"
                onPress={() => acknowledge(value.trim())}
                disabled={!canContinue}
                reduceMotion={reduceMotion}
              />
            </View>
          )}
        </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  lines: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  voice: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: palette.ink,
    textAlign: 'center',
  },
  body: { paddingHorizontal: 16, alignItems: 'center' },
  field: {
    alignSelf: 'stretch',
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  input: {
    fontFamily: 'Inter-Regular',
    fontSize: 18,
    color: palette.ink,
    padding: 0,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  placeholderWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
    fontSize: 18,
    color: palette.inkTertiary,
  },
  helper: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: palette.inkTertiary,
    marginTop: 12,
    minHeight: 18,
  },
  skip: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skipText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: palette.inkSecondary,
  },
});

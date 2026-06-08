/**
 * AssistInputBar — the floating "Ask about your skin tonight" dock that appears
 * identically on the Pura Assist Home surface and the conversation screen. The
 * two bars are pixel-identical on purpose, so the bar reads as the SAME element
 * staying put while the conversation assembles around it.
 *
 * Two modes, ONE visual:
 *   • launcher  — a NON-EDITABLE button on Home. It never focuses an inline
 *                 field (that raised the keyboard and zoomed the layout); it
 *                 just navigates into the conversation via `onOpen`, where the
 *                 real input auto-focuses. Looks identical to the composer
 *                 (AI lozenge · placeholder · send circle) so the hand-off is
 *                 seamless.
 *   • composer  — the live input inside the conversation. Submitting calls
 *                 `onSend()`; the keyboard stays up and focus remains so the
 *                 user can keep typing.
 *
 * Enter-to-submit (composer): a multiline TextInput's `onSubmitEditing` is
 * unreliable, so the return key is detected by watching for a trailing newline
 * in `onChangeText`. We submit and swallow the newline. A small timestamp guard
 * dedupes against the rare platform that also fires `onSubmitEditing`.
 *
 * Reads only `puraAssist` tokens — no hex literals.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ArrowUp, Sparkle } from 'phosphor-react-native';
import {
  puraAssist,
  puraAssistRadius,
  puraAssistShadow,
  puraAssistType,
} from '@/theme';
import { hapt } from '@/utils/haptics';

const PLACEHOLDER = 'Ask about your skin tonight';

// Send circle: 44px when there's text, ~40px (idle scale) when empty.
const SEND_SIZE = 44;
const SEND_IDLE_SCALE = 40 / SEND_SIZE; // ≈ 0.909

interface LauncherProps {
  mode: 'launcher';
  /** Open the conversation (which auto-focuses its real input). */
  onOpen: () => void;
  /** Bottom inset so the dock floats clear of the home indicator / tab bar. */
  bottomInset?: number;
}

interface ComposerProps {
  mode: 'composer';
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  onFocus?: TextInputProps['onFocus'];
  bottomInset?: number;
}

export type AssistInputBarProps = LauncherProps | ComposerProps;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AssistInputBar(props: AssistInputBarProps) {
  if (props.mode === 'launcher') {
    return <LauncherBar onOpen={props.onOpen} bottomInset={props.bottomInset} />;
  }
  return <ComposerBar {...props} />;
}

// ---------------------------------------------------------------------------
// Launcher — a button that LOOKS like the input but never focuses it. Tapping
// navigates to the conversation; no keyboard, no zoom, on Home.
// ---------------------------------------------------------------------------
function LauncherBar({
  onOpen,
  bottomInset,
}: {
  onOpen: () => void;
  bottomInset?: number;
}) {
  const press = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  return (
    <View style={[styles.dock, dockInset(bottomInset)]} pointerEvents="box-none">
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Ask Pura about your skin tonight"
        accessibilityHint="Opens the Pura Assist conversation"
        onPress={onOpen}
        onPressIn={() => {
          press.value = withTiming(0.985, { duration: 90 });
        }}
        onPressOut={() => {
          press.value = withTiming(1, { duration: 140 });
        }}
        style={[styles.bar, aStyle]}
      >
        <View style={styles.aiBadge} pointerEvents="none">
          <Sparkle size={16} color={puraAssist.blue} weight="fill" />
          <Text style={styles.aiBadgeLabel}>AI</Text>
        </View>
        <Text style={styles.launcherText} numberOfLines={1}>
          {PLACEHOLDER}
        </Text>
        <View style={[styles.send, styles.sendIdle]} pointerEvents="none">
          <ArrowUp size={20} color={puraAssist.onBlue} weight="bold" />
        </View>
      </AnimatedPressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Composer — the live conversation input.
// ---------------------------------------------------------------------------
function ComposerBar({ value, onChangeText, onSend, inputRef, onFocus, bottomInset }: ComposerProps) {
  const canSend = value.trim().length > 0;

  // ---- Submit (return key OR send button), deduped --------------------------
  const lastSubmitRef = useRef(0);
  const submit = useCallback(() => {
    const text = value.trim();
    if (text.length === 0) return;
    const now = Date.now();
    if (now - lastSubmitRef.current < 250) return; // dedupe double-fire
    lastSubmitRef.current = now;
    onSend();
  }, [onSend, value]);

  // The return key arrives as a trailing newline on a multiline field. Treat
  // it as submit and swallow the newline; otherwise pass the change through.
  const handleChangeText = useCallback(
    (next: string) => {
      if (next.endsWith('\n')) {
        submit();
        return;
      }
      onChangeText(next);
    },
    [onChangeText, submit],
  );

  // ---- Focus animation: deeper shadow + Pura Blue ring ----------------------
  const focus = useSharedValue(0);
  const barStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focus.value,
      [0, 1],
      [puraAssist.blue00, puraAssist.blue20],
    ),
    shadowOpacity: 0.08 + focus.value * 0.04, // 0.08 → 0.12
  }));
  const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
    (e) => {
      focus.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
      hapt.tap();
      onFocus?.(e);
    },
    [focus, onFocus],
  );
  const handleBlur = useCallback(() => {
    focus.value = withTiming(0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [focus]);

  // ---- Send button: bouncy spring the moment text first appears -------------
  const sendScale = useSharedValue(canSend ? 1 : SEND_IDLE_SCALE);
  const sendOpacity = useSharedValue(canSend ? 1 : 0.5);
  const sendPress = useSharedValue(1);
  const prevCanSend = useRef(canSend);
  useEffect(() => {
    if (canSend === prevCanSend.current) return;
    prevCanSend.current = canSend;
    if (canSend) {
      sendOpacity.value = withTiming(1, { duration: 140 });
      // 0.9 → overshoot ~1.1 → settle 1.0, springy, ~250ms.
      sendScale.value = withSequence(
        withTiming(0.9, { duration: 70, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 9, stiffness: 220, mass: 0.6 }),
      );
    } else {
      sendOpacity.value = withTiming(0.5, { duration: 140 });
      sendScale.value = withTiming(SEND_IDLE_SCALE, {
        duration: 140,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [canSend, sendOpacity, sendScale]);
  const sendStyle = useAnimatedStyle(() => ({
    opacity: sendOpacity.value,
    transform: [{ scale: sendScale.value * sendPress.value }],
  }));

  return (
    <View style={[styles.dock, dockInset(bottomInset)]} pointerEvents="box-none">
      <Animated.View style={[styles.bar, barStyle]}>
        {/* Leading AI lozenge — identical on both bars. */}
        <View style={styles.aiBadge} pointerEvents="none">
          <Sparkle size={16} color={puraAssist.blue} weight="fill" />
          <Text style={styles.aiBadgeLabel}>AI</Text>
        </View>

        <TextInput
          ref={inputRef as React.RefObject<TextInput>}
          style={styles.input}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={PLACEHOLDER}
          placeholderTextColor={puraAssist.veryMuted}
          multiline
          maxLength={500}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={submit}
          accessibilityLabel="Message Pura Assist"
        />

        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          hitSlop={8}
          onPress={submit}
          onPressIn={() => {
            sendPress.value = withTiming(0.9, { duration: 80 });
          }}
          onPressOut={() => {
            sendPress.value = withTiming(1, { duration: 120 });
          }}
          style={[styles.send, sendStyle]}
        >
          <ArrowUp size={20} color={puraAssist.onBlue} weight="bold" />
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

function dockInset(bottomInset?: number) {
  return { paddingBottom: (bottomInset ?? 0) + 12 };
}

const styles = StyleSheet.create({
  dock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingLeft: 12,
    paddingRight: 12,
    backgroundColor: puraAssist.surface,
    borderRadius: puraAssistRadius.inputBar,
    // 1px border kept always-on (transparent at rest) so the focus ring fades
    // in via colour with no layout shift.
    borderWidth: 1,
    borderColor: puraAssist.blue00,
    ...puraAssistShadow.inputBar,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 36,
    paddingHorizontal: 11,
    borderRadius: puraAssistRadius.pill,
    backgroundColor: puraAssist.blue10,
  },
  aiBadgeLabel: {
    ...puraAssistType.aiBadge,
    color: puraAssist.blue,
  },
  input: {
    flex: 1,
    ...puraAssistType.inputText,
    color: puraAssist.ink,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    // ~4 lines (lineHeight 21) + vertical padding, then it scrolls internally.
    maxHeight: 4 * 21 + 16,
    // Android centres multiline text only with this; iOS ignores it.
    textAlignVertical: 'center',
  },
  // Launcher placeholder — identical font/position to the composer's, muted.
  launcherText: {
    flex: 1,
    ...puraAssistType.inputText,
    color: puraAssist.veryMuted,
    paddingHorizontal: 10,
  },
  send: {
    width: SEND_SIZE,
    height: SEND_SIZE,
    borderRadius: SEND_SIZE / 2,
    backgroundColor: puraAssist.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Launcher send circle matches the composer's empty (idle) state.
  sendIdle: {
    opacity: 0.5,
    transform: [{ scale: SEND_IDLE_SCALE }],
  },
});

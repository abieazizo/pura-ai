/**
 * AssistInputBar — the floating "Ask about your skin tonight" dock that
 * appears identically on the Pura Assist Home surface and the conversation
 * screen (per the reference, the two bars are pixel-identical).
 *
 * Two modes share one visual:
 *   • launcher  — the whole bar is a button. Tapping anywhere (including the
 *                 send glyph) opens the conversation. Used on Home, where
 *                 typing happens AFTER the conversation opens.
 *   • composer  — a live TextInput with an active send button. Used inside
 *                 the conversation. Send is enabled only when there's text.
 *
 * Reads only `puraAssist` tokens — no hex literals.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { ArrowUp, Sparkle } from 'phosphor-react-native';
import {
  puraAssist,
  puraAssistRadius,
  puraAssistShadow,
  puraAssistType,
} from '@/theme';

const PLACEHOLDER = 'Ask about your skin tonight';

interface CommonProps {
  /** Bottom inset so the dock floats clear of the home indicator / tab bar. */
  bottomInset?: number;
}

interface LauncherProps extends CommonProps {
  mode: 'launcher';
  onOpen: () => void;
}

interface ComposerProps extends CommonProps {
  mode: 'composer';
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  onFocus?: TextInputProps['onFocus'];
}

export type AssistInputBarProps = LauncherProps | ComposerProps;

export function AssistInputBar(props: AssistInputBarProps) {
  const canSend = props.mode === 'composer' && props.value.trim().length > 0;

  // ----- The three regions: AI badge / field / send. --------------------
  // The leading badge is the standing "you're talking to Pura's AI" signal —
  // identical on the launcher (Home) and the composer (conversation) so the
  // two bars stay pixel-matched. Decorative only; the bar itself carries the
  // press affordance and accessibility label.
  const aiBadge = (
    <View style={styles.aiBadge} accessible={false} pointerEvents="none">
      <Sparkle size={13} color={puraAssist.blue} weight="fill" />
      <Text style={styles.aiBadgeLabel}>AI</Text>
    </View>
  );

  // Launcher's send glyph is always the full Pura Blue affordance.
  const sendGlyph = (
    <View style={styles.send}>
      <ArrowUp size={18} color={puraAssist.onBlue} weight="bold" />
    </View>
  );

  if (props.mode === 'launcher') {
    // Entire bar is one button — tapping opens the conversation.
    return (
      <View style={[styles.dock, dockInset(props.bottomInset)]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask Pura about your skin tonight"
          onPress={props.onOpen}
          style={({ pressed }) => [styles.bar, pressed && styles.barPressed]}
        >
          {aiBadge}
          <Text style={styles.placeholder} numberOfLines={1}>
            {PLACEHOLDER}
          </Text>
          {sendGlyph}
        </Pressable>
      </View>
    );
  }

  // composer
  return (
    <View style={[styles.dock, dockInset(props.bottomInset)]} pointerEvents="box-none">
      <View style={styles.bar}>
        {aiBadge}
        <TextInput
          ref={props.inputRef as React.RefObject<TextInput>}
          style={styles.input}
          value={props.value}
          onChangeText={props.onChangeText}
          onFocus={props.onFocus}
          placeholder={PLACEHOLDER}
          placeholderTextColor={puraAssist.veryMuted}
          multiline
          maxLength={500}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => {
            if (canSend) props.onSend();
          }}
          accessibilityLabel="Message Pura Assist"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          hitSlop={6}
          onPress={props.onSend}
          style={({ pressed }) => [
            styles.send,
            !canSend && styles.sendIdle,
            pressed && canSend && { opacity: 0.9, transform: [{ scale: 0.96 }] },
          ]}
        >
          <ArrowUp size={18} color={puraAssist.onBlue} weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}

function dockInset(bottomInset?: number) {
  return { paddingBottom: (bottomInset ?? 0) + 10 };
}

const styles = StyleSheet.create({
  dock: {
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingLeft: 8,
    paddingRight: 8,
    backgroundColor: puraAssist.surface,
    borderRadius: puraAssistRadius.input,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraAssist.border,
    ...puraAssistShadow.input,
  },
  barPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 26,
    paddingHorizontal: 9,
    marginLeft: 2,
    borderRadius: puraAssistRadius.pill,
    backgroundColor: puraAssist.blue12,
  },
  aiBadgeLabel: {
    ...puraAssistType.eyebrow,
    color: puraAssist.blueText,
  },
  placeholder: {
    flex: 1,
    ...puraAssistType.inputText,
    color: puraAssist.veryMuted,
    paddingHorizontal: 4,
  },
  input: {
    flex: 1,
    ...puraAssistType.inputText,
    color: puraAssist.ink,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 120,
  },
  send: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: puraAssist.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIdle: {
    backgroundColor: puraAssist.blue,
    opacity: 0.35,
  },
});

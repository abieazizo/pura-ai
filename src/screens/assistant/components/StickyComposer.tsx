import React, { useEffect, useRef } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { ArrowUp } from 'phosphor-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { dx, dRadius } from '../decisionTokens';
import { COMPOSER } from '../decisionCopy';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder: string;
  focused: boolean;
  onFocusChange: (b: boolean) => void;
  canSend: boolean;
  /** Wired by the screen so the placeholder shifts post-apply. */
  applied?: boolean;
  reduceMotion: boolean;
}

/**
 * Sticky composer.
 *
 * Pass 1 fix: previously the TextInput was wrapped in a <Pressable>
 * whose touch handler intercepted taps before the TextInput could
 * focus. That made the field non-typable. The TextInput now IS its
 * own tap target — no outer Pressable.
 */
export function StickyComposer({
  value,
  onChange,
  onSend,
  placeholder,
  focused,
  onFocusChange,
  canSend,
  applied,
  reduceMotion,
}: Props) {
  void applied;
  const inputRef = useRef<TextInput>(null);
  const sendOpacity = useSharedValue(canSend ? 1 : 0.45);
  const sendScale = useSharedValue(canSend ? 1 : 0.9);

  useEffect(() => {
    if (reduceMotion) {
      sendOpacity.value = canSend ? 1 : 0.45;
      sendScale.value = canSend ? 1 : 0.9;
      return;
    }
    // Enabling: spring pop so the button "arrives" as the user types
    // the first character. Disabling: quick timing so it doesn't
    // distract after the message is sent.
    if (canSend) {
      sendOpacity.value = withTiming(1, { duration: 100 });
      sendScale.value = withSpring(1, { damping: 14, stiffness: 260, mass: 0.7 });
    } else {
      sendOpacity.value = withTiming(0.45, { duration: 160 });
      sendScale.value = withTiming(0.9, { duration: 160 });
    }
  }, [canSend, reduceMotion, sendOpacity, sendScale]);

  const sendStyle = useAnimatedStyle(() => ({
    opacity: sendOpacity.value,
    transform: [{ scale: sendScale.value }],
  }));

  return (
    <View style={styles.wrap}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={32} tint="light" style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={styles.tint} />
      <View style={styles.hairline} />
      <View style={styles.row}>
        <View
          style={[
            styles.inputWrap,
            focused && styles.inputWrapFocused,
          ]}
          // Delegate focus when the user taps the padded gutter (not
          // the TextInput itself). `onTouchEnd` runs AFTER the
          // TextInput has had a chance to claim the touch, so we
          // only focus when we're sure the input would otherwise
          // miss the tap.
          onTouchEnd={() => {
            if (!focused) inputRef.current?.focus();
          }}
        >
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={dx.inkMuted}
            style={styles.input}
            multiline
            scrollEnabled
            onFocus={() => onFocusChange(true)}
            onBlur={() => onFocusChange(false)}
            onSubmitEditing={() => {
              if (canSend) onSend();
            }}
            returnKeyType="send"
            blurOnSubmit={false}
            maxFontSizeMultiplier={1.25}
            accessibilityLabel={placeholder}
            textAlignVertical="center"
            underlineColorAndroid="transparent"
          />
        </View>
        <Animated.View style={sendStyle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={COMPOSER.sendA11y}
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={onSend}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: canSend ? dx.terracotta : dx.surfaceSecondary,
                borderColor: canSend ? dx.terracotta : dx.line,
              },
              pressed && canSend && { opacity: 0.94, transform: [{ scale: 0.94 }] },
            ]}
            hitSlop={6}
          >
            <ArrowUp
              size={16}
              weight="bold"
              color={canSend ? dx.inkInverse : dx.inkMuted}
            />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    position: 'relative',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      Platform.OS === 'ios' ? 'rgba(250, 247, 244, 0.92)' : dx.paper,
  },
  hairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: dx.hairline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dx.line,
    backgroundColor: dx.surfacePrimary,
    paddingHorizontal: 14,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  inputWrapFocused: {
    borderColor: dx.terracotta,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14.5,
    lineHeight: 20,
    paddingVertical: 6,
    margin: 0,
    color: dx.ink,
    minHeight: 30,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

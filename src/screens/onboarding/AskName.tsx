import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  QuestionHeadline,
  QuestionSubhead,
} from '@/components/onboarding/Headline';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme';

export interface AskNameProps {
  onNext: () => void;
}

/**
 * Screen 2 — Name (optional).
 *
 * The only thing we ask before the scan, and even this is skippable. No
 * progress bar (the flow is three screens — a progress bar would be
 * theater). A "Skip" affordance sits top-right; the rounded input matches
 * the AI Assist composer rather than a bare underline.
 *
 * Continue (name ≥ 2 chars) and Skip both advance to the camera primer.
 */
export function AskName({ onNext }: AskNameProps) {
  const insets = useSafeAreaInsets();
  const storedName = useAppStore((s) => s.name);
  const setName = useAppStore((s) => s.setName);
  const [value, setValue] = useState(storedName);
  const focus = useSharedValue(storedName ? 1 : 0);

  const fieldStyle = useAnimatedStyle(() => ({
    borderColor: focus.value > 0.5 ? palette.clay : palette.hairline,
  }));

  const canContinue = value.trim().length >= 2;

  const submit = () => {
    if (!canContinue) return;
    setName(value.trim());
    onNext();
  };

  const skip = () => {
    // Optional: keep whatever name is already stored, just move on.
    onNext();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <Pressable
          onPress={skip}
          accessibilityRole="button"
          accessibilityLabel="Skip"
          hitSlop={10}
          style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.skipText} maxFontSizeMultiplier={1.2}>
            Skip
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <QuestionHeadline>What should I call you?</QuestionHeadline>
        <QuestionSubhead>
          I'll use your name sparingly — I'm not that kind of app.
        </QuestionSubhead>

        <Animated.View style={[styles.field, fieldStyle]}>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Your name"
            placeholderTextColor={palette.inkTertiary}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={40}
            returnKeyType="done"
            onFocus={() => {
              focus.value = withTiming(1, { duration: 220 });
            }}
            onBlur={() => {
              focus.value = withTiming(value.length > 0 ? 1 : 0, {
                duration: 220,
              });
            }}
            onSubmitEditing={submit}
            style={styles.input}
          />
        </Animated.View>

        <View style={styles.spacer} />

        <View style={{ paddingBottom: insets.bottom + 40 }}>
          <OnboardingPrimaryButton
            label="Continue"
            onPress={submit}
            disabled={!canContinue}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  topBar: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: palette.clay,
    letterSpacing: 0.1,
  },
  field: {
    marginHorizontal: 24,
    marginTop: 28,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: palette.bg,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  input: {
    fontFamily: 'Inter-Regular',
    fontSize: 17,
    color: palette.ink,
    padding: 0,
  },
  spacer: { flex: 1 },
});

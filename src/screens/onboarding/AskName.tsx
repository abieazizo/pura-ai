import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
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
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
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
 * AskName (§3.2). Single borderless input styled as Instrument Serif 40pt,
 * with an animated clay underline that strengthens on focus. Continue is
 * enabled at length ≥ 2.
 */
export function AskName({ onNext }: AskNameProps) {
  const insets = useSafeAreaInsets();
  const storedName = useAppStore((s) => s.name);
  const setName = useAppStore((s) => s.setName);
  const [value, setValue] = useState(storedName);
  const focus = useSharedValue(storedName ? 1 : 0);

  // v10.7 — underline tint moved from the v5 terracotta rgba to cool
  // palette tokens. Focused = clay (brand accent); unfocused = hairline.
  const underlineStyle = useAnimatedStyle(() => ({
    backgroundColor: focus.value > 0.5 ? palette.clay : palette.hairline,
  }));

  const canContinue = value.trim().length >= 2;
  const submit = () => {
    if (!canContinue) return;
    setName(value.trim());
    onNext();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <OnboardingHeader currentStep={1} totalSteps={11} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <QuestionHeadline>What should I call you?</QuestionHeadline>
        <QuestionSubhead>
          I'll use your name sparingly — I'm not that kind of app.
        </QuestionSubhead>

        <View style={styles.inputWrap}>
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
              focus.value = withTiming(1, { duration: 300 });
            }}
            onBlur={() => {
              focus.value = withTiming(value.length > 0 ? 1 : 0, {
                duration: 300,
              });
            }}
            onSubmitEditing={submit}
            style={styles.input}
          />
          <Animated.View style={[styles.underline, underlineStyle]} />
        </View>

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
  inputWrap: {
    marginHorizontal: 24,
    marginTop: 32,
  },
  input: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 40,
    lineHeight: 44,
    color: palette.ink,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  underline: {
    height: 1,
    alignSelf: 'stretch',
  },
  spacer: { flex: 1 },
});

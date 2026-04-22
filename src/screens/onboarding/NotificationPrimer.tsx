import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import {
  QuestionHeadline,
  QuestionSubhead,
} from '@/components/onboarding/Headline';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { PermissionMock } from './CameraPrimer';
import { palette } from '@/theme';

export interface NotificationPrimerProps {
  onContinue: () => void;
}

/**
 * Notification primer (§3.11). Same shape as CameraPrimer — editorial header,
 * paper-toned iOS dialog mock, Continue advances to the real system prompt
 * on the next screen.
 */
export function NotificationPrimer({ onContinue }: NotificationPrimerProps) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <OnboardingHeader currentStep={11} totalSteps={11} />

      <View style={styles.flex}>
        <QuestionHeadline>Can I remind you?</QuestionHeadline>
        <QuestionSubhead>
          One morning nudge. One evening check. Nothing else.
        </QuestionSubhead>

        <View style={styles.mockWrap}>
          <PermissionMock
            title='"Pura" Would Like to Send You Notifications'
            body="Gentle reminders for your morning and evening routine."
          />
        </View>
      </View>

      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 40 }]}>
        <OnboardingPrimaryButton label="Continue." onPress={onContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  mockWrap: {
    alignItems: 'center',
    marginTop: 40,
  },
  ctaWrap: { paddingTop: 12 },
});

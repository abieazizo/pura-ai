import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import {
  QuestionHeadline,
  QuestionSubhead,
} from '@/components/onboarding/Headline';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { palette } from '@/theme';

export interface CameraPrimerProps {
  onContinue: () => void;
}

/**
 * Camera primer (§2.6). Editorial header + a rendered-in-our-style mock of
 * the iOS permission dialog. Tapping Continue advances to CameraPermission,
 * which fires the real system prompt.
 */
export function CameraPrimer({ onContinue }: CameraPrimerProps) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <OnboardingHeader currentStep={null} />

      <View style={styles.flex}>
        <QuestionHeadline>I'll need your camera.</QuestionHeadline>
        <QuestionSubhead>
          Thirty seconds a day. Everything stays on your phone — I never send
          your face anywhere.
        </QuestionSubhead>

        <View style={styles.mockWrap}>
          <PermissionMock
            title='"Pura" Would Like to Access the Camera'
            body="For daily skin scans. Stored only on this device."
          />
        </View>
      </View>

      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 40 }]}>
        <OnboardingPrimaryButton label="Continue." onPress={onContinue} />
      </View>
    </SafeAreaView>
  );
}

/**
 * Visual-only iOS permission dialog (§2.6). Two buttons are visual — the
 * real system prompt is fired on the next screen. Paper tone, never stock
 * iOS grey. Inter at dialog sizes.
 */
export function PermissionMock({ title, body }: { title: string; body: string }) {
  return (
    <View style={mock.card}>
      <View style={mock.inner}>
        <Text style={mock.title} maxFontSizeMultiplier={1.2}>
          {title}
        </Text>
        <Text style={mock.body} maxFontSizeMultiplier={1.2}>
          {body}
        </Text>
      </View>
      <View style={mock.divider} />
      <View style={mock.buttons}>
        <View style={[mock.buttonSlot, mock.buttonSlotRightBorder]}>
          <Text style={mock.dontAllow}>Don't Allow</Text>
        </View>
        <View style={mock.buttonSlot}>
          <Text style={mock.allow}>Allow</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  mockWrap: {
    alignItems: 'center',
    marginTop: 40,
  },
  ctaWrap: {
    paddingTop: 12,
  },
});

// v10.7 — the permission-mock card + its body / divider / border
// colors moved from the v5 warm-ink rgba set to palette tokens, so
// the CameraPrimer preview matches the rest of the cool-palette front
// door instead of reading as a faintly-sepia iOS sheet.
const mock = StyleSheet.create({
  card: {
    width: 280,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: 14,
    overflow: 'hidden',
  },
  inner: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: palette.ink,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: palette.hairline,
  },
  buttons: {
    flexDirection: 'row',
    height: 44,
  },
  buttonSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSlotRightBorder: {
    borderRightWidth: 1,
    borderRightColor: palette.hairline,
  },
  dontAllow: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: palette.clay,
  },
  allow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: palette.clay,
  },
});

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import {
  QuestionHeadline,
  QuestionSubhead,
} from '@/components/onboarding/Headline';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme';
import {
  effortLabel,
  genderLabel,
  goalLabel,
  sensitivityLabel,
  skinTypeLabel,
  sunExposureLabel,
} from './labelMaps';

export interface ProfileSummaryProps {
  onNext: () => void;
}

const EM_DASH = '\u2014';

/**
 * Profile summary (v7.5). Progress bar is hidden here — the spec's 11-step
 * scale enumerates question screens only; ProfileSummary is a review beat
 * between AskAttribution and NotificationPrimer. Seven display rows pulled
 * from the store through `labelMaps.ts`.
 */
export function ProfileSummary({ onNext }: ProfileSummaryProps) {
  const insets = useSafeAreaInsets();
  const age = useAppStore((s) => s.age);
  const gender = useAppStore((s) => s.gender);
  const skinType = useAppStore((s) => s.skinType);
  const concerns = useAppStore((s) => s.concerns);
  const sensitivity = useAppStore((s) => s.sensitivity);
  const sunExposure = useAppStore((s) => s.sunExposure);
  const effort = useAppStore((s) => s.effort);
  const goal = useAppStore((s) => s.goal);

  const rows: { kicker: string; value: string }[] = [
    {
      kicker: 'AGE \u00B7 GENDER',
      value: `${age ?? EM_DASH} \u00B7 ${genderLabel(gender)}`,
    },
    { kicker: 'SKIN TYPE', value: skinTypeLabel(skinType) },
    {
      kicker: 'FOCUS',
      value:
        concerns && concerns.length > 0
          ? concerns.join(' \u00B7 ')
          : EM_DASH,
    },
    { kicker: 'SENSITIVITY', value: sensitivityLabel(sensitivity) },
    { kicker: 'SUN', value: sunExposureLabel(sunExposure) },
    { kicker: 'EFFORT', value: effortLabel(effort) },
    { kicker: 'GOAL', value: goalLabel(goal) },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      {/* v7.5 — progress bar hidden on this review beat. */}
      <OnboardingHeader currentStep={null} totalSteps={11} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <QuestionHeadline>Here's your profile.</QuestionHeadline>
        <QuestionSubhead>
          I'll calibrate everything to this. You can change it anytime in
          settings.
        </QuestionSubhead>

        <View style={styles.rows}>
          {rows.map((r) => (
            <View key={r.kicker} style={styles.row}>
              <Text style={styles.kicker}>{r.kicker}</Text>
              <Text style={styles.value} maxFontSizeMultiplier={1.2}>
                {r.value}
              </Text>
              <View style={styles.divider} />
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 40 }]}>
        <OnboardingPrimaryButton label="Looks right." onPress={onNext} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  rows: {
    marginTop: 24,
    marginHorizontal: 24,
  },
  row: {
    paddingVertical: 12,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(26,22,20,0.6)',
  },
  value: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 22,
    lineHeight: 26,
    color: palette.clay,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(26,22,20,0.1)',
    marginTop: 12,
  },
  ctaWrap: {
    paddingTop: 12,
  },
});

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { OnboardingBackButton } from '@/components/onboarding/BackButton';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme';
import {
  effortLabel,
  goalLabel,
  hormoneContextLabel,
  ageRangeLabel,
  sensitivityLabel,
  skinTypeLabel,
  sunExposureLabel,
} from './labelMaps';

export interface ProfileSummaryProps {
  /**
   * v20.0 — ProfileSummary is no longer the emotional payoff of
   * onboarding (PlanReveal owns that). It now serves as the optional
   * "Review my answers" sub-route from PlanReveal: a tabular dump of
   * stored answers with a "Back to plan" CTA.
   */
  onNext: () => void;
}

const EM_DASH = '—';

export function ProfileSummary({ onNext }: ProfileSummaryProps) {
  const insets = useSafeAreaInsets();
  const ageRange = useAppStore((s) => s.ageRange);
  const hormoneContext = useAppStore((s) => s.hormoneContext);
  const skinType = useAppStore((s) => s.skinType);
  const concerns = useAppStore((s) => s.concerns);
  const sensitivity = useAppStore((s) => s.sensitivity);
  const sunExposure = useAppStore((s) => s.sunExposure);
  const effort = useAppStore((s) => s.effort);
  const goal = useAppStore((s) => s.goal);

  const rows: { kicker: string; value: string }[] = [
    { kicker: 'GOAL', value: goalLabel(goal) },
    {
      kicker: 'FOCUS',
      value:
        concerns && concerns.length > 0
          ? concerns.join(' · ')
          : EM_DASH,
    },
    { kicker: 'SKIN TYPE', value: skinTypeLabel(skinType) },
    { kicker: 'SENSITIVITY', value: sensitivityLabel(sensitivity) },
    { kicker: 'EFFORT', value: effortLabel(effort) },
    { kicker: 'SUN', value: sunExposureLabel(sunExposure) },
    { kicker: 'AGE RANGE', value: ageRangeLabel(ageRange) },
    { kicker: 'HORMONE CONTEXT', value: hormoneContextLabel(hormoneContext) },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <View style={[styles.topBar, { paddingTop: 16 }]}>
        <OnboardingBackButton visible onPress={onNext} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
          Your answers
        </Text>
        <Text style={styles.sub} maxFontSizeMultiplier={1.25}>
          Pura calibrates everything to these. You can change any of them
          later in your profile.
        </Text>

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

      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 28 }]}>
        <OnboardingPrimaryButton label="Back to my plan" onPress={onNext} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: palette.ink,
    marginHorizontal: 24,
    marginTop: 12,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: palette.inkSecondary,
    marginHorizontal: 24,
    marginTop: 8,
  },
  rows: {
    marginTop: 24,
    marginHorizontal: 24,
  },
  row: {
    paddingVertical: 14,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: palette.inkTertiary,
  },
  value: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: palette.ink,
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: palette.divider,
    marginTop: 14,
  },
  ctaWrap: {
    paddingTop: 12,
    backgroundColor: palette.bg,
  },
});

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { OnboardingHeader } from './OnboardingHeader';
import { QuestionHeadline, QuestionSubhead } from './Headline';
import { OnboardingPrimaryButton } from './PrimaryButton';
import { palette } from '@/theme';

export interface QuestionLayoutProps {
  step: number | null;
  totalSteps?: number;
  headline: string;
  subhead: string;
  showSkip?: boolean;
  onSkip?: () => void;
  /** The body — usually a ChoiceList, but may be a custom input (AskName, AskAge). */
  children: React.ReactNode;
  ctaLabel?: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  /** When true the body is allowed to expand and the CTA pins via absolute layout. */
  scrollable?: boolean;
}

/**
 * Standard question-screen shell (§3.1). Header (back + progress) → headline
 * → subhead → body → flex spacer → primary CTA pinned 40pt above safe-area.
 */
export function QuestionLayout({
  step,
  totalSteps = 10,
  headline,
  subhead,
  showSkip = false,
  onSkip,
  children,
  ctaLabel = 'Continue',
  onCta,
  ctaDisabled = false,
  scrollable = false,
}: QuestionLayoutProps) {
  const insets = useSafeAreaInsets();

  const bodyContent = (
    <>
      <QuestionHeadline>{headline}</QuestionHeadline>
      <QuestionSubhead>{subhead}</QuestionSubhead>
      {children}
    </>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <OnboardingHeader
        currentStep={step}
        totalSteps={totalSteps}
        showSkip={showSkip}
        onSkip={onSkip}
      />

      {scrollable ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          {bodyContent}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{bodyContent}</View>
      )}

      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 40 }]}>
        <OnboardingPrimaryButton
          label={ctaLabel}
          onPress={onCta}
          disabled={ctaDisabled}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  flex: { flex: 1 },
  ctaWrap: {
    paddingTop: 12,
  },
});

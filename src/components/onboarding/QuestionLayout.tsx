import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingHeader } from './OnboardingHeader';
import { QuestionHeadline, QuestionSubhead } from './Headline';
import { OnboardingPrimaryButton } from './PrimaryButton';
import { palette } from '@/theme';

export interface QuestionLayoutProps {
  step: number | null;
  totalSteps?: number;
  /** Short section label rendered above the progress bar, e.g. "Goal". */
  sectionLabel?: string;
  headline: string;
  subhead: string;
  showSkip?: boolean;
  onSkip?: () => void;
  /** The body — usually a ChoiceList, but may be a custom input (AskName, AskAge). */
  children: React.ReactNode;
  ctaLabel?: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  /**
   * v20.0 — short explanation rendered above the disabled CTA so the user
   * always knows what's needed to advance, e.g. "Choose one to continue".
   * Only shown when `ctaDisabled` is true.
   */
  disabledReason?: string;
  /**
   * Opt out of scrolling for screens with a single custom input (e.g. AskAge
   * with a picker that owns its own gesture). Defaults to `true` so every
   * multi-row question is reachable on small screens.
   */
  scrollable?: boolean;
  /**
   * v21.0 — optional Plan Impact slot rendered between `children` and
   * the sticky CTA. Lets every question explain *why* it asked. Stays
   * inside the scrollable region so a long option list doesn't push
   * the impact line off-screen on small devices.
   */
  planImpact?: React.ReactNode;
}

const CTA_BLOCK_HEIGHT = 56 + 40;
const CTA_FADE_HEIGHT = 48;

/**
 * v20.0 — standard question-screen shell.
 *
 * Layout:
 *   Header (back · progress + section label)
 *   → ScrollView { headline · subhead · children }
 *   → Soft fade above CTA
 *   → Sticky bottom: optional helper text + primary CTA
 *
 * The CTA always carries either an action verb (when enabled) or a
 * disabled-reason hint (when disabled) so the user is never staring at a
 * dead gray bar with no explanation.
 */
export function QuestionLayout({
  step,
  totalSteps = 8,
  sectionLabel,
  headline,
  subhead,
  showSkip = false,
  onSkip,
  children,
  ctaLabel = 'Continue',
  onCta,
  ctaDisabled = false,
  disabledReason,
  scrollable = true,
  planImpact,
}: QuestionLayoutProps) {
  const insets = useSafeAreaInsets();

  const bodyContent = (
    <>
      <QuestionHeadline>{headline}</QuestionHeadline>
      <QuestionSubhead>{subhead}</QuestionSubhead>
      {children}
      {planImpact}
    </>
  );

  const scrollBottomPad = CTA_BLOCK_HEIGHT + insets.bottom + 32;
  const showHint = ctaDisabled && !!disabledReason;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <OnboardingHeader
        currentStep={step}
        totalSteps={totalSteps}
        sectionLabel={sectionLabel}
        showSkip={showSkip}
        onSkip={onSkip}
      />

      {scrollable ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: scrollBottomPad }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {bodyContent}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{bodyContent}</View>
      )}

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(248,250,252,0)', palette.bg]}
        style={[
          styles.fadeMask,
          {
            height: CTA_FADE_HEIGHT,
            bottom: CTA_BLOCK_HEIGHT + insets.bottom - CTA_FADE_HEIGHT / 2,
          },
        ]}
      />

      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 28 }]}>
        {showHint ? (
          <Text
            style={styles.disabledHint}
            accessibilityLiveRegion="polite"
            maxFontSizeMultiplier={1.2}
          >
            {disabledReason}
          </Text>
        ) : null}
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
  fadeMask: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  ctaWrap: {
    paddingTop: 8,
    backgroundColor: palette.bg,
  },
  disabledHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkTertiary,
    textAlign: 'center',
    marginBottom: 10,
    marginHorizontal: 32,
  },
});

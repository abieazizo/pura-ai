import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
   * Opt out of scrolling for screens with a single custom input (e.g. AskAge
   * with a picker that owns its own gesture). Defaults to `true` so every
   * multi-row question is reachable on small screens.
   */
  scrollable?: boolean;
}

// CTA block is ~56 (button height) + 40 (bottom padding) + safe-area inset.
// The scrollView keeps enough bottom padding so the last answer clears the
// pinned CTA without getting hidden behind it.
const CTA_BLOCK_HEIGHT = 56 + 40;
const CTA_FADE_HEIGHT = 48;

/**
 * Standard question-screen shell (§3.1 / v10.6).
 *
 * Layout:
 *   Header (back + progress)
 *   → ScrollView {
 *       QuestionHeadline
 *       QuestionSubhead
 *       children (ChoiceList or custom input)
 *     }
 *   → Fade-gradient mask (bg → transparent, fades into the CTA block)
 *   → Primary CTA floating above safe-area
 *
 * v10.6 — scrolling is now the default. Prior default (`scrollable: false`)
 * clipped the last 1–3 answers on any screen with 5+ rows on an iPhone SE
 * or iPhone 13 mini — the CTA would overlap the final answer and users
 * had no way to reach or toggle it. The gradient above the CTA fades the
 * scroll content under it so long answer lists read cleanly.
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
  scrollable = true,
}: QuestionLayoutProps) {
  const insets = useSafeAreaInsets();

  const bodyContent = (
    <>
      <QuestionHeadline>{headline}</QuestionHeadline>
      <QuestionSubhead>{subhead}</QuestionSubhead>
      {children}
    </>
  );

  const scrollBottomPad = CTA_BLOCK_HEIGHT + insets.bottom + 24;

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
          contentContainerStyle={{ paddingBottom: scrollBottomPad }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {bodyContent}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{bodyContent}</View>
      )}

      {/* Gradient mask fades scroll content into the floating CTA so the
          edge between scroll and pinned action reads as a soft gradient,
          not a hard overlap. Height scales with the CTA block so the
          mask always stays continuous with the button backdrop. */}
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
  fadeMask: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  ctaWrap: {
    paddingTop: 12,
    backgroundColor: palette.bg,
  },
});

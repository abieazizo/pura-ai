import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { OnboardingBackButton } from './BackButton';
import { OnboardingProgressBar } from './ProgressBar';
import { OnboardingSkipButton } from './SkipButton';

export interface OnboardingHeaderProps {
  /** 1-based current step. `null` hides the progress bar. */
  currentStep: number | null;
  /** Total steps for the bar. Defaults to 8 (the rebuilt question arc). */
  totalSteps?: number;
  /** Short section label rendered above the bar, e.g. "Skin profile". */
  sectionLabel?: string;
  /** Show the back button. Defaults to true. */
  showBack?: boolean;
  /** Show a Skip button at top-right. Defaults to false. */
  showSkip?: boolean;
  onSkip?: () => void;
}

/**
 * v20.0 onboarding header band.
 *
 * Layout:
 *   [back 44x44]   ┌ progress block (label + bar) ┐   [skip / spacer 44x44]
 *
 * The progress block expands to fill — bar and step label render together
 * (or the bar renders alone when `sectionLabel` is omitted, preserving
 * legacy behavior).
 */
export function OnboardingHeader({
  currentStep,
  totalSteps = 8,
  sectionLabel,
  showBack = true,
  showSkip = false,
  onSkip,
}: OnboardingHeaderProps) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 12 }]}>
      <View style={styles.sideSlot}>
        <OnboardingBackButton
          visible={showBack}
          onPress={() => nav.goBack()}
        />
      </View>

      <View style={styles.barSlot}>
        <OnboardingProgressBar
          current={currentStep ?? 0}
          total={totalSteps}
          visible={currentStep !== null}
          sectionLabel={sectionLabel}
        />
      </View>

      <View style={[styles.sideSlot, styles.rightSlot]}>
        <OnboardingSkipButton
          visible={showSkip}
          onPress={onSkip ?? (() => {})}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 18,
    gap: 12,
  },
  sideSlot: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightSlot: {
    alignItems: 'flex-end',
  },
  barSlot: {
    flex: 1,
    justifyContent: 'center',
  },
});

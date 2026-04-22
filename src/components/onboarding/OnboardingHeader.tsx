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
  /** Total steps for the bar. Defaults to 10 (the question + summary arc). */
  totalSteps?: number;
  /** Show the back button. Defaults to true. */
  showBack?: boolean;
  /** Show a Skip button at top-right. Defaults to false. */
  showSkip?: boolean;
  onSkip?: () => void;
}

/**
 * Header band for onboarding screens (§2.4). BackButton top-left, ProgressBar
 * top-center between the two side slots, optional SkipButton top-right. All
 * positioned above the content — never overlapping.
 */
export function OnboardingHeader({
  currentStep,
  totalSteps = 10,
  showBack = true,
  showSkip = false,
  onSkip,
}: OnboardingHeaderProps) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 16 }]}>
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
    paddingBottom: 16,
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

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Target,
  Thermometer,
  DropSlash,
  Waves,
  CircleNotch,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import {
  OnboardingScreenShellV2,
  EditorialHeadline,
  BodyText,
  SelectCard,
  PURA,
} from '@/components/onboarding/v2';
import {
  useOnboardingV2,
  bridgeOnboardingToCanonical,
  type PrimaryGoal,
} from '@/state/onboardingV2';
import { onboardingV2 } from '@/ai/onboardingAnalyticsV2';

export interface PrimaryGoalV2Props {
  onNext: () => void;
}

const OPTIONS: ReadonlyArray<{
  value: PrimaryGoal;
  label: string;
  helper: string;
  Icon: React.ComponentType<PhosphorIconProps>;
}> = [
  {
    value: 'breakouts',
    label: 'Breakouts',
    helper: 'Pimples, clogged pores, flare-ups',
    Icon: Target,
  },
  {
    value: 'redness',
    label: 'Redness',
    helper: 'Irritation, flushing, sensitivity',
    Icon: Thermometer,
  },
  {
    value: 'dryness',
    label: 'Dryness',
    helper: 'Tightness, flakes, barrier stress',
    Icon: DropSlash,
  },
  {
    value: 'texture',
    label: 'Texture',
    helper: 'Roughness, bumps, uneven surface',
    Icon: Waves,
  },
  {
    value: 'darkSpots',
    label: 'Dark spots',
    helper: 'Post-breakout marks, uneven tone',
    Icon: CircleNotch,
  },
];

/**
 * v25 — Primary Goal.
 *
 * One choice. The selection becomes the scan's framing lens — it does not
 * become a scan-detected signal. Progress label reads "SET UP YOUR FIRST
 * SCAN · 1 OF 2" to set the expectation that this is *short*, not the
 * start of a seven-step quiz.
 */
export function PrimaryGoalV2({ onNext }: PrimaryGoalV2Props) {
  const primaryGoal = useOnboardingV2((s) => s.primaryGoal);
  const setPrimaryGoal = useOnboardingV2((s) => s.setPrimaryGoal);

  useEffect(() => {
    onboardingV2.viewGoal();
  }, []);

  const handleSelect = (goal: PrimaryGoal) => {
    setPrimaryGoal(goal);
    bridgeOnboardingToCanonical();
    onboardingV2.goalSelected(goal);
  };

  const ctaLabel = primaryGoal ? 'Continue' : 'Choose a focus';
  const disabled = !primaryGoal;

  return (
    <OnboardingScreenShellV2
      topBar={{
        progress: { fill: 0.5, label: 'Set up your first scan · 1 of 2' },
      }}
      bottom={{
        primaryLabel: ctaLabel,
        onPrimary: () => primaryGoal && onNext(),
        primaryDisabled: disabled,
        disabledReason: 'Choose a focus to continue',
      }}
    >
      <View style={styles.head}>
        <EditorialHeadline style={styles.headline}>
          {'What would you like\nhelp with first?'}
        </EditorialHeadline>
        <BodyText style={styles.lead}>
          Choose one focus. Your scan will help Pura understand what to
          prioritize.
        </BodyText>
      </View>
      <View style={styles.list}>
        {OPTIONS.map((opt) => (
          <SelectCard
            key={opt.value}
            label={opt.label}
            helper={opt.helper}
            Icon={opt.Icon}
            selected={primaryGoal === opt.value}
            onSelect={() => handleSelect(opt.value)}
          />
        ))}
      </View>
    </OnboardingScreenShellV2>
  );
}

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 24,
  },
  headline: {
    fontSize: 32,
    lineHeight: 36,
    color: PURA.ink,
  },
  lead: {
    marginTop: 12,
    maxWidth: 380,
  },
  list: {
    paddingHorizontal: 24,
    gap: 10,
  },
});

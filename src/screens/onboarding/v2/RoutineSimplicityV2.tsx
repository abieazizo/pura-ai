import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Lightning,
  Clock,
  MagicWand,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import {
  OnboardingScreenShellV2,
  FunctionalHeadline,
  BodyText,
  SelectCard,
  PURA,
} from '@/components/onboarding/v2';
import {
  useOnboardingV2,
  bridgeOnboardingToCanonical,
  type RoutineSimplicity,
} from '@/state/onboardingV2';
import { generateRoutineStrategyV2 } from '@/state/routineStrategyV2';
import { onboardingV2 } from '@/ai/onboardingAnalyticsV2';

export interface RoutineSimplicityV2Props {
  onNext: () => void;
}

const OPTIONS: ReadonlyArray<{
  value: RoutineSimplicity;
  label: string;
  helper: string;
  Icon: React.ComponentType<PhosphorIconProps>;
}> = [
  {
    value: 'essential',
    label: 'Essential',
    helper: 'Under 3 minutes — cleanse, moisturize, protect',
    Icon: Lightning,
  },
  {
    value: 'balanced',
    label: 'Balanced',
    helper: 'A few purposeful steps that still feel manageable',
    Icon: Clock,
  },
  {
    value: 'decideForMe',
    label: 'Decide for me',
    helper: 'Start gently and adjust after future scans',
    Icon: MagicWand,
  },
];

/**
 * v25 — Routine Simplicity.
 *
 * Personalises the starting routine around adherence — not advanced
 * skincare. The "Advanced — 5+ steps, actives and rotation" option is
 * deliberately absent from first-run onboarding.
 *
 * Recommended badge appears only when there's a grounded reason for it:
 * if the user said their skin reacts "often" or they're "unsure", we
 * gently recommend either Essential or Decide for me. Otherwise we let
 * the user choose without nudging.
 */
export function RoutineSimplicityV2({ onNext }: RoutineSimplicityV2Props) {
  const routineSimplicity = useOnboardingV2((s) => s.routineSimplicity);
  const setRoutineSimplicity = useOnboardingV2(
    (s) => s.setRoutineSimplicity
  );
  const productReactivity = useOnboardingV2((s) => s.productReactivity);
  const primaryGoal = useOnboardingV2((s) => s.primaryGoal);
  const scan = useOnboardingV2((s) => s.scanAnalysisResult);
  const setGeneratedRoutineStrategy = useOnboardingV2(
    (s) => s.setGeneratedRoutineStrategy
  );

  const cautious =
    productReactivity === 'often' || productReactivity === 'unsure';
  const recommendedValue: RoutineSimplicity | null = cautious
    ? 'essential'
    : null;

  useEffect(() => {
    // No explicit "view" event — the host transition emits enough.
  }, []);

  const handleSelect = (value: RoutineSimplicity) => {
    setRoutineSimplicity(value);
    bridgeOnboardingToCanonical();
    onboardingV2.routineSimplicitySelected(value);
  };

  const handleContinue = () => {
    if (!routineSimplicity || !primaryGoal || !scan || !productReactivity) {
      return;
    }
    const strategy = generateRoutineStrategyV2({
      primaryGoal,
      scan,
      productReactivity,
      routineSimplicity,
    });
    setGeneratedRoutineStrategy(strategy);
    onboardingV2.routineCreated({
      tone: strategy.tone,
      stepCount: strategy.steps.length,
    });
    onNext();
  };

  return (
    <OnboardingScreenShellV2
      topBar={{ showBack: true }}
      bottom={{
        primaryLabel: routineSimplicity
          ? 'Create my routine'
          : 'Choose one to continue',
        onPrimary: handleContinue,
        primaryDisabled: !routineSimplicity,
        disabledReason: 'Choose one to continue',
      }}
    >
      <View style={styles.head}>
        <FunctionalHeadline style={styles.headline}>
          How simple should your routine feel?
        </FunctionalHeadline>
        <BodyText style={styles.lead}>
          The best plan is the one you will actually follow.
        </BodyText>
      </View>
      <View style={styles.list}>
        {OPTIONS.map((opt) => (
          <SelectCard
            key={opt.value}
            label={opt.label}
            helper={opt.helper}
            Icon={opt.Icon}
            selected={routineSimplicity === opt.value}
            badge={
              opt.value === recommendedValue
                ? 'Recommended when starting cautiously'
                : undefined
            }
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
  headline: { color: PURA.ink },
  lead: { marginTop: 12, maxWidth: 380 },
  list: {
    paddingHorizontal: 24,
    gap: 10,
  },
});

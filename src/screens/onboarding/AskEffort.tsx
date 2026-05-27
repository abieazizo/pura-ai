import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Lightning,
  Clock,
  Crown,
  MagicWand,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { QuestionLayout } from '@/components/onboarding/QuestionLayout';
import { ChoiceList } from '@/components/onboarding/ChoiceList';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';
import { PlanImpactCard } from '@/components/onboarding/PlanImpactCard';
import { useAppStore } from '@/store/useAppStore';
import { planImpactForEffort } from '@/state/onboardingProfile';
import { palette } from '@/theme';

export interface AskEffortProps {
  onNext: () => void;
}

/**
 * v21.0 — Screen 4: routine style.
 *
 * Stored enum stays stable for back-compat (`minimal | moderate |
 * enthusiast | decide-for-me`); display labels match the rebuild spec
 * ("Balanced", "Advanced", "Decide for me"). The "Balanced" option
 * carries a recommended badge so picking is easy but the user knows
 * we're not forcing them.
 */
// v24.0 — typed shape so TS recognizes the optional `recommended`
// flag on a subset of rows. Without this, TS infers a union type per
// row and accessing `r.recommended` errors when the row that doesn't
// have it is selected.
type EffortRow = {
  value: 'minimal' | 'moderate' | 'enthusiast' | 'decide-for-me';
  Icon: React.ComponentType<PhosphorIconProps>;
  label: string;
  helper: string;
  recommended?: boolean;
};

const ROWS: readonly EffortRow[] = [
  {
    value: 'minimal',
    Icon: Lightning,
    label: 'Minimal',
    helper: '2–3 steps, under 3 minutes',
  },
  {
    value: 'moderate',
    Icon: Clock,
    label: 'Balanced',
    helper: '3–5 steps, enough for most goals',
    recommended: true,
  },
  {
    value: 'enthusiast',
    Icon: Crown,
    label: 'Advanced',
    helper: '5+ steps, actives and rotation',
  },
  {
    value: 'decide-for-me',
    Icon: MagicWand,
    label: 'Decide for me',
    helper: 'Start simple and adjust after scans',
  },
];

export function AskEffort({ onNext }: AskEffortProps) {
  const effort = useAppStore((s) => s.effort);
  const setEffort = useAppStore((s) => s.setEffort);

  const planImpactMessage = planImpactForEffort(effort);

  return (
    <QuestionLayout
      step={4}
      totalSteps={7}
      sectionLabel="Routine"
      headline="How much routine will you actually do?"
      subhead="A routine you can stick to beats a perfect one you quit."
      ctaLabel={effort ? 'Set routine style' : 'Choose one to continue'}
      ctaDisabled={!effort}
      disabledReason="Choose one to continue"
      onCta={() => effort && onNext()}
      planImpact={<PlanImpactCard message={planImpactMessage} />}
    >
      <ChoiceList>
        {ROWS.map((r) => (
          <ChoiceRow
            key={r.value}
            Icon={r.Icon}
            label={r.label}
            helper={r.helper}
            tall
            selected={effort === r.value}
            badge={r.recommended ? 'Recommended' : undefined}
            onToggle={() => setEffort(r.value)}
          />
        ))}
      </ChoiceList>
      {effort === 'enthusiast' ? (
        <View style={styles.advancedNote}>
          <Text style={styles.advancedNoteText} maxFontSizeMultiplier={1.25}>
            More steps doesn’t mean faster results. Pura will still protect
            your barrier.
          </Text>
        </View>
      ) : null}
    </QuestionLayout>
  );
}

const styles = StyleSheet.create({
  advancedNote: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  advancedNoteText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
  },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Target,
  Thermometer,
  DropSlash,
  Waves,
  CircleNotch,
  CircleHalf,
  Drop,
  Sparkle,
} from 'phosphor-react-native';
import { QuestionLayout } from '@/components/onboarding/QuestionLayout';
import { ChoiceList } from '@/components/onboarding/ChoiceList';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';
import { PlanImpactCard } from '@/components/onboarding/PlanImpactCard';
import { useAppStore } from '@/store/useAppStore';
import { hapt } from '@/utils/haptics';
import { planImpactForConcerns } from '@/state/onboardingProfile';
import { palette } from '@/theme';

export interface AskConcernsProps {
  onNext: () => void;
}

const MAX_CONCERNS = 3;

const ROWS = [
  { value: 'Breakouts', Icon: Target, helper: 'Pimples, clogged pores, flare-ups' },
  { value: 'Redness', Icon: Thermometer, helper: 'Flushing, irritation, inflammation' },
  { value: 'Dryness', Icon: DropSlash, helper: 'Tightness, flakes, barrier stress' },
  { value: 'Texture', Icon: Waves, helper: 'Bumps, roughness, uneven surface' },
  { value: 'Dark spots', Icon: CircleNotch, helper: 'Post-acne marks, uneven tone' },
  { value: 'Dullness', Icon: CircleHalf, helper: 'Flat tone, low glow, tired-looking skin' },
  { value: 'Oiliness', Icon: Drop, helper: 'Shine, congestion, midday grease' },
  { value: 'Sensitivity', Icon: Sparkle, helper: 'Stinging, burning, product reactions' },
] as const;

/**
 * v21.0 — Concerns.
 *
 * Eight spec options, multi-select capped at 3. Counter label reads
 * "0 of 3 selected" → "3 of 3 selected" beside the section so the user
 * always knows where they stand. PlanImpact card swaps in once at
 * least one concern is chosen and updates as the set changes.
 */
export function AskConcerns({ onNext }: AskConcernsProps) {
  const concerns = useAppStore((s) => s.concerns);
  const setConcerns = useAppStore((s) => s.setConcerns);

  const toggle = (value: string) => {
    if (concerns.includes(value)) {
      setConcerns(concerns.filter((c) => c !== value));
      return;
    }
    if (concerns.length >= MAX_CONCERNS) {
      hapt.warning();
      return;
    }
    setConcerns([...concerns, value]);
  };

  const count = concerns.length;
  const capReached = count >= MAX_CONCERNS;
  const ctaLabel =
    count === 0
      ? 'Pick at least one'
      : count === 1
      ? 'Continue with 1 concern'
      : `Continue with ${count} concerns`;

  const planImpactMessage = planImpactForConcerns(concerns);
  const counterText = `${count} of ${MAX_CONCERNS} selected`;

  return (
    <QuestionLayout
      step={2}
      totalSteps={7}
      sectionLabel="Focus"
      headline="What should Pura watch first?"
      subhead="Choose up to 3. These will guide your scans, routine changes, and product matches."
      ctaLabel={ctaLabel}
      ctaDisabled={count === 0}
      disabledReason="Pick at least one concern to continue"
      onCta={() => count > 0 && onNext()}
      planImpact={<PlanImpactCard message={planImpactMessage} />}
    >
      <View style={styles.counterRow}>
        <Text style={styles.counter} maxFontSizeMultiplier={1.2}>
          {counterText}
        </Text>
        {capReached ? (
          <Text style={styles.counterHint} maxFontSizeMultiplier={1.2}>
            Choose up to {MAX_CONCERNS} so your plan stays focused.
          </Text>
        ) : null}
      </View>
      <ChoiceList>
        {ROWS.map((r) => {
          const isSelected = concerns.includes(r.value);
          return (
            <ChoiceRow
              key={r.value}
              Icon={r.Icon}
              label={r.value}
              helper={r.helper}
              tall
              multiSelect
              disabled={!isSelected && capReached}
              accessibilityLabel={
                isSelected
                  ? `${r.value}, selected, ${count} of ${MAX_CONCERNS} priorities chosen`
                  : `${r.value}. ${r.helper}`
              }
              selected={isSelected}
              onToggle={() => toggle(r.value)}
            />
          );
        })}
      </ChoiceList>
    </QuestionLayout>
  );
}

const styles = StyleSheet.create({
  counterRow: {
    marginHorizontal: 24,
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  counter: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: palette.inkTertiary,
  },
  counterHint: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.inkSecondary,
  },
});

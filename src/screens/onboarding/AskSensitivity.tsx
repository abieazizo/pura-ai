import React from 'react';
import { DropHalf, Shield, Question, Sparkle } from 'phosphor-react-native';
import { QuestionLayout } from '@/components/onboarding/QuestionLayout';
import { ChoiceList } from '@/components/onboarding/ChoiceList';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';
import { useAppStore } from '@/store/useAppStore';

export interface AskSensitivityProps {
  onNext: () => void;
}

// Phosphor ships `Sparkle` but not `Spark` — they're visually interchangeable
// for this meaning (a small bright mark). Logged as a tiny substitution.
const ROWS = [
  {
    value: 'very',
    Icon: Sparkle,
    label: 'Very sensitive',
    helper: 'New products often cause redness or breakouts',
  },
  {
    value: 'somewhat',
    Icon: DropHalf,
    label: 'Somewhat sensitive',
    helper: 'Occasional reactions to actives',
  },
  {
    value: 'not',
    Icon: Shield,
    label: 'Not sensitive',
    helper: 'My skin takes most products in stride',
  },
  {
    value: 'unsure',
    Icon: Question,
    label: 'Not sure',
    helper: 'Figure it out as we go',
  },
] as const;

export function AskSensitivity({ onNext }: AskSensitivityProps) {
  const sensitivity = useAppStore((s) => s.sensitivity);
  const setSensitivity = useAppStore((s) => s.setSensitivity);

  return (
    <QuestionLayout
      step={6}
      totalSteps={11}
      headline="How sensitive is your skin?"
      subhead="I'll avoid surprises — no ingredients your skin will fight."
      ctaDisabled={!sensitivity}
      onCta={() => sensitivity && onNext()}
    >
      <ChoiceList>
        {ROWS.map((r) => (
          <ChoiceRow
            key={r.value}
            Icon={r.Icon}
            label={r.label}
            helper={r.helper}
            tall
            selected={sensitivity === r.value}
            onToggle={() => setSensitivity(r.value)}
          />
        ))}
      </ChoiceList>
    </QuestionLayout>
  );
}

import React from 'react';
import { Sparkle, DropHalf, Shield, Question } from 'phosphor-react-native';
import { QuestionLayout } from '@/components/onboarding/QuestionLayout';
import { ChoiceList } from '@/components/onboarding/ChoiceList';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';
import { useAppStore } from '@/store/useAppStore';

export interface AskSensitivityProps {
  onNext: () => void;
}

const ROWS = [
  {
    value: 'very',
    Icon: Sparkle,
    label: 'Very reactive',
    helper: 'New products often cause redness, stinging, or breakouts',
  },
  {
    value: 'somewhat',
    Icon: DropHalf,
    label: 'Somewhat reactive',
    helper: 'I occasionally react to actives',
  },
  {
    value: 'not',
    Icon: Shield,
    label: 'Not very reactive',
    helper: 'My skin usually handles new products well',
  },
  {
    value: 'unsure',
    Icon: Question,
    label: 'Not sure',
    helper: 'Help me figure it out',
  },
] as const;

/**
 * v20.0 — Screen 5: reactivity.
 *
 * Reframed from "How sensitive is your skin?" → "How reactive is your
 * skin?" to align with how dermatology actually thinks about this
 * (reactivity is observable; sensitivity is a self-label). Avoids
 * over-promising "no ingredients your skin will fight" — the
 * ingredient engine isn't authoritative yet.
 */
export function AskSensitivity({ onNext }: AskSensitivityProps) {
  const sensitivity = useAppStore((s) => s.sensitivity);
  const setSensitivity = useAppStore((s) => s.setSensitivity);

  return (
    <QuestionLayout
      step={4}
      totalSteps={8}
      sectionLabel="Skin profile"
      headline="How reactive is your skin?"
      subhead="This helps Pura avoid aggressive actives and introduce changes slowly."
      ctaLabel={sensitivity ? 'Set sensitivity' : 'Choose one to continue'}
      ctaDisabled={!sensitivity}
      disabledReason="Choose one to continue"
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

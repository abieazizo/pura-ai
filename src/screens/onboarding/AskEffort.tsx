import React from 'react';
import { Lightning, Clock, Crown, MagicWand } from 'phosphor-react-native';
import { QuestionLayout } from '@/components/onboarding/QuestionLayout';
import { ChoiceList } from '@/components/onboarding/ChoiceList';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';
import { useAppStore } from '@/store/useAppStore';

export interface AskEffortProps {
  onNext: () => void;
}

const ROWS = [
  {
    value: 'minimal',
    Icon: Lightning,
    label: 'Minimal',
    helper: 'One to three steps. Fast.',
  },
  {
    value: 'moderate',
    Icon: Clock,
    label: 'Moderate',
    helper: 'Three to five steps. Reasonable.',
  },
  {
    value: 'enthusiast',
    Icon: Crown,
    label: 'Enthusiast',
    helper: 'Five or more steps. I enjoy it.',
  },
  {
    value: 'decide-for-me',
    Icon: MagicWand,
    label: 'Decide for me',
    helper: 'Build what makes sense',
  },
] as const;

export function AskEffort({ onNext }: AskEffortProps) {
  const effort = useAppStore((s) => s.effort);
  const setEffort = useAppStore((s) => s.setEffort);

  return (
    <QuestionLayout
      step={8}
      totalSteps={11}
      headline="How much effort do you want to put in?"
      subhead="There's no right answer. This sets the length of your routine."
      ctaDisabled={!effort}
      onCta={() => effort && onNext()}
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
            onToggle={() => setEffort(r.value)}
          />
        ))}
      </ChoiceList>
    </QuestionLayout>
  );
}

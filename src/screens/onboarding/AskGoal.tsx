import React from 'react';
import { CircleNotch, Heart, Sparkle } from 'phosphor-react-native';
import { QuestionLayout } from '@/components/onboarding/QuestionLayout';
import { ChoiceList } from '@/components/onboarding/ChoiceList';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';
import { useAppStore } from '@/store/useAppStore';

export interface AskGoalProps {
  onNext: () => void;
}

const ROWS = [
  {
    value: 'clear',
    Icon: CircleNotch,
    label: 'Clearer skin',
    helper: 'Fewer breakouts, calmer texture',
  },
  {
    value: 'calm',
    Icon: Heart,
    label: 'Calmer skin',
    helper: 'Less redness, less reactivity',
  },
  {
    value: 'bright',
    Icon: Sparkle,
    label: 'Brighter skin',
    helper: 'More even tone, more glow',
  },
] as const;

export function AskGoal({ onNext }: AskGoalProps) {
  const goal = useAppStore((s) => s.goal);
  const setGoal = useAppStore((s) => s.setGoal);

  return (
    <QuestionLayout
      step={9}
      totalSteps={11}
      headline="What do you want to see in 84 days?"
      subhead="One skin cycle. This is what I'll optimize for."
      ctaDisabled={!goal}
      onCta={() => goal && onNext()}
    >
      <ChoiceList>
        {ROWS.map((r) => (
          <ChoiceRow
            key={r.value}
            Icon={r.Icon}
            label={r.label}
            helper={r.helper}
            tall
            selected={goal === r.value}
            onToggle={() => setGoal(r.value)}
          />
        ))}
      </ChoiceList>
    </QuestionLayout>
  );
}

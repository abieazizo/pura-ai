import React from 'react';
import {
  Target,
  Waves,
  Thermometer,
  CircleHalf,
  LineSegments,
  Circle,
} from 'phosphor-react-native';
import { QuestionLayout } from '@/components/onboarding/QuestionLayout';
import { ChoiceList } from '@/components/onboarding/ChoiceList';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';
import { useAppStore } from '@/store/useAppStore';

export interface AskConcernsProps {
  onNext: () => void;
}

const ROWS = [
  { value: 'Breakouts', Icon: Target },
  { value: 'Texture', Icon: Waves },
  { value: 'Redness', Icon: Thermometer },
  { value: 'Dullness', Icon: CircleHalf },
  { value: 'Fine lines', Icon: LineSegments },
  { value: 'Dark spots', Icon: Circle },
] as const;

/**
 * AskConcerns (§3.5). Multi-select — each row toggles independently. At
 * least one selection required to advance.
 */
export function AskConcerns({ onNext }: AskConcernsProps) {
  const concerns = useAppStore((s) => s.concerns);
  const setConcerns = useAppStore((s) => s.setConcerns);

  const toggle = (value: string) => {
    if (concerns.includes(value)) {
      setConcerns(concerns.filter((c) => c !== value));
    } else {
      setConcerns([...concerns, value]);
    }
  };

  return (
    <QuestionLayout
      step={5}
      totalSteps={11}
      headline="What are you working on?"
      subhead="Pick as many as apply. I'll prioritize these."
      ctaDisabled={concerns.length < 1}
      onCta={() => concerns.length >= 1 && onNext()}
    >
      <ChoiceList>
        {ROWS.map((r) => (
          <ChoiceRow
            key={r.value}
            Icon={r.Icon}
            label={r.value}
            selected={concerns.includes(r.value)}
            onToggle={() => toggle(r.value)}
          />
        ))}
      </ChoiceList>
    </QuestionLayout>
  );
}

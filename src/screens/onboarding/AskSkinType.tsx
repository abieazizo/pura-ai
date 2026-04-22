import React from 'react';
import { Drop, DropHalf, DropSlash, Leaf } from 'phosphor-react-native';
import { QuestionLayout } from '@/components/onboarding/QuestionLayout';
import { ChoiceList } from '@/components/onboarding/ChoiceList';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';
import { useAppStore } from '@/store/useAppStore';

export interface AskSkinTypeProps {
  onNext: () => void;
}

const ROWS = [
  { value: 'oily', Icon: Drop, label: 'Oily', helper: 'Shiny by midday' },
  {
    value: 'dry',
    Icon: DropSlash,
    label: 'Dry',
    helper: 'Tight, sometimes flaky',
  },
  {
    value: 'combination',
    Icon: DropHalf,
    label: 'Combination',
    helper: 'Oily T-zone, dry cheeks',
  },
  {
    value: 'sensitive',
    Icon: Leaf,
    label: 'Sensitive',
    helper: 'Reacts to new products',
  },
] as const;

export function AskSkinType({ onNext }: AskSkinTypeProps) {
  const skinType = useAppStore((s) => s.skinType);
  const setSkinType = useAppStore((s) => s.setSkinType);

  return (
    <QuestionLayout
      step={4}
      totalSteps={11}
      headline="What's your skin type?"
      subhead="If you're not sure, pick what's most true most of the time."
      ctaDisabled={!skinType}
      onCta={() => skinType && onNext()}
    >
      <ChoiceList>
        {ROWS.map((r) => (
          <ChoiceRow
            key={r.value}
            Icon={r.Icon}
            label={r.label}
            helper={r.helper}
            tall
            selected={skinType === r.value}
            onToggle={() => setSkinType(r.value)}
          />
        ))}
      </ChoiceList>
    </QuestionLayout>
  );
}

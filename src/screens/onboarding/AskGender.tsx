import React from 'react';
import { QuestionLayout } from '@/components/onboarding/QuestionLayout';
import { ChoiceList } from '@/components/onboarding/ChoiceList';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';
import { useAppStore } from '@/store/useAppStore';

export interface AskGenderProps {
  onNext: () => void;
}

const ROWS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
] as const;

/**
 * AskGender (§2.3). Iconless rows — gender icons feel reductive, so the
 * ChoiceRow renders with `Icon={null}`. Single-select radio behaviour.
 */
export function AskGender({ onNext }: AskGenderProps) {
  const gender = useAppStore((s) => s.gender);
  const setGender = useAppStore((s) => s.setGender);

  return (
    <QuestionLayout
      step={3}
      totalSteps={11}
      headline="What's your gender?"
      subhead="Hormones affect skin. I use this to calibrate, nothing else."
      ctaDisabled={!gender}
      onCta={() => gender && onNext()}
    >
      <ChoiceList>
        {ROWS.map((r) => (
          <ChoiceRow
            key={r.value}
            Icon={null}
            label={r.label}
            selected={gender === r.value}
            onToggle={() => setGender(r.value)}
          />
        ))}
      </ChoiceList>
    </QuestionLayout>
  );
}

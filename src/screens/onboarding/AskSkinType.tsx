import React from 'react';
import {
  Drop,
  DropHalf,
  DropSlash,
  CircleHalf,
  Question,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { QuestionLayout } from '@/components/onboarding/QuestionLayout';
import { ChoiceList } from '@/components/onboarding/ChoiceList';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';
import { useAppStore, type AppState } from '@/store/useAppStore';

export interface AskSkinTypeProps {
  onNext: () => void;
}

/**
 * v20.0 — Screen 4: skin type.
 *
 * "Sensitive" is removed (sensitivity gets its own screen). "Balanced"
 * and "Not sure" are added; the latter is honest about the fact that
 * the first scan refines this anyway.
 */
const ROWS: ReadonlyArray<{
  value: NonNullable<AppState['skinType']>;
  Icon: React.ComponentType<PhosphorIconProps>;
  label: string;
  helper: string;
}> = [
  { value: 'oily', Icon: Drop, label: 'Oily', helper: 'Shiny by midday' },
  { value: 'dry', Icon: DropSlash, label: 'Dry', helper: 'Tight, sometimes flaky' },
  {
    value: 'combination',
    Icon: DropHalf,
    label: 'Combination',
    helper: 'Oily T-zone, dry cheeks',
  },
  {
    value: 'balanced',
    Icon: CircleHalf,
    label: 'Balanced',
    helper: 'Usually comfortable',
  },
  {
    value: 'not_sure',
    Icon: Question,
    label: 'Not sure',
    helper: 'Help me figure it out',
  },
];

export function AskSkinType({ onNext }: AskSkinTypeProps) {
  const skinType = useAppStore((s) => s.skinType);
  const setSkinType = useAppStore((s) => s.setSkinType);
  // v20.0 — fold any legacy 'sensitive' value to 'combination' for the
  // selected highlight so old profiles don't look unselected.
  const selectedValue =
    skinType === 'sensitive' ? 'combination' : skinType;

  return (
    <QuestionLayout
      step={3}
      totalSteps={8}
      sectionLabel="Skin profile"
      headline="What best describes your skin most days?"
      subhead="Not sure? Pick the closest — scans can refine this later."
      ctaLabel={skinType ? 'Set my skin type' : 'Choose one to continue'}
      ctaDisabled={!skinType}
      disabledReason="Choose one to continue"
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
            selected={selectedValue === r.value}
            onToggle={() => setSkinType(r.value)}
          />
        ))}
      </ChoiceList>
    </QuestionLayout>
  );
}

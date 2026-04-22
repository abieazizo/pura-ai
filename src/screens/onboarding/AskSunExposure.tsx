import React from 'react';
import { HouseLine, Sun, SunHorizon, Question } from 'phosphor-react-native';
import { QuestionLayout } from '@/components/onboarding/QuestionLayout';
import { ChoiceList } from '@/components/onboarding/ChoiceList';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';
import { useAppStore } from '@/store/useAppStore';

export interface AskSunExposureProps {
  onNext: () => void;
}

const ROWS = [
  {
    value: 'rarely',
    Icon: HouseLine,
    label: 'Rarely',
    helper: 'Mostly indoors \u2014 under an hour outside',
  },
  {
    value: 'sometimes',
    Icon: Sun,
    label: 'Sometimes',
    helper: 'One to three hours on an average day',
  },
  {
    value: 'often',
    Icon: SunHorizon,
    label: 'Often',
    helper: 'Three or more hours outdoors daily',
  },
  {
    value: 'unsure',
    Icon: Question,
    label: 'Not sure',
    helper: 'It varies a lot',
  },
] as const;

export function AskSunExposure({ onNext }: AskSunExposureProps) {
  const sunExposure = useAppStore((s) => s.sunExposure);
  const setSunExposure = useAppStore((s) => s.setSunExposure);

  return (
    <QuestionLayout
      step={7}
      totalSteps={11}
      headline="How much sun do you get?"
      subhead="Sun is the biggest aging variable. I'll scale SPF guidance to your life."
      ctaDisabled={!sunExposure}
      onCta={() => sunExposure && onNext()}
    >
      <ChoiceList>
        {ROWS.map((r) => (
          <ChoiceRow
            key={r.value}
            Icon={r.Icon}
            label={r.label}
            helper={r.helper}
            tall
            selected={sunExposure === r.value}
            onToggle={() => setSunExposure(r.value)}
          />
        ))}
      </ChoiceList>
    </QuestionLayout>
  );
}

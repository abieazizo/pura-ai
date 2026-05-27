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
    label: 'Mostly indoors',
    helper: 'Less than 1 hour outside',
  },
  {
    value: 'sometimes',
    Icon: Sun,
    label: 'Mixed',
    helper: '1–3 hours outside',
  },
  {
    value: 'often',
    Icon: SunHorizon,
    label: 'Outdoors often',
    helper: '3+ hours outside',
  },
  {
    value: 'unsure',
    Icon: Question,
    label: 'It changes',
    helper: 'My schedule varies',
  },
] as const;

/**
 * v20.0 — Screen 7: sun / lifestyle.
 *
 * Honest copy: SPF guidance is real, the local UV index integration
 * isn't. The subhead avoids over-promising "we'll use your local UV"
 * because that path doesn't exist yet.
 */
export function AskSunExposure({ onNext }: AskSunExposureProps) {
  const sunExposure = useAppStore((s) => s.sunExposure);
  const setSunExposure = useAppStore((s) => s.setSunExposure);

  return (
    <QuestionLayout
      step={6}
      totalSteps={8}
      sectionLabel="Lifestyle"
      headline="How much direct sun do you usually get?"
      subhead="This tunes SPF guidance around your lifestyle."
      ctaLabel="Continue"
      ctaDisabled={!sunExposure}
      disabledReason="Choose one to continue"
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

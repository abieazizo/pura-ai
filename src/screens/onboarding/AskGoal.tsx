import React from 'react';
import {
  CircleNotch,
  Heart,
  Waves,
  Sun,
  Shield,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { QuestionLayout } from '@/components/onboarding/QuestionLayout';
import { ChoiceList } from '@/components/onboarding/ChoiceList';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';
import { PlanImpactCard } from '@/components/onboarding/PlanImpactCard';
import { useAppStore, type AppState } from '@/store/useAppStore';
import { planImpactForGoal } from '@/state/onboardingProfile';

export interface AskGoalProps {
  onNext: () => void;
}

/**
 * v21.0 — Screen 1 of the 7-step onboarding arc.
 *
 * Outcome-focused goals. Five options aligned with the rebuild spec —
 * "simpler routine" was dropped because it describes effort, not an
 * outcome (effort lives on its own screen later).
 *
 * After a selection, the PlanImpactCard fades in with a one-line
 * "why we ask" answer so the screen feels intelligent without
 * pushing extra UI.
 */
const ROWS: ReadonlyArray<{
  value: NonNullable<AppState['goal']>;
  Icon: React.ComponentType<PhosphorIconProps>;
  label: string;
  helper: string;
}> = [
  {
    value: 'clear',
    Icon: CircleNotch,
    label: 'Clearer skin',
    helper: 'Fewer breakouts and clogged pores',
  },
  {
    value: 'calm',
    Icon: Heart,
    label: 'Calmer skin',
    helper: 'Less redness, irritation, and reactivity',
  },
  {
    value: 'smoother',
    Icon: Waves,
    label: 'Smoother texture',
    helper: 'Softer surface and fewer rough patches',
  },
  {
    value: 'bright',
    Icon: Sun,
    label: 'Brighter tone',
    helper: 'More glow and more even-looking tone',
  },
  {
    value: 'barrier',
    Icon: Shield,
    label: 'Stronger barrier',
    helper: 'Less dryness, tightness, and stinging',
  },
];

export function AskGoal({ onNext }: AskGoalProps) {
  const goal = useAppStore((s) => s.goal);
  const setGoal = useAppStore((s) => s.setGoal);

  const ctaLabel = goal ? 'Set my goal' : 'Choose one to continue';
  const planImpactMessage = planImpactForGoal(goal);

  return (
    <QuestionLayout
      step={1}
      totalSteps={7}
      sectionLabel="Goal"
      headline="What do you want to improve this skin cycle?"
      subhead="Choose your main goal. Pura will build your first 84-day plan around it."
      ctaLabel={ctaLabel}
      ctaDisabled={!goal}
      disabledReason="Choose one to continue"
      onCta={() => goal && onNext()}
      planImpact={<PlanImpactCard message={planImpactMessage} />}
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

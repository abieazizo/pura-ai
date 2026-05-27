import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  HouseLine,
  Sun,
  SunHorizon,
  Question,
  MoonStars,
  ClockClockwise,
  CircleDashed,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
// v24.0 — `Sunrise` is not exported by phosphor-react-native@2.x.
// `SunHorizon` is the equivalent glyph and is already imported above;
// we alias it to keep the rest of the file's reference unchanged.
const Sunrise = SunHorizon;
import { QuestionLayout } from '@/components/onboarding/QuestionLayout';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';
import { PlanImpactCard } from '@/components/onboarding/PlanImpactCard';
import { useAppStore, type AppState } from '@/store/useAppStore';
import { planImpactForLifestyle } from '@/state/onboardingProfile';
import { palette } from '@/theme';

export interface AskLifestyleProps {
  onNext: () => void;
}

const SUN_ROWS: ReadonlyArray<{
  value: NonNullable<AppState['sunExposure']>;
  Icon: React.ComponentType<PhosphorIconProps>;
  label: string;
  helper: string;
}> = [
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
    helper: 'Weekdays and weekends vary',
  },
];

const TIMING_ROWS: ReadonlyArray<{
  value: NonNullable<AppState['routineTiming']>;
  Icon: React.ComponentType<PhosphorIconProps>;
  label: string;
  helper: string;
}> = [
  {
    value: 'am_pm',
    Icon: ClockClockwise,
    label: 'Morning and night',
    helper: 'I can keep a twice-daily rhythm',
  },
  {
    value: 'pm',
    Icon: MoonStars,
    label: 'Mostly night',
    helper: 'Evenings are more realistic',
  },
  {
    value: 'am',
    Icon: Sunrise,
    label: 'Mostly morning',
    helper: 'I’m more consistent earlier',
  },
  {
    value: 'inconsistent',
    Icon: CircleDashed,
    label: 'Not consistent yet',
    helper: 'Help me keep it simple',
  },
];

/**
 * v21.0 — Screen 5: lifestyle.
 *
 * Combines sun exposure + routine timing into one screen with two
 * sections. Both answers are required — they jointly drive the
 * SPF priority and AM/PM routine emphasis in the derived profile.
 */
export function AskLifestyle({ onNext }: AskLifestyleProps) {
  const sunExposure = useAppStore((s) => s.sunExposure);
  const setSunExposure = useAppStore((s) => s.setSunExposure);
  const routineTiming = useAppStore((s) => s.routineTiming);
  const setRoutineTiming = useAppStore((s) => s.setRoutineTiming);

  const bothAnswered = !!sunExposure && !!routineTiming;
  const planImpactMessage = bothAnswered
    ? planImpactForLifestyle(sunExposure, routineTiming)
    : null;

  return (
    <QuestionLayout
      step={5}
      totalSteps={7}
      sectionLabel="Lifestyle"
      headline="What should your plan account for?"
      subhead="Lifestyle changes how your skin reacts. This helps Pura tune SPF, recovery, and routine timing."
      ctaLabel={bothAnswered ? 'Continue' : 'Answer both to continue'}
      ctaDisabled={!bothAnswered}
      disabledReason="Answer both sections to continue"
      onCta={() => bothAnswered && onNext()}
      planImpact={<PlanImpactCard message={planImpactMessage} />}
    >
      <View style={styles.section}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          SUN EXPOSURE
        </Text>
        <Text style={styles.subQuestion} maxFontSizeMultiplier={1.2}>
          How much sun does your skin usually get?
        </Text>
        <View style={styles.list}>
          {SUN_ROWS.map((r) => (
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
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          ROUTINE TIMING
        </Text>
        <Text style={styles.subQuestion} maxFontSizeMultiplier={1.2}>
          When will you usually do your routine?
        </Text>
        <View style={styles.list}>
          {TIMING_ROWS.map((r) => (
            <ChoiceRow
              key={r.value}
              Icon={r.Icon}
              label={r.label}
              helper={r.helper}
              tall
              selected={routineTiming === r.value}
              onToggle={() => setRoutineTiming(r.value)}
            />
          ))}
        </View>
      </View>
    </QuestionLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 24,
    marginTop: 28,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    marginBottom: 6,
  },
  subQuestion: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
});

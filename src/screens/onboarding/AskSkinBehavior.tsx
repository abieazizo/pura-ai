import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Drop,
  DropHalf,
  DropSlash,
  CircleHalf,
  Question,
  Sparkle,
  Shield,
  ShieldCheck,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { QuestionLayout } from '@/components/onboarding/QuestionLayout';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';
import { PlanImpactCard } from '@/components/onboarding/PlanImpactCard';
import { useAppStore, type AppState } from '@/store/useAppStore';
import { planImpactForSkinBehavior } from '@/state/onboardingProfile';
import { palette } from '@/theme';

export interface AskSkinBehaviorProps {
  onNext: () => void;
}

const SKIN_TYPE_ROWS: ReadonlyArray<{
  value: NonNullable<AppState['skinType']>;
  Icon: React.ComponentType<PhosphorIconProps>;
  label: string;
  helper: string;
}> = [
  { value: 'oily', Icon: Drop, label: 'Oily', helper: 'Shiny by midday' },
  { value: 'dry', Icon: DropSlash, label: 'Dry', helper: 'Tight or sometimes flaky' },
  {
    value: 'combination',
    Icon: DropHalf,
    label: 'Combination',
    helper: 'Oily T-zone, drier cheeks',
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
    helper: 'Let Pura estimate after scans',
  },
];

const REACTIVITY_ROWS: ReadonlyArray<{
  value: NonNullable<AppState['sensitivity']>;
  Icon: React.ComponentType<PhosphorIconProps>;
  label: string;
  helper: string;
}> = [
  {
    value: 'very',
    Icon: Sparkle,
    label: 'Often irritate my skin',
    helper: 'Redness, stinging, or breakouts happen easily',
  },
  {
    value: 'somewhat',
    Icon: Shield,
    label: 'Sometimes irritate my skin',
    helper: 'I occasionally react to actives',
  },
  {
    value: 'not',
    Icon: ShieldCheck,
    label: 'Usually feel fine',
    helper: 'My skin handles new products well',
  },
  {
    value: 'unsure',
    Icon: Question,
    label: 'Not sure',
    helper: 'Start cautious and learn from scans',
  },
];

/**
 * v21.0 — Screen 3: skin behavior.
 *
 * Combines what used to be two separate screens (skin type + reactivity)
 * into a single, focused question with two short sections. Both answers
 * are required so the routine builder has the inputs it needs for the
 * starting approach calculation.
 *
 * The PlanImpact card only renders when *both* sections are answered —
 * otherwise its content would mislead the user about an unfinished
 * profile.
 */
export function AskSkinBehavior({ onNext }: AskSkinBehaviorProps) {
  const skinType = useAppStore((s) => s.skinType);
  const setSkinType = useAppStore((s) => s.setSkinType);
  const sensitivity = useAppStore((s) => s.sensitivity);
  const setSensitivity = useAppStore((s) => s.setSensitivity);

  // Legacy 'sensitive' skinType folds back to 'combination' for display.
  const selectedSkinType = skinType === 'sensitive' ? 'combination' : skinType;

  const bothAnswered = !!skinType && !!sensitivity;
  const planImpactMessage =
    bothAnswered ? planImpactForSkinBehavior(skinType, sensitivity) : null;

  return (
    <QuestionLayout
      step={3}
      totalSteps={7}
      sectionLabel="Skin behavior"
      headline="How does your skin usually behave?"
      subhead="Not sure is okay. Your first scans can refine this."
      ctaLabel={bothAnswered ? 'Set skin behavior' : 'Answer both to continue'}
      ctaDisabled={!bothAnswered}
      disabledReason="Answer both sections to continue"
      onCta={() => bothAnswered && onNext()}
      planImpact={<PlanImpactCard message={planImpactMessage} />}
    >
      <View style={styles.section}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          MOST DAYS MY SKIN FEELS
        </Text>
        <View style={styles.list}>
          {SKIN_TYPE_ROWS.map((r) => (
            <ChoiceRow
              key={r.value}
              Icon={r.Icon}
              label={r.label}
              helper={r.helper}
              tall
              selected={selectedSkinType === r.value}
              onToggle={() => setSkinType(r.value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          NEW PRODUCTS USUALLY
        </Text>
        <View style={styles.list}>
          {REACTIVITY_ROWS.map((r) => (
            <ChoiceRow
              key={r.value}
              Icon={r.Icon}
              label={r.label}
              helper={r.helper}
              tall
              selected={sensitivity === r.value}
              onToggle={() => setSensitivity(r.value)}
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
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
});

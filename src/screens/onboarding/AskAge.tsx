import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShieldCheck } from 'phosphor-react-native';
import { QuestionLayout } from '@/components/onboarding/QuestionLayout';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';
import { PlanImpactCard } from '@/components/onboarding/PlanImpactCard';
import { useAppStore, type AppState } from '@/store/useAppStore';
import { planImpactForPattern } from '@/state/onboardingProfile';
import { palette } from '@/theme';

export interface AskAgeProps {
  onNext: () => void;
}

const AGE_RANGES: ReadonlyArray<{
  value: NonNullable<AppState['ageRange']>;
  label: string;
}> = [
  { value: 'under_18', label: 'Under 18' },
  { value: '18-24', label: '18–24' },
  { value: '25-34', label: '25–34' },
  { value: '35-44', label: '35–44' },
  { value: '45-54', label: '45–54' },
  { value: '55+', label: '55+' },
  { value: null as never, label: 'Prefer not to say' },
];

const PATTERN_OPTIONS: ReadonlyArray<{
  value: NonNullable<AppState['patternContext']>;
  label: string;
}> = [
  { value: 'none', label: 'No / not sure' },
  { value: 'cycle', label: 'Breakouts change around my cycle' },
  { value: 'sensitivity_flares', label: 'Skin gets more sensitive sometimes' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

/**
 * v21.0 — Screen 6: optional context.
 *
 * Two short sections (age range + pattern context) plus a privacy
 * card. Everything is optional; the user can skip the whole screen
 * with the top-right Skip or by tapping Continue with nothing set.
 *
 * Replaces the v20.0 hormone-context question with the spec's calmer
 * "pattern context" framing.
 */
export function AskAge({ onNext }: AskAgeProps) {
  const ageRange = useAppStore((s) => s.ageRange);
  const setAgeRange = useAppStore((s) => s.setAgeRange);
  const patternContext = useAppStore((s) => s.patternContext);
  const setPatternContext = useAppStore((s) => s.setPatternContext);

  // Local-only flag so "Prefer not to say" only appears selected after the
  // user actively taps it. Without this, the null-default ageRange would
  // make the row look pre-selected on first render.
  const [agePreferNot, setAgePreferNot] = useState(false);

  const planImpactMessage = planImpactForPattern(patternContext);

  return (
    <QuestionLayout
      step={6}
      totalSteps={7}
      sectionLabel="Context"
      headline="A little context can improve your plan."
      subhead="Optional — used only to tune skin patterns like oil, breakouts, sensitivity, and recovery. You can skip this."
      showSkip
      onSkip={onNext}
      ctaLabel="Continue"
      ctaDisabled={false}
      onCta={onNext}
      planImpact={<PlanImpactCard message={planImpactMessage} />}
    >
      <View style={styles.privacyCard} accessible accessibilityRole="text">
        <View style={styles.privacyIconWrap}>
          <ShieldCheck size={16} color={SOFT_BLUE_ICON} weight="duotone" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.privacyTitle} maxFontSizeMultiplier={1.2}>
            Private by design
          </Text>
          <Text style={styles.privacyBody} maxFontSizeMultiplier={1.25}>
            You control what gets saved and can edit this later.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          AGE RANGE
        </Text>
        <View style={styles.grid}>
          {AGE_RANGES.map((r) => {
            const isPreferNot = r.label === 'Prefer not to say';
            const selected = isPreferNot
              ? agePreferNot
              : ageRange === r.value;
            return (
              <View key={r.label} style={styles.gridItem}>
                <ChoiceRow
                  Icon={null}
                  label={r.label}
                  selected={selected}
                  onToggle={() => {
                    if (isPreferNot) {
                      setAgePreferNot(true);
                      setAgeRange(null);
                    } else {
                      setAgePreferNot(false);
                      setAgeRange(r.value);
                    }
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          PATTERN CONTEXT
        </Text>
        <View style={styles.list}>
          {PATTERN_OPTIONS.map((r) => (
            <ChoiceRow
              key={r.value}
              Icon={null}
              label={r.label}
              selected={patternContext === r.value}
              onToggle={() =>
                setPatternContext(patternContext === r.value ? null : r.value)
              }
            />
          ))}
        </View>
        <Text style={styles.helperText} maxFontSizeMultiplier={1.2}>
          You can leave this blank.
        </Text>
      </View>
    </QuestionLayout>
  );
}

const SOFT_BLUE_ICON = '#3B82F6';
const SOFT_BLUE_SURFACE = '#F3F7FF';
const BLUE_BORDER = '#D6E4FF';

const styles = StyleSheet.create({
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 24,
    marginTop: 22,
    padding: 14,
    borderRadius: 14,
    backgroundColor: SOFT_BLUE_SURFACE,
    borderWidth: 1,
    borderColor: BLUE_BORDER,
  },
  privacyIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#E6EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  privacyTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: palette.ink,
  },
  privacyBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
    marginTop: 2,
  },
  section: {
    marginHorizontal: 24,
    marginTop: 24,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 6,
    paddingBottom: 12,
  },
  list: {
    gap: 10,
  },
  helperText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: palette.inkTertiary,
    marginTop: 10,
  },
});

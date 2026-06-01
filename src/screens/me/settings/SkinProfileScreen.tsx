/**
 * SkinProfileScreen — edit the canonical skin profile.
 *
 * Reads and writes the same store fields the scan engine and the
 * recommendation pipeline consume (skinType, concerns, sensitivity,
 * goal, sunExposure, effort). Every tap writes straight to canonical
 * state via the existing setters — no local draft, no separate save
 * step — so the next scan and the Skin Edit immediately reflect it.
 */

import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { puraShop, puraShopType, puraShopRadius, puraShopLayout } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { hapt } from '@/utils/haptics';
import { meSettings } from '@/copy/strings';

import { SettingsScaffold } from './SettingsScaffold';

const C = meSettings.skinProfile;

const SKIN_TYPE_OPTIONS = [
  { value: 'oily', label: C.skinType.oily },
  { value: 'dry', label: C.skinType.dry },
  { value: 'combination', label: C.skinType.combination },
  { value: 'balanced', label: C.skinType.balanced },
  { value: 'not_sure', label: C.skinType.not_sure },
] as const;

const SENSITIVITY_OPTIONS = [
  { value: 'very', label: C.sensitivity.very },
  { value: 'somewhat', label: C.sensitivity.somewhat },
  { value: 'not', label: C.sensitivity.not },
  { value: 'unsure', label: C.sensitivity.unsure },
] as const;

const GOAL_OPTIONS = [
  { value: 'clear', label: C.goal.clear },
  { value: 'calm', label: C.goal.calm },
  { value: 'smoother', label: C.goal.smoother },
  { value: 'bright', label: C.goal.bright },
  { value: 'barrier', label: C.goal.barrier },
] as const;

const SUN_OPTIONS = [
  { value: 'rarely', label: C.sun.rarely },
  { value: 'sometimes', label: C.sun.sometimes },
  { value: 'often', label: C.sun.often },
  { value: 'unsure', label: C.sun.unsure },
] as const;

const EFFORT_OPTIONS = [
  { value: 'minimal', label: C.effort.minimal },
  { value: 'moderate', label: C.effort.moderate },
  { value: 'enthusiast', label: C.effort.enthusiast },
  { value: 'decide-for-me', label: C.effort['decide-for-me'] },
] as const;

// Age range carries a 'prefer_not_to_say' sentinel that maps to the
// separate `agePreferNotToSay` boolean (so a null `ageRange` stays
// unambiguous — "not answered" vs "declined").
const AGE_OPTIONS = [
  { value: 'under_18', label: C.age.under_18 },
  { value: '18-24', label: C.age['18-24'] },
  { value: '25-34', label: C.age['25-34'] },
  { value: '35-44', label: C.age['35-44'] },
  { value: '45-54', label: C.age['45-54'] },
  { value: '55+', label: C.age['55+'] },
  { value: 'prefer_not_to_say', label: C.age.prefer_not_to_say },
] as const;

const HORMONE_OPTIONS = [
  { value: 'none', label: C.hormones.none },
  { value: 'cycle', label: C.hormones.cycle },
  { value: 'pregnancy_postpartum', label: C.hormones.pregnancy_postpartum },
  { value: 'menopause', label: C.hormones.menopause },
  { value: 'hrt', label: C.hormones.hrt },
  { value: 'prefer_not_to_say', label: C.hormones.prefer_not_to_say },
] as const;

const MAX_CONCERNS = 3;

export function SkinProfileScreen() {
  const {
    skinType,
    concerns,
    sensitivity,
    goal,
    sunExposure,
    effort,
    ageRange,
    agePreferNotToSay,
    hormoneContext,
    setSkinType,
    setConcerns,
    setSensitivity,
    setGoal,
    setSunExposure,
    setEffort,
    setAgeRange,
    setAgePreferNotToSay,
    setHormoneContext,
  } = useAppStore(
    useShallow((s) => ({
      skinType: s.skinType,
      concerns: s.concerns,
      sensitivity: s.sensitivity,
      goal: s.goal,
      sunExposure: s.sunExposure,
      effort: s.effort,
      ageRange: s.ageRange,
      agePreferNotToSay: s.agePreferNotToSay,
      hormoneContext: s.hormoneContext,
      setSkinType: s.setSkinType,
      setConcerns: s.setConcerns,
      setSensitivity: s.setSensitivity,
      setGoal: s.setGoal,
      setSunExposure: s.setSunExposure,
      setEffort: s.setEffort,
      setAgeRange: s.setAgeRange,
      setAgePreferNotToSay: s.setAgePreferNotToSay,
      setHormoneContext: s.setHormoneContext,
    })),
  );

  const atCap = concerns.length >= MAX_CONCERNS;

  const toggleConcern = useCallback(
    (concern: string) => {
      hapt.select();
      if (concerns.includes(concern)) {
        setConcerns(concerns.filter((c) => c !== concern));
      } else if (concerns.length < MAX_CONCERNS) {
        setConcerns([...concerns, concern]);
      }
    },
    [concerns, setConcerns],
  );

  return (
    <SettingsScaffold title={C.title} intro={C.intro}>
      <View style={styles.body}>
        <Section title={C.sections.skinType}>
          <OptionRow
            options={SKIN_TYPE_OPTIONS}
            selected={skinType}
            onSelect={(v) => {
              hapt.select();
              setSkinType(v);
            }}
          />
        </Section>

        <Section title={C.sections.concerns} hint={C.sections.concernsHint}>
          <View style={styles.chipWrap}>
            {C.concerns.map((concern) => {
              const active = concerns.includes(concern);
              const muted = !active && atCap;
              return (
                <Pressable
                  key={concern}
                  onPress={() => toggleConcern(concern)}
                  disabled={muted}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled: muted }}
                  style={({ pressed }) => [
                    styles.chip,
                    active && styles.chipActive,
                    muted && styles.chipMuted,
                    pressed && !muted && styles.chipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active && styles.chipTextActive,
                      muted && styles.chipTextMuted,
                    ]}
                    maxFontSizeMultiplier={1.2}
                  >
                    {concern}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {atCap ? (
            <Text style={styles.capNote} maxFontSizeMultiplier={1.2}>
              {C.concernsCapped}
            </Text>
          ) : null}
        </Section>

        <Section title={C.sections.sensitivity}>
          <OptionRow
            options={SENSITIVITY_OPTIONS}
            selected={sensitivity}
            onSelect={(v) => {
              hapt.select();
              setSensitivity(v);
            }}
          />
        </Section>

        <Section title={C.sections.goal}>
          <OptionRow
            options={GOAL_OPTIONS}
            selected={goal}
            onSelect={(v) => {
              hapt.select();
              setGoal(v);
            }}
          />
        </Section>

        <Section title={C.sections.sun}>
          <OptionRow
            options={SUN_OPTIONS}
            selected={sunExposure}
            onSelect={(v) => {
              hapt.select();
              setSunExposure(v);
            }}
          />
        </Section>

        <Section title={C.sections.effort}>
          <OptionRow
            options={EFFORT_OPTIONS}
            selected={effort}
            onSelect={(v) => {
              hapt.select();
              setEffort(v);
            }}
          />
        </Section>

        <Section title={C.sections.age} hint={C.sections.optionalHint}>
          <OptionRow
            options={AGE_OPTIONS}
            selected={agePreferNotToSay ? 'prefer_not_to_say' : ageRange}
            onSelect={(v) => {
              hapt.select();
              if (v === 'prefer_not_to_say') {
                setAgePreferNotToSay(true);
                setAgeRange(null);
              } else {
                setAgeRange(v);
                setAgePreferNotToSay(false);
              }
            }}
          />
        </Section>

        <Section title={C.sections.hormones} hint={C.sections.optionalHint}>
          <OptionRow
            options={HORMONE_OPTIONS}
            selected={hormoneContext}
            onSelect={(v) => {
              hapt.select();
              setHormoneContext(v);
            }}
          />
        </Section>
      </View>
    </SettingsScaffold>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>
          {title}
        </Text>
        {hint ? (
          <Text style={styles.sectionHint} maxFontSizeMultiplier={1.2}>
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function OptionRow<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: readonly { value: T; label: string }[];
  selected: string | null;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((o) => {
        const active = selected === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onSelect(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && styles.chipPressed,
            ]}
          >
            <Text
              style={[styles.chipText, active && styles.chipTextActive]}
              maxFontSizeMultiplier={1.2}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
  },
  section: {
    marginBottom: 26,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    ...puraShopType.supportingProductSerif,
    color: puraShop.ink,
  },
  sectionHint: {
    ...puraShopType.meta,
    color: puraShop.inkMuted,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: puraShopRadius.chip,
    backgroundColor: puraShop.surface,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
  },
  chipActive: {
    backgroundColor: puraShop.coralSoft,
    borderColor: puraShop.coral,
  },
  chipMuted: {
    opacity: 0.4,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    ...puraShopType.chipLabel,
    color: puraShop.ink,
  },
  chipTextActive: {
    color: puraShop.coralDeep,
  },
  chipTextMuted: {
    color: puraShop.inkMuted,
  },
  capNote: {
    ...puraShopType.meta,
    color: puraShop.coralDeep,
    marginTop: 10,
  },
});

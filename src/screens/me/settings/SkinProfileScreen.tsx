/**
 * SkinProfileScreen — the canonical skin profile, as a premium control center.
 *
 * Reads and writes the same store fields the scan engine and the
 * recommendation pipeline consume (skinType, concerns, sensitivity, goal,
 * sunExposure, effort) plus the safety fields the matcher reads
 * (fragranceSensitive, pregnancyCaution, avoidIngredients). Every tap
 * writes straight to canonical state — no local draft, no separate save
 * step — so the next scan and every product match immediately reflect it.
 *
 * A completion card shows how full the profile is; consequence copy under
 * each control explains, in plain language, what the choice changes. The
 * "Product preferences" toggles map to the real safety profile, not a
 * cosmetic mirror.
 */

import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Info } from 'phosphor-react-native';
import { useShallow } from 'zustand/react/shallow';

import { puraShop, puraShopType } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { hapt } from '@/utils/haptics';
import { meSettings } from '@/copy/strings';
import { exportUserData } from '@/lib/exportUserData';
import type { MeStackParamList } from '@/navigation/types';

import { SettingsScaffold } from './SettingsScaffold';
import {
  ChipGroup,
  ConfirmSheet,
  InfoSheet,
  OptionRow,
  ProgressBar,
  SavedIndicator,
  SettingsCard,
  SettingsDivider,
  SettingsSection,
  Toast,
  ToggleRow,
  useToast,
  type ChipOption,
} from './SettingsKit';

const C = meSettings.skinProfile;
const SAVED = meSettings.saved;
const PRIVACY = meSettings.privacy;

type SkinTypeOpt = 'oily' | 'dry' | 'combination' | 'balanced' | 'not_sure';
type SensitivityOpt = 'very' | 'somewhat' | 'not' | 'unsure';
type GoalOpt = 'clear' | 'calm' | 'smoother' | 'bright' | 'barrier';
type SunOpt = 'rarely' | 'sometimes' | 'often' | 'unsure';
type EffortOpt = 'minimal' | 'moderate' | 'enthusiast' | 'decide-for-me';
type AgeOpt =
  | 'under_18'
  | '18-24'
  | '25-34'
  | '35-44'
  | '45-54'
  | '55+'
  | 'prefer_not_to_say';
type HormoneOpt =
  | 'none'
  | 'cycle'
  | 'pregnancy_postpartum'
  | 'menopause'
  | 'hrt'
  | 'prefer_not_to_say';

const SKIN_TYPE_OPTIONS: readonly ChipOption<SkinTypeOpt>[] = [
  { value: 'oily', label: C.skinType.oily },
  { value: 'dry', label: C.skinType.dry },
  { value: 'combination', label: C.skinType.combination },
  { value: 'balanced', label: C.skinType.balanced },
  { value: 'not_sure', label: C.skinType.not_sure },
];

const SENSITIVITY_OPTIONS: readonly ChipOption<SensitivityOpt>[] = [
  { value: 'very', label: C.sensitivity.very },
  { value: 'somewhat', label: C.sensitivity.somewhat },
  { value: 'not', label: C.sensitivity.not },
  { value: 'unsure', label: C.sensitivity.unsure },
];

const GOAL_OPTIONS: readonly ChipOption<GoalOpt>[] = [
  { value: 'clear', label: C.goal.clear },
  { value: 'calm', label: C.goal.calm },
  { value: 'smoother', label: C.goal.smoother },
  { value: 'bright', label: C.goal.bright },
  { value: 'barrier', label: C.goal.barrier },
];

const SUN_OPTIONS: readonly ChipOption<SunOpt>[] = [
  { value: 'rarely', label: C.sun.rarely },
  { value: 'sometimes', label: C.sun.sometimes },
  { value: 'often', label: C.sun.often },
  { value: 'unsure', label: C.sun.unsure },
];

const EFFORT_OPTIONS: readonly ChipOption<EffortOpt>[] = [
  { value: 'minimal', label: C.effort.minimal },
  { value: 'moderate', label: C.effort.moderate },
  { value: 'enthusiast', label: C.effort.enthusiast },
  { value: 'decide-for-me', label: C.effort['decide-for-me'] },
];

const AGE_OPTIONS: readonly ChipOption<AgeOpt>[] = [
  { value: 'under_18', label: C.age.under_18 },
  { value: '18-24', label: C.age['18-24'] },
  { value: '25-34', label: C.age['25-34'] },
  { value: '35-44', label: C.age['35-44'] },
  { value: '45-54', label: C.age['45-54'] },
  { value: '55+', label: C.age['55+'] },
  { value: 'prefer_not_to_say', label: C.age.prefer_not_to_say },
];

const HORMONE_OPTIONS: readonly ChipOption<HormoneOpt>[] = [
  { value: 'none', label: C.hormones.none },
  { value: 'cycle', label: C.hormones.cycle },
  { value: 'pregnancy_postpartum', label: C.hormones.pregnancy_postpartum },
  { value: 'menopause', label: C.hormones.menopause },
  { value: 'hrt', label: C.hormones.hrt },
  { value: 'prefer_not_to_say', label: C.hormones.prefer_not_to_say },
];

const CONCERN_OPTIONS: readonly ChipOption[] = C.concerns.map((c) => ({
  value: c,
  label: c,
}));

const RANK_LABELS = [C.rank.primary, C.rank.secondary, C.rank.watching] as const;

// Tokens stored in the real `avoidIngredients` array the matcher reads.
const AVOID_ESSENTIAL_OILS = 'Essential oils';
const AVOID_ALCOHOL = 'Drying alcohols';

const MAX_CONCERNS = 3;

export function SkinProfileScreen() {
  const nav =
    useNavigation<NativeStackNavigationProp<MeStackParamList>>();

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
    fragranceSensitive,
    pregnancyCaution,
    avoidIngredients,
    setSkinType,
    setConcerns,
    setSensitivity,
    setGoal,
    setSunExposure,
    setEffort,
    setAgeRange,
    setAgePreferNotToSay,
    setHormoneContext,
    setFragranceSensitive,
    setPregnancyCaution,
    setAvoidIngredients,
    resetSkinProfile,
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
      fragranceSensitive: s.fragranceSensitive,
      pregnancyCaution: s.pregnancyCaution,
      avoidIngredients: s.avoidIngredients,
      setSkinType: s.setSkinType,
      setConcerns: s.setConcerns,
      setSensitivity: s.setSensitivity,
      setGoal: s.setGoal,
      setSunExposure: s.setSunExposure,
      setEffort: s.setEffort,
      setAgeRange: s.setAgeRange,
      setAgePreferNotToSay: s.setAgePreferNotToSay,
      setHormoneContext: s.setHormoneContext,
      setFragranceSensitive: s.setFragranceSensitive,
      setPregnancyCaution: s.setPregnancyCaution,
      setAvoidIngredients: s.setAvoidIngredients,
      resetSkinProfile: s.resetSkinProfile,
    })),
  );

  const [toast, showToast, hideToast] = useToast();
  const [editedThisSession, setEditedThisSession] = useState(false);
  const [affectsOpen, setAffectsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const markSaved = useCallback(() => {
    setEditedThisSession(true);
    showToast(SAVED.toastNextScan);
  }, [showToast]);

  // --- Completion ---------------------------------------------------------
  const answered = [
    !!skinType,
    concerns.length > 0,
    !!sensitivity,
    !!goal,
    !!sunExposure,
    !!effort,
    !!ageRange || agePreferNotToSay,
    !!hormoneContext,
  ];
  const done = answered.filter(Boolean).length;
  const total = answered.length;
  const percent = Math.round((done / total) * 100);
  const tierCopy =
    done >= 7 ? C.completion.high : done >= 4 ? C.completion.mid : C.completion.low;

  // --- Consequence copy ---------------------------------------------------
  const skinTypeHelp =
    skinType && skinType !== 'sensitive' ? C.skinTypeHelp[skinType] : undefined;
  const sensitivityHelp = sensitivity ? C.sensitivityHelp[sensitivity] : undefined;
  const effortHelp = effort ? C.effortHelp[effort] : undefined;
  const goalInsight =
    goal && goal !== 'simpler' ? C.goalInsight(C.goal[goal]) : undefined;

  // --- Product preferences (real safety fields) ---------------------------
  const toggleAvoid = useCallback(
    (token: string, on: boolean) => {
      const next = on
        ? avoidIngredients.includes(token)
          ? avoidIngredients
          : [...avoidIngredients, token]
        : avoidIngredients.filter((x) => x !== token);
      setAvoidIngredients(next);
      markSaved();
    },
    [avoidIngredients, setAvoidIngredients, markSaved],
  );

  // --- Controls -----------------------------------------------------------
  const onExport = useCallback(async () => {
    const ok = await exportUserData('profile');
    showToast(ok ? PRIVACY.exportedToast : PRIVACY.exportUnavailable);
  }, [showToast]);

  const onConfirmReset = useCallback(() => {
    setResetOpen(false);
    resetSkinProfile();
    setEditedThisSession(true);
    showToast(SAVED.done);
  }, [resetSkinProfile, showToast]);

  const skinTypeValue: SkinTypeOpt | null =
    skinType && skinType !== 'sensitive' ? skinType : null;
  const goalValue: GoalOpt | null = goal && goal !== 'simpler' ? goal : null;
  const ageValue: AgeOpt | null = agePreferNotToSay
    ? 'prefer_not_to_say'
    : ageRange;

  return (
    <SettingsScaffold title={C.title} intro={C.intro}>
      <View style={styles.body}>
        {/* Completion summary */}
        <SettingsCard style={styles.completionCard}>
          <View style={styles.completionHead}>
            <Text style={styles.completionTitle} maxFontSizeMultiplier={1.2}>
              {C.completion.heading}
            </Text>
            <Pressable
              onPress={() => {
                hapt.tap();
                setAffectsOpen(true);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={C.completion.affectsLink}
              style={({ pressed }) => [styles.affectsLink, pressed && { opacity: 0.6 }]}
            >
              <Info size={14} color={puraShop.coralDeep} weight="bold" />
              <Text style={styles.affectsLinkText} maxFontSizeMultiplier={1.15}>
                {C.completion.affectsLink}
              </Text>
            </Pressable>
          </View>
          <View style={styles.completionMeter}>
            <ProgressBar percent={percent} />
            <Text style={styles.completionCount} maxFontSizeMultiplier={1.2}>
              {C.completion.countTemplate(done, total)}
            </Text>
          </View>
          <Text style={styles.completionBody} maxFontSizeMultiplier={1.3}>
            {tierCopy}
          </Text>
          {editedThisSession ? (
            <View style={styles.savedSlot}>
              <SavedIndicator label={SAVED.justNow} />
            </View>
          ) : null}
        </SettingsCard>

        {/* Skin type */}
        <SettingsSection title={C.sections.skinType} footnote={skinTypeHelp}>
          <ChipGroup
            mode="single"
            options={SKIN_TYPE_OPTIONS}
            value={skinTypeValue}
            onChange={(v) => {
              hapt.select();
              setSkinType(v);
              markSaved();
            }}
          />
        </SettingsSection>

        {/* Top concerns (ranked) */}
        <SettingsSection
          title={C.sections.concerns}
          hint={C.sections.concernsHint}
          footnote={C.concernsRankedHint}
        >
          <ChipGroup
            mode="ranked"
            options={CONCERN_OPTIONS}
            values={concerns}
            max={MAX_CONCERNS}
            rankLabels={RANK_LABELS}
            capNote={C.concernsCapped}
            onChange={(vals) => {
              hapt.select();
              setConcerns(vals);
              markSaved();
            }}
          />
        </SettingsSection>

        {/* Reactivity */}
        <SettingsSection title={C.sections.sensitivity} footnote={sensitivityHelp}>
          <ChipGroup
            mode="single"
            options={SENSITIVITY_OPTIONS}
            value={sensitivity}
            onChange={(v) => {
              hapt.select();
              setSensitivity(v);
              markSaved();
            }}
          />
        </SettingsSection>

        {/* Goal this cycle */}
        <SettingsSection title={C.sections.goal} footnote={goalInsight}>
          <ChipGroup
            mode="single"
            options={GOAL_OPTIONS}
            value={goalValue}
            onChange={(v) => {
              hapt.select();
              setGoal(v);
              markSaved();
            }}
          />
        </SettingsSection>

        {/* Sun exposure */}
        <SettingsSection title={C.sections.sun}>
          <ChipGroup
            mode="single"
            options={SUN_OPTIONS}
            value={sunExposure}
            onChange={(v) => {
              hapt.select();
              setSunExposure(v);
              markSaved();
            }}
          />
        </SettingsSection>

        {/* Routine effort */}
        <SettingsSection title={C.sections.effort} footnote={effortHelp}>
          <ChipGroup
            mode="single"
            options={EFFORT_OPTIONS}
            value={effort}
            onChange={(v) => {
              hapt.select();
              setEffort(v);
              markSaved();
            }}
          />
        </SettingsSection>

        {/* Product preferences — wired to the real safety profile */}
        <SettingsSection
          title={C.sections.preferences}
          hint={C.sections.preferencesHint}
          footnote={C.preferences.note}
        >
          <SettingsCard>
            <ToggleRow
              label={C.preferences.fragranceFree}
              value={fragranceSensitive === 'yes'}
              onValueChange={(v) => {
                setFragranceSensitive(v ? 'yes' : 'no');
                markSaved();
              }}
            />
            <SettingsDivider />
            <ToggleRow
              label={C.preferences.pregnancySafe}
              value={pregnancyCaution === 'yes'}
              onValueChange={(v) => {
                setPregnancyCaution(v ? 'yes' : 'no');
                markSaved();
              }}
            />
            <SettingsDivider />
            <ToggleRow
              label={C.preferences.avoidEssentialOils}
              value={avoidIngredients.includes(AVOID_ESSENTIAL_OILS)}
              onValueChange={(v) => toggleAvoid(AVOID_ESSENTIAL_OILS, v)}
            />
            <SettingsDivider />
            <ToggleRow
              label={C.preferences.avoidAlcohol}
              value={avoidIngredients.includes(AVOID_ALCOHOL)}
              onValueChange={(v) => toggleAvoid(AVOID_ALCOHOL, v)}
            />
          </SettingsCard>
        </SettingsSection>

        {/* Age range (optional) */}
        <SettingsSection title={C.sections.age} hint={C.sections.optionalHint}>
          <ChipGroup
            mode="single"
            options={AGE_OPTIONS}
            value={ageValue}
            onChange={(v) => {
              hapt.select();
              if (v === 'prefer_not_to_say') {
                setAgePreferNotToSay(true);
                setAgeRange(null);
              } else {
                setAgeRange(v);
                setAgePreferNotToSay(false);
              }
              markSaved();
            }}
          />
        </SettingsSection>

        {/* Hormonal context (optional) */}
        <SettingsSection
          title={C.sections.hormones}
          hint={C.sections.optionalHint}
          footnote={C.hormonesNote}
        >
          <ChipGroup
            mode="single"
            options={HORMONE_OPTIONS}
            value={hormoneContext}
            onChange={(v) => {
              hapt.select();
              setHormoneContext(v);
              markSaved();
            }}
          />
        </SettingsSection>

        {/* Manage profile */}
        <SettingsSection title={C.controls.title}>
          <SettingsCard>
            <OptionRow
              label={C.controls.privacyLabel}
              meta={C.controls.privacyMeta}
              onPress={() => nav.navigate('PrivacySettings')}
            />
            <SettingsDivider />
            <OptionRow
              label={C.controls.exportLabel}
              meta={C.controls.exportMeta}
              onPress={onExport}
            />
            <SettingsDivider />
            <OptionRow
              label={C.controls.resetLabel}
              meta={C.controls.resetMeta}
              tone="danger"
              showChevron={false}
              onPress={() => setResetOpen(true)}
            />
          </SettingsCard>
        </SettingsSection>
      </View>

      <InfoSheet
        visible={affectsOpen}
        title={C.affectsSheet.title}
        body={C.affectsSheet.body}
        bullets={C.affectsSheet.bullets}
        footnote={C.affectsSheet.footnote}
        onClose={() => setAffectsOpen(false)}
      />

      <ConfirmSheet
        visible={resetOpen}
        title={C.controls.resetConfirmTitle}
        body={C.controls.resetConfirmBody}
        confirmLabel={C.controls.resetConfirmCta}
        cancelLabel={C.controls.cancel}
        destructive
        onConfirm={onConfirmReset}
        onCancel={() => setResetOpen(false)}
      />

      <Toast state={toast} onHide={hideToast} />
    </SettingsScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
  },
  completionCard: {
    marginBottom: 26,
    gap: 14,
  },
  completionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  completionTitle: {
    ...puraShopType.supportingProductSerif,
    color: puraShop.ink,
  },
  affectsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  affectsLinkText: {
    ...puraShopType.meta,
    color: puraShop.coralDeep,
  },
  completionMeter: {
    gap: 8,
  },
  completionCount: {
    ...puraShopType.meta,
    color: puraShop.inkMuted,
  },
  completionBody: {
    ...puraShopType.sectionSub,
    color: puraShop.inkSecondary,
    lineHeight: 19,
  },
  savedSlot: {
    marginTop: 2,
  },
});

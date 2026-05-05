/**
 * SafetyNote — v18.9.
 *
 * A calm "extra-care mode" / "gentle-care mode" banner that surfaces
 * on result + plan + assistant + product-detail screens when the
 * user has flagged a skin condition, prescription use, active
 * irritation, pregnancy/breastfeeding caution, sensitivity, or
 * specific ingredient avoidances.
 *
 * Tone rules (non-negotiable):
 *   • calm, supportive, premium
 *   • never alarming or legalistic
 *   • never says the app is treating disease
 *   • never says "you have [medical condition]"
 *
 * Reads from `useAppStore` directly so callers don't have to wire
 * 6 fields through props. Renders nothing when the safety profile
 * has no signal — zero footprint for users who never opt in.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShieldCheck } from 'phosphor-react-native';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import {
  buildSafetyProfile,
  type SafetyBias,
} from '@/utils/safetyProfile';
import { palette } from '@/theme';

export interface SafetyNoteProps {
  /** Optional — narrows which surface this is rendered on so we
   *  can scope the copy slightly. Default 'generic'. */
  context?: 'result' | 'plan' | 'product' | 'assistant' | 'generic';
  /** Optional override for the headline + subtext. When omitted we
   *  use the profile's derived UI copy. */
  headlineOverride?: string;
  subtextOverride?: string;
  /** Force-show even when no signal (used in onboarding preview). */
  forceShow?: boolean;
}

export function SafetyNote({
  context = 'generic',
  headlineOverride,
  subtextOverride,
  forceShow = false,
}: SafetyNoteProps) {
  const fields = useAppStore(
    useShallow((s) => ({
      skinType: s.skinType,
      sensitivity: s.sensitivity,
      skinConditions: s.skinConditions,
      prescriptionFlag: s.prescriptionFlag,
      fragranceSensitive: s.fragranceSensitive,
      activeIrritation: s.activeIrritation,
      pregnancyCaution: s.pregnancyCaution,
      avoidIngredients: s.avoidIngredients,
    }))
  );

  const safety = React.useMemo(
    () => buildSafetyProfile(fields),
    [fields]
  );

  if (!safety.hasSignal && !forceShow) return null;

  const headline =
    headlineOverride ?? safety.uiHeadline ?? 'Sensitivity-aware';
  const subtext =
    subtextOverride ??
    safety.uiSubtext ??
    "We've nudged toward gentler options.";

  // Append a per-context tail when the bias is high, so the message
  // reads scoped to where the user is looking ("on this routine"
  // vs "for these picks"). Keep concise.
  const contextTail =
    safety.bias === 'high'
      ? context === 'plan'
        ? ' This routine stays minimal until things settle.'
        : context === 'product'
        ? ' This product was filtered with extra care.'
        : ''
      : '';

  return (
    <View
      style={[styles.card, styleForBias(safety.bias)]}
      accessible
      accessibilityLabel={`${headline}. ${subtext}${contextTail}`}
    >
      <View style={styles.iconWrap}>
        <ShieldCheck
          size={18}
          color={palette.mossDeep}
          weight="duotone"
        />
      </View>
      <View style={styles.text}>
        <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
          {headline}
        </Text>
        <Text
          style={styles.subtext}
          maxFontSizeMultiplier={1.2}
          numberOfLines={3}
        >
          {subtext}
          {contextTail}
        </Text>
      </View>
    </View>
  );
}

function styleForBias(bias: SafetyBias) {
  switch (bias) {
    case 'high':
      return { borderColor: palette.mossDeep, backgroundColor: palette.mossLight };
    case 'moderate':
      return { borderColor: palette.moss, backgroundColor: palette.mossLight };
    case 'mild':
      return { borderColor: palette.hairline, backgroundColor: palette.bgDeep };
    case 'none':
    default:
      return { borderColor: palette.hairline, backgroundColor: palette.bgDeep };
  }
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  headline: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: palette.mossDeep,
  },
  subtext: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 13.5,
    lineHeight: 19,
    color: palette.inkSecondary,
  },
});

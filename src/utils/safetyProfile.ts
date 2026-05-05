/**
 * v18.9 — Safety profile.
 *
 * Reduces the persisted safety fields on the Zustand store
 * (skinConditions[], prescriptionFlag, fragranceSensitive,
 * activeIrritation, pregnancyCaution, avoidIngredients[],
 * sensitivity, skinType) to a single structured object the
 * recommendation engine consumes.
 *
 * The derived `bias` signal is the most important output — every
 * AI prompt + UI surface reads it to decide:
 *   • how cautious to make recommendations
 *   • whether to add a calm safety note
 *   • whether to filter out aggressive actives entirely
 *
 * Bias tiers (lowest → highest care):
 *   • 'none'        — no flags, standard recommendations
 *   • 'mild'        — sensitive skin or fragrance sensitivity only
 *   • 'moderate'    — flagged skin condition (rosacea/eczema/etc.)
 *                     OR active irritation
 *   • 'high'        — active irritation + flagged condition,
 *                     OR prescription use, OR pregnancy caution
 *
 * This module is pure — no React, no store imports. Callers pass
 * the relevant fields in. Safe to import from any layer.
 */

import type { SkinCondition } from '@/store/useAppStore';

export type SafetyBias = 'none' | 'mild' | 'moderate' | 'high';

export interface SafetyProfile {
  /** Has the user told us anything safety-relevant? */
  hasSignal: boolean;
  /** Derived recommendation-aggressiveness bias. */
  bias: SafetyBias;
  /** Categorical conditions the user reported. */
  conditions: SkinCondition[];
  /** Free-text ingredient avoidances the user listed. */
  avoidIngredients: string[];
  /** Computed list of categories of actives to bias AGAINST. */
  avoidCategories: AvoidCategory[];
  /** Premium short headline + subtext for the UI safety card. */
  uiHeadline: string | null;
  uiSubtext: string | null;
  /** A compact natural-language summary the AI prompt can paste in. */
  promptSummary: string;
}

/**
 * Categories the recommendation engine should bias AGAINST when the
 * user has a flagged profile. The matchProductsForUser /
 * generateRoutineRecommendation prompts read these in
 * `contraindication_tags`.
 */
export type AvoidCategory =
  | 'strong_acids'
  | 'high_strength_retinoid'
  | 'physical_scrubs'
  | 'fragrance'
  | 'essential_oils'
  | 'denatured_alcohol'
  | 'high_strength_vitamin_c';

interface BuildSafetyProfileInput {
  skinType?: 'oily' | 'dry' | 'combination' | 'sensitive' | null;
  sensitivity?: 'very' | 'somewhat' | 'not' | 'unsure' | null;
  skinConditions?: SkinCondition[];
  prescriptionFlag?: 'yes' | 'no' | 'prefer-not-to-say' | null;
  fragranceSensitive?: 'yes' | 'no' | 'unsure' | null;
  activeIrritation?: 'yes' | 'no' | null;
  pregnancyCaution?: 'yes' | 'no' | 'prefer-not-to-say' | null;
  avoidIngredients?: string[];
}

const CONDITION_LABEL: Record<SkinCondition, string> = {
  rosacea: 'rosacea',
  eczema: 'eczema',
  dermatitis: 'dermatitis',
  psoriasis: 'psoriasis',
  acne_treatment: 'an acne treatment regimen',
  melasma: 'melasma',
  other: 'a flagged skin condition',
};

const FLAGGED_CONDITION = new Set<SkinCondition>([
  'rosacea',
  'eczema',
  'dermatitis',
  'psoriasis',
  'acne_treatment',
  'melasma',
  'other',
]);

export function buildSafetyProfile(
  input: BuildSafetyProfileInput
): SafetyProfile {
  const conditions = (input.skinConditions ?? []).filter((c) =>
    FLAGGED_CONDITION.has(c)
  );
  const sensitive =
    input.skinType === 'sensitive' ||
    input.sensitivity === 'very' ||
    input.sensitivity === 'somewhat';
  const fragSensitive = input.fragranceSensitive === 'yes';
  const activelyIrritated = input.activeIrritation === 'yes';
  const onPrescription = input.prescriptionFlag === 'yes';
  const pregnant = input.pregnancyCaution === 'yes';
  const avoidIngredients = (input.avoidIngredients ?? []).filter(
    (s) => s.trim().length > 0
  );

  // Bias derivation.
  let bias: SafetyBias = 'none';
  if (conditions.length > 0) bias = 'moderate';
  if (activelyIrritated) bias = 'moderate';
  if (activelyIrritated && conditions.length > 0) bias = 'high';
  if (onPrescription) bias = 'high';
  if (pregnant) bias = 'high';
  if (bias === 'none' && (sensitive || fragSensitive)) bias = 'mild';

  // Derive avoid categories from condition + sensitivity flags.
  const avoidCategories = new Set<AvoidCategory>();
  if (sensitive || fragSensitive || activelyIrritated || conditions.length > 0) {
    avoidCategories.add('fragrance');
    avoidCategories.add('essential_oils');
    avoidCategories.add('denatured_alcohol');
  }
  if (
    conditions.includes('rosacea') ||
    conditions.includes('eczema') ||
    conditions.includes('dermatitis') ||
    conditions.includes('psoriasis') ||
    activelyIrritated
  ) {
    avoidCategories.add('strong_acids');
    avoidCategories.add('physical_scrubs');
    avoidCategories.add('high_strength_retinoid');
  }
  if (conditions.includes('rosacea')) {
    avoidCategories.add('high_strength_vitamin_c');
  }

  const hasSignal =
    conditions.length > 0 ||
    sensitive ||
    fragSensitive ||
    activelyIrritated ||
    onPrescription ||
    pregnant ||
    avoidIngredients.length > 0;

  // UI copy — calm, supportive, never alarming or diagnostic.
  let uiHeadline: string | null = null;
  let uiSubtext: string | null = null;
  if (bias === 'high') {
    uiHeadline = 'Extra-care mode';
    uiSubtext = activelyIrritated
      ? "Your skin is actively flaring — we've kept things gentle. If you're under medical care, keep routine changes small."
      : onPrescription
      ? "Because you're on a prescription regimen, we kept routine changes minimal and supportive."
      : pregnant
      ? "Because you flagged pregnancy/breastfeeding caution, we held off on actives where relevant. Check anything specific with your clinician."
      : "We've prioritised gentle, barrier-supportive options for your skin.";
  } else if (bias === 'moderate') {
    uiHeadline = 'Gentle-care mode';
    uiSubtext =
      conditions.length > 0
        ? `Because you flagged ${conditions
            .map((c) => CONDITION_LABEL[c])
            .join(' / ')}, we prioritised calm, low-irritation options.`
        : "Because you flagged active irritation, we prioritised calm, low-irritation options.";
  } else if (bias === 'mild') {
    uiHeadline = 'Sensitivity-aware';
    uiSubtext =
      "Because you marked sensitive or fragrance-reactive skin, we've nudged toward gentler options.";
  }

  // Compact natural-language summary for AI prompts.
  const promptParts: string[] = [];
  if (conditions.length > 0) {
    promptParts.push(
      `User reports: ${conditions
        .map((c) => CONDITION_LABEL[c])
        .join(' + ')}.`
    );
  }
  if (sensitive) promptParts.push('Skin reads as sensitive/reactive.');
  if (fragSensitive)
    promptParts.push('Fragrance-sensitive — recommend fragrance-free.');
  if (activelyIrritated)
    promptParts.push(
      'Skin is ACTIVELY IRRITATED right now — keep recommendations supportive and minimal; avoid all actives.'
    );
  if (onPrescription)
    promptParts.push(
      'User is on a prescription regimen — keep routine changes minimal and supportive; do not stack actives.'
    );
  if (pregnant)
    promptParts.push(
      'User flagged pregnancy/breastfeeding caution — bias away from retinoids and high-strength actives; suggest checking with a clinician for ingredient-specific questions.'
    );
  if (avoidIngredients.length > 0) {
    promptParts.push(
      `User asked to avoid: ${avoidIngredients.join(', ')}.`
    );
  }
  if (avoidCategories.size > 0) {
    promptParts.push(
      `Bias AGAINST: ${[...avoidCategories].join(', ')}.`
    );
  }
  if (bias !== 'none') {
    promptParts.push(
      `Recommendation policy: ${biasInstruction(bias)}`
    );
  }
  const promptSummary = promptParts.join(' ');

  return {
    hasSignal,
    bias,
    conditions,
    avoidIngredients,
    avoidCategories: [...avoidCategories],
    uiHeadline,
    uiSubtext,
    promptSummary,
  };
}

function biasInstruction(bias: SafetyBias): string {
  switch (bias) {
    case 'mild':
      return 'lean toward gentler formulas, fragrance-free where possible, but full normal range otherwise.';
    case 'moderate':
      return 'restrict to calm, low-irritation, barrier-supportive products. Suppress strong acids, physical scrubs, and high-strength retinoids.';
    case 'high':
      return 'STRONGLY restrict to gentle, barrier-supportive, fragrance-free, sensitive-safe formulas only. Suppress all actives. Suggest a minimal routine. Use cautious supportive language; never claim to treat or diagnose.';
    case 'none':
    default:
      return 'standard recommendations.';
  }
}

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  CaretDown,
  ShieldCheck,
  Warning,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';
import type { Concern, IngredientDetail, Product } from '@/types';
import type { AppState } from '@/store/useAppStore';
import { analyzeIngredientFit } from './IngredientsPanel';
import { CATEGORY_LABEL } from '@/utils/concerns';
import { productMechanismFor } from '@/data/seed';

export interface WhyItWorksPanelProps {
  product: Product;
  user: Pick<AppState, 'sensitivity'>;
  topConcern: Concern | null;
}

/**
 * v10.10 — WhyItWorksPanel. Replaces the old generic IngredientsPanel
 * inside Product Detail.
 *
 * The prior design stacked a green "All ingredients compatible…" banner
 * and a drugstore-style ingredient list beneath the "Why this matches
 * you" section — two sections both answering "why is this right for me."
 * This component merges them into one premium, curated treatment:
 *
 *   1. AI fit note (compact, inline).
 *        Shield icon + scan-aware sentence. Not a green banner.
 *   2. Rationale paragraph.
 *        Concern-tied "why this product, for your scan" sentences.
 *   3. Curated hero ingredients (2–3).
 *        Ingredient name in serif + italic role + optional moss pill
 *        when the ingredient directly addresses the user's top concern.
 *   4. Collapsible full ingredient list.
 *        Lives below as a tap-to-expand subsection so the page reads
 *        premium-first, complete-if-asked.
 */
export function WhyItWorksPanel({
  product,
  user,
  topConcern,
}: WhyItWorksPanelProps) {
  const list = product.ingredientList ?? [];
  const fit = useMemo(() => analyzeIngredientFit(product, user), [product, user]);

  // Hero ingredients — prefer the seed's key-ingredients ordering when
  // present, otherwise take the first 3 from the structured list. Each
  // hero is annotated with its relevance to the user's top concern.
  const heroes = useMemo(
    () => pickHeroIngredients(product, list, topConcern),
    [product, list, topConcern]
  );

  const rationale = useMemo(
    () => buildRationale(product, topConcern),
    [product, topConcern]
  );

  const [expanded, setExpanded] = useState(false);
  const rotateValue = useSharedValue(0);

  React.useEffect(() => {
    rotateValue.value = withTiming(expanded ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, rotateValue]);

  const caretStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value * 180}deg` }],
  }));

  const toggleList = () => {
    hapt.select();
    setExpanded((v) => !v);
  };

  return (
    <View>
      {/* 1 — AI fit note (slim, inline) */}
      <FitNote fit={fit} />

      {/* 2 — Rationale */}
      <Text style={styles.rationale} maxFontSizeMultiplier={1.2}>
        {rationale}
      </Text>

      {/* 3 — Curated hero ingredients */}
      {heroes.length > 0 ? (
        <View style={styles.heroStack}>
          <Text style={styles.heroKicker} maxFontSizeMultiplier={1.1}>
            KEY INGREDIENTS
          </Text>
          {heroes.map((h, i) => (
            <HeroIngredientCard
              key={`${h.ingredient.name}-${i}`}
              hero={h}
              flagged={fit.concernIngredients.includes(h.ingredient.name)}
              isLast={i === heroes.length - 1}
            />
          ))}
        </View>
      ) : null}

      {/* 4 — Collapsible full list */}
      {list.length > heroes.length ? (
        <View style={styles.fullList}>
          <Pressable
            onPress={toggleList}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={
              expanded ? 'Hide full ingredient list' : 'Show full ingredient list'
            }
            style={({ pressed }) => [
              styles.fullHeader,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.fullHeaderLabel} maxFontSizeMultiplier={1.1}>
              {expanded ? 'Hide full list' : `See all ${list.length} ingredients`}
            </Text>
            <Animated.View style={caretStyle}>
              <CaretDown size={14} color={palette.inkTertiary} weight="bold" />
            </Animated.View>
          </Pressable>

          {expanded ? (
            <View style={styles.fullRows}>
              {list.map((ing, idx) => {
                const flagged = fit.concernIngredients.includes(ing.name);
                const isLast = idx === list.length - 1;
                return (
                  <View
                    key={`${ing.name}-${idx}`}
                    style={[
                      styles.fullRow,
                      !isLast && styles.fullRowDivider,
                    ]}
                  >
                    {flagged ? <View style={styles.flaggedDot} /> : null}
                    <Text
                      style={[
                        styles.fullRowName,
                        flagged && { color: palette.rust },
                      ]}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.2}
                    >
                      {ing.name}
                    </Text>
                    <Text
                      style={styles.fullRowPurpose}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.2}
                    >
                      {flagged ? 'May irritate' : ing.purpose}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ============================================================================
// FitNote — slim inline AI fit line. Replaces the old green banner.
// ============================================================================

function FitNote({
  fit,
}: {
  fit: ReturnType<typeof analyzeIngredientFit>;
}) {
  const Icon =
    fit.tier === 'concern'
      ? (Warning as React.FC<PhosphorIconProps>)
      : (ShieldCheck as React.FC<PhosphorIconProps>);
  const color =
    fit.tier === 'concern' ? palette.rust : palette.mossDeep;
  return (
    <View style={styles.fitNote}>
      <Icon size={14} color={color} weight="duotone" />
      <Text style={styles.fitKicker} maxFontSizeMultiplier={1.1}>
        AI FIT NOTE
      </Text>
      <Text
        style={styles.fitBody}
        numberOfLines={3}
        maxFontSizeMultiplier={1.2}
      >
        {fit.message}
      </Text>
    </View>
  );
}

// ============================================================================
// HeroIngredientCard — serif name + italic role, optional moss relevance pill.
// ============================================================================

interface HeroIngredient {
  ingredient: IngredientDetail;
  /** Null if this ingredient isn't known to target the user's top concern. */
  relevance: string | null;
}

function HeroIngredientCard({
  hero,
  flagged,
  isLast,
}: {
  hero: HeroIngredient;
  flagged: boolean;
  isLast: boolean;
}) {
  return (
    <View style={[styles.heroRow, !isLast && styles.heroRowDivider]}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text
          style={[
            styles.heroName,
            flagged && { color: palette.rust },
          ]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}
        >
          {hero.ingredient.name}
        </Text>
        <Text
          style={styles.heroRole}
          numberOfLines={2}
          maxFontSizeMultiplier={1.2}
        >
          {hero.ingredient.purpose}
        </Text>
      </View>
      {hero.relevance ? (
        <View style={styles.relevancePill}>
          <Text style={styles.relevancePillText} maxFontSizeMultiplier={1.1}>
            {hero.relevance}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ============================================================================
// Ingredient curation + copy
// ============================================================================

/**
 * Build an ordered list of 2–3 hero ingredients, each tagged with a
 * relevance pill when the ingredient targets the user's top concern.
 *
 * Order priority:
 *   1. ingredients whose purpose mentions the top-concern hint
 *   2. ingredients in `keyIngredients[]`
 *   3. first entries in the structured list
 */
function pickHeroIngredients(
  product: Product,
  list: IngredientDetail[],
  topConcern: Concern | null
): HeroIngredient[] {
  if (list.length === 0) return [];

  const relevantHints = concernHints(topConcern);
  const relevantLabel = topConcern ? relevanceLabel(topConcern) : null;

  const scored = list.map((ing) => {
    const haystack = `${ing.name} ${ing.purpose}`.toLowerCase();
    const hitRelevant = relevantHints.some((h) => haystack.includes(h));
    const isKey = product.keyIngredients.some(
      (k) => k.toLowerCase() === ing.name.toLowerCase()
    );
    const rank = hitRelevant ? 0 : isKey ? 1 : 2;
    return {
      ingredient: ing,
      relevance: hitRelevant ? relevantLabel : null,
      rank,
    };
  });

  scored.sort((a, b) => a.rank - b.rank);
  return scored.slice(0, 3).map(({ ingredient, relevance }) => ({
    ingredient,
    relevance,
  }));
}

function concernHints(concern: Concern | null): string[] {
  if (!concern) return [];
  switch (concern.category) {
    case 'breakouts':
      return ['salicylic', 'niacinamide', 'benzoyl', 'zinc', 'tea tree', 'acne', 'blemish'];
    case 'hydration':
      return ['hyaluronic', 'glycerin', 'squalane', 'ceramide', 'panthenol', 'hydrat', 'moistur'];
    case 'texture':
      return ['aha', 'bha', 'pha', 'lactic', 'glycolic', 'retinol', 'exfoliat', 'smooth'];
    case 'tone':
      return ['vitamin c', 'tranexamic', 'arbutin', 'kojic', 'azelaic', 'niacinamide', 'dark', 'bright'];
  }
}

function relevanceLabel(concern: Concern): string {
  switch (concern.category) {
    case 'breakouts':
      return `Targets your ${concern.region}`;
    case 'hydration':
      return `Rehydrates your ${concern.region}`;
    case 'texture':
      return `Smooths your ${concern.region}`;
    case 'tone':
      return `Fades marks on ${concern.region}`;
  }
}

/**
 * Build the section's rationale — 2 sentences. The first names the
 * specific scan signal; the second names what this formula does about
 * it. Falls back to a grounded generic sentence when no scan exists.
 */
function buildRationale(product: Product, concern: Concern | null): string {
  // v10.32 — when seed.ts has authored a per-product mechanism
  // sentence we splice that in instead of the concern-templated
  // "this formula targets..." filler. Generic concern-template
  // fallback stays in place for products without an authored
  // mechanism so the page never shows a blank rationale.
  const mechanism = productMechanismFor(product.id);
  if (!concern) {
    if (mechanism) {
      return `${mechanism} Scan once and this page will tie that mechanism directly to what your skin is actually doing.`;
    }
    return `This ${product.category} is matched to your skin profile and flagged for common irritants we know to avoid. Scan once, and this page will speak more specifically to what your skin is actually doing.`;
  }
  const region = concern.region;
  const cat = CATEGORY_LABEL[concern.category].toLowerCase();
  const sev = concern.severity.replace('-', ' ');
  switch (concern.category) {
    case 'breakouts':
      return `Your ${region} is reading as ${cat} \u00b7 ${sev} in the latest scan. ${mechanism ?? 'This formula targets the active surface without aggravating the barrier — a direct response to what the scan picked up.'}`;
    case 'hydration':
      return `Your ${region} is reading low on moisture in the latest scan. ${mechanism ?? 'This rebuilds hydration at the layer the scan flagged without sitting heavy on the rest of the face.'}`;
    case 'texture':
      return `Texture on your ${region} is uneven in the last reading. ${mechanism ?? 'This works on the surface refinement the scan identified — gently enough to pair with the rest of your routine.'}`;
    case 'tone':
      return `Dark marks on your ${region} are still visible. ${mechanism ?? 'This formula works on uneven tone over a full skin cycle — change shows up gradually, scan by scan.'}`;
  }
}

// ============================================================================
// Styles
// ============================================================================

// v10.12 — Why panel internals compressed across the board:
//   • fit note padding 10 → 7
//   • rationale fontSize 16/23 → 15/21, marginBottom 20 → 12
//   • heroStack marginBottom 18 → 12, kicker marginBottom 10 → 8
//   • hero row paddingVertical 12 → 10
//   • full-list header paddingVertical 10 → 8, paddingTop 6 → 4
// Each alone is small; together they save ~30pt inside a section
// that opens by default on every product page.
const styles = StyleSheet.create({
  // 1 — Fit note
  fitNote: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    marginBottom: 14,
  },
  fitKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  fitBody: {
    flex: 1,
    minWidth: '100%',
    marginTop: 3,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    lineHeight: 19,
    color: palette.inkSecondary,
  },

  // 2 — Rationale paragraph
  rationale: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 15,
    lineHeight: 21,
    color: palette.inkSecondary,
    marginBottom: 12,
  },

  // 3 — Hero ingredient stack
  heroStack: {
    marginBottom: 12,
  },
  heroKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  heroRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.hairline,
  },
  heroName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  heroRole: {
    marginTop: 2,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
  },
  relevancePill: {
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.mossLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relevancePillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.3,
    color: palette.mossDeep,
  },

  // 4 — Full-list disclosure
  fullList: {
    paddingTop: 4,
  },
  fullHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  fullHeaderLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.4,
    color: palette.inkSecondary,
    textTransform: 'uppercase',
  },
  fullRows: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  fullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  fullRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.hairline,
  },
  flaggedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.rust,
    marginRight: 8,
  },
  fullRowName: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: palette.ink,
  },
  fullRowPurpose: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.inkTertiary,
    marginLeft: 12,
    textAlign: 'right',
    flexShrink: 0,
    maxWidth: '45%',
  },
});

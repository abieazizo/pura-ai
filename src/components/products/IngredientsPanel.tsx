import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle, Warning, Info, type IconProps as PhosphorIconProps } from 'phosphor-react-native';
import { palette } from '@/theme';
import type { IngredientDetail, Product } from '@/types';
import type { AppState } from '@/store/useAppStore';

interface FitResult {
  tier: 'safe' | 'concern' | 'unknown';
  message: string;
  concernIngredients: string[];
}

// Semantic concern amber — not yet in tokens, documented inline per §4
// cross-cutting rule. Moved to tokens in a future PR.
const CONCERN_BG = '#F5DDB5';
const CONCERN_FG = '#C4862A';

const CONCERN_MAP: Record<string, string[]> = {
  fragrance: ['Parfum', 'Fragrance', 'Limonene', 'Linalool'],
  alcohol: ['Alcohol Denat', 'Ethanol', 'SD Alcohol'],
  sulfates: ['Sodium Lauryl Sulfate', 'Sodium Laureth Sulfate'],
  'essential-oils': ['Tea Tree Oil', 'Lavender Oil', 'Eucalyptus Oil'],
};

/**
 * Ingredient fit analyzer (§3.10). Flags user-concerning ingredients
 * based on their stored sensitivity. "Very sensitive" flags all four
 * concern families; "somewhat" flags fragrance + alcohol only.
 */
export function analyzeIngredientFit(
  product: Product,
  user: Pick<AppState, 'sensitivity'>
): FitResult {
  const list = product.ingredientList ?? [];
  if (list.length === 0) {
    return {
      tier: 'unknown',
      message: 'Ingredient analysis pending.',
      concernIngredients: [],
    };
  }

  const userConcerns =
    user.sensitivity === 'very'
      ? ['fragrance', 'alcohol', 'sulfates', 'essential-oils']
      : user.sensitivity === 'somewhat'
      ? ['fragrance', 'alcohol']
      : [];

  const flagged = list.filter((ing) =>
    userConcerns.some((key) =>
      CONCERN_MAP[key]?.some((concern) =>
        ing.name.toLowerCase().includes(concern.toLowerCase())
      )
    )
  );

  if (flagged.length > 0) {
    const sensitivityWord = user.sensitivity ?? 'sensitive';
    return {
      tier: 'concern',
      message: `Contains ${flagged[0].name}. May not suit your ${sensitivityWord} skin.`,
      concernIngredients: flagged.map((i) => i.name),
    };
  }

  const safeWord =
    user.sensitivity === 'not'
      ? 'skin profile'
      : `${user.sensitivity ?? 'sensitive'} skin`;
  return {
    tier: 'safe',
    message: `All ingredients compatible with your ${safeWord}.`,
    concernIngredients: [],
  };
}

export interface IngredientsPanelProps {
  product: Product;
  user: Pick<AppState, 'sensitivity'>;
}

export function IngredientsPanel({ product, user }: IngredientsPanelProps) {
  const list = product.ingredientList ?? [];
  const fit = useMemo(() => analyzeIngredientFit(product, user), [product, user]);

  // No list at all — single italic fallback row.
  if (list.length === 0) {
    return (
      <Text style={styles.emptyText} maxFontSizeMultiplier={1.2}>
        Ingredients not yet available for this product.
      </Text>
    );
  }

  const config = fitConfigByTier[fit.tier];
  const Icon = config.Icon;

  return (
    <View>
      <View
        style={[styles.fitCard, { backgroundColor: config.bg }]}
      >
        <Icon size={22} color={config.iconColor} weight="duotone" />
        <Text style={styles.fitText} maxFontSizeMultiplier={1.2}>
          {fit.message}
        </Text>
      </View>

      <View>
        {list.map((ing, idx) => {
          const isFlagged = fit.concernIngredients.includes(ing.name);
          const isLast = idx === list.length - 1;
          return (
            <View key={`${ing.name}-${idx}`} style={styles.row}>
              <View style={styles.rowMain}>
                {isFlagged ? <View style={styles.amberDot} /> : null}
                <Text
                  style={styles.ingredientName}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {ing.name}
                </Text>
              </View>
              <Text
                style={[
                  styles.purpose,
                  isFlagged && { color: CONCERN_FG },
                ]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
              >
                {isFlagged ? 'May irritate' : ing.purpose}
              </Text>
              {!isLast ? <View style={styles.rowDivider} /> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const fitConfigByTier: Record<
  FitResult['tier'],
  { Icon: React.FC<PhosphorIconProps>; bg: string; iconColor: string }
> = {
  safe: {
    Icon: CheckCircle,
    bg: palette.mossLight,
    iconColor: palette.mossDeep,
  },
  concern: {
    Icon: Warning,
    bg: CONCERN_BG,
    iconColor: CONCERN_FG,
  },
  unknown: {
    Icon: Info,
    bg: palette.bgDeep,
    iconColor: palette.inkTertiary,
  },
};

const styles = StyleSheet.create({
  fitCard: {
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  fitText: {
    flex: 1,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 21,
    color: palette.inkSecondary,
  },
  row: {
    paddingVertical: 12,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  amberDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CONCERN_FG,
    marginRight: 8,
  },
  ingredientName: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: palette.ink,
  },
  purpose: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.inkTertiary,
    textAlign: 'right',
    marginLeft: 12,
  },
  rowDivider: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: palette.hairline,
  },
  emptyText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 21,
    color: palette.inkTertiary,
    paddingVertical: 4,
  },
});

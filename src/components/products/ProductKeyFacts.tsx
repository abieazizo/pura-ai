/**
 * ProductKeyFacts — at-a-glance decision grid for product detail.
 *
 * 2-column grid of 6 cells: Best for / Not ideal for / Routine step /
 * Frequency / Strength / Irritation risk. Built deterministically from
 * the product's category + tags so we never display blanks or
 * fabricated medical claims.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Target,
  Prohibit,
  Sun,
  CalendarBlank,
  Lightning,
  Warning,
} from 'phosphor-react-native';
import { palette } from '@/theme';
import type { Product, ProductCategory } from '@/types';

interface Props {
  product: Product;
}

interface Fact {
  icon: React.FC<{ size: number; color: string; weight: 'duotone' }>;
  label: string;
  value: string;
}

export function ProductKeyFacts({ product }: Props) {
  const facts = buildFacts(product);

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        KEY FACTS
      </Text>
      <View style={styles.grid}>
        {facts.map((f) => {
          const Icon = f.icon;
          return (
            <View key={f.label} style={styles.cell}>
              <View style={styles.cellIcon}>
                <Icon size={14} color={palette.clayDeep} weight="duotone" />
              </View>
              <Text
                style={styles.cellLabel}
                maxFontSizeMultiplier={1.1}
                numberOfLines={1}
              >
                {f.label}
              </Text>
              <Text
                style={styles.cellValue}
                maxFontSizeMultiplier={1.15}
                numberOfLines={2}
              >
                {f.value}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Fact builder — deterministic from product metadata.
// ---------------------------------------------------------------------------

function buildFacts(product: Product): Fact[] {
  return [
    {
      icon: Target as Fact['icon'],
      label: 'BEST FOR',
      value: bestForValue(product),
    },
    {
      icon: Prohibit as Fact['icon'],
      label: 'NOT IDEAL FOR',
      value: notIdealForValue(product),
    },
    {
      icon: Sun as Fact['icon'],
      label: 'ROUTINE STEP',
      value: routineStepValue(product.category),
    },
    {
      icon: CalendarBlank as Fact['icon'],
      label: 'FREQUENCY',
      value: frequencyValue(product),
    },
    {
      icon: Lightning as Fact['icon'],
      label: 'STRENGTH',
      value: strengthValue(product),
    },
    {
      icon: Warning as Fact['icon'],
      label: 'IRRITATION RISK',
      value: irritationRiskValue(product),
    },
  ];
}

function bestForValue(p: Product): string {
  const tags = (p.tags ?? []).map((t) => t.toLowerCase());
  if (tags.some((t) => /breakout|acne|salicylic|bha/.test(t)))
    return 'Active breakouts';
  if (tags.some((t) => /dark|mark|tone|brightening|tranexamic|niacinamide/.test(t)))
    return 'Post-breakout marks';
  if (tags.some((t) => /hydra|ceramide|hyaluronic/.test(t)))
    return 'Dry, dehydrated skin';
  if (tags.some((t) => /barrier/.test(t))) return 'Barrier support';
  if (tags.some((t) => /sensitive/.test(t))) return 'Sensitive skin';
  if (p.category === 'spf') return 'Daily UV protection';
  if (p.category === 'cleanser') return 'Daily cleansing';
  if (p.category === 'moisturizer') return 'Daily moisture';
  return 'Routine support';
}

function notIdealForValue(p: Product): string {
  const tags = (p.tags ?? []).map((t) => t.toLowerCase());
  if (tags.some((t) => /retin|strong|active/.test(t)))
    return 'Already-stacked actives';
  if (tags.some((t) => /breakout|salicylic|bha/.test(t)))
    return 'Very dry, peeling skin';
  if (tags.some((t) => /heavy|rich|cream/.test(t)) || /butter|balm/i.test(p.name))
    return 'Acne-prone areas';
  if (tags.some((t) => /fragrance/.test(t)))
    return 'Highly reactive skin';
  return 'Compromised barrier';
}

function routineStepValue(category: ProductCategory): string {
  switch (category) {
    case 'cleanser':
      return 'AM + PM cleanse';
    case 'toner':
      return 'After cleanse';
    case 'serum':
      return 'Before moisturizer';
    case 'treatment':
      return 'PM treatment';
    case 'moisturizer':
      return 'After serum';
    case 'spf':
      return 'AM final step';
    case 'mask':
      return '1–2× weekly';
  }
}

function frequencyValue(p: Product): string {
  const tags = (p.tags ?? []).map((t) => t.toLowerCase());
  if (p.category === 'mask') return '1–2× weekly';
  if (p.category === 'treatment') return '2–4 nights/week';
  if (tags.some((t) => /retin/.test(t))) return 'Start 2–3 nights/week';
  if (tags.some((t) => /bha|salicylic|aha|glycolic/.test(t)))
    return '2–3 nights/week';
  if (p.category === 'spf') return 'Daily, AM';
  return 'Daily as tolerated';
}

function strengthValue(p: Product): string {
  const tags = (p.tags ?? []).map((t) => t.toLowerCase());
  if (tags.some((t) => /retin|benzoyl|strong/.test(t))) return 'Advanced';
  if (tags.some((t) => /bha|aha|glycolic|tranexamic/.test(t))) return 'Medium';
  if (tags.some((t) => /niacinamide|azelaic/.test(t))) return 'Gentle–medium';
  if (
    p.category === 'cleanser' ||
    p.category === 'moisturizer' ||
    p.category === 'spf'
  )
    return 'Gentle';
  return 'Gentle';
}

function irritationRiskValue(p: Product): string {
  const tags = (p.tags ?? []).map((t) => t.toLowerCase());
  if (tags.some((t) => /retin|benzoyl/.test(t))) return 'High — patch test';
  if (tags.some((t) => /bha|aha|glycolic|salicylic/.test(t)))
    return 'Medium';
  if (tags.some((t) => /fragrance/.test(t))) return 'Medium';
  if (tags.some((t) => /sensitive|fragrance-free/.test(t))) return 'Low';
  if (p.category === 'cleanser' || p.category === 'moisturizer')
    return 'Low';
  if (p.category === 'spf') return 'Low';
  return 'Low–medium';
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
    marginHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  cell: {
    width: '50%',
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  cellIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: palette.clayPaper,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cellLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.2,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  cellValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.1,
    color: palette.ink,
  },
});

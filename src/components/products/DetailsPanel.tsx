import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme';
import type { Product } from '@/types';

export interface DetailsPanelProps {
  product: Product;
}

function formatFormulation(f?: string): string | null {
  if (!f) return null;
  // §3.15 — "Common product" is forbidden as a surfaced value.
  if (f === 'Common product') return 'Over-the-counter';
  return f;
}

function formatTimeOfUse(t?: Product['timeOfUse']): string | null {
  if (!t) return null;
  // §3.15 — "Both" is remapped.
  if (t === 'Both') return 'Morning & Evening';
  return t;
}

/**
 * Two-column key/value rows (§3.12). Any row with a missing value is
 * skipped (not rendered as empty). Values wrap at word boundaries.
 */
export function DetailsPanel({ product }: DetailsPanelProps) {
  const rows = useMemo(() => {
    const maybe: { label: string; value: string | null | undefined }[] = [
      { label: 'Formulation', value: formatFormulation(product.formulation) },
      { label: 'Skin types', value: product.skinTypes?.join(', ') },
      { label: 'Good for', value: product.goodFor?.join(', ') },
      { label: 'Time of use', value: formatTimeOfUse(product.timeOfUse) },
      { label: 'Contraindications', value: product.contraindications },
    ];
    return maybe.filter(
      (r): r is { label: string; value: string } =>
        typeof r.value === 'string' && r.value.length > 0
    );
  }, [product]);

  if (rows.length === 0) return null;

  return (
    <View>
      {rows.map((r, i) => (
        <View
          key={r.label}
          style={[
            styles.row,
            i < rows.length - 1 && styles.rowDivider,
          ]}
        >
          <Text style={styles.label} maxFontSizeMultiplier={1.2}>
            {r.label}
          </Text>
          <Text
            style={styles.value}
            textBreakStrategy="simple"
            maxFontSizeMultiplier={1.2}
          >
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,22,20,0.08)',
  },
  label: {
    width: '35%',
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: 'rgba(26,22,20,0.6)',
  },
  value: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: palette.ink,
    textAlign: 'right',
  },
});

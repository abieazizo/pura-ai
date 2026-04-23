import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme';

export interface BrandAndNameProps {
  brand: string;
  name: string;
}

/**
 * Brand + product name pair (§3.5). Product name is never truncated —
 * `adjustsFontSizeToFit` with `minimumFontScale={0.7}` shrinks a "long"
 * name down cleanly and word-wraps when possible.
 */
export function BrandAndName({ brand, name }: BrandAndNameProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.brand} numberOfLines={1} maxFontSizeMultiplier={1.1}>
        {brand.toUpperCase()}
      </Text>
      <Text
        style={styles.name}
        numberOfLines={3}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        textBreakStrategy="simple"
        maxFontSizeMultiplier={1.15}
      >
        {name}
      </Text>
    </View>
  );
}

// v10.12 — identity block compressed. marginTop 24 → 16, brand marginBottom
// 6 → 4, name fontSize 32 → 28 with lineHeight tightened to 32 so wrapping
// takes less vertical cost. Max of 3 lines preserved via the caller's
// adjustsFontSizeToFit config — the name still never truncates.
const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    marginBottom: 4,
  },
  name: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 28,
    lineHeight: 32,
    color: palette.ink,
  },
});

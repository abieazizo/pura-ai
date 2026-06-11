/**
 * ProductPick — commerce as care. One honestly-matched product with its REAL
 * photo, finding-justified and CALIBRATED ("should help", never "will fix").
 * No match-%, no store grid, no urgency. The honesty label is the headline,
 * including the "maybe skip this for now" case, and the cheapest-that-works
 * option is flagged so the orb can point at it plainly. The routine works
 * fully without ever tapping anything here.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PeriodAtmosphere } from '@/theme/routineAtmosphere';
import type { MatchHonesty, ProductSlotVM } from '../model';
import { rType } from '../tokens';
import { Packshot } from './Packshot';

const HONESTY_LABEL: Record<MatchHonesty, string> = {
  strong: 'Worth it, for you',
  optional: 'Optional',
  'maybe skip this for now': 'Maybe skip this for now',
};

/** "£8.8" reads like a typo; "£8.80" reads like a price. */
export function formatPrice(price: number): string {
  return `£${price % 1 === 0 ? price : price.toFixed(2)}`;
}

export function ProductPick({
  pick,
  atmo,
  onAdd,
}: {
  pick: NonNullable<ProductSlotVM['pick']>;
  atmo: PeriodAtmosphere;
  onAdd?: () => void;
}) {
  const deemphasised = pick.honesty === 'maybe skip this for now';
  return (
    <View style={[styles.wrap, { backgroundColor: atmo.chip, borderColor: atmo.hairline }]}>
      <View style={styles.mainRow}>
        {/* The actual product — photo first, story beside it. */}
        <Packshot pick={pick} size={64} atmo={atmo} />
        <View style={styles.story}>
          <View style={styles.headRow}>
            <Text style={[rType.label, { color: atmo.faint }]} maxFontSizeMultiplier={1.2}>
              {pick.brand}
            </Text>
            <Text style={[rType.labelSm, { color: deemphasised ? atmo.faint : atmo.muted }]} maxFontSizeMultiplier={1.2}>
              {HONESTY_LABEL[pick.honesty]}
            </Text>
          </View>
          <Text style={[rType.productName, { color: atmo.ink, opacity: deemphasised ? 0.78 : 1 }]} maxFontSizeMultiplier={1.3}>
            {pick.name}
          </Text>
        </View>
      </View>

      <Text style={[rType.bodySm, { color: atmo.muted, marginTop: 8 }]} maxFontSizeMultiplier={1.3}>
        {pick.whyHelps}
      </Text>

      <View style={styles.footRow}>
        <View style={styles.tags}>
          {typeof pick.price === 'number' && (
            <Text style={[rType.bodySm, { color: atmo.muted }]} maxFontSizeMultiplier={1.3}>
              {formatPrice(pick.price)}
            </Text>
          )}
          {pick.cheapestThatWorks && (
            <Text style={[rType.labelSm, { color: atmo.faint, marginLeft: 10 }]} maxFontSizeMultiplier={1.2}>
              Cheapest that works
            </Text>
          )}
        </View>
        {onAdd && !deemphasised && (
          <Pressable onPress={onAdd} hitSlop={8} accessibilityRole="button">
            <Text style={[rType.bodySm, { color: atmo.muted, textDecorationLine: 'underline' }]} maxFontSizeMultiplier={1.3}>
              Add to my list
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  mainRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  story: { flex: 1 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  footRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  tags: { flexDirection: 'row', alignItems: 'center' },
});

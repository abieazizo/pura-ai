/**
 * ProductPick — commerce as care. One honestly-matched product, finding-
 * justified and CALIBRATED ("should help", never "will fix"). No match-%, no
 * store grid, no urgency. The honesty label is the headline, including the
 * "maybe skip for now" case, and the cheapest-that-works option is flagged so
 * the orb can point at it plainly. The routine works fully without ever tapping
 * anything here.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PeriodAtmosphere } from '@/theme/routineAtmosphere';
import type { MatchHonesty, ProductSlotVM } from '../model';
import { rType } from '../tokens';

const HONESTY_LABEL: Record<MatchHonesty, string> = {
  strong: 'Worth it, for you',
  optional: 'Optional',
  'maybe skip for now': 'Maybe skip this for now',
};

export function ProductPick({
  pick,
  atmo,
  onAdd,
}: {
  pick: NonNullable<ProductSlotVM['pick']>;
  atmo: PeriodAtmosphere;
  onAdd?: () => void;
}) {
  const deemphasised = pick.honesty === 'maybe skip for now';
  return (
    <View style={[styles.wrap, { backgroundColor: atmo.chip, borderColor: atmo.hairline }]}>
      <View style={styles.headRow}>
        <Text style={[rType.label, { color: atmo.faint }]}>{pick.brand}</Text>
        <Text style={[rType.labelSm, { color: deemphasised ? atmo.faint : atmo.muted }]}>
          {HONESTY_LABEL[pick.honesty]}
        </Text>
      </View>

      <Text style={[rType.productName, { color: atmo.ink, opacity: deemphasised ? 0.78 : 1 }]}>
        {pick.name}
      </Text>
      <Text style={[rType.bodySm, { color: atmo.muted, marginTop: 4 }]}>{pick.whyHelps}</Text>

      <View style={styles.footRow}>
        <View style={styles.tags}>
          {typeof pick.price === 'number' && (
            <Text style={[rType.bodySm, { color: atmo.muted }]}>£{pick.price}</Text>
          )}
          {pick.cheapestThatWorks && (
            <Text style={[rType.labelSm, { color: atmo.faint, marginLeft: 10 }]}>
              Cheapest that works
            </Text>
          )}
        </View>
        {onAdd && !deemphasised && (
          <Pressable onPress={onAdd} hitSlop={8} accessibilityRole="button">
            <Text style={[rType.bodySm, { color: atmo.muted, textDecorationLine: 'underline' }]}>
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
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  footRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  tags: { flexDirection: 'row', alignItems: 'center' },
});

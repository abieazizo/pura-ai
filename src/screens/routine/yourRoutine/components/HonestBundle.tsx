/**
 * HonestBundle — the optional "everything for your routine" layer. Each item is
 * finding-justified and honesty-labelled, the total is clear, and the standing
 * note is that you can do all of this with what you already have. No urgency, no
 * FOMO, no fake discount. The orb never nags to buy.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PeriodAtmosphere } from '@/theme/routineAtmosphere';
import type { BundleVM } from '../model';
import { rType } from '../tokens';

export function HonestBundle({
  bundle,
  atmo,
  onClose,
}: {
  bundle: BundleVM;
  atmo: PeriodAtmosphere;
  onClose?: () => void;
}) {
  return (
    <View style={[styles.sheet, { backgroundColor: atmo.card, borderColor: atmo.hairline }]}>
      <Text style={[rType.section, { color: atmo.ink }]}>Everything for your routine</Text>
      <Text style={[rType.bodySm, { color: atmo.muted, marginTop: 6 }]}>{bundle.intro}</Text>

      <View style={{ marginTop: 18 }}>
        {bundle.items.map((it) => (
          <View key={it.id} style={[styles.item, { borderTopColor: atmo.hairline }]}>
            <View style={styles.itemHead}>
              <Text style={[rType.productName, { color: atmo.ink, flex: 1 }]}>{it.name}</Text>
              {typeof it.price === 'number' && (
                <Text style={[rType.bodyMed, { color: atmo.ink, marginLeft: 12 }]}>£{it.price}</Text>
              )}
            </View>
            <Text style={[rType.bodySm, { color: atmo.muted, marginTop: 4 }]}>{it.why}</Text>
            {it.honesty === 'maybe skip for now' && (
              <Text style={[rType.labelSm, { color: atmo.faint, marginTop: 6 }]}>
                Maybe skip this for now
              </Text>
            )}
          </View>
        ))}
      </View>

      <View style={[styles.totalRow, { borderTopColor: atmo.hairline }]}>
        <Text style={[rType.bodyMed, { color: atmo.muted }]}>If you bought it all</Text>
        {typeof bundle.total === 'number' && (
          <Text style={[rType.hero, { color: atmo.ink, fontSize: 24, lineHeight: 28 }]}>£{bundle.total}</Text>
        )}
      </View>
      <Text style={[rType.throughline, { color: atmo.muted, marginTop: 12 }]}>{bundle.alsoFree}</Text>

      {onClose && (
        <Pressable onPress={onClose} accessibilityRole="button" style={styles.close} hitSlop={8}>
          <Text style={[rType.bodyMed, { color: atmo.muted }]}>Not now</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 24 },
  item: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 14 },
  itemHead: { flexDirection: 'row', alignItems: 'center' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    marginTop: 8,
  },
  close: { alignSelf: 'center', marginTop: 20, paddingVertical: 8 },
});

/**
 * StepRow — one routine step: the plain action, an AM/PM tag, and the
 * THROUGHLINE beneath it (muted Instrument Serif) tracing the step to a scan
 * finding. The product is optional and pluggable: when a pick exists the user
 * can quietly invite it ("Want my pick for this?"); when none does, the step
 * simply works with what you have. Used in the reveal cascade and the expanded
 * full-routine view.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PeriodAtmosphere } from '@/theme/routineAtmosphere';
import type { StepVM } from '../model';
import { rType } from '../tokens';
import { ProductPick } from './ProductPick';

export function StepRow({
  step,
  atmo,
  showTag = true,
}: {
  step: StepVM;
  atmo: PeriodAtmosphere;
  showTag?: boolean;
}) {
  const [revealPick, setRevealPick] = useState(false);
  const hasPick = !!step.product.pick;

  return (
    <View style={styles.row}>
      <View style={styles.headline}>
        <Text style={[rType.body, { color: atmo.ink, flex: 1 }]} numberOfLines={3}>
          {step.action}
        </Text>
        {showTag && (
          <Text style={[rType.labelSm, { color: atmo.faint, marginLeft: 12 }]}>
            {step.timeOfDay === 'morning' ? 'AM' : 'PM'}
          </Text>
        )}
      </View>

      {/* The throughline — every step traces to a finding. */}
      <Text style={[rType.throughline, { color: atmo.muted, marginTop: 6 }]}>{step.throughline}</Text>

      {hasPick && !revealPick && (
        <Pressable
          onPress={() => setRevealPick(true)}
          hitSlop={8}
          accessibilityRole="button"
          style={styles.askPick}
        >
          <Text style={[rType.bodySm, { color: atmo.muted, textDecorationLine: 'underline' }]}>
            Want my pick for this?
          </Text>
        </Pressable>
      )}

      {hasPick && revealPick && (
        <View style={{ marginTop: 12 }}>
          <ProductPick pick={step.product.pick!} atmo={atmo} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 14 },
  headline: { flexDirection: 'row', alignItems: 'flex-start' },
  askPick: { marginTop: 10, alignSelf: 'flex-start' },
});

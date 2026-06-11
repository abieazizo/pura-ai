/**
 * StepRow — one routine step: the plain action, an AM/PM tag, and the
 * THROUGHLINE beneath it (muted Instrument Serif) tracing the step to a scan
 * finding. When a pick exists, its REAL photo sits quietly at the row's edge —
 * the packshot itself is the invite: tap it (or the line beneath) and the full
 * honesty card unfolds. When none does, the step simply works with what you
 * have. Used in the reveal cascade and the expanded full-routine view.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PeriodAtmosphere } from '@/theme/routineAtmosphere';
import type { StepVM } from '../model';
import { rType } from '../tokens';
import { ProductPick } from './ProductPick';
import { Packshot } from './Packshot';

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
  const pick = step.product.pick;

  return (
    <View style={styles.row}>
      <View style={styles.headline}>
        <View style={styles.text}>
          {/* No line cap — at large font scales the action wraps, never clips. */}
          <Text style={[rType.body, { color: atmo.ink }]} maxFontSizeMultiplier={1.3}>
            {step.action}
          </Text>
          {/* The throughline — every step traces to a finding. */}
          <Text style={[rType.throughline, { color: atmo.muted, marginTop: 6 }]} maxFontSizeMultiplier={1.3}>
            {step.throughline}
          </Text>
        </View>

        <View style={styles.side}>
          {showTag && (
            <Text style={[rType.labelSm, { color: atmo.faint }]} maxFontSizeMultiplier={1.2}>
              {step.timeOfDay === 'morning' ? 'AM' : 'PM'}
            </Text>
          )}
          {pick && !revealPick && (
            <Pressable
              onPress={() => setRevealPick(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`See my pick for this step: ${pick.name}`}
              style={{ marginTop: showTag ? 8 : 0 }}
            >
              <Packshot pick={pick} size={44} atmo={atmo} radius={10} />
            </Pressable>
          )}
        </View>
      </View>

      {pick && !revealPick && (
        <Pressable
          onPress={() => setRevealPick(true)}
          hitSlop={8}
          accessibilityRole="button"
          style={styles.askPick}
        >
          <Text style={[rType.bodySm, { color: atmo.muted, textDecorationLine: 'underline' }]} maxFontSizeMultiplier={1.3}>
            Want my pick for this?
          </Text>
        </Pressable>
      )}

      {pick && revealPick && (
        <View style={{ marginTop: 12 }}>
          <ProductPick pick={pick} atmo={atmo} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 14 },
  headline: { flexDirection: 'row', alignItems: 'flex-start' },
  text: { flex: 1 },
  side: { marginLeft: 12, alignItems: 'flex-end' },
  askPick: { marginTop: 10, alignSelf: 'flex-start' },
});

/**
 * FocusCard — Mode B's quiet poster. The single next action as hero, its
 * throughline as a small caption, and air around everything. NOT the whole
 * list. The orb's invitation ("Good morning - ready for your morning two
 * steps? About 90 seconds.") lives here, where the decision is made. A quick
 * "done" path works without entering the ritual; "Start tonight" drops into
 * the guided ritual (kept calm — the one loud filled control is Mode A's CTA).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dsElevation } from '@/theme/ds';
import type { PeriodAtmosphere } from '@/theme/routineAtmosphere';
import type { FocusVM } from '../model';
import { rType } from '../tokens';
import { VOICE } from '../voice';
import { Packshot } from './Packshot';

export function FocusCard({
  focus,
  atmo,
  onStart,
  onQuickDone,
}: {
  focus: FocusVM;
  atmo: PeriodAtmosphere;
  onStart: () => void;
  onQuickDone: () => void;
}) {
  const card = [
    styles.card,
    { backgroundColor: atmo.card, borderColor: atmo.hairline },
    !atmo.dark && dsElevation.e2,
  ];

  if (focus.allComplete || !focus.heroStep) {
    return (
      <View style={card}>
        <Text style={[rType.label, { color: atmo.faint }]} maxFontSizeMultiplier={1.2}>
          DONE FOR NOW
        </Text>
        <Text style={[rType.hero, { color: atmo.ink, marginTop: 10 }]} maxFontSizeMultiplier={1.3}>
          Nothing left today.
        </Text>
        <Text style={[rType.throughline, { color: atmo.muted, marginTop: 8 }]} maxFontSizeMultiplier={1.3}>
          {VOICE.doneTheTrick}
        </Text>
      </View>
    );
  }

  const step = focus.heroStep;
  return (
    <View style={card}>
      <View style={styles.headRow}>
        <Text style={[rType.label, { color: atmo.faint, flex: 1 }]} maxFontSizeMultiplier={1.2}>
          NEXT · {step.timeOfDay === 'morning' ? 'MORNING' : 'EVENING'}
        </Text>
        {/* The actual bottle for this step — the poster's quiet object. */}
        {step.product.pick && <Packshot pick={step.product.pick} size={56} atmo={atmo} />}
      </View>
      <Text style={[rType.hero, { color: atmo.ink, marginTop: 10 }]} maxFontSizeMultiplier={1.3}>
        {step.action}
      </Text>
      <Text style={[rType.throughline, { color: atmo.muted, marginTop: 10 }]} maxFontSizeMultiplier={1.3}>
        {step.throughline}
      </Text>

      {/* The orb's invitation — the specced sentence, where the choice lives. */}
      <Text style={[rType.bodySm, { color: atmo.faint, marginTop: 18 }]} maxFontSizeMultiplier={1.3}>
        {focus.prompt}
        {focus.doneCount > 0 ? `  ·  ${focus.doneCount} of ${focus.total} done` : ''}
      </Text>

      <View style={styles.actions}>
        <Pressable
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel={focus.ctaLabel}
          style={({ pressed }) => [
            styles.start,
            { backgroundColor: atmo.ink, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[rType.button, { color: atmo.card }]} maxFontSizeMultiplier={1.1}>
            {focus.ctaLabel}
          </Text>
        </Pressable>
        <Pressable
          onPress={onQuickDone}
          accessibilityRole="button"
          accessibilityLabel="Mark this step done without the ritual"
          hitSlop={8}
          style={styles.quick}
        >
          <Text style={[rType.bodyMed, { color: atmo.muted }]} maxFontSizeMultiplier={1.3}>
            Mark done
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 24 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start' },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  start: {
    minHeight: 50,
    paddingVertical: 13,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quick: { marginLeft: 20, paddingVertical: 12 },
});

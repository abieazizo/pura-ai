/**
 * FocusCard — Mode B's quiet poster. The single next action as hero, its
 * throughline as a small caption, and air around everything. NOT the whole
 * list. A quick "done" path works here without entering the ritual; "Start"
 * drops into the guided ritual (kept calm, not the one loud control — that's
 * reserved for Mode A's reveal CTA).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dsElevation } from '@/theme/ds';
import type { PeriodAtmosphere } from '@/theme/routineAtmosphere';
import type { FocusVM } from '../model';
import { rType } from '../tokens';

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
        <Text style={[rType.label, { color: atmo.faint }]}>DONE FOR NOW</Text>
        <Text style={[rType.hero, { color: atmo.ink, marginTop: 10 }]}>Nothing left today.</Text>
        <Text style={[rType.throughline, { color: atmo.muted, marginTop: 8 }]}>
          You did the small thing. That's the whole trick.
        </Text>
      </View>
    );
  }

  const step = focus.heroStep;
  return (
    <View style={card}>
      <Text style={[rType.label, { color: atmo.faint }]}>
        NEXT · {step.timeOfDay === 'morning' ? 'MORNING' : 'EVENING'}
      </Text>
      <Text style={[rType.hero, { color: atmo.ink, marginTop: 10 }]}>{step.action}</Text>
      <Text style={[rType.throughline, { color: atmo.muted, marginTop: 10 }]}>{step.throughline}</Text>

      <Text style={[rType.bodySm, { color: atmo.faint, marginTop: 18 }]}>
        {focus.durationLine}
        {focus.total > 1 ? `  ·  ${focus.doneCount} of ${focus.total} done` : ''}
      </Text>

      <View style={styles.actions}>
        <Pressable
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel="Start the ritual"
          style={({ pressed }) => [
            styles.start,
            { backgroundColor: atmo.ink, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[rType.button, { color: atmo.card }]}>Start</Text>
        </Pressable>
        <Pressable onPress={onQuickDone} accessibilityRole="button" hitSlop={8} style={styles.quick}>
          <Text style={[rType.bodyMed, { color: atmo.muted }]}>Mark done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 24 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  start: {
    height: 50,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quick: { marginLeft: 20, paddingVertical: 12 },
});

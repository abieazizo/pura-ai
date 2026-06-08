/**
 * MoveCard — the screen-2 "move". The shared element of the morph: it persists
 * from the build screen and, in Mode A, its title rises and lightens into a
 * section header while its steps cascade beneath. Here it is the resting card.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PeriodAtmosphere } from '@/theme/routineAtmosphere';
import { rType } from '../tokens';

export function MoveCard({
  title,
  why,
  atmo,
}: {
  title: string;
  why: string;
  atmo: PeriodAtmosphere;
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: atmo.card, borderColor: atmo.hairline },
      ]}
    >
      <Text style={[rType.moveTitle, { color: atmo.ink }]}>{title}</Text>
      <Text style={[rType.body, { color: atmo.muted, marginTop: 4 }]}>{why}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
});

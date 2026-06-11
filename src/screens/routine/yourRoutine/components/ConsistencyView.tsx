/**
 * ConsistencyView — kind consistency. Celebrates the run, NEVER shames a miss.
 * Invisible until invited (pulled, not pushed). A soft strip of days: done days
 * glow gently, missed days are simply quiet — never red, never a broken streak.
 * Plus one honest milestone, only when it's true.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PeriodAtmosphere } from '@/theme/routineAtmosphere';
import { rType } from '../tokens';

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ConsistencyView({
  completionDates,
  anchor,
  atmo,
  streak,
  milestone,
  days = 21,
}: {
  completionDates: string[];
  anchor: Date;
  atmo: PeriodAtmosphere;
  streak: { count: number; includesToday: boolean };
  milestone?: string;
  days?: number;
}) {
  const set = new Set(completionDates);
  const dots: boolean[] = [];
  for (let ago = days - 1; ago >= 0; ago--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - ago);
    dots.push(set.has(dateKey(d)));
  }
  const headline =
    streak.count >= 2
      ? `${streak.count} days, kept gently.`
      : streak.count === 1
        ? 'You showed up. That counts.'
        : "You're here. That's the start.";

  return (
    <View>
      <Text style={[rType.section, { color: atmo.ink }]}>{headline}</Text>
      <Text style={[rType.bodySm, { color: atmo.muted, marginTop: 6 }]}>
        Misses don't count against you. Skin doesn't keep score.
      </Text>

      <View
        style={styles.strip}
        accessible
        accessibilityLabel={`${dots.filter(Boolean).length} of the last ${days} days done`}
      >
        {dots.map((on, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: on ? atmo.ink : 'transparent',
                borderColor: on ? 'transparent' : atmo.hairline,
                opacity: on ? 0.9 : 1,
              },
            ]}
          />
        ))}
      </View>

      {milestone ? (
        <Text style={[rType.throughline, { color: atmo.muted, marginTop: 16 }]}>{milestone}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 18, gap: 7 },
  dot: { width: 9, height: 9, borderRadius: 5, borderWidth: StyleSheet.hairlineWidth },
});

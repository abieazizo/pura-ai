/**
 * ConsistencyStrip — one quiet progress line + the seven-day strip.
 *
 * Slim rounded bars, oldest → today: Pura Blue for a day with at least one
 * completed step, #E2E6EE for a day without. No dots, no labels per day,
 * no streak counter — the strip records, it never scores or guilts.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { dsSpace, dsType, puraAssist } from '@/theme';
import type { StripDay } from './dailyHomeModel';

const NOT_YET = '#E2E6EE';

export function ConsistencyStrip({
  progressLine,
  strip,
}: {
  progressLine: string;
  strip: StripDay[];
}) {
  const doneCount = strip.filter((d) => d.done).length;
  return (
    <View
      accessible
      accessibilityLabel={`${progressLine || 'Your week'}. ${doneCount} of the last 7 days completed.`}
    >
      {progressLine ? <Text style={styles.line}>{progressLine}</Text> : null}
      <View style={styles.bars}>
        {strip.map((d) => (
          <View
            key={d.dateKey}
            style={[
              styles.bar,
              { backgroundColor: d.done ? puraAssist.blue : NOT_YET },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Quiet sentence-case caption — never a tracked uppercase label; the
  // progress line is a murmur, not a section header.
  line: {
    ...dsType.caption,
    color: puraAssist.muted,
    marginBottom: dsSpace.sm,
  },
  bars: {
    flexDirection: 'row',
    gap: 6,
  },
  bar: {
    flex: 1,
    height: 5,
    borderRadius: 999,
  },
});

/**
 * RoutineCompletionStrip — visible "X of Y complete" progress for the
 * active slot. Drives the completion gamification surface.
 *
 * No streak language, no shame. Just calm progress.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle, Clock } from 'phosphor-react-native';
import { palette } from '@/theme';

interface Props {
  segment: 'morning' | 'evening';
  completedCount: number;
  totalCount: number;
  estimateMin: number;
}

export function RoutineCompletionStrip({
  segment,
  completedCount,
  totalCount,
  estimateMin,
}: Props) {
  const allDone = completedCount === totalCount && totalCount > 0;
  const ratio = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} maxFontSizeMultiplier={1.15}>
            {segment === 'morning' ? 'Morning routine' : 'Evening routine'}
          </Text>
          <Text
            style={styles.subtitle}
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
          >
            {allDone
              ? segment === 'morning'
                ? 'Morning routine complete — barrier protected.'
                : 'Evening routine complete — recovery mode is on.'
              : `${completedCount} of ${totalCount} steps complete`}
          </Text>
        </View>

        <View style={styles.metaRow}>
          {allDone ? (
            <View style={[styles.estPill, styles.estPillDone]}>
              <CheckCircle size={11} color={palette.mossDeep} weight="fill" />
              <Text style={[styles.estText, { color: palette.mossDeep }]}>
                Done
              </Text>
            </View>
          ) : (
            <View style={styles.estPill}>
              <Clock size={11} color={palette.inkSecondary} weight="duotone" />
              <Text style={styles.estText} maxFontSizeMultiplier={1.1}>
                {`${estimateMin} min`}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Step dots — visual progress instead of a bar so each step is
          its own object the eye can count. */}
      <View style={styles.dotsRow}>
        {Array.from({ length: totalCount }).map((_, i) => {
          const filled = i < completedCount;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                filled ? styles.dotFilled : styles.dotEmpty,
              ]}
            />
          );
        })}
        {/* Progress bar — fills the remainder of the row. */}
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${ratio * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    marginHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    letterSpacing: -0.2,
    color: palette.ink,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: palette.inkSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: palette.bgDeep,
  },
  estPillDone: {
    backgroundColor: palette.mossLight,
  },
  estText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.4,
    color: palette.inkSecondary,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotFilled: {
    backgroundColor: palette.clay,
  },
  dotEmpty: {
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  barTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.bgDeep,
    overflow: 'hidden',
    marginLeft: 4,
  },
  barFill: {
    height: 4,
    backgroundColor: palette.clay,
    borderRadius: 2,
  },
});

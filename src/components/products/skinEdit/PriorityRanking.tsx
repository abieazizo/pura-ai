/**
 * PriorityRanking — Tonight's priorities. Three ranked rows of
 * editorial copy, ordered by what to tackle first.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme';
import type { PriorityRow } from '@/state/skinEdit';

interface PriorityRankingProps {
  priorities: PriorityRow[];
}

export function PriorityRanking({ priorities }: PriorityRankingProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading} maxFontSizeMultiplier={1.2}>
        Tonight’s priorities
      </Text>
      <View style={styles.list}>
        {priorities.map((p, idx) => (
          <View
            key={p.rank}
            style={[styles.row, idx < priorities.length - 1 ? styles.rowDivider : null]}
          >
            <Text style={styles.rank} maxFontSizeMultiplier={1.1}>
              {String(p.rank).padStart(2, '0')}
            </Text>
            <View style={styles.copy}>
              <Text style={styles.title} maxFontSizeMultiplier={1.2}>
                {p.title}
              </Text>
              <Text style={styles.detail} maxFontSizeMultiplier={1.2}>
                {p.detail}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  heading: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 16,
  },
  list: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.hairline,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  rank: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    color: palette.clay,
    width: 30,
    lineHeight: 22,
    paddingTop: 2,
  },
  copy: {
    flex: 1,
    paddingTop: 2,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: palette.ink,
    marginBottom: 2,
  },
  detail: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
  },
});

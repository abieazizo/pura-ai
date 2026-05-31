/**
 * PuraVerdictCard — the defining component of the Products experience.
 *
 * Renders Pura's signed verdict for a single product, in any of the
 * six recommendation states. Reusable on the Skin Edit landing
 * (honesty card) and the verdict page (signature section).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme';
import type { Recommendation } from '@/state/skinEdit';

interface PuraVerdictCardProps {
  recommendation: Recommendation;
  compact?: boolean;
}

export function PuraVerdictCard({ recommendation, compact }: PuraVerdictCardProps) {
  return (
    <View style={[styles.card, compact ? styles.cardCompact : null]}>
      <View style={styles.rule} />

      <Text style={styles.label} maxFontSizeMultiplier={1.1}>
        PURA VERDICT · BASED ON TODAY’S SCAN
      </Text>

      <Text style={styles.headline} maxFontSizeMultiplier={1.2}>
        {recommendation.verdictHeadline}
      </Text>

      <Text style={styles.body} maxFontSizeMultiplier={1.3}>
        {recommendation.verdictBody}
      </Text>

      <View style={styles.cellGrid}>
        {recommendation.verdictCells.map((cell, idx) => (
          <View
            key={`${cell.label}-${idx}`}
            style={[
              styles.cell,
              idx % 2 === 0 ? styles.cellLeft : styles.cellRight,
              idx < 2 ? styles.cellTop : styles.cellBottom,
            ]}
          >
            <Text style={styles.cellLabel} maxFontSizeMultiplier={1.1}>
              {cell.label.toUpperCase()}
            </Text>
            <Text style={styles.cellValue} maxFontSizeMultiplier={1.2}>
              {cell.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.clayPaper,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: '#CFE3FF',
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  cardCompact: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  rule: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: palette.clay,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 10,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: palette.inkSecondary,
    marginBottom: 18,
  },
  cellGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  cell: {
    width: '50%',
    paddingHorizontal: 8,
    paddingVertical: 12,
    minHeight: 64,
  },
  cellLeft: {
    paddingRight: 12,
  },
  cellRight: {
    paddingLeft: 4,
  },
  cellTop: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(168, 74, 56, 0.12)',
  },
  cellBottom: {},
  cellLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: palette.clayDeep,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cellValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    lineHeight: 17,
    color: palette.ink,
  },
});

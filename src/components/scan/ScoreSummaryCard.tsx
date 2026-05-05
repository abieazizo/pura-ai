/**
 * ScoreSummaryCard — v19.0.
 *
 * Layer 1 result-overview score module. ONE clean score treatment:
 *   • small captured-photo thumbnail (left)
 *   • "SKIN SCORE" kicker
 *   • big serif number + band label
 *   • premium delta phrase ("First scan" / "Unchanged since last
 *     scan" / "+2 since last scan")
 *   • micro-helper: "Based on visible signals from this scan"
 *
 * No competing dial / mini-ring / duplicate visual.
 */

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme';
import {
  type SkinScore,
  deltaPhrase,
  tierLabel as tierLabelFor,
} from '@/utils/skinScore';

export interface ScoreSummaryCardProps {
  photoUri: string;
  score: SkinScore;
  /** Override delta source. Pass `score.deltaSinceLast` directly when
   *  the screen has a recent scan; pass null on first-scan. */
  delta: number | null;
}

export function ScoreSummaryCard({
  photoUri,
  score,
  delta,
}: ScoreSummaryCardProps) {
  const tier = tierLabelFor(score.tier);
  const deltaText = deltaPhrase(delta);

  return (
    <View style={styles.row}>
      <View style={styles.thumb}>
        <Image
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      </View>
      <View style={styles.right}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          SKIN SCORE
        </Text>
        <View style={styles.numberRow}>
          <Text
            style={styles.number}
            maxFontSizeMultiplier={1.1}
            allowFontScaling={false}
          >
            {score.value}
          </Text>
          <Text style={styles.tier} maxFontSizeMultiplier={1.15}>
            {tier}
          </Text>
        </View>
        <Text
          style={styles.delta}
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
        >
          {deltaText}
        </Text>
        <Text
          style={styles.helper}
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
        >
          Based on visible signals from this scan
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 8,
    marginBottom: 24,
  },
  thumb: {
    width: 84,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  right: {
    flex: 1,
    alignItems: 'flex-start',
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 4,
  },
  number: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -1.6,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  tier: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: 0.2,
    color: palette.inkSecondary,
  },
  delta: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    letterSpacing: 0.1,
    color: palette.inkSecondary,
    marginBottom: 2,
  },
  helper: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 12,
    color: palette.inkTertiary,
  },
});

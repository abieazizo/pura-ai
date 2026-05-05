/**
 * ScoreSummaryCard — v19.1 editorial.
 *
 * Replaces the v19.0 row-of-equal-weight layout (thumbnail + serif
 * number + tier + delta + helper all sharing the right column) with
 * an editorial composition: a small portrait thumbnail that frames
 * the face, then a vertical typographic stack with a clear focal
 * line — the score number paired inline with the band label —
 * followed by a thin hairline rule and one quiet helper line.
 *
 * Reads like a luxury skincare report header, not a dashboard widget.
 *
 * Visual hierarchy:
 *   • portrait thumbnail (88x108, soft hairline border)
 *   • SKIN SCORE  — tracked Inter-SemiBold, 10pt, tertiary ink
 *   • 64        Good     — Instrument Serif 64pt + tier pill 11pt
 *   • thin hairline rule
 *   • +2 since last scan  · Based on visible signals from this scan
 *     (single line, italic-serif "Based on visible signals" italicised)
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
  /** Pass `score.deltaSinceLast` directly. */
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
      <View style={styles.text}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          SKIN SCORE
        </Text>
        <View style={styles.numberRow}>
          <Text
            style={styles.number}
            maxFontSizeMultiplier={1.05}
            allowFontScaling={false}
          >
            {score.value}
          </Text>
          <View style={styles.tierPill}>
            <Text style={styles.tierText} maxFontSizeMultiplier={1.1}>
              {tier.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.rule} />
        <Text
          style={styles.metaLine}
          maxFontSizeMultiplier={1.2}
          numberOfLines={2}
        >
          <Text style={styles.metaDelta}>{deltaText}</Text>
          <Text style={styles.metaSep}>{'  ·  '}</Text>
          <Text style={styles.metaHelper}>
            Based on visible signals from this scan
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
    marginTop: 10,
    marginBottom: 28,
  },
  // Portrait thumbnail — 88×108 (slightly more vertical than v19.0
  // and with a hairline border so the photo reads as a framed
  // editorial detail rather than a raw thumbnail.
  thumb: {
    width: 88,
    height: 108,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  text: {
    flex: 1,
    alignItems: 'flex-start',
    paddingTop: 4,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.7,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 12,
  },
  number: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: -2,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  // Tier sits in a quiet pill at the score's baseline. Inline, not
  // stacked — so the whole composition reads as ONE horizontal line.
  tierPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  tierText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: palette.inkSecondary,
  },
  rule: {
    width: 36,
    height: 1,
    backgroundColor: palette.hairline,
    marginBottom: 8,
  },
  metaLine: {
    flexShrink: 1,
  },
  metaDelta: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    letterSpacing: 0.1,
    color: palette.inkSecondary,
  },
  metaSep: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    color: palette.inkTertiary,
  },
  metaHelper: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 12.5,
    color: palette.inkTertiary,
  },
});

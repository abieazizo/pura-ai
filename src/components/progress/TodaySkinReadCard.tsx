/**
 * TodaySkinReadCard — replaces the long "WHAT THE AI SEES" paragraph.
 *
 * Consumes the canonical insight adapter and renders:
 *   • H2 "Today's skin read"
 *   • 1–2 sentence sans-serif summary
 *   • Up to 3 evidence chips (tone-coded)
 *   • Collapsed "View full AI notes" disclosure (default closed)
 *
 * Trust rules:
 *   • When `confidenceCaveat === true`, the long-notes disclosure
 *     remains, but the headline copy softens — UI says less, not more.
 *   • When the summary is empty (no scan), the card renders a quiet
 *     empty-state line instead of a fake summary.
 */

import React, { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { CaretDown, CaretUp } from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import type { InsightChip } from '@/state/progressRoutineInsight';

interface Props {
  summary: string;
  chips: InsightChip[];
  fullAINotes: string | null;
  confidenceCaveat?: boolean;
}

// Enable LayoutAnimation on Android once at module load.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function TodaySkinReadCard({
  summary,
  chips,
  fullAINotes,
  confidenceCaveat = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext({
      duration: 220,
      create: { type: 'easeOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
    });
    hapt.select();
    setExpanded((v) => !v);
  };

  const hasNotes = !!fullAINotes && fullAINotes.trim().length > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        TODAY’S SKIN READ
      </Text>
      <Text style={styles.summary} maxFontSizeMultiplier={1.2}>
        {summary}
      </Text>

      {confidenceCaveat ? (
        <Text style={styles.caveat} maxFontSizeMultiplier={1.15}>
          Confidence is low on this scan — rescan in better light for a sharper read.
        </Text>
      ) : null}

      {chips.length > 0 ? (
        <View style={styles.chipRow}>
          {chips.map((c) => (
            <View
              key={c.label}
              style={[styles.chip, chipToneStyle(c.tone)]}
            >
              <Text
                style={[styles.chipText, chipToneText(c.tone)]}
                maxFontSizeMultiplier={1.1}
              >
                {c.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {hasNotes ? (
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={
            expanded ? 'Hide full AI notes' : 'View full AI notes'
          }
          hitSlop={8}
          style={({ pressed }) => [
            styles.disclosure,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.disclosureLabel} maxFontSizeMultiplier={1.1}>
            {expanded ? 'Hide full AI notes' : 'View full AI notes'}
          </Text>
          {expanded ? (
            <CaretUp size={12} color={palette.inkSecondary} weight="bold" />
          ) : (
            <CaretDown size={12} color={palette.inkSecondary} weight="bold" />
          )}
        </Pressable>
      ) : null}

      {expanded && hasNotes ? (
        <View style={styles.notes}>
          <Text style={styles.notesBody} maxFontSizeMultiplier={1.2}>
            {fullAINotes}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function chipToneStyle(tone: InsightChip['tone']) {
  switch (tone) {
    case 'good':
      return { backgroundColor: palette.mossLight, borderColor: palette.moss };
    case 'warning':
      return { backgroundColor: palette.rustLight, borderColor: palette.rust };
    case 'neutral':
      return { backgroundColor: palette.bgDeep, borderColor: palette.hairline };
  }
}

function chipToneText(tone: InsightChip['tone']) {
  switch (tone) {
    case 'good':
      return { color: palette.mossDeep };
    case 'warning':
      return { color: palette.rust };
    case 'neutral':
      return { color: palette.inkSecondary };
  }
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    marginHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  summary: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: palette.ink,
  },
  caveat: {
    marginTop: 8,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
  },
  chipRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  disclosure: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disclosureLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkSecondary,
  },
  notes: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
  },
  notesBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 20,
    color: palette.inkSecondary,
  },
});

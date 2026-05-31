/**
 * ScanSignalStrip — round-2 rebuild.
 *
 * Replaces the chip-rail signal strip with a sentence-shaped editor's
 * voice. Reads as something Nora said, not a token bar:
 *
 *   ── Nora's three concerns tonight:
 *   breakouts, hydration, barrier.
 *
 * Signals are inline italic-serif words within the sentence, tappable
 * (active gets an underline). Falls back to a quiet baseline line
 * when the user has no scan.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { puraShop, puraShopLayout } from '@/theme';
import { EDITOR_NORA } from '../curator';

export interface ScanSignal {
  key: string;
  /** Short editorial label — "chin", "barrier", "t-zone". */
  label: string;
  active?: boolean;
}

export interface ScanSignalStripProps {
  signals: ScanSignal[];
  onSelect?: (key: string) => void;
}

export function ScanSignalStrip({ signals, onSelect }: ScanSignalStripProps) {
  const hasSignals = signals.length > 0;
  const editorFirstName = EDITOR_NORA.name.split(' ')[0];

  if (!hasSignals) {
    return (
      <View style={styles.outer}>
        <View style={styles.kickerRow}>
          <View style={styles.lead} />
          <Text style={styles.kicker} maxFontSizeMultiplier={1.05}>
            BASELINE EDIT
          </Text>
        </View>
        <Text style={styles.sentence} maxFontSizeMultiplier={1.15}>
          {`Tonight's picks before your first scan — quiet, gentle, and a fair place to begin.`}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.outer}>
      <View style={styles.kickerRow}>
        <View style={styles.lead} />
        <Text style={styles.kicker} maxFontSizeMultiplier={1.05}>
          {`${editorFirstName.toUpperCase()}'S READ`}
        </Text>
      </View>
      <View style={styles.sentenceRow}>
        <Text style={styles.sentenceStart} maxFontSizeMultiplier={1.15}>
          {`Three concerns tonight — `}
        </Text>
        {signals.slice(0, 4).map((s, i, arr) => (
          <React.Fragment key={s.key}>
            <Pressable
              onPress={() => onSelect?.(s.key)}
              accessibilityRole="button"
              accessibilityLabel={`Focus the edit on ${s.label}`}
              hitSlop={6}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text
                style={[styles.signal, s.active && styles.signalActive]}
                maxFontSizeMultiplier={1.15}
              >
                {s.label}
              </Text>
            </Pressable>
            {i < arr.length - 1 ? (
              <Text style={styles.connector}>
                {i === arr.length - 2 ? ', and ' : ', '}
              </Text>
            ) : null}
          </React.Fragment>
        ))}
        <Text style={styles.sentenceEnd} maxFontSizeMultiplier={1.15}>
          {'.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    paddingBottom: 22,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  lead: {
    width: 18,
    height: StyleSheet.hairlineWidth,
    backgroundColor: puraShop.coralDeep,
    opacity: 0.6,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 2.2,
    color: puraShop.coralDeep,
  },
  sentenceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  sentence: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    lineHeight: 24,
    color: puraShop.inkSecondary,
    letterSpacing: -0.1,
  },
  sentenceStart: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    lineHeight: 24,
    color: puraShop.ink,
    letterSpacing: -0.1,
  },
  signal: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    lineHeight: 24,
    color: puraShop.ink,
    letterSpacing: -0.1,
  },
  signalActive: {
    color: puraShop.coralDeep,
    textDecorationLine: 'underline',
  },
  connector: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    lineHeight: 24,
    color: puraShop.ink,
    letterSpacing: -0.1,
  },
  sentenceEnd: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    lineHeight: 24,
    color: puraShop.ink,
    letterSpacing: -0.1,
  },
});

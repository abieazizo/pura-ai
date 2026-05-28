/**
 * ScanSignalStrip — pass 6 bridge between the scan and the shop.
 *
 * A single horizontal line of italic-serif scan signals, separated by
 * thin vertical rules. Tapping a signal narrows the shop's focus to
 * that concern. Replaces the previous SkinProfileStrip + ConcernFilter
 * chip rows with one editorial line.
 *
 *   TONIGHT'S SIGNALS  │  chin  │  barrier  │  t-zone
 *
 * When no scan exists, falls back to:
 *
 *   TONIGHT'S EDIT — baseline picks  (no signals)
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { puraShop, puraShopLayout } from '@/theme';

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
  return (
    <View style={styles.outer}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.05}>
        {hasSignals ? "TONIGHT'S SIGNALS" : "TONIGHT'S EDIT"}
      </Text>
      <View style={styles.rule} />
      {hasSignals ? (
        <View style={styles.row}>
          {signals.map((s, i) => (
            <React.Fragment key={s.key}>
              <Pressable
                onPress={() => onSelect?.(s.key)}
                accessibilityRole="button"
                accessibilityLabel={`Focus the edit on ${s.label}`}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.signalBtn,
                  pressed && { opacity: 0.65 },
                ]}
              >
                <Text
                  style={[
                    styles.signalText,
                    s.active && styles.signalActive,
                  ]}
                  maxFontSizeMultiplier={1.1}
                >
                  {s.label}
                </Text>
              </Pressable>
              {i < signals.length - 1 ? (
                <View style={styles.sep} />
              ) : null}
            </React.Fragment>
          ))}
        </View>
      ) : (
        <Text style={styles.fallback} maxFontSizeMultiplier={1.1}>
          baseline picks — take a scan to make them yours
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 2.2,
    color: puraShop.coralDeep,
  },
  rule: {
    width: 16,
    height: StyleSheet.hairlineWidth,
    backgroundColor: puraShop.borderWarm,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  signalBtn: {
    paddingVertical: 4,
  },
  signalText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    color: puraShop.inkSecondary,
    letterSpacing: -0.1,
  },
  signalActive: {
    color: puraShop.ink,
    textDecorationLine: 'underline',
  },
  sep: {
    width: 1,
    height: 11,
    backgroundColor: puraShop.borderWarm,
    marginHorizontal: 12,
  },
  fallback: {
    flex: 1,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    color: puraShop.inkMuted,
    letterSpacing: -0.05,
  },
});

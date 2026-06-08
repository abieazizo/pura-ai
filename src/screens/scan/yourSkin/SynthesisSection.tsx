/**
 * SynthesisSection — Section A. The screen OPENS on orientation + hope, never a
 * flaw. The persistent orb (owned by the container) speaks; beneath it:
 *
 *   • skin_summary_line — the warm gestalt that references the person's goal,
 *     in the orb's voice (Instrument Serif 24/30). Pre-wrapped, shrinks to fit,
 *     never overflows.
 *   • "This is your starting point." — the Day-1 frame: it plants progress
 *     WITHOUT a number (no score, ever).
 *   • horizon_line — ONE bounded, hedged, honest forward-look ("should", never
 *     "will"). The same line returns at the commit, a quiet refrain of hope.
 *
 * VoiceOver reads exactly this order: summary → Day-1 → horizon.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COPY2, TYPE2, type ThemeTokens } from './yourSkinMotion';

export interface SynthesisSectionProps {
  summaryLine: string;
  horizonLine?: string;
  tokens: ThemeTokens;
}

export function SynthesisSection({ summaryLine, horizonLine, tokens }: SynthesisSectionProps) {
  return (
    <View>
      <Text
        style={[TYPE2.synthesis, { color: tokens.line }]}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        numberOfLines={5}
        maxFontSizeMultiplier={1.5}
        accessibilityRole="header"
      >
        {summaryLine}
      </Text>

      <Text style={[TYPE2.dayOne, { color: tokens.label, marginTop: 16 }]} maxFontSizeMultiplier={1.4}>
        {COPY2.startingPoint}
      </Text>

      {!!horizonLine && (
        <Text
          style={[TYPE2.horizon, { color: tokens.line, opacity: 0.92, marginTop: 12 }]}
          minimumFontScale={0.85}
          adjustsFontSizeToFit
          numberOfLines={4}
          maxFontSizeMultiplier={1.6}
        >
          {horizonLine}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({});

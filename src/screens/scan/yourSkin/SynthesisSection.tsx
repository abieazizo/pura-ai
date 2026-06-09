/**
 * SynthesisSection — Section A. The screen OPENS on orientation + hope, never a
 * flaw — now as an EDITORIAL composition rather than a centred column:
 *
 *   • a wide-tracked Inter eyebrow ("YOUR SKIN"), pushed off-axis top-left;
 *   • the skin_summary_line as an OVERSIZED Instrument-Serif "moment"
 *     (TYPE2.momentXL, 40/44), tucked into the orb's negative space and
 *     overlapping a soft cast-light field offset to the upper-right;
 *   • "This is your starting point." — the quiet Day-1 frame (no score, ever);
 *   • horizon_line — ONE bounded, hedged forward-look ("should", never "will"),
 *     at a much smaller serif size → deliberate scale contrast.
 *
 * The light field is an RN/expo-linear-gradient approximation by default; pass
 * `lightSlot` (e.g. <OrbLightBackdropSkia/>) for the GPU cast light. Hue lives
 * ONLY in the light — never in the text — so WCAG contrast on dark is unchanged.
 *
 * Accessibility: VoiceOver still reads summary → Day-1 → horizon (the eyebrow is
 * decorative). The serif moment shrinks-to-fit and NEVER truncates; Dynamic Type
 * wraps. WCAG AA holds because text colour is the theme line/label, not the tint.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COPY2, TYPE2, type ThemeTokens } from './yourSkinMotion';

export type SynthesisScanTone = 'reactive' | 'active' | 'balanced' | 'none';

export interface SynthesisSectionProps {
  summaryLine: string;
  horizonLine?: string;
  tokens: ThemeTokens;
  /** Tints the live light field (hue stays in the light, never the text). */
  scanTone?: SynthesisScanTone;
  /** Full-fidelity cast light (e.g. <OrbLightBackdropSkia/>). Replaces the RN one. */
  lightSlot?: React.ReactNode;
}

const TONE_LIGHT: Record<SynthesisScanTone, string> = {
  balanced: '122, 107, 200',
  reactive: '94, 143, 208',
  active: '138, 107, 198',
  none: '110, 137, 198',
};

export function SynthesisSection({
  summaryLine,
  horizonLine,
  tokens,
  scanTone = 'balanced',
  lightSlot,
}: SynthesisSectionProps) {
  const rgb = TONE_LIGHT[scanTone] ?? TONE_LIGHT.balanced;
  const isDark = tokens.theme === 'dark';
  // The live cast light is subtle on dark, near-invisible on light (the orb
  // already lifts the light theme). Hue only — opacity is low.
  const lightColors = isDark
    ? ([`rgba(${rgb}, 0.22)`, `rgba(${rgb}, 0.06)`, 'transparent'] as const)
    : ([`rgba(${rgb}, 0.10)`, `rgba(${rgb}, 0.03)`, 'transparent'] as const);

  return (
    <View style={styles.root}>
      {/* Cast light — off-axis upper-right. Skia slot if provided, else live. */}
      <View style={styles.lightWrap} pointerEvents="none">
        {lightSlot ?? (
          <LinearGradient
            colors={lightColors}
            locations={[0, 0.5, 1]}
            start={{ x: 1, y: -0.1 }}
            end={{ x: 0.05, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
      </View>

      {/* Eyebrow — decorative, off-axis. */}
      <Text
        style={[TYPE2.eyebrow, { color: tokens.label, marginLeft: 2 }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
        maxFontSizeMultiplier={1.4}
      >
        Your skin
      </Text>

      {/* The oversized serif moment = the summary line. Shrinks, never truncates. */}
      <Text
        style={[TYPE2.momentXL, styles.moment, { color: tokens.line }]}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        numberOfLines={6}
        maxFontSizeMultiplier={1.5}
        accessibilityRole="header"
      >
        {summaryLine}
      </Text>

      <Text
        style={[TYPE2.dayOne, { color: tokens.label, marginTop: 18 }]}
        maxFontSizeMultiplier={1.4}
      >
        {COPY2.startingPoint}
      </Text>

      {!!horizonLine && (
        <Text
          style={[TYPE2.horizon, { color: tokens.line, opacity: 0.9, marginTop: 12, maxWidth: '94%' }]}
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

const styles = StyleSheet.create({
  root: { position: 'relative', paddingTop: 4 },
  lightWrap: {
    position: 'absolute',
    top: -120,
    right: -90,
    width: 320,
    height: 320,
    borderRadius: 999,
    overflow: 'hidden',
    opacity: 0.9,
  },
  moment: {
    marginTop: 10,
    // Sit in negative space against the upper-right light; leave the right
    // shoulder open so the composition reads off-axis, not a centred block.
    maxWidth: '96%',
  },
});

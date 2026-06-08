/**
 * ShareArtifactCard — the ONLY shareable thing on this flow, and it is never
 * cruel. It is a beautiful "Day 1: my starting point" card. It NEVER shows a
 * flaw-map, a score, or a finding — it celebrates the journey, not the flaws
 * (later, the same surface becomes a progress card). Invisible until invited
 * (opened from the quiet options menu); a scrim + a single gentle card.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COPY2, TYPE, TYPE2, type ThemeTokens } from './yourSkinMotion';
import { hapt } from '@/utils/haptics';

export interface ShareArtifactCardProps {
  tokens: ThemeTokens;
  /** Aurora gradient for the card motif (soft, calm — matches the orb tone). */
  toneColors: [string, string, string];
  dateLabel: string;
  onShare: () => void;
  onClose: () => void;
}

export function ShareArtifactCard({ tokens, toneColors, dateLabel, onShare, onClose }: ShareArtifactCardProps) {
  return (
    <View style={styles.scrimWrap}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: tokens.cardSurface, borderColor: tokens.depth.hairline }]}>
        {/* The card itself — a quiet, hopeful marker. No flaws, ever. */}
        <View style={styles.card}>
          <LinearGradient colors={toneColors} start={{ x: 0.15, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
          {/* soft bloom motif */}
          <View style={styles.bloomWrap} pointerEvents="none">
            <LinearGradient colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.0)']} style={styles.bloom} />
          </View>
          <View style={styles.cardBody}>
            <Text style={[TYPE2.dayOne, { color: 'rgba(255,255,255,0.92)' }]}>{COPY2.shareEyebrow} · {dateLabel}</Text>
            <Text style={[TYPE2.planTitle, { color: '#FFFFFF', fontSize: 28, lineHeight: 34, marginTop: 8 }]}>{COPY2.shareTitle}</Text>
            <Text style={[TYPE2.quiet, { color: 'rgba(255,255,255,0.86)', marginTop: 10 }]} maxFontSizeMultiplier={1.5}>
              The day I started paying attention to my skin.
            </Text>
          </View>
        </View>

        <Text style={[TYPE2.quiet, { color: tokens.faint, marginTop: 14, textAlign: 'center' }]} maxFontSizeMultiplier={1.5}>
          {COPY2.shareSub}
        </Text>

        <Pressable onPress={() => { hapt.tap(); onShare(); }} accessibilityRole="button" style={[styles.shareBtn, { backgroundColor: tokens.accent }]}>
          <Text style={[TYPE.cta, { color: '#FFFFFF' }]} maxFontSizeMultiplier={1.4}>{COPY2.shareCta}</Text>
        </Pressable>
        <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8} style={styles.closeBtn}>
          <Text style={[TYPE2.quiet, { color: tokens.faint }]} maxFontSizeMultiplier={1.5}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrimWrap: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,5,9,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 50 },
  sheet: { width: '100%', maxWidth: 360, borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, padding: 18 },
  card: { borderRadius: 20, overflow: 'hidden', aspectRatio: 0.86, justifyContent: 'flex-end' },
  bloomWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'flex-end', justifyContent: 'flex-start' },
  bloom: { width: 220, height: 220, borderRadius: 999, marginTop: -40, marginRight: -40, opacity: 0.7 },
  cardBody: { padding: 22 },
  shareBtn: { height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  closeBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 2 },
});

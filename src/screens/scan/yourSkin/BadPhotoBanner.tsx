/**
 * BadPhotoBanner — the honest, calm carry-over when the read was made on a
 * rough photo. It never scolds and never blocks: it offers a clearer look. The
 * findings below it render tentative (fainter glows, smaller markers, hedged
 * words) and the plan is framed as "a gentle starting point we'll refine".
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COPY2, TYPE2, type ThemeTokens } from './yourSkinMotion';

export interface BadPhotoBannerProps {
  tokens: ThemeTokens;
  onRescan: () => void;
}

export function BadPhotoBanner({ tokens, onRescan }: BadPhotoBannerProps) {
  return (
    <View
      style={[styles.banner, { backgroundColor: tokens.theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(20,124,255,0.06)', borderColor: tokens.depth.hairline }]}
      accessibilityRole="alert"
    >
      <Text style={[TYPE2.quiet, { color: tokens.body, flex: 1 }]} maxFontSizeMultiplier={1.7}>
        {COPY2.badPhotoBanner}
      </Text>
      <Pressable onPress={onRescan} accessibilityRole="button" accessibilityLabel={COPY2.rescan} hitSlop={8} style={styles.btn}>
        <Text style={[TYPE2.quiet, { color: tokens.accent }]} maxFontSizeMultiplier={1.5}>Rescan</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  btn: { paddingVertical: 4, paddingHorizontal: 6 },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ReticleMode } from './Reticle';

export interface CaptionProps {
  mode: ReticleMode;
  /** Y position from top of screen — parent computes based on reticle center. */
  top: number;
}

const COPY: Record<ReticleMode, string> = {
  face: 'Soft light. Steady hand. Thirty seconds.',
  product: 'Frame the label or the barcode.',
  barcode: 'Center the barcode in the frame.',
};

/**
 * Italic serif caption 40pt below the reticle (§2.3). White at 90%, max
 * width 80%, centered.
 */
export function Caption({ mode, top }: CaptionProps) {
  return (
    <View style={[styles.wrap, { top }]} pointerEvents="none">
      <Text style={styles.text} maxFontSizeMultiplier={1.2}>
        {COPY[mode]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    alignItems: 'center',
  },
  text: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    lineHeight: 17 * 1.35,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    maxWidth: '100%',
  },
});

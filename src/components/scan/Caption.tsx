import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
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
 * v10.7 — first-scan copy variant. If the user has zero scans yet and
 * they're in face mode, the caption reads as an arrival beat ("Your
 * first scan. Thirty seconds.") rather than the generic technique
 * copy. Every scan after the first reverts to the standard line. This
 * makes the Tutorial → Scan handoff land as "this is the first real
 * product moment" instead of dumping the user into a generic camera.
 */
const FIRST_FACE_COPY = 'Your first scan. Thirty seconds.';

/**
 * Italic serif caption 40pt below the reticle. White at 90%, max width
 * 80%, centered.
 */
export function Caption({ mode, top }: CaptionProps) {
  const hasNeverScanned = useAppStore((s) => s.scans.length === 0);
  const text =
    mode === 'face' && hasNeverScanned ? FIRST_FACE_COPY : COPY[mode];

  return (
    <View style={[styles.wrap, { top }]} pointerEvents="none">
      <Text style={styles.text} maxFontSizeMultiplier={1.2}>
        {text}
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

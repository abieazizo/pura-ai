import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import type { ReticleFrameState, ReticleMode } from './Reticle';
import { palette } from '@/theme';

export interface CaptionProps {
  mode: ReticleMode;
  /** Y position from top of screen — parent computes based on reticle center. */
  top: number;
  /** v11.3 — frame confidence; drives the live "ready" cue in face mode. */
  frameState?: ReticleFrameState;
}

const COPY: Record<ReticleMode, string> = {
  face: 'Center your face in the frame.',
  product: 'Frame the label or the barcode.',
  barcode: 'Center the barcode in the frame.',
};

/**
 * v10.7 — first-scan copy variant. If the user has zero scans yet and
 * they're in face mode, the caption reads as an arrival beat ("Your
 * first scan. Thirty seconds.") rather than the generic technique
 * copy. Every scan after the first reverts to the standard line.
 */
const FIRST_FACE_COPY = 'Your first scan — center your face.';

/**
 * v11.3 — face-mode confidence cue. When the stability gate has
 * promoted the reticle to `ready`, the caption shifts to a calm
 * confirmation ("Ready when you are.") and tints to moss-green so
 * the user can feel the camera "seeing" them before they commit.
 */
const FACE_READY_COPY = 'Ready when you are.';

/**
 * Italic serif caption 40pt below the reticle. White at 90%, max width
 * 80%, centered.
 */
export function Caption({ mode, top, frameState = 'seeking' }: CaptionProps) {
  const hasNeverScanned = useAppStore((s) => s.scans.length === 0);
  const isFaceReady = mode === 'face' && frameState === 'ready';
  const text = isFaceReady
    ? FACE_READY_COPY
    : mode === 'face' && hasNeverScanned
    ? FIRST_FACE_COPY
    : COPY[mode];

  return (
    <View style={[styles.wrap, { top }]} pointerEvents="none">
      <Text
        style={[styles.text, isFaceReady && styles.textReady]}
        maxFontSizeMultiplier={1.2}
      >
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
  // v11.3 — moss-green tint when the stability gate has promoted the
  // reticle to `ready`. Same opacity as the default for legibility on
  // arbitrary backgrounds; only the hue shifts so the cue reads as a
  // confirmation, not an alert.
  textReady: {
    color: palette.mossLight,
  },
});

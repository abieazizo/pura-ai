/**
 * Italic serif caption that sits below the reticle.
 *
 * v11.4 changes:
 *   • Rotating live tips during the `seeking` face-mode state so the
 *     guidance feels dynamic, not a static one-liner. 4 tips, 4s
 *     each, then loop. Reduce-motion holds the first tip.
 *   • `preparing` state shows "Hold steady…" in moss-green to match
 *     the strong reticle commit treatment.
 *   • Position is clamped by the parent (ScanOverlay) to avoid the
 *     small-phone collision with the bottom dock chrome.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { ReticleFrameState, ReticleMode } from './Reticle';
import { palette } from '@/theme';

export interface CaptionProps {
  mode: ReticleMode;
  /** Y position from top of screen — parent computes based on reticle
   *  center AND clamps against the bottom dock chrome. */
  top: number;
  /** v11.4 — drives the live commit copy in face mode. */
  frameState?: ReticleFrameState;
}

const PRODUCT_COPY = 'Frame the label or the barcode.';
const BARCODE_COPY = 'Center the barcode in the frame.';
const PREPARING_COPY = 'Hold steady…';
const FIRST_FACE_COPY = 'Your first scan — center your face.';

/**
 * v11.4 — rotating face-mode tips. The guidance feels actively alive
 * (a new tip every 4s) without faking face detection. Order is
 * intentional: position → stillness → light → distance.
 */
const FACE_TIPS = [
  'Center your face in the frame.',
  'Hold the camera at eye level.',
  'Soft, even light works best.',
  'Keep your full face inside the oval.',
] as const;

const TIP_INTERVAL_MS = 4_000;

export function Caption({ mode, top, frameState = 'seeking' }: CaptionProps) {
  const reduceMotion = useReduceMotion();
  const hasNeverScanned = useAppStore((s) => s.scans.length === 0);
  const [tipIndex, setTipIndex] = useState(0);

  // Live face-tip rotation — only when we're in face/seeking mode
  // and the user hasn't yet committed to a capture. Reduces motion
  // by holding the first tip if the OS asks us to.
  useEffect(() => {
    if (mode !== 'face') return;
    if (frameState !== 'seeking') return;
    if (reduceMotion) return;
    const id = setInterval(
      () => setTipIndex((i) => (i + 1) % FACE_TIPS.length),
      TIP_INTERVAL_MS
    );
    return () => clearInterval(id);
  }, [mode, frameState, reduceMotion]);

  const isFacePreparing = mode === 'face' && frameState === 'preparing';

  const text = (() => {
    if (isFacePreparing) return PREPARING_COPY;
    if (mode === 'face') {
      if (hasNeverScanned && tipIndex === 0) return FIRST_FACE_COPY;
      return FACE_TIPS[tipIndex];
    }
    if (mode === 'product') return PRODUCT_COPY;
    return BARCODE_COPY;
  })();

  return (
    <View style={[styles.wrap, { top }]} pointerEvents="none">
      <Text
        style={[styles.text, isFacePreparing && styles.textPreparing]}
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
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    maxWidth: '100%',
  },
  // v11.4 — moss-light tint + non-italic for the commit moment so the
  // "Hold steady…" copy reads as instruction, not narration.
  textPreparing: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: 0.4,
    color: palette.mossLight,
    textTransform: 'uppercase',
  },
});

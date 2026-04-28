/**
 * Italic serif caption that sits below the reticle.
 *
 * v11.5 — receives `message` directly from the face-scan state
 * machine (`useFaceScanState`). No more local state, no more
 * rotating tips — the message changes when the state changes,
 * which is the only source of truth. Tone styling matches the
 * reticle's overlay tone.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import type { OverlayTone } from '@/screens/scan/hooks/useFaceScanState';
import type { ReticleMode } from './Reticle';
import { palette } from '@/theme';

export interface CaptionProps {
  mode: ReticleMode;
  /** Y position from top of screen — parent computes based on
   *  reticle center AND clamps against the bottom dock chrome. */
  top: number;
  /** v11.5 — when face-mode, the message comes from the state
   *  machine. For product / barcode modes the legacy static copy
   *  is retained because those modes don't have a state machine. */
  message?: string;
  /** v11.5 — drives the visual treatment (color + typography). */
  overlayTone?: OverlayTone;
}

const PRODUCT_COPY = 'Frame the label or the barcode.';
const BARCODE_COPY = 'Center the barcode in the frame.';
const FIRST_FACE_OVERLAY: Partial<Record<OverlayTone, string>> = {
  neutral: 'Your first scan — center your face.',
};

export function Caption({
  mode,
  top,
  message,
  overlayTone = 'neutral',
}: CaptionProps) {
  const hasNeverScanned = useAppStore((s) => s.scans.length === 0);

  // For face mode, the state machine owns the message. Replace the
  // first-launch boot message with a softer welcome line.
  let text: string;
  if (mode === 'face') {
    if (hasNeverScanned && overlayTone === 'neutral' && message) {
      text =
        FIRST_FACE_OVERLAY[overlayTone] ?? message;
    } else {
      text = message ?? '';
    }
  } else if (mode === 'product') {
    text = PRODUCT_COPY;
  } else {
    text = BARCODE_COPY;
  }

  if (text.length === 0) return null;

  // Visual treatment per tone:
  //   neutral / warning → italic serif (the calm narration voice)
  //   ready / committing → uppercase Inter SemiBold (the
  //                        instruction voice — less narration,
  //                        more "do this now")
  const isInstruction = overlayTone === 'ready' || overlayTone === 'committing';
  const colour = (() => {
    if (overlayTone === 'committing') return palette.mossLight;
    if (overlayTone === 'ready') return palette.mossLight;
    if (overlayTone === 'warning') return 'rgba(255, 220, 170, 0.95)';
    return 'rgba(255,255,255,0.92)';
  })();

  return (
    <View style={[styles.wrap, { top }]} pointerEvents="none">
      <Text
        style={[
          isInstruction ? styles.instruction : styles.narration,
          { color: colour },
        ]}
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
  narration: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    lineHeight: 17 * 1.35,
    textAlign: 'center',
    maxWidth: '100%',
  },
  instruction: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    maxWidth: '100%',
  },
});

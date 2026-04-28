/**
 * Italic-serif caption that sits below the reticle (v11.7).
 *
 * v11.5–v11.6 receivers a `message` from a 14-state face-detection
 * machine, plus an `OverlayTone` that flipped between four typographic
 * presets. Without on-device face detection (Expo Go), that machine
 * was lying — it claimed to know things about the user's framing that
 * the platform could not actually observe. v11.7 strips the lie:
 *
 *   • Face mode renders ONE of two truthful messages:
 *       – default static guidance ("Center your full face in the
 *         frame. We'll check the photo before analyzing.")
 *       – a "preparing" caption while the post-tap countdown runs
 *   • Product / barcode modes keep their existing static copy.
 *
 * No tone vocabulary. No state machine. No fake colour transitions.
 * Just one calm narration voice that tells the user what to do, and
 * one preparing voice that tells them to hold steady.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import type { ReticleMode, FrameState } from './Reticle';
import { palette } from '@/theme';
import { scan as scanCopy } from '@/copy/strings';

export interface CaptionProps {
  mode: ReticleMode;
  /** Y position from top of screen — parent computes based on
   *  reticle center AND clamps against the bottom dock chrome. */
  top: number;
  /** v11.7 — when 'preparing', overrides the default narration with
   *  a short hold-steady line. */
  frameState?: FrameState;
}

const PRODUCT_COPY = 'Frame the label or the barcode.';
const BARCODE_COPY = 'Center the barcode in the frame.';
const PREPARING_COPY = 'Hold steady…';

/**
 * v11.7 — three honest static face guidance lines that rotate every
 * 4 seconds. None of them claim that we can see the user's face;
 * each one tells them what to do AND sets the expectation that the
 * photo will be checked before the full analysis runs. Repetition
 * is fine — the user is meant to read these once, not memorise
 * them.
 */
const FACE_TIPS: ReadonlyArray<string> = [
  'Center your full face in the frame.',
  'Use even, soft light. Hold the camera at eye level.',
  'We’ll check the photo before analyzing.',
];

const FIRST_FACE_LINE = 'Your first scan — center your full face.';

const TIP_INTERVAL_MS = 4000;

export function Caption({ mode, top, frameState = 'idle' }: CaptionProps) {
  const hasNeverScanned = useAppStore((s) => s.scans.length === 0);

  // Slow, calm rotation of the three face-mode tips. Resets to 0
  // whenever the mode flips back to 'face' from elsewhere.
  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    if (mode !== 'face') return;
    if (frameState === 'preparing') return;
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % FACE_TIPS.length);
    }, TIP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [mode, frameState]);

  let text: string;
  if (mode === 'face') {
    if (frameState === 'preparing') {
      text = PREPARING_COPY;
    } else if (hasNeverScanned && tipIndex === 0) {
      text = FIRST_FACE_LINE;
    } else {
      text = FACE_TIPS[tipIndex];
    }
  } else if (mode === 'product') {
    text = scanCopy.hintProduct ?? PRODUCT_COPY;
  } else {
    text = BARCODE_COPY;
  }

  if (text.length === 0) return null;

  // Single typographic treatment: italic serif narration. The
  // preparing caption uses the same family — just a slightly warmer
  // colour to mirror the moss halo on the reticle, so the user
  // intuits the two are linked.
  const colour =
    frameState === 'preparing' ? palette.mossLight : 'rgba(255,255,255,0.92)';

  return (
    <View style={[styles.wrap, { top }]} pointerEvents="none">
      <Text style={[styles.narration, { color: colour }]} maxFontSizeMultiplier={1.2}>
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
});

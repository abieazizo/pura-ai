/**
 * YourSkinContainer — the PRODUCTION integration point for scan-results screen 2.
 *
 * Runs the REAL plain-language read (`readSkinFromPhoto` → the `/readSkin` proxy
 * route) and feeds the network-decoupled `YourSkinScreen` the canonical
 * `SkinRead` (WITH the screen-2 plan fields). The read is MEMOISED by photoUri,
 * so if screen 1 (First-Finding) ran first the result is reused verbatim — no
 * second call, the SAME analysis JSON, computed ONCE.
 *
 * Honest states only (CLAUDE.md): a calm loading beat while the read resolves;
 * the screen on a usable read (incl. the bad-photo carry-over); and — only if
 * the service genuinely fails — a graceful fall back to the proven ScanReveal
 * arc, so a face scan is NEVER stranded on a blank. Findings are never
 * fabricated.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { readSkinFromPhoto } from '@/api/skinRead';
import { useRoutineFocusMoves } from '@/state/routineFocusMoves';
import type { SkinReadOutcome } from '@/types/skinRead';
import type { CaptureQualitySnapshot } from '@/scanQuality/types';
import { ResultsOrb } from '@/components/ResultsOrb';
import { tokensFor, TYPE2 } from './yourSkinMotion';
import { YourSkinScreen } from './YourSkinScreen';
import { landmarksFromCaptureQuality } from '../firstFinding/landmarksFromCapture';
import type { ScreenTheme } from '../firstFinding/metricTint';

export interface YourSkinContainerProps {
  photoUri: string;
  /** The just-saved scan id — carried into the routine builder. */
  scanId: string;
  /** The shutter-moment quality snapshot (478 MediaPipe landmarks). When
   *  present, the skin-map glow tracks the REAL face; absent (gallery picks,
   *  native) → the existing proportional synthesis. */
  captureQuality?: CaptureQualitySnapshot;
  theme?: ScreenTheme;
  mirrored?: boolean;
  /** Onboarding goal — share-card / a11y fallback (the summary line already
   *  references it from the model). */
  goal?: string;

  /** "Build my routine" → the existing routine builder. */
  onBuildRoutine: () => void;
  /** "I'll do this later" / exit → close the scan modal. */
  onClose: () => void;
  /** "Rescan in better light" → back to capture. */
  onRescan: () => void;
  /** Service genuinely failed → hand off to the proven reveal arc (never blank). */
  onFallbackToReveal: () => void;
  onDownweightFinding?: (id: string, downweighted: boolean) => void;
}

export function YourSkinContainer({
  photoUri,
  scanId,
  captureQuality,
  theme = 'dark',
  mirrored = true,
  goal,
  onBuildRoutine,
  onClose,
  onRescan,
  onFallbackToReveal,
  onDownweightFinding,
}: YourSkinContainerProps) {
  const [outcome, setOutcome] = useState<SkinReadOutcome>({ status: 'pending' });
  const reqId = useRef(0);

  // Real face anchors from the shutter snapshot → the skin map affine-warps to
  // the actual face. The snapshot also certifies the photo is the RAW
  // un-mirrored frame (scanQuality README), so person-left/right placement
  // flips accordingly; without it, behavior is unchanged (proportional box).
  const capturedLandmarks = useMemo(
    () => landmarksFromCaptureQuality(captureQuality) ?? undefined,
    [captureQuality],
  );

  const run = useCallback(() => {
    const id = ++reqId.current;
    const ctrl = new AbortController();
    setOutcome({ status: 'pending' });
    readSkinFromPhoto({ photoUri, signal: ctrl.signal })
      .then((o) => {
        if (reqId.current === id) setOutcome(o);
      })
      .catch(() => {
        if (reqId.current === id) {
          setOutcome({ status: 'service_error', message: 'I couldn’t quite finish that read.' });
        }
      });
    return () => ctrl.abort();
  }, [photoUri]);

  useEffect(() => run(), [run]);

  // Service genuinely failed → never strand the user on a blank: hand the
  // already-saved scan to the proven reveal arc.
  useEffect(() => {
    if (outcome.status === 'service_error') onFallbackToReveal();
  }, [outcome.status, onFallbackToReveal]);

  // Screen-2 → routine continuity: the moment the read lands, persist its
  // routine_focus moves keyed by scanId so the Your Routine reveal morphs from
  // the EXACT cards this screen shows (survives the scan modal teardown).
  // `addresses` carries the finding IDS (addressesIds), not the name strings.
  useEffect(() => {
    if (outcome.status !== 'ready') return;
    useRoutineFocusMoves.getState().setMoves(
      scanId,
      (outcome.read.routineFocus ?? []).map((m) => ({
        title: m.title,
        why: m.why,
        addresses: m.addressesIds,
      })),
    );
  }, [outcome, scanId]);

  if (outcome.status === 'ready' || outcome.status === 'bad_photo') {
    if (outcome.read) {
      return (
        <YourSkinScreen
          read={outcome.read}
          photoUri={photoUri}
          landmarks={capturedLandmarks}
          mirrored={capturedLandmarks ? false : mirrored}
          theme={theme}
          goal={goal}
          onBuildRoutine={onBuildRoutine}
          onDoLater={onClose}
          onRescan={onRescan}
          onDownweightFinding={onDownweightFinding}
        />
      );
    }
    // bad_photo with no hedged read → offer a clearer look rather than a blank.
    return <ReadingBeat theme={theme} label="A clearer photo in better light helps me be sure." />;
  }

  // pending (and the brief service_error frame before the fallback fires).
  return <ReadingBeat theme={theme} label="Putting your skin read together…" />;
}

/** A calm, on-brand loading beat — the persistent orb, settled, on the dark
 *  base. No spinner, no score, no countdown. */
function ReadingBeat({ theme, label }: { theme: ScreenTheme; label: string }) {
  const insets = useSafeAreaInsets();
  const tokens = tokensFor(theme);
  return (
    <View style={[styles.root, { backgroundColor: tokens.bg, paddingTop: insets.top + 80 }]}>
      <StatusBar style={tokens.barStyle} />
      <ResultsOrb state="thinking" size={72} scanTone="balanced" />
      <Text style={[TYPE2.horizon, { color: tokens.line, textAlign: 'center', marginTop: 28, maxWidth: 300 }]} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', paddingHorizontal: 32 },
});

/**
 * Cinematic analyzing screen (v7.7). Orchestrates the 7-beat choreography
 * against the real AI call and surfaces the reveal footer once both have
 * completed.
 *
 * Props follow the host pattern used by `AnalyzingScreenHost` in
 * `ScanModalStack.tsx`. The host supplies:
 *   • `photoUri`           — what the user captured
 *   • `previousScan`       — for day-number bookkeeping in the AI call
 *   • `dayNumber`          — ditto
 *   • `onComplete(scanId)` — user tapped "See your results"
 *   • `onRetry()`          — user tapped "Take another scan" / "Try again"
 *   • `onCancel()`         — user hit X
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { analyzeFaceScan } from '@/api';
import { useAppStore, useScanCount } from '@/store/useAppStore';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { palette } from '@/theme';
import type { Scan } from '@/types';
import {
  PHOTO_HEIGHT_ACTIVE,
  PHOTO_Y_ACTIVE,
  getBeatTiming,
} from './constants';
import { useAnalysisChoreography, type Beat } from './hooks/useAnalysisChoreography';
import { useAIReadiness } from './hooks/useAIReadiness';
import { usePhotoComposite } from './hooks/usePhotoComposite';
import { PhotoStage } from './components/PhotoStage';
import { AnalysisHeader } from './components/AnalysisHeader';
import { AnalysisCaption } from './components/AnalysisCaption';
import { RevealFooter } from './components/RevealFooter';
import { ErrorState } from './components/ErrorState';
import { scanToScanResult } from './lib/scanToResult';

export interface ScanAnalyzingFaceScreenProps {
  photoUri: string;
  /** Previous Scan (if any) — passed through to analyzeFaceScan for delta. */
  previousScan?: Scan;
  dayNumber: number;
  onComplete: (scanId: string) => void;
  onRetry: () => void;
  onCancel: () => void;
}

export function ScanAnalyzingFaceScreen({
  photoUri,
  previousScan,
  dayNumber,
  onComplete,
  onRetry,
  onCancel,
}: ScanAnalyzingFaceScreenProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const scanCount = useScanCount();

  const stageRef = useRef<View>(null);
  const completedScanRef = useRef<Scan | null>(null);
  const apiErroredRef = useRef(false);

  const [beatTiming] = useState(() => getBeatTiming(scanCount));

  const choreography = useAnalysisChoreography({
    photoUri,
    reduceMotion,
    beatTiming,
  });

  const ai = useAIReadiness();

  // Composite save — fires once when Beat 6 lands with a result in hand.
  usePhotoComposite({
    stageRef,
    beat: choreography.beat,
    result: ai.result,
  });

  // ---- Kick off the real analysis in parallel with the animation ----
  useEffect(() => {
    const startScan = useAppStore.getState().startScan;
    const addScan = useAppStore.getState().addScan;
    const setScanResult = useAppStore.getState().setScanResult;
    startScan(photoUri);

    let cancelled = false;

    (async () => {
      try {
        const scan = await analyzeFaceScan({
          photoUri,
          previousScan,
          dayNumber,
        });
        if (cancelled) return;
        addScan(scan);
        completedScanRef.current = scan;
        setScanResult(scanToScanResult(scan, useAppStore.getState().scans.length));
      } catch {
        if (cancelled) return;
        apiErroredRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [photoUri, previousScan, dayNumber]);

  // ---- If the AI has overshot Beat 6 by 800ms, swap caption to waiting ----
  useEffect(() => {
    if (choreography.beat !== 'settle') return;
    if (ai.status !== 'pending') return;
    const t = setTimeout(() => {
      if (ai.status === 'pending') {
        choreography.setWaiting(true);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [choreography.beat, ai.status, choreography]);

  // ---- Terminal state gates ----
  const showError =
    ai.status === 'failed' ||
    (apiErroredRef.current && choreography.beat === 'settle');

  const canReveal =
    choreography.beat === 'settle' &&
    ai.status === 'ready' &&
    ai.result !== null;

  const handleCancel = useCallback(() => {
    useAppStore.getState().clearInFlightScan();
    onCancel();
  }, [onCancel]);

  const handleRevealPrimary = useCallback(() => {
    const scan = completedScanRef.current;
    if (!scan) return;
    useAppStore.getState().clearInFlightScan();
    onComplete(scan.id);
  }, [onComplete]);

  const handleRetry = useCallback(() => {
    useAppStore.getState().clearInFlightScan();
    onRetry();
  }, [onRetry]);

  if (showError) {
    return <ErrorState onRetry={handleRetry} onAbort={handleCancel} />;
  }

  const result = ai.result;

  // Caption sits at photo bottom + 24pt. In reveal mode we hide the
  // caption (the reveal footer headline replaces it).
  const captionTop = PHOTO_Y_ACTIVE + PHOTO_HEIGHT_ACTIVE + 24;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <AnalysisHeader
        onClose={handleCancel}
        mode={canReveal ? 'complete' : 'live'}
        topInset={insets.top}
      />

      <PhotoStage
        ref={stageRef}
        photoUri={photoUri}
        beat={choreography.beat}
        revealMode={canReveal}
        zonesVisible={choreography.zonesVisible}
        markersVisible={choreography.markersVisible}
        scoresVisible={choreography.scoresVisible}
        reduceMotion={reduceMotion}
        result={result}
      />

      {!canReveal ? (
        <AnalysisCaption
          text={choreography.captionText}
          variant={choreography.captionStyle}
          topOffset={captionTop}
          reduceMotion={reduceMotion}
        />
      ) : null}

      {canReveal && result ? (
        <RevealFooter
          overallScore={result.overallScore}
          findings={result.findings}
          onPrimary={handleRevealPrimary}
          onSecondary={handleRetry}
          bottomInset={insets.bottom}
          reduceMotion={reduceMotion}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
});

export type { Beat };

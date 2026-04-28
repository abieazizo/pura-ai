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
import { preflightFaceScan } from '@/api/scan';
import type { ScanPreflightReason } from '@/ai/ai-contracts';
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
import { ErrorState, type ErrorStateReason } from './components/ErrorState';
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
  // v11.3 — failure reason carried through to ErrorState. Set when
  // either the AI flagged image_quality.usable=false (mapped to a
  // specific issue from image_quality.issues), or the AI call itself
  // threw (network / timeout / 5xx → 'network'), or validation failed
  // (→ 'unknown').
  const errorReasonRef = useRef<ErrorStateReason>('unknown');

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
        // v11.7 — capture-first, validate-immediately. Run a fast,
        // cheap preflight pass on the captured photo BEFORE the
        // expensive analyzeFaceScan call. If preflight fails (no face,
        // partial face, too dark, blurry, off-center), short-circuit
        // straight to ErrorState with the matching reason so the user
        // gets actionable feedback in seconds rather than waiting on
        // the full analysis just to be told their photo is unusable.
        //
        // Preflight returns null when the AI gateway is unavailable —
        // in that case we skip preflight and fall through to the
        // (deterministic-fallback or full AI) analyze pass, which
        // matches the existing fallback contract.
        const preflight = await preflightFaceScan({ photoUri });
        if (cancelled) return;
        if (preflight && preflight.reason !== 'ok') {
          errorReasonRef.current = mapPreflightReason(preflight.reason);
          apiErroredRef.current = true;
          return;
        }

        const scan = await analyzeFaceScan({
          photoUri,
          previousScan,
          dayNumber,
        });
        if (cancelled) return;
        // v11.3 — interrogate the AI's image_quality output. When
        // `usable=false`, refuse to surface the result and route to
        // ErrorState with the most relevant condition. We pick the
        // first matching issue in priority order so the user sees the
        // most actionable problem first (lighting beats angle beats
        // generic-occluded).
        const aiAnalysis = scan.aiAnalysis;
        if (aiAnalysis && aiAnalysis.image_quality?.usable === false) {
          errorReasonRef.current = inferReasonFromIssues(
            aiAnalysis.image_quality.issues ?? [],
            aiAnalysis.findings?.length ?? 0
          );
          apiErroredRef.current = true;
          return;
        }
        addScan(scan);
        completedScanRef.current = scan;
        setScanResult(scanToScanResult(scan, useAppStore.getState().scans.length));
      } catch {
        if (cancelled) return;
        // Network / timeout / proxy failure. Validation failures land
        // here too via the gateway's AIValidationError throw — both
        // paths surface a clear "service unreachable" reason instead
        // of a vague generic message.
        errorReasonRef.current = 'network';
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
    return (
      <ErrorState
        onRetry={handleRetry}
        onAbort={handleCancel}
        reason={errorReasonRef.current}
      />
    );
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
        reduceMotion={reduceMotion}
        result={result}
        scoreBeatDuration={beatTiming.SCORE.duration}
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
          previousScore={previousScan?.overallScore ?? null}
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

/**
 * v11.3 — pick the most actionable error reason from the AI's
 * image_quality.issues array. Order matters: the user benefits more
 * from "no face detected" than "blurry" if both are flagged
 * (correcting framing usually fixes blurriness too). When no issue
 * matches but the analysis still failed, fall through to
 * 'no_face_detected' for the empty-findings case (the AI saw a
 * usable image but found zero zones, which is structurally
 * indistinguishable from "I'm not looking at a face").
 */
function inferReasonFromIssues(
  issues: ReadonlyArray<string>,
  findingsCount: number
): ErrorStateReason {
  if (issues.includes('low_light')) return 'poor_lighting';
  if (issues.includes('blurry')) return 'blurry';
  if (issues.includes('partial_face')) return 'partial_face';
  if (issues.includes('angled')) return 'angled';
  if (issues.includes('occluded')) return 'no_face_detected';
  if (findingsCount === 0) return 'no_face_detected';
  return 'unknown';
}

/**
 * v11.7 — map a `ScanPreflightReason` (from the cheap vision-preflight
 * pass) onto our existing `ErrorStateReason` vocabulary. The preflight
 * model is intentionally narrower than the full analysis: it only
 * decides whether the captured frame is usable AT ALL, so we don't
 * carry an `angled` bucket here — `not_centered` covers framing.
 */
function mapPreflightReason(r: ScanPreflightReason): ErrorStateReason {
  switch (r) {
    case 'no_face':
      return 'no_face_detected';
    case 'partial_face':
      return 'partial_face';
    case 'too_dark':
      return 'poor_lighting';
    case 'too_blurry':
      return 'blurry';
    case 'not_centered':
      return 'partial_face';
    case 'unknown':
    default:
      return 'unknown';
  }
}

export type { Beat };

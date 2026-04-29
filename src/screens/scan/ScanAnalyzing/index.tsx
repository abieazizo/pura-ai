/**
 * Cinematic analyzing screen (v11.8).
 *
 * v11.7 wired preflight as a backend-only short-circuit: the user saw the
 * 7-beat choreography start, then watched it rip away to a full-screen
 * ErrorState if the photo turned out to be unusable. Disorienting, and
 * the dead-end ErrorState forced them out of the scan flow.
 *
 * v11.8 makes preflight a VISIBLE beat:
 *
 *   STAGE 0 — photo arrives with a subtle scale/opacity entrance
 *             (PhotoStage handles this itself)
 *   STAGE 1 — "Checking image quality…" caption while the cheap
 *             vision-preflight call is in flight (~1–1.5s typical).
 *             The 7-beat choreography is paused on the implicit
 *             ARRIVE beat during this window.
 *   STAGE 2A — preflight passes → choreography releases → full 7-beat
 *              cinematic timeline runs
 *   STAGE 2B — preflight fails → screen replaces with PreflightRetry
 *              (the captured photo + named reason + Retake CTA),
 *              keeping the user in the scan flow rather than in the
 *              full-screen ErrorState wall.
 *
 * If the AI gateway is unavailable, preflight returns null and we
 * proceed straight into analyze (the deterministic-fallback path
 * already in place since v8.1).
 *
 * The full-screen ErrorState remains the destination for genuine
 * network / proxy / validation failures of the analyze call itself —
 * those aren't "your photo was bad", they're "the service couldn't
 * answer", and that distinction matters for the retry copy.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { analyzeFaceScan } from '@/api';
import { preflightFaceScan } from '@/api/scan';
import { aiGateway } from '@/ai/aiGateway';
import type { ScanPreflightReason } from '@/ai/ai-contracts';
import { useAppStore, useScanCount } from '@/store/useAppStore';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { palette } from '@/theme';
import type { Scan } from '@/types';
import {
  CAPTION_COPY,
  MAX_TOTAL_WAIT,
  PHOTO_HEIGHT_ACTIVE,
  PHOTO_Y_ACTIVE,
  getBeatTiming,
} from './constants';
import { useAnalysisChoreography, type Beat } from './hooks/useAnalysisChoreography';
import { usePhotoComposite } from './hooks/usePhotoComposite';
import type { ScanResult } from '@/types';
import { PhotoStage } from './components/PhotoStage';
import { AnalysisHeader } from './components/AnalysisHeader';
import { AnalysisCaption } from './components/AnalysisCaption';
// v12.0 — RevealFooter removed: auto-navigation replaces the "See
// your results" button. Kept in source tree for any future use.
// import { RevealFooter } from './components/RevealFooter';
import { ErrorState, type ErrorStateReason } from './components/ErrorState';
import { PreflightRetry } from './components/PreflightRetry';
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

type PreflightStatus =
  | { kind: 'pending' }
  | { kind: 'pass' }
  | { kind: 'skipped' } // gateway unavailable — fall through to analyze
  | { kind: 'fail'; reason: ScanPreflightReason; retryMessage?: string };

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
  // Failure reason for the full-screen ErrorState wall. Reserved for
  // analyze-call failures (network / 5xx / validation) and the rarer
  // "AI flagged the photo unusable AFTER analyze ran" path. Preflight
  // failures route through PreflightRetry, NOT through this ref.
  const errorReasonRef = useRef<ErrorStateReason>('unknown');

  const [beatTiming] = useState(() => getBeatTiming(scanCount));
  const [preflight, setPreflight] = useState<PreflightStatus>(
    aiGateway.isAvailable() ? { kind: 'pending' } : { kind: 'skipped' }
  );

  // Hold the choreography on the implicit ARRIVE beat until preflight
  // resolves. `pass` and `skipped` both release it; `fail` keeps it
  // paused (the screen replaces with PreflightRetry anyway).
  const choreographyPaused =
    preflight.kind === 'pending' || preflight.kind === 'fail';

  const choreography = useAnalysisChoreography({
    photoUri,
    reduceMotion,
    beatTiming,
    paused: choreographyPaused,
  });

  // v11.13 — local readiness state owned by THIS screen.
  //
  // The previous `useAIReadiness` hook compared `result.timestamp`
  // (server's `analyzed_at_iso` from the AI response) against
  // `inFlightScan.startedAt` (device's `Date.now()`). Two different
  // clocks: even sub-second skew between the AI server and the
  // phone made `resultT >= runStart` evaluate false, so the hook
  // never flipped to `'ready'`. The 12 s timeout then forced
  // `'failed'`, routing every successful scan to ErrorState with the
  // generic "I couldn't finish this reading." copy.
  //
  // Fix: drive the readiness state from the analyze useEffect's
  // ACTUAL outcome — we already know whether the analysis succeeded
  // or failed at the moment it returns. No cross-clock comparison.
  type Readiness = 'pending' | 'ready' | 'failed';
  const [readiness, setReadiness] = useState<Readiness>('pending');
  const [analysisResult, setAnalysisResult] = useState<ScanResult | null>(null);

  // Composite save — fires once when Beat 6 lands with a result in hand.
  usePhotoComposite({
    stageRef,
    beat: choreography.beat,
    result: analysisResult,
  });

  // ---- Stage 1: preflight ----
  useEffect(() => {
    if (!aiGateway.isAvailable()) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await preflightFaceScan({ photoUri });
        if (cancelled) return;
        if (!result) {
          // Gateway became unreachable mid-call — proceed without
          // preflight rather than blocking the user.
          setPreflight({ kind: 'skipped' });
          return;
        }
        if (result.reason === 'ok') {
          setPreflight({ kind: 'pass' });
        } else {
          setPreflight({
            kind: 'fail',
            reason: result.reason,
            retryMessage: result.retry_message,
          });
        }
      } catch {
        if (cancelled) return;
        // Preflight call itself errored — don't block on it. Fall
        // through to the analyze pass; if that also fails, the user
        // gets the network ErrorState. We never let preflight block
        // the user from reaching their actual scan reading.
        setPreflight({ kind: 'skipped' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photoUri]);

  // ---- Stage 2: kick off the real analysis once preflight clears ----
  useEffect(() => {
    if (preflight.kind !== 'pass' && preflight.kind !== 'skipped') return;

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
        // The AI's full analysis still owns the FINAL "is this photo
        // good enough" check. Preflight's job is the cheap gate; the
        // analyze pass can still flag image_quality.usable=false if
        // its richer signal disagrees.
        const aiAnalysis = scan.aiAnalysis;
        if (aiAnalysis && aiAnalysis.image_quality?.usable === false) {
          errorReasonRef.current = inferReasonFromIssues(
            aiAnalysis.image_quality.issues ?? [],
            aiAnalysis.findings?.length ?? 0
          );
          apiErroredRef.current = true;
          setReadiness('failed');
          return;
        }
        // Success path — translate to the result shape, persist to
        // the store (so other screens can read it), AND set the
        // local readiness state so this screen can reveal.
        addScan(scan);
        completedScanRef.current = scan;
        const nextResult = scanToScanResult(
          scan,
          useAppStore.getState().scans.length
        );
        setScanResult(nextResult);
        setAnalysisResult(nextResult);
        setReadiness('ready');
      } catch {
        if (cancelled) return;
        errorReasonRef.current = 'network';
        apiErroredRef.current = true;
        setReadiness('failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preflight.kind, photoUri, previousScan, dayNumber]);

  // ---- Hard timeout — local clock only, no cross-clock compare ----
  // True outer-bound guard. MAX_TOTAL_WAIT (70 s) is set above the
  // gateway's analyzeFaceScan timeout (60 s) so a slow-but-valid AI
  // run is never preempted. If we still haven't seen a ready/failed
  // signal after that, force `failed` so the screen doesn't hang.
  // The user can also cancel anytime via the X close button.
  useEffect(() => {
    if (readiness !== 'pending') return;
    const t = setTimeout(() => {
      setReadiness((prev) => {
        if (prev !== 'pending') return prev;
        // Only set the generic 'unknown' reason if no more specific
        // reason was already captured. Preserves preflight/network/
        // image-quality classifications.
        if (!apiErroredRef.current) {
          errorReasonRef.current = 'unknown';
        }
        return 'failed';
      });
    }, MAX_TOTAL_WAIT);
    return () => clearTimeout(t);
  }, [readiness]);

  // ---- If the analysis has overshot Beat 6 by 800ms, swap caption to waiting ----
  useEffect(() => {
    if (choreography.beat !== 'settle') return;
    if (readiness !== 'pending') return;
    const t = setTimeout(() => {
      if (readiness === 'pending') {
        choreography.setWaiting(true);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [choreography.beat, readiness, choreography]);

  // ---- Terminal state gates ----
  // Show ErrorState when:
  //   - the analysis explicitly failed AND the choreography has
  //     reached settle (so we don't rip the screen away mid-animation)
  //   - the 12s timeout fired (readiness === 'failed' from the
  //     timeout effect; same condition)
  const showError =
    readiness === 'failed' && choreography.beat === 'settle';

  // Reveal the results only when:
  //   - the analyze useEffect set readiness to 'ready'
  //   - the choreography has reached its settle beat (so the user
  //     sees the full visual treatment before the reveal)
  //   - we have a concrete ScanResult in local state
  const canReveal =
    choreography.beat === 'settle' &&
    readiness === 'ready' &&
    analysisResult !== null;

  const handleCancel = useCallback(() => {
    useAppStore.getState().clearInFlightScan();
    onCancel();
  }, [onCancel]);

  // v12.0 — handleRevealPrimary removed; auto-navigate effect below
  // calls onComplete(scan.id) directly when canReveal flips true.

  const handleRetry = useCallback(() => {
    useAppStore.getState().clearInFlightScan();
    onRetry();
  }, [onRetry]);

  // v12.0 — AUTO-navigate to the results screen once both gates open.
  // Previous flow showed a "See your results" button (RevealFooter)
  // and required a manual tap. The brief explicitly calls for
  // automatic transition: "When analysis completes successfully,
  // automatically navigate to the redesigned results page."
  //
  // We give the choreography its full SETTLE beat (the existing
  // micro-pause that sells "the result has landed") and then fire
  // the navigation once both signals are go.
  const autoNavigateFiredRef = useRef(false);
  useEffect(() => {
    if (!canReveal) return;
    if (autoNavigateFiredRef.current) return;
    const scan = completedScanRef.current;
    if (!scan) return;
    autoNavigateFiredRef.current = true;
    // Brief beat (480ms) so the dial settle isn't immediately
    // ripped away. Long enough to read as "result landed" but short
    // enough that the user doesn't feel they have to wait for a CTA.
    const t = setTimeout(() => {
      useAppStore.getState().clearInFlightScan();
      onComplete(scan.id);
    }, 480);
    return () => clearTimeout(t);
  }, [canReveal, onComplete]);

  // ---- Routing: preflight fail comes BEFORE the network ErrorState ----
  // The PreflightRetry screen is an in-flow correction loop (photo +
  // smart reason + Retake CTA). It keeps the user in the scan
  // headspace rather than dropping them to a full-screen wall.
  if (preflight.kind === 'fail') {
    return (
      <PreflightRetry
        photoUri={photoUri}
        reason={preflight.reason}
        retryMessageFromModel={preflight.retryMessage}
        onRetry={handleRetry}
        onCancel={handleCancel}
      />
    );
  }

  if (showError) {
    return (
      <ErrorState
        onRetry={handleRetry}
        onAbort={handleCancel}
        reason={errorReasonRef.current}
      />
    );
  }

  const result = analysisResult;

  // Caption sits at photo bottom + 24pt. In reveal mode we hide the
  // caption (the reveal footer headline replaces it).
  const captionTop = PHOTO_Y_ACTIVE + PHOTO_HEIGHT_ACTIVE + 24;

  // v11.8 — while preflight is pending, the choreography is held on
  // ARRIVE so its caption is empty. We override with the curated
  // "Checking image quality…" line so the screen never reads as a
  // dead spinner.
  const renderedCaption =
    preflight.kind === 'pending' ? CAPTION_COPY.preflight : choreography.captionText;
  const renderedCaptionVariant =
    preflight.kind === 'pending' ? 'italic' : choreography.captionStyle;

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
          text={renderedCaption}
          variant={renderedCaptionVariant}
          topOffset={captionTop}
          reduceMotion={reduceMotion}
        />
      ) : (
        // v12.0 — auto-navigation replaces the previous manual
        // "See your results" CTA. While the brief 480ms beat
        // before navigation runs, surface a soft "Reading
        // complete." caption so the screen never reads as static.
        <AnalysisCaption
          text="Reading complete."
          variant="roman"
          topOffset={captionTop}
          reduceMotion={reduceMotion}
        />
      )}
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
 * (correcting framing usually fixes blurriness too).
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

export type { Beat };

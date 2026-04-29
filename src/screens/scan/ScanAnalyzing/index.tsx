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

// v12.1 — dev-only structured checkpoint logger for the face-scan
// pipeline. Lets us see EXACTLY which stage failed in a real run
// without dumping anything into the consumer UI. In production
// builds (where __DEV__ is false) every call is a no-op.
declare const __DEV__: boolean | undefined;
function debugCheckpoint(stage: string, data?: Record<string, unknown>): void {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) return;
  // eslint-disable-next-line no-console
  console.log(`[scan:${stage}]`, data ?? {});
}
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
    debugCheckpoint('preflight_started', {
      gatewayAvailable: aiGateway.isAvailable(),
      photoUri,
    });
    if (!aiGateway.isAvailable()) {
      debugCheckpoint('preflight_skipped_gateway_unavailable');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await preflightFaceScan({ photoUri });
        if (cancelled) {
          debugCheckpoint('preflight_cancelled');
          return;
        }
        debugCheckpoint('preflight_result', { result });
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
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        debugCheckpoint('preflight_threw', { error: msg });
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
    debugCheckpoint('analyze_started', { photoUri });
    (async () => {
      try {
        const scan = await analyzeFaceScan({
          photoUri,
          previousScan,
          dayNumber,
        });
        if (cancelled) {
          debugCheckpoint('analyze_cancelled');
          return;
        }
        debugCheckpoint('analyze_completed', {
          hasAiAnalysis: !!scan.aiAnalysis,
          overallScore: scan.overallScore,
          concernCount: scan.concerns?.length ?? 0,
          imageQualityUsable: scan.aiAnalysis?.image_quality?.usable,
          imageQualityIssues: scan.aiAnalysis?.image_quality?.issues,
        });

        // v12.1 — CRITICAL FIX: do NOT route image_quality.usable=false
        // to the failure screen. A low-quality but otherwise valid
        // photo should still produce a result screen (with a quality
        // note in the result UI). This is the "minimum valid result"
        // rule — if we got a Scan back from analyzeFaceScan, we
        // surface it. The result screen already renders an "IMAGE
        // QUALITY" card when the analysis flags low quality, so the
        // user gets the soft warning without being kicked out of the
        // flow.
        //
        // Previous v12.0 behavior treated usable=false as a hard
        // failure → ErrorState with reason 'unknown' → "I couldn't
        // finish this reading." The user reported reaching this
        // screen on valid scans; this is the path that produced it.

        addScan(scan);
        completedScanRef.current = scan;
        const nextResult = scanToScanResult(
          scan,
          useAppStore.getState().scans.length
        );
        setScanResult(nextResult);
        setAnalysisResult(nextResult);
        setReadiness('ready');
        debugCheckpoint('result_ready_for_ui', {
          scanId: scan.id,
          renderableConcernCount: nextResult.findings.length,
        });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        debugCheckpoint('analyze_threw', { error: msg });
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
        debugCheckpoint('hard_timeout_fired', {
          reason: errorReasonRef.current,
          apiErrored: apiErroredRef.current,
        });
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
  // Show ErrorState when the analysis explicitly failed AND the
  // choreography has reached settle (so we don't rip the screen
  // away mid-animation).
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

  // v12.1 — log every transition of the canReveal / showError gates.
  // Lets us see in console whether the gates ever flip true.
  useEffect(() => {
    debugCheckpoint('gate_state', {
      beat: choreography.beat,
      readiness,
      hasResult: analysisResult !== null,
      canReveal,
      showError,
    });
  }, [choreography.beat, readiness, analysisResult, canReveal, showError]);

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

  // v12.1 — AUTO-navigate to the results screen once both gates open.
  //
  // BUG FIX from v12.0:
  //   The previous version had `[canReveal, onComplete]` as deps and
  //   relied on a `clearTimeout` cleanup. But `AnalyzingScreenHost`
  //   creates `onComplete` inline (no useCallback), so its reference
  //   changes on every parent render. Cleanup → clearTimeout → next
  //   render → ref guard early-returns → timeout never reschedules.
  //   Net effect: onComplete was never called and the user sat on
  //   the analyzing screen until the 70 s outer timeout fired
  //   "failed" → ErrorState with the generic copy.
  //
  // FIX: capture onComplete in a ref. The effect depends ONLY on
  // canReveal, so it only re-runs when canReveal flips. The
  // setTimeout fires onCompleteRef.current(...) at the time of
  // firing — so even if the prop reference has changed since, we
  // still call the LATEST handler.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const autoNavigateFiredRef = useRef(false);
  useEffect(() => {
    if (!canReveal) return;
    if (autoNavigateFiredRef.current) return;
    const scan = completedScanRef.current;
    if (!scan) return;
    autoNavigateFiredRef.current = true;
    debugCheckpoint('auto_navigate_scheduled', { scanId: scan.id });
    const t = setTimeout(() => {
      debugCheckpoint('auto_navigate_firing', { scanId: scan.id });
      useAppStore.getState().clearInFlightScan();
      onCompleteRef.current(scan.id);
    }, 480);
    return () => clearTimeout(t);
  }, [canReveal]);

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

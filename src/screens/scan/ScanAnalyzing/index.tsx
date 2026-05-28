/**
 * ScanAnalyzingFaceScreen (v30.1) — quality-gated analysis with three
 * meaningful outcomes.
 *
 * THE CRITICAL FIX: the previous version paraded the progress ring to
 * 100% and then navigated to a results screen which evaluated quality
 * and routed straight to "Let's try another photo." That betrayed the
 * user's trust.
 *
 * The gate now lives INSIDE this screen. The flow is:
 *
 *   mount
 *     → run preflight (cheap)
 *         ├── preflight 'ok'    → continue
 *         └── preflight 'fail'  → render RetakeRequiredScreen
 *     → run full analyze
 *         ↓
 *     → classifyScanUsability(scan)
 *         ├── 'retake_required'   → render RetakeRequiredScreen
 *         │                         (progress ring never hits 100%)
 *         ├── 'limited_results'   → render LimitedScanInterstitial
 *         │                         (user chooses continue or retake)
 *         └── 'full_results'      → progress ring completes → results
 *
 *   ↓ user picks Continue (on limited) OR full_results auto-advances
 *   → progress ring reaches 100% → navigate to ScanResultsFace
 *
 * The AI orchestration (preflight + analyze + store mutations + hard
 * timeout) is preserved from v11.x verbatim.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeFaceScan } from '@/api';
import { preflightFaceScan } from '@/api/scan';
import { aiGateway } from '@/ai/aiGateway';
import type { ScanPreflightReason } from '@/ai/ai-contracts';
import { useAppStore, useScanCount } from '@/store/useAppStore';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { Scan } from '@/types';
import { MAX_TOTAL_WAIT } from './constants';
import { ErrorState, type ErrorStateReason } from './components/ErrorState';
import { scanToScanResult } from './lib/scanToResult';
import {
  AnalysisLoadingSlide,
  type LoadingStage,
} from '@/components/scan-results/AnalysisLoadingSlide';
import { RetakeRequiredScreen } from '@/components/scan-results/RetakeRequiredScreen';
import { LimitedScanInterstitial } from '@/components/scan-results/LimitedScanInterstitial';
import { ScanServiceErrorScreen } from '@/components/scan-results/ScanServiceErrorScreen';
import {
  selectVisibleFindings,
  translateScanToAnalysis,
} from '@/services/scanResults/translateAnalysis';
import type {
  ScanAnalysisErrorCode,
  ScanAnalysisResponse,
} from '@/types/scanResults';

declare const __DEV__: boolean | undefined;
function debugCheckpoint(stage: string, data?: Record<string, unknown>): void {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) return;
  // eslint-disable-next-line no-console
  console.log(`[Pura Scan QA] ${stage}`, data ?? {});
}

/**
 * v33 — Preflight is HINT-ONLY. The previous flow treated any non-'ok'
 * preflight reason as a hard retake gate, which was the dominant cause
 * of "clear selfie rejected" reports. The full analysis is the source
 * of truth — preflight runs first only to short-circuit catastrophic
 * captures (no face at all, completely black frame).
 *
 * Hard-block reasons (force retake BEFORE analyze):
 *   • `no_face` — no human face is visible. Spending tokens on the
 *     full analysis would be pointless.
 *
 * Soft notices (continue to analyze, log only):
 *   • `partial_face`, `too_dark`, `too_blurry`, `not_centered`,
 *     `unknown` — these are advisory. The full analyzer is robust to
 *     mild conditions; let it decide.
 *
 * If the photo is genuinely unreadable for the analyzer too, the
 * downstream classifier will route to `retake_required` honestly with
 * a real reason. We never reject a usable photo on preflight alone.
 */
const HARD_BLOCK_PREFLIGHT_REASONS = new Set<ScanPreflightReason>([
  'no_face',
]);

function classifyServiceError(msg: string): ScanAnalysisErrorCode {
  const lower = msg.toLowerCase();
  if (lower.includes('unauthor') || lower.includes('401')) return 'unauthorized';
  if (lower.includes('timeout') || lower.includes('timed out')) return 'timeout';
  if (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('connect')
  ) {
    return 'network_error';
  }
  if (lower.includes('parse') || lower.includes('invalid')) {
    return 'invalid_response';
  }
  if (lower.includes('5') && lower.includes('0')) return 'server_error';
  return 'unknown';
}

function friendlyServiceError(msg: string): string | null {
  if (!msg) return null;
  const trimmed = msg.trim();
  if (trimmed.length === 0) return null;
  // Avoid surfacing developer-facing stack traces or numeric proxy
  // codes; the screen has a generic per-code fallback.
  if (/^\[/.test(trimmed) || trimmed.length > 160) return null;
  return trimmed;
}

export interface ScanAnalyzingFaceScreenProps {
  photoUri: string;
  previousScan?: Scan;
  dayNumber: number;
  onComplete: (scanId: string) => void;
  onRetry: () => void;
  onCancel: () => void;
}

type PreflightStatus =
  | { kind: 'pending' }
  | { kind: 'pass' }
  | { kind: 'skipped' }
  | { kind: 'fail'; reason: ScanPreflightReason; retryMessage?: string };

/**
 * `analyzing` — we're still talking to the model.
 * `classifying` — analyze returned, classifier is making the decision.
 * `retake_required` — terminal: render the retake screen.
 * `limited_choice` — terminal until user picks: render the interstitial.
 * `continue_to_results` — user committed; play out the final stages
 *   then navigate.
 */
type Phase =
  | 'analyzing'
  | 'classifying'
  | 'retake_required'
  | 'limited_choice'
  | 'continue_to_results';

export function ScanAnalyzingFaceScreen({
  photoUri,
  previousScan,
  dayNumber,
  onComplete,
  onRetry,
  onCancel,
}: ScanAnalyzingFaceScreenProps) {
  // `reduceMotion` is consumed by the AnalysisLoadingSlide internally
  // via the same hook; reading it here so future motion gates can opt
  // out of large animations.
  useReduceMotion();
  useScanCount();

  const completedScanRef = useRef<Scan | null>(null);
  const apiErroredRef = useRef(false);
  const errorReasonRef = useRef<ErrorStateReason>('unknown');
  const serviceErrorCodeRef = useRef<ScanAnalysisErrorCode>('unknown');
  const serviceErrorMessageRef = useRef<string | null>(null);

  const [preflight, setPreflight] = useState<PreflightStatus>(
    aiGateway.isAvailable() ? { kind: 'pending' } : { kind: 'skipped' }
  );

  const [phase, setPhase] = useState<Phase>('analyzing');
  const [analysis, setAnalysis] = useState<ScanAnalysisResponse | null>(null);
  const [networkFailed, setNetworkFailed] = useState(false);
  const mountedAtRef = useRef(Date.now());

  // Minimum perceived time at each stage so a fast AI response (e.g.
  // returning in 600ms) doesn't blow through the entire analyzing UI
  // before the user can even read the stages.
  const MIN_PRE_CLASSIFY_MS = 1100;
  const MIN_CLASSIFY_HOLD_MS = 520;

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
        if (cancelled) return;
        debugCheckpoint('preflight_result', {
          reason: result?.reason ?? 'no_result',
          face_present: result?.face_present,
          full_face_visible: result?.full_face_visible,
          centered_enough: result?.centered_enough,
          lighting_ok: result?.lighting_ok,
          blur_ok: result?.blur_ok,
        });
        if (!result) {
          // No preflight result at all — proceed; the analyzer will
          // truth-check the photo.
          setPreflight({ kind: 'skipped' });
          return;
        }
        const hardBlocked = HARD_BLOCK_PREFLIGHT_REASONS.has(result.reason);
        if (result.reason === 'ok' || !hardBlocked) {
          // PASS-THROUGH: even when the preflight flagged a soft notice
          // (mild blur, slight angle, mild shadow, slight off-center),
          // we continue to the full analyzer. The analyzer is robust to
          // these conditions; if the photo is truly unreadable it will
          // honestly classify as `retake_required`.
          if (result.reason !== 'ok') {
            debugCheckpoint('preflight_soft_notice_continuing', {
              reason: result.reason,
              retry_message: result.retry_message,
            });
          }
          setPreflight({ kind: 'pass' });
        } else {
          debugCheckpoint('preflight_hard_block', {
            reason: result.reason,
            retry_message: result.retry_message,
          });
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
        // On preflight error we proceed to analysis rather than
        // hard-blocking — service problems must not look like a bad photo.
        setPreflight({ kind: 'skipped' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photoUri]);

  // ---- Stage 2: analyze + classify ----
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
        if (cancelled) return;
        debugCheckpoint('analyze_completed', {
          hasAiAnalysis: !!scan.aiAnalysis,
          imageQualityUsable: scan.aiAnalysis?.image_quality?.usable,
          imageQualityConfidence: scan.aiAnalysis?.image_quality?.confidence,
          imageQualityIssues: scan.aiAnalysis?.image_quality?.issues,
          findingsCount: scan.aiAnalysis?.findings?.length ?? 0,
          hasFaceOverlay: !!scan.aiAnalysis?.face_overlay,
          hasV2Analysis: !!scan.v2Analysis,
        });

        // Persist the scan + the legacy ScanResult so the rest of the
        // app keeps reading what it expects.
        addScan(scan);
        completedScanRef.current = scan;
        const nextResult = scanToScanResult(
          scan,
          useAppStore.getState().scans.length
        );
        setScanResult(nextResult);

        // Honor a minimum perceived analyzing time so a fast AI
        // response doesn't blow through the staged UI.
        const elapsed = Date.now() - mountedAtRef.current;
        const preClassifyWait = Math.max(0, MIN_PRE_CLASSIFY_MS - elapsed);
        if (preClassifyWait > 0) {
          await new Promise((r) => setTimeout(r, preClassifyWait));
          if (cancelled) return;
        }

        setPhase('classifying');
        const response = translateScanToAnalysis(scan);
        setAnalysis(response);

        const usability = response.scanQuality.usability;
        const supportedFindings = selectVisibleFindings(response).length;
        debugCheckpoint('quality_classified', {
          usability,
          reasons: response.scanQuality.reasons,
          confidence: response.scanQuality.confidence,
          rawFindings: response.findings.length,
          supportedFindings,
          routineAllowed: response.routineEligibility.allowed,
        });

        // Hold the 84% beat for a moment so the user reads "Finishing
        // your skin map" before the screen flips.
        await new Promise((r) => setTimeout(r, MIN_CLASSIFY_HOLD_MS));
        if (cancelled) return;

        if (usability === 'retake_required') {
          debugCheckpoint('route_decision', {
            route: 'retake_required',
            reason: response.scanQuality.reasons.join('; '),
          });
          setPhase('retake_required');
        } else if (usability === 'limited_results') {
          debugCheckpoint('route_decision', {
            route: 'limited_choice',
            reason: response.scanQuality.reasons.join('; '),
            supportedFindings,
          });
          setPhase('limited_choice');
        } else {
          debugCheckpoint('route_decision', {
            route: 'continue_to_results',
            supportedFindings,
          });
          setPhase('continue_to_results');
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        debugCheckpoint('analyze_threw', { error: msg });
        errorReasonRef.current = 'network';
        serviceErrorCodeRef.current = classifyServiceError(msg);
        serviceErrorMessageRef.current = friendlyServiceError(msg);
        apiErroredRef.current = true;
        setNetworkFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preflight.kind, photoUri, previousScan, dayNumber]);

  // ---- Hard outer-bound timeout: network/AI never returns ----
  useEffect(() => {
    if (phase !== 'analyzing' && phase !== 'classifying') return;
    if (networkFailed) return;
    const t = setTimeout(() => {
      if (apiErroredRef.current) return;
      debugCheckpoint('hard_timeout_fired');
      errorReasonRef.current = 'unknown';
      serviceErrorCodeRef.current = 'timeout';
      serviceErrorMessageRef.current = null;
      setNetworkFailed(true);
    }, MAX_TOTAL_WAIT);
    return () => clearTimeout(t);
  }, [phase, networkFailed]);

  // ---- Cancel / retry handlers ----
  const handleCancel = useCallback(() => {
    useAppStore.getState().clearInFlightScan();
    onCancel();
  }, [onCancel]);

  const handleRetry = useCallback(() => {
    useAppStore.getState().clearInFlightScan();
    onRetry();
  }, [onRetry]);

  // ---- Auto-navigate when the user is committed to the results
  //      slideshow (full_results) or after they explicitly continue
  //      from the limited interstitial. ----
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Track when phase entered 'continue_to_results' so the loading slide
  // can briefly hold at 100% before the route hands off.
  const enteredContinueAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (phase === 'continue_to_results' && enteredContinueAtRef.current === null) {
      enteredContinueAtRef.current = Date.now();
    }
  }, [phase]);

  const autoNavigateFiredRef = useRef(false);
  useEffect(() => {
    if (phase !== 'continue_to_results') return;
    if (autoNavigateFiredRef.current) return;
    const scan = completedScanRef.current;
    if (!scan) return;
    autoNavigateFiredRef.current = true;
    debugCheckpoint('auto_navigate_scheduled', { scanId: scan.id });

    // Hold for ~680ms so the progress ring visibly hits 100% and the
    // analyzing card has time to fade before the slide transition.
    const t = setTimeout(() => {
      useAppStore.getState().clearInFlightScan();
      onCompleteRef.current(scan.id);
    }, 680);
    return () => clearTimeout(t);
  }, [phase]);

  // ---- User actions on the limited interstitial ----
  const handleContinueLimited = useCallback(() => {
    setPhase('continue_to_results');
  }, []);

  // ---- Compute the loading stage. 100% (`normalized`) is only ever
  //      reached when phase === 'continue_to_results'. ----
  //
  // Synthetic stage progression: when analyze is in flight, advance
  // through the intermediate stages on a timer so the user reads
  // every step instead of seeing the percent jump straight from 36%
  // to 84%.
  const [analyzingStage, setAnalyzingStage] = useState<LoadingStage>('quality_validated');
  useEffect(() => {
    if (preflight.kind === 'pending') return;
    if (phase !== 'analyzing') return;
    // Step from quality_validated → ai_result_returned after ~700ms.
    const t = setTimeout(() => setAnalyzingStage('ai_result_returned'), 700);
    return () => clearTimeout(t);
  }, [preflight.kind, phase]);

  const loadingStage = useMemo<LoadingStage>(() => {
    if (phase === 'continue_to_results') return 'normalized'; // 100%
    if (phase === 'classifying') return 'geometry_ready'; // 84%
    if (preflight.kind === 'pending') return 'image_ready'; // 12%
    return analyzingStage; // 36% → 64% over time
  }, [phase, preflight.kind, analyzingStage]);

  // ---- Terminal renders ----
  if (preflight.kind === 'fail') {
    return (
      <RetakeRequiredScreen
        photoUri={photoUri}
        detail={
          preflight.retryMessage ??
          'Use even light and keep your full face inside the frame so we can map your skin clearly.'
        }
        onRetake={handleRetry}
      />
    );
  }

  if (networkFailed) {
    // STATE A — analysis service error. The new ScanServiceErrorScreen
    // replaces the legacy ErrorState for analyze-side failures so the
    // UI matches the truth-first contract end-to-end (no fake findings,
    // no skin map, no routine).
    if (apiErroredRef.current || errorReasonRef.current === 'network') {
      return (
        <ScanServiceErrorScreen
          photoUri={photoUri}
          errorCode={serviceErrorCodeRef.current}
          userMessage={serviceErrorMessageRef.current ?? undefined}
          onTryAgain={handleRetry}
          onRetakePhoto={handleRetry}
        />
      );
    }
    return (
      <ErrorState
        onRetry={handleRetry}
        onAbort={handleCancel}
        reason={errorReasonRef.current}
      />
    );
  }

  if (phase === 'retake_required') {
    return (
      <RetakeRequiredScreen
        photoUri={photoUri}
        detail={
          analysis?.scanQuality.userMessage ??
          'We need a clearer view before mapping visible areas.'
        }
        onRetake={handleRetry}
      />
    );
  }

  if (phase === 'limited_choice' && analysis) {
    return (
      <LimitedScanInterstitial
        photoUri={photoUri}
        reasons={analysis.scanQuality.reasons}
        findingCount={selectVisibleFindings(analysis).length}
        onContinue={handleContinueLimited}
        onRetake={handleRetry}
      />
    );
  }

  // Default — the live analyzing experience.
  return (
    <AnalysisLoadingSlide
      photoUri={photoUri}
      stage={loadingStage}
      onCancel={handleCancel}
    />
  );
}

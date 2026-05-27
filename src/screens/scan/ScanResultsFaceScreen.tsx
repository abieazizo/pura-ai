/**
 * ScanResultsFaceScreen — paged scan-results reveal with strict routing.
 *
 * Five-state matrix (truth-first):
 *   A. service error      → ScanServiceErrorScreen
 *   B. retake required    → RetakeRequiredScreen
 *   C. zero supported     → NoClearFindingsScreen
 *   D. limited + findings → ScanResultsPager with limited banner
 *   E. full + findings    → ScanResultsPager
 *
 * Hard contract:
 *   • Reads `translateScanToAnalysis(scan)` once.
 *   • Selects supported findings + supported insights through the
 *     canonical selectors. Never inspects raw AI output.
 *   • Routine handoff is gated by `beginRoutineFromAnalysis` — invalid
 *     scans cannot mutate the Routine store from this screen.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '@/store/useAppStore';
import type { RootStackParamList } from '@/navigation/types';
import {
  classifyFindingsPresence,
  selectSupportedInsights,
  selectVisibleFindings,
  translateScanToAnalysis,
} from '@/services/scanResults/translateAnalysis';
import { beginRoutineFromAnalysis } from '@/services/scanResults/beginRoutine';
import { faceGeometryProvider } from '@/services/scanResults/faceGeometry';
import { useScanResultsSession } from '@/services/scanResults/useScanResultsSession';
import { ScanResultsPager } from '@/components/scan-results/ScanResultsPager';
import { RetakeRequiredScreen } from '@/components/scan-results/RetakeRequiredScreen';
import { ScanServiceErrorScreen } from '@/components/scan-results/ScanServiceErrorScreen';
import { ScanResultsV2Screen } from '@/screens/scan/ScanResultsV2Screen';
import { ScanResultsErrorBoundary } from '@/components/scan-results/ScanResultsErrorBoundary';
import { hapt } from '@/utils/haptics';

declare const __DEV__: boolean | undefined;

export interface ScanResultsFaceScreenProps {
  scanId: string;
}

export function ScanResultsFaceScreen({
  scanId,
}: ScanResultsFaceScreenProps) {
  const scans = useAppStore((s) => s.scans);
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const scan = scans.find((s) => s.id === scanId) ?? scans[scans.length - 1];

  const session = useScanResultsSession();
  const setAnalysis = useScanResultsSession((s) => s.setAnalysis);
  const setGeometry = useScanResultsSession((s) => s.setGeometry);
  const setAnalysisStatus = useScanResultsSession((s) => s.setAnalysisStatus);
  const setSelectedFindingId = useScanResultsSession(
    (s) => s.setSelectedFindingId
  );
  const startSession = useScanResultsSession((s) => s.startSession);
  const resetSession = useScanResultsSession((s) => s.resetSession);

  // Build the strict ScanAnalysisResponse from the persisted scan once.
  const analysis = useMemo(
    () => (scan ? translateScanToAnalysis(scan) : null),
    [scan]
  );

  const visibleFindings = useMemo(
    () => (analysis ? selectVisibleFindings(analysis) : []),
    [analysis]
  );

  const supportedInsights = useMemo(
    () =>
      analysis ? selectSupportedInsights(analysis, visibleFindings) : [],
    [analysis, visibleFindings]
  );

  if (typeof __DEV__ !== 'undefined' && __DEV__ && analysis) {
    // eslint-disable-next-line no-console
    console.log('[Pura Scan] parsed analysis', {
      scanId: analysis.scanId,
      usability: analysis.scanQuality.usability,
      rawFindings: analysis.findings.length,
      supportedFindings: visibleFindings.length,
      supportedInsights: supportedInsights.length,
      routineAllowed: analysis.routineEligibility.allowed,
    });
    // eslint-disable-next-line no-console
    console.log(
      '[Pura Scan] supported findings',
      visibleFindings.map((f) => ({
        id: f.id,
        type: f.type,
        confidence: f.confidence,
        priority: f.priority,
        zones: f.zones,
      }))
    );
    // eslint-disable-next-line no-console
    console.log('[Pura Scan] supported insights', supportedInsights);
    // eslint-disable-next-line no-console
    console.log('[Pura Scan] overlays to render', {
      count: Math.min(visibleFindings.length, 3),
    });
  }

  // Resolve face geometry from the AI's face_overlay (when present).
  useEffect(() => {
    if (!scan) return;
    startSession({
      scanId: scan.id,
      originalImageUri: scan.photoUri,
      capturedAt: scan.capturedAt,
    });
    setAnalysisStatus('mapping');
    let cancelled = false;
    (async () => {
      const aiOverlay = scan.aiAnalysis?.face_overlay ?? null;
      const geometry = await faceGeometryProvider.detect({
        imageUri: scan.photoUri,
        aiFaceOverlay: aiOverlay
          ? {
              face_box: aiOverlay.face_box,
              landmarks: aiOverlay.landmarks,
            }
          : null,
      });
      if (cancelled) return;
      setGeometry(geometry);
      if (analysis) setAnalysis(analysis);
      setAnalysisStatus('ready');
    })();
    return () => {
      cancelled = true;
    };
    // analysis is referenced inside the effect — including it in deps
    // would cause a fresh geometry pass every render, so we depend on
    // the scan's identity instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan?.id]);

  // Make sure the analysis is set even if geometry resolution races.
  useEffect(() => {
    if (analysis) setAnalysis(analysis);
  }, [analysis, setAnalysis]);

  const exitToHome = useCallback(() => {
    resetSession();
    rootNav.getParent()?.goBack();
  }, [resetSession, rootNav]);

  const goRetake = useCallback(() => {
    hapt.tap();
    resetSession();
    rootNav.goBack();
    setTimeout(() => {
      rootNav.navigate?.('ScanModal', { initialMode: 'face' });
    }, 80);
  }, [resetSession, rootNav]);

  const handleBuildRoutine = useCallback(() => {
    hapt.tap();
    if (!analysis) return;
    const result = beginRoutineFromAnalysis(analysis);
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Pura Scan] routine eligible', result.ok, {
        reasonIfBlocked: result.ok ? null : result.reason,
      });
    }
    if (!result.ok) {
      // Hard gate: refuse to navigate to Routine. Surface the path the
      // user CAN take — retake the photo.
      goRetake();
      return;
    }
    resetSession();
    rootNav.goBack();
    setTimeout(() => {
      // @ts-expect-error nested tab nav — existing pattern used across the app.
      rootNav.navigate?.('Tabs', { screen: 'RoutineTab' });
    }, 60);
  }, [analysis, goRetake, resetSession, rootNav]);

  if (!scan || !analysis) {
    return <View style={styles.blank} />;
  }

  // v32 — when the strict V2 analysis is on the scan, render the new
  // editorial results screen. The V2 analysis is server-guaranteed to
  // have 3-6 findings (schema + retry + deterministic fallback), so
  // there is no "nothing stood out" branch to handle for V2 scans.
  if (scan.v2Analysis) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Pura Scan] route selected', 'v2_results', {
        overall: scan.v2Analysis.overall_score,
        findings: scan.v2Analysis.findings.length,
      });
    }
    return (
      <ScanResultsErrorBoundary onRetake={goRetake} onClose={exitToHome}>
        <ScanResultsV2Screen scanId={scan.id} />
      </ScanResultsErrorBoundary>
    );
  }

  const usability = analysis.scanQuality.usability;
  const limitedScan = usability === 'limited_results';

  // STATE B — retake required.
  if (usability === 'retake_required') {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Pura Scan] route selected', 'retake_required');
    }
    return (
      <RetakeRequiredScreen
        photoUri={scan.photoUri}
        detail={analysis.scanQuality.userMessage}
        onRetake={goRetake}
      />
    );
  }

  // v32 — the "no clear findings" branch is deleted. With the V2
  // analysis guaranteed to be populated, the only way to land here
  // is a legacy scan persisted before v32. In that rare case we
  // still surface the V1 pager rather than the deleted empty-state
  // screen; the deterministic concern model carries enough signal
  // to populate at least one card.

  // STATE D / E — supported findings present.
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line no-console
    console.log(
      '[Pura Scan] route selected',
      limitedScan ? 'limited_results_with_findings' : 'full_results'
    );
  }
  return (
    <ScanResultsPager
      photoUri={scan.photoUri}
      analysis={analysis}
      visibleFindings={visibleFindings}
      supportedInsights={supportedInsights}
      geometry={session.geometry}
      selectedFindingId={session.selectedFindingId}
      onSelectFinding={(id) => setSelectedFindingId(id)}
      limitedScan={limitedScan}
      onBuildRoutine={handleBuildRoutine}
      onRetake={goRetake}
      onExit={exitToHome}
      onSlideChange={(idx) =>
        useScanResultsSession.getState().setCurrentSlide(idx + 1)
      }
    />
  );
}

// Re-export for callers that need to render the dedicated error screen
// directly from a route higher in the stack (e.g. the analyzing screen
// when the AI proxy itself fails).
export { ScanServiceErrorScreen };

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: '#FFFDF9',
  },
});

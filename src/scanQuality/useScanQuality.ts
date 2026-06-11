/**
 * useScanQuality — the ONE reactive hook the scan UI consumes.
 *
 * Updates ~12–15×/sec while enabled. Returns the full
 * ScanQualitySignals contract (continuous smoothed 0–1 signals,
 * hysteresis booleans, primaryHint, faceBox + landmarks) plus a
 * `getCaptureSnapshot` that freezes the live geometry at the
 * shutter moment so it can travel forward with the photo.
 *
 * Platform resolution is automatic via Metro: engine.web.ts (real
 * MediaPipe detection) on web, engine.ts (honest unavailable stub)
 * on native until the MLKit provider lands — see README.md.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createScanQualityEngine, type ScanQualityEngine } from './engine';
import {
  emptySignals,
  type CaptureQualitySnapshot,
  type ScanQualitySignals,
} from './types';

export interface UseScanQualityOptions {
  /** Engine runs only while true (face mode + camera granted). */
  enabled: boolean;
}

export interface UseScanQualityResult {
  signals: ScanQualitySignals;
  /** Freeze landmarks + signals at the shutter moment (null when
   *  the detector isn't running — callers must stay honest). */
  getCaptureSnapshot: () => CaptureQualitySnapshot | null;
}

const DISABLED_SIGNALS = emptySignals('initializing');

export function useScanQuality({ enabled }: UseScanQualityOptions): UseScanQualityResult {
  const engineRef = useRef<ScanQualityEngine | null>(null);
  const [signals, setSignals] = useState<ScanQualitySignals>(DISABLED_SIGNALS);

  useEffect(() => {
    if (!enabled) {
      engineRef.current?.dispose();
      engineRef.current = null;
      setSignals(DISABLED_SIGNALS);
      return;
    }
    const engine = createScanQualityEngine();
    engineRef.current = engine;
    engine.start();
    const unsubscribe = engine.subscribe(setSignals);
    return () => {
      unsubscribe();
      engine.dispose();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [enabled]);

  // Stable identity — consumers hold this in effect/callback deps, and
  // a per-tick identity would reset their timers 15×/sec (the
  // auto-capture hold timer would never elapse).
  const getCaptureSnapshot = useCallback(
    () => engineRef.current?.getCaptureSnapshot() ?? null,
    []
  );

  return useMemo(() => ({ signals, getCaptureSnapshot }), [signals, getCaptureSnapshot]);
}

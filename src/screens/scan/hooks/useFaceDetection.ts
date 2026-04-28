/**
 * Pura AI — real on-device face detection (v11.6).
 *
 * Bridges `react-native-vision-camera` + `vision-camera-face-detector`
 * to the Pura state machine in `useFaceScanState`.
 *
 * Architecture:
 *   • VisionCamera v5 runs a frame processor on a worklet thread.
 *   • The face detector returns ML-Kit face bounds per frame.
 *   • The worklet computes a normalized report
 *     (facePresent / centerX / centerY / sizeRatio / partial) and
 *     sends it to the JS thread via `runOnJS`.
 *   • The JS thread feeds the report into
 *     `faceScanState.report({...})`, which advances the state
 *     machine through the spec'd transitions.
 *
 * IMPORTANT — runtime gating:
 *   This file requires a custom dev build. After installing the
 *   packages and configuring app.json, run:
 *     npx expo prebuild --clean
 *     npx expo run:ios   (or run:android)
 *
 *   In Expo Go (no native modules) the module-load `require()` at
 *   the top throws, `nativeFaceDetectionAvailable === false`, and
 *   the no-op hook is exported. The parent ScanCaptureScreen then
 *   falls back to the legacy expo-camera path so the app still
 *   runs everywhere.
 *
 * Rules-of-Hooks safety:
 *   We choose the hook implementation ONCE at module load
 *   (`nativeFaceDetectionAvailable`) and export the corresponding
 *   real-or-noop function. Every render of the parent screen calls
 *   the SAME function in the SAME order, so React's hook tracker
 *   stays consistent.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { FaceScanReport } from './useFaceScanState';

// ---------------------------------------------------------------------------
// Native module loader. We probe via `require()` with try/catch so
// the rest of the app can still boot in Expo Go.
// ---------------------------------------------------------------------------

interface VisionCameraModule {
  Camera: unknown;
  useCameraDevice: (position: 'front' | 'back') => unknown;
  useCameraPermission: () => {
    hasPermission: boolean;
    requestPermission: () => Promise<boolean>;
  };
  useFrameProcessor: (
    fn: (frame: unknown) => void,
    deps: ReadonlyArray<unknown>
  ) => unknown;
}

interface FaceDetectorModule {
  useFaceDetector: (options?: object) => {
    detectFaces: (frame: unknown) => Array<{
      bounds: { x: number; y: number; width: number; height: number };
    }>;
  };
}

interface WorkletsModule {
  Worklets: {
    createRunOnJS: <T extends (...args: never[]) => void>(fn: T) => T;
  };
}

let visionCamera: VisionCameraModule | null = null;
let faceDetector: FaceDetectorModule | null = null;
let workletsCore: WorkletsModule | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  visionCamera = require('react-native-vision-camera') as VisionCameraModule;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  faceDetector = require('react-native-vision-camera-face-detector') as FaceDetectorModule;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  workletsCore = require('react-native-worklets-core') as WorkletsModule;
} catch {
  visionCamera = null;
  faceDetector = null;
  workletsCore = null;
}

export const nativeFaceDetectionAvailable: boolean =
  !!visionCamera && !!faceDetector && !!workletsCore;

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

export interface UseFaceDetectionApi {
  /** Whether the native face detector is wired in this build. */
  available: boolean;
  /** Camera permission status. False until granted. */
  hasPermission: boolean;
  /** Request the camera permission. Returns true on grant. */
  requestPermission: () => Promise<boolean>;
  /** The vision-camera Camera component. Null when not available. */
  Camera: unknown;
  /** Currently selected camera device. Null when not available. */
  device: unknown;
  /** Frame processor wired to feed `onReport`. Null when not available. */
  frameProcessor: unknown;
}

export interface UseFaceDetectionArgs {
  /** Called on the JS thread with the per-frame face report. */
  onReport: (report: FaceScanReport) => void;
  /** Throttle the worklet→JS jumps to one per ~120ms. */
  reportIntervalMs?: number;
}

const DEFAULT_REPORT_INTERVAL_MS = 120;

// ---------------------------------------------------------------------------
// Real implementation — used when native modules are present.
// ---------------------------------------------------------------------------

function useFaceDetectionReal(
  args: UseFaceDetectionArgs
): UseFaceDetectionApi {
  const { onReport, reportIntervalMs = DEFAULT_REPORT_INTERVAL_MS } = args;
  const lastEmitRef = useRef(0);

  const handleReport = useCallback(
    (report: FaceScanReport) => {
      const now = Date.now();
      if (now - lastEmitRef.current < reportIntervalMs) return;
      lastEmitRef.current = now;
      onReport(report);
    },
    [onReport, reportIntervalMs]
  );

  // ESLint cannot statically verify these are stable across renders,
  // but `visionCamera` etc. are module-load consts; the safety is
  // structural (real vs noop split below).
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const cameraPermission = visionCamera!.useCameraPermission();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const device = visionCamera!.useCameraDevice('front');

  const detector = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return faceDetector!.useFaceDetector({
      performanceMode: 'fast',
      classificationMode: 'none',
      contourMode: 'none',
      landmarkMode: 'none',
      minFaceSize: 0.18,
      trackingEnabled: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runOnJS = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return workletsCore!.Worklets.createRunOnJS(handleReport);
  }, [handleReport]);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const frameProcessor = visionCamera!.useFrameProcessor(
    (frame: unknown) => {
      'worklet';
      const detect = detector.detectFaces;
      const faces = detect(frame);
      if (!faces || faces.length === 0) {
        runOnJS({ facePresent: false });
        return;
      }
      const f = frame as { width: number; height: number };
      let largest = faces[0];
      let largestArea = largest.bounds.width * largest.bounds.height;
      for (let i = 1; i < faces.length; i++) {
        const a = faces[i].bounds.width * faces[i].bounds.height;
        if (a > largestArea) {
          largest = faces[i];
          largestArea = a;
        }
      }
      const cx = largest.bounds.x + largest.bounds.width / 2;
      const cy = largest.bounds.y + largest.bounds.height / 2;
      const centerXNorm = cx / f.width;
      const centerYNorm = cy / f.height;
      const sizeRatio = largest.bounds.height / f.height;
      const partial =
        largest.bounds.x <= 4 ||
        largest.bounds.y <= 4 ||
        largest.bounds.x + largest.bounds.width >= f.width - 4 ||
        largest.bounds.y + largest.bounds.height >= f.height - 4;
      runOnJS({
        facePresent: true,
        centerX: centerXNorm,
        centerY: centerYNorm,
        sizeRatio,
        partial,
      });
    },
    [detector, runOnJS]
  );

  useEffect(
    () => () => {
      lastEmitRef.current = 0;
    },
    []
  );

  return {
    available: true,
    hasPermission: cameraPermission.hasPermission,
    requestPermission: cameraPermission.requestPermission,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    Camera: visionCamera!.Camera,
    device,
    frameProcessor,
  };
}

// ---------------------------------------------------------------------------
// No-op implementation — used in Expo Go where the native modules
// don't exist. Returns stable defaults; never calls vision-camera
// hooks (because they'd crash). Same hook signature so React's hook
// tracker stays consistent across renders.
// ---------------------------------------------------------------------------

function useFaceDetectionNoop(
  _args: UseFaceDetectionArgs
): UseFaceDetectionApi {
  // Use explicit useRef to keep the hook count consistent with the
  // real version; React only cares about hook ORDER, not values.
  const ref = useRef(0);
  void ref;
  return {
    available: false,
    hasPermission: false,
    requestPermission: async () => false,
    Camera: null,
    device: null,
    frameProcessor: null,
  };
}

// One hook implementation, chosen at module load. Stable across
// renders → safe under Rules of Hooks.
export const useFaceDetection: (args: UseFaceDetectionArgs) => UseFaceDetectionApi =
  nativeFaceDetectionAvailable ? useFaceDetectionReal : useFaceDetectionNoop;

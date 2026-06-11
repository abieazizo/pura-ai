/**
 * Scan-quality engine — WEB provider.
 *
 * Runs MediaPipe Tasks FaceLandmarker (478 landmarks, VIDEO mode)
 * against the <video> element expo-camera's web CameraView renders,
 * inside a requestAnimationFrame loop throttled to ~15 Hz. Brightness,
 * backlight, clipping, and Laplacian sharpness come from the same
 * frames via an offscreen downsampled canvas (~192px wide, sampled at
 * ~7.5 Hz) so the JS thread never sees heavy per-pixel work.
 *
 * Assets are vendored under public/mediapipe/ (wasm + .task model) so
 * the engine works offline and on Vercel with no CDN dependency; the
 * jsDelivr CDN is only a fallback if the local copies 404.
 *
 * Trust contract: if anything fails to load, the engine reports
 * `detectorStatus: 'unavailable'` — it NEVER pretends to detect.
 */

import type {
  FaceLandmarker as FaceLandmarkerT,
} from '@mediapipe/tasks-vision';
import {
  emptySignals,
  type CaptureQualitySnapshot,
  type NormPoint,
  type ScanQualitySignals,
} from './types';
import { THRESHOLDS as T } from './thresholds';
import {
  computeFrameStats,
  computeTargets,
  deriveBooleans,
  pickHint,
  smoothSignals,
  HINT_TEXT,
  INITIAL_BOOLEANS,
  INITIAL_SMOOTHED,
  type FrameStats,
  type QualityBooleans,
  type SmoothedSignals,
} from './signalMath';

export type SignalsListener = (signals: ScanQualitySignals) => void;

const LOCAL_VISION_BUNDLE = '/mediapipe/vision_bundle.mjs';
const LOCAL_WASM_BASE = '/mediapipe/wasm';
const LOCAL_MODEL = '/mediapipe/face_landmarker.task';
const CDN_VISION_BUNDLE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs';
const CDN_WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const CDN_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';

/**
 * Metro cannot bundle @mediapipe/tasks-vision — vision_bundle.mjs
 * contains a dynamic `import(expr)` Metro's transformer rejects
 * ("Invalid call"). So the library is vendored to public/mediapipe/
 * and imported NATIVELY by the browser at runtime. `new Function`
 * hides the dynamic import from Metro's static analysis; the browser
 * executes a plain same-origin module import. Types still come from
 * the npm package (type-only imports are erased at compile time).
 */
const runtimeImport = new Function('u', 'return import(u)') as (
  u: string
) => Promise<typeof import('@mediapipe/tasks-vision')>;

async function urlExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

export class ScanQualityEngine {
  private landmarker: FaceLandmarkerT | null = null;
  private video: HTMLVideoElement | null = null;
  private rafId: number | null = null;
  private findVideoTimer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;

  private listeners = new Set<SignalsListener>();
  private signals: ScanQualitySignals = emptySignals('initializing');

  // per-tick state
  private smoothed: SmoothedSignals = INITIAL_SMOOTHED;
  private bools: QualityBooleans = INITIAL_BOOLEANS;
  private lastTickMs = 0;
  private lastDetectionAtMs = 0;
  private lastLandmarks: ReadonlyArray<NormPoint> | null = null;
  private prevLandmarks: ReadonlyArray<NormPoint> | null = null;
  private prevDetectDtMs = 0;
  private lastStats: FrameStats | null = null;
  private tickCount = 0;
  private fpsWindowStart = 0;
  private fpsWindowTicks = 0;
  private fps = 0;

  // offscreen stats canvas
  private statsCanvas: HTMLCanvasElement | null = null;
  private statsCtx: CanvasRenderingContext2D | null = null;

  start(): void {
    void this.init();
  }

  subscribe(fn: SignalsListener): () => void {
    this.listeners.add(fn);
    fn(this.signals);
    return () => this.listeners.delete(fn);
  }

  getSignals(): ScanQualitySignals {
    return this.signals;
  }

  /** Freeze the live geometry + signals at the shutter moment. */
  getCaptureSnapshot(): CaptureQualitySnapshot | null {
    const s = this.signals;
    if (s.detectorStatus !== 'running') return null;
    return {
      capturedAtMs: Date.now(),
      videoWidth: s.videoWidth,
      videoHeight: s.videoHeight,
      landmarks: this.lastLandmarks,
      faceBox: s.faceBox,
      pose: s.pose,
      mirroredPreview: s.mirroredPreview,
      allPass: s.allPass,
      signals: {
        framingScore: s.framingScore,
        lightScore: s.lightScore,
        sharpnessScore: s.sharpnessScore,
        poseScore: s.poseScore,
        stillnessScore: s.stillnessScore,
        lightLevel: s.lightLevel,
      },
    };
  }

  dispose(): void {
    this.disposed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    if (this.findVideoTimer) clearInterval(this.findVideoTimer);
    this.landmarker?.close();
    this.landmarker = null;
    this.listeners.clear();
  }

  // -------------------------------------------------------------------------

  private async init(): Promise<void> {
    try {
      const bundleUrl = (await urlExists(LOCAL_VISION_BUNDLE))
        ? LOCAL_VISION_BUNDLE
        : CDN_VISION_BUNDLE;
      const vision = await runtimeImport(bundleUrl);
      const wasmBase = (await urlExists(`${LOCAL_WASM_BASE}/vision_wasm_internal.wasm`))
        ? LOCAL_WASM_BASE
        : CDN_WASM_BASE;
      const modelPath = (await urlExists(LOCAL_MODEL)) ? LOCAL_MODEL : CDN_MODEL;
      const fileset = await vision.FilesetResolver.forVisionTasks(wasmBase);

      const create = (delegate: 'GPU' | 'CPU') =>
        vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: modelPath, delegate },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });

      try {
        this.landmarker = await create('GPU');
        this.log('landmarker ready (GPU delegate)');
      } catch (gpuErr) {
        this.log(`GPU delegate failed — falling back to CPU (${String(gpuErr).slice(0, 80)})`);
        this.landmarker = await create('CPU');
        this.log('landmarker ready (CPU delegate)');
      }
      if (this.disposed) {
        this.log('disposed during init — closing landmarker');
        this.landmarker?.close();
        this.landmarker = null;
        return;
      }

      this.statsCanvas = document.createElement('canvas');
      this.statsCtx = this.statsCanvas.getContext('2d', {
        willReadFrequently: true,
      });

      this.findVideo();
    } catch (err) {
      if (!this.disposed) {
        // eslint-disable-next-line no-console
        console.warn('[scanQuality] detector unavailable:', err);
        this.emit(emptySignals('unavailable'));
      }
    }
  }

  private log(msg: string): void {
    // eslint-disable-next-line no-console
    console.log(`[scanQuality] ${msg}`);
  }

  /** expo-camera web renders a <video>; poll until it's live. */
  private findVideo(): void {
    const tryFind = () => {
      const vids = Array.from(document.querySelectorAll('video'));
      const live = vids.find(
        (v) =>
          v.readyState >= 2 &&
          v.videoWidth > 0 &&
          v.srcObject instanceof MediaStream
      );
      if (live) {
        if (this.findVideoTimer) clearInterval(this.findVideoTimer);
        this.findVideoTimer = null;
        this.video = live;
        this.fpsWindowStart = performance.now();
        this.log(`video found (${live.videoWidth}×${live.videoHeight}) — starting tick loop`);
        this.rafId = requestAnimationFrame(this.tick);
      }
    };
    tryFind();
    if (!this.video) {
      this.findVideoTimer = setInterval(tryFind, 300);
    }
  }

  private tick = (now: number): void => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.tick);

    // throttle to ~15 Hz — rAF runs at 60, we act every ~4th frame.
    if (now - this.lastTickMs < T.DETECT_INTERVAL_MS) return;
    const dtMs = this.lastTickMs > 0 ? now - this.lastTickMs : T.DETECT_INTERVAL_MS;
    this.lastTickMs = now;
    this.tickCount++;

    const video = this.video;
    if (!video || !video.isConnected || video.readyState < 2 || video.videoWidth === 0) {
      // video unmounted (mode switch) — go back to searching for one.
      this.video = null;
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.emit({ ...emptySignals('initializing'), fps: 0 });
      this.findVideo();
      return;
    }

    // -- detection -----------------------------------------------------------
    let landmarks: ReadonlyArray<NormPoint> | null = null;
    try {
      const result = this.landmarker!.detectForVideo(video, now);
      const lms = result.faceLandmarks?.[0];
      if (lms && lms.length > 0) {
        landmarks = lms as ReadonlyArray<NormPoint>;
      }
    } catch {
      // single bad frame — treat as no detection this tick.
    }

    let detectDtMs = 0;
    if (landmarks) {
      this.prevLandmarks = this.lastLandmarks;
      detectDtMs = this.lastDetectionAtMs > 0 ? now - this.lastDetectionAtMs : 0;
      this.prevDetectDtMs = detectDtMs;
      this.lastLandmarks = landmarks;
      this.lastDetectionAtMs = now;
    }

    // -- frame stats (every Nth tick) -----------------------------------------
    if (this.tickCount % T.FRAME_STATS_EVERY_N === 0) {
      this.lastStats = this.sampleFrameStats(video);
    }

    // -- pure pipeline ---------------------------------------------------------
    const targets = computeTargets({
      landmarks,
      prevLandmarks: landmarks ? this.prevLandmarks : null,
      detectDtMs: landmarks ? this.prevDetectDtMs : 0,
      stats: this.lastStats,
    });
    this.smoothed = smoothSignals(this.smoothed, targets, dtMs);
    this.bools = deriveBooleans(
      this.bools,
      this.smoothed,
      landmarks !== null,
      now - this.lastDetectionAtMs
    );
    const hintId = pickHint(this.bools, targets, this.smoothed);

    // fps measurement (1s window)
    this.fpsWindowTicks++;
    if (now - this.fpsWindowStart >= 1000) {
      this.fps = Math.round((this.fpsWindowTicks * 1000) / (now - this.fpsWindowStart));
      this.fpsWindowStart = now;
      this.fpsWindowTicks = 0;
    }

    this.emit({
      framingScore: Math.min(this.smoothed.distanceScore, this.smoothed.centerScore),
      lightScore: this.smoothed.lightScore,
      sharpnessScore: this.smoothed.sharpnessScore,
      poseScore: this.smoothed.poseScore,
      stillnessScore: this.smoothed.stillnessScore,
      lightLevel: this.smoothed.lightLevel,
      ...this.bools,
      foreheadVisible: targets.foreheadVisible,
      chinVisible: targets.chinVisible,
      bothCheeksVisible: targets.bothCheeksVisible,
      backlightRisk: this.smoothed.backlightRisk,
      hintId,
      primaryHint: HINT_TEXT[hintId],
      faceBox: targets.faceBox,
      landmarks: this.lastLandmarks && this.bools.faceDetected ? this.lastLandmarks : null,
      pose: targets.pose,
      mirroredPreview: true, // expo-camera mirrors the front-camera preview
      detectorStatus: 'running',
      fps: this.fps,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
    });
  };

  private sampleFrameStats(video: HTMLVideoElement): FrameStats | null {
    const ctx = this.statsCtx;
    const canvas = this.statsCanvas;
    if (!ctx || !canvas) return null;
    const w = T.STATS_WIDTH;
    const h = Math.max(2, Math.round((video.videoHeight / video.videoWidth) * w));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    try {
      ctx.drawImage(video, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      // Rec.601 luma into a flat buffer once; all stats reuse it.
      const luma = new Float32Array(w * h);
      const d = img.data;
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        luma[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      }
      const box = this.lastLandmarks && this.bools.faceDetected && this.signals.faceBox
        ? this.signals.faceBox
        : null;
      return computeFrameStats(luma, w, h, box);
    } catch {
      return null;
    }
  }

  private emit(next: ScanQualitySignals): void {
    this.signals = next;
    if (typeof window !== 'undefined') {
      // verification hook — read the live signals from the console /
      // automated rigs without touching React state.
      (window as any).__scanQualityDebug = next;
    }
    for (const fn of this.listeners) fn(next);
  }
}

export function createScanQualityEngine(): ScanQualityEngine {
  return new ScanQualityEngine();
}

/**
 * Scan-quality engine — NATIVE provider (honest stub).
 *
 * There is no on-device face detector in Expo Go, so on native this
 * engine reports `detectorStatus: 'unavailable'` and every signal
 * stays at its honest zero. The capture screen falls back to its
 * advisory flow (countdown + post-capture preflight) — checks are
 * simply never claimed.
 *
 * The real native provider (dev build) swaps in HERE, behind the
 * exact same class shape — see README.md for the full plan
 * (react-native-vision-camera + MLKit face frame processor for
 * box/pose/presence, expo-sensors DeviceMotion for stillness, frame
 * histogram for light, same THRESHOLDS so both platforms gate
 * identically).
 */

import {
  emptySignals,
  type CaptureQualitySnapshot,
  type ScanQualitySignals,
} from './types';

export type SignalsListener = (signals: ScanQualitySignals) => void;

export class ScanQualityEngine {
  private signals: ScanQualitySignals = emptySignals('unavailable');

  start(): void {
    // no detector on this platform — stay honestly unavailable.
  }

  subscribe(fn: SignalsListener): () => void {
    fn(this.signals);
    return () => {};
  }

  getSignals(): ScanQualitySignals {
    return this.signals;
  }

  getCaptureSnapshot(): CaptureQualitySnapshot | null {
    return null;
  }

  dispose(): void {}
}

export function createScanQualityEngine(): ScanQualityEngine {
  return new ScanQualityEngine();
}

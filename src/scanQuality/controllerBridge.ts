/**
 * Bridge: ScanQualitySignals → the scanController's FaceReadiness
 * vocabulary.
 *
 * The controller (scanController.ts) is an honest phase machine with
 * its own legacy boundaries (coverage 0.45/0.92, lighting 0.35, …).
 * The engine's hysteresis booleans are the single source of truth for
 * pass/fail, so this projection guarantees the controller's coaching
 * branches fire exactly when the engine's booleans say so — the
 * underlying measurements are real; only the scale is translated.
 *
 * occlusionRisk stays 0: the engine does not measure occlusion yet,
 * and we never claim a risk (or its absence) we didn't measure — 0
 * simply never triggers the occlusion coaching branch.
 */

import type { FaceReadiness } from '@/screens/scan/scanController';
import type { ScanQualitySignals } from './types';
import { THRESHOLDS as T } from './thresholds';
import { clamp01 } from './signalMath';

/**
 * Project the real face-height fraction into the controller's
 * coverage scale so its "Move closer" (<0.45) and "Move back"
 * (≥0.92) branches agree with the engine's faceDistanceOk boolean.
 */
function coverageForController(q: ScanQualitySignals): number {
  if (!q.faceDetected || !q.faceBox) return 0;
  const frac = q.faceBox.height;
  if (!q.faceDistanceOk) {
    const idealMid = (T.DIST_IDEAL_LO + T.DIST_IDEAL_HI) / 2;
    return frac < idealMid ? 0.3 : 0.95;
  }
  // Inside the ok band: spread continuously across the controller's
  // comfortable range so the value still glides with real distance.
  const t = clamp01((frac - T.DIST_FAR_MIN) / (T.DIST_CLOSE_MAX - T.DIST_FAR_MIN));
  return 0.46 + t * (0.91 - 0.46);
}

export function qualityToFaceReadiness(q: ScanQualitySignals): FaceReadiness {
  const minScore = Math.min(
    q.framingScore,
    q.lightScore,
    q.sharpnessScore,
    q.poseScore,
    q.stillnessScore
  );
  return {
    faceDetected: q.faceDetected,
    faceCentered: q.faceCentered,
    faceCoverage: coverageForController(q),
    foreheadVisible: q.faceDetected && q.foreheadVisible,
    chinVisible: q.faceDetected && q.chinVisible,
    bothCheeksVisible: q.faceDetected && q.bothCheeksVisible,
    // Projected so the controller's light coaching (<0.35) fires
    // exactly when the engine's lightOk boolean is false.
    lightingQuality: q.lightOk ? Math.max(0.56, q.lightScore) : Math.min(0.34, q.lightScore),
    backlightRisk: q.backlightRisk,
    motionStability: q.stillnessScore,
    sharpness: q.sharpnessScore,
    occlusionRisk: 0,
    // 'ready' (≥0.7) exactly ⇔ the engine's allPass.
    overallReadiness: q.allPass ? Math.max(0.72, minScore) : Math.min(0.69, minScore),
  };
}

/**
 * TEMPORARY engineering debug readout for the scan-quality engine.
 *
 * Renders every continuous signal (0–1), every boolean, the hint,
 * and engine health so detection can be verified live. Visible in
 * dev builds, or on web with `?scanDebug=1`. Not a designed surface —
 * slated for removal once the quality UI lands.
 */

import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { ScanQualitySignals } from '@/scanQuality/types';

export function isScanDebugEnabled(): boolean {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      return new URLSearchParams(window.location.search).get('scanDebug') === '1';
    } catch {
      return false;
    }
  }
  return false;
}

const f2 = (v: number) => v.toFixed(2);
const yn = (b: boolean) => (b ? '✓' : '✗');

export function ScanQualityDebugOverlay({ signals: s }: { signals: ScanQualitySignals }) {
  return (
    <View style={styles.box} pointerEvents="none" testID="scan-quality-debug">
      <Text style={styles.line}>
        engine {s.detectorStatus} · {s.fps}fps · {s.videoWidth}×{s.videoHeight}
      </Text>
      <Text style={styles.line}>
        framing {f2(s.framingScore)}  light {f2(s.lightScore)}  sharp {f2(s.sharpnessScore)}
      </Text>
      <Text style={styles.line}>
        pose {f2(s.poseScore)}  still {f2(s.stillnessScore)}  lightLevel {f2(s.lightLevel)}
      </Text>
      <Text style={styles.line}>
        face{yn(s.faceDetected)} dist{yn(s.faceDistanceOk)} center{yn(s.faceCentered)} pose
        {yn(s.facePoseOk)} light{yn(s.lightOk)} sharp{yn(s.sharpnessOk)}
      </Text>
      <Text style={[styles.line, s.allPass ? styles.pass : styles.fail]}>
        allPass {yn(s.allPass)} · {s.primaryHint}
      </Text>
      {s.faceBox ? (
        <Text style={styles.line}>
          box x{f2(s.faceBox.x)} y{f2(s.faceBox.y)} w{f2(s.faceBox.width)} h
          {f2(s.faceBox.height)} · lm {s.landmarks?.length ?? 0}
          {s.pose
            ? ` · yaw ${s.pose.yawDeg.toFixed(0)}° pitch ${s.pose.pitchDeg.toFixed(0)}° roll ${s.pose.rollDeg.toFixed(0)}°`
            : ''}
        </Text>
      ) : (
        <Text style={styles.line}>box — · lm 0</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    top: 76,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: 340,
  },
  line: {
    color: '#9fe8c8',
    fontSize: 10,
    lineHeight: 14,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  pass: { color: '#5ff09a', fontWeight: '700' },
  fail: { color: '#ffb38a', fontWeight: '700' },
});

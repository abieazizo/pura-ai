import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BaselineHero } from './BaselineHero';
import { ScanEvidenceModule } from './ScanEvidence';
import { SignalSummary } from './SignalSummary';
import { NextActionCard } from './NextActionCard';
import {
  EstablishedProgressHero,
  ScoreBreakdown,
} from './EstablishedProgress';
import { V26_SPACE } from './tokens';
import type {
  ScanEvidence,
  ScanReliabilityState,
  SkinSignal,
  ProgressTrend,
} from '@/state/v26/routineSession';

interface ProgressViewProps {
  reliability: ScanReliabilityState;
  signals: SkinSignal[];
  evidence: ScanEvidence;
  trend: ProgressTrend;
  routineCompletedTonight: boolean;
  onStartScan: () => void;
  onSetReminder: () => void;
  onViewScanGuide: () => void;
  onReviewRoutine: () => void;
}

/**
 * v26 — Progress body.
 *
 * Chooses baseline-building vs established-progress. The two states
 * share evidence + next-action modules and disagree only on the
 * hero / trend modules. No score appears below the baseline
 * threshold, regardless of available data.
 */
export function ProgressView({
  reliability,
  signals,
  evidence,
  trend,
  routineCompletedTonight,
  onStartScan,
  onSetReminder,
  onViewScanGuide,
  onReviewRoutine,
}: ProgressViewProps) {
  const established = reliability.baselineEstablished && trend.established;
  const empty = reliability.reliableScanCount === 0;
  const nextActionState: 'scanned-today' | 'scan-due-now' = reliability.scannedToday
    ? 'scanned-today'
    : 'scan-due-now';

  return (
    <View style={s.body}>
      {established ? (
        <EstablishedProgressHero trend={trend} evidence={evidence} />
      ) : (
        <BaselineHero reliability={reliability} />
      )}

      {!empty ? (
        <ScanEvidenceModule
          evidence={evidence}
          comparisonUnlockMessage={
            evidence.comparisonAvailable
              ? undefined
              : `Comparison unlocks after ${Math.max(
                  0,
                  reliability.requiredForBaseline - reliability.reliableScanCount,
                )} more scan${
                  Math.max(
                    0,
                    reliability.requiredForBaseline - reliability.reliableScanCount,
                  ) === 1
                    ? ''
                    : 's'
                }`
          }
        />
      ) : null}

      {!established ? (
        <SignalSummary signals={signals} />
      ) : trend.scoreBreakdown ? (
        <ScoreBreakdown rows={trend.scoreBreakdown} />
      ) : null}

      <NextActionCard
        state={nextActionState}
        onSetReminder={onSetReminder}
        onStartScan={onStartScan}
        onViewScanGuide={onViewScanGuide}
        onReviewRoutine={!routineCompletedTonight ? onReviewRoutine : undefined}
        reviewRoutineLabel={!routineCompletedTonight ? 'Review tonight’s routine' : undefined}
      />
    </View>
  );
}

const s = StyleSheet.create({
  body: {
    paddingHorizontal: V26_SPACE.gutter,
    paddingTop: 18,
    gap: V26_SPACE.cardGap,
  },
});

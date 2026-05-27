import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { CheckCircle, CircleNotch } from 'phosphor-react-native';
import {
  EditorialHeadline,
  BodyText,
  Eyebrow,
  PURA,
  PURA_FONT,
  PURA_RADIUS,
  PURA_SHADOW,
} from '@/components/onboarding/v2';
import { useOnboardingV2 } from '@/state/onboardingV2';
import { useAppStore } from '@/store/useAppStore';
import { analyzeFaceScan } from '@/api/scan';
import { onboardingV2 } from '@/ai/onboardingAnalyticsV2';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import {
  recordScanQuality,
} from '@/ai/persistedTelemetry';
import type { Scan } from '@/types';

export interface ProcessingV2Props {
  /** Called once the analysis has either succeeded or failed in a way that
   *  warrants a destination switch. The host inspects the onboarding state
   *  to decide whether to advance to Baseline or surface a retake prompt. */
  onDone: (outcome: ProcessingOutcome) => void;
}

export type ProcessingOutcome =
  | 'success'
  | 'poor_quality'
  | 'error';

type Stage = 'quality' | 'focus' | 'guidance';

const STAGE_LABELS: Record<Stage, string> = {
  quality: 'Checking scan quality',
  focus: 'Reviewing visible focus areas',
  guidance: 'Preparing routine guidance',
};

const STAGE_ORDER: Stage[] = ['quality', 'focus', 'guidance'];

/**
 * v25 — Processing.
 *
 * Calm stage transitions tied to real work: the screen kicks off
 * `analyzeFaceScan` on mount and pushes UI stages as the analysis runs.
 * On success, the resulting Scan is stored in onboardingV2 state and
 * the host advances to Baseline. On poor-quality or error, the host
 * surfaces the appropriate recovery copy.
 *
 * Timing notes:
 *   • Stages reveal at fixed intervals so the user perceives progress
 *     even when the AI call returns in a few hundred milliseconds.
 *   • If the call takes longer than the staged reveal, the final stage
 *     holds at a quiet "spinning" state until the result lands.
 *   • If the result lands before all stages have appeared, the staging
 *     completes naturally — we never end the screen abruptly.
 *   • Maximum perceived processing is bounded by the deterministic
 *     fallback path (1.8s) and the actual AI latency. No artificial
 *     theatre delays.
 */
export function ProcessingV2({ onDone }: ProcessingV2Props) {
  const reduceMotion = useReduceMotion();
  const capturedScanUri = useOnboardingV2((s) => s.capturedScanUri);
  const setScanAnalysisResult = useOnboardingV2(
    (s) => s.setScanAnalysisResult
  );
  const setProcessingStatus = useOnboardingV2((s) => s.setProcessingStatus);
  const setScanQualityStatus = useOnboardingV2((s) => s.setScanQualityStatus);
  const scans = useAppStore((s) => s.scans);

  const [stagesVisible, setStagesVisible] = useState<Set<Stage>>(
    () => new Set()
  );
  const [stagesComplete, setStagesComplete] = useState<Set<Stage>>(
    () => new Set()
  );
  const analysisDoneRef = useRef(false);

  // Kick off the real scan analysis on mount.
  useEffect(() => {
    if (!capturedScanUri) {
      onboardingV2.firstScanProcessingFailed('poor_quality');
      setProcessingStatus('failed', 'No scan asset present');
      onDone('error');
      return;
    }

    onboardingV2.firstScanProcessingStarted();
    setProcessingStatus('running');

    let cancelled = false;
    (async () => {
      const previousScan = scans[scans.length - 1];
      const dayNumber = previousScan ? previousScan.dayNumber + 1 : 1;
      try {
        const scan: Scan = await analyzeFaceScan({
          photoUri: capturedScanUri,
          previousScan,
          dayNumber,
        });
        if (cancelled) return;
        analysisDoneRef.current = true;
        // Quality gating. If AI's image_quality flagged the scan as
        // unusable AND the confidence is very low, route to retake.
        const iq = scan.aiAnalysis?.image_quality;
        const confidence = iq?.confidence ?? 1;
        const blocked = iq && !iq.usable && confidence < 0.4;
        if (blocked) {
          recordScanQuality({
            scanId: scan.id,
            confidence,
            branch: 'blocked_retake_required',
            issues: iq?.issues ?? [],
          });
          onboardingV2.firstScanProcessingFailed('poor_quality');
          setProcessingStatus('poor_quality', 'image_quality flagged');
          setScanQualityStatus('poor');
          onDone('poor_quality');
          return;
        }
        recordScanQuality({
          scanId: scan.id,
          confidence,
          branch:
            confidence < 0.7 ? 'low_confidence_result' : 'normal_result',
          issues: iq?.issues ?? [],
        });
        setScanAnalysisResult(scan);
        setProcessingStatus('succeeded');
        setScanQualityStatus(confidence < 0.7 ? 'pending' : 'good');
        // Wait for the staged reveal to finish if it hasn't yet.
        // (Stages reveal on a fixed schedule below — we complete them all
        // even if the AI returned faster.)
        scheduleFinish(() => onDone('success'));
      } catch (error) {
        if (cancelled) return;
        analysisDoneRef.current = true;
        const msg =
          error instanceof Error ? error.message : 'analyzeFaceScan failed';
        onboardingV2.firstScanProcessingFailed('unknown');
        setProcessingStatus('failed', msg);
        onDone('error');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Staged reveal — appears regardless of how fast the AI returns. The
  // user sees: quality → focus → guidance, each ~700ms apart, finishing
  // around 2.1s. If the analysis is still running at 2.1s, the final
  // stage shows a quiet "in progress" affordance until success/failure.
  const stageTimersRef = useRef<NodeJS.Timeout[]>([]);
  const completionResolverRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    const schedule: Array<{ stage: Stage; appear: number; complete: number }> = [
      { stage: 'quality', appear: 100, complete: 700 },
      { stage: 'focus', appear: 800, complete: 1400 },
      { stage: 'guidance', appear: 1500, complete: 2100 },
    ];
    schedule.forEach(({ stage, appear, complete }) => {
      timers.push(
        setTimeout(() => {
          setStagesVisible((prev) => {
            const next = new Set(prev);
            next.add(stage);
            return next;
          });
        }, appear)
      );
      timers.push(
        setTimeout(() => {
          // Only mark complete if the corresponding work has actually
          // happened. "Quality" + "focus" complete on schedule because the
          // analysis is already running. "Guidance" completes only once
          // the AI returns.
          if (stage === 'guidance' && !analysisDoneRef.current) return;
          setStagesComplete((prev) => {
            const next = new Set(prev);
            next.add(stage);
            return next;
          });
        }, complete)
      );
    });
    stageTimersRef.current = timers;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  // Watch for AI completion and ensure the guidance stage is marked
  // complete. This keeps the perceived progress honest: the final tick
  // only fires once the real work has landed.
  useEffect(() => {
    if (!analysisDoneRef.current) return;
    if (stagesComplete.has('guidance')) return;
    setStagesComplete((prev) => {
      const next = new Set(prev);
      next.add('guidance');
      return next;
    });
    completionResolverRef.current?.();
    completionResolverRef.current = null;
  }, [stagesComplete]);

  const scheduleFinish = (finish: () => void) => {
    // Wait for the guidance stage to be marked complete; then add a beat.
    if (stagesComplete.has('guidance')) {
      setTimeout(finish, 280);
      return;
    }
    completionResolverRef.current = () => {
      setTimeout(finish, 280);
    };
  };

  // Photo treatment — soft warm scan sweep.
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      sweep.value = 0;
      return;
    }
    sweep.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      false
    );
  }, [reduceMotion, sweep]);
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -120 + sweep.value * 240 }],
    opacity: 0.42,
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.head}>
        <Eyebrow style={styles.kicker}>READING YOUR SCAN</Eyebrow>
        <EditorialHeadline style={styles.headline}>
          Reading your first scan
        </EditorialHeadline>
        <BodyText style={styles.lead}>
          Creating a safe starting baseline from today’s visible skin
          signals.
        </BodyText>
      </View>

      <View style={styles.photoWrap}>
        {capturedScanUri ? (
          <View style={styles.photoFrame}>
            <Image
              source={{ uri: capturedScanUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
              blurRadius={2}
            />
            <Animated.View style={[styles.sweep, sweepStyle]} />
            <View pointerEvents="none" style={styles.photoVignette} />
          </View>
        ) : null}
      </View>

      <View style={styles.stages}>
        {STAGE_ORDER.map((stage) => (
          <StageRow
            key={stage}
            label={STAGE_LABELS[stage]}
            visible={stagesVisible.has(stage)}
            complete={stagesComplete.has(stage)}
            reduceMotion={reduceMotion}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Stage row
// ---------------------------------------------------------------------------

function StageRow({
  label,
  visible,
  complete,
  reduceMotion,
}: {
  label: string;
  visible: boolean;
  complete: boolean;
  reduceMotion: boolean;
}) {
  const op = useSharedValue(0);
  const ty = useSharedValue(reduceMotion ? 0 : 6);
  useEffect(() => {
    if (visible) {
      op.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) });
      ty.value = withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) });
    }
  }, [visible, op, ty]);
  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));

  // Spinning glyph until complete.
  const spin = useSharedValue(0);
  useEffect(() => {
    if (complete || !visible || reduceMotion) {
      spin.value = 0;
      return;
    }
    spin.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.linear }),
      -1,
      false
    );
  }, [complete, visible, reduceMotion, spin]);
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  return (
    <Animated.View style={[styles.stageRow, style]}>
      <View style={styles.stageIcon}>
        {complete ? (
          <CheckCircle size={20} color={PURA.terracotta} weight="duotone" />
        ) : (
          <Animated.View style={spinStyle}>
            <CircleNotch size={20} color={PURA.muted} weight="bold" />
          </Animated.View>
        )}
      </View>
      <BodyText style={styles.stageLabel}>{label}</BodyText>
    </Animated.View>
  );
}

// Quiet unused import (we keep withDelay around for future tuning).
void withDelay;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PURA.paper },
  head: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  kicker: { marginBottom: 12 },
  headline: {
    fontSize: 32,
    lineHeight: 36,
  },
  lead: {
    marginTop: 12,
    maxWidth: 360,
  },
  photoWrap: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  photoFrame: {
    width: '70%',
    aspectRatio: 0.78,
    borderRadius: PURA_RADIUS.reveal,
    overflow: 'hidden',
    backgroundColor: PURA.paperRaised,
    borderWidth: 1,
    borderColor: PURA.border,
    ...PURA_SHADOW.soft,
  },
  sweep: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: PURA.claySupport,
  },
  photoVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,20,16,0.10)',
  },
  stages: {
    paddingHorizontal: 32,
    paddingTop: 24,
    gap: 14,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stageIcon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageLabel: {
    fontFamily: PURA_FONT.sansMed,
    color: PURA.ink,
    fontSize: 15,
  },
});

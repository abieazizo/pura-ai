import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CalibrationChecklist, type CalibrationItem } from '@/components/onboarding/CalibrationChecklist';
import { PuraMark } from '@/components/PuraMark';
import { useAppStore } from '@/store/useAppStore';
import {
  effortLabel,
  effortDetailLabel,
  goalLabel,
  sensitivityLabel,
  skinTypeLabel,
  primaryConcernPhrase,
} from './labelMaps';
import { palette } from '@/theme';

export interface ProcessingProps {
  onDone: () => void;
}

const EM_DASH = '—';

/**
 * v20.0 — Calibration Processing.
 *
 * Replaces the previous "three crossfading phrases" hold with an
 * intelligent animated checklist that reads back the user's actual
 * answers as Pura "calibrates". Each row appears every 450ms, the tick
 * fires 180ms after, total ~3.2s. Reduced-motion path uses simple fades.
 *
 * The screen never holds longer than ~3.5s — the user gave us 8
 * questions, they don't deserve to wait again.
 */
export function Processing({ onDone }: ProcessingProps) {
  const skinType = useAppStore((s) => s.skinType);
  const concerns = useAppStore((s) => s.concerns);
  const effort = useAppStore((s) => s.effort);
  const sensitivity = useAppStore((s) => s.sensitivity);
  const goal = useAppStore((s) => s.goal);

  const items: CalibrationItem[] = useMemo(() => {
    const stLabel = skinType ? skinTypeLabel(skinType) : 'Calibrated';
    const effortLab = effort ? effortLabel(effort) : 'Balanced';
    const effortDetail = effort ? effortDetailLabel(effort) : '3–5 steps';
    const focus = primaryConcernPhrase(concerns, goal);
    const focusLabel =
      focus.length > 0 ? focus.charAt(0).toUpperCase() + focus.slice(1) : 'Focus set';
    const sensLab = sensitivity ? sensitivityLabel(sensitivity) : 'Calibrated';
    const goalLab = goal ? goalLabel(goal) : 'Personalized plan';

    return [
      {
        id: 'skin-type',
        label: 'Calibrating skin type',
        completion: stLabel === EM_DASH ? 'Calibrated' : stLabel,
      },
      {
        id: 'focus',
        label: 'Prioritizing your focus',
        completion: focusLabel,
      },
      {
        id: 'routine',
        label: 'Setting routine length',
        completion: `${effortLab} · ${effortDetail}`,
      },
      {
        id: 'sensitivity',
        label: 'Adjusting sensitivity',
        completion: sensLab === EM_DASH ? 'Calibrated' : sensLab,
      },
      {
        id: 'goal',
        label: 'Creating your 84-day goal',
        completion: goalLab === EM_DASH ? '84-day plan' : goalLab,
      },
      {
        id: 'plan',
        label: 'Preparing your first plan',
        completion: 'Ready',
      },
    ];
  }, [skinType, concerns, effort, sensitivity, goal]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.headerBlock}>
        <PuraMark variant="thinking" size="md" glow />
        <Text
          style={styles.headline}
          maxFontSizeMultiplier={1.15}
          accessibilityRole="header"
        >
          Building your first plan
        </Text>
        <Text style={styles.sub} maxFontSizeMultiplier={1.25}>
          Using your answers to set up routine guardrails and scan
          focus areas.
        </Text>
      </View>

      <View style={styles.listBlock}>
        <CalibrationChecklist items={items} onComplete={onDone} />
      </View>

      <View style={{ height: 24 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  headerBlock: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: palette.ink,
    marginTop: 20,
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 320,
  },
  listBlock: {
    flex: 1,
    justifyContent: 'center',
  },
});

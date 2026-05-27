/**
 * RoutineSessionView — focused step-by-step execution.
 *
 * Hidden dock, top-left close, center "Step N of M" indicator. Each
 * step renders a product card with brand/name/from-your-shelf
 * status, an optional 30-second timer, and Mark complete / Skip.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'phosphor-react-native';
import {
  puraRoutineColors as C,
  puraRoutineRadius as R,
  puraRoutineSpace as SP,
  puraRoutineType as T,
} from '@/theme';
import type { RoutineStep, RoutineSessionRecord } from '@/types/routine';
import {
  Body,
  EditorialHeading,
  Eyebrow,
  PuraButton,
  PuraCard,
  QuietTextButton,
} from './primitives';
import { ProductThumb } from './ProductThumb';

interface RoutineSessionViewProps {
  steps: RoutineStep[];
  session: RoutineSessionRecord;
  onClose: () => void;
  onComplete: (stepId: string) => void;
  onSkip: (stepId: string) => void;
  onChangeProduct: (step: RoutineStep) => void;
  onFinish: () => void;
}

export function RoutineSessionView({
  steps,
  session,
  onClose,
  onComplete,
  onSkip,
  onChangeProduct,
  onFinish,
}: RoutineSessionViewProps) {
  const insets = useSafeAreaInsets();
  // Find the next un-completed step.
  const completedIds = new Set(session.completedStepIds);
  const skippedIds = new Set(session.skippedStepIds);
  const visibleIdx = steps.findIndex(
    (s) => !completedIds.has(s.id) && !skippedIds.has(s.id),
  );
  const activeStep =
    visibleIdx >= 0 ? steps[visibleIdx] : null;
  const stepIndex = visibleIdx >= 0 ? visibleIdx + 1 : steps.length;
  const total = steps.length;

  // Step 1 — Cleanse — gets an optional timer.
  const [timerStarted, setTimerStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    if (!timerStarted) return;
    if (secondsLeft <= 0) {
      setTimerStarted(false);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timerStarted, secondsLeft]);

  // When user advances past the last step, finish.
  useEffect(() => {
    if (visibleIdx === -1 && steps.length > 0) {
      onFinish();
    }
  }, [visibleIdx, steps.length, onFinish]);

  const handleComplete = useCallback(() => {
    if (activeStep) {
      onComplete(activeStep.id);
      setTimerStarted(false);
      setSecondsLeft(30);
    }
  }, [activeStep, onComplete]);

  const handleSkip = useCallback(() => {
    if (activeStep) {
      onSkip(activeStep.id);
      setTimerStarted(false);
      setSecondsLeft(30);
    }
  }, [activeStep, onSkip]);

  if (!activeStep) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <EditorialHeading size="page">Routine complete.</EditorialHeading>
        </View>
      </SafeAreaView>
    );
  }

  const showTimer = activeStep.type === 'cleanse';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close routine"
          onPress={onClose}
          hitSlop={10}
          style={styles.closeBtn}
        >
          <ArrowLeft size={20} color={C.ink} weight="bold" />
        </Pressable>
        <View style={styles.progressIndicator}>
          <Text style={[T.eyebrowMuted, { color: C.muted }]}>
            STEP {stepIndex} OF {total}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <View
        style={[
          styles.body,
          { paddingBottom: Math.max(insets.bottom, 18) + SP.lg },
        ]}
      >
        <View style={{ alignItems: 'flex-start' }}>
          <Eyebrow tone="coral">{activeStep.title.toUpperCase()}</Eyebrow>
          <EditorialHeading size="page" style={{ marginTop: 8 }}>
            {activeStep.title} {activeStep.type === 'cleanse' ? 'gently' : ''}
          </EditorialHeading>
          <Body size="large" style={{ marginTop: 12 }}>
            {activeStep.directions}
          </Body>
        </View>

        <PuraCard tone="surface" elevation="card" style={styles.productCard}>
          <ProductThumb
            product={activeStep.product}
            fallbackType={activeStep.type}
            size={72}
          />
          <View style={styles.productInfo}>
            {activeStep.product ? (
              <>
                <Text style={[T.meta, { color: C.muted, marginBottom: 2 }]}>
                  {activeStep.product.brand.toUpperCase()}
                </Text>
                <Text style={T.stepTitle} numberOfLines={2}>
                  {activeStep.product.name}
                </Text>
                <Text
                  style={[T.body, { marginTop: 6, color: C.sageDeep, fontFamily: 'Inter-SemiBold' }]}
                >
                  From your shelf
                </Text>
              </>
            ) : (
              <>
                <Text style={T.stepTitle}>No product selected</Text>
                <Text style={[T.body, { marginTop: 4 }]}>
                  Add or confirm a product before completing this step.
                </Text>
              </>
            )}
          </View>
        </PuraCard>

        <Pressable
          accessibilityRole="button"
          onPress={() => onChangeProduct(activeStep)}
          hitSlop={10}
          style={styles.changeBtn}
        >
          <Text style={[T.button, { color: C.coralDeep, fontSize: 14 }]}>
            Change product
          </Text>
        </Pressable>

        {showTimer ? (
          <PuraCard tone="blush" elevation="flat" style={styles.timerCard}>
            <View style={{ flex: 1 }}>
              <Eyebrow tone="coral">OPTIONAL</Eyebrow>
              <Text style={[T.stepTitle, { marginTop: 4 }]}>
                30-second cleanse
              </Text>
              <Text style={[T.body, { marginTop: 2 }]}>
                Massage gently while the timer runs.
              </Text>
            </View>
            <PuraButton
              label={
                timerStarted
                  ? `${secondsLeft}s`
                  : secondsLeft === 0
                  ? 'Reset'
                  : 'Start timer'
              }
              variant="ink"
              size="sm"
              onPress={() => {
                if (secondsLeft === 0) {
                  setSecondsLeft(30);
                  return;
                }
                setTimerStarted((s) => !s);
              }}
            />
          </PuraCard>
        ) : null}

        <View style={styles.actions}>
          <PuraButton
            label="Mark step complete"
            variant="coral"
            onPress={handleComplete}
          />
          <QuietTextButton
            label="Skip step"
            tone="muted"
            onPress={handleSkip}
            style={{ marginTop: 8, alignSelf: 'center' }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SP.gutter,
    paddingTop: SP.sm,
    paddingBottom: SP.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.line,
  },
  progressIndicator: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: C.surfaceSoft,
    borderRadius: 999,
  },
  body: {
    flex: 1,
    paddingHorizontal: SP.gutter,
    paddingTop: SP.lg,
    gap: SP.lg,
  },
  productCard: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
  },
  productInfo: {
    flex: 1,
  },
  changeBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SP.md,
    padding: SP.lg,
  },
  actions: {
    marginTop: 'auto',
  },
});

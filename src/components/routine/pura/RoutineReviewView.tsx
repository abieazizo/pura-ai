/**
 * RoutineReviewView — Your Custom Routine + product confirmation.
 *
 * Lets the user confirm or replace each step's product. Steps fall
 * into one of four availability states; the primary CTA changes
 * label based on how many required steps are still unresolved.
 */

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  puraRoutineColors as C,
  puraRoutineRadius as R,
  puraRoutineSpace as SP,
  puraRoutineType as T,
} from '@/theme';
import type {
  CustomRoutine,
  RoutineStep,
  RoutineTimeOfDay,
} from '@/types/routine';
import { Body, EditorialHeading, Eyebrow, ModeSegmented, PuraButton, PuraCard, QuietTextButton } from './primitives';
import { StepRow } from './StepRow';
import { ProductConfirmationSheet } from './ProductConfirmationSheet';
import {
  resolveStepAvailability,
  countUnconfirmedRequiredSteps,
} from '@/state/routine/routineStore';

interface RoutineReviewViewProps {
  routine: CustomRoutine;
  confirmedOwnedIds: Record<string, true>;
  skippedStepIds: Record<string, true>;
  selectedTimeOfDay: RoutineTimeOfDay;
  onChangeTimeOfDay: (next: RoutineTimeOfDay) => void;
  onConfirmOwn: (productId: string) => void;
  onSkip: (stepId: string) => void;
  onFindMatch: (step: RoutineStep) => void;
  onUseRoutine: () => void;
  onUseOwnedOnly: () => void;
}

const MODE_OPTIONS = [
  { key: 'morning' as const, label: 'Morning' },
  { key: 'evening' as const, label: 'Evening' },
];

export function RoutineReviewView({
  routine,
  confirmedOwnedIds,
  skippedStepIds,
  selectedTimeOfDay,
  onChangeTimeOfDay,
  onConfirmOwn,
  onSkip,
  onFindMatch,
  onUseRoutine,
  onUseOwnedOnly,
}: RoutineReviewViewProps) {
  const [sheetStep, setSheetStep] = useState<RoutineStep | null>(null);

  const steps =
    selectedTimeOfDay === 'morning' ? routine.morningSteps : routine.eveningSteps;

  const unresolvedCount = useMemo(
    () =>
      countUnconfirmedRequiredSteps({
        routine,
        confirmedOwnedIds,
        skippedStepIds,
      }),
    [routine, confirmedOwnedIds, skippedStepIds],
  );

  const primaryLabel =
    unresolvedCount > 0 ? 'Confirm my products' : 'Use this routine';

  return (
    <View style={styles.wrap}>
      <View style={styles.modeRow}>
        <ModeSegmented
          options={MODE_OPTIONS}
          value={selectedTimeOfDay}
          onChange={onChangeTimeOfDay}
        />
      </View>

      <PuraCard tone="surface" elevation="card" style={styles.list}>
        {steps.map((step, i) => {
          const availability = resolveStepAvailability(
            step,
            confirmedOwnedIds,
            skippedStepIds,
          );
          return (
            <View key={step.id}>
              <StepRow
                step={step}
                index={i}
                availability={availability}
                variant="review"
                onConfirm={() => setSheetStep(step)}
                onFindMatch={() => onFindMatch(step)}
              />
              {i < steps.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          );
        })}
        {steps.length === 0 ? (
          <View style={{ paddingVertical: 16 }}>
            <Body style={{ textAlign: 'center', color: C.muted }}>
              No steps for this time of day yet.
            </Body>
          </View>
        ) : null}
      </PuraCard>

      <PuraCard tone="soft" elevation="card" style={styles.why}>
        <Eyebrow tone="muted">WHY THIS ORDER</Eyebrow>
        <Text style={[T.body, { marginTop: 8, color: C.ink }]}>
          Designed around your visible focus areas.
        </Text>
        <Text style={[T.body, { color: C.body }]}>
          Keeps treatment targeted.
        </Text>
        <Text style={[T.body, { color: C.body }]}>
          Supports daily consistency.
        </Text>
      </PuraCard>

      {routine.excludedDirections && routine.excludedDirections.length > 0 ? (
        <PuraCard tone="amber" elevation="card" style={styles.why}>
          <Eyebrow tone="coral">PLAN ADJUSTED</Eyebrow>
          {routine.excludedDirections.map((d) => (
            <Text key={d} style={[T.body, { marginTop: 8, color: C.ink }]}>
              {d}
            </Text>
          ))}
        </PuraCard>
      ) : null}

      <View style={styles.cta}>
        <PuraButton
          label={primaryLabel}
          variant="coral"
          onPress={
            unresolvedCount > 0
              ? () => {
                  const first = steps.find(
                    (s) =>
                      resolveStepAvailability(
                        s,
                        confirmedOwnedIds,
                        skippedStepIds,
                      ) === 'recommended' ||
                      resolveStepAvailability(
                        s,
                        confirmedOwnedIds,
                        skippedStepIds,
                      ) === 'needs_confirmation' ||
                      resolveStepAvailability(
                        s,
                        confirmedOwnedIds,
                        skippedStepIds,
                      ) === 'missing',
                  );
                  if (first) setSheetStep(first);
                }
              : onUseRoutine
          }
        />
        <QuietTextButton
          label="Use only products I own"
          tone="muted"
          onPress={onUseOwnedOnly}
          style={{ marginTop: 8, alignSelf: 'center' }}
        />
      </View>

      <ProductConfirmationSheet
        visible={!!sheetStep}
        step={sheetStep}
        onClose={() => setSheetStep(null)}
        onConfirmOwn={() => {
          if (sheetStep?.product) {
            onConfirmOwn(sheetStep.product.id);
          }
          setSheetStep(null);
        }}
        onPickFromShelf={() => {
          if (sheetStep) onFindMatch(sheetStep);
          setSheetStep(null);
        }}
        onFindInShop={() => {
          if (sheetStep) onFindMatch(sheetStep);
          setSheetStep(null);
        }}
        onSkip={() => {
          if (sheetStep) onSkip(sheetStep.id);
          setSheetStep(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SP.gutter,
    paddingTop: 14,
    gap: SP.lg,
  },
  modeRow: {
    paddingHorizontal: 2,
  },
  list: {
    padding: SP.md,
  },
  divider: {
    height: 1,
    backgroundColor: C.line,
    marginVertical: 4,
  },
  why: {
    padding: SP.xl,
  },
  cta: {
    marginTop: 4,
  },
});

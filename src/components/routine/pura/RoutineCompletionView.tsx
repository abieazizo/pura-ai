/**
 * RoutineCompletionView — post-session completion card.
 *
 * Sits inside the daily My Routine screen header. Lists what was
 * completed, calls out any deliberately-excluded directions, and
 * offers View progress / Done.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check } from 'phosphor-react-native';
import {
  puraRoutineColors as C,
  puraRoutineRadius as R,
  puraRoutineSpace as SP,
  puraRoutineType as T,
} from '@/theme';
import type {
  CustomRoutine,
  RoutineSessionRecord,
  RoutineStep,
} from '@/types/routine';
import {
  Body,
  EditorialHeading,
  Eyebrow,
  PuraButton,
  PuraCard,
  QuietTextButton,
} from './primitives';

interface RoutineCompletionViewProps {
  routine: CustomRoutine;
  session: RoutineSessionRecord;
  onViewProgress: () => void;
  onDone: () => void;
}

export function RoutineCompletionView({
  routine,
  session,
  onViewProgress,
  onDone,
}: RoutineCompletionViewProps) {
  const allSteps =
    session.timeOfDay === 'morning' ? routine.morningSteps : routine.eveningSteps;
  const completed: RoutineStep[] = allSteps.filter((s) =>
    session.completedStepIds.includes(s.id),
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <EditorialHeading size="daily">My Routine</EditorialHeading>
      </View>

      <PuraCard tone="surface" elevation="hero" style={styles.card}>
        <View style={styles.seal}>
          <Check size={26} color={C.coralDeep} weight="bold" />
        </View>
        <EditorialHeading size="page" style={{ marginTop: SP.lg }}>
          Routine{'\n'}complete.
        </EditorialHeading>
        <Body size="large" style={{ marginTop: 10 }}>
          Your steps are saved. Future scans can help Pura track visible change.
        </Body>

        <View style={styles.list}>
          {completed.map((step) => (
            <View key={step.id} style={styles.row}>
              <View style={styles.dot} />
              <Text style={[T.stepTitle, { flex: 1 }]} numberOfLines={1}>
                {step.title}
              </Text>
              {step.product ? (
                <Text style={[T.meta, { color: C.body }]} numberOfLines={1}>
                  {step.product.brand} · {step.product.name}
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        {routine.excludedDirections && routine.excludedDirections.length > 0 ? (
          <View style={styles.excludedCard}>
            <Eyebrow tone="muted">SKIPPED AS PLANNED</Eyebrow>
            {routine.excludedDirections.map((d) => (
              <Text key={d} style={[T.body, { marginTop: 6, color: C.ink }]}>
                {d}
              </Text>
            ))}
          </View>
        ) : null}
      </PuraCard>

      <View style={styles.cta}>
        <PuraButton
          label="View progress"
          variant="coral"
          onPress={onViewProgress}
        />
        <QuietTextButton
          label="Done"
          tone="muted"
          onPress={onDone}
          style={{ marginTop: 10, alignSelf: 'center' }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SP.gutter,
    paddingTop: 14,
    gap: SP.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    padding: SP.xl,
  },
  seal: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.coralWash,
    borderWidth: 1,
    borderColor: C.coralWashStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    marginTop: SP.xxl,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.coral,
  },
  excludedCard: {
    marginTop: SP.lg,
    backgroundColor: C.amberWash,
    borderRadius: R.smallCard,
    padding: SP.lg,
  },
  cta: {
    marginTop: 4,
  },
});

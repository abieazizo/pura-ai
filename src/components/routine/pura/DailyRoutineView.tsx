/**
 * DailyRoutineView — the "My Routine" daily screen.
 *
 * Compact header (left-aligned title + right `Progress` action),
 * AM/PM segmented control, refined vertical step list with timeline
 * rail, a single Pura note, and a Start/Continue/Complete CTA.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChartLine } from 'phosphor-react-native';
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
  RoutineTimeOfDay,
} from '@/types/routine';
import {
  Body,
  EditorialHeading,
  Eyebrow,
  ModeSegmented,
  PuraButton,
  PuraCard,
  QuietTextButton,
} from './primitives';
import { StepRow } from './StepRow';
import { resolveStepAvailability } from '@/state/routine/routineStore';

interface DailyRoutineViewProps {
  routine: CustomRoutine;
  confirmedOwnedIds: Record<string, true>;
  skippedStepIds: Record<string, true>;
  selectedTimeOfDay: RoutineTimeOfDay;
  onChangeTimeOfDay: (next: RoutineTimeOfDay) => void;
  todaySession: RoutineSessionRecord | null;
  canStart: boolean;
  onStart: () => void;
  onContinue: () => void;
  onOpenProgress: () => void;
  onStepPress: (step: RoutineStep) => void;
}

const MODE_OPTIONS = [
  { key: 'morning' as const, label: 'Morning' },
  { key: 'evening' as const, label: 'Evening' },
];

export function DailyRoutineView({
  routine,
  confirmedOwnedIds,
  skippedStepIds,
  selectedTimeOfDay,
  onChangeTimeOfDay,
  todaySession,
  canStart,
  onStart,
  onContinue,
  onOpenProgress,
  onStepPress,
}: DailyRoutineViewProps) {
  const steps =
    selectedTimeOfDay === 'morning' ? routine.morningSteps : routine.eveningSteps;

  // Filter steps that aren't usable today (require a missing/unconfirmed product).
  const usableSteps = steps.filter((s) => {
    const av = resolveStepAvailability(s, confirmedOwnedIds, skippedStepIds);
    return av === 'owned' || av === 'not_required';
  });

  // Session status for the current time-of-day.
  const matchesSession =
    todaySession &&
    todaySession.timeOfDay === selectedTimeOfDay &&
    todaySession.status !== 'abandoned';

  const sessionCompleted = matchesSession && todaySession.status === 'complete';
  const sessionPartial =
    matchesSession &&
    todaySession.status === 'in_progress' &&
    todaySession.completedStepIds.length > 0;

  const completedIds = matchesSession ? todaySession.completedStepIds : [];

  const ctaLabel = sessionCompleted
    ? 'Routine complete'
    : sessionPartial
    ? 'Continue routine'
    : 'Start routine';
  const ctaVariant: 'coral' | 'soft' = sessionCompleted ? 'soft' : 'coral';
  const onCta = sessionPartial ? onContinue : onStart;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <EditorialHeading size="daily">My Routine</EditorialHeading>
            <View style={styles.sparkle} />
          </View>
          <Body style={{ marginTop: 4 }}>Built from your latest scan</Body>
        </View>
        <PuraCard tone="soft" elevation="flat" style={styles.progressPill}>
          <ChartLine size={14} color={C.coralDeep} weight="bold" />
          <Text style={[T.button, { color: C.coralDeep, fontSize: 13, lineHeight: 16 }]}>
            Progress
          </Text>
        </PuraCard>
      </View>

      <ModeSegmented
        options={MODE_OPTIONS}
        value={selectedTimeOfDay}
        onChange={onChangeTimeOfDay}
        style={{ marginTop: SP.lg }}
      />

      <PuraCard tone="surface" elevation="card" style={styles.list}>
        {usableSteps.length === 0 ? (
          <View style={{ paddingVertical: 14 }}>
            <Body style={{ textAlign: 'center', color: C.muted }}>
              No usable steps in this routine yet. Confirm a product to unlock
              it.
            </Body>
          </View>
        ) : (
          usableSteps.map((step, i) => {
            const availability = resolveStepAvailability(
              step,
              confirmedOwnedIds,
              skippedStepIds,
            );
            const completed = completedIds.includes(step.id);
            return (
              <StepRow
                key={step.id}
                step={{ ...step, order: i + 1 }}
                index={i}
                availability={availability}
                variant="daily"
                completed={completed}
                withTimeline
                isLast={i === usableSteps.length - 1}
                onPress={() => onStepPress(step)}
                onMarkComplete={() => onStepPress(step)}
              />
            );
          })
        )}
        {sessionCompleted && (
          <View style={styles.restNote}>
            <Eyebrow tone="muted">SESSION RECORDED</Eyebrow>
            <Body style={{ marginTop: 4 }}>
              Your steps are saved. Future scans help Pura track visible change.
            </Body>
          </View>
        )}
      </PuraCard>

      <View style={styles.noteRow}>
        <View style={styles.noteIcon}>
          <View style={styles.noteIconInner} />
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow tone="coral">PURA NOTE</Eyebrow>
          <Text style={[T.body, { marginTop: 4, color: C.ink, fontFamily: 'Inter-Medium' }]}>
            Consistency matters more than adding more steps.
          </Text>
        </View>
      </View>

      <View style={styles.cta}>
        <PuraButton
          label={ctaLabel}
          variant={ctaVariant}
          disabled={!canStart || !!sessionCompleted}
          onPress={onCta}
        />
        <QuietTextButton
          label="View progress"
          tone="muted"
          onPress={onOpenProgress}
          style={{ marginTop: 8, alignSelf: 'center' }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SP.gutter,
    paddingTop: 12,
    gap: SP.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SP.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sparkle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.coral,
    transform: [{ rotate: '45deg' }],
  },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.coralWashStrong,
    backgroundColor: C.coralWash,
  },
  list: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  restNote: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 6,
    backgroundColor: C.successWash,
    borderRadius: 14,
  },
  note: {
    padding: SP.lg,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: SP.lg,
    paddingVertical: SP.md,
    backgroundColor: C.amberWash,
    borderRadius: R.smallCard,
    borderWidth: 1,
    borderColor: C.line,
  },
  noteIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteIconInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    opacity: 0.7,
  },
  cta: {
    marginTop: 4,
  },
});

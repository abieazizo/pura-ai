/**
 * StepList — the OVERVIEW hero (ACT 1): the routine as ONE short, doable path.
 *
 * Renders the whole plan at once as two stacked groups — MORNING then EVENING —
 * each under a slim SectionLabel (with a muted group time-line) followed by an
 * ordered sequence of OverviewStepRow cards (one per StepVM). The eye takes in
 * the full sequence at a glance: this is a typeset plan, never a checklist
 * dashboard. The active group (activeTimeOfDay) reads in full Ink; the other
 * reads as quietly upcoming (gently receded — never disabled or dead-grey).
 *
 * The set-down is ONE continuous cascade: staggerBase offsets the first unit
 * (the header is index 0) and the index strictly increments across AM label →
 * AM rows → PM label → PM rows, so arrival feels like a single descent rather
 * than several independent fades.
 *
 * "How long" is said ONCE. The OverviewScreen header already states today's
 * total time ("About 2 minutes."), and that header IS the active group — so the
 * ACTIVE group's SectionLabel drops its time-line (it would duplicate the header
 * verbatim, which the plan forbids). The UPCOMING group keeps its time-line,
 * where it's genuinely new ("the other half of your day is short too").
 *
 * Edge cases handled here: an empty group renders nothing (no label, no
 * placeholder); if BOTH groups are empty StepList renders null (the scaffold
 * owns the rest/empty messaging). Colours from overviewTone, type from flowType,
 * motion only from flow/motion.ts.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { cardSeconds, phraseMinutes, type StepListProps } from '../contracts';
import type { RoutineCardVM } from '../../model';
import { useSetDown } from '../motion';
import { OverviewStepRow } from './OverviewStepRow';
import { SectionLabel } from './SectionLabel';

/** A group's eyebrow label by time of day. */
const GROUP_LABEL: Record<RoutineCardVM['timeOfDay'], string> = {
  morning: 'MORNING',
  evening: 'EVENING',
};

export function StepList({
  am,
  pm,
  activeTimeOfDay,
  reduceMotion,
  staggerBase = 1,
}: StepListProps) {
  // Both groups empty → render nothing; the scaffold covers messaging.
  if (am.steps.length === 0 && pm.steps.length === 0) return null;

  // One running stagger index so the cascade is continuous top→bottom.
  let stagger = staggerBase;
  const groups: React.ReactNode[] = [];

  // Always AM-then-PM visually; only the EMPHASIS flips with activeTimeOfDay.
  for (const group of [am, pm] as const) {
    if (group.steps.length === 0) continue; // empty group → nothing
    const active = group.timeOfDay === activeTimeOfDay;
    const labelIndex = stagger++;

    const rows = group.steps.map((step, i) => (
      <OverviewStepRow
        key={step.id}
        step={step}
        position={i + 1}
        staggerIndex={stagger++}
        reduceMotion={reduceMotion}
      />
    ));

    groups.push(
      <View
        key={group.timeOfDay}
        style={[styles.group, !active && styles.groupUpcoming]}
      >
        <StaggeredLabel
          label={GROUP_LABEL[group.timeOfDay]}
          // The header already owns today's total time; suppress it on the
          // ACTIVE group so "how long" is never said twice. Upcoming keeps it.
          timeLine={active ? undefined : phraseMinutes(cardSeconds(group))}
          staggerIndex={labelIndex}
          reduceMotion={reduceMotion}
        />
        <View style={styles.rows}>{rows}</View>
      </View>,
    );
  }

  return <View style={styles.list}>{groups}</View>;
}

/** A SectionLabel that arrives on the shared set-down cascade. Its own component
 *  so the set-down hook stays stable across the (fixed, ordered) group list. */
function StaggeredLabel({
  label,
  timeLine,
  staggerIndex,
  reduceMotion,
}: {
  label: string;
  /** Optional — the active group suppresses it (the header owns today's time). */
  timeLine?: string;
  staggerIndex: number;
  reduceMotion: boolean;
}) {
  const setDown = useSetDown(staggerIndex, reduceMotion);
  return (
    <Animated.View style={[styles.label, setDown]}>
      <SectionLabel label={label} timeLine={timeLine} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: {
    // Generous gutters — calm light surface, not busy.
    gap: 28,
  },
  group: {
    // The bleeding packshot in each row overhangs the card; never clip it.
    overflow: 'visible',
  },
  // The non-"now" group is quietly upcoming — receded, never dead.
  groupUpcoming: {
    opacity: 0.78,
  },
  label: {
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  rows: {
    gap: 14,
  },
});

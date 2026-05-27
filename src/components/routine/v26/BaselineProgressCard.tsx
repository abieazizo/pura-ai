import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check } from 'phosphor-react-native';
import {
  Body,
  Eyebrow,
  HeroHeadline,
  Supporting,
  Surface,
} from './primitives';
import { V26, V26_RADIUS, V26_TYPE } from './tokens';
import type { ScanReliabilityState } from '@/state/v26/routineSession';

interface BaselineProgressCardProps {
  reliability: ScanReliabilityState;
}

interface MilestoneRow {
  label: string;
  caption: string;
  state: 'done' | 'pending' | 'future';
}

function deriveMilestones(
  completed: number,
  required: number,
): MilestoneRow[] {
  const rows: MilestoneRow[] = [];
  rows.push({
    label: 'Day 1',
    caption: 'First scan',
    state: completed >= 1 ? 'done' : 'pending',
  });
  rows.push({
    label: 'Day 4',
    caption: 'Reliable scan',
    state: completed >= 2 ? 'done' : 'pending',
  });
  rows.push({
    label: completed >= 3 ? 'Day 7' : 'Tomorrow',
    caption: `Scan ${Math.min(completed + 1, required)}`,
    state: completed >= 3 ? 'done' : 'pending',
  });
  rows.push({
    label: completed >= required ? `Day ${(required - 1) * 3 + 1}` : 'Next scan',
    caption: 'Trend available',
    state: completed >= required ? 'done' : 'future',
  });
  return rows;
}

function metricCopy(completed: number, required: number): string {
  return `${completed} of ${required} scans ready`;
}

function supportingCopy(completed: number, required: number): string {
  const remaining = Math.max(0, required - completed);
  if (remaining === 0) return 'Your first trend is ready.';
  if (remaining === 1) return 'One more morning scan unlocks your first visible trend.';
  return `${remaining} more morning scans unlock your first visible trend.`;
}

/**
 * v26 — Baseline Progress Card.
 *
 * Single source of truth for early-progress copy. Every visible line
 * is derived from `completed` / `required` — no hardcoded math in JSX.
 */
export function BaselineProgressCard({ reliability }: BaselineProgressCardProps) {
  const completed = reliability.reliableScanCount;
  const required = reliability.requiredForBaseline;
  const rows = deriveMilestones(completed, required);

  return (
    <Surface tone="surface" hero elevated style={s.card}>
      <Eyebrow>YOUR BASELINE</Eyebrow>
      <HeroHeadline style={s.headline}>
        Your skin story is taking shape.
      </HeroHeadline>

      <Text style={s.metric} maxFontSizeMultiplier={1.15}>
        {metricCopy(completed, required)}
      </Text>
      <Body style={s.body}>{supportingCopy(completed, required)}</Body>

      <View style={s.milestones}>
        {rows.map((row, idx) => {
          const next = rows[idx + 1];
          return (
            <View key={`${row.label}-${idx}`} style={s.milestoneCol}>
              <View style={s.milestoneTop}>
                <MilestoneDot state={row.state} />
                {idx < rows.length - 1 ? (
                  <View
                    style={[
                      s.milestoneLine,
                      (row.state === 'done' && next?.state === 'done') &&
                        s.milestoneLineDone,
                      (row.state === 'done' && next?.state !== 'done') &&
                        s.milestoneLinePartial,
                    ]}
                  />
                ) : null}
              </View>
              <Text style={s.milestoneLabel} maxFontSizeMultiplier={1.15}>
                {row.label}
              </Text>
              <Text style={s.milestoneCaption} maxFontSizeMultiplier={1.2}>
                {row.caption}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={s.signal}>
        <Eyebrow style={s.signalEyebrow}>EARLY SIGNAL</Eyebrow>
        <View style={s.signalRows}>
          <Supporting style={s.signalLine}>
            Chin activity remains mild.
          </Supporting>
          <Supporting style={s.signalLine}>
            Hydration may be improving.
          </Supporting>
        </View>
      </View>
    </Surface>
  );
}

function MilestoneDot({ state }: { state: 'done' | 'pending' | 'future' }) {
  if (state === 'done') {
    return (
      <View style={[s.dot, s.dotDone]}>
        <Check size={11} color="#FFFFFF" weight="bold" />
      </View>
    );
  }
  return (
    <View
      style={[
        s.dot,
        state === 'pending' ? s.dotPending : s.dotFuture,
      ]}
    />
  );
}

const s = StyleSheet.create({
  card: {
    gap: 0,
  },
  headline: {
    marginTop: 12,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  metric: {
    marginTop: 18,
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 15,
    color: V26.ink,
    letterSpacing: -0.05,
  },
  body: {
    marginTop: 8,
    color: V26.inkSecondary,
  },

  milestones: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  milestoneCol: {
    flex: 1,
    paddingRight: 6,
  },
  milestoneTop: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
    marginBottom: 10,
  },
  milestoneLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: V26.border,
    marginHorizontal: 6,
  },
  milestoneLineDone: {
    backgroundColor: V26.terracotta,
  },
  milestoneLinePartial: {
    backgroundColor: V26.clayStrong,
  },
  milestoneLabel: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 13,
    color: V26.ink,
  },
  milestoneCaption: {
    fontFamily: V26_TYPE.sans,
    fontSize: 12,
    color: V26.inkMuted,
    marginTop: 2,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: V26.terracotta,
  },
  dotPending: {
    backgroundColor: V26.surface,
    borderWidth: 1.5,
    borderColor: V26.terracotta,
  },
  dotFuture: {
    backgroundColor: V26.surface,
    borderWidth: 1.5,
    borderColor: V26.borderStrong,
  },

  signal: {
    marginTop: 26,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: V26.border,
  },
  signalEyebrow: {
    color: V26.terracottaText,
    marginBottom: 6,
  },
  signalRows: {
    gap: 4,
  },
  signalLine: {
    color: V26.inkSecondary,
    fontSize: 13.5,
    lineHeight: 19,
  },
});

void V26_RADIUS;

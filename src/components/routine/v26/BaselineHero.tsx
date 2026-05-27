import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import {
  Body,
  Eyebrow,
  HeroHeadline,
  Meta,
  Supporting,
  Surface,
} from './primitives';
import {
  V26,
  V26_RADIUS,
  V26_TYPE,
} from './tokens';
import type { ScanLogEntry, ScanReliabilityState } from '@/state/v26/routineSession';

interface BaselineHeroProps {
  reliability: ScanReliabilityState;
}

/**
 * v26 — Building Baseline hero.
 *
 * Replaces the premature score gauge entirely. Shows a calm progress
 * line and a scan timeline so the user understands what they are
 * building toward without being told a number that isn’t yet earned.
 */
export function BaselineHero({ reliability }: BaselineHeroProps) {
  const { reliableScanCount, requiredForBaseline, scanLog } = reliability;
  const widthPct =
    Math.min(100, (reliableScanCount / Math.max(1, requiredForBaseline)) * 100);

  return (
    <Surface tone="surface" hero elevated style={s.hero}>
      <Eyebrow>PROGRESS</Eyebrow>
      <HeroHeadline style={s.headline}>Building your baseline</HeroHeadline>
      <Body style={s.body}>
        {reliableScanCount} of {requiredForBaseline} reliable scans complete
      </Body>

      <View style={s.track}>
        <View style={[s.fill, { width: `${widthPct}%` }]} />
      </View>

      <Supporting style={s.supporting}>
        {requiredForBaseline - reliableScanCount > 0
          ? `${requiredForBaseline - reliableScanCount} more consistent scan${
              requiredForBaseline - reliableScanCount === 1 ? '' : 's'
            } will unlock visible trend tracking.`
          : 'You’ve reached the reliable scan threshold.'}
      </Supporting>

      <View style={s.timeline}>
        {scanLog.map((entry, idx) => (
          <ScanLogRow key={`${entry.label}-${idx}`} entry={entry} last={idx === scanLog.length - 1} />
        ))}
      </View>
    </Surface>
  );
}

function ScanLogRow({
  entry,
  last,
}: {
  entry: ScanLogEntry;
  last: boolean;
}) {
  const mark =
    entry.state === 'done' ? '✓' : entry.state === 'pending' ? '○' : '○';
  const markStyle =
    entry.state === 'done'
      ? s.markDone
      : entry.state === 'pending'
      ? s.markPending
      : s.markFuture;

  return (
    <View style={[s.row, !last && s.rowDivider]}>
      <View style={s.rowLeft}>
        <Text style={s.rowLabel} maxFontSizeMultiplier={1.2}>
          {entry.label}
        </Text>
        <Text style={s.rowCaption} maxFontSizeMultiplier={1.2}>
          {entry.caption}
        </Text>
      </View>
      <Text style={[s.mark, markStyle]} maxFontSizeMultiplier={1.0}>
        {mark}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    gap: 0,
  },
  headline: {
    marginTop: 12,
  },
  body: {
    marginTop: 14,
    color: V26.inkSecondary,
  },
  track: {
    marginTop: 16,
    height: 4,
    borderRadius: 2,
    backgroundColor: V26.trackNeutral,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: V26.terracotta,
  },
  supporting: {
    marginTop: 10,
  },
  timeline: {
    marginTop: 22,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: V26.border,
  },
  row: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: V26.border,
  },
  rowLeft: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 14,
    color: V26.ink,
  },
  rowCaption: {
    fontFamily: V26_TYPE.sans,
    fontSize: 12.5,
    color: V26.inkMuted,
    marginTop: 2,
  },
  mark: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 14,
    width: 22,
    textAlign: 'center',
  },
  markDone: {
    color: V26.terracotta,
  },
  markPending: {
    color: V26.terracottaText,
  },
  markFuture: {
    color: V26.inkFaint,
  },
});

export const _BaselineHeroRadius = V26_RADIUS; // silence unused

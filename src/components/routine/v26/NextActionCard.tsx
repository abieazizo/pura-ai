import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Body,
  Eyebrow,
  PrimaryAction,
  SectionHeading,
  SecondaryAction,
  Surface,
} from './primitives';
import { V26_SPACE } from './tokens';

interface NextActionCardProps {
  state: 'scanned-today' | 'scan-due-now';
  /** Optional below-the-fold secondary link, e.g. "Review tonight’s routine". */
  reviewRoutineLabel?: string;
  onReviewRoutine?: () => void;
  onSetReminder?: () => void;
  onStartScan?: () => void;
  onViewScanGuide?: () => void;
}

/**
 * v26 — NextActionCard.
 *
 * Single canonical place where the next-scan CTA lives. The CTA copy
 * is bound to actual reliability state — never "Start scan" while the
 * body says the next scan is tomorrow.
 */
export function NextActionCard({
  state,
  reviewRoutineLabel,
  onReviewRoutine,
  onSetReminder,
  onStartScan,
  onViewScanGuide,
}: NextActionCardProps) {
  if (state === 'scan-due-now') {
    return (
      <Surface tone="surface" style={s.card}>
        <Eyebrow>NEXT BEST ACTION</Eyebrow>
        <SectionHeading style={s.headline}>
          Complete today’s scan
        </SectionHeading>
        <Body style={s.body}>
          Use the same lighting and angle as your baseline.
        </Body>
        <PrimaryAction
          label="Start scan"
          variant="ink"
          onPress={onStartScan ?? (() => {})}
          style={s.cta}
        />
        {onViewScanGuide ? (
          <SecondaryAction
            label="View scan guide"
            tone="muted"
            onPress={onViewScanGuide}
            style={s.secondary}
          />
        ) : null}
      </Surface>
    );
  }

  return (
    <Surface tone="surface" style={s.card}>
      <Eyebrow>NEXT SCAN</Eyebrow>
      <SectionHeading style={s.headline}>Tomorrow morning</SectionHeading>
      <Body style={s.body}>
        Similar lighting gives you a more trustworthy comparison.
      </Body>
      <PrimaryAction
        label="Set reminder"
        variant="ink"
        onPress={onSetReminder ?? (() => {})}
        style={s.cta}
      />
      <View style={s.secondaryRow}>
        {onViewScanGuide ? (
          <SecondaryAction
            label="View scan guide"
            tone="muted"
            onPress={onViewScanGuide}
          />
        ) : null}
        {onReviewRoutine ? (
          <SecondaryAction
            label={reviewRoutineLabel ?? 'Review tonight’s routine'}
            tone="muted"
            onPress={onReviewRoutine}
          />
        ) : null}
      </View>
    </Surface>
  );
}

const s = StyleSheet.create({
  card: {
    gap: 0,
  },
  headline: {
    marginTop: 12,
    fontSize: 22,
    lineHeight: 26,
  },
  body: {
    marginTop: 10,
  },
  cta: {
    marginTop: V26_SPACE.section,
  },
  secondaryRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  secondary: {
    marginTop: 10,
  },
});

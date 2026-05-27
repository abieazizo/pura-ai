import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { SectionHeading, Supporting, Surface } from './primitives';
import { V26, V26_TYPE } from './tokens';
import type { SignalStatus, SkinSignal } from '@/state/v26/routineSession';

interface SignalSummaryProps {
  signals: SkinSignal[];
}

/**
 * v26 — Compressed signal summary.
 *
 * Replaces the four equal-length report rows. Lead signal is the
 * needs-attention one; secondary and measuring follow with quiet
 * hierarchy. Status is communicated through eyebrow + copy, never
 * through bright color or shape alone.
 */
export function SignalSummary({ signals }: SignalSummaryProps) {
  const primary = signals.find((s) => s.status === 'needsAttention');
  const secondary = signals.find((s) => s.status === 'improving');
  const measuring = signals.filter((s) => s.status === 'measuring');
  const stable = signals.filter((s) => s.status === 'stable');

  return (
    <Surface tone="surface" style={s.card}>
      <SectionHeading style={s.heading}>What we know today</SectionHeading>

      {primary ? <Row signal={primary} prominent /> : null}
      {secondary ? <Row signal={secondary} /> : null}
      {stable.map((sig) => (
        <Row key={sig.id} signal={sig} />
      ))}
      {measuring.length > 0 ? (
        <Row
          signal={{
            ...measuring[0],
            id: 'measuring-bundle',
            name: measuring.map((sig) => sig.name).join(' · '),
          }}
        />
      ) : null}
    </Surface>
  );
}

function Row({ signal, prominent }: { signal: SkinSignal; prominent?: boolean }) {
  return (
    <View style={[rowStyles.row, prominent && rowStyles.rowProminent]}>
      <Text style={[rowStyles.eyebrow, eyebrowColorFor(signal.status)]} maxFontSizeMultiplier={1.15}>
        {eyebrowLabel(signal.status)}
      </Text>
      <Text style={rowStyles.title} maxFontSizeMultiplier={1.2}>
        {signal.region ? `${signal.name} · ${signal.region}` : signal.name}
      </Text>
      <Supporting style={rowStyles.body}>{signal.summary}</Supporting>
    </View>
  );
}

function eyebrowLabel(status: SignalStatus): string {
  switch (status) {
    case 'needsAttention':
      return 'NEEDS ATTENTION';
    case 'improving':
      return 'IMPROVING';
    case 'stable':
      return 'STABLE';
    case 'measuring':
    default:
      return 'STILL MEASURING';
  }
}

function eyebrowColorFor(status: SignalStatus) {
  if (status === 'needsAttention') return { color: V26.terracottaText };
  if (status === 'improving') return { color: V26.terracottaText };
  return { color: V26.inkMuted };
}

const s = StyleSheet.create({
  card: {
    paddingVertical: 16,
  },
  heading: {
    marginBottom: 6,
  },
});

const rowStyles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: V26.border,
  },
  rowProminent: {
    paddingBottom: 18,
  },
  eyebrow: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 16,
    color: V26.ink,
  },
  body: {
    marginTop: 4,
  },
});

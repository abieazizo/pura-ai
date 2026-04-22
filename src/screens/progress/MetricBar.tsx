import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { ProgressBar } from '@/components/ProgressBar';
import { palette, space, type as typography } from '@/theme';

export interface MetricBarProps {
  label: string;
  percent: number;
  direction: 'improved' | 'worsened' | 'stable';
  delay?: number;
}

export function MetricBar({ label, percent, direction, delay = 0 }: MetricBarProps) {
  const good = direction === 'improved';
  const bad = direction === 'worsened';
  const color = good ? palette.moss : bad ? palette.amber : palette.inkTertiary;
  const arrow = good ? '↑' : bad ? '↓' : '→';

  return (
    <View style={styles.row}>
      <View style={styles.top}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.delta}>
          <Text style={[styles.deltaArrow, { color }]}>{arrow}</Text>
          <AnimatedNumber
            value={percent}
            suffix="%"
            style={{ ...styles.deltaNumber, color } as any}
          />
        </View>
      </View>
      <ProgressBar
        value={percent}
        max={40}
        height={4}
        color={color}
        trackColor={palette.hairline}
        animationDelay={delay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: space.lg },
  top: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  label: { ...typography.body, color: palette.ink },
  delta: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  deltaArrow: { ...typography.captionMed, fontWeight: '700' },
  deltaNumber: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 28,
    fontStyle: 'italic',
    lineHeight: 28,
  },
});

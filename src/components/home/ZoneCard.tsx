import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';
import type { ZoneStatus } from '@/types';

export interface ZoneCardProps {
  label: string;
  score: number | null; // null = empty (no data yet)
  status: ZoneStatus | null;
  history: number[]; // zone scores over time, oldest → newest
  tint: 'chinSand' | 'tZoneClay' | 'cheeksMoss';
  onPress?: () => void;
}

/**
 * Zone card (§4.5). Tinted flat rectangle, no shadow, no tap chrome. Kicker
 * + serif score + status word + hairline sparkline along the bottom. Tap
 * triggers a selection haptic and a nav callback (which may be a no-op if
 * the detail screen isn't built yet).
 */
export function ZoneCard({
  label,
  score,
  status,
  history,
  tint,
  onPress,
}: ZoneCardProps) {
  const isEmpty = score === null || status === null;
  const handlePress = () => {
    hapt.select();
    onPress?.();
  };
  const statusColor =
    status === 'active'
      ? palette.clay
      : status === 'monitor'
      ? palette.amber
      : status === 'calm'
      ? palette.moss
      : palette.inkTertiary;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={
        isEmpty
          ? `${label}, no data yet`
          : `${label}, score ${score}, ${status}`
      }
      style={({ pressed }) => [
        styles.card,
        tints[tint],
        isEmpty && styles.empty,
        pressed && { opacity: 0.92 },
      ]}
    >
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        {label.toUpperCase()}
      </Text>

      <Text style={styles.score} maxFontSizeMultiplier={1.1}>
        {isEmpty ? '\u2014' : score}
      </Text>

      {status ? (
        <Text style={[styles.status, { color: statusColor }]}>
          {status === 'active'
            ? 'Active'
            : status === 'monitor'
            ? 'Monitor'
            : 'Calm'}
        </Text>
      ) : (
        <Text style={[styles.status, { color: palette.inkTertiary }]}>&nbsp;</Text>
      )}

      <Sparkline values={history} />
    </Pressable>
  );
}

/**
 * Hairline sparkline. No axes, no labels, no dots — just a single stroked
 * polyline. Renders at fixed 24pt height; stretches to card width via
 * preserveAspectRatio="none" so a short history still traces edge-to-edge.
 */
function Sparkline({ values }: { values: number[] }) {
  const VB_W = 100;
  const VB_H = 24;

  if (values.length < 2) {
    // Single hairline as a neutral resting state.
    return (
      <View style={styles.sparkWrap}>
        <Svg
          width="100%"
          height={VB_H}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
        >
          <Polyline
            points={`0,${VB_H - 2} ${VB_W},${VB_H - 2}`}
            stroke={palette.clay}
            strokeOpacity={0.2}
            strokeWidth={1}
            fill="none"
          />
        </Svg>
      </View>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * VB_W;
      const y = VB_H - 2 - ((v - min) / range) * (VB_H - 4);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <View style={styles.sparkWrap}>
      <Svg
        width="100%"
        height={VB_H}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
      >
        <Polyline
          points={points}
          stroke={palette.clay}
          strokeOpacity={0.4}
          strokeWidth={1}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 1,
    padding: 16,
    borderRadius: 20,
    justifyContent: 'space-between',
  },
  empty: {
    borderWidth: 1,
    borderColor: 'rgba(198,93,72,0.25)',
    borderStyle: 'dashed',
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.4,
    color: 'rgba(26,22,20,0.7)', // 70% ink per spec
  },
  score: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 40,
    lineHeight: 40,
    color: palette.clay,
    fontVariant: ['tabular-nums'],
    marginTop: 8,
  },
  status: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  sparkWrap: {
    marginTop: 12,
    height: 24,
    width: '100%',
    alignSelf: 'stretch',
  },
});

const tints = StyleSheet.create({
  chinSand: { backgroundColor: palette.sandPaper },
  tZoneClay: { backgroundColor: palette.clayPaper },
  cheeksMoss: { backgroundColor: palette.mossLight },
});

import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { PillBadge, type PillTone } from './PillBadge';
import { zoneStatusLabel, zoneTrendLabel } from '@/copy/strings';
import { colors, radius, space, type as typography } from '@/theme';
import type { SkinZone } from '@/types';

export interface ZoneCardProps {
  zone: SkinZone;
  style?: StyleProp<ViewStyle>;
}

const statusToTone: Record<SkinZone['status'], PillTone> = {
  active: 'active',
  monitor: 'monitor',
  calm: 'calm',
};

const trendColors = {
  improving: colors.success,
  stable: colors.textTertiary,
  worsening: colors.warning,
};

const trendArrow = {
  improving: '\u2191',
  stable: '\u2192',
  worsening: '\u2193',
};

export function ZoneCard({ zone, style }: ZoneCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.zoneLabel}>{zone.label.toUpperCase()}</Text>
        <PillBadge label={zoneStatusLabel[zone.status]} tone={statusToTone[zone.status]} />
      </View>
      <Text style={styles.insight}>{zone.shortInsight}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.score}>Score {zone.score}/100</Text>
        <Text style={[styles.trend, { color: trendColors[zone.trend] }]}>
          {trendArrow[zone.trend]}  {zoneTrendLabel[zone.trend]}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: space.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  zoneLabel: {
    ...typography.micro,
    color: colors.textPrimary,
  },
  insight: {
    ...typography.body,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
  score: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  trend: {
    ...typography.captionMed,
    fontWeight: '700',
  },
});

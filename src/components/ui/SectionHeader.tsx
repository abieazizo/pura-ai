/**
 * SectionHeader — eyebrow + title + optional trailing action (Cycle 2).
 * `serif` renders the title in Instrument Serif for editorial sections.
 */
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ds, dsSpace, dsType } from '@/theme';
import { PressableScale } from './PressableScale';

export interface SectionHeaderProps {
  title: string;
  eyebrow?: string;
  serif?: boolean;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
  title,
  eyebrow,
  serif,
  action,
  style,
}: SectionHeaderProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.left}>
        {eyebrow ? (
          <Text style={[dsType.label, styles.eyebrow]}>{eyebrow}</Text>
        ) : null}
        <Text style={[serif ? dsType.title : dsType.headline, { color: ds.textPrimary }]}>
          {title}
        </Text>
      </View>
      {action ? (
        <PressableScale
          haptic="select"
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={styles.action}
        >
          <Text style={[dsType.bodySmMed, { color: ds.accentText }]}>
            {action.label}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  left: { flex: 1, paddingRight: dsSpace.base },
  eyebrow: { color: ds.textTertiary, marginBottom: dsSpace.xs },
  action: { paddingVertical: dsSpace.xs, paddingLeft: dsSpace.sm },
});

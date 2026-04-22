import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, space, type as typography } from '@/theme';

export type PillTone =
  | 'active'
  | 'monitor'
  | 'calm'
  | 'neutral'
  | 'accent'
  | 'dark'
  | 'success';

export interface PillBadgeProps {
  label: string;
  tone?: PillTone;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

/**
 * v5: square-ish status tags. Radius 4, tight padding, micro type. Used for
 * zone statuses (ACTIVE / CALM / MONITOR) on scan results and for labels like
 * `DAY 19` on screens. Semantic tones map to warm-toned palette colors.
 */
const toneMap: Record<PillTone, { bg: string; fg: string }> = {
  active: { bg: colors.clayLight, fg: colors.clayDeep },
  monitor: { bg: colors.amberLight, fg: colors.warningDark },
  calm: { bg: colors.mossLight, fg: colors.successDark },
  neutral: { bg: colors.bgDeep, fg: colors.inkSecondary },
  accent: { bg: colors.clay, fg: colors.inkInverse },
  dark: { bg: colors.ink, fg: colors.inkInverse },
  success: { bg: colors.moss, fg: colors.inkInverse },
};

export function PillBadge({
  label,
  tone = 'neutral',
  icon,
  size = 'md',
  style,
}: PillBadgeProps) {
  const t = toneMap[tone];
  const sizing = size === 'sm' ? styles.sm : styles.md;
  return (
    <View
      style={[styles.base, sizing, { backgroundColor: t.bg }, style]}
      accessibilityRole="text"
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, { color: t.fg }]} maxFontSizeMultiplier={1.1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.sq, // 4 — square, not pill
  },
  sm: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: space.sm + 2,
    paddingVertical: 4,
  },
  icon: { marginRight: 4 },
  label: {
    ...typography.micro,
  },
});

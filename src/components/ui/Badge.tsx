/**
 * Badge — a count bubble or status dot (Cycle 2). Used on the bag, nav,
 * notification affordances. Counts cap at "99+".
 */
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { blue, success, warning, danger, neutral } from '@/theme';

type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE: Record<Tone, string> = {
  accent: blue[500],
  success: success[500],
  warning: warning[500],
  danger: danger[500],
  neutral: neutral[400],
};

export interface BadgeProps {
  /** Numeric count. Omit (or use `dot`) for a status dot. */
  count?: number;
  dot?: boolean;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ count, dot, tone = 'accent', style }: BadgeProps) {
  const color = TONE[tone];

  if (dot || count == null) {
    return <View style={[styles.dot, { backgroundColor: color }, style]} />;
  }

  if (count <= 0) return null;
  const text = count > 99 ? '99+' : String(count);

  return (
    <View
      accessibilityLabel={`${text} new`}
      style={[styles.badge, { backgroundColor: color }, style]}
    >
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Inter-Bold',
    fontSize: 10.5,
    lineHeight: 13,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

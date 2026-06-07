/**
 * Pill — tonal tag / chip (Cycle 2). One component for status tags, concern
 * chips, filter pills. Tone sets the color family; variant sets soft (tint
 * fill) / solid (filled) / outline. Optional leading icon + selectable.
 */
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ds, blue, neutral, success, warning, danger, dsRadius, dsSpace, dsType } from '@/theme';
import { PressableScale } from './PressableScale';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'ink';
type PillVariant = 'soft' | 'solid' | 'outline';
type PillSize = 'sm' | 'md';

const TONE: Record<Tone, { soft: string; text: string; solid: string; onSolid: string; border: string }> = {
  neutral: { soft: neutral[100], text: neutral[600], solid: neutral[800], onSolid: '#FFFFFF', border: neutral[200] },
  accent: { soft: blue[50], text: blue[900], solid: blue[500], onSolid: '#FFFFFF', border: blue[200] },
  success: { soft: success.tint, text: success.text, solid: success[500], onSolid: '#FFFFFF', border: success[300] },
  warning: { soft: warning.tint, text: warning.text, solid: warning[500], onSolid: '#FFFFFF', border: warning[300] },
  danger: { soft: danger.tint, text: danger.text, solid: danger[500], onSolid: '#FFFFFF', border: danger[300] },
  ink: { soft: neutral[100], text: neutral[900], solid: ds.ink, onSolid: '#FFFFFF', border: neutral[200] },
};

export interface PillProps {
  label: string;
  tone?: Tone;
  variant?: PillVariant;
  size?: PillSize;
  icon?: React.ReactNode;
  onPress?: () => void;
  /** Selected → forces the solid look (for filter rows). */
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Pill({
  label,
  tone = 'neutral',
  variant = 'soft',
  size = 'md',
  icon,
  onPress,
  selected,
  style,
}: PillProps) {
  const t = TONE[tone];
  const effective: PillVariant = selected ? 'solid' : variant;

  const bg =
    effective === 'solid' ? t.solid : effective === 'soft' ? t.soft : 'transparent';
  const fg = effective === 'solid' ? t.onSolid : t.text;
  const border = effective === 'outline' ? t.border : 'transparent';

  const padV = size === 'sm' ? 5 : 7;
  const padH = size === 'sm' ? dsSpace.md : dsSpace.base;
  const font = size === 'sm' ? 12 : 13;

  const body = (
    <View style={styles.row}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text
        numberOfLines={1}
        style={[dsType.bodySmMed, { color: fg, fontSize: font }]}
      >
        {label}
      </Text>
    </View>
  );

  const pillStyle: ViewStyle = {
    backgroundColor: bg,
    borderColor: border,
    borderWidth: effective === 'outline' ? 1 : 0,
    borderRadius: dsRadius.pill,
    paddingVertical: padV,
    paddingHorizontal: padH,
    alignSelf: 'flex-start',
  };

  if (onPress) {
    return (
      <PressableScale
        scaleTo={0.94}
        haptic="select"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: !!selected }}
        style={[pillStyle, style]}
      >
        {body}
      </PressableScale>
    );
  }

  return <View style={[pillStyle, style]}>{body}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 5 },
});

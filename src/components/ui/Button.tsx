/**
 * Button — the canonical button hierarchy (Cycle 2).
 *
 *   primary   ink fill, white label        — the one decisive action
 *   accent    Pura Blue fill               — the intelligent / brand action
 *   secondary surface + border             — a real but lesser choice
 *   ghost     transparent, accent label    — tertiary / inline
 *   danger    red fill                     — destructive
 *
 * Press-scale + haptic come from PressableScale. Min hit target 44pt. Loading
 * swaps the label for a spinner without resizing.
 */
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ds, blue, danger, dsRadius, dsSpace, dsType } from '@/theme';
import { PressableScale } from './PressableScale';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const SIZE: Record<Size, { height: number; padH: number; font: number }> = {
  sm: { height: 40, padH: dsSpace.base, font: 14 },
  md: { height: 52, padH: dsSpace.xl, font: 16 },
  lg: { height: 58, padH: 26, font: 17 },
};

interface VariantStyle {
  bg: string;
  label: string;
  border?: string;
  spinner: string;
}

const VARIANT: Record<Variant, VariantStyle> = {
  primary: { bg: ds.ink, label: ds.onInk, spinner: ds.onInk },
  accent: { bg: blue[500], label: '#FFFFFF', spinner: '#FFFFFF' },
  secondary: { bg: ds.surface, label: ds.textPrimary, border: ds.borderStrong, spinner: ds.textPrimary },
  ghost: { bg: 'transparent', label: blue[700], spinner: blue[700] },
  danger: { bg: danger[500], label: '#FFFFFF', spinner: '#FFFFFF' },
};

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  disabled,
  icon,
  iconRight,
  style,
  accessibilityHint,
}: ButtonProps) {
  const v = VARIANT[variant];
  const s = SIZE[size];
  const isOff = disabled || loading;
  const isFilled = variant === 'primary' || variant === 'accent' || variant === 'danger';

  return (
    <PressableScale
      scaleTo={0.96}
      haptic={isOff ? null : 'tap'}
      disabled={isOff}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isOff, busy: !!loading }}
      style={[
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.padH,
          backgroundColor: v.bg,
          borderRadius: dsRadius.md,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          opacity: disabled ? 0.4 : 1,
        },
        // Filled buttons get a soft matching lift; ghost/secondary stay flat.
        isFilled && variant === 'accent' && styles.accentLift,
        isFilled && variant === 'primary' && styles.inkLift,
        fullWidth && styles.full,
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={v.spinner} size="small" />
        ) : (
          <>
            {icon ? <View style={styles.icon}>{icon}</View> : null}
            <Text
              numberOfLines={1}
              style={[dsType.button, { color: v.label, fontSize: s.font }]}
            >
              {label}
            </Text>
            {iconRight ? <View style={styles.iconRight}>{iconRight}</View> : null}
          </>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  icon: { marginRight: dsSpace.sm },
  iconRight: { marginLeft: dsSpace.sm },
  accentLift: {
    shadowColor: blue[500],
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  inkLift: {
    shadowColor: '#05070B',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});

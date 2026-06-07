/**
 * Card — the canonical elevated surface (Cycle 2).
 *
 * Defaults to elevation `e2` (the new resting level) so a card genuinely
 * floats over porcelain instead of the near-invisible 0.04 shadow the app
 * shipped with. Pass `onPress` to make it a pressable card (press-scale +
 * haptic via PressableScale). Tints, radius, padding, and border are all
 * token-driven.
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { ds, dsElevation, dsRadius, dsSpace, type ElevationLevel } from '@/theme';
import { PressableScale } from './PressableScale';

type CardTint = 'surface' | 'sunken' | 'blue' | 'clear';

const TINT_BG: Record<CardTint, string> = {
  surface: ds.surface,
  sunken: ds.surfaceSunken,
  blue: ds.accentSoft,
  clear: 'transparent',
};

export interface CardProps {
  children: React.ReactNode;
  /** Elevation level. Default 'e2' — a real resting lift. */
  level?: ElevationLevel;
  tint?: CardTint;
  radius?: number;
  /** Inner padding. Default 20 (dsSpace.lg). Pass 0 for edge-to-edge media. */
  padding?: number;
  bordered?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Card({
  children,
  level = 'e2',
  tint = 'surface',
  radius = dsRadius.xl,
  padding = dsSpace.lg,
  bordered = true,
  onPress,
  style,
  accessibilityLabel,
}: CardProps) {
  const surfaceStyle: ViewStyle = {
    backgroundColor: TINT_BG[tint],
    borderRadius: radius,
    padding,
    borderWidth: bordered ? 1 : 0,
    borderColor: tint === 'blue' ? ds.accentSoft : ds.hairline,
    ...dsElevation[level],
  };

  if (onPress) {
    return (
      <PressableScale
        scaleTo={0.985}
        haptic="tap"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[surfaceStyle, style]}
      >
        {children}
      </PressableScale>
    );
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[surfaceStyle, style]}
    >
      {children}
    </View>
  );
}

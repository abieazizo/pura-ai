import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LayeredShadowDef } from '@/theme';

export interface LayeredShadowProps {
  /** Two-layer shadow definition. See `shadow.card` / `shadow.fab` in tokens. */
  preset: LayeredShadowDef;
  borderRadius?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
}

/**
 * Stacks two shadow Views around the children. iOS allows one shadow per
 * View, so premium elevation needs nesting. The outer View owns the deeper
 * "ambient" shadow; the inner View owns the tighter contact shadow.
 *
 * `borderRadius` propagates to both wrappers so the shadow shape matches the
 * child's corners.
 */
export function LayeredShadow({
  preset,
  borderRadius,
  children,
  style,
  innerStyle,
}: LayeredShadowProps) {
  const round = borderRadius !== undefined ? { borderRadius } : null;
  return (
    <View style={[styles.outer, round, preset.outer, style]}>
      <View style={[styles.inner, round, preset.inner, innerStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: 'transparent',
  },
  inner: {
    backgroundColor: 'transparent',
  },
});

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { palette } from '@/theme';

export interface DeviceFrameProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  /** Where to render the 28pt dynamic island cutout. Defaults to top-center. */
  showIsland?: boolean;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_W = 280;
const DEFAULT_H = 580;
const INNER_RADIUS = 36;
const OUTER_RADIUS = 44;

/**
 * Phone-in-phone shell used by the tutorial (§3.4). Warm charcoal bezel,
 * paper bg, dynamic island cutout. The inner area clips children to a 36pt
 * rounded rect and gives them a 260×540 content viewport at 1.0 scale.
 */
export function DeviceFrame({
  children,
  width = DEFAULT_W,
  height = DEFAULT_H,
  showIsland = true,
  style,
}: DeviceFrameProps) {
  return (
    <View
      style={[
        styles.outer,
        {
          width,
          height,
          borderRadius: OUTER_RADIUS,
          shadowColor: palette.ink,
          shadowOpacity: 0.18,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 14 },
        },
        style,
      ]}
    >
      <View style={[styles.inner, { borderRadius: INNER_RADIUS }]}>{children}</View>
      {showIsland ? (
        <View style={styles.island} pointerEvents="none" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: palette.bg,
    borderWidth: 2,
    borderColor: 'rgba(26,22,20,0.8)', // warm charcoal @ 80%
    padding: 6,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    // Android shadow fallback
    elevation: 14,
  },
  inner: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: palette.bg,
  },
  island: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    width: 100,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.ink,
  },
});

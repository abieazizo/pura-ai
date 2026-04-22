import React from 'react';
import { StyleSheet, View } from 'react-native';
import { palette } from '@/theme';

export interface RoutineNodeProps {
  size?: number;
  state?: 'done' | 'active' | 'upcoming';
  withLine?: boolean;
  lineLength?: number;
}

/**
 * Small routine-step node used in the morning routine timeline. A filled
 * circle when done, a clay-outlined circle when active, a dotted stroke
 * when upcoming. Can emit a hairline under itself via `withLine`.
 */
export function RoutineNode({
  size = 14,
  state = 'upcoming',
  withLine = false,
  lineLength = 20,
}: RoutineNodeProps) {
  const base: any = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <View style={styles.wrap}>
      {state === 'done' ? (
        <View style={[base, { backgroundColor: palette.clay }]} />
      ) : state === 'active' ? (
        <View
          style={[
            base,
            {
              borderWidth: 2,
              borderColor: palette.clay,
              backgroundColor: palette.bg,
            },
          ]}
        />
      ) : (
        <View
          style={[
            base,
            {
              borderWidth: 1,
              borderColor: palette.inkTertiary,
              borderStyle: 'dashed',
              backgroundColor: palette.bg,
            },
          ]}
        />
      )}
      {withLine ? (
        <View
          style={{
            width: 1,
            height: lineLength,
            backgroundColor: palette.hairline,
            marginTop: 2,
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
});

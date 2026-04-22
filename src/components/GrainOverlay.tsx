import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, {
  Defs,
  Filter,
  FeTurbulence,
  FeColorMatrix,
  Rect,
} from 'react-native-svg';
import { palette } from '@/theme';

export interface GrainOverlayProps {
  width?: number | string;
  height?: number | string;
  opacity?: number;
  seed?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Fractal-noise grain laid over warm surfaces. 3% opacity by default — just
 * enough texture to make the off-white feel like paper instead of a screen.
 *
 * Rendered once per mount (memoized). Non-interactive overlay, absolutely
 * positioned fill by default.
 */
export function GrainOverlay({
  width = '100%',
  height = '100%',
  opacity = 0.03,
  seed = 5,
  style,
}: GrainOverlayProps) {
  const filterId = useMemo(() => `grain-${seed}-${Math.round(opacity * 1000)}`, [seed, opacity]);
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, style]}
    >
      <Svg
        width={width as any}
        height={height as any}
        style={StyleSheet.absoluteFillObject}
      >
        <Defs>
          <Filter id={filterId}>
            <FeTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves={2}
              seed={seed}
            />
            <FeColorMatrix
              values="0 0 0 0 0.1, 0 0 0 0 0.09, 0 0 0 0 0.08, 0 0 0 1 0"
            />
          </Filter>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={palette.ink}
          opacity={opacity}
          filter={`url(#${filterId})`}
        />
      </Svg>
    </View>
  );
}

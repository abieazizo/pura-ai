import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '@/theme';
import type { ZoneGlow } from '@/types';

export interface ZoneGlowOverlayProps {
  glows: ZoneGlow[];
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Renders warm coral radial glows over zones detected in a scan. Absolutely
 * positioned inside a photo frame. **Never** draws polygons or lines on the
 * face — rule §9 / past-build failure.
 */
export function ZoneGlowOverlay({ glows, width, height, style }: ZoneGlowOverlayProps) {
  if (glows.length === 0) return null;
  const minDim = Math.min(width, height);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={width} height={height}>
        <Defs>
          {glows.map((g, i) => (
            <RadialGradient
              key={`grad-${i}`}
              id={`grad-${i}`}
              cx={g.x * width}
              cy={g.y * height}
              rx={g.radius * minDim}
              ry={g.radius * minDim}
              fx={g.x * width}
              fy={g.y * height}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor={colors.accent} stopOpacity={Math.min(0.55, g.intensity)} />
              <Stop offset="60%" stopColor={colors.accent} stopOpacity={Math.min(0.22, g.intensity * 0.4)} />
              <Stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {glows.map((_, i) => (
          <Rect
            key={`rect-${i}`}
            x={0}
            y={0}
            width={width}
            height={height}
            fill={`url(#grad-${i})`}
          />
        ))}
      </Svg>
    </View>
  );
}

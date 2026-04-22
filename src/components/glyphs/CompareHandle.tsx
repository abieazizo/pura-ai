import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { palette } from '@/theme';

export interface CompareHandleProps {
  size?: number;
}

/**
 * Bespoke drag handle for the CompareSlider. A hairline circle with a clay
 * center pip and two serif-style chevrons on either side.
 */
export function CompareHandle({ size = 44 }: CompareHandleProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44">
      <Circle cx={22} cy={22} r={20} fill={palette.bg} />
      <Circle cx={22} cy={22} r={20} stroke={palette.clay} strokeWidth={1.2} fill="none" />
      <Circle cx={22} cy={22} r={3} fill={palette.clay} />
      <Path
        d="M14 18 L10 22 L14 26"
        stroke={palette.clay}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M30 18 L34 22 L30 26"
        stroke={palette.clay}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={22} y1={4} x2={22} y2={12} stroke={palette.clay} strokeWidth={1} />
      <Line x1={22} y1={32} x2={22} y2={40} stroke={palette.clay} strokeWidth={1} />
    </Svg>
  );
}

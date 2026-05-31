/**
 * HandsetSignature — round-2 Pass 10. A real SVG handwritten signature
 * for the editor (Nora). Bezier-drawn so it reads handset, not as a
 * typeface fragment. Two strokes: a long N + a period dot.
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { puraShop } from '@/theme';

export interface HandsetSignatureProps {
  /** Approximate visual width in px. */
  width?: number;
  /** Optional override; defaults to puraShop.coralDeep. */
  color?: string;
}

export function HandsetSignature({
  width = 60,
  color = puraShop.coralDeep,
}: HandsetSignatureProps) {
  // Aspect ratio fixed at ~3:1; redraw if changed.
  const h = Math.round(width / 3);
  return (
    <View style={{ width, height: h }} pointerEvents="none">
      <Svg width={width} height={h} viewBox="0 0 60 20">
        {/* The leading em-dash, hand-drawn slightly slanted */}
        <Path
          d="M2 10 Q 6 9, 10 10"
          stroke={color}
          strokeWidth={1.4}
          fill="none"
          strokeLinecap="round"
        />
        {/* The "N" — three strokes with a flourish on the right-upstroke */}
        <Path
          d="M18 16 C 18 14, 18 10, 19 6 C 19.5 4, 20.5 3.5, 21 5 C 22 7, 24 11, 26 14 C 27 16, 28 16.5, 29 16 C 29.8 14, 30.5 10, 31 6 C 31.4 3.4, 33 3.5, 33.5 6"
          stroke={color}
          strokeWidth={1.4}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Period — small ink dot */}
        <Circle cx={38} cy={16} r={1.2} fill={color} />
      </Svg>
    </View>
  );
}

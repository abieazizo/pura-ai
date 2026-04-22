import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { palette } from '@/theme';

export interface BottleSilhouetteProps {
  tint?: string;
  opacity?: number;
  size?: number;
}

/**
 * Universal bottle glyph (§2.9). Single path, single fill, no stroke —
 * shows up everywhere we need a product silhouette (catalog cards, detail
 * hero fallbacks). Aspect ratio ~1 : 1.4.
 */
export function BottleSilhouette({
  tint = palette.ink,
  opacity = 0.15,
  size = 60,
}: BottleSilhouetteProps) {
  return (
    <Svg width={size} height={size * 1.4} viewBox="0 0 60 84">
      <Path
        d="M 22 4 L 38 4 L 38 14 L 42 18 L 42 78 Q 42 82 38 82 L 22 82 Q 18 82 18 78 L 18 18 L 22 14 Z"
        fill={tint}
        opacity={opacity}
      />
    </Svg>
  );
}

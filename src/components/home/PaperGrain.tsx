/**
 * PaperGrain — barely-visible warm grain texture overlay.
 *
 * Sits behind home content so the paper background reads as physical
 * material rather than a flat color. Implemented as an SVG feTurbulence
 * filter at extremely low opacity. The grain is monochrome warm (the
 * terracotta-text token mixed with paper), so it doesn't introduce a
 * cool cast.
 *
 * Performance: a single SVG fills the screen and is composited
 * statically. No animation, no per-frame cost.
 *
 * Reads only from `pura26` tokens.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  Filter,
  FeTurbulence,
  FeColorMatrix,
  Rect,
} from 'react-native-svg';
import { pura26 } from '@/screens/home/homeTokens';

export function PaperGrain() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFillObject}
        opacity={0.06}
      >
        <Defs>
          <Filter id="paperGrainFilter">
            <FeTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves={2}
              seed={3}
            />
            {/* Recolor the noise into warm ink. The matrix multiplies
                each channel of the gray noise by a warm tint. */}
            <FeColorMatrix
              type="matrix"
              values="0 0 0 0 0.4
                      0 0 0 0 0.25
                      0 0 0 0 0.18
                      0 0 0 0.7 0"
            />
          </Filter>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={pura26.paper}
          filter="url(#paperGrainFilter)"
        />
      </Svg>
    </View>
  );
}

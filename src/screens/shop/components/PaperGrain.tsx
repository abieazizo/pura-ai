/**
 * PaperGrain — pass 10. A subtle warm-dot noise pattern, rendered as
 * an SVG pattern. Layered over the hero stage gradient to give the
 * wash a photographed-on-paper quality, not a flat gradient.
 *
 * Density and color are tuned to read at full-bleed mobile scale —
 * dots are tiny and warm-rust-brown so they read as paper fiber
 * rather than a digital noise filter.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Rect, Circle } from 'react-native-svg';

export interface PaperGrainProps {
  /** Override opacity for the whole layer. Defaults to 0.10. */
  opacity?: number;
}

export function PaperGrain({ opacity = 0.10 }: PaperGrainProps) {
  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="paperGrain"
            patternUnits="userSpaceOnUse"
            width="9"
            height="9"
          >
            {/* Three offset tiny dots within the 9×9 tile — enough
                density to read as grain at full bleed, sparse enough
                to never feel noisy. */}
            <Circle cx="1.5" cy="2.2" r="0.55" fill="#5C3826" />
            <Circle cx="5.8" cy="4.6" r="0.45" fill="#7A4A33" />
            <Circle cx="3.4" cy="7.1" r="0.5" fill="#5C3826" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#paperGrain)" />
      </Svg>
    </View>
  );
}

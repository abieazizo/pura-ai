/**
 * AmbientLight — the overview's pure backdrop (ACT 1).
 *
 * A soft cool-blue radial bloom at the TOP of the page over the Porcelain base,
 * plus a whisper of grain so the light field doesn't read as a flat fill. It is
 * a backdrop ONLY: an absolute fill behind all content, `pointerEvents="none"`,
 * zero layout cost, decorative to assistive tech. ZERO warm peach — the overview
 * is always cool/calm; warmth lives only in the orb's gold in Act 2.
 *
 * Renders with `react-native-svg` (the codebase idiom — see `Atmosphere.tsx`):
 * a `RadialGradient` washes the bloom on every platform, and the grain is SVG
 * fractal-noise on web (a near-invisible black dither) / a flat whisper veil on
 * native. Colors are NAMED tokens from `@/theme/routineFlow` (no hex here).
 */

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  FeColorMatrix,
  FeTurbulence,
  Filter,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { overviewTone } from '@/theme/routineFlow';

/** The whisper grain's overall strength (the Svg-level opacity owns it). */
const GRAIN_OPACITY = 0.03;

export function AmbientLight() {
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Base porcelain — the always-light overview canvas. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: overviewTone.bg }]} />

      {/* Cool-blue top radial bloom — centered at the top, faded out by ~60%. */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="overviewBloom" cx="50%" cy="0%" r="75%">
            <Stop offset="0" stopColor={overviewTone.topRadial} stopOpacity={1} />
            <Stop offset="1" stopColor={overviewTone.topRadial} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#overviewBloom)" />
      </Svg>

      {/* Whisper grain. */}
      {Platform.OS === 'web' ? (
        <Svg
          width="100%"
          height="100%"
          style={StyleSheet.absoluteFill}
          opacity={GRAIN_OPACITY}
          pointerEvents="none"
        >
          <Defs>
            <Filter id="overviewGrain">
              <FeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} />
              {/* Recolor the noise to near-black ink (alpha row = 1). */}
              <FeColorMatrix
                type="matrix"
                values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              />
            </Filter>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" filter="url(#overviewGrain)" />
        </Svg>
      ) : (
        // Native: the noise tile lives in the period Atmosphere; here the grain
        // is a barely-there flat veil so the porcelain isn't a dead-flat fill.
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: overviewTone.ink, opacity: GRAIN_OPACITY * 0.4 },
          ]}
        />
      )}
    </View>
  );
}

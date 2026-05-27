/**
 * AmbientLight — soft top-down warm wash behind the mirror portal.
 *
 * Sits between PaperGrain and the portal, and suggests the room the
 * user is standing in — a faint warm light coming from above (a
 * bathroom sconce, a bedside lamp) that makes the portal feel
 * inhabited rather than placed against an empty backdrop. The wash
 * is a single SVG radial gradient with very low opacity.
 *
 * Reads only from `pura26` tokens.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { pura26 } from '@/screens/home/homeTokens';

export function AmbientLight() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
        <Defs>
          <RadialGradient
            id="ambientLight"
            cx="0.5"
            cy="-0.05"
            rx="0.8"
            ry="0.55"
          >
            <Stop offset="0" stopColor={pura26.terracottaSoft} stopOpacity={0.55} />
            <Stop offset="0.5" stopColor={pura26.terracottaSoft} stopOpacity={0.18} />
            <Stop offset="1" stopColor={pura26.terracottaSoft} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#ambientLight)"
        />
      </Svg>
    </View>
  );
}

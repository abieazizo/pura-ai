// @ts-nocheck
/* eslint-disable */
/**
 * FilmGrainSkia — a ~4% film-grain wash over the whole screen (orphan; see
 * ./README.md). A Skia Turbulence (Perlin) shader, overlay-blended, is what
 * stops a near-black editorial surface from banding and gives it a quiet
 * photographic tooth. Static by default (grain that swims is distracting); pass
 * `animate` for a faint per-frame shimmer.
 *
 * WHY SKIA: a real procedural noise shader is GPU-cheap and resolution-correct;
 * a tiled PNG grain would band on OLED black and bloat the bundle.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Fill, Turbulence } from '@shopify/react-native-skia';

export interface FilmGrainSkiaProps {
  /** 0..1 grain strength. Default 0.04 (the brief's ~4%). */
  opacity?: number;
  /** Noise frequency; higher = finer grain. Default 0.9. */
  freq?: number;
  seed?: number;
}

export function FilmGrainSkia({ opacity = 0.04, freq = 0.9, seed = 7 }: FilmGrainSkiaProps) {
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill blendMode="overlay" opacity={opacity}>
        <Turbulence freqX={freq} freqY={freq} octaves={3} seed={seed} />
      </Fill>
    </Canvas>
  );
}

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { dx } from '../decisionTokens';

interface Props {
  /** Which region to highlight. Mapped to a normalized point on the
   *  face contour: chin ≈ bottom center, forehead ≈ top center, etc. */
  region?: 'chin' | 'forehead' | 'cheeks' | 'tZone' | 'nose' | 'jawline';
}

/**
 * Quiet abstract face contour with a single highlighted region. Used
 * in the evidence sheet to ground the "more reactive than yesterday"
 * observation in anatomy without ever rendering an actual scan image
 * (which we don't have, and shouldn't fake).
 *
 * The contour is a stroked path on a soft warm tile; the region mark
 * is a small terracotta circle with a faint halo. No clinical heat
 * maps, no red overlays.
 */
export function FaceRegionPreview({ region = 'chin' }: Props) {
  // Coordinates normalized to a 60×72 viewBox.
  const mark =
    region === 'forehead'
      ? { cx: 30, cy: 18 }
      : region === 'cheeks'
        ? { cx: 18, cy: 38 }
        : region === 'tZone'
          ? { cx: 30, cy: 30 }
          : region === 'nose'
            ? { cx: 30, cy: 35 }
            : region === 'jawline'
              ? { cx: 44, cy: 52 }
              : /* chin */ { cx: 30, cy: 56 };

  return (
    <View style={styles.tile}>
      <Svg width={60} height={72} viewBox="0 0 60 72">
        {/* Face oval — a quiet anatomy hint, not a clinical drawing. */}
        <Path
          d="M30 6 C42 6 50 18 50 34 C50 50 42 62 30 64 C18 62 10 50 10 34 C10 18 18 6 30 6 Z"
          stroke={dx.borderStrong}
          strokeWidth={0.75}
          fill="none"
        />
        {/* Halo behind the region — warm clay, restrained. */}
        <Circle
          cx={mark.cx}
          cy={mark.cy}
          r={8}
          fill={dx.terracottaSoft}
          opacity={0.7}
        />
        {/* Region pin */}
        <Circle
          cx={mark.cx}
          cy={mark.cy}
          r={3.5}
          fill={dx.terracotta}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: dx.surfaceSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dx.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

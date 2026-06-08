/**
 * ScanFrameGlyph — the four rounded corner-brackets of a camera scan frame.
 *
 * One shared mark for "scan" across the app so the brand reads consistently:
 * the elevated Scan tab control and the "Take a 30-second scan" CTA both render
 * THIS component (passing color/size), instead of a phosphor glyph that reads
 * like a little face. 24×24 viewBox; stroke scales with `size`.
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';

export interface ScanFrameGlyphProps {
  size?: number;
  color?: string;
  /** Stroke width in the 24×24 viewBox (default 2). */
  strokeWidth?: number;
}

export function ScanFrameGlyph({
  size = 24,
  color = '#FFFFFF',
  strokeWidth = 2,
}: ScanFrameGlyphProps) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* top-left */}
      <Path d="M8 4 H6 A2 2 0 0 0 4 6 V8" {...common} />
      {/* top-right */}
      <Path d="M16 4 H18 A2 2 0 0 1 20 6 V8" {...common} />
      {/* bottom-right */}
      <Path d="M20 16 V18 A2 2 0 0 1 18 20 H16" {...common} />
      {/* bottom-left */}
      <Path d="M4 16 V18 A2 2 0 0 0 6 20 H8" {...common} />
    </Svg>
  );
}

import React from 'react';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { palette } from '@/theme';
import type { ZoneStatus } from '@/types';

export interface ZoneGlowDropletProps {
  size?: number;
  status?: ZoneStatus;
}

/**
 * Small glow-droplet mark used next to zone names in editorial scan results.
 * Coded by status — active reads clay, monitor amber, calm moss.
 */
export function ZoneGlowDroplet({
  size = 18,
  status = 'calm',
}: ZoneGlowDropletProps) {
  const color =
    status === 'active' ? palette.clay : status === 'monitor' ? palette.amber : palette.moss;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <RadialGradient id="zone-glow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={color} stopOpacity={0.7} />
          <Stop offset="0.6" stopColor={color} stopOpacity={0.2} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="12" cy="12" r="10" fill="url(#zone-glow)" />
      <Circle cx="12" cy="12" r="4" fill={color} opacity={0.85} />
    </Svg>
  );
}

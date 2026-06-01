/**
 * Pillar identity — the single source of truth for how each routine
 * pillar looks and reads in the UI: its label, one-line description,
 * accent colour, tint, and icon. Canonical pillar *types* live in
 * `@/types/routine`; this module owns only the visual identity so the
 * picker, the ceremony, and the routine page never drift on copy or
 * colour. Hex literals stay in tokens.ts — we only reference them here.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Drop, Leaf, ShieldCheck, Target } from 'phosphor-react-native';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import type { PillarKey } from '@/types/routine';
import { puraReveal, puraRevealRadius } from '@/theme/tokens';

export interface PillarIdentity {
  key: PillarKey;
  label: string;
  description: string;
  /** Icon + accent text colour. */
  accent: string;
  /** 12%-tint fill behind the icon. */
  tint: string;
  Icon: React.ComponentType<PhosphorIconProps>;
}

export const PILLAR_IDENTITY: Record<PillarKey, PillarIdentity> = {
  cleanse: {
    key: 'cleanse',
    label: 'Cleanse',
    description: 'Lift the day off without stripping your barrier.',
    accent: puraReveal.blue,
    tint: puraReveal.blue12,
    Icon: Drop,
  },
  treat: {
    key: 'treat',
    label: 'Treat',
    description: 'Targeted care for texture and concerns.',
    accent: puraReveal.blue,
    tint: puraReveal.blue12,
    Icon: Target,
  },
  moisturize: {
    key: 'moisturize',
    label: 'Moisturize',
    description: 'Lock in hydration so your skin can rest.',
    accent: puraReveal.oil,
    tint: puraReveal.oilSoft,
    Icon: Leaf,
  },
  protect: {
    key: 'protect',
    label: 'Protect',
    description: 'Daily defense against sun damage.',
    accent: puraReveal.amberPillar,
    tint: puraReveal.amberPillarSoft,
    Icon: ShieldCheck,
  },
};

/**
 * Icon-in-tinted-circle used everywhere a pillar is represented. `dim`
 * fades the whole disc for the picker's toggled-off state.
 */
export function PillarIcon({
  pillar,
  size = 44,
  iconSize,
  dim = false,
}: {
  pillar: PillarKey;
  size?: number;
  iconSize?: number;
  dim?: boolean;
}) {
  const id = PILLAR_IDENTITY[pillar];
  const Icon = id.Icon;
  const glyph = iconSize ?? Math.round(size * 0.48);
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: puraRevealRadius.iconCircle,
          backgroundColor: id.tint,
        },
        dim && styles.dim,
      ]}
    >
      <Icon size={glyph} weight="regular" color={id.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: {
    opacity: 0.4,
  },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ShoppingCart, Storefront, Crown } from 'phosphor-react-native';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';

export type PriceTier = 'drugstore' | 'mid' | 'prestige';

export interface PriceTierBodyProps {
  onSelect: (tier: PriceTier) => void;
}

const ROWS = [
  {
    value: 'drugstore',
    Icon: ShoppingCart,
    label: 'Drugstore',
    helper: 'CeraVe, The Ordinary, Cetaphil',
  },
  {
    value: 'mid',
    Icon: Storefront,
    label: 'Mid-range',
    helper: "Paula's Choice, Glow Recipe, COSRX",
  },
  {
    value: 'prestige',
    Icon: Crown,
    label: 'Prestige',
    helper: 'Augustinus Bader, La Mer, SkinCeuticals',
  },
] as const;

/**
 * Contextual sheet body for Trigger 2 — "What's your usual price range?"
 * Tapping a row commits selection (no separate Continue button). Single-
 * select; no multi-select, no free text.
 */
export function PriceTierBody({ onSelect }: PriceTierBodyProps) {
  return (
    <View style={styles.stack}>
      {ROWS.map((r) => (
        <ChoiceRow
          key={r.value}
          Icon={r.Icon}
          label={r.label}
          helper={r.helper}
          tall
          selected={false}
          onToggle={() => onSelect(r.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
});

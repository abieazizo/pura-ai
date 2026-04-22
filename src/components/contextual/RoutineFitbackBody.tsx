import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Waves, Check, Plus } from 'phosphor-react-native';
import { ChoiceRow } from '@/components/onboarding/ChoiceRow';

export type RoutineFitback = 'too-much' | 'right' | 'too-little';

export interface RoutineFitbackBodyProps {
  onSelect: (fb: RoutineFitback) => void;
}

const ROWS = [
  {
    value: 'too-much',
    Icon: Waves,
    label: 'Too much',
    helper: "It's a lot. Can we trim it?",
  },
  {
    value: 'right',
    Icon: Check,
    label: 'About right',
    helper: "I'm keeping up",
  },
  {
    value: 'too-little',
    Icon: Plus,
    label: 'Too little',
    helper: 'I could do more',
  },
] as const;

/**
 * Contextual sheet body for Trigger 3 — "How's the routine feeling?"
 * Same pattern as PriceTier: tap a row to commit. Provider handles the
 * follow-up toast.
 */
export function RoutineFitbackBody({ onSelect }: RoutineFitbackBodyProps) {
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

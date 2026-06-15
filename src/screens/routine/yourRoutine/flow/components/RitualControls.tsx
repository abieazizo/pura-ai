/**
 * RitualControls — the quiet top bar of the ritual: Pause/Resume + End.
 *
 * The room belongs to the step, not the chrome — so these read FAINT until
 * attended (`ritualTone.faint`), then lift to `ritualTone.muted` on hover/press
 * focus so they're findable without ever competing with the serif step moment.
 * Generous hit targets (≥44px) and clear roles/labels keep them reachable.
 *
 * Pause toggles the absorb settle + the instruction reveal (the stage owns that
 * state and the freeze); this control only flips it and reads the label. End
 * routes straight to `onEndEarly` — no confirmation, no celebration, no guilt.
 *
 * NOTE: a Voice toggle is intentionally NOT rendered — the locked
 * `RitualStageProps` contract carries no voice hook, and wiring voice here would
 * mean widening a contract (forbidden). Voice belongs to a later contract pass.
 *
 * Tokens only: type from `flowType`, color from `ritualTone`.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { flowType } from '../type';
import { ritualTone } from '@/theme/routineFlow';

export interface RitualControlsProps {
  paused: boolean;
  onTogglePause: () => void;
  onEndEarly: () => void;
  /** Goes inert during the Done/Skip beat so a stray tap can't strand a step. */
  disabled?: boolean;
}

export function RitualControls({
  paused,
  onTogglePause,
  onEndEarly,
  disabled = false,
}: RitualControlsProps) {
  return (
    <View style={styles.bar} pointerEvents={disabled ? 'none' : 'box-none'}>
      <Pressable
        onPress={onTogglePause}
        disabled={disabled}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={paused ? 'Resume the ritual' : 'Pause the ritual'}
        accessibilityState={{ selected: paused, disabled }}
        style={({ pressed }) => [styles.hit, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text
          style={[flowType.context, styles.label, paused && styles.active]}
          maxFontSizeMultiplier={1.3}
        >
          {paused ? 'Resume' : 'Pause'}
        </Text>
      </Pressable>

      <Pressable
        onPress={onEndEarly}
        disabled={disabled}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="End the ritual early"
        accessibilityHint="Only the steps you finished count"
        accessibilityState={{ disabled }}
        style={({ pressed }) => [styles.hit, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[flowType.context, styles.label]} maxFontSizeMultiplier={1.3}>
          End
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // ≥44px reachable target around a quiet label.
  hit: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  // Faint until attended; Pause lifts to muted when active (Resume showing).
  label: { color: ritualTone.faint },
  active: { color: ritualTone.muted },
});

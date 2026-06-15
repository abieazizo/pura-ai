/**
 * StartCTA — ACT 1's single confident action (and its calm rest state).
 *
 * Default: one full-width Pura-Blue pill ("Start morning routine" / "Start
 * evening routine") — the only primary action on the overview, with a large hit
 * target and a real button role/label.
 *
 * restState (everything done today): NOT a disabled or hidden button — a calm
 * "Done for today." in the serif voice plus the quiet rescan bridge
 * (`model.progressBridge`) as a low-emphasis tappable line. Never blank, never
 * grey-disabled, never guilt, never points.
 *
 * Type from `flow/type.ts`; color from `overviewTone` (no hex). The label wraps
 * / scales (capped) without truncating mid-word or breaking the pill.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { flowType } from '../type';
import { overviewTone } from '@/theme/routineFlow';
import type { StartCTAProps } from '../contracts';

export function StartCTA({
  label,
  restState,
  doneLine,
  bridgeLine,
  onStart,
  onRescanBridge,
}: StartCTAProps) {
  if (restState) {
    return (
      <View style={styles.restWrap}>
        <Text style={[flowType.name, styles.doneLine]} maxFontSizeMultiplier={1.5}>
          {doneLine}
        </Text>
        {onRescanBridge ? (
          <Pressable
            onPress={onRescanBridge}
            accessibilityRole="link"
            accessibilityLabel={bridgeLine}
            hitSlop={10}
            style={({ pressed }) => [styles.bridgeHit, pressed && styles.pressedQuiet]}
          >
            <Text style={[flowType.context, styles.bridgeLine]} maxFontSizeMultiplier={1.6}>
              {bridgeLine}
            </Text>
          </Pressable>
        ) : (
          <Text style={[flowType.context, styles.bridgeLine]} maxFontSizeMultiplier={1.6}>
            {bridgeLine}
          </Text>
        )}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onStart}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
    >
      <Text
        style={[flowType.start, styles.pillLabel]}
        numberOfLines={2}
        maxFontSizeMultiplier={1.4}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: overviewTone.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  pillPressed: {
    opacity: 0.9,
  },
  pillLabel: {
    color: overviewTone.onAccent,
    textAlign: 'center',
  },
  restWrap: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  doneLine: {
    color: overviewTone.ink,
    textAlign: 'center',
  },
  bridgeHit: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pressedQuiet: {
    opacity: 0.6,
  },
  bridgeLine: {
    color: overviewTone.muted,
    textAlign: 'center',
  },
});

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { V26, V26_SPACE, V26_TYPE } from './tokens';

interface FocusedRoutineHeaderProps {
  /** "1 of 3" / "2 of 3" / "Final step" */
  progressLabel: string;
  /** "Tonight" */
  contextLabel?: string;
  onClose: () => void;
}

/**
 * v26 — Focused mode header.
 *
 * Replaces the standard Routine header while the user is mid-ritual.
 * Top-left close, centered progress text. No tabs, no segmented
 * control — the entire chrome of the app quiets so the step is the
 * only focus.
 */
export function FocusedRoutineHeader({
  progressLabel,
  contextLabel = 'Tonight',
  onClose,
}: FocusedRoutineHeaderProps) {
  return (
    <View style={s.wrap}>
      <Pressable
        onPress={() => {
          hapt.tap();
          onClose();
        }}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close tonight’s routine"
        style={({ pressed }) => [s.close, pressed && { opacity: 0.6 }]}
      >
        <X size={18} color={V26.ink} weight="bold" />
      </Pressable>
      <View style={s.center}>
        <Text style={s.context} maxFontSizeMultiplier={1.15}>
          {contextLabel}
        </Text>
        <Text style={s.label} maxFontSizeMultiplier={1.15}>
          {progressLabel}
        </Text>
      </View>
      <View style={s.spacer} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    height: V26_SPACE.focusedHeader,
    paddingHorizontal: V26_SPACE.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: V26.surface,
    borderWidth: 1,
    borderColor: V26.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  context: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 13,
    color: V26.inkMuted,
    letterSpacing: 0.2,
  },
  label: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 13,
    color: V26.ink,
    letterSpacing: 0.2,
  },
  spacer: {
    width: 38,
    height: 38,
  },
});

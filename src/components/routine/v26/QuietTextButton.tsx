import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { CaretRight } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { V26, V26_TYPE } from './tokens';

interface QuietTextButtonProps {
  label: string;
  onPress: () => void;
  tone?: 'clay' | 'muted' | 'ink';
  withArrow?: boolean;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/**
 * v26 — QuietTextButton.
 *
 * Replaces ad-hoc underlined links sprinkled under primary buttons.
 * Always a tap-target of at least 44 points; the visible label is the
 * smaller part. Arrow optional, tone-restricted to clay / muted / ink.
 */
export function QuietTextButton({
  label,
  onPress,
  tone = 'clay',
  withArrow = true,
  style,
  disabled,
  accessibilityLabel,
}: QuietTextButtonProps) {
  const color =
    tone === 'clay'
      ? V26.terracottaText
      : tone === 'muted'
      ? V26.inkMuted
      : V26.ink;

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        hapt.tap();
        onPress();
      }}
      disabled={disabled}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        s.root,
        pressed && { opacity: 0.6 },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Text
        maxFontSizeMultiplier={1.2}
        style={[s.label, { color }]}
      >
        {label}
      </Text>
      {withArrow ? (
        <View style={s.arrowWrap}>
          <CaretRight size={14} color={color} weight="bold" />
        </View>
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 4,
  },
  label: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 14,
    letterSpacing: 0.05,
  },
  arrowWrap: {
    marginLeft: 2,
  },
});

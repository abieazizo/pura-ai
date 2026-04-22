import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { hapt } from '@/utils/haptics';
import { palette, type as typography } from '@/theme';

export interface AIChipProps extends Omit<PressableProps, 'style' | 'children'> {
  size?: number;
  /** Override the fill (defaults to clayPaper). */
  fill?: string;
  /** Override the text color (defaults to clay). */
  textColor?: string;
  /** Tap handler (if provided, fires `hapt.tap` first). */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * The small "AI" chip that sits top-right on main surfaces. v5 patch §2.7:
 * tokens.color.sand-paper fill with tokens.color.clay text. NEVER green —
 * the on-device/private signal belongs on the Privacy row in Settings, not
 * on this identity chip.
 *
 * Position and size are controlled by the caller; this component owns the
 * fill, typography and press affordance only.
 */
export function AIChip({
  size = 32,
  fill,
  textColor,
  onPress,
  style,
  accessibilityLabel = 'Pura Assistant',
  ...rest
}: AIChipProps) {
  const handlePress = () => {
    if (!onPress) return;
    hapt.tap();
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress ? handlePress : undefined}
      hitSlop={6}
      disabled={!onPress}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: fill ?? palette.clayPaper,
        },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: textColor ?? palette.clay, fontSize: size * 0.36 },
        ]}
        maxFontSizeMultiplier={1.1}
      >
        AI
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    // Inter-SemiBold for legibility at this scale — serifs disappear below ~14pt.
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.4,
  },
});

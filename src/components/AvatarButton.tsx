import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, type as typography } from '@/theme';
import type { User } from '@/types';

export interface AvatarButtonProps
  extends Omit<PressableProps, 'style' | 'children'> {
  user: Pick<User, 'initials' | 'avatarColor'>;
  size?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Tappable avatar circle. Shown on the top-right of every main screen, opens
 * the ProfileSheet. Long-press is wired as the `__DEV__` data reset affordance.
 */
export function AvatarButton({
  user,
  size = 40,
  onPress,
  onLongPress,
  style,
  accessibilityLabel = 'Open profile',
  ...rest
}: AvatarButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.();
  };

  const bg = hexToRgba(user.avatarColor, 0.14);
  const fg = user.avatarColor;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={3000}
      hitSlop={8}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderColor: fg,
        },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      <Text
        style={[
          styles.initials,
          { color: fg, fontSize: size * 0.42 },
        ]}
      >
        {user.initials}
      </Text>
      <View style={styles.ring} />
    </Pressable>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const match = hex.match(/^#([0-9a-fA-F]{6})$/);
  if (!match) return hex;
  const int = parseInt(match[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  initials: {
    ...typography.captionMed,
    fontWeight: '700',
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 9999,
  },
});

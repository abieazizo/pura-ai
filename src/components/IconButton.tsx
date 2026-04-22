import React from 'react';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, shadow } from '@/theme';

export type IconButtonVariant = 'ghost' | 'surface' | 'inverse' | 'accent' | 'dark';

export interface IconButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  size?: number;
  variant?: IconButtonVariant;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  haptic?: Haptics.ImpactFeedbackStyle | null;
}

export function IconButton({
  size = 44,
  variant = 'ghost',
  style,
  children,
  onPress,
  haptic = Haptics.ImpactFeedbackStyle.Light,
  ...rest
}: IconButtonProps) {
  const handlePress: PressableProps['onPress'] = (e) => {
    if (haptic !== null) Haptics.impactAsync(haptic).catch(() => {});
    onPress?.(e);
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        variant === 'surface' && { backgroundColor: colors.bgSubtle },
        variant === 'inverse' && { backgroundColor: colors.surface, ...shadow.md },
        variant === 'accent' && { backgroundColor: colors.accent, ...shadow.sm },
        variant === 'dark' && { backgroundColor: colors.textPrimary, ...shadow.md },
        pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
        style,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

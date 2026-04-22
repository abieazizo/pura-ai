import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Camera, ArrowRight } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import {
  colors,
  pressedTints,
  radius,
  shadow,
  space,
  spring,
  type as typography,
} from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PrimaryButtonVariant = 'filled' | 'outlined' | 'ghost' | 'destructive';
export type PrimaryButtonSize = 'lg' | 'md';

export interface PrimaryButtonProps
  extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: PrimaryButtonVariant;
  size?: PrimaryButtonSize;
  /** Use the emotional serif label treatment (hero CTAs). */
  serif?: boolean;
  tone?: 'accent' | 'primary' | 'success';
  loading?: boolean;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  /** Show a built-in `ArrowRight` Phosphor glyph on the right for directional CTAs. */
  arrow?: boolean;
  fullWidth?: boolean;
  haptic?: 'tap' | 'warning' | 'shutter' | null;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

/**
 * v5: squarer (radius 4), 60pt tall, label supports serif for emotional CTAs.
 * Scale press behavior, slow deliberate spring. No bouncy material physics.
 */
export function PrimaryButton({
  label,
  variant = 'filled',
  size = 'lg',
  serif = false,
  tone = 'accent',
  loading = false,
  leftSlot,
  rightSlot,
  arrow = false,
  fullWidth = true,
  haptic = 'tap',
  disabled,
  style,
  labelStyle,
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: PrimaryButtonProps) {
  const scaleVal = useSharedValue(1);
  const opacityVal = useSharedValue(1);

  const bgColor =
    tone === 'primary'
      ? colors.textPrimary
      : tone === 'success'
      ? colors.success
      : colors.accent;
  const bgPressedColor =
    tone === 'primary'
      ? pressedTints.primary
      : tone === 'success'
      ? pressedTints.success
      : pressedTints.accent;

  const isFilled = variant === 'filled';
  const isOutlined = variant === 'outlined';
  const isGhost = variant === 'ghost';
  const isDestructive = variant === 'destructive';

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scaleVal.value }],
    opacity: opacityVal.value,
  }));

  const handlePressIn: PressableProps['onPressIn'] = (e) => {
    scaleVal.value = withSpring(0.98, spring.default);
    opacityVal.value = withTiming(0.94, { duration: 80 });
    onPressIn?.(e);
  };

  const handlePressOut: PressableProps['onPressOut'] = (e) => {
    scaleVal.value = withSpring(1, spring.default);
    opacityVal.value = withTiming(1, { duration: 120 });
    onPressOut?.(e);
  };

  const handlePress: PressableProps['onPress'] = (e) => {
    if (haptic === 'tap') hapt.tap();
    else if (haptic === 'warning') hapt.warning();
    else if (haptic === 'shutter') hapt.shutter();
    onPress?.(e);
  };

  const inactive = disabled || loading;

  const labelTypo = serif
    ? typography.titleSerif
    : typography.bodyMed;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        fullWidth && styles.fullWidth,
        isFilled && { backgroundColor: bgColor, ...shadow.subtle },
        isFilled && pressed && { backgroundColor: bgPressedColor },
        isOutlined && {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.textPrimary,
        },
        isOutlined && pressed && { backgroundColor: colors.bgDeep },
        isGhost && { backgroundColor: 'transparent' },
        isGhost && pressed && { backgroundColor: colors.bgDeep },
        isDestructive && { backgroundColor: 'transparent' },
        isDestructive && pressed && { backgroundColor: colors.bgDeep },
        inactive && styles.disabled,
        animated,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isFilled ? colors.textInverse : colors.textPrimary}
        />
      ) : (
        <View style={styles.row}>
          {leftSlot ? <View style={styles.slotLeft}>{leftSlot}</View> : null}
          <Text
            style={[
              styles.label,
              labelTypo,
              isFilled && { color: colors.textInverse },
              (isOutlined || isGhost) && { color: colors.textPrimary },
              isDestructive && { color: colors.danger },
              labelStyle,
            ]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {label}
          </Text>
          {rightSlot ? (
            <View style={styles.slotRight}>{rightSlot}</View>
          ) : arrow ? (
            <View style={styles.slotRight}>
              <ArrowRight
                size={18}
                color={isFilled ? colors.textInverse : colors.textPrimary}
                weight="duotone"
              />
            </View>
          ) : null}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.sq, // 4 — squarer, more editorial
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  fullWidth: { alignSelf: 'stretch' },
  lg: { height: 60 }, // v5: 60pt tall
  md: { height: 48, paddingHorizontal: space.md },
  disabled: { opacity: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label: {
    // Specific type overrides come from labelTypo merged above
  },
  slotLeft: { marginRight: space.sm },
  slotRight: { marginLeft: space.sm },
});

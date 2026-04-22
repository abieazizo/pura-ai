import React, { useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, motion, space, type as typography } from '@/theme';

export interface InputProps extends TextInputProps {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  /** Hairline thickness of the underline. */
  thickness?: number;
}

/**
 * v5 underline-style input. No pill, no fill. A hairline bottom border that
 * transitions to clay on focus. Used everywhere an input is needed — onboarding
 * name entry, Products search, etc.
 */
export function Input({
  leading,
  trailing,
  containerStyle,
  thickness = 1.5,
  onFocus,
  onBlur,
  style,
  placeholder,
  ...rest
}: InputProps) {
  const focus = useSharedValue(0);

  useEffect(() => {
    // no-op: focus driven by events
  }, []);

  const underline = useAnimatedStyle(() => ({
    backgroundColor:
      focus.value > 0.5 ? colors.accent : colors.hairline,
    height: thickness + focus.value * 0.5,
  }));

  return (
    <View style={[styles.wrap, containerStyle]}>
      <View style={styles.row}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <TextInput
          {...rest}
          placeholder={placeholder}
          placeholderTextColor={colors.inkTertiary}
          onFocus={(e) => {
            focus.value = withTiming(1, motion.base);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.value = withTiming(0, motion.base);
            onBlur?.(e);
          }}
          style={[styles.input, style]}
          maxFontSizeMultiplier={1.25}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      <Animated.View style={[styles.underline, underline]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leading: { marginRight: space.sm },
  trailing: { marginLeft: space.sm },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.ink,
    paddingVertical: space.sm,
    paddingHorizontal: 0,
  },
  underline: {
    alignSelf: 'stretch',
    marginTop: space.xs,
  },
});

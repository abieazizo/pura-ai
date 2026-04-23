import React, { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MagnifyingGlass, X } from 'phosphor-react-native';
import { palette } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export interface AISearchBarProps
  extends Omit<TextInputProps, 'style' | 'onChangeText' | 'value'> {
  value: string;
  onChangeText: (v: string) => void;
  onClear: () => void;
}

/**
 * Rainbow-bordered search bar (§2.6) — the signature element. Rendered as
 * an over-sized linear gradient inside a clipped pill, rotated linearly
 * over 8s infinite. The effect approximates a conic gradient without
 * shipping a canvas/Skia layer.
 *
 * Reduce-motion stops the rotation but keeps the gradient visible. Inner
 * content is absolutely filled on top of the animated gradient wrapper so
 * only 1.5pt of the spinning colour is visible as border.
 */
const GRADIENT_COLORS = [
  '#FFB4A2',
  '#E5989B',
  '#B5838D',
  '#6D6875',
  '#A8DADC',
  '#FFD6A5',
  '#FFB4A2', // loop back — ensures no visible seam
];

const ROTATION_MS = 8000;
const BAR_HEIGHT = 52;
const BORDER = 1.5;

export function AISearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = "Search your skin's match\u2026",
  ...rest
}: AISearchBarProps) {
  const rotation = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(rotation);
      rotation.value = 45;
      return;
    }
    rotation.value = withRepeat(
      withTiming(360, {
        duration: ROTATION_MS,
        easing: Easing.linear,
      }),
      -1,
      false
    );
    return () => cancelAnimation(rotation);
  }, [reduceMotion, rotation]);

  const gradientStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.outerWrap}>
      <View style={styles.borderWrapper}>
        <Animated.View style={[styles.gradientWrapper, gradientStyle]}>
          <LinearGradient
            colors={GRADIENT_COLORS as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          />
        </Animated.View>

        <View style={styles.innerContent}>
          <MagnifyingGlass
            size={18}
            color={palette.inkTertiary}
            weight="duotone"
          />
          <TextInput
            {...rest}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={palette.inkTertiary}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            maxFontSizeMultiplier={1.2}
          />
          {value.length > 0 ? (
            <Pressable
              onPress={onClear}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={({ pressed }) => [
                styles.clearBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <X size={16} color={palette.inkTertiary} weight="duotone" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    height: BAR_HEIGHT,
    marginHorizontal: 20,
  },
  borderWrapper: {
    flex: 1,
    borderRadius: BAR_HEIGHT / 2,
    padding: BORDER,
    overflow: 'hidden',
    backgroundColor: palette.bg,
  },
  gradientWrapper: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
  },
  gradient: {
    flex: 1,
  },
  innerContent: {
    flex: 1,
    borderRadius: BAR_HEIGHT / 2 - BORDER,
    backgroundColor: palette.bg,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: palette.ink,
    paddingVertical: 0,
    paddingHorizontal: 0,
    // iOS's default caret is fine; no underlineColorAndroid inline style —
    // Android picks up the platform default which is good enough here.
  },
  clearBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

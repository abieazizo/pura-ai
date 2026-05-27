import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ArrowRight, Check } from 'phosphor-react-native';
import { dx, dRadius } from '../decisionTokens';
import { hapt } from '@/utils/haptics';

interface Props {
  label: string;
  appliedLabel?: string;
  applied?: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** Pass `true` to render a quieter outlined button instead of solid terracotta. */
  outline?: boolean;
}

/**
 * The Decision Room's primary CTA. Animates a smooth arrow → check
 * transition when the decision is applied, with a subtle press scale
 * for tactile feedback.
 */
export function PrimaryDecisionButton({
  label,
  appliedLabel,
  applied = false,
  onPress,
  disabled = false,
  outline = false,
}: Props) {
  const scale = useSharedValue(1);
  const checkOp = useSharedValue(applied ? 1 : 0);
  const arrowOp = useSharedValue(applied ? 0 : 1);

  useEffect(() => {
    checkOp.value = withTiming(applied ? 1 : 0, { duration: 220 });
    arrowOp.value = withTiming(applied ? 0 : 1, { duration: 180 });
  }, [applied, checkOp, arrowOp]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const arrowStyle = useAnimatedStyle(() => ({ opacity: arrowOp.value }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: checkOp.value }));

  const bg = outline ? dx.surfacePrimary : dx.terracotta;
  const fg = outline ? dx.terracottaText : dx.inkInverse;

  return (
    <Animated.View style={animated}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={applied ? (appliedLabel ?? label) : label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          if (disabled) return;
          hapt.tap();
          onPress();
        }}
        onPressIn={() => {
          scale.value = withTiming(0.985, { duration: 90, easing: Easing.linear });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 180 });
        }}
        style={[
          styles.btn,
          {
            backgroundColor: bg,
            borderColor: outline ? dx.line : dx.terracotta,
            opacity: disabled ? 0.55 : 1,
          },
        ]}
        hitSlop={6}
      >
        <Text
          style={[styles.label, { color: fg }]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}
        >
          {applied ? (appliedLabel ?? label) : label}
        </Text>
        <View style={styles.iconWrap}>
          <Animated.View style={[styles.iconAbs, arrowStyle]}>
            <ArrowRight size={14} color={fg} weight="bold" />
          </Animated.View>
          <Animated.View style={[styles.iconAbs, checkStyle]}>
            <Check size={14} color={fg} weight="bold" />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    paddingHorizontal: 20,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: 0.1,
  },
  iconWrap: { width: 14, height: 14, position: 'relative' },
  iconAbs: { position: 'absolute', top: 0, left: 0 },
});

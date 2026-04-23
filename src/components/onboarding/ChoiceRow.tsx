import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import { Check } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_SPRING = { damping: 15, stiffness: 300, mass: 1 };

export interface ChoiceRowProps {
  /**
   * Phosphor icon component. Pass `null` to render an iconless row (used on
   * questions where an icon would feel reductive, e.g. AskGender).
   */
  Icon: React.FC<PhosphorIconProps> | null;
  label: string;
  /** Optional secondary helper line under the label. */
  helper?: string;
  selected: boolean;
  onToggle: () => void;
  /** Taller row height when a helper is shown. */
  tall?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Onboarding choice row (§2.4). 64pt default, 76pt with helper. Sand @ 40%
 * idle → sand @ 100% + clay border when selected. Icon · label · (helper) ·
 * Check on the right when selected.
 */
export function ChoiceRow({
  Icon,
  label,
  helper,
  selected,
  onToggle,
  tall,
  style,
}: ChoiceRowProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handle = () => {
    hapt.select();
    scale.value = withSpring(0.98, PRESS_SPRING, () => {
      scale.value = withSpring(1, PRESS_SPRING);
    });
    onToggle();
  };

  return (
    <AnimatedPressable
      onPress={handle}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[
        styles.row,
        tall ? styles.tall : styles.standard,
        selected ? styles.selected : styles.idle,
        animated,
        style,
      ]}
    >
      {Icon ? (
        <Icon
          size={22}
          color={selected ? palette.clay : palette.inkSecondary}
          style={{ marginRight: 14 }}
          weight="duotone"
        />
      ) : null}
      <View style={styles.textCol}>
        <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {label}
        </Text>
        {helper ? (
          <Text
            style={styles.helper}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {helper}
          </Text>
        ) : null}
      </View>
      {selected ? (
        <Check size={20} color={palette.clay} weight="duotone" />
      ) : (
        <View style={styles.checkSpacer} />
      )}
    </AnimatedPressable>
  );
}

// v9.9 — choice row aligned with v9 surface language. Idle state is a
// paper tile with 1pt hairline border (same as Home concern cards); the
// hardcoded warm sand @ 40% is gone. Selected state lifts to
// clayPaper (near-white blue tint) with a 1.5pt clay border — signals
// selection through tone, not saturation.
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  standard: { height: 60 },
  tall: { height: 74 },
  idle: {
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  selected: {
    backgroundColor: palette.clayPaper,
    borderWidth: 1.5,
    borderColor: palette.clay,
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: -0.1,
    color: palette.ink,
  },
  helper: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.inkTertiary,
    marginTop: 2,
  },
  checkSpacer: { width: 20 },
});

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
   * questions where an icon would feel reductive, e.g. AskGender). Typed
   * as `ComponentType` to accept both Phosphor's `ForwardRefExoticComponent`
   * icons and any local FC wrappers.
   */
  Icon: React.ComponentType<PhosphorIconProps> | null;
  label: string;
  /** Optional secondary helper line under the label. */
  helper?: string;
  selected: boolean;
  /** When true the row is interactive but locked out (e.g. multi-select cap reached). */
  disabled?: boolean;
  onToggle: () => void;
  /** Taller row height when a helper is shown. */
  tall?: boolean;
  /**
   * v20.0 — when true, the trailing affordance is rendered as a multi-
   * select checkbox (a small filled square with a checkmark when selected)
   * instead of a single-select tick. Accessibility role flips to
   * `checkbox` accordingly.
   */
  multiSelect?: boolean;
  /** Explicit accessibility label override. Defaults to `label`. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /**
   * v21.0 — optional small pill rendered next to the label, e.g.
   * "Recommended" on the Routine Style screen. Kept short so the row
   * doesn't wrap on small devices.
   */
  badge?: string;
}

/**
 * v20.0 — onboarding choice row.
 *
 * Default = single-select radio with a tick on the right when selected.
 * `multiSelect` swaps the affordance to a left-aligned-feeling checkbox
 * tile so users immediately understand they can pick more than one.
 *
 * Idle: paper tile with hairline border. Selected: clayPaper tile with
 * 1.5pt clay border. Disabled (e.g. cap hit): 50% opacity, no press
 * interaction.
 */
export function ChoiceRow({
  Icon,
  label,
  helper,
  selected,
  disabled = false,
  onToggle,
  tall,
  multiSelect = false,
  accessibilityLabel,
  style,
  badge,
}: ChoiceRowProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handle = () => {
    if (disabled) return;
    hapt.select();
    scale.value = withSpring(0.985, PRESS_SPRING, () => {
      scale.value = withSpring(1, PRESS_SPRING);
    });
    onToggle();
  };

  return (
    <AnimatedPressable
      onPress={handle}
      disabled={disabled}
      accessibilityRole={multiSelect ? 'checkbox' : 'radio'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
      accessibilityHint={
        helper ? helper : undefined
      }
      style={[
        styles.row,
        tall ? styles.tall : styles.standard,
        selected ? styles.selected : styles.idle,
        disabled && styles.disabled,
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
        <View style={styles.labelRow}>
          <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {label}
          </Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText} maxFontSizeMultiplier={1.1}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        {helper ? (
          <Text
            style={styles.helper}
            numberOfLines={2}
            maxFontSizeMultiplier={1.2}
          >
            {helper}
          </Text>
        ) : null}
      </View>
      <Affordance multiSelect={multiSelect} selected={selected} />
    </AnimatedPressable>
  );
}

function Affordance({
  multiSelect,
  selected,
}: {
  multiSelect: boolean;
  selected: boolean;
}) {
  if (multiSelect) {
    return (
      <View
        style={[
          styles.checkbox,
          selected ? styles.checkboxOn : styles.checkboxOff,
        ]}
      >
        {selected ? (
          <Check size={14} color={palette.bg} weight="bold" />
        ) : null}
      </View>
    );
  }
  return selected ? (
    <Check size={20} color={palette.clay} weight="bold" />
  ) : (
    <View style={styles.tickSpacer} />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  standard: { height: 64 },
  tall: { height: 80 },
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
  disabled: {
    opacity: 0.45,
  },
  textCol: {
    flex: 1,
    paddingRight: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    letterSpacing: -0.1,
    color: palette.ink,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: palette.clayPaper,
  },
  badgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.3,
    color: palette.clayDeep,
  },
  helper: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
    marginTop: 2,
  },
  tickSpacer: { width: 20 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOff: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: palette.inkTertiary,
  },
  checkboxOn: {
    backgroundColor: palette.clay,
    borderWidth: 0,
  },
});

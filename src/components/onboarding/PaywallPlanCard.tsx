import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Check } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_SPRING = { damping: 15, stiffness: 300, mass: 1 };

export interface PaywallPlanCardProps {
  /** Selected when true; selection visuals flip. */
  selected: boolean;
  /** Optional small pill rendered above the card, e.g. "BEST VALUE". */
  badge?: string;
  /** Plan name — "Yearly" / "Monthly". */
  planName: string;
  /** Headline price, e.g. "$49.99 / year". */
  price: string;
  /** Secondary line — equivalent monthly cost or "Flexible monthly access". */
  secondary: string;
  /** Optional small savings line — appears below the secondary line. */
  savings?: string;
  /** Full accessibility label spoken on focus. */
  accessibilityLabel: string;
  onPress: () => void;
}

/**
 * v20.0 — paywall plan card. Tap to select; selected state lifts the
 * border to brand blue and fills with the soft tint. Layout is
 * deliberately vertical (label · price · secondary · savings) so the
 * pricing reads at a glance and so the card scales gracefully on small
 * phones without truncating the savings line.
 */
export function PaywallPlanCard({
  selected,
  badge,
  planName,
  price,
  secondary,
  savings,
  accessibilityLabel,
  onPress,
}: PaywallPlanCardProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handle = () => {
    if (selected) return;
    hapt.select();
    scale.value = withSpring(0.985, PRESS_SPRING, () => {
      scale.value = withSpring(1, PRESS_SPRING);
    });
    onPress();
  };

  return (
    <View style={styles.outer}>
      {badge ? (
        <View style={styles.badgePill} pointerEvents="none">
          <Text style={styles.badgeText} maxFontSizeMultiplier={1.1}>
            {badge}
          </Text>
        </View>
      ) : null}
      <AnimatedPressable
        onPress={handle}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.card,
          selected ? styles.selected : styles.idle,
          badge ? styles.cardWithBadge : null,
          animated,
        ]}
      >
        <View style={styles.headerRow}>
          <Text
            style={styles.planName}
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
          >
            {planName}
          </Text>
          <View
            style={[
              styles.radio,
              selected ? styles.radioOn : styles.radioOff,
            ]}
          >
            {selected ? (
              <Check size={14} color={palette.bg} weight="bold" />
            ) : null}
          </View>
        </View>
        <Text
          style={styles.price}
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}
        >
          {price}
        </Text>
        <Text
          style={styles.secondary}
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
        >
          {secondary}
        </Text>
        {savings ? (
          <Text
            style={styles.savings}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {savings}
          </Text>
        ) : null}
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'relative',
    marginTop: 14,
  },
  badgePill: {
    position: 'absolute',
    top: -10,
    left: 16,
    backgroundColor: palette.ink,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 2,
  },
  badgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: palette.bg,
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 4,
  },
  cardWithBadge: {
    paddingTop: 18,
  },
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: -0.1,
    color: palette.ink,
  },
  price: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: palette.ink,
    marginTop: 4,
  },
  secondary: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: palette.inkSecondary,
    marginTop: 2,
  },
  savings: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: palette.clay,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOff: {
    borderWidth: 1.5,
    borderColor: palette.inkTertiary,
    backgroundColor: 'transparent',
  },
  radioOn: {
    backgroundColor: palette.clay,
    borderWidth: 0,
  },
});

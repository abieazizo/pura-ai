import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Sparkle } from 'phosphor-react-native';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { palette } from '@/theme';

export interface PlanImpactCardProps {
  /**
   * One-sentence "Plan impact" line. Falsey value renders nothing — the
   * parent can stop reserving space when the user hasn't made a
   * meaningful selection yet.
   */
  message: string | null | undefined;
  /**
   * Optional kicker label — defaults to "PLAN IMPACT" but can be made
   * more specific ("HOW THIS SHAPES YOUR PLAN") when the screen needs
   * extra anchoring.
   */
  kicker?: string;
}

/**
 * v21.0 — Plan Impact card.
 *
 * Renders right under a question's option list as soon as the user
 * makes a meaningful selection. Soft blue surface, primary-blue
 * sparkle icon, calm one-line copy. Fades + slides in (8px) over
 * 240ms; the message swap re-triggers the entrance so the user
 * immediately reads the new impact line.
 *
 * Goal: every meaningful choice answers "why are you asking me this?"
 * The card is the visible answer.
 */
export function PlanImpactCard({
  message,
  kicker = 'PLAN IMPACT',
}: PlanImpactCardProps) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0);
  const y = useSharedValue(reduceMotion ? 0 : 8);

  useEffect(() => {
    if (!message) {
      opacity.value = withTiming(0, { duration: 160 });
      return;
    }
    opacity.value = 0;
    y.value = reduceMotion ? 0 : 8;
    opacity.value = withTiming(1, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
    y.value = withTiming(0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [message, opacity, y, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  if (!message) return null;

  return (
    <Animated.View
      style={[styles.card, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Plan impact: ${message}`}
    >
      <View style={styles.iconWrap}>
        <Sparkle size={14} color={PRIMARY_BLUE} weight="fill" />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          {kicker}
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={1.25}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

// Locked to the premium light palette tokens from the spec — kept
// local so the file is self-contained and the soft-blue surface
// doesn't get pulled around by changes elsewhere in the theme.
const PRIMARY_BLUE = '#3B82F6';
const SOFT_BLUE_SURFACE = '#F3F7FF';
const BLUE_BORDER = '#D6E4FF';
const TEXT_PRIMARY = '#101828';
const TEXT_SECONDARY = '#475467';

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 24,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: SOFT_BLUE_SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BLUE_BORDER,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6EEFF',
    marginTop: 1,
  },
  textCol: {
    flex: 1,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: PRIMARY_BLUE,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: TEXT_SECONDARY,
    marginTop: 3,
  },
  // Silence unused-color warning for `palette` import; kept available
  // for future themed variants.
  _unused: { color: palette.bg },
});

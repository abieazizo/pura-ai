/**
 * QuestionCard — the option card, fully finished (light + dark).
 *
 * Resting → anticipatory lift (touch-DOWN) → press-in → pop-back overshoot →
 * selected (border draws in, surface tints, icon well brightens) while the
 * others recede. All transforms are UI-thread (Reanimated). Dark mode is
 * first-class: translucent elevated glass (iOS) with a SOLID fallback (Android
 * default + Reduce Transparency), a top-lit hairline, and a glowing selected
 * border. Content-driven height; never truncates under Dynamic Type.
 */

import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CaretRight } from 'phosphor-react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { hapt } from '@/utils/haptics';
import { ICONS, type QuestionOption } from './questionConfig';
import type { OnboardingColors } from './orb/onboardingTheme';

const PURA_BLUE = '#147CFF';
const PRESS_BEZIER = Easing.bezier(0.4, 0, 0.6, 1);
const POP_SPRING = { stiffness: 380, damping: 26, mass: 1 };

export type CardEnterMode = 'rise' | 'z' | 'instant';

export interface QuestionCardProps {
  option: QuestionOption;
  index: number;
  total: number;
  selected: boolean;
  /** Another card is selected → this one recedes (functional confirm). */
  recede: boolean;
  /** Another card is being touched-down → this one dims slightly. */
  dimmed: boolean;
  /** Compact row — no icon well, tighter height (dense sets like age). */
  compact?: boolean;
  enterMode: CardEnterMode;
  riseDelay: number;
  reduceMotion: boolean;
  reduceTransparency: boolean;
  dark: boolean;
  colors: OnboardingColors;
  onPressIn: (id: string) => void;
  onPressOut: (id: string) => void;
  onPress: (id: string) => void;
}

export function QuestionCard({
  option,
  index,
  total,
  selected,
  recede,
  dimmed,
  compact = false,
  enterMode,
  riseDelay,
  reduceMotion,
  reduceTransparency,
  dark,
  colors,
  onPressIn,
  onPressOut,
  onPress,
}: QuestionCardProps) {
  const enter = useSharedValue(reduceMotion || enterMode === 'instant' ? 1 : 0);
  const press = useSharedValue(1); // anticipatory lift + press-in + pop-back
  const sel = useSharedValue(selected ? 1 : 0);
  const rec = useSharedValue(recede ? 1 : 0);
  const dim = useSharedValue(dimmed ? 1 : 0);
  const committedRef = React.useRef(false);

  // Entrance — rise (forward), z-emerge (4→5 forward), or instant (backward).
  useEffect(() => {
    if (reduceMotion || enterMode === 'instant') {
      enter.value = 1;
      return;
    }
    enter.value = withDelay(riseDelay, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
  }, [enterMode, reduceMotion, riseDelay, enter]);

  useEffect(() => {
    sel.value = reduceMotion ? (selected ? 1 : 0) : withTiming(selected ? 1 : 0, { duration: 200 });
  }, [selected, reduceMotion, sel]);
  useEffect(() => {
    rec.value = reduceMotion ? (recede ? 1 : 0) : withTiming(recede ? 1 : 0, { duration: 300 });
  }, [recede, reduceMotion, rec]);
  useEffect(() => {
    dim.value = reduceMotion ? 0 : withTiming(dimmed ? 1 : 0, { duration: 160 });
  }, [dimmed, reduceMotion, dim]);

  // The card body transform: enter + anticipatory/press + recede sink.
  const cardStyle = useAnimatedStyle(() => {
    const enterScale = enterMode === 'z' ? 1.04 - enter.value * 0.04 : 1;
    const enterY = enterMode === 'z' ? 0 : (1 - enter.value) * 16;
    return {
      opacity: enter.value * (1 - rec.value * 0.55) * (1 - dim.value * 0.08),
      transform: [
        { translateY: enterY },
        { scale: enterScale * press.value * (1 - rec.value * 0.02) },
      ],
    };
  });
  // Ambient shadow softens/spreads on lift, flattens on recede.
  const ambientStyle = useAnimatedStyle(() => ({
    shadowOpacity: dark ? 0.4 * (1 - rec.value * 0.6) : (0.05 + (press.value - 1) * 0.6) * (1 - rec.value * 0.7),
    shadowRadius: 24 + (press.value - 1) * 200, // spreads as it lifts
  }));
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(sel.value, [0, 1], [colors.cardBorder, colors.cardBorderSelected]),
  }));
  const tintStyle = useAnimatedStyle(() => ({ opacity: sel.value }));
  const iconSelStyle = useAnimatedStyle(() => ({ opacity: sel.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: dark ? sel.value : 0 }));

  const handlePressIn = () => {
    committedRef.current = false;
    onPressIn(option.id);
    hapt.tap(); // impactLight on touch-down
    if (!reduceMotion) {
      press.value = withTiming(1.02, { duration: 140, easing: Easing.out(Easing.cubic) });
    }
  };
  const handlePress = () => {
    committedRef.current = true;
    if (!reduceMotion) {
      press.value = withTiming(0.97, { duration: 80, easing: PRESS_BEZIER }, () => {
        press.value = withSpring(1, POP_SPRING); // pop-back, slight overshoot
      });
    }
    onPress(option.id);
  };
  const handlePressOut = () => {
    onPressOut(option.id);
    // Slid off before release (no commit): settle back, no selection.
    if (!committedRef.current && !reduceMotion) {
      press.value = withSpring(1, POP_SPRING);
    }
  };

  const Icon = ICONS[option.icon] ?? CaretRight;
  const useSolid = !dark || reduceTransparency || Platform.OS === 'android';
  const a11yLabel =
    `${option.label}${option.sublabel ? `, ${option.sublabel}` : ''}, option ${index + 1} of ${total}`;

  return (
    <Animated.View
      style={[
        styles.ambient,
        compact && styles.ambientCompact,
        { shadowColor: colors.shadowAmbient },
        ambientStyle,
        cardStyle,
      ]}
    >
      {/* Selected glow (dark only) */}
      <Animated.View
        style={[styles.glow, { shadowColor: PURA_BLUE }, glowStyle]}
        pointerEvents="none"
      />
      <View style={[styles.contact, { shadowColor: colors.shadowContact }]}>
        <Animated.View style={[styles.body, borderStyle]}>
          {/* Surface */}
          {useSolid ? (
            <View
              style={[StyleSheet.absoluteFill, styles.surface, { backgroundColor: dark ? colors.cardSolid : colors.cardTop }]}
              pointerEvents="none"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.surface, { backgroundColor: colors.cardGlass }]} pointerEvents="none" />
          )}
          {!dark && (
            <LinearGradient
              colors={[colors.cardTop, colors.cardBottom]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.surface]}
              pointerEvents="none"
            />
          )}
          {/* Selected surface tint (Pura Blue) */}
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.surface, { backgroundColor: colors.cardTint }, tintStyle]}
            pointerEvents="none"
          />

          <Pressable
            style={[styles.press, compact && styles.pressCompact]}
            onPressIn={handlePressIn}
            onPress={handlePress}
            onPressOut={handlePressOut}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={a11yLabel}
          >
            {!compact && (
              <View style={styles.iconWell}>
                <View style={[StyleSheet.absoluteFill, styles.iconWellBase, { backgroundColor: colors.iconWell }]} />
                <Animated.View
                  style={[StyleSheet.absoluteFill, styles.iconWellBase, { backgroundColor: colors.iconWellSelected }, iconSelStyle]}
                />
                {/* 1px inner top-highlight */}
                <View style={styles.iconWellHighlight} pointerEvents="none" />
                <Icon size={20} color={PURA_BLUE} weight="duotone" />
              </View>
            )}

            <View style={styles.textCol}>
              <Text style={[styles.label, { color: colors.label }]} maxFontSizeMultiplier={1.6}>
                {option.label}
              </Text>
              {!!option.sublabel && (
                <Text style={[styles.sublabel, { color: colors.sublabel }]} maxFontSizeMultiplier={1.5}>
                  {option.sublabel}
                </Text>
              )}
            </View>

            <CaretRight size={16} color={colors.sublabel} weight="bold" style={styles.chevron} />
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ambient: {
    alignSelf: 'stretch', // fill the ScrollView column (never shrink to content)
    marginBottom: 12,
    borderRadius: 20,
    // ambient shadow (y8, blur24) — opacity/radius animated
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    shadowOpacity: 0.05,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    shadowOpacity: 0.9,
  },
  contact: {
    borderRadius: 20,
    // contact shadow (y1, blur2)
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    shadowOpacity: Platform.OS === 'ios' ? 0.5 : 0,
    elevation: 2,
  },
  body: {
    borderRadius: 20,
    borderWidth: 1.5, // constant; color animates faint hairline → Pura Blue
    overflow: 'hidden',
  },
  surface: { borderRadius: 20 },
  press: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  // Compact row — for dense sets (age ranges, yes/no). No icon well; the
  // height drops so 6–7 options still read as one calm column.
  pressCompact: {
    minHeight: 56,
    paddingVertical: 11,
  },
  ambientCompact: {
    marginBottom: 9,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  iconWellBase: { borderRadius: 12 },
  iconWellHighlight: {
    position: 'absolute',
    top: 0,
    left: 6,
    right: 6,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 1,
  },
  textCol: { flex: 1 },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  sublabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },
  chevron: { marginLeft: 8, opacity: 0.15 },
});

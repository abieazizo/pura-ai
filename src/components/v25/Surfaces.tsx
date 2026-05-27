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
import { CaretRight } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { T, TYPE, RADIUS, SHADOW, SPACE } from './tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_SPRING = { damping: 15, stiffness: 300, mass: 1 };

// ---------------------------------------------------------------------------
// Card surfaces
// ---------------------------------------------------------------------------

export type CardTone =
  | 'paper'
  | 'surface'
  | 'raised'
  | 'clay'
  | 'sage'
  | 'amber'
  | 'failed'
  | 'mist';

const CARD_TONES: Record<CardTone, { bg: string; border: string }> = {
  paper:   { bg: T.paper,          border: T.line },
  surface: { bg: T.surface,        border: T.line },
  raised:  { bg: T.surfaceRaised,  border: T.line },
  clay:    { bg: T.terracottaSoft, border: T.terracottaSoft },
  sage:    { bg: T.sageSoft,       border: T.sageSoft },
  amber:   { bg: T.amberSoft,      border: T.amberSoft },
  failed:  { bg: T.failedSoft,     border: T.failedSoft },
  mist:    { bg: T.terracottaMist, border: T.terracottaMist },
};

interface CardProps {
  tone?: CardTone;
  elevated?: boolean;
  hero?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  tone = 'raised',
  elevated,
  hero,
  children,
  style,
}: CardProps) {
  const meta = CARD_TONES[tone];
  return (
    <View
      style={[
        s.card,
        hero && s.cardHero,
        { backgroundColor: meta.bg, borderColor: meta.border },
        elevated && SHADOW.hero,
        !elevated && SHADOW.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Primary button
// ---------------------------------------------------------------------------

export type PrimaryButtonVariant = 'terracotta' | 'ink' | 'tonal' | 'sage';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: PrimaryButtonVariant;
  RightIcon?: React.ComponentType<{ size?: number; color?: string; weight?: 'duotone' | 'bold' | 'regular' | 'fill' }>;
  LeftIcon?: React.ComponentType<{ size?: number; color?: string; weight?: 'duotone' | 'bold' | 'regular' | 'fill' }>;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** When true, fills the available width. Defaults to true. */
  full?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'terracotta',
  RightIcon,
  LeftIcon,
  style,
  accessibilityLabel,
  full = true,
}: PrimaryButtonProps) {
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
    onPress();
  };

  const styleMap: Record<PrimaryButtonVariant, { bg: string; fg: string; border?: string }> = {
    terracotta: { bg: T.terracotta, fg: '#FCFAF7' },
    ink:        { bg: T.ink, fg: '#FCFAF7' },
    tonal:      { bg: T.surfaceRaised, fg: T.ink, border: T.lineStrong },
    sage:       { bg: T.sage, fg: '#FCFAF7' },
  };
  const m = styleMap[variant];

  return (
    <AnimatedPressable
      onPress={handle}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        s.primaryBtn,
        full && { alignSelf: 'stretch' },
        {
          backgroundColor: m.bg,
          borderColor: m.border ?? 'transparent',
          borderWidth: m.border ? 1 : 0,
        },
        disabled && { opacity: 0.42 },
        animated,
        style,
      ]}
    >
      {LeftIcon ? <LeftIcon size={18} color={m.fg} weight="duotone" /> : null}
      <Text
        style={[s.primaryBtnLabel, { color: m.fg }]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.15}
      >
        {label}
      </Text>
      {RightIcon ? <RightIcon size={18} color={m.fg} weight="bold" /> : null}
    </AnimatedPressable>
  );
}

// ---------------------------------------------------------------------------
// TextAction (secondary text + arrow link)
// ---------------------------------------------------------------------------

interface TextActionProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'muted';
  rightArrow?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function TextAction({
  label,
  onPress,
  variant = 'primary',
  rightArrow = true,
  style,
}: TextActionProps) {
  const color = variant === 'primary' ? T.terracotta : T.inkMuted;
  return (
    <Pressable
      onPress={() => {
        hapt.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => [
        s.textAction,
        pressed && { opacity: 0.65 },
        style,
      ]}
    >
      <Text style={[s.textActionLabel, { color }]} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
      {rightArrow ? (
        <CaretRight size={14} color={color} weight="bold" />
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// InsightRow — used on Home / supporting explanation sections
// ---------------------------------------------------------------------------

import type { BadgeVariant } from './SemanticBadge';
import { SemanticBadge } from './SemanticBadge';

interface InsightRowProps {
  title: string;
  body: string;
  badge?: BadgeVariant;
  /** When true, do not draw the bottom divider. */
  last?: boolean;
}

export function InsightRow({ title, body, badge, last }: InsightRowProps) {
  return (
    <View style={[s.insightRow, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.insightTitle} maxFontSizeMultiplier={1.2}>
          {title}
        </Text>
        <Text style={s.insightBody} maxFontSizeMultiplier={1.25}>
          {body}
        </Text>
      </View>
      {badge ? <SemanticBadge variant={badge} /> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    padding: SPACE.cardPad,
  },
  cardHero: {
    borderRadius: RADIUS.hero,
    padding: SPACE.heroPad,
  },
  primaryBtn: {
    height: 52,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryBtnLabel: {
    fontFamily: TYPE.sansSemi,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  textAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  textActionLabel: {
    fontFamily: TYPE.sansSemi,
    fontSize: 14,
  },
  insightRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.line,
  },
  insightTitle: {
    fontFamily: TYPE.sansSemi,
    fontSize: 15,
    lineHeight: 21,
    color: T.ink,
  },
  insightBody: {
    fontFamily: TYPE.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: T.inkSecondary,
    marginTop: 2,
  },
});

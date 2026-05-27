/**
 * Shared primitives for the Pura Routine system.
 *
 * Small, focused building blocks — buttons, cards, headings,
 * segmented toggle. The routine screen and all sub-views consume
 * these so they stay visually coherent and rely on the same tokens.
 */

import React, { useEffect } from 'react';
import {
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
import {
  puraRoutineColors as C,
  puraRoutineRadius as R,
  puraRoutineShadows as S,
  puraRoutineSpace as SP,
  puraRoutineType as T,
} from '@/theme';

// ---------------------------------------------------------------------------
// Typography helpers
// ---------------------------------------------------------------------------

export function Eyebrow({
  children,
  tone = 'coral',
  style,
}: {
  children: React.ReactNode;
  tone?: 'coral' | 'muted';
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      maxFontSizeMultiplier={1.2}
      style={[
        tone === 'coral' ? T.eyebrow : T.eyebrowMuted,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function EditorialHeading({
  children,
  size = 'page',
  style,
}: {
  children: React.ReactNode;
  size?: 'reveal' | 'hero' | 'page' | 'daily';
  style?: StyleProp<TextStyle>;
}) {
  const styleByVariant: Record<string, TextStyle> = {
    reveal: T.revealTitle,
    hero: T.heroSerif,
    page: T.pageTitle,
    daily: T.dailyScreenTitle,
  };
  return (
    <Text maxFontSizeMultiplier={1.25} style={[styleByVariant[size], style]}>
      {children}
    </Text>
  );
}

export function Body({
  children,
  size = 'normal',
  style,
}: {
  children: React.ReactNode;
  size?: 'large' | 'normal' | 'soft';
  style?: StyleProp<TextStyle>;
}) {
  const styleByVariant: Record<string, TextStyle> = {
    large: T.bodyLarge,
    normal: T.body,
    soft: T.bodySoft,
  };
  return (
    <Text maxFontSizeMultiplier={1.4} style={[styleByVariant[size], style]}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function PuraCard({
  children,
  tone = 'surface',
  elevation = 'card',
  style,
}: {
  children: React.ReactNode;
  tone?: 'surface' | 'soft' | 'blush' | 'sage' | 'amber';
  elevation?: 'flat' | 'card' | 'hero';
  style?: StyleProp<ViewStyle>;
}) {
  const bgByTone: Record<string, string> = {
    surface: C.surface,
    soft: C.surfaceSoft,
    blush: C.surfaceBlush,
    sage: C.sageWash,
    amber: C.amberWash,
  };
  const shadow =
    elevation === 'hero' ? S.hero : elevation === 'card' ? S.card : undefined;
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bgByTone[tone],
          borderColor: C.line,
        },
        shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

interface PuraButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: 'coral' | 'ink' | 'soft' | 'ghost';
  size?: 'lg' | 'md' | 'sm';
  loading?: boolean;
  disabled?: boolean;
  trailingIcon?: React.ReactNode;
  leadingIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function PuraButton({
  label,
  variant = 'coral',
  size = 'lg',
  disabled,
  loading,
  leadingIcon,
  trailingIcon,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: PuraButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgByVariant: Record<string, string> = {
    coral: C.coralStrong,
    ink: C.blackButton,
    soft: C.surface,
    ghost: 'transparent',
  };
  const fgByVariant: Record<string, string> = {
    coral: C.white,
    ink: C.white,
    soft: C.ink,
    ghost: C.coralDeep,
  };
  const borderByVariant: Record<string, string | undefined> = {
    coral: undefined,
    ink: undefined,
    soft: C.lineStrong,
    ghost: undefined,
  };

  const sizeStyle: Record<string, ViewStyle> = {
    lg: { paddingVertical: 18, paddingHorizontal: 24 },
    md: { paddingVertical: 14, paddingHorizontal: 18 },
    sm: { paddingVertical: 10, paddingHorizontal: 14 },
  };

  const labelStyle = size === 'sm' ? T.button : T.buttonLarge;
  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[animStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!isDisabled }}
        disabled={isDisabled}
        onPressIn={(e) => {
          scale.value = withTiming(0.97, { duration: 100 });
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1, { damping: 14, stiffness: 240 });
          onPressOut?.(e);
        }}
        {...rest}
        style={[
          styles.btn,
          sizeStyle[size],
          {
            backgroundColor: bgByVariant[variant],
            borderColor: borderByVariant[variant] ?? 'transparent',
            borderWidth: borderByVariant[variant] ? 1 : 0,
            opacity: isDisabled ? 0.5 : 1,
          },
          variant === 'coral' ? S.coralGlow : variant === 'ink' ? S.button : undefined,
        ]}
      >
        {leadingIcon ? <View style={styles.btnIcon}>{leadingIcon}</View> : null}
        <Text
          maxFontSizeMultiplier={1.2}
          style={[
            labelStyle,
            { color: fgByVariant[variant], textAlign: 'center' },
          ]}
        >
          {label}
        </Text>
        {trailingIcon ? <View style={styles.btnIcon}>{trailingIcon}</View> : null}
      </Pressable>
    </Animated.View>
  );
}

export function QuietTextButton({
  label,
  onPress,
  tone = 'coral',
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: 'coral' | 'muted' | 'ink';
  style?: StyleProp<ViewStyle>;
}) {
  const color =
    tone === 'coral' ? C.coralDeep : tone === 'ink' ? C.ink : C.muted;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={10}
      style={[styles.quiet, style]}
    >
      <Text maxFontSizeMultiplier={1.2} style={[T.button, { color }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Segmented toggle (Morning / Evening)
// ---------------------------------------------------------------------------

export interface SegmentOption<T extends string> {
  key: T;
  label: string;
  icon?: React.ReactNode;
}

export function ModeSegmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.segWrap, style]}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.key)}
            style={[
              styles.segItem,
              active && styles.segItemActive,
            ]}
          >
            {opt.icon ? <View style={styles.segIcon}>{opt.icon}</View> : null}
            <Text
              maxFontSizeMultiplier={1.15}
              style={[
                T.button,
                {
                  color: active ? C.coralDeep : C.muted,
                  fontSize: 14,
                  lineHeight: 18,
                },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Status badge (Owned / Confirm / Find match / Optional)
// ---------------------------------------------------------------------------

export type StatusBadgeKind = 'owned' | 'confirm' | 'match' | 'optional' | 'skipped';

export function StatusBadge({
  kind,
  label,
  style,
}: {
  kind: StatusBadgeKind;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const byKind: Record<
    StatusBadgeKind,
    { bg: string; fg: string; border?: string; text: string }
  > = {
    owned: { bg: C.badgeOwnedBg, fg: C.badgeOwnedText, text: label ?? 'Owned' },
    confirm: { bg: C.badgeConfirmBg, fg: C.badgeConfirmText, text: label ?? 'Confirm' },
    match: { bg: C.badgeMatchBg, fg: C.badgeMatchText, text: label ?? 'Find match' },
    optional: {
      bg: C.surface,
      fg: C.badgeOptionalText,
      border: C.badgeOptionalBorder,
      text: label ?? 'Optional',
    },
    skipped: {
      bg: C.surface,
      fg: C.muted,
      border: C.line,
      text: label ?? 'Skipped',
    },
  };
  const spec = byKind[kind];
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: spec.bg,
          borderColor: spec.border ?? 'transparent',
          borderWidth: spec.border ? 1 : 0,
        },
        style,
      ]}
    >
      <Text style={[T.badge, { color: spec.fg }]}>{spec.text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shimmer ring — gentle animation for active build stage
// ---------------------------------------------------------------------------

export function ShimmerDot({
  active,
  done,
  size = 22,
}: {
  active: boolean;
  done: boolean;
  size?: number;
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (active) {
      pulse.value = withTiming(1, { duration: 900 });
    } else {
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [active, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + pulse.value * 0.6,
    transform: [{ scale: 0.94 + pulse.value * 0.06 }],
  }));

  const bg = done ? C.coralStrong : active ? C.coral : 'transparent';
  const borderColor = done ? C.coralStrong : active ? C.coralStrong : C.lineStrong;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        borderColor,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {active ? (
        <Animated.View
          style={[
            ringStyle,
            {
              position: 'absolute',
              width: size + 8,
              height: size + 8,
              borderRadius: (size + 8) / 2,
              borderWidth: 1.5,
              borderColor: C.coral,
            },
          ]}
        />
      ) : null}
      {done ? (
        <Text style={{ color: C.white, fontSize: 12, fontFamily: 'Inter-Bold' }}>
          ✓
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    borderRadius: R.card,
    borderWidth: 1,
    padding: SP.xl,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: R.button,
    minHeight: 44,
  },
  btnIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quiet: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segWrap: {
    flexDirection: 'row',
    backgroundColor: C.surfaceSoft,
    borderRadius: R.chip,
    padding: 4,
    borderWidth: 1,
    borderColor: C.line,
  },
  segItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: R.chip,
  },
  segItemActive: {
    backgroundColor: C.coralWash,
  },
  segIcon: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: R.pill,
  },
});

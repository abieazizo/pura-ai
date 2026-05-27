import React from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { hapt } from '@/utils/haptics';
import {
  V26,
  V26_RADIUS,
  V26_SHADOW,
  V26_SPACE,
  V26_TYPE,
} from './tokens';

/**
 * v26 — Shared primitives for the Routine redesign.
 *
 * These intentionally do NOT re-export every v25 primitive. The Routine
 * rebuild leans on typography, surfaces, and buttons with a tighter
 * specification so the screen reads as one calm system rather than
 * borrowed parts.
 */

const PRESS_SPRING = { damping: 14, stiffness: 280, mass: 1 };

// ---------------------------------------------------------------------------
// Reduced-motion awareness
// ---------------------------------------------------------------------------

let reducedMotionCache: boolean | null = null;
let reducedMotionListenerInstalled = false;

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(reducedMotionCache ?? false);
  React.useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (cancelled) return;
      reducedMotionCache = v;
      setReduced(v);
    });
    if (!reducedMotionListenerInstalled) {
      reducedMotionListenerInstalled = true;
      AccessibilityInfo.addEventListener?.('reduceMotionChanged', (next) => {
        reducedMotionCache = next;
      });
    }
    const sub = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (next) => setReduced(next),
    );
    return () => {
      cancelled = true;
      sub?.remove?.();
    };
  }, []);
  return reduced;
}

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

interface TextLikeProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  accessibilityLabel?: string;
}

export function Eyebrow({ children, style }: TextLikeProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.1}
      style={[txt.eyebrow, style]}
    >
      {children}
    </Text>
  );
}

export function DisplayTitle({ children, style }: TextLikeProps) {
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={1.15}
      style={[txt.display, style]}
    >
      {children}
    </Text>
  );
}

export function HeroHeadline({ children, style }: TextLikeProps) {
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={1.15}
      style={[txt.hero, style]}
    >
      {children}
    </Text>
  );
}

export function SectionHeading({ children, style }: TextLikeProps) {
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={1.2}
      style={[txt.section, style]}
    >
      {children}
    </Text>
  );
}

export function StepTitle({ children, style }: TextLikeProps) {
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={1.2}
      style={[txt.stepTitle, style]}
    >
      {children}
    </Text>
  );
}

export function Body({ children, style, numberOfLines }: TextLikeProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.25}
      numberOfLines={numberOfLines}
      style={[txt.body, style]}
    >
      {children}
    </Text>
  );
}

export function Supporting({ children, style }: TextLikeProps) {
  return (
    <Text maxFontSizeMultiplier={1.25} style={[txt.supporting, style]}>
      {children}
    </Text>
  );
}

export function Meta({ children, style }: TextLikeProps) {
  return (
    <Text maxFontSizeMultiplier={1.25} style={[txt.meta, style]}>
      {children}
    </Text>
  );
}

const txt = StyleSheet.create({
  eyebrow: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 11,
    letterSpacing: 1.6,
    color: V26.terracottaText,
    textTransform: 'uppercase',
  },
  display: {
    fontFamily: V26_TYPE.serif,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: V26.ink,
  },
  hero: {
    fontFamily: V26_TYPE.serif,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: V26.ink,
  },
  section: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 17,
    lineHeight: 22,
    color: V26.ink,
    letterSpacing: -0.1,
  },
  stepTitle: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 20,
    lineHeight: 25,
    color: V26.ink,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: V26_TYPE.sans,
    fontSize: 15.5,
    lineHeight: 22,
    color: V26.inkSecondary,
  },
  supporting: {
    fontFamily: V26_TYPE.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: V26.inkMuted,
  },
  meta: {
    fontFamily: V26_TYPE.sansMed,
    fontSize: 12,
    lineHeight: 17,
    color: V26.inkMuted,
    letterSpacing: 0.1,
  },
});

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

type SurfaceTone = 'paper' | 'surface' | 'clay' | 'guardrail' | 'mist';

interface SurfaceProps {
  tone?: SurfaceTone;
  hero?: boolean;
  elevated?: boolean;
  bordered?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const TONE_MAP: Record<SurfaceTone, { bg: string; border: string }> = {
  paper:     { bg: V26.paper,             border: V26.border },
  surface:   { bg: V26.surface,           border: V26.border },
  clay:      { bg: V26.clayTint,          border: V26.clayTint },
  guardrail: { bg: V26.guardrailSurface,  border: V26.guardrailSurface },
  mist:      { bg: V26.clayMist,          border: V26.clayMist },
};

export function Surface({
  tone = 'surface',
  hero,
  elevated,
  bordered = true,
  children,
  style,
  accessibilityLabel,
}: SurfaceProps) {
  const meta = TONE_MAP[tone];
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[
        surf.base,
        hero && surf.hero,
        bordered && { borderColor: meta.border, borderWidth: 1 },
        { backgroundColor: meta.bg },
        elevated ? V26_SHADOW.hero : V26_SHADOW.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const surf = StyleSheet.create({
  base: {
    borderRadius: V26_RADIUS.card,
    padding: V26_SPACE.cardPad,
  },
  hero: {
    borderRadius: V26_RADIUS.hero,
    padding: V26_SPACE.heroPad,
  },
});

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type BtnVariant = 'ink' | 'terracotta' | 'ghost';

interface PrimaryActionProps {
  label: string;
  onPress: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PrimaryAction({
  label,
  onPress,
  variant = 'ink',
  disabled,
  full = true,
  style,
  accessibilityLabel,
}: PrimaryActionProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const reduced = useReducedMotion();

  const variants: Record<BtnVariant, { bg: string; fg: string; border?: string }> = {
    ink: { bg: V26.ctaDarkFill, fg: V26.ctaDarkText },
    terracotta: { bg: V26.terracotta, fg: '#FCFAF7' },
    ghost: { bg: 'transparent', fg: V26.ink, border: V26.borderStrong },
  };
  const m = variants[variant];

  return (
    <AnimatedPressable
      onPress={() => {
        if (disabled) return;
        hapt.tap();
        if (!reduced) {
          scale.value = withSpring(0.985, { damping: 14, stiffness: 320 }, () => {
            scale.value = withSpring(1, { damping: 14, stiffness: 320 });
          });
        }
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        btn.primary,
        full && { alignSelf: 'stretch' },
        {
          backgroundColor: m.bg,
          borderColor: m.border ?? 'transparent',
          borderWidth: m.border ? 1 : 0,
        },
        disabled && { opacity: 0.45 },
        animated,
        style,
      ]}
    >
      <Text
        style={[btn.primaryLabel, { color: m.fg }]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.15}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

interface SecondaryActionProps {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /** Subtle text-only button. */
  tone?: 'muted' | 'terracotta';
  disabled?: boolean;
}

export function SecondaryAction({
  label,
  onPress,
  style,
  tone = 'terracotta',
  disabled,
}: SecondaryActionProps) {
  const color =
    tone === 'terracotta' ? V26.terracottaText : V26.inkMuted;
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        hapt.tap();
        onPress();
      }}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        btn.secondary,
        pressed && { opacity: 0.6 },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      <Text
        style={[btn.secondaryLabel, { color }]}
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const btn = StyleSheet.create({
  primary: {
    height: 54,
    borderRadius: V26_RADIUS.pill,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 16,
    letterSpacing: 0.1,
  },
  secondary: {
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  secondaryLabel: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 14,
    letterSpacing: 0.1,
    textDecorationLine: 'underline',
  },
});

// ---------------------------------------------------------------------------
// Progress dots — quiet ritual indicator
// ---------------------------------------------------------------------------

interface ProgressDotsProps {
  total: number;
  completed: number;
  /** When true, mark the next undone step as the active dot (faint fill). */
  showActiveDot?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ProgressDots({
  total,
  completed,
  showActiveDot,
  style,
}: ProgressDotsProps) {
  return (
    <View style={[dots.row, style]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: completed }}>
      {Array.from({ length: total }).map((_, i) => {
        const isDone = i < completed;
        const isActive = !isDone && showActiveDot && i === completed;
        return (
          <View
            key={i}
            style={[
              dots.dot,
              isDone && dots.dotDone,
              isActive && dots.dotActive,
            ]}
          />
        );
      })}
    </View>
  );
}

const dots = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: V26.trackNeutral,
  },
  dotDone: {
    backgroundColor: V26.terracotta,
  },
  dotActive: {
    backgroundColor: V26.clayTint,
  },
});

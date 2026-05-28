/**
 * pura27 — Shared UI primitives for the nightly experience.
 *
 * One file. Three screens. Every visual constant comes from
 * `theme/tokens.ts::pura27` — no hex literals live in here, no fixture
 * data lives in here. Each primitive is the minimum surface its
 * consumer needs; we deliberately stop short of building a kit, so the
 * three nightly screens stay legible.
 */

import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type AccessibilityProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Check } from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  pura27,
  pura27Layout,
  pura27Radius,
  pura27Shadow,
  pura27Space,
  pura27Type,
} from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

// ---------------------------------------------------------------------------
// PuraScreen — safe-area-aware wrapper, max-width centered on web.
// ---------------------------------------------------------------------------

export interface PuraScreenProps {
  children: React.ReactNode;
  /** When true, content is wrapped in a vertical ScrollView. */
  scroll?: boolean;
  /** Reserve bottom padding for the floating tab bar. */
  withBottomTabPadding?: boolean;
  /** Additional padding on the scrollview content container. */
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function PuraScreen({
  children,
  scroll = true,
  withBottomTabPadding = true,
  contentContainerStyle,
  testID,
}: PuraScreenProps) {
  const insets = useSafeAreaInsets();
  const bottom = withBottomTabPadding
    ? pura27Layout.bottomClearance(insets.bottom)
    : insets.bottom + 16;

  const inner = (
    <View style={screenStyles.maxWidth}>{children}</View>
  );

  return (
    <SafeAreaView style={screenStyles.safe} edges={['top']} testID={testID}>
      {scroll ? (
        <ScrollView
          style={screenStyles.scroll}
          contentContainerStyle={[
            screenStyles.scrollContent,
            { paddingBottom: bottom },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {inner}
        </ScrollView>
      ) : (
        <View
          style={[
            screenStyles.staticContent,
            { paddingBottom: bottom },
            contentContainerStyle,
          ]}
        >
          {inner}
        </View>
      )}
    </SafeAreaView>
  );
}

const screenStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: pura27.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 4,
  },
  staticContent: {
    flex: 1,
    paddingTop: 4,
  },
  maxWidth: {
    width: '100%',
    maxWidth: pura27Layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: pura27Layout.horizontalPadding,
  },
});

// ---------------------------------------------------------------------------
// SectionLabel — uppercase metadata.
// ---------------------------------------------------------------------------

export interface SectionLabelProps {
  children: string;
  tone?: 'default' | 'accent' | 'success';
  style?: StyleProp<TextStyle>;
}

export function SectionLabel({
  children,
  tone = 'default',
  style,
}: SectionLabelProps) {
  const toneColor =
    tone === 'accent'
      ? pura27.accentText
      : tone === 'success'
      ? pura27.success
      : pura27.inkTertiary;
  return (
    <Text
      accessibilityRole="text"
      maxFontSizeMultiplier={1.2}
      style={[labelStyles.label, { color: toneColor }, style]}
    >
      {children}
    </Text>
  );
}

const labelStyles = StyleSheet.create({
  label: {
    ...pura27Type.metadata,
  },
});

// ---------------------------------------------------------------------------
// StatusPill — single-line status indicator. Text + color, not color alone.
// ---------------------------------------------------------------------------

export type StatusPillVariant =
  | 'accent'
  | 'success'
  | 'warning'
  | 'neutral'
  | 'info';

export interface StatusPillProps {
  label: string;
  variant?: StatusPillVariant;
  style?: StyleProp<ViewStyle>;
}

const STATUS_VARIANT: Record<
  StatusPillVariant,
  { bg: string; fg: string; border: string }
> = {
  accent: {
    bg: pura27.accentSoft,
    fg: pura27.accentText,
    border: pura27.activeBorder,
  },
  success: {
    bg: pura27.successBackground,
    fg: pura27.success,
    border: pura27.successBackground,
  },
  warning: {
    bg: pura27.warningBackground,
    fg: pura27.warning,
    border: pura27.warningBackground,
  },
  info: {
    bg: pura27.infoBackground,
    fg: pura27.info,
    border: pura27.infoBackground,
  },
  neutral: {
    bg: pura27.backgroundSoft,
    fg: pura27.inkSecondary,
    border: pura27.border,
  },
};

export function StatusPill({
  label,
  variant = 'neutral',
  style,
}: StatusPillProps) {
  const v = STATUS_VARIANT[variant];
  return (
    <View
      style={[
        pillStyles.pill,
        {
          backgroundColor: pura27.surface,
          borderColor: pura27.border,
        },
        style,
      ]}
    >
      <View style={[pillStyles.dot, { backgroundColor: v.fg }]} />
      <Text
        maxFontSizeMultiplier={1.2}
        style={[pillStyles.label, { color: pura27.ink }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: pura27Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
    letterSpacing: 0,
    color: pura27.ink,
  },
});

// ---------------------------------------------------------------------------
// SegmentedTabs — accessible, animated underline, never clips on 360.
// ---------------------------------------------------------------------------

export interface SegmentedTab<T extends string> {
  key: T;
  label: string;
}

export interface SegmentedTabsProps<T extends string> {
  tabs: readonly SegmentedTab<T>[];
  value: T;
  onChange: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  style,
}: SegmentedTabsProps<T>) {
  const idx = Math.max(
    0,
    tabs.findIndex((t) => t.key === value),
  );
  const sharedIdx = useSharedValue(idx);

  React.useEffect(() => {
    sharedIdx.value = withTiming(idx, {
      duration: 220,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [idx, sharedIdx]);

  const [layoutWidth, setLayoutWidth] = React.useState(0);
  const segWidth = layoutWidth > 0 ? layoutWidth / tabs.length : 0;

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sharedIdx.value * segWidth }],
    width: segWidth,
  }));

  return (
    <View
      onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
      style={[tabStyles.row, style]}
    >
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            hitSlop={6}
            onPress={() => {
              if (selected) return;
              // Selection feedback — a tap on the tab strip should
              // register physically the same way iOS segmented controls
              // do. Safe-fails silently on platforms without haptics.
              Haptics.selectionAsync().catch(() => {});
              onChange(tab.key);
            }}
            style={({ pressed }) => [
              tabStyles.tab,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.2}
              style={[
                tabStyles.tabLabel,
                {
                  color: selected ? pura27.ink : pura27.inkTertiary,
                  fontFamily: selected ? 'Inter-SemiBold' : 'Inter-Medium',
                },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
      {segWidth > 0 ? (
        <Animated.View style={[tabStyles.underline, underlineStyle]} />
      ) : null}
      <View style={tabStyles.underlineTrack} />
    </View>
  );
}

const tabStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    position: 'relative',
    marginTop: 4,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 14,
    letterSpacing: -0.1,
  },
  underlineTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: pura27.border,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: pura27.ink,
    borderRadius: 1,
  },
});

// ---------------------------------------------------------------------------
// PrimaryButton — 58pt pill, near-black, full-width by default.
// ---------------------------------------------------------------------------

export interface PrimaryButtonProps extends AccessibilityProps {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** True after a successful confirmed action (changes color + label). */
  confirmed?: boolean;
  confirmedLabel?: string;
  size?: 'lg' | 'md';
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled,
  confirmed,
  confirmedLabel,
  size = 'lg',
  style,
  ...a11y
}: PrimaryButtonProps) {
  const height =
    size === 'md'
      ? pura27Layout.compactButtonHeight
      : pura27Layout.primaryButtonHeight;
  const reduce = useReduceMotion();

  // Press-scale signature: subtle 0.97 squish on touch, spring back on
  // release. The single spring config matches the rest of the v25 system.
  const scale = useSharedValue(1);
  const handlePressIn = () => {
    if (reduce) return;
    scale.value = withSpring(0.97, {
      damping: 22,
      stiffness: 320,
      mass: 0.8,
    });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 18,
      stiffness: 260,
      mass: 0.9,
    });
  };
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={6}
      {...a11y}
      style={({ pressed }) => [
        buttonStyles.button,
        {
          height,
          backgroundColor: disabled
            ? pura27.buttonDisabled
            : confirmed
            ? pura27.success
            : pressed
            ? pura27.buttonPressed
            : pura27.buttonPrimary,
          opacity: disabled ? 0.85 : 1,
        },
        Platform.OS === 'web' ? buttonStyles.buttonWeb : null,
        animatedStyle,
        style,
      ]}
    >
      {confirmed ? (
        <Animated.View
          entering={reduce ? undefined : FadeIn.duration(180)}
          style={buttonStyles.confirmedIcon}
        >
          <Check size={18} color={pura27.white} weight="bold" />
        </Animated.View>
      ) : icon ? (
        <View style={buttonStyles.icon}>{icon}</View>
      ) : null}
      <Text
        maxFontSizeMultiplier={1.15}
        style={buttonStyles.label}
        numberOfLines={1}
      >
        {confirmed ? confirmedLabel ?? label : label}
      </Text>
    </AnimatedPressable>
  );
}

const buttonStyles = StyleSheet.create({
  button: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: pura27Radius.pill,
    paddingHorizontal: 24,
    gap: 10,
  },
  buttonWeb: { cursor: 'pointer' as any },
  icon: { marginRight: 2 },
  confirmedIcon: { marginRight: 2 },
  label: {
    ...pura27Type.button,
    color: pura27.white,
  },
});

// ---------------------------------------------------------------------------
// SecondaryButton — outlined, used for "skip" / "another option".
// ---------------------------------------------------------------------------

export interface SecondaryButtonProps extends AccessibilityProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
  style,
  ...a11y
}: SecondaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      hitSlop={6}
      {...a11y}
      style={({ pressed }) => [
        secondaryStyles.button,
        {
          backgroundColor: pressed ? pura27.backgroundSoft : 'transparent',
        },
        Platform.OS === 'web' ? { cursor: 'pointer' as any } : null,
        style,
      ]}
    >
      <Text
        maxFontSizeMultiplier={1.15}
        style={secondaryStyles.label}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const secondaryStyles = StyleSheet.create({
  button: {
    minHeight: pura27Layout.compactButtonHeight,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: pura27Radius.pill,
    borderWidth: 1,
    borderColor: pura27.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...pura27Type.button,
    color: pura27.ink,
  },
});

// ---------------------------------------------------------------------------
// TextLink — tertiary inline action.
// ---------------------------------------------------------------------------

export interface TextLinkProps extends AccessibilityProps {
  label: string;
  onPress: () => void;
  align?: 'left' | 'center';
  style?: StyleProp<ViewStyle>;
}

export function TextLink({
  label,
  onPress,
  align = 'left',
  style,
  ...a11y
}: TextLinkProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      hitSlop={8}
      {...a11y}
      style={({ pressed }) => [
        linkStyles.wrap,
        align === 'center' && linkStyles.center,
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      <Text maxFontSizeMultiplier={1.2} style={linkStyles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const linkStyles = StyleSheet.create({
  wrap: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  center: {
    alignSelf: 'center',
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    color: pura27.accentText,
    letterSpacing: -0.1,
  },
});

// ---------------------------------------------------------------------------
// Card — base surface for grouped content.
// ---------------------------------------------------------------------------

export interface CardProps {
  children: React.ReactNode;
  variant?: 'surface' | 'warm' | 'accent';
  hero?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  variant = 'surface',
  hero = false,
  style,
}: CardProps) {
  const bg =
    variant === 'warm'
      ? pura27.surfaceWarm
      : variant === 'accent'
      ? pura27.accentSoft
      : pura27.surface;
  return (
    <View
      style={[
        cardStyles.card,
        { backgroundColor: bg, borderColor: variant === 'accent' ? pura27.activeBorder : pura27.border },
        hero ? cardStyles.hero : null,
        hero ? pura27Shadow.elevated : pura27Shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: pura27Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: pura27Space.xxxl,
  },
  hero: {
    borderRadius: pura27Radius.hero,
    padding: 26,
    minHeight: 270,
  },
});

// ---------------------------------------------------------------------------
// ProgressMeter — typed progress bar with accessible value.
// ---------------------------------------------------------------------------

export interface ProgressMeterProps {
  /** Current value (0–max). Clamped internally. */
  value: number;
  /** Max value (default 100). */
  max?: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProgressMeter({
  value,
  max = 100,
  height = 8,
  trackColor = pura27.backgroundSoft,
  fillColor = pura27.accent,
  accessibilityLabel,
  style,
}: ProgressMeterProps) {
  // Sanitize NaN / Infinity / negative inputs before they reach
  // Reanimated. `withTiming` to a NaN width crashes on Android and
  // produces a 0-width fill on web — both are silent failures.
  const safeMax =
    Number.isFinite(max) && max > 0 ? max : 0;
  const safeValue = Number.isFinite(value)
    ? Math.max(0, Math.min(safeMax, value))
    : 0;
  const ratio = safeMax === 0 ? 0 : safeValue / safeMax;
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(ratio, {
      duration: 640,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [ratio, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const percent = Math.round(ratio * 100);

  // Two-stop gradient on the fill — premium apps don't ship flat progress
  // bars. The gradient is computed from `fillColor` so callers that pass a
  // semantic color (accent/success/warning) get a tonally-correct wash. We
  // brighten the leading edge and tip slightly toward the deeper accent at
  // the tail so the fill reads as a single sweep, not a label.
  const gradientStops = React.useMemo<readonly [string, string]>(
    () => deriveGradient(fillColor),
    [fillColor],
  );

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ now: percent, min: 0, max: 100 }}
      accessibilityLabel={
        accessibilityLabel ?? `Progress: ${percent} percent`
      }
      style={[
        progressStyles.track,
        { height, backgroundColor: trackColor, borderRadius: height / 2 },
        style,
      ]}
    >
      <Animated.View
        style={[
          progressStyles.fill,
          { borderRadius: height / 2 },
          fillStyle,
        ]}
      >
        <LinearGradient
          colors={gradientStops as unknown as [string, string]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[progressStyles.gradient, { borderRadius: height / 2 }]}
        />
      </Animated.View>
    </View>
  );
}

/**
 * Pick a two-stop gradient for a progress fill based on the semantic
 * color the caller passed in. Each pair leans warmer at the leading
 * edge and deepens toward the tail — never a flat token to a flat
 * token.
 */
function deriveGradient(color: string): readonly [string, string] {
  switch (color) {
    case pura27.accent:
      return [pura27.accent, pura27.accentGradientDeep];
    case pura27.success:
      return [pura27.success, pura27.successGradientDeep];
    case pura27.warning:
      return [pura27.warning, pura27.warningGradientDeep];
    case pura27.info:
      return [pura27.info, pura27.infoGradientDeep];
    default:
      return [color, color];
  }
}

const progressStyles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
});

// ---------------------------------------------------------------------------
// Text helpers — display + body styles. Kept tiny on purpose; the screens
// compose Text directly when they need granular control.
// ---------------------------------------------------------------------------

export function DisplayHero({
  children,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={1.2}
      numberOfLines={numberOfLines}
      style={[textStyles.displayHero, style]}
    >
      {children}
    </Text>
  );
}

export function DisplayScreen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={1.2}
      style={[textStyles.displayScreen, style]}
    >
      {children}
    </Text>
  );
}

export function DisplayCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      maxFontSizeMultiplier={1.2}
      style={[textStyles.displayCard, style]}
    >
      {children}
    </Text>
  );
}

export function FunctionalTitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      maxFontSizeMultiplier={1.2}
      style={[textStyles.functionalTitle, style]}
    >
      {children}
    </Text>
  );
}

export function Body({
  children,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      numberOfLines={numberOfLines}
      style={[textStyles.body, style]}
    >
      {children}
    </Text>
  );
}

export function BodyLarge({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      style={[textStyles.bodyLarge, style]}
    >
      {children}
    </Text>
  );
}

const textStyles = StyleSheet.create({
  displayHero: { ...pura27Type.displayHero, color: pura27.ink },
  displayScreen: { ...pura27Type.displayScreen, color: pura27.ink },
  displayCard: { ...pura27Type.displayCard, color: pura27.ink },
  functionalTitle: { ...pura27Type.functionalTitle, color: pura27.ink },
  bodyLarge: { ...pura27Type.bodyLarge, color: pura27.inkSecondary },
  body: { ...pura27Type.body, color: pura27.inkSecondary },
});

// ---------------------------------------------------------------------------
// EmptyState / ErrorState — single shape, two intents.
// ---------------------------------------------------------------------------

export interface InfoStateProps {
  headline: string;
  body: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  variant?: 'empty' | 'error';
  style?: StyleProp<ViewStyle>;
}

export function InfoState({
  headline,
  body,
  primaryLabel,
  onPrimary,
  variant = 'empty',
  style,
}: InfoStateProps) {
  return (
    <Card variant={variant === 'error' ? 'warm' : 'surface'} style={style}>
      <DisplayCard>{headline}</DisplayCard>
      <Body style={infoStyles.body}>{body}</Body>
      {primaryLabel && onPrimary ? (
        <PrimaryButton
          label={primaryLabel}
          onPress={onPrimary}
          style={infoStyles.cta}
          accessibilityLabel={primaryLabel}
        />
      ) : null}
    </Card>
  );
}

const infoStyles = StyleSheet.create({
  body: { marginTop: 10 },
  cta: { marginTop: 20 },
});

// ---------------------------------------------------------------------------
// CountUp — animated integer reveal. Used for hero numbers ("Day 12 of 84")
// so the count earns its place on the screen rather than appearing instantly.
// Respects reduced motion: lands on the final value immediately.
// ---------------------------------------------------------------------------

export interface CountUpProps {
  value: number;
  /** Number of integer steps to ramp through before settling. */
  rampSteps?: number;
  /** Total animation duration in ms. */
  durationMs?: number;
  style?: StyleProp<TextStyle>;
}

export function CountUp({
  value,
  rampSteps = 3,
  durationMs = 540,
  style,
}: CountUpProps) {
  const reduce = useReduceMotion();
  const [display, setDisplay] = React.useState<number>(
    reduce ? value : Math.max(0, value - rampSteps),
  );

  React.useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    if (display === value) return;
    const start = Math.max(0, value - rampSteps);
    setDisplay(start);
    const stepMs = Math.max(60, Math.floor(durationMs / (value - start || 1)));
    let current = start;
    const tick = () => {
      current += 1;
      if (current >= value) {
        setDisplay(value);
        return;
      }
      setDisplay(current);
      timer = setTimeout(tick, stepMs);
    };
    let timer = setTimeout(tick, stepMs);
    return () => clearTimeout(timer);
    // We intentionally only react to changes in `value`; `display` is
    // owned by this effect and a self-reference would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce, rampSteps, durationMs]);

  return (
    <Text maxFontSizeMultiplier={1.2} style={style}>
      {display}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// BreathGlow — slow opacity pulse for the hero-module blush halo. The pulse
// runs forever at a calm 3.5s cycle, reduced-motion-aware (renders a static
// halo at the mid-opacity when reduced motion is on).
// ---------------------------------------------------------------------------

export interface BreathGlowProps {
  /** Base color (terracotta blush by default). */
  color?: string;
  /** Size of the glow in points. */
  size?: number;
  /** Position styling — caller anchors the glow inside its hero frame. */
  style?: StyleProp<ViewStyle>;
  /** Opacity peak (default 0.6). */
  peakOpacity?: number;
  /** Opacity trough (default 0.38). */
  troughOpacity?: number;
}

export function BreathGlow({
  color = pura27.blush,
  size = 240,
  style,
  peakOpacity = 0.6,
  troughOpacity = 0.38,
}: BreathGlowProps) {
  const reduce = useReduceMotion();
  const opacity = useSharedValue(peakOpacity);

  React.useEffect(() => {
    if (reduce) {
      opacity.value = (peakOpacity + troughOpacity) / 2;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(troughOpacity, {
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(peakOpacity, {
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      true,
    );
  }, [reduce, opacity, peakOpacity, troughOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        glowStyles.glow,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
        animatedStyle,
      ]}
    />
  );
}

const glowStyles = StyleSheet.create({
  glow: {
    position: 'absolute',
  },
});

// ---------------------------------------------------------------------------
// HeaderRow — small reusable: screen title + metadata line + optional action.
// ---------------------------------------------------------------------------

export interface HeaderRowProps {
  title: string;
  meta?: string;
  rightSlot?: React.ReactNode;
}

export function HeaderRow({ title, meta, rightSlot }: HeaderRowProps) {
  return (
    <View style={headerStyles.wrap}>
      <View style={headerStyles.titleRow}>
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={1.2}
          style={headerStyles.title}
        >
          {title}
        </Text>
        {rightSlot ?? null}
      </View>
      {meta ? <SectionLabel style={headerStyles.meta}>{meta}</SectionLabel> : null}
    </View>
  );
}

const headerStyles = StyleSheet.create({
  wrap: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    ...pura27Type.screenTitle,
    color: pura27.ink,
  },
  meta: {
    marginTop: 8,
  },
});

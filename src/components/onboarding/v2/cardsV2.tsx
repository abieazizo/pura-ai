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
import { Check } from 'phosphor-react-native';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { PURA, PURA_FONT, PURA_RADIUS, PURA_SHADOW } from './tokensV2';

/**
 * v25 — onboarding selection / display cards.
 *
 * SelectCard: tappable single-select with warm clay selected state.
 * TrustRow: icon + title + body row used on Camera Trust.
 * SignalCard: small key/value tile used on Welcome preview + Baseline reveal.
 * WarmInfoPanel: small panel used for adaptive promises and boundary
 *   language. Never blue.
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_SPRING = { damping: 15, stiffness: 300, mass: 1 };

// ---------------------------------------------------------------------------
// SelectCard
// ---------------------------------------------------------------------------

export interface SelectCardProps {
  label: string;
  helper?: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  Icon?: React.ComponentType<PhosphorIconProps> | null;
  /** Optional small badge (e.g. "Recommended when starting cautiously"). */
  badge?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function SelectCard({
  label,
  helper,
  selected,
  onSelect,
  disabled,
  Icon,
  badge,
  style,
  accessibilityLabel,
}: SelectCardProps) {
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
    onSelect();
  };

  return (
    <AnimatedPressable
      onPress={handle}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
      accessibilityHint={helper}
      style={[
        cardStyles.card,
        selected ? cardStyles.cardSelected : cardStyles.cardIdle,
        disabled && cardStyles.cardDisabled,
        animated,
        style,
      ]}
    >
      {Icon ? (
        <View style={cardStyles.iconWrap}>
          <Icon
            size={22}
            color={selected ? PURA.terracotta : PURA.body}
            weight="duotone"
          />
        </View>
      ) : null}
      <View style={cardStyles.textCol}>
        <View style={cardStyles.labelRow}>
          <Text
            style={cardStyles.label}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {label}
          </Text>
          {badge ? (
            <View style={cardStyles.badge}>
              <Text style={cardStyles.badgeText} maxFontSizeMultiplier={1.1}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        {helper ? (
          <Text
            style={cardStyles.helper}
            numberOfLines={2}
            maxFontSizeMultiplier={1.2}
          >
            {helper}
          </Text>
        ) : null}
      </View>
      <View style={cardStyles.tickWrap}>
        {selected ? (
          <Check size={20} color={PURA.terracotta} weight="bold" />
        ) : (
          <View style={cardStyles.tickSpacer} />
        )}
      </View>
    </AnimatedPressable>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: PURA_RADIUS.card,
    minHeight: 72,
  },
  cardIdle: {
    backgroundColor: PURA.paperRaised,
    borderWidth: 1,
    borderColor: PURA.border,
  },
  cardSelected: {
    backgroundColor: PURA.claySelected,
    borderWidth: 1.5,
    borderColor: PURA.terracotta,
  },
  cardDisabled: {
    opacity: 0.45,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
    marginRight: 14,
  },
  textCol: { flex: 1 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  label: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 16,
    color: PURA.ink,
    letterSpacing: -0.1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: PURA_RADIUS.pill,
    backgroundColor: PURA.claySupport,
  },
  badgeText: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 10,
    letterSpacing: 0.3,
    color: PURA.terracotta,
  },
  helper: {
    fontFamily: PURA_FONT.sans,
    fontSize: 14,
    lineHeight: 19,
    color: PURA.body,
    marginTop: 4,
  },
  tickWrap: {
    width: 24,
    alignItems: 'flex-end',
  },
  tickSpacer: { width: 20 },
});

// ---------------------------------------------------------------------------
// TrustRow
// ---------------------------------------------------------------------------

export interface TrustRowProps {
  Icon: React.ComponentType<PhosphorIconProps>;
  title: string;
  body: string;
}

export function TrustRow({ Icon, title, body }: TrustRowProps) {
  return (
    <View style={trustStyles.row} accessibilityRole="text">
      <View style={trustStyles.iconWrap}>
        <Icon size={20} color={PURA.terracotta} weight="duotone" />
      </View>
      <View style={trustStyles.text}>
        <Text style={trustStyles.title} maxFontSizeMultiplier={1.2}>
          {title}
        </Text>
        <Text style={trustStyles.body} maxFontSizeMultiplier={1.25}>
          {body}
        </Text>
      </View>
    </View>
  );
}

const trustStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PURA.claySupport,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  text: { flex: 1, paddingTop: 2 },
  title: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 15,
    lineHeight: 20,
    color: PURA.ink,
  },
  body: {
    fontFamily: PURA_FONT.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: PURA.body,
    marginTop: 3,
  },
});

// ---------------------------------------------------------------------------
// SignalCard
// ---------------------------------------------------------------------------

export interface SignalCardProps {
  /** Small label/eyebrow above the title. */
  label: string;
  /** Primary observed value. */
  value: string;
  /** Optional supporting line. */
  detail?: string;
  /** Optional terracotta dot when meaningful (e.g. primary focus signal). */
  emphasis?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SignalCard({
  label,
  value,
  detail,
  emphasis,
  style,
}: SignalCardProps) {
  return (
    <View style={[signalStyles.card, style]}>
      <View style={signalStyles.row}>
        <Text style={signalStyles.label} maxFontSizeMultiplier={1.1}>
          {label}
        </Text>
        {emphasis ? <View style={signalStyles.dot} /> : null}
      </View>
      <Text style={signalStyles.value} maxFontSizeMultiplier={1.2}>
        {value}
      </Text>
      {detail ? (
        <Text style={signalStyles.detail} maxFontSizeMultiplier={1.25}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

const signalStyles = StyleSheet.create({
  card: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: PURA_RADIUS.card,
    backgroundColor: PURA.paperRaised,
    borderWidth: 1,
    borderColor: PURA.border,
    ...PURA_SHADOW.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: PURA.muted,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PURA.terracotta,
  },
  value: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 17,
    lineHeight: 22,
    color: PURA.ink,
    marginTop: 8,
  },
  detail: {
    fontFamily: PURA_FONT.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: PURA.body,
    marginTop: 4,
  },
});

// ---------------------------------------------------------------------------
// WarmInfoPanel
// ---------------------------------------------------------------------------

export interface WarmInfoPanelProps {
  /** Optional small icon rendered on the left. */
  Icon?: React.ComponentType<PhosphorIconProps>;
  /** Optional eyebrow above the body. */
  eyebrow?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** When true, the panel uses the very subtle clay tint. */
  tone?: 'clay' | 'paper';
}

export function WarmInfoPanel({
  Icon,
  eyebrow,
  children,
  style,
  tone = 'clay',
}: WarmInfoPanelProps) {
  return (
    <View
      style={[
        panelStyles.panel,
        tone === 'paper' ? panelStyles.tonePaper : panelStyles.toneClay,
        style,
      ]}
      accessibilityRole="text"
    >
      {Icon ? (
        <View style={panelStyles.icon}>
          <Icon size={16} color={PURA.terracotta} weight="duotone" />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <Text style={panelStyles.eyebrow} maxFontSizeMultiplier={1.1}>
            {eyebrow}
          </Text>
        ) : null}
        {typeof children === 'string' ? (
          <Text style={panelStyles.body} maxFontSizeMultiplier={1.25}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

const panelStyles = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: PURA_RADIUS.card,
    borderWidth: 1,
  },
  toneClay: {
    backgroundColor: PURA.claySubtle,
    borderColor: PURA.border,
  },
  tonePaper: {
    backgroundColor: PURA.paperRaised,
    borderColor: PURA.border,
  },
  icon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  eyebrow: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 10,
    letterSpacing: 1.4,
    color: PURA.terracotta,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  body: {
    fontFamily: PURA_FONT.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: PURA.body,
  },
});

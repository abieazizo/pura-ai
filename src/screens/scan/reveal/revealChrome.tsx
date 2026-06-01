/**
 * Shared chrome for the reveal arc: the top header (PURA eyebrow / back arrow
 * + step counter), the floating Next pill, the full-width Ink CTA, and a quiet
 * text link. Kept here so all six reveal surfaces stay pixel-consistent.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { ArrowLeft, CaretRight, X } from 'phosphor-react-native';
import { puraReveal, puraRevealRadius, puraRevealShadow, puraRevealType } from '@/theme/tokens';
import { hapt } from '@/utils/haptics';

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function RevealHeader({
  step,
  total = 6,
  onBack,
  onClose,
}: {
  step: number;
  total?: number;
  onBack?: () => void;
  onClose?: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {onBack ? (
          <Pressable
            onPress={() => {
              hapt.tap();
              onBack();
            }}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <ArrowLeft size={18} weight="bold" color={puraReveal.ink} />
          </Pressable>
        ) : (
          <Text style={[puraRevealType.eyebrow, { color: puraReveal.blue }]}>PURA</Text>
        )}
      </View>

      <View style={styles.headerRight}>
        <Text style={[puraRevealType.stepCounter, { color: puraReveal.veryMuted }]}>
          {step} of {total}
        </Text>
        {onClose ? (
          <Pressable
            onPress={() => {
              hapt.tap();
              onClose();
            }}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.iconBtn, styles.closeBtn, pressed && styles.pressed]}
          >
            <X size={15} weight="bold" color={puraReveal.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Floating Next pill (screens 2–5)
// ---------------------------------------------------------------------------

export function FloatingNext({
  onPress,
  label = 'Next',
  style,
}: {
  onPress: () => void;
  label?: string;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={() => {
        hapt.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.next, pressed && styles.nextPressed, style]}
    >
      <Text style={[puraRevealType.cta, { color: puraReveal.onInk }]}>{label}</Text>
      <CaretRight size={16} weight="bold" color={puraReveal.onInk} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Full-width Ink CTA (screen 6, ceremony, routine)
// ---------------------------------------------------------------------------

export function RevealCTA({
  label,
  onPress,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={() => {
        hapt.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, style]}
    >
      <Text style={[puraRevealType.cta, { color: puraReveal.onInk }]}>{label}</Text>
      {icon}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Quiet text link
// ---------------------------------------------------------------------------

export function RevealLink({
  label,
  onPress,
  tone = 'muted',
}: {
  label: string;
  onPress: () => void;
  tone?: 'muted' | 'blue';
}) {
  return (
    <Pressable
      onPress={() => {
        hapt.tap();
        onPress();
      }}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
    >
      <Text
        style={[
          puraRevealType.link,
          { color: tone === 'blue' ? puraReveal.blue : puraReveal.muted },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 34,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  closeBtn: {
    backgroundColor: puraReveal.porcelain,
    marginLeft: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  pressed: {
    opacity: 0.6,
    transform: [{ scale: 0.96 }],
  },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: puraReveal.blue,
    paddingLeft: 22,
    paddingRight: 18,
    height: 52,
    borderRadius: puraRevealRadius.pill,
    ...puraRevealShadow.float,
  },
  nextPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: puraReveal.ctaInk,
    height: 58,
    borderRadius: puraRevealRadius.cta,
    ...puraRevealShadow.cta,
  },
  ctaPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  link: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
});

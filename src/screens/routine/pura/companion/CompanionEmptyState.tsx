/**
 * Companion empty states — the routine surface before a routine exists.
 *
 * Same shell as the live companion (porcelain page, the quiet vertical
 * spine at rest, the "Routine" header) but the hero slot holds a single
 * call-to-action and the greeting / upcoming / completed zones stay
 * hidden. Two variants: no scan captured yet, or a scan that hasn't been
 * turned into a routine. One clear next step, nothing else.
 *
 * Presentational. The host owns lifecycle and the scan / build calls.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Sparkle } from 'phosphor-react-native';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hapt } from '@/utils/haptics';
import {
  CC,
  CELEBRATION_GRADIENT,
  companionGeo,
  companionMotion,
  companionShadows,
  companionType,
} from './companionTokens';
import { VerticalProgressLine } from './VerticalProgressLine';

function formatToday(d: Date = new Date()): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export type CompanionEmptyVariant = 'no_scan' | 'scan_no_routine';

export interface CompanionEmptyStateProps {
  variant: CompanionEmptyVariant;
  /** The single clear next step. */
  onPrimary: () => void;
  /** Optional quiet escape (e.g. revisit the scan results). */
  onSecondary?: () => void;
  secondaryLabel?: string;
}

const COPY: Record<
  CompanionEmptyVariant,
  { eyebrow: string; title: string; body: string; cta: string }
> = {
  no_scan: {
    eyebrow: 'NO SCAN YET',
    title: 'Let’s see your skin.',
    body: 'Take a quick scan and I’ll build a routine matched to what I find.',
    cta: 'Take your first scan',
  },
  scan_no_routine: {
    eyebrow: 'SCAN READY',
    title: 'Your scan’s ready.',
    body: 'I’ll turn your focus areas into a simple, ordered routine.',
    cta: 'Build my routine',
  },
};

export function CompanionEmptyState({
  variant,
  onPrimary,
  onSecondary,
  secondaryLabel,
}: CompanionEmptyStateProps) {
  const reduceMotion = useReduceMotion();
  const reveal = useSharedValue(0);

  useFocusEffect(
    React.useCallback(() => {
      if (reduceMotion) {
        reveal.value = 1;
        return;
      }
      reveal.value = 0;
      reveal.value = withTiming(1, {
        duration: companionMotion.reveal,
        easing: Easing.linear,
      });
    }, [reduceMotion, reveal]),
  );

  const headerStyle = useAnimatedStyle(() => {
    const t = Math.min(1, reveal.value / 0.45);
    return { opacity: t, transform: [{ translateY: 6 * (1 - t) }] };
  });
  const cardStyle = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (reveal.value - 0.15) / 0.7));
    const e = 1 - (1 - t) * (1 - t) * (1 - t);
    return { opacity: e, transform: [{ translateY: 16 * (1 - e) }] };
  });

  const copy = COPY[variant];
  const Icon = variant === 'no_scan' ? Camera : Sparkle;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.header, headerStyle]}>
            <View style={styles.titleLeft}>
              <Text style={companionType.pageTitle}>Routine</Text>
              <Sparkle
                size={18}
                weight="fill"
                color={CC.blue}
                style={styles.sparkle}
              />
            </View>
            <Text style={[companionType.date, styles.date]}>{formatToday()}</Text>
          </Animated.View>

          <Animated.View style={[styles.heroWrap, cardStyle]}>
            <View style={[styles.card, companionShadows.hero]}>
              <LinearGradient
                colors={CELEBRATION_GRADIENT}
                locations={[0, 0.5, 1]}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.inner}>
                <View style={styles.iconHalo}>
                  <LinearGradient
                    colors={['rgba(20, 124, 255, 0.16)', 'rgba(20, 124, 255, 0.03)']}
                    start={{ x: 0.3, y: 0.2 }}
                    end={{ x: 0.8, y: 0.95 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 34 }]}
                  />
                  <Icon size={30} weight="regular" color={CC.blue} />
                </View>
                <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
                <Text style={[companionType.celebrationTitle, styles.title]}>
                  {copy.title}
                </Text>
                <Text style={[companionType.celebrationSubtitle, styles.body]}>
                  {copy.body}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.cta}
                  onPress={() => {
                    hapt.tap();
                    onPrimary();
                  }}
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={companionType.button}>{copy.cta}</Text>
                </Pressable>
                {onSecondary ? (
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => {
                      hapt.select();
                      onSecondary();
                    }}
                    style={styles.secondary}
                  >
                    <Text style={styles.secondaryText}>
                      {secondaryLabel ?? 'View scan results'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Zone 0 — the spine, present but at rest. */}
        <VerticalProgressLine ratio={0} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CC.porcelain,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkle: {
    marginLeft: 7,
    marginTop: 2,
  },
  date: {
    marginTop: 4,
  },
  heroWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: companionGeo.screenMargin,
    paddingTop: 12,
    paddingBottom: 24,
  },
  card: {
    borderRadius: companionGeo.heroRadius,
    backgroundColor: CC.white,
    minHeight: 340,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  iconHalo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(20, 124, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: CC.blue,
    marginBottom: 14,
  },
  title: {
    // Right-size the empty-state hero serif to match the live companion.
    fontSize: 31,
    lineHeight: 35,
    letterSpacing: -0.7,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  body: {
    maxWidth: 296,
    lineHeight: 21,
    marginBottom: 28,
  },
  button: {
    ...companionShadows.button,
    height: companionGeo.buttonHeight,
    borderRadius: companionGeo.buttonRadius,
    backgroundColor: CC.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    minWidth: 220,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.96,
  },
  secondary: {
    marginTop: 16,
    paddingVertical: 6,
  },
  secondaryText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 18,
    color: CC.muted,
  },
});

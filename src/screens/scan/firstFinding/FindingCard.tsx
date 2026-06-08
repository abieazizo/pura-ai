/**
 * FindingCard — the first finding, in a RAISED card. Header (name + plain-word
 * level pill), three micro-rows with breathing room (What I see / What it means /
 * THE MOVE), and an italic confidence line. Settles y+16 + opacity 0→1.
 *
 * Plain language only — labels and the model's own words, no jargon. The level
 * pill is the plain WORD ("a little" / "some" / "a lot") in a soft metric-tint
 * capsule — no number, no legend. The positive ("keep it up") variant drops the
 * pill and reads as an earned note.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { EASE, LAYOUT, TIMELINE, TYPE } from './motion';
import type { ThemeTokens } from './motion';
import type { MetricTint } from './metricTint';
import type { SkinReadFinding } from '@/types/skinRead';

export interface FindingCardProps {
  finding: SkinReadFinding;
  tint: MetricTint;
  tokens: ThemeTokens;
  reduceMotion: boolean;
  /** Flip false→true to play the settle. */
  play: boolean;
}

export function FindingCard({ finding, tint, tokens, reduceMotion, play }: FindingCardProps) {
  const t = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!play) return;
    if (reduceMotion) {
      t.value = 1;
      return;
    }
    t.value = withTiming(1, { duration: TIMELINE.cardMs, easing: EASE.out });
    return () => cancelAnimation(t);
  }, [play, reduceMotion, t]);

  const aStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 16 }],
  }));

  const isPositive = finding.metric === 'positive';

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderRadius: LAYOUT.cardRadius,
          boxShadow: [
            {
              offsetX: 0,
              offsetY: tokens.depth.contact.offsetY,
              blurRadius: tokens.depth.contact.blur,
              spreadDistance: 0,
              color: tokens.depth.contact.color,
            },
            {
              offsetX: 0,
              offsetY: tokens.depth.ambient.offsetY,
              blurRadius: tokens.depth.ambient.blur,
              spreadDistance: 0,
              color: tokens.depth.ambient.color,
            },
          ],
          borderColor: tokens.depth.hairline,
        } as ViewStyle,
        aStyle,
      ]}
      accessibilityRole="summary"
    >
      {/* 1% vertical-gradient surface. */}
      <LinearGradient
        colors={tokens.depth.surface}
        style={[StyleSheet.absoluteFill, { borderRadius: LAYOUT.cardRadius }]}
        pointerEvents="none"
      />
      {/* Inner top highlight. */}
      <LinearGradient
        colors={[tokens.depth.innerHighlight, 'transparent']}
        style={styles.innerHighlight}
        pointerEvents="none"
      />

      <View style={styles.body}>
        {/* Header — name + level pill. */}
        <View style={styles.header}>
          <Text
            style={[TYPE.name, { color: tokens.name, flex: 1 }]}
            maxFontSizeMultiplier={1.6}
            accessibilityRole="header"
          >
            {finding.name}
          </Text>
          {!isPositive && (
            <View style={[styles.pill, { backgroundColor: tint.pillBg }]}>
              <Text style={[TYPE.pill, { color: tint.pillText }]} maxFontSizeMultiplier={1.3}>
                {finding.level}
              </Text>
            </View>
          )}
        </View>

        {/* Micro-rows. */}
        {!!finding.whatISee && (
          <Row label="What I see" value={finding.whatISee} tokens={tokens} />
        )}
        {!!finding.whatItMeans && (
          <Row label="What it means" value={finding.whatItMeans} tokens={tokens} />
        )}
        {!!finding.doThis && (
          <View style={styles.move}>
            <Text style={[TYPE.moveLabel, { color: tint.pillText }]} maxFontSizeMultiplier={1.4}>
              The move
            </Text>
            <Text style={[TYPE.body, { color: tokens.body, marginTop: 2 }]} maxFontSizeMultiplier={1.8}>
              {finding.doThis}
            </Text>
          </View>
        )}

        {/* Confidence. */}
        <Text style={[TYPE.confidence, { color: tokens.label, marginTop: LAYOUT.cardRowGap }]} maxFontSizeMultiplier={1.6}>
          {finding.howSure}
        </Text>
      </View>
    </Animated.View>
  );
}

function Row({
  label,
  value,
  tokens,
}: {
  label: string;
  value: string;
  tokens: ThemeTokens;
}) {
  return (
    <Text
      style={[TYPE.body, { color: tokens.body, marginTop: LAYOUT.cardRowGap }]}
      maxFontSizeMultiplier={1.8}
    >
      <Text style={[TYPE.rowLabel, { color: tokens.label }]}>{label}: </Text>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 28,
  },
  body: { padding: LAYOUT.cardPadding },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  move: { marginTop: LAYOUT.cardRowGap + 2 },
});

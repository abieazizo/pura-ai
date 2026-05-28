/**
 * FindingCardV2 — single editorial card for a ScanFindingV2.
 *
 * Tap to expand the recommendation block below a hairline divider.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import {
  CONCERN_LABEL,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  ZONE_LABEL,
  type ScanFindingV2,
} from '@/types/scanResultV2';

export interface FindingCardV2Props {
  finding: ScanFindingV2;
  expanded: boolean;
  selected: boolean;
  onPress(): void;
  /** Delay in ms before the card's entrance animation begins. Pass
   *  (baseMs + index * 60) from the parent list to stagger cards. */
  entranceDelay?: number;
}

// Defensive hex parser. A stale persisted finding can carry a severity
// outside 1-5 which makes SEVERITY_COLOR[finding.severity] return
// undefined; without this guard the slice() chain throws and the whole
// results screen white-screens.
const FALLBACK_HEX = '#7FA8C4';
function withAlpha(hex: string | undefined, alpha: number): string {
  const safe =
    typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex)
      ? hex
      : FALLBACK_HEX;
  const r = parseInt(safe.slice(1, 3), 16);
  const g = parseInt(safe.slice(3, 5), 16);
  const b = parseInt(safe.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function FindingCardV2({
  finding,
  expanded,
  selected,
  onPress,
  entranceDelay = 0,
}: FindingCardV2Props) {
  // Clamp severity into the 1-5 range so all downstream lookups
  // (color, label, alpha math) are guaranteed to resolve.
  const sevLevel: 1 | 2 | 3 | 4 | 5 =
    typeof finding.severity === 'number' &&
    finding.severity >= 1 &&
    finding.severity <= 5
      ? (Math.round(finding.severity) as 1 | 2 | 3 | 4 | 5)
      : 2;
  const sevColor = SEVERITY_COLOR[sevLevel] ?? FALLBACK_HEX;
  const sevLabel = SEVERITY_LABEL[sevLevel];

  const reduceMotion = useReduceMotion();

  // Entrance slide-up — each card fades in from below with a caller-controlled
  // delay so the list staggers rather than popping all at once.
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = reduceMotion
      ? 1
      : withDelay(
          entranceDelay,
          withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
        );
  }, [enter, entranceDelay, reduceMotion]);
  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 10 }],
  }));

  const expand = useSharedValue(0);
  // Measured by the invisible height probe below — allows maxHeight to track
  // the real content rather than a fixed 200px cap that clips long recommendations.
  const measuredHeight = useSharedValue(0);
  useEffect(() => {
    expand.value = withTiming(expanded ? 1 : 0, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [expand, expanded]);
  const expandStyle = useAnimatedStyle(() => ({
    opacity: expand.value,
    // Use measured height once available; generous 500 cap until first layout fires.
    maxHeight: expand.value * (measuredHeight.value > 0 ? measuredHeight.value + 2 : 500),
    transform: [{ translateY: (1 - expand.value) * -4 }],
  }));

  const selectGlow = useSharedValue(0);
  useEffect(() => {
    selectGlow.value = withTiming(selected ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [selectGlow, selected]);
  const selectStyle = useAnimatedStyle(() => ({
    borderColor:
      selectGlow.value > 0.5 ? withAlpha(sevColor, 0.55) : 'rgba(60,40,30,0.08)',
    shadowOpacity: selectGlow.value * 0.18,
  }));

  return (
    <Animated.View style={[styles.card, selectStyle, enterStyle]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${finding.title}, ${sevLabel} severity. Tap to ${expanded ? 'collapse' : 'expand'} recommendation.`}
        accessibilityState={{ selected, expanded }}
      >
        <View style={styles.topRow}>
          <View style={styles.zoneCluster}>
            <View
              style={[styles.severityDot, { backgroundColor: sevColor }]}
            />
            <Text style={styles.zoneLabel} maxFontSizeMultiplier={1.15}>
              {ZONE_LABEL[finding.zone]}
            </Text>
          </View>
          <View
            style={[
              styles.severityBadge,
              { backgroundColor: withAlpha(sevColor, 0.12) },
            ]}
          >
            <Text
              style={[styles.severityBadgeText, { color: sevColor }]}
              maxFontSizeMultiplier={1.1}
            >
              {sevLabel.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.title} maxFontSizeMultiplier={1.1}>
          {finding.title}
        </Text>

        <Text style={styles.observation} maxFontSizeMultiplier={1.2}>
          {finding.observation}
        </Text>

        <Text style={styles.concernHint} maxFontSizeMultiplier={1.15}>
          {CONCERN_LABEL[finding.concern]}
        </Text>

        {finding.ingredient_hints.length > 0 ? (
          <View style={styles.pillsRow}>
            {finding.ingredient_hints.map((hint) => (
              <View key={hint} style={styles.pill}>
                <Text style={styles.pillText} maxFontSizeMultiplier={1.15}>
                  {hint.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <Animated.View style={[styles.expansion, expandStyle]}>
          <View style={styles.divider} />
          <Text style={styles.recommendation} maxFontSizeMultiplier={1.2}>
            {finding.recommendation}
          </Text>
        </Animated.View>
      </Pressable>
      {/* Invisible height probe — rendered outside the flow-constrained
          Animated.View so it can measure the expansion content's natural
          height without being clipped by maxHeight. The measured value feeds
          back into expandStyle so the animation always opens to the exact
          correct height, never clipping long recommendations. */}
      <View
        style={styles.measureWrapper}
        pointerEvents="none"
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.abs(measuredHeight.value - h) > 1) {
            measuredHeight.value = h;
          }
        }}
      >
        <View style={styles.divider} />
        <Text style={styles.recommendation} maxFontSizeMultiplier={1.2}>
          {finding.recommendation}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(60,40,30,0.08)',
    borderRadius: 18,
    padding: 18,
    marginVertical: 6,
    shadowColor: '#35251E',
    shadowOpacity: 0,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  zoneCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  zoneLabel: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 16,
    color: '#2A1E18',
    letterSpacing: 0.1,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 20,
    color: '#2A1E18',
    marginTop: 10,
    letterSpacing: -0.2,
  },
  observation: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#4A3D35',
    marginTop: 6,
  },
  concernHint: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: 'rgba(60,40,30,0.5)',
    letterSpacing: 0.8,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  pill: {
    backgroundColor: '#F4EFE9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  pillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#4A3D35',
    textTransform: 'uppercase',
  },
  expansion: {
    overflow: 'hidden',
  },
  measureWrapper: {
    // Absolutely positioned so it does not contribute to card flow height.
    // left/right match the card's padding so the text wraps at the same width.
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 0,
    opacity: 0,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(60,40,30,0.10)',
    marginTop: 14,
  },
  recommendation: {
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 22,
    color: '#4A3D35',
    marginTop: 12,
  },
});

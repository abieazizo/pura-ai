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
  withTiming,
} from 'react-native-reanimated';
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
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function FindingCardV2({
  finding,
  expanded,
  selected,
  onPress,
}: FindingCardV2Props) {
  const sevColor = SEVERITY_COLOR[finding.severity];
  const sevLabel = SEVERITY_LABEL[finding.severity];

  const expand = useSharedValue(0);
  useEffect(() => {
    expand.value = withTiming(expanded ? 1 : 0, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [expand, expanded]);
  const expandStyle = useAnimatedStyle(() => ({
    opacity: expand.value,
    maxHeight: expand.value * 200,
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
    <Animated.View style={[styles.card, selectStyle]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${finding.title}, ${sevLabel} severity. Tap to read recommendation.`}
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

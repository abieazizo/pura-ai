/**
 * MatchOrb — the warm illuminated recommendation badge.
 *
 * Pass-3 upgrade: builds the orb in three layered passes for real
 * glassy depth — a base radial fill, an inset rim glow, and a soft
 * specular highlight. Adds a very-subtle breathing scale (1.0 ↔
 * 1.025 over 4.4s) so the orb feels alive without becoming a toy.
 * The percent number and "MATCH" label now sit on a tight vertical
 * stack with optical tracking so they read as one composed mark.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Circle,
  Ellipse,
} from 'react-native-svg';
import { puraShop, puraShopType } from '@/theme';

export function MatchOrb({
  percent,
  size = 70,
}: {
  percent: number;
  size?: number;
}) {
  if (percent <= 0) return null;

  // Slow ambient breathe — keeps the orb from feeling like a sticker
  // without becoming distracting.
  const breathe = useSharedValue(0);
  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 4400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(breathe);
  }, [breathe]);

  const animatedScale = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.025 }],
  }));

  return (
    <Animated.View
      style={[styles.wrap, { width: size, height: size }, animatedScale]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* Base — soft warm interior. */}
          <RadialGradient id="orbBase" cx="50%" cy="46%" rx="56%" ry="56%" fx="42%" fy="34%">
            <Stop offset="0%" stopColor={puraShop.orbCenter} stopOpacity={1} />
            <Stop offset="55%" stopColor={puraShop.orbBg} stopOpacity={1} />
            <Stop offset="100%" stopColor={puraShop.peachGlow} stopOpacity={1} />
          </RadialGradient>
          {/* Inner rim glow — sits just inside the outer edge for depth. */}
          <RadialGradient id="orbInnerRim" cx="50%" cy="50%" rx="60%" ry="60%">
            <Stop offset="80%" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.34} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          {/* Specular highlight. */}
          <RadialGradient id="orbHighlight" cx="38%" cy="28%" rx="38%" ry="28%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.95} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          {/* Bottom shadow — anchors the orb visually. */}
          <RadialGradient id="orbShadow" cx="52%" cy="72%" rx="42%" ry="32%">
            <Stop offset="0%" stopColor={puraShop.coralDeep} stopOpacity={0.16} />
            <Stop offset="100%" stopColor={puraShop.coralDeep} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={50} cy={50} r={48} fill="url(#orbBase)" />
        <Circle cx={50} cy={50} r={48} fill="url(#orbShadow)" />
        <Circle cx={50} cy={50} r={48} fill="url(#orbInnerRim)" />
        <Ellipse cx={40} cy={32} rx={20} ry={12} fill="url(#orbHighlight)" />
        {/* Outer hairline — fine warm rim that makes the orb sit
            cleanly over any backdrop. */}
        <Circle
          cx={50}
          cy={50}
          r={48}
          fill="none"
          stroke={puraShop.orbRim}
          strokeWidth={1}
        />
      </Svg>
      <View style={styles.textOver} pointerEvents="none">
        <View style={styles.numberRow}>
          <Text style={styles.percent} maxFontSizeMultiplier={1.0}>
            {Math.round(percent)}
          </Text>
          <Text style={styles.percentSuffix} maxFontSizeMultiplier={1.0}>
            %
          </Text>
        </View>
        <Text style={styles.label} maxFontSizeMultiplier={1.0}>
          MATCH
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  textOver: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  percent: {
    ...puraShopType.matchPercent,
    color: puraShop.orbPercentText,
  },
  percentSuffix: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: puraShop.orbPercentText,
    marginLeft: 1,
  },
  label: {
    ...puraShopType.matchLabel,
    color: puraShop.orbMatchText,
    marginTop: -1,
  },
});

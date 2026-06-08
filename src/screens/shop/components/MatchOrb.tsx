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
import { blue, puraShop, puraShopType, tnum } from '@/theme';

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
          {/* Base — a luminous Pura-Blue interior. Now that the card eyebrows
              read in ink, the orb is the surface's earned blue punctuation, so
              its falloff descends into a REAL blue (ramp 200→400) instead of
              the old washed ice-blues — it reads as a confident recommendation
              signal, not a pale sticker. Bright core keeps the figure legible. */}
          <RadialGradient id="orbBase" cx="50%" cy="46%" rx="56%" ry="56%" fx="42%" fy="34%">
            <Stop offset="0%" stopColor={puraShop.orbCenter} stopOpacity={1} />
            <Stop offset="46%" stopColor={blue[100]} stopOpacity={1} />
            <Stop offset="78%" stopColor={blue[200]} stopOpacity={1} />
            <Stop offset="100%" stopColor={blue[400]} stopOpacity={1} />
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
          {/* Bottom shadow — a deeper Pura-Blue gather (ramp 700) anchors the
              now-saturated orb so it reads as a dimensional bead, not a flat
              chip. Slightly stronger to balance the richer base. */}
          <RadialGradient id="orbShadow" cx="52%" cy="72%" rx="42%" ry="32%">
            <Stop offset="0%" stopColor={blue[700]} stopOpacity={0.24} />
            <Stop offset="100%" stopColor={blue[700]} stopOpacity={0} />
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
    // Editorial serif data-moment: larger and tighter than the legacy token so
    // the match figure reads with confidence inside the orb. Tabular figures
    // keep the digit from shifting the suffix as values animate/change.
    ...puraShopType.matchPercent,
    ...tnum,
    fontSize: 26,
    lineHeight: 27,
    letterSpacing: -1.0,
    color: puraShop.orbPercentText,
  },
  percentSuffix: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 14,
    letterSpacing: -0.3,
    color: puraShop.orbPercentText,
    marginLeft: 0.5,
  },
  label: {
    // Tracked uppercase eyebrow — wider tracking so the tiny caps read as a
    // deliberate label, optically centered under the figure.
    ...puraShopType.matchLabel,
    fontSize: 8,
    letterSpacing: 1.5,
    color: puraShop.orbMatchText,
    marginTop: 0,
  },
});

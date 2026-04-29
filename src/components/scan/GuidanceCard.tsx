/**
 * GuidanceCard (v11.9).
 *
 * Honest pre-capture guidance. Lives INSIDE the bottom panel slot in
 * ScanOverlay v11.9 (no longer absolutely positioned against window
 * dimensions). Sized to fill its slot.
 *
 * Two visual states:
 *   • idle      — three short, icon-led tips visible at once. Doesn't
 *                 rotate. Doesn't preach. The user reads them in
 *                 ~1.5s and intuits exactly what a good scan needs.
 *   • preparing — collapses into a single moss-tinted "Hold still…"
 *                 pill while the 2s post-tap countdown runs.
 *
 * This is the honest answer to "Expo Go has no live face detection":
 * give the user a clear visual model BEFORE they capture, then run the
 * preflight validation immediately AFTER capture.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  CircleHalf,
  Sun,
  Sparkle,
  Barcode,
  Drop,
  Camera,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { palette } from '@/theme';
import type { ReticleMode, FrameState } from './Reticle';

interface Tip {
  Icon: React.FC<PhosphorIconProps>;
  text: string;
}

const FACE_TIPS: ReadonlyArray<Tip> = [
  { Icon: CircleHalf as React.FC<PhosphorIconProps>, text: 'Center your full face in the oval' },
  { Icon: Sun as React.FC<PhosphorIconProps>, text: 'Use even, soft light' },
  { Icon: Sparkle as React.FC<PhosphorIconProps>, text: 'Hold still — we’ll check the photo' },
];

const PRODUCT_TIPS: ReadonlyArray<Tip> = [
  { Icon: Drop as React.FC<PhosphorIconProps>, text: 'Frame the front label' },
  { Icon: Sun as React.FC<PhosphorIconProps>, text: 'Avoid glare on packaging' },
  { Icon: Camera as React.FC<PhosphorIconProps>, text: 'Hold steady — we’ll read the ingredients' },
];

const BARCODE_TIPS: ReadonlyArray<Tip> = [
  { Icon: Barcode as React.FC<PhosphorIconProps>, text: 'Center the barcode in the frame' },
  { Icon: Sun as React.FC<PhosphorIconProps>, text: 'Avoid harsh reflections' },
  { Icon: Sparkle as React.FC<PhosphorIconProps>, text: 'It scans automatically when found' },
];

export interface GuidanceCardProps {
  mode: ReticleMode;
  /**
   * v11.8 — when 'preparing' the card collapses into a single
   * "Hold still…" line so the capture moment reads cleanly.
   */
  frameState?: FrameState;
}

export function GuidanceCard({ mode, frameState = 'idle' }: GuidanceCardProps) {
  const tips =
    mode === 'product' ? PRODUCT_TIPS : mode === 'barcode' ? BARCODE_TIPS : FACE_TIPS;

  // Crossfade between idle (3 tips) and preparing (1 line).
  const phase = useSharedValue(frameState === 'preparing' ? 1 : 0);
  React.useEffect(() => {
    phase.value = withTiming(frameState === 'preparing' ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [frameState, phase]);

  const idleStyle = useAnimatedStyle(() => ({
    opacity: 1 - phase.value,
    transform: [{ translateY: phase.value * -4 }],
  }));
  const preparingStyle = useAnimatedStyle(() => ({
    opacity: phase.value,
    transform: [{ translateY: (1 - phase.value) * 4 }],
  }));

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={[styles.layer, idleStyle]}>
        <View style={styles.tipsRow}>
          {tips.map((tip, i) => {
            const Icon = tip.Icon;
            return (
              <View key={i} style={styles.tipPill}>
                <View style={styles.iconWrap}>
                  <Icon size={13} weight="duotone" color="rgba(255,255,255,0.92)" />
                </View>
                <Text
                  style={styles.tipText}
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.15}
                >
                  {tip.text}
                </Text>
              </View>
            );
          })}
        </View>
      </Animated.View>

      <Animated.View style={[styles.layer, preparingStyle]} pointerEvents="none">
        <View style={styles.preparingPill}>
          <View style={styles.preparingDot} />
          <Text
            style={styles.preparingText}
            maxFontSizeMultiplier={1.15}
            numberOfLines={1}
          >
            Hold still — checking image quality…
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // v11.9 — three pills in a horizontal row instead of stacked rows.
  // Each pill is sized to its content; row wraps on narrow screens.
  // Keeps the guidance "deliberate" without crowding vertical space.
  tipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    maxWidth: 360,
  },
  tipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  iconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.05,
    color: 'rgba(255,255,255,0.95)',
  },
  // Preparing layer — single moss-tinted pill, sized to content.
  preparingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(11,18,32,0.6)',
    borderWidth: 1,
    borderColor: palette.mossDeep,
  },
  preparingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.mossLight,
  },
  preparingText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.4,
    color: palette.mossLight,
  },
});

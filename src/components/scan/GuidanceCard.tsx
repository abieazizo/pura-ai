/**
 * GuidanceCard (v11.8).
 *
 * The pre-capture guidance surface that sits below the reticle. Replaces
 * the v11.7 rotating-tips Caption — that pattern was generic and lazy.
 *
 * Design intent
 * -------------
 * Show three SHORT, ICON-LED tips at once. Don't rotate them. Don't
 * preach. The user reads the card in roughly 1.5s and intuits exactly
 * what a good scan needs:
 *
 *   ⌾  Center your full face
 *   ☼  Even, soft light
 *   ✓  Hold still — we'll check the photo
 *
 * When the user taps the shutter and the camera enters the 2s "hold
 * steady" countdown (frameState='preparing'), the card collapses into
 * a single, calmer line — "Hold still… checking image quality" — to
 * focus attention on the capture moment without ripping the chrome
 * away.
 *
 * This is the honest answer to "Expo Go has no live face detection":
 * give the user a clear visual model of what the system needs BEFORE
 * they capture, then validate immediately AFTER.
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
  { Icon: CircleHalf as React.FC<PhosphorIconProps>, text: 'Center your full face' },
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
   * v11.8 — bottom offset from screen bottom. The card anchors
   * INLINE above the mode selector in the bottom dock stack so
   * the camera region stays uncluttered and the guidance sits in
   * the user's natural attention zone right above the controls.
   */
  bottom: number;
  /**
   * v11.8 — when 'preparing' the card collapses into a single
   * "Hold still…" line so the capture moment reads cleanly.
   */
  frameState?: FrameState;
}

export function GuidanceCard({ mode, bottom, frameState = 'idle' }: GuidanceCardProps) {
  const tips =
    mode === 'product' ? PRODUCT_TIPS : mode === 'barcode' ? BARCODE_TIPS : FACE_TIPS;

  // Smooth crossfade between idle (3 tips) and preparing (1 line).
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
    <View style={[styles.wrap, { bottom }]} pointerEvents="none">
      <Animated.View style={[styles.layer, idleStyle]}>
        <View style={styles.card}>
          {tips.map((tip, i) => {
            const Icon = tip.Icon;
            return (
              <View
                key={i}
                style={[styles.row, i < tips.length - 1 && styles.rowDivider]}
              >
                <View style={styles.iconWrap}>
                  <Icon size={14} weight="duotone" color="rgba(255,255,255,0.92)" />
                </View>
                <Text
                  style={styles.tipText}
                  numberOfLines={1}
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
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
    minHeight: 108,
  },
  layer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  // Card container — frosted ink with soft hairline. Width is
  // intentionally < screen so the oval still reads dominant.
  card: {
    width: '100%',
    maxWidth: 360,
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(11,18,32,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  row: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.05,
    color: 'rgba(255,255,255,0.92)',
  },
  // Preparing layer — single moss-tinted pill, sized to its content.
  preparingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(11,18,32,0.65)',
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

import React from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Question } from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { Reticle, type ReticleMode } from '@/components/scan/Reticle';
import { Caption } from '@/components/scan/Caption';
import { ZoomToggle, type ZoomValue } from '@/components/scan/ZoomToggle';
import { ModeSelector } from '@/components/scan/ModeSelector';
import { OnDeviceKicker } from '@/components/scan/OnDeviceKicker';
import { CaptureRow, type FlashMode } from '@/components/scan/CaptureRow';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

export interface ScanOverlayProps {
  mode: ReticleMode;
  onChangeMode: (m: ReticleMode) => void;
  flashMode: FlashMode;
  onChangeFlash: (f: FlashMode) => void;
  zoom: ZoomValue;
  onChangeZoom: (v: ZoomValue) => void;
  onCapture: () => void;
  onGalleryPick: (uri: string) => void;
  onExit: () => void;
  onHelp: () => void;
  /** True while capture is in-flight; drives the analysis ring. */
  analyzing?: boolean;
}

/**
 * v6 scan overlay. Lives as an absolute layer on top of the camera feed.
 * Top-left exit, top-right help, a central reticle with caption, then a
 * bottom dock: zoom toggle, mode selector, ON-DEVICE kicker, capture row.
 *
 * Nothing stacks. Nothing overlaps. The ON-DEVICE label is its own row
 * below the mode selector with an explicit 8pt gap (§2.3).
 */
export function ScanOverlay({
  mode,
  onChangeMode,
  flashMode,
  onChangeFlash,
  zoom,
  onChangeZoom,
  onCapture,
  onGalleryPick,
  onExit,
  onHelp,
  analyzing,
}: ScanOverlayProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const confirmExit = () => {
    hapt.select();
    Alert.alert(
      'Stop scanning?',
      undefined,
      [
        { text: 'Keep scanning', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: onExit },
      ],
      { cancelable: true }
    );
  };

  const handleHelp = () => {
    hapt.select();
    onHelp();
  };

  // Caption sits 40pt below the reticle lower edge. Reticle centers on the
  // screen; its height varies by mode. We treat "reticle center = screen
  // center" and "caption just below reticle" as: caption top = (screen
  // center) + (reticle height / 2) + 40. For the half-height we average the
  // face (50%) vs product/barcode (45% or 120pt) cases. On tall screens the
  // caption sits above the dock with room to breathe.
  const reticleHalf =
    mode === 'face'
      ? Math.round(height * 0.25)
      : mode === 'product'
      ? Math.round(height * 0.225)
      : 60; // barcode is 120pt tall
  const captionTop = Math.round(height / 2) + reticleHalf + 40;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Warm charcoal gradients (§2.3): top 120pt fades down, bottom 280pt
          fades up. SVG lets us do an actual gradient without expo-linear. */}
      <Scrim
        placement="top"
        width={width}
        height={120}
      />
      <Scrim
        placement="bottom"
        width={width}
        height={280}
      />

      {/* Reticle layer */}
      <Reticle mode={mode} screenWidth={width} screenHeight={height} />

      {/* Caption 40pt below reticle lower edge */}
      <Caption mode={mode} top={captionTop} />

      {/* Top-left — Mark exit */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Stop scanning"
        onPress={confirmExit}
        hitSlop={8}
        style={[styles.topBtn, { top: insets.top + 16, left: 20 }]}
      >
        <PuraMark variant="idle" size="xs" />
        {/* 1pt terracotta "×" stroke overlay — two thin crossed lines */}
        <View style={styles.exitCrossOne} pointerEvents="none" />
        <View style={styles.exitCrossTwo} pointerEvents="none" />
      </Pressable>

      {/* Top-right — Help button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open scan tutorial"
        onPress={handleHelp}
        hitSlop={8}
        style={[styles.topBtn, { top: insets.top + 16, right: 20 }]}
      >
        <Question size={18} color={palette.ink} weight="duotone" />
      </Pressable>

      {/* Bottom dock (§2.3): zoom → mode → ON-DEVICE → capture, each its
          own row with explicit gaps. Nothing overlaps. */}
      <View
        pointerEvents="box-none"
        style={[
          styles.bottomStack,
          { bottom: insets.bottom + 40 + 84 + 24 }, // above capture row
        ]}
      >
        <View style={styles.zoomWrap}>
          <ZoomToggle value={zoom} onChange={onChangeZoom} />
        </View>
        <View style={{ height: 12 }} />
        <ModeSelector mode={mode} onChange={onChangeMode} />
        <View style={{ height: 8 }} />
        <OnDeviceKicker />
      </View>

      <View
        pointerEvents="box-none"
        style={[styles.captureDock, { bottom: insets.bottom + 40 }]}
      >
        <CaptureRow
          flashMode={flashMode}
          onChangeFlash={onChangeFlash}
          onCapture={onCapture}
          onGalleryPick={onGalleryPick}
          analyzing={analyzing}
        />
      </View>
    </View>
  );
}

/**
 * Single SVG scrim. Placement `top` fades ink @ 60% down to transparent;
 * `bottom` fades ink @ 60% up. Warm charcoal (`palette.ink`), never pure
 * black.
 */
function Scrim({
  placement,
  width,
  height,
}: {
  placement: 'top' | 'bottom';
  width: number;
  height: number;
}) {
  const id = `scrim-${placement}`;
  return (
    <Svg
      pointerEvents="none"
      width={width}
      height={height}
      style={[
        styles.scrim,
        placement === 'top' ? { top: 0 } : { bottom: 0 },
      ]}
    >
      <Defs>
        <LinearGradient
          id={id}
          x1="0"
          y1={placement === 'top' ? '0' : '1'}
          x2="0"
          y2={placement === 'top' ? '1' : '0'}
        >
          <Stop offset="0" stopColor={palette.ink} stopOpacity={0.6} />
          <Stop offset="1" stopColor={palette.ink} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} fill={`url(#${id})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  topBtn: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212,165,116,0.8)', // sand @ 80%
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitCrossOne: {
    position: 'absolute',
    width: 22,
    height: 1,
    backgroundColor: palette.clay,
    transform: [{ rotate: '45deg' }],
  },
  exitCrossTwo: {
    position: 'absolute',
    width: 22,
    height: 1,
    backgroundColor: palette.clay,
    transform: [{ rotate: '-45deg' }],
  },
  bottomStack: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  zoomWrap: {},
  captureDock: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});

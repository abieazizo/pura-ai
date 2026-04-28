import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Question, X } from 'phosphor-react-native';
import { Reticle, type ReticleMode, type FrameState } from '@/components/scan/Reticle';
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
  /**
   * v11.7 — simple two-state frame model. `idle` is the resting
   * state. `preparing` flips on for the 2-second hold-steady
   * countdown after the user taps capture. No faked face-detection
   * states, because the platform (Expo Go + expo-camera@17) cannot
   * actually detect a face.
   */
  frameState?: FrameState;
  /**
   * v11.7 — countdown number rendered inside the shutter during
   * preparing. null when not preparing.
   */
  countdown?: number | null;
}

/**
 * v11.7 scan overlay. Lives as an absolute layer on top of the camera
 * feed.
 *
 * Chrome system (unchanged from v10):
 * - Top-left: single X close button in a frosted-ink pill.
 * - Top-right: ? help button, same treatment.
 * - Ink scrims (top 120pt, bottom 280pt) at 60% for legibility.
 * - Bottom dock: zoom → mode → ON-DEVICE → capture, each on its own
 *   row with explicit gaps.
 *
 * What changed in v11.7: dropped the FaceScanModel / OverlayTone
 * vocabulary and the 14-state machine that produced it, because Expo
 * Go cannot drive that machine truthfully. The overlay now takes a
 * simple `frameState` ('idle' | 'preparing') + `countdown` pair from
 * the parent, which is itself driven by user taps rather than
 * pretend-detection.
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
  frameState = 'idle',
  countdown = null,
}: ScanOverlayProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const handleExit = () => {
    hapt.select();
    onExit();
  };

  const handleHelp = () => {
    hapt.select();
    onHelp();
  };

  // Caption sits 32pt below the reticle lower edge by default. On
  // small phones the bottom dock can crowd the caption out of legible
  // space, so we clamp the caption to AT LEAST 56pt above the bottom
  // dock top.
  const reticleHalf =
    mode === 'face'
      ? Math.round(height * 0.25)
      : mode === 'product'
      ? Math.round(height * 0.225)
      : 60; // barcode is 120pt tall
  const reticleBottomY = Math.round(height / 2) + reticleHalf;
  // The bottom-stack starts at: bottom = insets.bottom + 40 + 84 + 24.
  // Convert to Y-from-top: height - (insets.bottom + 148).
  const dockTopY = height - (insets.bottom + 148);
  const captionTopRaw = reticleBottomY + 32;
  const captionTopMax = dockTopY - 56;
  const captionTop = Math.min(captionTopRaw, captionTopMax);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Ink scrims: top 120pt fades down, bottom 280pt fades up. */}
      <Scrim placement="top" width={width} height={120} />
      <Scrim placement="bottom" width={width} height={280} />

      {/* Reticle layer */}
      <Reticle
        mode={mode}
        screenWidth={width}
        screenHeight={height}
        frameState={frameState}
      />

      {/* Caption 32pt below reticle lower edge */}
      <Caption mode={mode} top={captionTop} frameState={frameState} />

      {/* Top-left — clean X close */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close scanner"
        onPress={handleExit}
        hitSlop={8}
        style={({ pressed }) => [
          styles.chipBtn,
          { top: insets.top + 12, left: 16 },
          pressed && styles.chipBtnPressed,
        ]}
      >
        <X size={18} color={palette.bg} weight="bold" />
      </Pressable>

      {/* Top-right — Help button (same chip) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open scan tutorial"
        onPress={handleHelp}
        hitSlop={8}
        style={({ pressed }) => [
          styles.chipBtn,
          { top: insets.top + 12, right: 16 },
          pressed && styles.chipBtnPressed,
        ]}
      >
        <Question size={18} color={palette.bg} weight="duotone" />
      </Pressable>

      {/* Bottom dock: zoom → mode → ON-DEVICE → capture. */}
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
          countdown={countdown}
          autoMode={mode === 'barcode'}
          autoModeLabel={analyzing ? 'Found.' : 'Scanning…'}
        />
      </View>
    </View>
  );
}

/**
 * Single SVG scrim. Placement `top` fades ink @ 60% down to transparent;
 * `bottom` fades ink @ 60% up.
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
  chipBtn: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(11,18,32,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
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

import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Question, X } from 'phosphor-react-native';
import { Reticle, type ReticleMode, type FrameState } from '@/components/scan/Reticle';
import { GuidanceCard } from '@/components/scan/GuidanceCard';
import { ModeSelector } from '@/components/scan/ModeSelector';
import { CaptureRow, type FlashMode } from '@/components/scan/CaptureRow';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

export interface ScanOverlayProps {
  mode: ReticleMode;
  onChangeMode: (m: ReticleMode) => void;
  flashMode: FlashMode;
  onChangeFlash: (f: FlashMode) => void;
  onCapture: () => void;
  onGalleryPick: (uri: string) => void;
  onExit: () => void;
  onHelp: () => void;
  /** True while capture is in-flight; drives the analysis ring. */
  analyzing?: boolean;
  /**
   * v11.7+ — simple two-state frame model. `idle` is the resting
   * state. `preparing` flips on for the 2-second hold-steady
   * countdown after the user taps capture. Drives both the reticle
   * halo AND the dim animation on secondary chrome (mode selector,
   * flash, gallery) so the capture moment reads as one focused
   * gesture.
   */
  frameState?: FrameState;
  /** Countdown number rendered inside the shutter during preparing. */
  countdown?: number | null;
}

/**
 * v11.8 scan overlay.
 *
 * What changed in v11.8 vs v11.7:
 *   • Dropped ZoomToggle (functionally dead — `zoomValue` was already
 *     hard-coded to 0 in either branch in ScanCaptureScreen) and
 *     OnDeviceKicker (extra row with no payload) so the bottom dock
 *     collapses from THREE stacked rows to just ModeSelector + Capture.
 *     ~140pt of vertical chrome reclaimed for the guidance card.
 *   • The rotating-tips Caption is replaced with a structured 3-tip
 *     GuidanceCard. Mode-aware (face / product / barcode), all tips
 *     visible at once, doesn't preach.
 *   • During preparing, the secondary chrome (mode selector + flash +
 *     gallery via the analyzing-state on CaptureRow) softens via a
 *     coordinated opacity transition so the user's eye locks on the
 *     shutter + the guidance pill.
 *
 * Layout zones (top to bottom):
 *   • Top bar — close (left) + help (right). Nothing else.
 *   • Camera zone — face oval / product frame / barcode rect with
 *     gentle pulse, no chrome over the subject region.
 *   • Guidance zone — 3-tip card sits 28pt below reticle bottom.
 *   • Mode selector — single row, ~60pt tall.
 *   • Capture row — flash | shutter | gallery.
 */
export function ScanOverlay({
  mode,
  onChangeMode,
  flashMode,
  onChangeFlash,
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

  // ── Dim animation ──
  // When preparing, secondary chrome fades to ~38% so the user's eye
  // lands on the shutter + the guidance pill. Reverts on idle. The
  // shutter and the GuidanceCard are NOT affected — they own the
  // capture moment.
  const dim = useSharedValue(0);
  React.useEffect(() => {
    dim.value = withTiming(frameState === 'preparing' ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [frameState, dim]);

  const dimSecondaryStyle = useAnimatedStyle(() => ({
    opacity: 1 - dim.value * 0.62,
  }));

  // v11.8 — geometry stack (bottom-up):
  //   [ insets.bottom ]
  //   40pt buffer
  //   84pt CaptureRow
  //   24pt gap
  //   60pt ModeSelector
  //   12pt gap
  //   GuidanceCard (~96pt)
  //   ↑ camera region above
  //
  // Anchoring the guidance card here (instead of below the reticle)
  // keeps the camera region uncluttered AND places the guidance in
  // the user's natural attention zone — right above the controls
  // they're about to tap.
  const guidanceCardBottom = insets.bottom + 40 + 84 + 24 + 60 + 12;

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

      {/* Guidance card — sits inline above the mode selector */}
      <GuidanceCard
        mode={mode}
        bottom={guidanceCardBottom}
        frameState={frameState}
      />

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

      {/* Top-right — Help */}
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

      {/* Mode selector — sole secondary control row above capture.
          Dims during preparing so the shutter + guidance pill carry
          the moment. */}
      <Animated.View
        pointerEvents={frameState === 'preparing' ? 'none' : 'box-none'}
        style={[
          styles.modeStack,
          { bottom: insets.bottom + 40 + 84 + 24 },
          dimSecondaryStyle,
        ]}
      >
        <ModeSelector mode={mode} onChange={onChangeMode} />
      </Animated.View>

      {/* Capture row — flash + shutter + gallery. */}
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
          dimSecondary={frameState === 'preparing'}
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
      style={[styles.scrim, placement === 'top' ? { top: 0 } : { bottom: 0 }]}
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
  // v11.8 — single mode-row stack, no zoom toggle and no on-device
  // kicker. Reclaims ~64pt of vertical space.
  modeStack: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureDock: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});

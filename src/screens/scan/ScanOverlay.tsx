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
  /** v11.7+ — drives reticle halo + dim animation on secondary chrome. */
  frameState?: FrameState;
  /** Countdown number rendered inside the shutter during preparing. */
  countdown?: number | null;
}

// ── Layout constants — single source of truth for the dock zones ──
// Tuned so every supported phone (iPhone SE class to Pro Max) gives
// the camera region at least 240pt of vertical space without ever
// overlapping the bottom panel.
const TOP_BAR_HEIGHT = 56;             // close + help chip row
const BOTTOM_SAFE_BUFFER = 22;         // gap above home-indicator
const CAPTURE_ROW_HEIGHT = 84;         // shutter row
const GAP_CAPTURE_TO_MODE = 18;        // gap above capture row
const MODE_ROW_HEIGHT = 60;            // mode selector
const GAP_MODE_TO_GUIDANCE = 10;       // gap above mode row
const GUIDANCE_HEIGHT = 88;            // guidance card slot
const GAP_GUIDANCE_TO_CAMERA = 14;     // breathe between camera and dock

const BOTTOM_PANEL_INNER =
  CAPTURE_ROW_HEIGHT +
  GAP_CAPTURE_TO_MODE +
  MODE_ROW_HEIGHT +
  GAP_MODE_TO_GUIDANCE +
  GUIDANCE_HEIGHT;
// = 84 + 18 + 60 + 10 + 88 = 260pt
//
// Total bottom panel height = BOTTOM_PANEL_INNER + GAP_GUIDANCE_TO_CAMERA
// + insets.bottom + BOTTOM_SAFE_BUFFER. On iPhone SE (insets.bottom=0):
// 260 + 14 + 0 + 22 = 296. With top bar 56 + status bar ~47 = 103pt
// of top chrome. Available camera region = 667 - 103 - 296 = 268pt.

/**
 * Scan overlay (v11.9).
 *
 * Zone-based layout. Each region has ONE clear owner — no two zones
 * compete for the same space, no element draws over another.
 *
 * ┌─────────────────────────────────┐
 * │   X                            ?│  ← TOP BAR (60pt)
 * │                                  │
 * │           CAMERA REGION          │  ← oval centers here
 * │      (face oval / product /      │     (top: insets.top + 60,
 * │        barcode reticle)          │      bottom: BOTTOM_PANEL)
 * │                                  │
 * ├─────────────────────────────────┤
 * │      GUIDANCE CARD (96pt)        │  ← BOTTOM PANEL
 * │      MODE SELECTOR (60pt)        │     starts BOTTOM_PANEL_HEIGHT
 * │  FLASH | SHUTTER | GALLERY (84) │     above bottom safe area
 * └─────────────────────────────────┘
 *
 * The face oval is centered within the CAMERA region (not the full
 * screen) so it never overlaps the bottom panel — including on the
 * smallest supported phones (iPhone SE-class).
 *
 * The bottom panel is a single frosted ink slab that contains the
 * GuidanceCard, ModeSelector, and CaptureRow. Reads as one coherent
 * dock surface, not three floating elements.
 *
 * v11.9 vs v11.8:
 *   • Bottom panel is now a single frosted slab with a soft top edge
 *     gradient — clearly demarcates "controls" from "camera"
 *   • Face oval centers in the CAMERA region, never in the dock zone
 *   • Removed the bottom 280pt SVG scrim (replaced by the panel itself)
 *   • Fixed-height layout — no more on-the-fly geometry math against
 *     window dimensions; everything is pixel-aligned
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

  // ── Dim animation for secondary chrome during preparing ──
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

  // ── Region geometry ──
  // No floor on the camera height — the camera region always fills
  // exactly what's left between the top bar and the bottom panel,
  // ensuring zero overlap with the dock chrome on every device.
  const topBarBottom = insets.top + TOP_BAR_HEIGHT;
  const bottomPanelTotal =
    BOTTOM_PANEL_INNER +
    GAP_GUIDANCE_TO_CAMERA +
    insets.bottom +
    BOTTOM_SAFE_BUFFER;
  const cameraRegionHeight = Math.max(
    180,
    height - topBarBottom - bottomPanelTotal
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Top scrim — fades down so the close/help chips read on any
          background. Bottom scrim is gone in v11.9; the bottom panel
          is its own opaque surface. */}
      <Scrim placement="top" width={width} height={120} />

      {/* CAMERA REGION — the face oval / product frame / barcode rect
          centers within this absolutely-positioned wrapper, NOT on
          screen center. */}
      <View
        pointerEvents="none"
        style={[
          styles.cameraRegion,
          {
            top: topBarBottom,
            height: cameraRegionHeight,
          },
        ]}
      >
        <Reticle
          mode={mode}
          screenWidth={width}
          screenHeight={cameraRegionHeight}
          frameState={frameState}
        />
      </View>

      {/* TOP BAR — close (left) + help (right) — nothing else */}
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

      {/* BOTTOM PANEL — one coherent dock with frosted slab background.
          Soft top edge gradient blends into the camera region. */}
      <View
        pointerEvents="box-none"
        style={[
          styles.bottomPanel,
          {
            paddingBottom: insets.bottom + BOTTOM_SAFE_BUFFER,
          },
        ]}
      >
        <PanelBackground />

        <View style={styles.guidanceSlot}>
          <GuidanceCard mode={mode} frameState={frameState} />
        </View>

        <View style={[styles.modeSlot, { height: MODE_ROW_HEIGHT }]}>
          <Animated.View
            pointerEvents={frameState === 'preparing' ? 'none' : 'box-none'}
            style={dimSecondaryStyle}
          >
            <ModeSelector mode={mode} onChange={onChangeMode} />
          </Animated.View>
        </View>

        <View style={[styles.captureSlot, { height: CAPTURE_ROW_HEIGHT }]}>
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
    </View>
  );
}

/**
 * Soft fade from transparent (top) to ink @ 70% (bottom) so the panel
 * blends out of the camera region without a hard line.
 */
function PanelBackground() {
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFillObject}
      preserveAspectRatio="none"
    >
      <Defs>
        <LinearGradient id="panel-bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.ink} stopOpacity={0} />
          <Stop offset="0.18" stopColor={palette.ink} stopOpacity={0.45} />
          <Stop offset="0.55" stopColor={palette.ink} stopOpacity={0.78} />
          <Stop offset="1" stopColor={palette.ink} stopOpacity={0.9} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#panel-bg)" />
    </Svg>
  );
}

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
          <Stop offset="0" stopColor={palette.ink} stopOpacity={0.55} />
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
  // CAMERA REGION — the face oval centers WITHIN this rect, not the
  // full screen. height is computed so it never collides with the
  // bottom panel.
  cameraRegion: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  // BOTTOM PANEL — one frosted slab containing the entire dock.
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: GAP_GUIDANCE_TO_CAMERA,
    alignItems: 'center',
  },
  guidanceSlot: {
    width: '100%',
    height: GUIDANCE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modeSlot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: GAP_MODE_TO_GUIDANCE,
    marginBottom: GAP_CAPTURE_TO_MODE,
  },
  captureSlot: {
    width: '100%',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
});

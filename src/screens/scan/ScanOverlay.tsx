/**
 * ScanOverlay — the single composition layer for every scan mode.
 *
 * All three modes go through the same pipeline now:
 *
 *   ┌─────────────────────────────────┐
 *   │ ←   Mode title / subtitle    ?  │  ← TOP BAR
 *   │                                  │
 *   │      FACE / PRODUCT / BARCODE    │  ← per-mode guide
 *   │              GUIDE               │
 *   │                                  │
 *   │       INSTRUCTION CARD           │  ← shared, state-driven
 *   │       Quality check row          │  ← shared, mode-specific
 *   │                                  │
 *   ├─────────────────────────────────┤
 *   │        MODE SELECTOR             │  ← slim segmented control
 *   │ FLASH · SHUTTER · GALLERY        │  ← capture controls
 *   │ Privacy / trust microcopy        │
 *   └─────────────────────────────────┘
 *
 * The overlay only renders. Every decision (guide color, check
 * status, instruction copy, shutter readiness) is resolved upstream
 * by the scanController.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
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
import { Lightning, Image as ImageIcon, Question, X } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';
import { ModeSelector } from '@/components/scan/ModeSelector';
import { ShutterButton } from '@/components/scan/ShutterButton';
import { FaceGuide } from '@/components/scan/FaceGuide';
import { ProductGuide } from '@/components/scan/ProductGuide';
import { BarcodeGuide } from '@/components/scan/BarcodeGuide';
import { InstructionCard } from '@/components/scan/InstructionCard';
import { QualityCheckRow } from '@/components/scan/QualityCheckRow';
import type { ReticleMode } from '@/components/scan/Reticle';
import type { FlashMode } from '@/components/scan/CaptureRow';
import type { ScanInstruction } from '@/screens/scan/scanController';

export interface ScanOverlayProps {
  mode: ReticleMode;
  onChangeMode: (m: ReticleMode) => void;
  flashMode: FlashMode;
  onChangeFlash: (f: FlashMode) => void;
  onCapture: () => void;
  onGalleryPick: (uri: string) => void;
  onExit: () => void;
  onHelp: () => void;
  /** True while capture is in-flight. */
  analyzing?: boolean;
  /** Countdown number rendered inside the shutter during preparing. */
  countdown?: number | null;
  /** Resolved scan instruction from the controller. */
  instruction: ScanInstruction;
}

const TOP_BAR_HEIGHT = 64;
const BOTTOM_SAFE_BUFFER = 22;
const CAPTURE_ROW_HEIGHT = 84;
const GAP_CAPTURE_TO_MODE = 16;
const MODE_ROW_HEIGHT = 50;
const GAP_MODE_TO_PRIVACY = 8;
const PRIVACY_HEIGHT = 28;
const GAP_GUIDE_TO_PANEL = 12;

const BOTTOM_PANEL_INNER =
  CAPTURE_ROW_HEIGHT +
  GAP_CAPTURE_TO_MODE +
  MODE_ROW_HEIGHT +
  GAP_MODE_TO_PRIVACY +
  PRIVACY_HEIGHT;

const MODE_TITLES: Record<
  ReticleMode,
  { title: string; subtitle: string }
> = {
  face: { title: 'Face Scan', subtitle: 'Skin score + routine check' },
  product: {
    title: 'Product Scan',
    subtitle: 'Check ingredients and skin match',
  },
  barcode: {
    title: 'Barcode Scan',
    subtitle: 'Find product details fast',
  },
};

const PRIVACY_LINE: Record<ReticleMode, string> = {
  face: 'Visible skin signals only · Not a medical diagnosis',
  product: 'Private by default · Used only for your skin insights',
  barcode: 'Private by default · Used only for your skin insights',
};

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
  countdown = null,
  instruction,
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

  // Dim secondary controls during the preparing/capturing beat so
  // the eye locks onto the shutter + instruction card.
  const isPreparing =
    instruction.phase === 'capturing' || instruction.phase === 'analyzing';
  const dim = useSharedValue(0);
  React.useEffect(() => {
    dim.value = withTiming(isPreparing ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [isPreparing, dim]);
  const dimSecondaryStyle = useAnimatedStyle(() => ({
    opacity: 1 - dim.value * 0.62,
  }));

  // Region geometry.
  const topBarBottom = insets.top + TOP_BAR_HEIGHT;
  const bottomPanelTotal =
    BOTTOM_PANEL_INNER +
    GAP_GUIDE_TO_PANEL +
    insets.bottom +
    BOTTOM_SAFE_BUFFER;
  const cameraRegionHeight = Math.max(
    260,
    height - topBarBottom - bottomPanelTotal
  );

  // Map instruction.phase → shutter readiness vocabulary.
  const shutterReadiness =
    instruction.phase === 'ready' || instruction.phase === 'capturing'
      ? 'ready'
      : instruction.phase === 'checking' || instruction.severity === 'warning'
      ? 'partial'
      : 'not_ready';

  // Hide chips during permission / error / initializing phases — the
  // instruction card carries the message in those cases.
  const hideChecks =
    instruction.phase === 'initializing' ||
    instruction.phase === 'permissionRequired' ||
    instruction.phase === 'permissionDenied' ||
    instruction.phase === 'error' ||
    instruction.checks.length === 0;

  // Mode-aware A11y for the shutter.
  const shutterA11y =
    mode === 'face'
      ? instruction.canCapture
        ? 'Start skin scan'
        : 'Scan not ready'
      : mode === 'product'
      ? instruction.canCapture
        ? 'Capture product label'
        : 'Scan not ready'
      : 'Barcode scans automatically';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Scrim placement="top" width={width} height={140} />

      {/* CAMERA REGION — mode-specific guide */}
      <View
        pointerEvents="none"
        style={[
          styles.cameraRegion,
          { top: topBarBottom, height: cameraRegionHeight },
        ]}
      >
        {mode === 'face' ? (
          <FaceGuide
            severity={instruction.severity}
            ready={instruction.phase === 'ready'}
            width={width}
            height={cameraRegionHeight}
          />
        ) : mode === 'product' ? (
          <ProductGuide
            severity={instruction.severity}
            width={width}
            height={cameraRegionHeight}
          />
        ) : (
          <BarcodeGuide
            severity={instruction.severity}
            width={width}
            height={cameraRegionHeight}
          />
        )}
      </View>

      {/* INSTRUCTION CARD + CHIP ROW — anchored below the guide */}
      <View
        pointerEvents="none"
        style={[
          styles.instructionAnchor,
          {
            top: topBarBottom + Math.round(cameraRegionHeight * 0.72),
            width,
          },
        ]}
      >
        <InstructionCard instruction={instruction} />
        <View style={{ height: 12 }} />
        <QualityCheckRow
          checks={instruction.checks}
          collapsedLabel={instruction.collapsedLabel}
          hidden={hideChecks}
        />
      </View>

      {/* TOP BAR */}
      <View
        pointerEvents="box-none"
        style={[
          styles.topBar,
          { paddingTop: insets.top + 14 },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close scanner"
          onPress={handleExit}
          hitSlop={16}
          style={({ pressed }) => [
            styles.chipBtn,
            pressed && styles.chipBtnPressed,
          ]}
        >
          <X size={18} color="#F4F6FA" weight="bold" />
        </Pressable>

        <View style={styles.topBarCenter}>
          <Text
            style={styles.topBarTitle}
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
          >
            {MODE_TITLES[mode].title}
          </Text>
          <Text
            style={styles.topBarSubtitle}
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
          >
            {MODE_TITLES[mode].subtitle}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open scan tips"
          onPress={handleHelp}
          hitSlop={16}
          style={({ pressed }) => [
            styles.chipBtn,
            pressed && styles.chipBtnPressed,
          ]}
        >
          <Question size={18} color="#F4F6FA" weight="duotone" />
        </Pressable>
      </View>

      {/* BOTTOM PANEL */}
      <View
        pointerEvents="box-none"
        style={[
          styles.bottomPanel,
          { paddingBottom: insets.bottom + BOTTOM_SAFE_BUFFER },
        ]}
      >
        <PanelBackground />

        <View style={[styles.captureSlot, { height: CAPTURE_ROW_HEIGHT }]}>
          <FaceCaptureRow
            flashMode={flashMode}
            onChangeFlash={onChangeFlash}
            onCapture={onCapture}
            onGalleryPick={onGalleryPick}
            countdown={countdown}
            capturing={analyzing ?? false}
            dimSecondary={isPreparing}
            shutterReadiness={shutterReadiness}
            shutterA11y={shutterA11y}
            autoBarcode={mode === 'barcode'}
          />
        </View>

        <View style={[styles.modeSlot, { height: MODE_ROW_HEIGHT }]}>
          <Animated.View
            pointerEvents={isPreparing ? 'none' : 'box-none'}
            style={dimSecondaryStyle}
          >
            <ModeSelector mode={mode} onChange={onChangeMode} />
          </Animated.View>
        </View>

        <View style={[styles.privacySlot, { height: PRIVACY_HEIGHT }]}>
          <Text style={styles.privacyText} maxFontSizeMultiplier={1.15}>
            {PRIVACY_LINE[mode]}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// FaceCaptureRow — shared capture controls for every mode.
// ---------------------------------------------------------------------------

function FaceCaptureRow({
  flashMode,
  onChangeFlash,
  onCapture,
  onGalleryPick,
  countdown,
  capturing,
  dimSecondary,
  shutterReadiness,
  shutterA11y,
  autoBarcode,
}: {
  flashMode: FlashMode;
  onChangeFlash: (f: FlashMode) => void;
  onCapture: () => void;
  onGalleryPick: (uri: string) => void;
  countdown: number | null;
  capturing: boolean;
  dimSecondary: boolean;
  shutterReadiness: 'not_ready' | 'partial' | 'ready';
  shutterA11y: string;
  autoBarcode: boolean;
}) {
  const dim = useSharedValue(0);
  React.useEffect(() => {
    dim.value = withTiming(dimSecondary ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [dimSecondary, dim]);
  const sideStyle = useAnimatedStyle(() => ({
    opacity: 1 - dim.value * 0.62,
  }));

  return (
    <View style={captureStyles.row}>
      <Animated.View
        style={sideStyle}
        pointerEvents={dimSecondary ? 'none' : 'auto'}
      >
        <FlashButton mode={flashMode} onPress={onChangeFlash} />
      </Animated.View>

      {autoBarcode ? (
        <AutoScanIndicator />
      ) : (
        <ShutterButton
          readiness={shutterReadiness}
          countdown={countdown}
          capturing={capturing}
          onPress={onCapture}
          accessibilityLabel={shutterA11y}
        />
      )}

      <Animated.View
        style={sideStyle}
        pointerEvents={dimSecondary ? 'none' : 'auto'}
      >
        <GalleryButton onPick={onGalleryPick} />
      </Animated.View>
    </View>
  );
}

const FLASH_NEXT: Record<FlashMode, FlashMode> = {
  off: 'on',
  on: 'auto',
  auto: 'off',
};

function FlashButton({
  mode,
  onPress,
}: {
  mode: FlashMode;
  onPress: (next: FlashMode) => void;
}) {
  const iconColor = mode === 'on' ? '#F5B85C' : 'rgba(248,250,252,0.85)';
  const handle = () => {
    hapt.select();
    onPress(FLASH_NEXT[mode]);
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Toggle flash"
      accessibilityState={{ selected: mode === 'on' }}
      onPress={handle}
      style={({ pressed }) => [
        captureStyles.sideBtn,
        pressed && captureStyles.sideBtnPressed,
      ]}
      hitSlop={8}
    >
      <Lightning
        size={18}
        color={iconColor}
        weight={mode === 'on' ? 'fill' : 'duotone'}
      />
      {mode === 'on' ? <View style={captureStyles.onDot} /> : null}
      {mode === 'auto' ? (
        <Text style={captureStyles.autoLabel}>A</Text>
      ) : null}
    </Pressable>
  );
}

function GalleryButton({ onPick }: { onPick: (uri: string) => void }) {
  const handle = async () => {
    hapt.select();
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.85,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        onPick(res.assets[0].uri);
      }
    } catch {
      // swallow — no toast chrome on camera overlay
    }
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open gallery"
      onPress={handle}
      style={({ pressed }) => [
        captureStyles.sideBtn,
        pressed && captureStyles.sideBtnPressed,
      ]}
      hitSlop={8}
    >
      <ImageIcon size={18} color="rgba(248,250,252,0.85)" weight="duotone" />
    </Pressable>
  );
}

function AutoScanIndicator() {
  const pulse = useSharedValue(0);
  React.useEffect(() => {
    pulse.value = withTiming(1, {
      duration: 1200,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [pulse]);
  return (
    <View style={captureStyles.autoWrap}>
      <View style={captureStyles.autoChip}>
        <View style={captureStyles.autoDot} />
        <Text style={captureStyles.autoChipLabel} maxFontSizeMultiplier={1.1}>
          Auto-scanning
        </Text>
      </View>
    </View>
  );
}

function PanelBackground() {
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFillObject}
      preserveAspectRatio="none"
    >
      <Defs>
        <LinearGradient id="panel-bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0B1220" stopOpacity={0} />
          <Stop offset="0.18" stopColor="#0B1220" stopOpacity={0.45} />
          <Stop offset="0.55" stopColor="#0B1220" stopOpacity={0.78} />
          <Stop offset="1" stopColor="#0B1220" stopOpacity={0.92} />
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
          <Stop offset="0" stopColor="#0B1220" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#0B1220" stopOpacity={0} />
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
  cameraRegion: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  topBarTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14.5,
    letterSpacing: 0.15,
    color: '#F4F6FA',
  },
  topBarSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    letterSpacing: 0.1,
    color: 'rgba(244,246,250,0.7)',
    marginTop: 1,
  },
  chipBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(11,18,32,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  instructionAnchor: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: GAP_GUIDE_TO_PANEL,
    alignItems: 'center',
  },
  captureSlot: {
    width: '100%',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  modeSlot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: GAP_CAPTURE_TO_MODE,
  },
  privacySlot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: GAP_MODE_TO_PRIVACY,
  },
  privacyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    letterSpacing: 0.1,
    color: 'rgba(248,250,252,0.6)',
  },
});

const captureStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  sideBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(11,18,32,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  onDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F5B85C',
  },
  autoLabel: {
    position: 'absolute',
    bottom: 4,
    fontFamily: 'Inter-SemiBold',
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 0.8,
    color: 'rgba(248,250,252,0.85)',
  },
  autoWrap: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(11,18,32,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  autoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#68D8FF',
  },
  autoChipLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.3,
    color: '#BFEAFF',
  },
});

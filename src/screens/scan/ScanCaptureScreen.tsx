import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { X } from 'phosphor-react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScanOverlay } from '@/screens/scan/ScanOverlay';
import type { ReticleMode } from '@/components/scan/Reticle';
import type { FlashMode } from '@/components/scan/CaptureRow';
import type { ZoomValue } from '@/components/scan/ZoomToggle';
import { palette, space, type as typography } from '@/theme';
import { common, scan } from '@/copy/strings';
import type { ScanModalMode } from '@/navigation/types';
import { useAppStore } from '@/store/useAppStore';
import { useContextual } from '@/components/contextual/ContextualProvider';

export interface ScanCaptureScreenProps {
  onClose: () => void;
  onCaptured: (photoUri: string, mode: ScanModalMode) => void;
  onOpenHelp: () => void;
  initialMode?: ScanModalMode;
}

const toOverlayMode = (m: ScanModalMode | undefined): ReticleMode =>
  m === 'product' ? 'product' : 'face';

const toAnalysisMode = (r: ReticleMode): ScanModalMode =>
  r === 'face' ? 'face' : 'product';

/**
 * v6 scan capture. The camera permission flow (§1 read-only) is preserved
 * verbatim. The overlay chrome is now owned by `<ScanOverlay />`.
 */
export function ScanCaptureScreen({
  onClose,
  onCaptured,
  onOpenHelp,
  initialMode = 'face',
}: ScanCaptureScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<ReticleMode>(toOverlayMode(initialMode));
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [zoom, setZoom] = useState<ZoomValue>('1');
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const requestedRef = useRef(false);
  const fade = useSharedValue(0);
  const flashOverlay = useSharedValue(0);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain && !requestedRef.current) {
      requestedRef.current = true;
      requestPermission();
    }
    if (permission.granted) {
      fade.value = withTiming(1, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [permission, requestPermission, fade]);

  // §3.2 — Trigger 1 check-in sheet. Fires only when:
  //   • the user has scanned before (not their very first scan),
  //   • their last scan was on a different calendar day,
  //   • they haven't already answered today's check-in.
  // The provider handles the 600ms delay after mount so the camera is
  // clearly visible before the sheet enters.
  const scansCount = useAppStore((s) => s.scans.length);
  const lastScanIso = useAppStore(
    (s) => s.scans[s.scans.length - 1]?.capturedAt ?? null
  );
  const hasAnsweredTodayContext = useAppStore((s) => s.hasAnsweredTodayContext);
  const { requestTodaySheet } = useContextual();

  useEffect(() => {
    if (!permission?.granted) return;
    if (scansCount === 0) return;
    if (hasAnsweredTodayContext) return;
    if (!lastScanIso) return;
    const last = new Date(lastScanIso);
    const today = new Date();
    const sameDay =
      last.getFullYear() === today.getFullYear() &&
      last.getMonth() === today.getMonth() &&
      last.getDate() === today.getDate();
    if (sameDay) return;
    requestTodaySheet();
  }, [
    permission?.granted,
    scansCount,
    lastScanIso,
    hasAnsweredTodayContext,
    requestTodaySheet,
  ]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOverlay.value }));

  const onCapture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);

    // §2.3 — 30% opacity paper flash across the whole screen for 120ms.
    flashOverlay.value = withTiming(0.3, { duration: 60 }, () => {
      flashOverlay.value = withTiming(0, { duration: 60 });
    });

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: true,
      });
      if (photo?.uri) {
        onCaptured(photo.uri, toAnalysisMode(mode));
      } else {
        setCapturing(false);
      }
    } catch {
      setCapturing(false);
    }
  }, [capturing, flashOverlay, onCaptured, mode]);

  const onGalleryPick = useCallback(
    (uri: string) => {
      onCaptured(uri, toAnalysisMode(mode));
    },
    [onCaptured, mode]
  );

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.root, styles.ink]}>
        <StatusBar style="light" />
        <View style={styles.permissionBox}>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityLabel={common.close}
            style={styles.permClose}
          >
            <X size={22} color={palette.inkInverse} weight="regular" />
          </Pressable>
          <Text style={styles.permTitle} maxFontSizeMultiplier={1.15}>
            {scan.permissionTitle}
          </Text>
          <Text style={styles.permBody}>{scan.permissionBody}</Text>
          <PrimaryButton
            label={scan.permissionEnable}
            onPress={() => requestPermission()}
          />
          <PrimaryButton label={common.cancel} variant="ghost" onPress={onClose} />
        </View>
      </SafeAreaView>
    );
  }

  // Zoom: expo-camera's `zoom` prop is 0 (1×) to 1 (max). Rough mapping for
  // our two-position toggle — 0 = 1×, 0.5 for a wider framing is not
  // possible natively, so ".5×" falls back to 0 on single-lens devices. We
  // render the toggle per spec anyway.
  const zoomValue = zoom === '0.5' ? 0 : 0;

  // expo-camera `enableTorch` is the on-flash analogue; front camera in
  // face mode doesn't support torch — we gracefully ignore.
  const flashOn = flashMode === 'on';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing={mode === 'face' ? 'front' : 'back'}
        animateShutter={false}
        enableTorch={flashOn && mode !== 'face'}
        zoom={zoomValue}
      />

      <Animated.View
        style={[StyleSheet.absoluteFillObject, fadeStyle]}
        pointerEvents="box-none"
      >
        <ScanOverlay
          mode={mode}
          onChangeMode={setMode}
          flashMode={flashMode}
          onChangeFlash={setFlashMode}
          zoom={zoom}
          onChangeZoom={setZoom}
          onCapture={onCapture}
          onGalleryPick={onGalleryPick}
          onExit={onClose}
          onHelp={onOpenHelp}
          analyzing={capturing}
        />
      </Animated.View>

      {/* Full-screen paper flash, 30% opacity, 120ms */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: palette.bg },
          flashStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  ink: { backgroundColor: palette.ink },
  permissionBox: {
    flex: 1,
    padding: space.lg,
    justifyContent: 'center',
    gap: space.md,
  },
  permClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(250,247,244,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: space.lg,
  },
  permTitle: { ...typography.titleSerif, color: palette.inkInverse },
  permBody: {
    ...typography.body,
    color: 'rgba(250,247,244,0.8)',
    marginBottom: space.md,
  },
});

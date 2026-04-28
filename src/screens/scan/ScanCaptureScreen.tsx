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
import { hapt } from '@/utils/haptics';
import { ScanOverlay } from '@/screens/scan/ScanOverlay';
import {
  useFaceScanState,
  COUNTDOWN_MS,
} from '@/screens/scan/hooks/useFaceScanState';
import { useFaceDetection } from '@/screens/scan/hooks/useFaceDetection';
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
  /**
   * Fired when a face/product photo is captured. The barcode mode has
   * a separate callback (`onBarcodeScanned`) because it skips the
   * still-image capture path entirely — the camera auto-fires on
   * detection.
   */
  onCaptured: (photoUri: string, mode: 'face' | 'product') => void;
  /** v10.32 — fired when expo-camera's BarcodeScanner detects a code. */
  onBarcodeScanned?: (barcodeValue: string) => void;
  onOpenHelp: () => void;
  initialMode?: ScanModalMode;
}

const toOverlayMode = (m: ScanModalMode | undefined): ReticleMode =>
  m === 'product' ? 'product' : m === 'barcode' ? 'barcode' : 'face';

const toAnalysisMode = (r: ReticleMode): 'face' | 'product' =>
  r === 'face' ? 'face' : 'product';

/**
 * v10.32 — barcode formats the scanner watches for. Beauty product
 * barcodes are overwhelmingly EAN-13 (international) or UPC-A (US)
 * with EAN-8 / UPC-E for smaller packaging. Code-128 catches the
 * occasional pharma-style barcode some K-beauty SKUs carry.
 */
const BARCODE_TYPES: ReadonlyArray<
  'ean13' | 'ean8' | 'upc_a' | 'upc_e' | 'code128'
> = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'];

/**
 * v6 scan capture. The camera permission flow (§1 read-only) is preserved
 * verbatim. The overlay chrome is now owned by `<ScanOverlay />`.
 */
export function ScanCaptureScreen({
  onClose,
  onCaptured,
  onBarcodeScanned,
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

  // v11.5 — face-scan state machine (single source of truth).
  // The hook owns NO_FACE / FACE_READY / FACE_COUNTDOWN / etc.
  // Without on-device face detection (expo-camera@17 in Expo Go
  // ships none), the truthful subset emitted today is:
  //   NO_FACE → FACE_READY → FACE_COUNTDOWN → FACE_CAPTURING.
  // The full vocabulary is available the moment a detector is wired
  // (call faceScan.report({...}) on each detector frame — see
  // useFaceScanState.ts).
  const faceScan = useFaceScanState({
    permissionGranted: !!permission?.granted,
    isFaceMode: mode === 'face',
  });

  // v11.6 — real face detection via vision-camera + ML-Kit. The
  // hook is a no-op in Expo Go (returns available:false); in a
  // custom dev build it streams ML-Kit detections through a
  // worklet to faceScan.report() per frame.
  const detection = useFaceDetection({ onReport: faceScan.report });
  const visionCameraRef = useRef<unknown>(null);
  const useVisionCamera = detection.available && mode === 'face';

  const onCapture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    if (mode !== 'face') {
      // Product / barcode skip the prepare ceremony — the user is
      // pointing at an inanimate object and expects an instant
      // shutter response.
      return runCapture();
    }
    // Face mode: gate on canCapture from the state machine. If the
    // user taps when not ready, the live guidance message already
    // tells them what to fix (model.message) — we just no-op the
    // shutter to avoid wasting tokens on a known-bad frame.
    if (!faceScan.model.canCapture) {
      hapt.warning();
      return;
    }
    hapt.tap();
    faceScan.startCountdown();
    const t = setTimeout(async () => {
      faceScan.markCapturing();
      hapt.medium();
      await runCapture();
    }, COUNTDOWN_MS);
    return () => clearTimeout(t);

    async function runCapture() {
      setCapturing(true);
      // §2.3 — 30% opacity paper flash across the whole screen for 120ms.
      flashOverlay.value = withTiming(0.3, { duration: 60 }, () => {
        flashOverlay.value = withTiming(0, { duration: 60 });
      });
      try {
        let uri: string | undefined;
        if (useVisionCamera && visionCameraRef.current) {
          // VisionCamera v5: takePhoto returns { path }; convert to file:// uri.
          const ref = visionCameraRef.current as {
            takePhoto: (opts: object) => Promise<{ path: string }>;
          };
          const photo = await ref.takePhoto({ flash: 'off' });
          uri = photo?.path
            ? photo.path.startsWith('file://')
              ? photo.path
              : `file://${photo.path}`
            : undefined;
        } else if (cameraRef.current) {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.85,
            skipProcessing: true,
          });
          uri = photo?.uri;
        }
        if (uri) {
          onCaptured(uri, toAnalysisMode(mode));
        } else {
          setCapturing(false);
          faceScan.reset();
        }
      } catch {
        setCapturing(false);
        faceScan.reset();
      }
    }
  }, [capturing, faceScan, flashOverlay, onCaptured, mode]);

  const onGalleryPick = useCallback(
    (uri: string) => {
      onCaptured(uri, toAnalysisMode(mode));
    },
    [onCaptured, mode]
  );

  /**
   * v10.32 — barcode auto-fire. expo-camera streams every detection
   * frame so we debounce on `capturing` to make sure we navigate
   * away on the first valid hit and never re-fire while leaving the
   * screen. The ref-based scannedRef is belt-and-braces — React's
   * batched setState can lag behind the rapid frame callbacks.
   */
  const scannedRef = useRef(false);
  const handleBarcodeScanned = useCallback(
    ({ data }: { data?: string }) => {
      if (scannedRef.current || capturing) return;
      if (mode !== 'barcode') return;
      const value = (data ?? '').trim();
      if (value.length < 6) return; // ignore single-digit garbage frames
      scannedRef.current = true;
      setCapturing(true);
      flashOverlay.value = withTiming(0.25, { duration: 60 }, () => {
        flashOverlay.value = withTiming(0, { duration: 60 });
      });
      onBarcodeScanned?.(value);
    },
    [capturing, mode, onBarcodeScanned, flashOverlay]
  );

  // Reset the scanned-ref when the user changes mode away from
  // barcode and back, so a second scan in the same session works.
  useEffect(() => {
    if (mode !== 'barcode') {
      scannedRef.current = false;
      setCapturing(false);
    }
  }, [mode]);

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

  // v11.6 — render either VisionCamera (real face detection,
  // requires custom dev build) or expo-camera CameraView (legacy
  // path that still works in Expo Go without face detection).
  // useVisionCamera = (detection.available && mode === 'face').
  // Other modes always use expo-camera since the barcode scanner
  // and product capture don't need vision-camera.
  const VisionCameraComponent = detection.Camera as
    | React.ComponentType<{
        ref: React.MutableRefObject<unknown>;
        style: object;
        device: unknown;
        isActive: boolean;
        photo: boolean;
        frameProcessor?: unknown;
      }>
    | null;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {useVisionCamera && VisionCameraComponent && detection.device ? (
        <VisionCameraComponent
          ref={visionCameraRef}
          style={StyleSheet.absoluteFillObject}
          device={detection.device}
          isActive={true}
          photo={true}
          frameProcessor={detection.frameProcessor}
        />
      ) : (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing={mode === 'face' ? 'front' : 'back'}
          animateShutter={false}
          enableTorch={flashOn && mode !== 'face'}
          zoom={zoomValue}
          barcodeScannerSettings={
            mode === 'barcode'
              ? { barcodeTypes: [...BARCODE_TYPES] }
              : undefined
          }
          onBarcodeScanned={
            mode === 'barcode' ? handleBarcodeScanned : undefined
          }
        />
      )}

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
          faceModel={mode === 'face' ? faceScan.model : null}
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

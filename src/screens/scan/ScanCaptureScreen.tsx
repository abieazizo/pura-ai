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
import { Lightbulb, X } from 'phosphor-react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { hapt } from '@/utils/haptics';
import { ScanOverlay } from '@/screens/scan/ScanOverlay';
import { LightingAssist } from '@/components/scan/LightingAssist';
import type { ReticleMode, FrameState } from '@/components/scan/Reticle';
import type { FlashMode } from '@/components/scan/CaptureRow';
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
 * v11.7 — duration of the post-tap "hold steady" countdown that runs
 * before the photo actually fires. The countdown gives users a beat
 * to settle the camera and reframe if they realise they're crooked.
 * 2s feels like a deliberate beat without dragging.
 */
const COUNTDOWN_MS = 2000;

/**
 * Scan capture screen (v11.7).
 *
 * Honest Expo Go flow. We do NOT pretend to detect a face in real
 * time — Expo Go + expo-camera@17 ships no detector and we removed
 * the vision-camera dev-build path that briefly existed in v11.6.
 *
 * The model is now: user frames their face → user taps capture →
 * a 2s countdown runs (frameState='preparing', moss halo visible) →
 * the photo is taken → the analyzing screen runs a fast preflight
 * pass on the captured frame, and either continues to full analysis
 * or routes to ErrorState with a smart, specific reason.
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
  const [capturing, setCapturing] = useState(false);
  // v11.7 — single source of truth for the reticle/caption visual
  // state. 'idle' on mount; flips to 'preparing' for COUNTDOWN_MS
  // after the user taps capture; resets to 'idle' if capture fails.
  const [frameState, setFrameState] = useState<FrameState>('idle');
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const requestedRef = useRef(false);
  // v11.10 — track countdown timers so we can cancel them if the user
  // navigates away mid-countdown. Previously the setTimeout/setInterval
  // pair leaked: useCallback's "return () => clearTimeout(...)" was
  // misinterpreted as a cleanup but useCallback simply returns its
  // function — the cleanup never ran, and a navigated-away component
  // would still fire takePictureAsync against a stale ref.
  const countdownTimers = useRef<{
    fire: ReturnType<typeof setTimeout> | null;
    tick: ReturnType<typeof setInterval> | null;
  }>({ fire: null, tick: null });
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

  // v19.11 — Lighting Assist. Persisted across sessions; only
  // physically renders when the camera is in face mode (the use
  // case it was designed for; product/barcode modes use the rear
  // camera and don't benefit). The toggle is exposed top-right
  // when in face mode.
  const lightingAssistEnabled = useAppStore((s) => s.lightingAssistEnabled);
  const setLightingAssistEnabled = useAppStore(
    (s) => s.setLightingAssistEnabled
  );
  const lightingAssistActive = mode === 'face' && lightingAssistEnabled;

  // §3.2 — Trigger 1 check-in sheet. Fires only when:
  //   • the user has scanned before (not their very first scan),
  //   • their last scan was on a different calendar day,
  //   • they haven't already answered today's check-in.
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

  // Reset frame state any time the mode changes — countdown only
  // belongs to the face flow.
  useEffect(() => {
    setFrameState('idle');
    setCountdownValue(null);
  }, [mode]);

  // v11.10 — cancel any in-flight countdown timers on unmount AND
  // when the mode changes away from face. This is the missing
  // cleanup that previously let stale captures fire against an
  // unmounted CameraView ref.
  useEffect(() => {
    if (mode !== 'face') {
      if (countdownTimers.current.tick) clearInterval(countdownTimers.current.tick);
      if (countdownTimers.current.fire) clearTimeout(countdownTimers.current.fire);
      countdownTimers.current.tick = null;
      countdownTimers.current.fire = null;
    }
    return () => {
      if (countdownTimers.current.tick) clearInterval(countdownTimers.current.tick);
      if (countdownTimers.current.fire) clearTimeout(countdownTimers.current.fire);
      countdownTimers.current.tick = null;
      countdownTimers.current.fire = null;
    };
  }, [mode]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOverlay.value }));

  const onCapture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    if (frameState === 'preparing') return; // already counting down

    if (mode !== 'face') {
      // Product / barcode skip the prepare ceremony — the user is
      // pointing at an inanimate object and expects an instant
      // shutter response.
      hapt.tap();
      return runCapture();
    }

    // Face mode: tap → 2s "hold steady" countdown → fire. The
    // countdown is deliberate; even though we can't validate the
    // frame on-device, we want to give the user a beat to settle
    // the camera and reframe if they realise they're crooked. The
    // post-capture preflight call (in ScanAnalyzing) catches the
    // bad photos.
    hapt.tap();
    setFrameState('preparing');
    const startedAt = Date.now();
    setCountdownValue(Math.ceil(COUNTDOWN_MS / 1000));
    countdownTimers.current.tick = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remainingMs = Math.max(0, COUNTDOWN_MS - elapsed);
      const next = Math.ceil(remainingMs / 1000);
      setCountdownValue(next > 0 ? next : null);
    }, 200);
    countdownTimers.current.fire = setTimeout(async () => {
      if (countdownTimers.current.tick) {
        clearInterval(countdownTimers.current.tick);
        countdownTimers.current.tick = null;
      }
      countdownTimers.current.fire = null;
      setCountdownValue(null);
      hapt.medium();
      await runCapture();
    }, COUNTDOWN_MS);

    async function runCapture() {
      setCapturing(true);
      // §2.3 — 30% opacity paper flash across the whole screen for 120ms.
      flashOverlay.value = withTiming(0.3, { duration: 60 }, () => {
        flashOverlay.value = withTiming(0, { duration: 60 });
      });
      try {
        let uri: string | undefined;
        if (cameraRef.current) {
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
          setFrameState('idle');
          setCountdownValue(null);
        }
      } catch {
        setCapturing(false);
        setFrameState('idle');
        setCountdownValue(null);
      }
    }
  }, [capturing, flashOverlay, frameState, mode, onCaptured]);

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
   * screen.
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
        barcodeScannerSettings={
          mode === 'barcode' ? { barcodeTypes: [...BARCODE_TYPES] } : undefined
        }
        onBarcodeScanned={mode === 'barcode' ? handleBarcodeScanned : undefined}
      />

      {/* v19.11 — front-camera ring-light overlay. Renders a soft
          white halo around the preview to act as a screen-based
          ring light. pointerEvents='none' so the capture row + mode
          switcher beneath still receive taps. Only shows in face
          mode; persisted via useAppStore.lightingAssistEnabled. */}
      <LightingAssist enabled={lightingAssistActive} />

      <Animated.View
        style={[StyleSheet.absoluteFillObject, fadeStyle]}
        pointerEvents="box-none"
      >
        <ScanOverlay
          mode={mode}
          onChangeMode={setMode}
          flashMode={flashMode}
          onChangeFlash={setFlashMode}
          onCapture={onCapture}
          onGalleryPick={onGalleryPick}
          onExit={onClose}
          onHelp={onOpenHelp}
          analyzing={capturing}
          frameState={frameState}
          countdown={countdownValue}
        />
      </Animated.View>

      {/* v19.13 — Lighting Assist toggle, hardened against tap
          regression. The previous v19.11 wrapper used a full-width
          SafeAreaView with `right: 0` only; depending on RN layout
          resolution this could extend across the top of the screen
          and intercept touches over the close button on the left.
          v19.13 renders the pill in an explicit-width absolute
          container anchored top-right, so it physically cannot
          overlap the close button, AND keeps `pointerEvents='box-none'`
          on the wrapper so only the pill itself catches touches. */}
      {mode === 'face' && permission?.granted ? (
        <View
          pointerEvents="box-none"
          style={styles.lightingToggleSafeArea}
        >
          <Pressable
            onPress={() => {
              hapt.select();
              setLightingAssistEnabled(!lightingAssistEnabled);
            }}
            accessibilityRole="button"
            accessibilityLabel={
              lightingAssistEnabled
                ? 'Disable Lighting Assist'
                : 'Enable Lighting Assist'
            }
            hitSlop={12}
            style={({ pressed }) => [
              styles.lightingToggle,
              lightingAssistEnabled && styles.lightingToggleActive,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Lightbulb
              size={14}
              color={
                lightingAssistEnabled ? palette.ink : palette.inkInverse
              }
              weight={lightingAssistEnabled ? 'fill' : 'regular'}
            />
            <Text
              style={[
                styles.lightingToggleLabel,
                lightingAssistEnabled && styles.lightingToggleLabelActive,
              ]}
              maxFontSizeMultiplier={1.1}
            >
              {lightingAssistEnabled ? 'Lighting Assist On' : 'Lighting Assist'}
            </Text>
          </Pressable>
        </View>
      ) : null}

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
  // v19.13 — Lighting Assist toggle wrapper. Anchored top-right
  // with EXPLICIT non-overlapping bounds — the previous v19.11
  // version used `right: 0` without a left bound, which RN layout
  // could resolve as a full-width strip across the top, blocking
  // the close button below. This version renders the wrapper as
  // an inset, right-aligned strip ~52pt tall (status bar + small
  // padding) and only ~180pt wide. The pill itself is the only
  // child and the only thing that catches touches.
  lightingToggleSafeArea: {
    position: 'absolute',
    top: 56, // clears typical status bar / dynamic island
    right: 14,
    width: 180,
    height: 38,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  lightingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: 'rgba(11,18,32,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(250,247,244,0.18)',
  },
  lightingToggleActive: {
    backgroundColor: '#FAFAFA',
    borderColor: 'rgba(11,18,32,0.12)',
  },
  lightingToggleLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
    color: palette.inkInverse,
  },
  lightingToggleLabelActive: {
    color: palette.ink,
  },
});

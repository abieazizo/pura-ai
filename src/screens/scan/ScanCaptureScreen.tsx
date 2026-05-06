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

  // v19.14 — Lighting Assist. Behavior:
  //   • AUTO-detect when the room is dark via a one-shot
  //     low-quality probe taken ~900 ms after camera ready.
  //   • The persisted `lightingAssistEnabled` setting is now a
  //     soft "force-on" override — leave it false for pure
  //     auto, set true if a future settings UI exposes a manual
  //     opt-in.
  const lightingAssistForceOn = useAppStore(
    (s) => s.lightingAssistEnabled
  );
  const [autoDark, setAutoDark] = useState<boolean>(false);
  const probedRef = useRef(false);

  // Run the luminance probe once when the camera is ready in face
  // mode. We use takePictureAsync at the lowest reasonable quality
  // and use the base64 length as a coarse luminance proxy: at fixed
  // JPEG quality, darker scenes compress to smaller payloads (less
  // visual entropy). Threshold tuned empirically — sub-32 KB
  // typically corresponds to a noticeably dim indoor scene.
  useEffect(() => {
    if (mode !== 'face' || !permission?.granted || probedRef.current) {
      return;
    }
    probedRef.current = true;
    const t = setTimeout(async () => {
      try {
        const cam = cameraRef.current;
        if (!cam) {
          // Fall back to ON if we couldn't probe — better to help
          // than not. Common case is the camera initialised after
          // the timeout fired.
          setAutoDark(true);
          return;
        }
        const photo = await cam.takePictureAsync({
          quality: 0.05,
          base64: true,
          skipProcessing: true,
        });
        const b64 = photo?.base64 ?? '';
        const bytes = Math.floor((b64.length * 3) / 4);
        // < 32 KB at quality 0.05 => dim scene => assist on.
        // > 80 KB => clearly bright => assist off.
        // Between => borderline; default off to avoid washing
        // out an already-bright preview.
        setAutoDark(bytes < 32_000);
      } catch {
        // Probe failed; default ON in face mode — the perimeter
        // ring is restrained enough that being on by mistake is
        // not visually disruptive.
        setAutoDark(true);
      }
    }, 900);
    return () => clearTimeout(t);
  }, [mode, permission?.granted]);
  void lightingAssistForceOn; // silenced; passed below as `forceOn`

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

      {/* v19.14 — auto front-camera ring light. The component now
          fades in only when the luminance probe says the room is
          dark, OR when the user explicitly forces it on. Only
          renders meaningfully in face mode (back-camera scans
          don't benefit). Restrained perimeter halo only — the
          camera preview's center 70% stays untouched. */}
      <LightingAssist
        autoDark={mode === 'face' && permission?.granted && autoDark}
        forceOn={mode === 'face' && lightingAssistForceOn}
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
          onCapture={onCapture}
          onGalleryPick={onGalleryPick}
          onExit={onClose}
          onHelp={onOpenHelp}
          analyzing={capturing}
          frameState={frameState}
          countdown={countdownValue}
        />
      </Animated.View>

      {/* v19.14 — REMOVED the v19.11/v19.13 manual toggle pill.
          Two issues forced this:
            1. The 180-pt-wide pill physically overlapped the
               help button at top-right, blocking taps.
            2. Lighting Assist becomes AUTO in v19.14 — the
               component decides on/off internally based on a
               low-quality luminance probe taken once per scan
               session — so no manual toggle is required. The
               persisted preference (`lightingAssistEnabled`)
               now serves as a soft "force-on" override only;
               normal users see fully automatic behavior. */}

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
  // v19.14 — manual lighting toggle styles removed.
});

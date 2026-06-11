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
import {
  useScanReadiness,
  type LightingSignal,
} from '@/screens/scan/scanReadiness';
import {
  resolveScanInstruction,
  DEFAULT_FACE_READINESS,
  type FaceReadiness,
  type ProductReadiness,
  type BarcodeReadiness,
  type ScanControllerInput,
} from '@/screens/scan/scanController';
import { useScanQuality } from '@/scanQuality/useScanQuality';
import { qualityToFaceReadiness } from '@/scanQuality/controllerBridge';
import { THRESHOLDS as QUALITY_T } from '@/scanQuality/thresholds';
import type { CaptureQualitySnapshot } from '@/scanQuality/types';
import {
  ScanQualityDebugOverlay,
  isScanDebugEnabled,
} from '@/components/scan/ScanQualityDebugOverlay';

export interface ScanCaptureScreenProps {
  onClose: () => void;
  /**
   * Fired when a face/product photo is captured. The barcode mode has
   * a separate callback (`onBarcodeScanned`) because it skips the
   * still-image capture path entirely — the camera auto-fires on
   * detection.
   *
   * v27 — face captures now also carry `captureQuality`: the live
   * landmarks + quality signals frozen at the shutter moment (null
   * for gallery picks and platforms with no detector). Downstream
   * results screens consume the landmarks for the on-skin glow.
   */
  onCaptured: (
    photoUri: string,
    mode: 'face' | 'product',
    captureQuality?: CaptureQualitySnapshot
  ) => void;
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
  // v23 — same probe now also drives the readiness machine's
  // lighting signal. 'pending' until the probe lands; 'low' when
  // the probe says dim; 'good' otherwise. We never claim 'harsh'
  // without a real glare-detection signal.
  const [lightingSignal, setLightingSignal] = useState<LightingSignal>('pending');
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
          setLightingSignal('low');
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
        const isDim = bytes < 32_000;
        setAutoDark(isDim);
        setLightingSignal(isDim ? 'low' : 'good');
      } catch {
        // Probe failed; default ON in face mode — the perimeter
        // ring is restrained enough that being on by mistake is
        // not visually disruptive.
        setAutoDark(true);
        setLightingSignal('low');
      }
    }, 900);
    return () => clearTimeout(t);
  }, [mode, permission?.granted]);

  // v23 — reset the lighting signal when the mode changes so the
  // probe re-runs on the next entry to face mode.
  useEffect(() => {
    if (mode !== 'face') {
      probedRef.current = false;
      setLightingSignal('pending');
    }
  }, [mode]);

  // v23 — drive the new readiness machine. Kept around for the
  // FaceModeOverlay's chip vocabulary (face/light/stable/clear)
  // which we still surface when nothing has been resolved yet.
  const readiness = useScanReadiness({
    cameraReady: !!permission?.granted,
    lighting: lightingSignal,
    preparing: frameState === 'preparing',
    captured: capturing,
    mode,
  });

  // Elapsed-since-lighting clock — still drives the product/barcode
  // readiness baselines below (those modes are out of scope for the
  // quality engine until label OCR / barcode decoding land).
  const [elapsedSinceLight, setElapsedSinceLight] = useState(0);
  const lightSettledAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (lightingSignal === 'pending') {
      lightSettledAtRef.current = null;
      setElapsedSinceLight(0);
      return;
    }
    if (lightSettledAtRef.current === null) {
      lightSettledAtRef.current = Date.now();
    }
    const id = setInterval(() => {
      const t0 = lightSettledAtRef.current;
      if (t0 !== null) setElapsedSinceLight(Date.now() - t0);
    }, 200);
    return () => clearInterval(id);
  }, [lightingSignal]);

  // v27 — REAL face-scan quality engine. On web, useScanQuality runs
  // MediaPipe FaceLandmarker against the live camera feed (~15 Hz)
  // plus per-frame luma/Laplacian stats, so faceReadiness is now a
  // projection of genuinely measured signals (see src/scanQuality/).
  // The v24 elapsed-time inference is gone for good: on platforms
  // with no detector the engine reports 'unavailable' and we hold the
  // honest neutral baseline — a check is never claimed unmeasured.
  const { signals: quality, getCaptureSnapshot } = useScanQuality({
    enabled: mode === 'face' && !!permission?.granted,
  });
  const engineLive = mode === 'face' && quality.detectorStatus === 'running';
  const qualityRef = useRef(quality);
  useEffect(() => {
    qualityRef.current = quality;
  }, [quality]);

  const faceReadiness: FaceReadiness = engineLive
    ? qualityToFaceReadiness(quality)
    : DEFAULT_FACE_READINESS;

  // Screen fill-light now follows the engine's live light level with
  // hysteresis (the one-shot probe remains the fallback when no
  // detector is running on this platform).
  useEffect(() => {
    if (!engineLive) return;
    setAutoDark((prev) => {
      if (quality.lightLevel < QUALITY_T.FILL_LIGHT_BELOW) return true;
      if (quality.lightLevel > QUALITY_T.FILL_LIGHT_RELEASE) return false;
      return prev;
    });
  }, [engineLive, quality.lightLevel]);

  // Honest baselines for product / barcode modes — we don't pretend
  // we have label OCR or barcode detection until the runtime signals.
  // expo-camera's `onBarcodeScanned` flips barcode.detected via the
  // existing barcode capture path; until then the bracket animates
  // in "looking" mode.
  const productReadiness: ProductReadiness = {
    productInFrame: mode === 'product' && elapsedSinceLight >= 400,
    labelDetected: false,
    textSharp: mode === 'product' && elapsedSinceLight >= 1500,
    glareRisk: 0,
    lightingQuality: lightingSignal === 'good' ? 0.7 : 0,
    motionStability: mode === 'product' ? 0.6 : 0,
  };
  const barcodeReadiness: BarcodeReadiness = {
    detected: false,
    barcodeInFrame: mode === 'barcode' && elapsedSinceLight >= 400,
    motionStability: mode === 'barcode' ? 0.55 : 0,
    lightingQuality: lightingSignal === 'good' ? 0.6 : 0,
  };

  // Permission state — honest mapping for the controller.
  const permissionState: ScanControllerInput['permission'] = !permission
    ? 'unknown'
    : permission.granted
    ? 'granted'
    : permission.canAskAgain
    ? 'requesting'
    : 'denied';

  const scanInstruction = resolveScanInstruction({
    mode,
    permission: permissionState,
    cameraReady: !!permission?.granted,
    preparing: frameState === 'preparing',
    capturing,
    analyzing: false,
    face: mode === 'face' ? faceReadiness : undefined,
    product: mode === 'product' ? productReadiness : undefined,
    barcode: mode === 'barcode' ? barcodeReadiness : undefined,
  });

  // Light haptic when the controller crosses into ready for the
  // first time per lock.
  const readyHapticFiredRef = useRef(false);
  useEffect(() => {
    if (scanInstruction.phase === 'ready' && !readyHapticFiredRef.current) {
      readyHapticFiredRef.current = true;
      hapt.select();
    }
    if (
      scanInstruction.phase !== 'ready' &&
      scanInstruction.phase !== 'capturing' &&
      scanInstruction.phase !== 'analyzing'
    ) {
      readyHapticFiredRef.current = false;
    }
  }, [scanInstruction.phase]);
  void readiness; // legacy readiness retained for potential future fallback paths
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

  // Debug readout visibility is static per mount (dev or ?scanDebug=1).
  const scanDebugVisible = React.useMemo(isScanDebugEnabled, []);

  // v27 — the shutter gate is REAL where the engine runs, advisory
  // where it can't.
  //
  // History: v26.3 demoted the gate to advisory because the old
  // "readiness" was a guess (elapsed time + luminance probe) and a
  // guess must never block a capture. The quality engine changes
  // the premise: on web it MEASURES the live frame (face, framing,
  // pose, light, sharpness, motion), so blocking on a failing check
  // is honest — see onCapture. On platforms where the engine reports
  // 'unavailable' the v26.3 reasoning still holds and capture stays
  // advisory (countdown + post-capture preflight).
  const COMPOSE_SETTLE_MS = 600;
  const screenMountedAtRef = useRef(Date.now());
  useEffect(() => {
    if (permission?.granted) {
      screenMountedAtRef.current = Date.now();
    }
  }, [permission?.granted]);

  const phaseRef = useRef(scanInstruction.phase);
  useEffect(() => {
    phaseRef.current = scanInstruction.phase;
  }, [scanInstruction.phase]);

  // Synchronous re-entrancy guard — `capturing` state lags a render,
  // and auto-capture + manual tap can race within one frame.
  const capturingRef = useRef(false);
  useEffect(() => {
    capturingRef.current = capturing;
  }, [capturing]);

  const runCapture = useCallback(async () => {
    if (!cameraRef.current || capturingRef.current) return;
    capturingRef.current = true;
    setCapturing(true);
    // §2.3 — 30% opacity paper flash across the whole screen for 120ms.
    flashOverlay.value = withTiming(0.3, { duration: 60 }, () => {
      flashOverlay.value = withTiming(0, { duration: 60 });
    });
    try {
      // v27 — freeze the live landmarks + quality signals at the
      // shutter moment, BEFORE the (async) photo lands. The results
      // on-skin glow consumes these downstream.
      const captureQuality = mode === 'face' ? getCaptureSnapshot() : null;
      let uri: string | undefined;
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: true,
        });
        uri = photo?.uri;
      }
      if (uri) {
        if (__DEV__ && captureQuality) {
          // eslint-disable-next-line no-console
          console.log(
            `[scanQuality] capture snapshot attached: ${captureQuality.landmarks?.length ?? 0} landmarks, allPass=${captureQuality.allPass}`
          );
        }
        onCaptured(uri, toAnalysisMode(mode), captureQuality ?? undefined);
      } else {
        capturingRef.current = false;
        setCapturing(false);
        setFrameState('idle');
        setCountdownValue(null);
      }
    } catch {
      capturingRef.current = false;
      setCapturing(false);
      setFrameState('idle');
      setCountdownValue(null);
    }
  }, [flashOverlay, getCaptureSnapshot, mode, onCaptured]);

  const onCapture = useCallback(async () => {
    if (!cameraRef.current || capturingRef.current) return;
    if (frameState === 'preparing') return; // already counting down

    // Hard non-capture phases — the camera or analyzer is doing
    // something we genuinely cannot interrupt.
    const phase = phaseRef.current;
    if (
      phase === 'permissionRequired' ||
      phase === 'permissionDenied' ||
      phase === 'initializing' ||
      phase === 'capturing' ||
      phase === 'analyzing'
    ) {
      hapt.select();
      return;
    }

    // Tiny composition settle so a tap that lands during the
    // mount transition doesn't fire a blurry first frame.
    const elapsedSinceMount = Date.now() - screenMountedAtRef.current;
    if (elapsedSinceMount < COMPOSE_SETTLE_MS) {
      hapt.select();
      return;
    }

    if (mode !== 'face') {
      // Product / barcode skip the prepare ceremony — the user is
      // pointing at an inanimate object and expects an instant
      // shutter response.
      hapt.tap();
      return runCapture();
    }

    // v27 — REAL shutter gate. With the quality engine live, the
    // shutter fires only when every measured check passes. A tap
    // during a failing check acknowledges but does not capture — the
    // controller's instruction says exactly what to fix. The engine
    // has already verified the live frame, so the legacy 2s
    // countdown is skipped (it existed because we couldn't validate
    // pre-capture; now we can).
    if (engineLive) {
      if (!qualityRef.current.allPass) {
        hapt.select();
        return;
      }
      hapt.medium();
      return runCapture();
    }

    // No detector on this platform — keep the advisory countdown
    // flow; the post-capture preflight in ScanAnalyzing catches the
    // bad photos honestly after the fact.
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
  }, [engineLive, frameState, mode, runCapture]);

  // v27 — AUTO-capture: when every check holds for
  // AUTO_CAPTURE_HOLD_MS (~1.3s), the shutter fires without a tap.
  // The latch resets only when allPass drops, so a failed capture
  // can't machine-gun; manual tap stays available throughout.
  // (Capture ceremony animation lands in the next design pass —
  // this wires the logic.)
  const autoFiredRef = useRef(false);
  useEffect(() => {
    if (!engineLive || !quality.allPass) {
      autoFiredRef.current = false;
      return;
    }
    if (autoFiredRef.current || capturing || frameState === 'preparing') return;
    const t = setTimeout(() => {
      autoFiredRef.current = true;
      hapt.medium();
      void runCapture();
    }, QUALITY_T.AUTO_CAPTURE_HOLD_MS);
    return () => clearTimeout(t);
  }, [engineLive, quality.allPass, capturing, frameState, runCapture]);

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
          countdown={countdownValue}
          instruction={scanInstruction}
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

      {/* v27 — TEMPORARY quality-engine debug readout (dev or
          ?scanDebug=1). Every continuous signal, boolean, and the
          primary hint, live — proves detection is real. Removed
          once the designed quality UI lands. */}
      {mode === 'face' && scanDebugVisible ? (
        <ScanQualityDebugOverlay signals={quality} />
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
  // v35 Pass-1 State 7 "The Door" — permission denied redesign.
  // Italic Instrument Serif headline reads as a calm statement, not
  // a demand. Body sits in a quieter weight beneath. Restraint over
  // chrome; cornflower reserved (no accent here — terracotta is the
  // app's warmth color and the Open Settings CTA inherits the
  // existing PrimaryButton terracotta-leaning styling).
  permissionBox: {
    flex: 1,
    padding: space.lg,
    justifyContent: 'center',
    gap: space.sm,
  },
  permClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(250,247,244,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: space.lg,
  },
  permTitle: {
    ...typography.titleSerif,
    fontFamily: 'InstrumentSerif-Italic',
    color: palette.inkInverse,
    letterSpacing: -0.4,
    marginBottom: space.xs,
  },
  permBody: {
    ...typography.body,
    color: 'rgba(250,247,244,0.72)',
    marginBottom: space.md,
    maxWidth: 320,
  },
  // v19.14 — manual lighting toggle styles removed.
});

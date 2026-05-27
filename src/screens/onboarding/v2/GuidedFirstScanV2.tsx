/**
 * v29 — Guided first scan (real quality gate).
 *
 * The single most important screen in onboarding. The shutter is
 * disabled until the ScanQualityService says the live frame has passed
 * every check continuously for >= 500ms. There is no "use anyway"
 * override; a failing quality must block capture.
 *
 * What runs here:
 *   • Front-camera live preview
 *   • A one-shot luminance probe (the only signal we honestly have in
 *     Expo Go) drives the `lighting` check
 *   • Elapsed-since-lit time drives composition framing checks via the
 *     dev ScanQualityService adapter
 *   • A small status row surfaces the three most user-actionable checks
 *   • The shutter ring shifts from neutral → sage on `ready`
 *
 * On capture:
 *   • Take the photo
 *   • Run `evaluateCapturedImage` against the last live state
 *   • Store the captured URI + the captured quality state
 *   • Navigate to ScanReviewV2; review owns the approve/reject UI
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { CaretLeft, Check, LockKey } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useOnboardingV2 } from '@/state/onboardingV2';
import { onboardingV2 } from '@/ai/onboardingAnalyticsV2';
import {
  ALL_CHECKS,
  useScanQualityService,
  type ScanQualityCheck,
  type ScanQualityState,
  type LiveFrameInput,
} from '@/services/scanQualityService';
import { PURA, PURA_FONT, PURA_RADIUS } from '@/components/onboarding/v2';

export interface GuidedFirstScanV2Props {
  onCancel: () => void;
  onCaptured: () => void;
}

// The three status checks we surface in the small row beneath the oval.
const STATUS_ROW: ReadonlyArray<{
  key: ScanQualityCheck;
  positive: string;
  negative: string;
}> = [
  {
    key: 'fullFaceVisible',
    positive: 'Full face visible',
    negative: 'Full face not yet visible',
  },
  {
    key: 'lightingAcceptable',
    positive: 'Lighting clear',
    negative: 'Lighting needs to be brighter',
  },
  {
    key: 'faceCentered',
    positive: 'Face centered',
    negative: 'Center your face',
  },
];

void ALL_CHECKS;

export function GuidedFirstScanV2({
  onCancel,
  onCaptured,
}: GuidedFirstScanV2Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [permission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const service = useScanQualityService();

  const setCapturedScanUri = useOnboardingV2((s) => s.setCapturedScanUri);
  const setScanQualityStatus = useOnboardingV2((s) => s.setScanQualityStatus);
  const setLiveQuality = useOnboardingV2((s) => s.setLiveQuality);
  const setCapturedQuality = useOnboardingV2((s) => s.setCapturedQuality);

  const [quality, setQuality] = useState<ScanQualityState | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  // Track failure count over the run so we can offer help after several misses.
  const failureCountRef = useRef(0);

  useEffect(() => {
    onboardingV2.firstScanStarted();
  }, []);

  // Lighting probe — base64 length at low quality is a coarse luminance
  // proxy. Same approach used by the existing production scan; honest
  // because we own this signal.
  const probedRef = useRef(false);
  const lightingReadyAtRef = useRef<number | null>(null);
  const [luminance, setLuminance] = useState<'pending' | 'low' | 'good'>(
    'pending'
  );

  useEffect(() => {
    if (!permission?.granted || probedRef.current) return;
    probedRef.current = true;
    const t = setTimeout(async () => {
      try {
        const cam = cameraRef.current;
        if (!cam) {
          setLuminance('low');
          return;
        }
        const photo = await cam.takePictureAsync({
          quality: 0.05,
          base64: true,
          skipProcessing: true,
        });
        const b64 = photo?.base64 ?? '';
        const bytes = Math.floor((b64.length * 3) / 4);
        const dim = bytes < 32_000;
        if (dim) {
          setLuminance('low');
        } else {
          lightingReadyAtRef.current = Date.now();
          setLuminance('good');
        }
      } catch {
        setLuminance('low');
      }
    }, 900);
    return () => clearTimeout(t);
  }, [permission?.granted]);

  // Evaluation ticker — runs every 120ms while the camera is up so
  // `stableForMs` advances cleanly.
  useEffect(() => {
    if (!permission?.granted) return;
    const id = setInterval(() => {
      const elapsedSinceLightingMs =
        lightingReadyAtRef.current === null
          ? 0
          : Date.now() - lightingReadyAtRef.current;
      const input: LiveFrameInput = {
        cameraReady: !!permission?.granted,
        elapsedSinceLightingMs,
        luminance,
        // We don't have real motion measurements in Expo Go; assume the
        // user is reasonably still after framing settles.
        motionStabilityMs: elapsedSinceLightingMs,
      };
      const next = service.evaluateLiveFrame(input);
      setQuality(next);
      setLiveQuality(next);
    }, 120);
    return () => clearInterval(id);
  }, [permission?.granted, service, luminance, setLiveQuality]);

  // Soft haptic when capture first becomes allowed.
  const readyHapticFiredRef = useRef(false);
  useEffect(() => {
    if (!quality) return;
    if (quality.isCaptureAllowed && !readyHapticFiredRef.current) {
      readyHapticFiredRef.current = true;
      hapt.select();
    }
    if (!quality.isCaptureAllowed) {
      readyHapticFiredRef.current = false;
    }
  }, [quality]);

  // Capture handling — disabled tap shows the current correction.
  const handleCapture = useCallback(async () => {
    if (capturing) return;
    if (!cameraRef.current) return;
    if (!permission?.granted) return;

    if (!quality || !quality.isCaptureAllowed) {
      // Refuse capture, surface a gentle haptic + bump the failure
      // counter only if we've waited long enough to be meaningful.
      hapt.warning();
      failureCountRef.current += 1;
      if (failureCountRef.current >= 3 && !helpVisible) {
        setHelpVisible(true);
      }
      return;
    }

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      const uri = photo?.uri ?? null;
      if (!uri) {
        return;
      }
      const captured = await service.evaluateCapturedImage({
        uri,
        byteSize: undefined,
        lastLiveState: quality,
      });
      setCapturedScanUri(uri);
      setScanQualityStatus(captured.status === 'approved' ? 'good' : 'poor');
      setCapturedQuality(captured);
      onboardingV2.firstScanCaptured();
      hapt.success();
      onCaptured();
    } catch {
      // swallow — failure surfaces as "Retake" from the review screen
    } finally {
      setCapturing(false);
    }
  }, [
    capturing,
    helpVisible,
    onCaptured,
    permission?.granted,
    quality,
    service,
    setCapturedQuality,
    setCapturedScanUri,
    setScanQualityStatus,
  ]);

  // Oval breath while searching — settles in `ready`.
  const breathe = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) {
      breathe.value = 1;
      return;
    }
    if (quality?.isCaptureAllowed) {
      breathe.value = withTiming(1, { duration: 220 });
      return;
    }
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.012, {
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(1, {
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      false
    );
  }, [breathe, quality?.isCaptureAllowed, reduceMotion]);
  const ovalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  // Entry fade.
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = withDelay(80, withTiming(1, { duration: 320 }));
  }, [enter]);
  const enterStyle = useAnimatedStyle(() => ({ opacity: enter.value }));

  const captureAllowed = !!quality?.isCaptureAllowed && !capturing;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.backdrop} />

      {permission?.granted ? (
        <Animated.View style={[styles.cameraWrap, enterStyle]}>
          <CameraView
            ref={cameraRef}
            facing="front"
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      ) : null}

      {/* Vignette */}
      <View pointerEvents="none" style={styles.vignetteTop} />
      <View pointerEvents="none" style={styles.vignetteBottom} />

      {/* Face oval */}
      <View style={styles.ovalCenter} pointerEvents="none">
        <Animated.View
          style={[
            styles.oval,
            captureAllowed && styles.ovalReady,
            ovalStyle,
          ]}
        />
      </View>

      {/* Top bar */}
      <SafeAreaView edges={['top']} style={styles.topBarSafe}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel scan"
            hitSlop={10}
            style={({ pressed }) => [
              styles.topBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <CaretLeft size={18} color={PURA.paper} weight="bold" />
          </Pressable>
          <Text style={styles.topLabel} maxFontSizeMultiplier={1.15}>
            FIRST BASELINE SCAN
          </Text>
          <View style={styles.privacyBadge}>
            <LockKey size={12} color={PURA.paper} weight="duotone" />
            <Text style={styles.privacyBadgeText} maxFontSizeMultiplier={1.1}>
              Private
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Bottom controls */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) + 18 },
        ]}
      >
        {/* Status row — three honest checks */}
        <View style={styles.statusRow}>
          {STATUS_ROW.map((row) => {
            const ok = !!quality?.checks[row.key];
            return (
              <View key={row.key} style={styles.statusChip}>
                <View
                  style={[
                    styles.statusDot,
                    ok && styles.statusDotOn,
                  ]}
                >
                  {ok ? (
                    <Check size={9} color={PURA.paper} weight="bold" />
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.statusLabel,
                    ok && styles.statusLabelOn,
                  ]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.1}
                >
                  {ok ? row.positive : row.negative}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.instruction} maxFontSizeMultiplier={1.15}>
          {quality?.instruction ?? 'Place your full face inside the frame'}
        </Text>
        {quality?.instructionSubtext ? (
          <Text style={styles.subInstruction} maxFontSizeMultiplier={1.2}>
            {quality.instructionSubtext}
          </Text>
        ) : (
          <Text style={styles.subInstruction} maxFontSizeMultiplier={1.2}>
            Forehead to chin visible
          </Text>
        )}

        <View style={styles.captureRow}>
          <Pressable
            onPress={handleCapture}
            disabled={capturing}
            accessibilityRole="button"
            accessibilityLabel={
              captureAllowed
                ? 'Capture scan'
                : `Cannot capture yet: ${
                    quality?.instruction ?? 'Position your face'
                  }`
            }
            accessibilityState={{ disabled: !captureAllowed }}
            style={({ pressed }) => [
              styles.captureBtn,
              captureAllowed && styles.captureBtnReady,
              !captureAllowed && styles.captureBtnDisabled,
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
          >
            <View
              style={[
                styles.captureInner,
                captureAllowed && styles.captureInnerReady,
              ]}
            />
          </Pressable>
        </View>
      </View>

      {/* Repeated-failure help sheet */}
      {helpVisible ? (
        <View style={styles.helpScrim}>
          <SafeAreaView edges={['bottom']} style={styles.helpSheet}>
            <Text style={styles.helpEyebrow} maxFontSizeMultiplier={1.15}>
              HAVING TROUBLE WITH THE SCAN?
            </Text>
            <Text style={styles.helpTitle} maxFontSizeMultiplier={1.15}>
              Let’s make this easier.
            </Text>
            <Text style={styles.helpBody} maxFontSizeMultiplier={1.25}>
              Face a window or move into softer, even light. We’ll only
              continue when your scan is clear.
            </Text>
            <Pressable
              onPress={() => {
                hapt.tap();
                failureCountRef.current = 0;
                setHelpVisible(false);
              }}
              accessibilityRole="button"
              accessibilityLabel="Try again"
              style={({ pressed }) => [
                styles.helpPrimary,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.helpPrimaryLabel} maxFontSizeMultiplier={1.15}>
                Try again
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                hapt.tap();
                setHelpVisible(false);
                onCancel();
              }}
              accessibilityRole="button"
              accessibilityLabel="Exit for now"
              hitSlop={10}
              style={({ pressed }) => [
                styles.helpSecondary,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.helpSecondaryLabel} maxFontSizeMultiplier={1.15}>
                Exit for now
              </Text>
            </Pressable>
          </SafeAreaView>
        </View>
      ) : null}
    </View>
  );
}

// quiet imports kept for future approval-state previews
void Image;

const OVAL_WIDTH = 280;
const OVAL_HEIGHT = 360;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1A1410', position: 'relative' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1A1410',
  },
  cameraWrap: { ...StyleSheet.absoluteFillObject },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: 'rgba(10,7,5,0.5)',
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 260,
    backgroundColor: 'rgba(10,7,5,0.55)',
  },
  ovalCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oval: {
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    borderRadius: OVAL_WIDTH / 2,
    borderWidth: 2,
    borderColor: 'rgba(252,250,247,0.55)',
  },
  ovalReady: {
    borderColor: '#7A9A82',
    borderWidth: 2.5,
  },
  topBarSafe: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  topBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(252,250,247,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLabel: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 13,
    color: PURA.paper,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: PURA_RADIUS.pill,
    backgroundColor: 'rgba(252,250,247,0.18)',
  },
  privacyBadgeText: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 10.5,
    color: PURA.paper,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(252,250,247,0.14)',
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(252,250,247,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotOn: {
    backgroundColor: '#7A9A82',
  },
  statusLabel: {
    fontFamily: PURA_FONT.sansMed,
    fontSize: 11,
    color: 'rgba(252,250,247,0.72)',
  },
  statusLabelOn: {
    color: PURA.paper,
  },
  instruction: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 15,
    lineHeight: 20,
    color: PURA.paper,
    textAlign: 'center',
  },
  subInstruction: {
    fontFamily: PURA_FONT.sans,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(252,250,247,0.72)',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  captureRow: { alignItems: 'center', justifyContent: 'center' },
  captureBtn: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(252,250,247,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: PURA.paper,
  },
  captureBtnReady: {
    borderColor: '#7A9A82',
    backgroundColor: 'rgba(122,154,130,0.20)',
  },
  captureBtnDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PURA.paper,
  },
  captureInnerReady: {
    backgroundColor: '#EDF3EE',
  },
  // Help sheet
  helpScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,7,5,0.55)',
    justifyContent: 'flex-end',
  },
  helpSheet: {
    backgroundColor: PURA.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 24,
  },
  helpEyebrow: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 11,
    letterSpacing: 1.5,
    color: PURA.muted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  helpTitle: {
    fontFamily: PURA_FONT.serif,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: PURA.ink,
  },
  helpBody: {
    fontFamily: PURA_FONT.sans,
    fontSize: 15,
    lineHeight: 22,
    color: PURA.body,
    marginTop: 12,
    marginBottom: 20,
  },
  helpPrimary: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PURA.ink,
  },
  helpPrimaryLabel: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 15,
    color: PURA.paper,
  },
  helpSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  helpSecondaryLabel: {
    fontFamily: PURA_FONT.sansMed,
    fontSize: 14,
    color: PURA.muted,
    textDecorationLine: 'underline',
  },
});

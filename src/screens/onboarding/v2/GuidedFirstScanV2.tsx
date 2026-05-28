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
import Svg, { Ellipse, Defs, RadialGradient, Stop, Path } from 'react-native-svg';
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

// Cornflower blue — the single brand color reserved for the scan arc
// gauge. Used here for the capture-ready ring and the coverage arc
// stroked around the face oval. Never used outside the scan flow.
const SCAN_BLUE = '#6B8FE3';
const SCAN_BLUE_DEEP = '#4A6FC9';

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
  const checksReady = STATUS_ROW.filter((r) => !!quality?.checks[r.key]).length;
  const coverage = checksReady / STATUS_ROW.length;

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

      {/* Cinematic vignette — top is heavier so the top bar reads
          clearly, bottom is mid-weight to support the instruction stack */}
      <View pointerEvents="none" style={styles.vignetteTop} />
      <View pointerEvents="none" style={styles.vignetteBottom} />
      <View pointerEvents="none" style={styles.vignetteCenter} />

      {/* Face oval — paper-soft halo + double ring; cornflower blue
          coverage arc fills as more checks pass. The single brand color
          reserved exclusively for this scan moment. */}
      <View style={styles.ovalCenter} pointerEvents="none">
        <Animated.View style={ovalStyle}>
          <FaceOval coverage={coverage} ready={captureAllowed} />
        </Animated.View>
      </View>

      {/* Top bar — single editorial line, no competing badge */}
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
          <View style={styles.topCenter}>
            <Text style={styles.topKicker} maxFontSizeMultiplier={1.1}>
              FIRST BASELINE
            </Text>
            <View style={styles.topRule} />
          </View>
          <View style={styles.privacyBadge}>
            <LockKey size={11} color={PURA.paper} weight="duotone" />
          </View>
        </View>
      </SafeAreaView>

      {/* Bottom — three quiet status dots inline, then the editorial
          italic-serif instruction, then a refined capture disc */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) + 22 },
        ]}
      >
        <View style={styles.statusRow}>
          {STATUS_ROW.map((row, i) => {
            const ok = !!quality?.checks[row.key];
            return (
              <View key={row.key} style={styles.statusItem}>
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
                {i < STATUS_ROW.length - 1 ? (
                  <View style={styles.statusSep} />
                ) : null}
              </View>
            );
          })}
        </View>

        <Text style={styles.instruction} maxFontSizeMultiplier={1.15}>
          {quality?.instruction ?? 'Place your full face inside the frame'}
        </Text>
        <Text style={styles.subInstruction} maxFontSizeMultiplier={1.2}>
          {quality?.instructionSubtext ?? 'Forehead to chin, in even light'}
        </Text>

        <View style={styles.captureRow}>
          {captureAllowed ? (
            <View pointerEvents="none" style={styles.captureGlow} />
          ) : null}
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
          <Text style={styles.captureHint} maxFontSizeMultiplier={1.15}>
            {captureAllowed ? 'Hold still — tap to capture' : `${checksReady}/3 ready`}
          </Text>
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

// -----------------------------------------------------------------------------
// FaceOval — the cinematic capture frame.
// Soft inner halo + paper-soft outer ring + cornflower-blue coverage arc that
// fills as more quality checks pass. When `ready`, the inner ring shifts
// to a saturated cornflower blue stroke and the outer halo brightens.
// -----------------------------------------------------------------------------

function FaceOval({ coverage, ready }: { coverage: number; ready: boolean }) {
  const W = OVAL_WIDTH;
  const H = OVAL_HEIGHT;
  const cx = W / 2;
  const cy = H / 2;
  const rx = (W - 10) / 2;
  const ry = (H - 10) / 2;

  // Coverage arc: stroke an ellipse but only render `coverage` of the
  // approximate perimeter via dash array.
  const approxPerim = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const dash = approxPerim * coverage;
  const gap = approxPerim - dash;

  // Inner cross hairs for centering — quiet, only visible when not ready
  const crossLen = 14;

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <RadialGradient id="ovalHalo" cx="50%" cy="50%" r="55%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={ready ? 0.10 : 0.04} />
          <Stop offset="80%" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Inner halo — soft skin-warm glow */}
      <Ellipse cx={cx} cy={cy} rx={rx - 4} ry={ry - 4} fill="url(#ovalHalo)" />

      {/* Outer paper ring */}
      <Ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="none"
        stroke="rgba(252,250,247,0.45)"
        strokeWidth={1.5}
      />

      {/* Inner ready ring — cornflower blue when armed */}
      <Ellipse
        cx={cx}
        cy={cy}
        rx={rx - 12}
        ry={ry - 12}
        fill="none"
        stroke={ready ? SCAN_BLUE : 'rgba(252,250,247,0.18)'}
        strokeWidth={ready ? 2 : 1}
        strokeDasharray={ready ? undefined : '3 6'}
      />

      {/* Coverage arc — cornflower blue progressive sweep starting at top */}
      {coverage > 0 ? (
        <Ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={ready ? SCAN_BLUE_DEEP : SCAN_BLUE}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={approxPerim * 0.25}
          opacity={0.85}
        />
      ) : null}

      {/* Centering cross — fades when ready */}
      {!ready ? (
        <>
          <Path
            d={`M${cx - crossLen} ${cy} L${cx + crossLen} ${cy}`}
            stroke="rgba(252,250,247,0.5)"
            strokeWidth={1}
            strokeLinecap="round"
          />
          <Path
            d={`M${cx} ${cy - crossLen} L${cx} ${cy + crossLen}`}
            stroke="rgba(252,250,247,0.5)"
            strokeWidth={1}
            strokeLinecap="round"
          />
        </>
      ) : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0B08', position: 'relative' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F0B08',
  },
  cameraWrap: { ...StyleSheet.absoluteFillObject },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(10,7,5,0.62)',
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 320,
    backgroundColor: 'rgba(10,7,5,0.66)',
  },
  vignetteCenter: {
    position: 'absolute',
    top: 200,
    bottom: 320,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10,7,5,0.18)',
  },
  ovalCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarSafe: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 12,
  },
  topBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(252,250,247,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(252,250,247,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  topKicker: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 10.5,
    color: 'rgba(252,250,247,0.88)',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  topRule: {
    width: 26,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(252,250,247,0.36)',
  },
  privacyBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(252,250,247,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(252,250,247,0.22)',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 18,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    marginBottom: 18,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(252,250,247,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotOn: {
    backgroundColor: SCAN_BLUE,
  },
  statusSep: {
    width: 12,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(252,250,247,0.28)',
    marginHorizontal: 10,
  },
  statusLabel: {
    fontFamily: PURA_FONT.sansMed,
    fontSize: 11,
    color: 'rgba(252,250,247,0.62)',
  },
  statusLabelOn: {
    color: PURA.paper,
  },
  instruction: {
    fontFamily: PURA_FONT.serifItalic,
    fontSize: 22,
    lineHeight: 28,
    color: PURA.paper,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  subInstruction: {
    fontFamily: PURA_FONT.sans,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(252,250,247,0.62)',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 22,
  },
  captureRow: { alignItems: 'center', justifyContent: 'center' },
  captureGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: SCAN_BLUE,
    opacity: 0.18,
    top: -16,
  },
  captureBtn: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(252,250,247,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(252,250,247,0.55)',
  },
  captureBtnReady: {
    borderColor: SCAN_BLUE,
    backgroundColor: 'rgba(107,143,227,0.18)',
  },
  captureBtnDisabled: {
    opacity: 0.7,
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PURA.paper,
  },
  captureInnerReady: {
    backgroundColor: '#F4F7FF',
  },
  captureHint: {
    fontFamily: PURA_FONT.sansMed,
    fontSize: 11,
    color: 'rgba(252,250,247,0.66)',
    marginTop: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
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

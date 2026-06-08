/**
 * SeenIntoFocusScreen — the scan "Observe" moment (a.k.a. AnalyzingScreen).
 *
 * The emotional climax of onboarding, right after the user captured their bare,
 * unfiltered face. A calm, perceptive intelligence genuinely LOOKS at this
 * specific face: it starts soft, then resolves into clarity and warm light as
 * attention moves the way real eyes move — linger on the eyes, dwell on the
 * skin and T-zone, sweep the under-eyes — then settles and turns to you.
 *
 * NOT a loading screen. NOT a scanner. No scan-bar, no reticle, no progress,
 * no percentage, no retouching of the photo. The realness is the trust.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NEW DEPENDENCIES (optional, for the full-fidelity face composition):
 *   • @shopify/react-native-skia   →  npx expo install @shopify/react-native-skia
 *     (Skia needs a dev build, not Expo Go.)
 *   • expo-haptics                 →  already installed.
 *
 * GRACEFUL DEGRADATION — IMPORTANT:
 *   Metro resolves every literal `import`/`require` at BUILD time, so a guarded
 *   `require('@shopify/react-native-skia')` would break the bundle when Skia is
 *   absent. Instead this screen imports an RN-only FallbackFaceCompositor by
 *   default (smooth crossfade-resolve + a traveling warm key — runs TODAY).
 *   The full Skia compositor lives in an ORPHAN file that nothing imports, so
 *   Metro never bundles it and it can't break the build. After installing Skia,
 *   light up full fidelity by swapping ONE import line below:
 *
 *     // import { FallbackFaceCompositor as FaceCompositor } from './seenIntoFocus/FallbackFaceCompositor';
 *     import { SeenIntoFocusSkiaCompositor as FaceCompositor } from './seenIntoFocus/SeenIntoFocusSkiaCompositor';
 *
 * DATA CONTRACT (decide-and-justify):
 *   The original brief proposed a loose `{ usable; retakeReason?; [k]:any }`
 *   prop. This codebase's law (CLAUDE.md) forbids screens reading scattered raw
 *   AI output — they must read canonical, UI-ready state. So `analysis` is typed
 *   as the canonical `ScanAnalysisResult` union (src/types/scanResults.ts) and a
 *   tiny presentational view-model is derived from it here (deriveObservation).
 *   `usable` maps to "the scan quality is not retake_required"; the honest
 *   handoff copy comes from the canonical `scanQuality.userMessage`.
 *
 * All cinematic motion is GPU/UI-thread: ONE Reanimated `progress` value →
 * every derived value in worklets. Nothing animates on the JS thread. Timeline
 * is decoupled from the network and survives backgrounding (pause/resume).
 *
 * Stack note: project ships Reanimated 4 (brief said 3); the worklet API used
 * here is identical across both.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import type {
  ScanAnalysisResponse,
  ScanAnalysisResult,
} from '@/types/scanResults';

import { LivingLight } from './seenIntoFocus/LivingLight';
// ── Face compositor — RN fallback by default. Swap to the Skia line after
//    `npx expo install @shopify/react-native-skia` (see header). ──────────────
import { FallbackFaceCompositor as FaceCompositor } from './seenIntoFocus/FallbackFaceCompositor';

import {
  BASE_BRIGHT,
  BLUR_R,
  CONSIDERING_LINE,
  COMPANION,
  FOCUS_R,
  FONTS,
  FRAME_ASPECT,
  FRAME_WIDTH_FRACTION,
  HANDOFF_CTA,
  HANDOFF_FALLBACK_REASON,
  HANDOFF_TIP,
  KEY_LIGHT,
  KEY_OPACITY,
  ORIENT_CTA,
  ORIENT_TITLE,
  PATH,
  RM_FOCUS_CENTER,
  RM_KEY_OPACITY,
  SETTLE,
  SHARP_BRIGHT,
  SHARP_OPACITY,
  TOK,
  VOICE,
  env,
  sample,
} from './seenIntoFocus/motion';

// ───────────────────────────────────────────────────────────────────────────
// Props — the network-decoupled gate. Wire to the Zustand scan flow.
// ───────────────────────────────────────────────────────────────────────────

export interface SeenIntoFocusScreenProps {
  /** The bare captured face. */
  photoUri: string;
  /** Canonical scan result, or null while the analysis is still in flight. */
  analysis: ScanAnalysisResult | null;
  /** Fired by the primary CTA — only ever called with a usable success result. */
  onSeeResults: (result: ScanAnalysisResponse) => void;
  /** Honest handoff — bad photo or service error. */
  onRetake: () => void;
  /** Minimal companion face. Defaults to the established Pura identity (on). */
  showCompanionFace?: boolean;
}

// ── Presentational view-model derived from the canonical contract. ───────────

type Observation =
  | { status: 'pending' }
  | { status: 'usable'; result: ScanAnalysisResponse }
  | { status: 'retake'; reason: string; tip: string }
  | { status: 'service_error'; reason: string; tip: string };

function deriveObservation(a: ScanAnalysisResult | null): Observation {
  if (a == null) return { status: 'pending' };
  if (a.serviceStatus === 'error') {
    return { status: 'service_error', reason: a.userMessage || HANDOFF_FALLBACK_REASON, tip: HANDOFF_TIP };
  }
  // success
  if (a.scanQuality.usability === 'retake_required') {
    return {
      status: 'retake',
      reason: a.scanQuality.userMessage || HANDOFF_FALLBACK_REASON,
      tip: HANDOFF_TIP,
    };
  }
  // full_results | limited_results → the face resolved and we can proceed.
  return { status: 'usable', result: a };
}

const A11Y_MOUNT = 'Reading your skin. Looking at your forehead, cheeks, and under eyes.';
const A11Y_READY = 'Ready. See what I found.';

// ───────────────────────────────────────────────────────────────────────────

export function SeenIntoFocusScreen({
  photoUri,
  analysis,
  onSeeResults,
  onRetake,
  showCompanionFace = true,
}: SeenIntoFocusScreenProps) {
  const { width: screenW } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  // Fixed frame so portrait/landscape/square photos never shift layout.
  const frameW = Math.min(screenW * FRAME_WIDTH_FRACTION, 360);
  const frameH = frameW / FRAME_ASPECT;
  const companionSize = Math.round(frameW * 0.5);

  // ── ONE master timeline value → everything derives from it. ────────────────
  const progress = useSharedValue(0); // 0→1 over SETTLE, linear in time
  const settle = useSharedValue(0); // 0→1 during the settle pop

  const [voiceIndex, setVoiceIndex] = useState(-1); // -1 = no line yet
  const [examinationDone, setExaminationDone] = useState(false);

  // ── Derived cinematic values (UI thread). Brief's env()/sample() ported. ───
  const focusCenter = useDerivedValue(() => {
    const t = progress.value * SETTLE;
    if (reduceMotion) {
      return { x: (RM_FOCUS_CENTER.x / 100) * frameW, y: (RM_FOCUS_CENTER.y / 100) * frameH };
    }
    const g = sample(PATH, t);
    return { x: (g.x / 100) * frameW, y: (g.y / 100) * frameH };
  });
  const blurR = useDerivedValue(() => env(BLUR_R, progress.value * SETTLE));
  const focusRpx = useDerivedValue(() => env(FOCUS_R, progress.value * SETTLE) * frameW);
  const sharpOpacity = useDerivedValue(() => env(SHARP_OPACITY, progress.value * SETTLE));
  const baseBright = useDerivedValue(() => env(BASE_BRIGHT, progress.value * SETTLE));
  const sharpBright = useDerivedValue(() => env(SHARP_BRIGHT, progress.value * SETTLE));
  const keyOpacity = useDerivedValue(() =>
    env(reduceMotion ? RM_KEY_OPACITY : KEY_OPACITY, progress.value * SETTLE),
  );
  const keyCenter = useDerivedValue(() => {
    const f = focusCenter.value;
    return { x: f.x, y: f.y - KEY_LIGHT.liftAboveFocus * frameH };
  });

  // ── Timeline controller — decoupled from the network, survives background. ─
  const playedRef = useRef(0); // ms played before the current run
  const runStartRef = useRef<number | null>(null);
  const voiceTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(false);
  const mountedRef = useRef(true);

  const clearVoiceTimers = useCallback(() => {
    voiceTimers.current.forEach(clearTimeout);
    voiceTimers.current = [];
  }, []);

  const fireSettle = useCallback(() => {
    if (doneRef.current || !mountedRef.current) return;
    doneRef.current = true;
    playedRef.current = SETTLE;
    runStartRef.current = null;
    settle.value = withTiming(1, { duration: COMPANION.settleMs, easing: Easing.out(Easing.cubic) });
    setExaminationDone(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* haptics unavailable (e.g. web) — additive only, ignore. */
    }
  }, [settle]);

  const play = useCallback(() => {
    if (doneRef.current) return;
    const from = playedRef.current;
    // Reflect the latest voice line already passed at this point.
    let idx = -1;
    for (let i = 0; i < VOICE.length; i++) if (VOICE[i].t <= from) idx = i;
    setVoiceIndex(idx);

    runStartRef.current = Date.now();
    const remaining = Math.max(0, SETTLE - from);
    progress.value = from / SETTLE;
    progress.value = withTiming(1, { duration: remaining, easing: Easing.linear }, (fin) => {
      if (fin) runOnJS(fireSettle)();
    });

    clearVoiceTimers();
    VOICE.forEach((v, i) => {
      if (v.t > from) {
        const id = setTimeout(() => {
          if (mountedRef.current) setVoiceIndex(i);
        }, v.t - from);
        voiceTimers.current.push(id);
      }
    });
    if (remaining <= 0) fireSettle();
  }, [progress, fireSettle, clearVoiceTimers]);

  const pause = useCallback(() => {
    if (doneRef.current) return;
    if (runStartRef.current != null) {
      playedRef.current = Math.min(SETTLE, playedRef.current + (Date.now() - runStartRef.current));
      runStartRef.current = null;
    }
    cancelAnimation(progress);
    clearVoiceTimers();
  }, [progress, clearVoiceTimers]);

  useEffect(() => {
    mountedRef.current = true;
    play();
    AccessibilityInfo.announceForAccessibility(A11Y_MOUNT);
    const onAppState = (s: AppStateStatus) => {
      if (s === 'active') play();
      else pause();
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => {
      mountedRef.current = false;
      sub.remove();
      clearVoiceTimers();
      cancelAnimation(progress);
      cancelAnimation(settle);
    };
    // Controller is self-stable (refs + stable callbacks); run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Bottom-of-screen mode + announcements. ─────────────────────────────────
  const obs = useMemo(() => deriveObservation(analysis), [analysis]);
  const mode: 'voice' | 'considering' | 'orient' | 'handoff' = useMemo(() => {
    if (!examinationDone) return 'voice';
    if (obs.status === 'pending') return 'considering';
    if (obs.status === 'usable') return 'orient';
    return 'handoff';
  }, [examinationDone, obs.status]);

  useEffect(() => {
    if (mode === 'orient') AccessibilityInfo.announceForAccessibility(A11Y_READY);
    else if (mode === 'handoff' && obs.status !== 'pending' && obs.status !== 'usable') {
      AccessibilityInfo.announceForAccessibility(`${obs.reason} ${obs.tip}`);
    } else if (mode === 'considering') {
      AccessibilityInfo.announceForAccessibility(CONSIDERING_LINE);
    }
  }, [mode, obs]);

  const handoffReason = obs.status === 'retake' || obs.status === 'service_error' ? obs.reason : HANDOFF_FALLBACK_REASON;
  const handoffTip = obs.status === 'retake' || obs.status === 'service_error' ? obs.tip : HANDOFF_TIP;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <BackgroundWash />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.stage}>
          <View style={styles.composition}>
            {/* Companion above the frame; warm key inside the frame appears to
                come from it and tracks the gaze. */}
            <LivingLight
              size={companionSize}
              progress={progress}
              settle={settle}
              reduceMotion={reduceMotion}
              showFace={showCompanionFace}
            />
            <View style={{ marginTop: -companionSize * 0.3 }}>
              <View
                style={[
                  styles.frame,
                  { width: frameW, height: frameH, borderRadius: TOK.frameRadius },
                ]}
              >
                <FaceCompositor
                  photoUri={photoUri}
                  frameW={frameW}
                  frameH={frameH}
                  reduceMotion={reduceMotion}
                  focusCenter={focusCenter}
                  keyCenter={keyCenter}
                  blurR={blurR}
                  focusRpx={focusRpx}
                  sharpOpacity={sharpOpacity}
                  baseBright={baseBright}
                  sharpBright={sharpBright}
                  keyOpacity={keyOpacity}
                />
              </View>
            </View>
          </View>

          {/* Bottom voice / orient / considering / handoff. */}
          <View style={styles.bottom}>
            {mode === 'voice' && voiceIndex >= 0 && (
              <Animated.Text
                key={`voice-${voiceIndex}`}
                entering={FadeIn.duration(420)}
                exiting={FadeOut.duration(420)}
                style={styles.voice}
                maxFontSizeMultiplier={1.6}
                accessibilityLiveRegion="polite"
              >
                {VOICE[voiceIndex].text}
              </Animated.Text>
            )}

            {mode === 'considering' && (
              <Rise>
                <Text style={styles.voice} maxFontSizeMultiplier={1.6} accessibilityLiveRegion="polite">
                  {CONSIDERING_LINE}
                </Text>
              </Rise>
            )}

            {mode === 'orient' && obs.status === 'usable' && (
              <Rise>
                <Text style={styles.orient} maxFontSizeMultiplier={1.4}>
                  {ORIENT_TITLE}
                </Text>
                <PrimaryButton
                  label={ORIENT_CTA}
                  onPress={() => onSeeResults(obs.result)}
                />
              </Rise>
            )}

            {mode === 'handoff' && (
              <Rise>
                <Text style={styles.orient} maxFontSizeMultiplier={1.4}>
                  {handoffReason}
                </Text>
                <Text style={styles.tip} maxFontSizeMultiplier={1.6}>
                  {handoffTip}
                </Text>
                <PrimaryButton label={HANDOFF_CTA} onPress={onRetake} variant="quiet" />
              </Rise>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

/** Integration-shell alias from the brief. */
export { SeenIntoFocusScreen as AnalyzingScreen };

// ───────────────────────────────────────────────────────────────────────────
// Pieces
// ───────────────────────────────────────────────────────────────────────────

/** Warm-dark radial hero background. */
function BackgroundWash() {
  return (
    <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Defs>
        <RadialGradient id="sif-bg" cx="50%" cy="30%" r="92%">
          <Stop offset="0" stopColor={TOK.bg[0]} />
          <Stop offset="0.6" stopColor={TOK.bg[1]} />
          <Stop offset="1" stopColor={TOK.bg[2]} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#sif-bg)" />
    </Svg>
  );
}

/**
 * Continuous rise — NOT a plain fade. Used for the orient block + handoff so
 * they enter with intent. (The voice line uses the spec's 0.42s cross-fade.)
 */
function Rise({ children }: { children: React.ReactNode }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 560, easing: Easing.bezier(0.22, 1, 0.36, 1) });
    return () => cancelAnimation(t);
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 16 }],
  }));
  return <Animated.View style={[styles.riseBlock, style]}>{children}</Animated.View>;
}

function PrimaryButton({
  label,
  onPress,
  variant = 'accent',
}: {
  label: string;
  onPress: () => void;
  variant?: 'accent' | 'quiet';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        variant === 'accent' ? styles.buttonAccent : styles.buttonQuiet,
        pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] },
      ]}
    >
      <Text style={[styles.buttonLabel, variant === 'quiet' && styles.buttonLabelQuiet]} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOK.bg[1] },
  safe: { flex: 1 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  composition: { alignItems: 'center' },
  frame: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TOK.frameBorder,
    backgroundColor: '#0A0B0F',
  },
  bottom: {
    minHeight: 188,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 34,
  },
  riseBlock: { alignItems: 'center', width: '100%' },
  voice: {
    ...FONTS.voice,
    color: TOK.ink,
    textAlign: 'center',
    opacity: 0.92,
  },
  orient: {
    ...FONTS.orient,
    color: TOK.ink,
    textAlign: 'center',
    marginBottom: 22,
  },
  tip: {
    ...FONTS.tip,
    color: TOK.muted,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 22,
    maxWidth: 300,
  },
  button: {
    minHeight: 52,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonAccent: { backgroundColor: TOK.accent },
  buttonQuiet: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(244,244,239,0.28)',
  },
  buttonLabel: { ...FONTS.button, color: '#FFFFFF' },
  buttonLabelQuiet: { color: TOK.ink },
});

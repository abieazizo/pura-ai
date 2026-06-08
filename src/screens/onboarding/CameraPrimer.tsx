import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { AuroraOrb } from '@/components/AuroraOrb';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { palette } from '@/theme';

export interface CameraPrimerProps {
  onContinue: () => void;
}

/**
 * Screen 3 — Pre-camera-permission (onboarding rebuild).
 *
 * The honest hand-off before the system prompt. A centered, editorial beat:
 * a small typographic Pura mark, the headline, and a privacy promise. No
 * fake iOS dialog mock (that pantomimed the system sheet), no progress bar.
 *
 *   ( ◍ )                                  ← the companion AuroraOrb (continuity)
 *
 *   Now, the scan.                         ← Instrument Serif headline
 *   Pura uses your camera to read your     ← Inter subhead, generous leading
 *   skin in detail — texture, tone,
 *   hydration, barrier health. Scans live
 *   on your device. Nothing leaves.
 *
 *   [ Continue ]                           ← Ink CTA → CameraPermission
 *
 * Continue fires the real system camera prompt on the next screen
 * (CameraPermission). This is the last beat before the camera, so the
 * companion ORB brands it (not a static "P" monogram) — the companion stays
 * continuous right up to the scan.
 */
export function CameraPrimer({ onContinue }: CameraPrimerProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  const glyphOp = useSharedValue(0);
  const glyphScale = useSharedValue(reduceMotion ? 1 : 0.92);
  const headOp = useSharedValue(0);
  const headY = useSharedValue(reduceMotion ? 0 : 12);
  const subOp = useSharedValue(0);
  const ctaOp = useSharedValue(0);
  const ctaY = useSharedValue(reduceMotion ? 0 : 10);

  useEffect(() => {
    const easeOut = Easing.out(Easing.cubic);
    if (reduceMotion) {
      glyphOp.value = 1;
      glyphScale.value = 1;
      headOp.value = 1;
      headY.value = 0;
      subOp.value = 1;
      ctaOp.value = 1;
      ctaY.value = 0;
      return;
    }
    glyphOp.value = withTiming(1, { duration: 360, easing: easeOut });
    glyphScale.value = withTiming(1, { duration: 360, easing: easeOut });
    headOp.value = withDelay(120, withTiming(1, { duration: 420, easing: easeOut }));
    headY.value = withDelay(120, withTiming(0, { duration: 420, easing: easeOut }));
    subOp.value = withDelay(240, withTiming(1, { duration: 420, easing: easeOut }));
    ctaOp.value = withDelay(420, withTiming(1, { duration: 420, easing: easeOut }));
    ctaY.value = withDelay(420, withTiming(0, { duration: 420, easing: easeOut }));
  }, [reduceMotion, glyphOp, glyphScale, headOp, headY, subOp, ctaOp, ctaY]);

  const glyphStyle = useAnimatedStyle(() => ({
    opacity: glyphOp.value,
    transform: [{ scale: glyphScale.value }],
  }));
  const headStyle = useAnimatedStyle(() => ({
    opacity: headOp.value,
    transform: [{ translateY: headY.value }],
  }));
  const subStyle = useAnimatedStyle(() => ({ opacity: subOp.value }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOp.value,
    transform: [{ translateY: ctaY.value }],
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.body}>
        <Animated.View style={[styles.glyphWrap, glyphStyle]}>
          <AuroraOrb
            size={96}
            state="idle"
            reduceMotion={reduceMotion}
            auraTheme="blue-warm"
          />
        </Animated.View>

        <Animated.Text style={[styles.eyebrow, headStyle]} maxFontSizeMultiplier={1.2}>
          THE SCAN
        </Animated.Text>

        <Animated.Text
          style={[styles.headline, headStyle]}
          maxFontSizeMultiplier={1.15}
          accessibilityRole="header"
        >
          Now, the scan.
        </Animated.Text>

        <Animated.Text style={[styles.sub, subStyle]} maxFontSizeMultiplier={1.25}>
          Pura uses your camera to read your skin in detail — texture, tone,
          hydration, barrier health. Scans live on your device. Nothing leaves.
        </Animated.Text>
      </View>

      <Animated.View
        style={[styles.ctaWrap, ctaStyle, { paddingBottom: insets.bottom + 24 }]}
      >
        <OnboardingPrimaryButton label="Continue" onPress={onContinue} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphWrap: {
    marginBottom: 26,
  },
  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
    color: palette.clay,
    textAlign: 'center',
    marginBottom: 14,
  },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: -1.2,
    color: palette.ink,
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 25,
    letterSpacing: -0.1,
    color: palette.inkSecondary,
    textAlign: 'center',
    marginTop: 18,
    maxWidth: 326,
  },
  ctaWrap: {
    paddingTop: 8,
  },
});

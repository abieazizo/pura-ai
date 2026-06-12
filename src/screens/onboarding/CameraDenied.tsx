import React, { useEffect } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PuraGlyph } from '@/components/PuraGlyph';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { palette } from '@/theme';

export interface CameraDeniedProps {
  /** Continue into the app with no scan data (lands Home). */
  onSkip: () => void;
}

/**
 * Camera-denied fallback (onboarding rebuild).
 *
 * The calm dead-end recovery when the user declines the system camera
 * prompt. Two ways forward — open Settings to grant access (the OS
 * permission persists, so a later scan from Home just works), or skip the
 * scan and explore the app now. Never a hard wall.
 *
 *   (P)
 *
 *   Camera access is off.
 *   Pura needs camera access to read your skin. Open settings to enable,
 *   or skip the scan and explore the app.
 *
 *   [ Open Settings ]      ← Ink
 *   [ Skip for now ]       ← tonal (porcelain + hairline)
 */
export function CameraDenied({ onSkip }: CameraDeniedProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  const op = useSharedValue(reduceMotion ? 1 : 0);
  const y = useSharedValue(reduceMotion ? 0 : 10);

  useEffect(() => {
    if (reduceMotion) return;
    const easeOut = Easing.out(Easing.cubic);
    op.value = withTiming(1, { duration: 360, easing: easeOut });
    y.value = withTiming(0, { duration: 360, easing: easeOut });
  }, [reduceMotion, op, y]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: y.value }],
  }));

  const openSettings = () => {
    Linking.openSettings().catch(() => {
      // If the platform can't deep-link to settings, leave the user on the
      // fallback — "Skip for now" is still a valid way forward.
    });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <Animated.View style={[styles.body, contentStyle]}>
        <View style={styles.glyphWrap}>
          <PuraGlyph size={56} tone="ink" ring />
        </View>

        <Animated.Text
          style={styles.headline}
          maxFontSizeMultiplier={1.15}
          accessibilityRole="header"
        >
          Camera access is off.
        </Animated.Text>

        <Animated.Text style={styles.sub} maxFontSizeMultiplier={1.25}>
          Pura uses the camera to read your skin. Turn it on in Settings, or
          skip the scan for now.
        </Animated.Text>
      </Animated.View>

      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 24 }]}>
        <OnboardingPrimaryButton label="Open Settings" onPress={openSettings} />
        <OnboardingPrimaryButton
          label="Skip for now"
          onPress={onSkip}
          tonal
          style={styles.skipBtn}
        />
      </View>
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
    marginBottom: 24,
  },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: palette.ink,
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 26,
    color: palette.inkSecondary,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 330,
  },
  ctaWrap: {
    paddingTop: 8,
  },
  skipBtn: {
    marginTop: 12,
  },
});

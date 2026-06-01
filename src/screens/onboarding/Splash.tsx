import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { palette } from '@/theme';

export interface SplashProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

/**
 * Screen 1 — Welcome (onboarding rebuild).
 *
 * The honest front door. One promise, one action. No fake skin-score
 * preview card (the app can't show a score before the first scan), no
 * raster droplet, no progress bar, no questionnaire framing.
 *
 *   PURA                                   ← eyebrow (tracked caps)
 *
 *   Pura reads your skin in 60 seconds.    ← Instrument Serif headline
 *   One scan. A routine that adapts to     ← Inter subhead
 *   what your skin actually needs.
 *
 *   [ Begin ]                              ← single Ink CTA
 *   Already have an account? Sign in.      ← returning-user link
 *
 * Next: AskName (Screen 2). The fake `ValuePreviewCard` and `PuraMark`
 * droplet that lived here were deleted in this rebuild.
 */
export function Splash({ onGetStarted, onSignIn }: SplashProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  const eyebrowOp = useSharedValue(0);
  const headlineOp = useSharedValue(0);
  const headlineY = useSharedValue(reduceMotion ? 0 : 12);
  const subOp = useSharedValue(0);
  const ctaOp = useSharedValue(0);
  const ctaY = useSharedValue(reduceMotion ? 0 : 10);

  useEffect(() => {
    const easeOut = Easing.out(Easing.cubic);
    if (reduceMotion) {
      eyebrowOp.value = 1;
      headlineOp.value = 1;
      headlineY.value = 0;
      subOp.value = 1;
      ctaOp.value = 1;
      ctaY.value = 0;
      return;
    }
    eyebrowOp.value = withTiming(1, { duration: 320, easing: easeOut });
    headlineOp.value = withDelay(120, withTiming(1, { duration: 420, easing: easeOut }));
    headlineY.value = withDelay(120, withTiming(0, { duration: 420, easing: easeOut }));
    subOp.value = withDelay(260, withTiming(1, { duration: 420, easing: easeOut }));
    ctaOp.value = withDelay(420, withTiming(1, { duration: 420, easing: easeOut }));
    ctaY.value = withDelay(420, withTiming(0, { duration: 420, easing: easeOut }));
  }, [reduceMotion, eyebrowOp, headlineOp, headlineY, subOp, ctaOp, ctaY]);

  const eyebrowStyle = useAnimatedStyle(() => ({ opacity: eyebrowOp.value }));
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOp.value,
    transform: [{ translateY: headlineY.value }],
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
        <Animated.Text style={[styles.eyebrow, eyebrowStyle]} maxFontSizeMultiplier={1.1}>
          PURA
        </Animated.Text>

        <View style={styles.headlineBlock}>
          <Animated.Text
            style={[styles.headline, headlineStyle]}
            maxFontSizeMultiplier={1.15}
            accessibilityRole="header"
          >
            Pura reads your skin in 60 seconds.
          </Animated.Text>

          <Animated.Text style={[styles.sub, subStyle]} maxFontSizeMultiplier={1.25}>
            One scan. A routine that adapts to what your skin actually needs.
          </Animated.Text>
        </View>
      </View>

      <Animated.View
        style={[styles.ctaWrap, ctaStyle, { paddingBottom: insets.bottom + 12 }]}
      >
        <OnboardingPrimaryButton label="Begin" onPress={onGetStarted} />

        <Pressable
          onPress={onSignIn}
          accessibilityRole="button"
          accessibilityLabel="Already have an account? Sign in"
          style={({ pressed }) => [styles.signInRow, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <Text style={styles.signInLead} maxFontSizeMultiplier={1.15}>
            Already have an account?{' '}
            <Text style={styles.signInAction}>Sign in.</Text>
          </Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  eyebrow: {
    position: 'absolute',
    top: 8,
    left: 28,
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 3,
    color: palette.inkTertiary,
  },
  headlineBlock: {
    // Nudge the headline block slightly above true center for an
    // editorial, top-weighted feel.
    marginTop: -40,
  },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.6,
    color: palette.ink,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: palette.inkSecondary,
    marginTop: 16,
    maxWidth: 320,
  },
  ctaWrap: {
    paddingTop: 8,
  },
  signInRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 6,
  },
  signInLead: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: palette.inkSecondary,
  },
  signInAction: {
    fontFamily: 'Inter-SemiBold',
    color: palette.ink,
  },
});

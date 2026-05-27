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
import { ShieldCheck } from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { ValuePreviewCard } from '@/components/onboarding/ValuePreviewCard';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { palette } from '@/theme';

export interface SplashProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

/**
 * v20.0 — Welcome.
 *
 * The promise screen. Editorial serif headline, sans-serif sub, a real
 * value-preview card (skin score · trending down · tonight focus ·
 * 84-day plan badge — not an empty droplet), trust row, primary CTA
 * "Start my skin profile", "I already have an account" tail.
 *
 * Goal: the user should immediately understand "this is a private skin
 * intelligence system, not a questionnaire". The preview card sets
 * expectations for what they'll see after their first scan.
 */
export function Splash({ onGetStarted, onSignIn }: SplashProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  const markOpacity = useSharedValue(0);
  const headlineOpacity = useSharedValue(0);
  const headlineY = useSharedValue(reduceMotion ? 0 : 10);
  const subOpacity = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardY = useSharedValue(reduceMotion ? 0 : 14);
  const trustOpacity = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);

  useEffect(() => {
    const easeOut = Easing.out(Easing.cubic);
    markOpacity.value = withTiming(1, { duration: 240, easing: easeOut });
    headlineOpacity.value = withDelay(
      80,
      withTiming(1, { duration: 360, easing: easeOut })
    );
    headlineY.value = withDelay(
      80,
      withTiming(0, { duration: 360, easing: easeOut })
    );
    subOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 360, easing: easeOut })
    );
    cardOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 420, easing: easeOut })
    );
    cardY.value = withDelay(
      300,
      withTiming(0, { duration: 420, easing: easeOut })
    );
    trustOpacity.value = withDelay(
      520,
      withTiming(1, { duration: 360, easing: easeOut })
    );
    ctaOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 360, easing: easeOut })
    );
  }, [
    markOpacity,
    headlineOpacity,
    headlineY,
    subOpacity,
    cardOpacity,
    cardY,
    trustOpacity,
    ctaOpacity,
  ]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
  }));
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineY.value }],
  }));
  const subStyle = useAnimatedStyle(() => ({
    opacity: subOpacity.value,
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));
  const trustStyle = useAnimatedStyle(() => ({
    opacity: trustOpacity.value,
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.topRow}>
        <Animated.View style={markStyle}>
          <PuraMark variant="idle" size="sm" />
        </Animated.View>
        <Text style={styles.wordmark}>PURA</Text>
      </View>

      <View style={styles.body}>
        <Animated.Text
          style={[styles.headline, headlineStyle]}
          maxFontSizeMultiplier={1.15}
          accessibilityRole="header"
        >
          {'Your skin changes daily.\nPura tells you why.'}
        </Animated.Text>

        <Animated.Text
          style={[styles.sub, subStyle]}
          maxFontSizeMultiplier={1.25}
        >
          Scan once, then get a routine that adapts to breakouts, dryness,
          texture, and sensitivity.
        </Animated.Text>

        <View style={{ flex: 1 }} />

        <Animated.View style={cardStyle}>
          <ValuePreviewCard />
        </Animated.View>

        <View style={{ flex: 1 }} />

        <Animated.View
          style={[styles.trustRow, trustStyle]}
          accessible
          accessibilityLabel="Private scans, gentle adjustments, 84-day plan"
        >
          <ShieldCheck size={13} color={palette.inkTertiary} weight="duotone" />
          <Text style={styles.trustText} maxFontSizeMultiplier={1.1}>
            Private scans  ·  Gentle adjustments  ·  84-day plan
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.ctaWrap, ctaStyle]}>
        <OnboardingPrimaryButton
          label="Start my skin plan"
          onPress={onGetStarted}
        />
        <Pressable
          onPress={onSignIn}
          accessibilityRole="button"
          accessibilityLabel="I already have an account, sign in"
          style={({ pressed }) => [
            styles.signInRow,
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={8}
        >
          <Text style={styles.signInLead} maxFontSizeMultiplier={1.15}>
            I already have an account.{' '}
            <Text style={styles.signInAction}>Sign in.</Text>
          </Text>
        </Pressable>
        <View style={{ height: insets.bottom > 0 ? insets.bottom : 16 }} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },
  wordmark: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 2.4,
    color: palette.inkTertiary,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -0.8,
    color: palette.ink,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSecondary,
    marginTop: 14,
    maxWidth: 360,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 16,
  },
  trustText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.inkTertiary,
    letterSpacing: 0.1,
  },
  ctaWrap: {
    paddingTop: 8,
  },
  signInRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
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

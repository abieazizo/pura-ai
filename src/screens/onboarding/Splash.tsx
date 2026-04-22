import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { PuraMark } from '@/components/PuraMark';
import { DeviceFrame } from '@/components/scan/DeviceFrame';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { palette } from '@/theme';

export interface SplashProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

/**
 * Splash (§2.5). No header, no progress bar. Editorial stack: small Mark,
 * huge serif headline, italic subhead, DeviceFrame with a looping demo
 * video (or animated placeholder), primary CTA, sign-in tail.
 *
 * The video asset `assets/videos/splash-demo.mp4` isn't shipped in this
 * build — the DeviceFrame renders the pulsing-Mark placeholder per §2.5.
 * When the asset is added, swap the `StageFallback` for an `expo-video`
 * `<VideoView>` bound to a `useVideoPlayer` hook.
 */
export function Splash({ onGetStarted, onSignIn }: SplashProps) {
  // Entrance timeline per §2.5
  const markOpacity = useSharedValue(0);
  const headlineOpacity = useSharedValue(0);
  const headlineY = useSharedValue(12);
  const subheadOpacity = useSharedValue(0);
  const subheadY = useSharedValue(12);
  const frameOpacity = useSharedValue(0);

  useEffect(() => {
    markOpacity.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
    headlineOpacity.value = withDelay(
      100,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    headlineY.value = withDelay(
      100,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    subheadOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    subheadY.value = withDelay(
      200,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    frameOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, [markOpacity, headlineOpacity, headlineY, subheadOpacity, subheadY, frameOpacity]);

  const markStyle = useAnimatedStyle(() => ({ opacity: markOpacity.value }));
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineY.value }],
  }));
  const subheadStyle = useAnimatedStyle(() => ({
    opacity: subheadOpacity.value,
    transform: [{ translateY: subheadY.value }],
  }));
  const frameStyle = useAnimatedStyle(() => ({
    opacity: frameOpacity.value,
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        <View style={{ height: 40 }} />
        <Animated.View style={markStyle}>
          <PuraMark variant="idle" size="md" />
        </Animated.View>

        <View style={{ height: 24 }} />
        <Animated.Text
          style={[styles.headline, headlineStyle]}
          maxFontSizeMultiplier={1.15}
          accessibilityRole="header"
        >
          Read your skin. Every day.
        </Animated.Text>

        <View style={{ height: 12 }} />
        <Animated.Text style={[styles.subhead, subheadStyle]} maxFontSizeMultiplier={1.2}>
          Thirty seconds a day. I{"'"}ll track what{"'"}s changing and tell you what to
          do.
        </Animated.Text>

        <View style={styles.spacer} />

        <Animated.View style={[styles.frameWrap, frameStyle]}>
          <DeviceFrame width={260} height={480}>
            <StageFallback />
          </DeviceFrame>
        </Animated.View>

        <View style={styles.spacer} />
      </View>

      <OnboardingPrimaryButton label="Get started." onPress={onGetStarted} />

      <View style={{ height: 16 }} />
      <Pressable
        onPress={onSignIn}
        accessibilityRole="button"
        accessibilityLabel="Sign in to an existing account"
        style={styles.signInWrap}
        hitSlop={6}
      >
        <Text style={styles.signInLead}>
          Already have an account?{' '}
          <Text style={styles.signInAction}>Sign in.</Text>
        </Text>
      </Pressable>
      <View style={{ height: 24 }} />
    </SafeAreaView>
  );
}

/**
 * The inside-of-phone placeholder. Sand bg with the Mark pulsing (§2.5
 * fallback — video asset pending).
 */
function StageFallback() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.96 + 0.08 * pulse.value }],
    opacity: 0.7 + 0.3 * pulse.value,
  }));

  return (
    <View style={stageStyles.root}>
      <Animated.View style={markStyle}>
        <PuraMark variant="idle" size="lg" glow />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 56,
    lineHeight: 56 * 1.02,
    letterSpacing: -1.2,
    color: palette.ink,
  },
  subhead: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 18,
    lineHeight: 18 * 1.35,
    color: 'rgba(26,22,20,0.7)',
  },
  spacer: { flex: 1 },
  frameWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInLead: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: 'rgba(26,22,20,0.6)',
  },
  signInAction: {
    fontFamily: 'Inter-SemiBold',
    color: palette.clay,
  },
});

const stageStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.sandPaper,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

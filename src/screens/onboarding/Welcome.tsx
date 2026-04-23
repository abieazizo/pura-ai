import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PuraMark } from '@/components/PuraMark';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

export interface WelcomeProps {
  onTakeFirstScan: () => void;
}

/**
 * Welcome (§3.14). No header. Mark scales from 0.5 → 1.0 with a slightly
 * springier spring than the default (damping 18, stiffness 120), fires a
 * success haptic on mount. "You're in." in serif, italic subhead, then the
 * primary CTA that finalises onboarding and routes into the tabs. The scan
 * tutorial then fires from inside the tabs because `hasSeenScanTutorial`
 * is still false.
 */
export function Welcome({ onTakeFirstScan }: WelcomeProps) {
  const insets = useSafeAreaInsets();
  const markOpacity = useSharedValue(0);
  const markScale = useSharedValue(0.5);

  useEffect(() => {
    markOpacity.value = withTiming(1, { duration: 400 });
    markScale.value = withSpring(1, { damping: 18, stiffness: 120, mass: 1 });
    hapt.success();
  }, [markOpacity, markScale]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }],
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.center}>
        <Animated.View style={markStyle}>
          <PuraMark variant="idle" size={120} glow />
        </Animated.View>

        <View style={{ height: 36 }} />
        <Text style={styles.wordmark} maxFontSizeMultiplier={1.1}>
          Pura AI
        </Text>

        <View style={{ height: 20 }} />
        <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
          You{'\u2019'}re in.
        </Text>

        <View style={{ height: 10 }} />
        <Text style={styles.sub} maxFontSizeMultiplier={1.2}>
          One scan unlocks your Skin Score, your plan, and your matched products.
        </Text>
      </View>

      <View style={{ paddingBottom: insets.bottom + 40 }}>
        <OnboardingPrimaryButton
          label="Take your first scan"
          onPress={onTakeFirstScan}
        />
      </View>
    </SafeAreaView>
  );
}

// v9.9 — Welcome screen aligned with the cinematic intro language. Big
// Mark with glow, "Pura AI" serif wordmark beneath, then "You're in."
// headline + concrete value promise (Skin Score / plan / matched products)
// instead of the prior generic "Let's take your first scan." subhead.
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  wordmark: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    letterSpacing: -0.3,
    color: palette.ink,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -0.9,
    color: palette.ink,
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 23,
    color: palette.inkSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
});

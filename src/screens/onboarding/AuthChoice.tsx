import React, { useEffect } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  AppleLogo,
  Envelope,
  GoogleLogo,
  ShieldCheck,
} from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

export interface AuthChoiceProps {
  onAppleContinue: () => void;
  onGoogleContinue: () => void;
  onEmailContinue: () => void;
  onSignIn: () => void;
}

/**
 * AuthChoice (v10.6) — the front door's trusted entry.
 *
 * Replaces the previous text-link "Sign in" TODO on Splash with a proper
 * auth architecture. Apple first on iOS (platform convention), Google
 * second, Email third. A single "Already have an account? Sign in."
 * footer handles returning users.
 *
 * Copy intentionally short. A trust line ("Privacy-first. On-device
 * scans.") sits below the three buttons — not hidden in a legal link —
 * because that's the actual product promise.
 *
 * Entrance: mark fades in at 0ms, headline at 80ms, buttons cascade at
 * 200ms / 260ms / 320ms. Each button has a spring-scaled press state.
 */
export function AuthChoice({
  onAppleContinue,
  onGoogleContinue,
  onEmailContinue,
  onSignIn,
}: AuthChoiceProps) {
  const insets = useSafeAreaInsets();

  // Entrance choreography
  const markY = useSharedValue(8);
  const markOp = useSharedValue(0);
  const headlineY = useSharedValue(12);
  const headlineOp = useSharedValue(0);
  const b1 = useSharedValue(14);
  const b1op = useSharedValue(0);
  const b2 = useSharedValue(14);
  const b2op = useSharedValue(0);
  const b3 = useSharedValue(14);
  const b3op = useSharedValue(0);
  const footOp = useSharedValue(0);

  useEffect(() => {
    const easeOut = Easing.out(Easing.cubic);
    markOp.value = withTiming(1, { duration: 320, easing: easeOut });
    markY.value = withTiming(0, { duration: 320, easing: easeOut });
    headlineOp.value = withDelay(80, withTiming(1, { duration: 360, easing: easeOut }));
    headlineY.value = withDelay(80, withTiming(0, { duration: 360, easing: easeOut }));
    [b1op, b2op, b3op].forEach((v, i) =>
      (v.value = withDelay(200 + i * 60, withTiming(1, { duration: 360, easing: easeOut })))
    );
    [b1, b2, b3].forEach((v, i) =>
      (v.value = withDelay(200 + i * 60, withTiming(0, { duration: 360, easing: easeOut })))
    );
    footOp.value = withDelay(420, withTiming(1, { duration: 400, easing: easeOut }));
  }, [markY, markOp, headlineY, headlineOp, b1, b1op, b2, b2op, b3, b3op, footOp]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: markOp.value,
    transform: [{ translateY: markY.value }],
  }));
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOp.value,
    transform: [{ translateY: headlineY.value }],
  }));
  const b1Style = useAnimatedStyle(() => ({
    opacity: b1op.value,
    transform: [{ translateY: b1.value }],
  }));
  const b2Style = useAnimatedStyle(() => ({
    opacity: b2op.value,
    transform: [{ translateY: b2.value }],
  }));
  const b3Style = useAnimatedStyle(() => ({
    opacity: b3op.value,
    transform: [{ translateY: b3.value }],
  }));
  const footStyle = useAnimatedStyle(() => ({ opacity: footOp.value }));

  const tap = (fn: () => void) => () => {
    hapt.select();
    fn();
  };

  // Apple first on iOS per platform convention; Google first on Android.
  const buttons = Platform.OS === 'android'
    ? [
        { key: 'google', node: <GoogleButton onPress={tap(onGoogleContinue)} />, style: b1Style },
        { key: 'apple', node: <AppleButton onPress={tap(onAppleContinue)} />, style: b2Style },
        { key: 'email', node: <EmailButton onPress={tap(onEmailContinue)} />, style: b3Style },
      ]
    : [
        { key: 'apple', node: <AppleButton onPress={tap(onAppleContinue)} />, style: b1Style },
        { key: 'google', node: <GoogleButton onPress={tap(onGoogleContinue)} />, style: b2Style },
        { key: 'email', node: <EmailButton onPress={tap(onEmailContinue)} />, style: b3Style },
      ];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.center}>
        <Animated.View style={markStyle}>
          <PuraMark variant="idle" size={84} glow />
        </Animated.View>

        <View style={{ height: 28 }} />

        <Animated.Text
          style={[styles.headline, headlineStyle]}
          maxFontSizeMultiplier={1.15}
          accessibilityRole="header"
        >
          Create your profile.
        </Animated.Text>

        <Animated.Text
          style={[styles.sub, headlineStyle]}
          maxFontSizeMultiplier={1.2}
        >
          One account keeps your scans, score, and history together.
        </Animated.Text>
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 8 }]}>
        {buttons.map(({ key, node, style }) => (
          <Animated.View key={key} style={style}>
            {node}
          </Animated.View>
        ))}

        <Animated.View style={[styles.trustRow, footStyle]}>
          <ShieldCheck size={13} color={palette.inkTertiary} weight="duotone" />
          <Text style={styles.trustText} maxFontSizeMultiplier={1.1}>
            Privacy-first. Scans stay on your device.
          </Text>
        </Animated.View>

        <Animated.View style={footStyle}>
          <Pressable
            onPress={tap(onSignIn)}
            accessibilityRole="button"
            accessibilityLabel="Sign in to an existing account"
            style={({ pressed }) => [
              styles.signInRow,
              pressed && { opacity: 0.75 },
            ]}
            hitSlop={8}
          >
            <Text style={styles.signInLead} maxFontSizeMultiplier={1.15}>
              Already have an account?{' '}
              <Text style={styles.signInAction}>Sign in.</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// Button primitives — v10.8: true Reanimated spring press feedback so
// auth interaction matches OnboardingPrimaryButton's feel. Each button
// wraps a shared `SpringPressButton` that owns the scale shared-value.
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_SPRING = { damping: 15, stiffness: 300, mass: 1 };

function SpringPressButton({
  onPress,
  accessibilityLabel,
  containerStyle,
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  containerStyle: object;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const handle = () => {
    scale.value = withSpring(0.98, PRESS_SPRING, () => {
      scale.value = withSpring(1, PRESS_SPRING);
    });
    onPress();
  };
  return (
    <AnimatedPressable
      onPress={handle}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.button, containerStyle, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}

function AppleButton({ onPress }: { onPress: () => void }) {
  return (
    <SpringPressButton
      onPress={onPress}
      accessibilityLabel="Continue with Apple"
      containerStyle={styles.buttonApple}
    >
      <AppleLogo size={19} color={palette.bg} weight="fill" />
      <Text
        style={[styles.buttonLabel, { color: palette.bg }]}
        maxFontSizeMultiplier={1.15}
      >
        Continue with Apple
      </Text>
    </SpringPressButton>
  );
}

function GoogleButton({ onPress }: { onPress: () => void }) {
  return (
    <SpringPressButton
      onPress={onPress}
      accessibilityLabel="Continue with Google"
      containerStyle={styles.buttonGoogle}
    >
      <GoogleLogo size={19} color={palette.ink} weight="bold" />
      <Text style={styles.buttonLabel} maxFontSizeMultiplier={1.15}>
        Continue with Google
      </Text>
    </SpringPressButton>
  );
}

function EmailButton({ onPress }: { onPress: () => void }) {
  return (
    <SpringPressButton
      onPress={onPress}
      accessibilityLabel="Continue with email"
      containerStyle={styles.buttonEmail}
    >
      <Envelope size={19} color={palette.ink} weight="duotone" />
      <Text style={styles.buttonLabel} maxFontSizeMultiplier={1.15}>
        Continue with email
      </Text>
    </SpringPressButton>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: palette.ink,
    textAlign: 'center',
    maxWidth: 320,
  },
  sub: {
    marginTop: 12,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 22,
    color: palette.inkSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  actions: {
    paddingHorizontal: 24,
    gap: 10,
  },
  button: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonApple: {
    backgroundColor: palette.ink,
  },
  buttonGoogle: {
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  buttonEmail: {
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  buttonLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.1,
    color: palette.ink,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },
  trustText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    letterSpacing: 0.1,
    color: palette.inkTertiary,
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

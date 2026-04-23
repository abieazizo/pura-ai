import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  ArrowLeft,
  Envelope,
  GoogleLogo,
  Lock,
} from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

export interface SignInProps {
  /** Dismiss the sign-in screen (back arrow). */
  onBack: () => void;
  /** The sign-in primary action fires after a valid email + password
   *  submit. Wiring to a real backend plugs in here. */
  onEmailSignIn: (email: string, password: string) => void;
  onAppleSignIn: () => void;
  onGoogleSignIn: () => void;
  onForgotPassword: () => void;
  /** "New to Pura? Create account." — routes back into the new-user flow. */
  onCreateAccount: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_SPRING = { damping: 15, stiffness: 300, mass: 1 };

/**
 * SignIn (v10.8) — the returning-user front door.
 *
 * Distinct from AuthChoice (new-user path). Structure:
 *
 *   BACK
 *   Mark
 *   Welcome back.
 *   Sign in to pick up where you left off.
 *
 *   [Continue with Apple]   — provider buttons (preserved from AuthChoice
 *   [Continue with Google]     so returning users with provider identities
 *                              sign straight in; no email needed)
 *
 *   ─── or sign in with email ───
 *
 *   [Email]
 *   [Password]            [Forgot?]
 *   [Sign in]             — primary CTA
 *
 *   New to Pura? Create account.  — footer routes to AuthChoice
 *
 * Keyboard avoidance on iOS, scroll-safe on small screens, spring-press
 * feedback on every tap. Provider and email handlers are callbacks the
 * OnboardingNavigator wires into the final auth layer when identity
 * keys ship.
 */
export function SignIn({
  onBack,
  onEmailSignIn,
  onAppleSignIn,
  onGoogleSignIn,
  onForgotPassword,
  onCreateAccount,
}: SignInProps) {
  const insets = useSafeAreaInsets();
  const emailRef = useRef<TextInput>(null);
  const pwRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 6;

  // Entrance cascade
  const headlineY = useSharedValue(12);
  const headlineOp = useSharedValue(0);
  const bodyOp = useSharedValue(0);
  useEffect(() => {
    const easeOut = Easing.out(Easing.cubic);
    headlineOp.value = withDelay(80, withTiming(1, { duration: 360, easing: easeOut }));
    headlineY.value = withDelay(80, withTiming(0, { duration: 360, easing: easeOut }));
    bodyOp.value = withDelay(180, withTiming(1, { duration: 420, easing: easeOut }));
  }, [headlineOp, headlineY, bodyOp]);

  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOp.value,
    transform: [{ translateY: headlineY.value }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({ opacity: bodyOp.value }));

  const submit = () => {
    if (!canSubmit) return;
    hapt.tap();
    onEmailSignIn(email.trim(), password);
  };

  const handleBack = () => {
    hapt.select();
    onBack();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <ArrowLeft size={18} color={palette.ink} weight="duotone" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.markWrap}>
            <PuraMark variant="idle" size={56} />
          </View>

          <Animated.Text
            style={[styles.headline, headlineStyle]}
            maxFontSizeMultiplier={1.15}
            accessibilityRole="header"
          >
            Welcome back.
          </Animated.Text>
          <Animated.Text
            style={[styles.sub, headlineStyle]}
            maxFontSizeMultiplier={1.2}
          >
            Sign in to pick up where you left off.
          </Animated.Text>

          <Animated.View style={[styles.providerStack, bodyStyle]}>
            <SpringPressButton
              onPress={() => {
                hapt.select();
                onAppleSignIn();
              }}
              accessibilityLabel="Sign in with Apple"
              variant="filled"
            >
              <AppleLogo size={19} color={palette.bg} weight="fill" />
              <Text
                style={[styles.buttonLabel, { color: palette.bg }]}
                maxFontSizeMultiplier={1.15}
              >
                Sign in with Apple
              </Text>
            </SpringPressButton>

            <SpringPressButton
              onPress={() => {
                hapt.select();
                onGoogleSignIn();
              }}
              accessibilityLabel="Sign in with Google"
              variant="outline"
            >
              <GoogleLogo size={19} color={palette.ink} weight="bold" />
              <Text style={styles.buttonLabel} maxFontSizeMultiplier={1.15}>
                Sign in with Google
              </Text>
            </SpringPressButton>
          </Animated.View>

          <Animated.View style={[styles.divider, bodyStyle]}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel} maxFontSizeMultiplier={1.1}>
              or sign in with email
            </Text>
            <View style={styles.dividerLine} />
          </Animated.View>

          <Animated.View style={[styles.emailStack, bodyStyle]}>
            <View style={styles.fieldWrap}>
              <Envelope size={16} color={palette.inkTertiary} weight="duotone" />
              <TextInput
                ref={emailRef}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={palette.inkTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => pwRef.current?.focus()}
                textContentType="username"
                style={styles.field}
                maxFontSizeMultiplier={1.2}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Lock size={16} color={palette.inkTertiary} weight="duotone" />
              <TextInput
                ref={pwRef}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={palette.inkTertiary}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={submit}
                textContentType="password"
                style={styles.field}
                maxFontSizeMultiplier={1.2}
              />
              <Pressable
                onPress={() => {
                  hapt.select();
                  onForgotPassword();
                }}
                accessibilityRole="button"
                accessibilityLabel="Forgot password"
                hitSlop={6}
                style={({ pressed }) => [
                  styles.forgotWrap,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.forgotLabel} maxFontSizeMultiplier={1.1}>
                  Forgot?
                </Text>
              </Pressable>
            </View>

            <View style={{ height: 6 }} />
            <OnboardingPrimaryButton
              label="Sign in"
              onPress={submit}
              disabled={!canSubmit}
            />
          </Animated.View>

          <View style={{ height: 28 }} />

          <Animated.View style={bodyStyle}>
            <Pressable
              onPress={() => {
                hapt.select();
                onCreateAccount();
              }}
              accessibilityRole="button"
              accessibilityLabel="New to Pura — create account"
              style={({ pressed }) => [
                styles.createRow,
                pressed && { opacity: 0.75 },
              ]}
              hitSlop={8}
            >
              <Text style={styles.createLead} maxFontSizeMultiplier={1.15}>
                New to Pura?{' '}
                <Text style={styles.createAction}>Create account.</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================================
// SpringPressButton — shared with AuthChoice v10.8 press feel. Local to this
// file so the SignIn layout controls its own sizing; AuthChoice has its own
// copy because the logo/label composition differs per brand.
// ============================================================================

function SpringPressButton({
  onPress,
  accessibilityLabel,
  variant,
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  variant: 'filled' | 'outline';
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
      style={[
        styles.button,
        variant === 'filled' ? styles.buttonFilled : styles.buttonOutline,
        animated,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  topBar: {
    height: 52,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  markWrap: {
    alignSelf: 'center',
    marginBottom: 22,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: palette.ink,
    textAlign: 'center',
  },
  sub: {
    marginTop: 8,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 22,
    color: palette.inkSecondary,
    textAlign: 'center',
  },
  providerStack: {
    marginTop: 28,
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
  buttonFilled: {
    backgroundColor: palette.ink,
  },
  buttonOutline: {
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
  divider: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.hairline,
  },
  dividerLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.inkTertiary,
  },
  emailStack: {
    marginTop: 18,
    gap: 10,
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
  },
  field: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: palette.ink,
    paddingVertical: 0,
  },
  forgotWrap: {
    paddingLeft: 8,
  },
  forgotLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.clay,
  },
  createRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  createLead: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: palette.inkSecondary,
  },
  createAction: {
    fontFamily: 'Inter-SemiBold',
    color: palette.ink,
  },
});

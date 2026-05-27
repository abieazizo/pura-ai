import React, { useCallback, useEffect } from 'react';
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
  Camera as CameraIcon,
  Moon,
  LineSegments,
  LockKey,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import {
  EditorialHeadline,
  BodyText,
  ScanThread,
  PURA,
  PURA_FONT,
  PURA_RADIUS,
} from '@/components/onboarding/v2';
import { useOnboardingV2, type AuthDecision } from '@/state/onboardingV2';
import { onboardingV2 } from '@/ai/onboardingAnalyticsV2';

export interface SaveProgressV2Props {
  onAuthCompleted: (provider: 'apple' | 'google' | 'email') => void;
  onContinueAsGuest: () => void;
  onSignIn: () => void;
}

/**
 * v25 — Save Progress / Auth Conversion.
 *
 * The first paid trust moment. The user has a baseline and a routine —
 * now we ask them to save it. The headline frames the ask honestly:
 * "Save your baseline. Track what changes." Not a generic login wall.
 *
 * Visual rules per spec:
 *   • Apple CTA is full Ink — never looks disabled.
 *   • Google + Email buttons get strong visible borders.
 *   • Privacy reassurance is legible, not faded.
 *   • Continue without saving is a real path that drops the user into
 *     Home in baseline-pending mode (via the host).
 *   • No blue anywhere.
 */
export function SaveProgressV2({
  onAuthCompleted,
  onContinueAsGuest,
  onSignIn,
}: SaveProgressV2Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const setAuthDecision = useOnboardingV2((s) => s.setAuthDecision);
  // v26.3 — keep the captured photo visible at the top of the save
  // screen as the visual through-line; the user is saving *this scan*,
  // not opening a generic account.
  const capturedScanUri = useOnboardingV2((s) => s.capturedScanUri);
  const scan = useOnboardingV2((s) => s.scanAnalysisResult);

  useEffect(() => {
    onboardingV2.authViewedPostValue();
  }, []);

  const headlineOp = useSharedValue(0);
  const headlineY = useSharedValue(reduceMotion ? 0 : 10);
  const valueOp = useSharedValue(0);
  const valueY = useSharedValue(reduceMotion ? 0 : 12);
  const buttonsOp = useSharedValue(0);
  const buttonsY = useSharedValue(reduceMotion ? 0 : 12);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    headlineOp.value = withTiming(1, { duration: 360, easing: ease });
    headlineY.value = withTiming(0, { duration: 360, easing: ease });
    valueOp.value = withDelay(120, withTiming(1, { duration: 380, easing: ease }));
    valueY.value = withDelay(120, withTiming(0, { duration: 380, easing: ease }));
    buttonsOp.value = withDelay(220, withTiming(1, { duration: 400, easing: ease }));
    buttonsY.value = withDelay(220, withTiming(0, { duration: 400, easing: ease }));
  }, [headlineOp, headlineY, valueOp, valueY, buttonsOp, buttonsY]);

  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOp.value,
    transform: [{ translateY: headlineY.value }],
  }));
  const valueStyle = useAnimatedStyle(() => ({
    opacity: valueOp.value,
    transform: [{ translateY: valueY.value }],
  }));
  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOp.value,
    transform: [{ translateY: buttonsY.value }],
  }));

  const handleAuth = useCallback(
    (provider: 'apple' | 'google' | 'email') => {
      hapt.select();
      setAuthDecision(provider as AuthDecision);
      onboardingV2.authProviderSelected(provider);
      // The actual provider exchange would happen here. For now we treat
      // a successful tap as a completed sign-in pathway — the host then
      // calls `finishOnboarding` which writes the User into the store.
      onboardingV2.authCompleted(provider);
      onAuthCompleted(provider);
    },
    [onAuthCompleted, setAuthDecision]
  );

  const handleGuest = useCallback(() => {
    hapt.select();
    setAuthDecision('guest');
    onboardingV2.continueWithoutSavingSelected();
    onContinueAsGuest();
  }, [onContinueAsGuest, setAuthDecision]);

  // Apple first on iOS, Google first on Android.
  const authButtons = Platform.OS === 'android'
    ? (['google', 'apple', 'email'] as const)
    : (['apple', 'google', 'email'] as const);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <ScanThread
        scanUri={capturedScanUri}
        stage="save"
        capturedAt={scan?.capturedAt}
      />
      <View style={styles.body}>
        <Animated.View style={headlineStyle}>
          <View style={styles.readyChip}>
            <Text style={styles.readyChipLabel} maxFontSizeMultiplier={1.15}>
              TONIGHT’S ROUTINE IS READY
            </Text>
          </View>
          <EditorialHeadline style={styles.headline}>
            {'Save your baseline.\nSee what changes.'}
          </EditorialHeadline>
          <BodyText style={styles.lead}>
            Create an account to keep today’s scan, tonight’s routine, and
            future comparisons private.
          </BodyText>
        </Animated.View>

        <Animated.View style={[styles.valueCard, valueStyle]}>
          <ValueRow Icon={CameraIcon} label="Your baseline scan" />
          <ValueRow Icon={Moon} label="Tonight’s routine" />
          <ValueRow Icon={LineSegments} label="Future progress comparisons" />
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.actions,
          { paddingBottom: insets.bottom + 16 },
          buttonsStyle,
        ]}
      >
        {authButtons.map((provider) => {
          if (provider === 'apple') {
            return (
              <AuthButton
                key="apple"
                kind="apple"
                onPress={() => handleAuth('apple')}
              />
            );
          }
          if (provider === 'google') {
            return (
              <AuthButton
                key="google"
                kind="google"
                onPress={() => handleAuth('google')}
              />
            );
          }
          return (
            <AuthButton
              key="email"
              kind="email"
              onPress={() => handleAuth('email')}
            />
          );
        })}

        <View style={styles.privacyRow}>
          <LockKey size={13} color={PURA.muted} weight="duotone" />
          <Text style={styles.privacyText} maxFontSizeMultiplier={1.2}>
            Continue without saving and today’s photo will be deleted after
            this session.
          </Text>
        </View>

        <Pressable
          onPress={onSignIn}
          accessibilityRole="button"
          accessibilityLabel="Sign in to an existing account"
          hitSlop={10}
          style={({ pressed }) => [
            styles.signInRow,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.signInLead} maxFontSizeMultiplier={1.15}>
            Already have an account?{' '}
            <Text style={styles.signInAction}>Sign in</Text>
          </Text>
        </Pressable>

        <Pressable
          onPress={handleGuest}
          accessibilityRole="button"
          accessibilityLabel="Continue without saving"
          hitSlop={10}
          style={({ pressed }) => [
            styles.guestRow,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.guestLabel} maxFontSizeMultiplier={1.15}>
            Continue without saving
          </Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_SPRING = { damping: 15, stiffness: 300, mass: 1 };

function AuthButton({
  kind,
  onPress,
}: {
  kind: 'apple' | 'google' | 'email';
  onPress: () => void;
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

  const isInk = kind === 'apple';
  const label =
    kind === 'apple'
      ? 'Continue with Apple'
      : kind === 'google'
      ? 'Continue with Google'
      : 'Continue with email';
  const iconColor = isInk ? PURA.paper : PURA.ink;

  return (
    <AnimatedPressable
      onPress={handle}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        btnStyles.btn,
        isInk ? btnStyles.btnInk : btnStyles.btnPaper,
        animated,
      ]}
    >
      {kind === 'apple' ? (
        <AppleLogo size={19} color={iconColor} weight="fill" />
      ) : kind === 'google' ? (
        <GoogleLogo size={19} color={iconColor} weight="bold" />
      ) : (
        <Envelope size={19} color={iconColor} weight="duotone" />
      )}
      <Text
        style={[
          btnStyles.label,
          { color: iconColor },
        ]}
        maxFontSizeMultiplier={1.15}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function ValueRow({
  Icon,
  label,
}: {
  Icon: React.ComponentType<PhosphorIconProps>;
  label: string;
}) {
  return (
    <View style={valueStyles.row}>
      <View style={valueStyles.iconWrap}>
        <Icon size={18} color={PURA.terracotta} weight="duotone" />
      </View>
      <Text style={valueStyles.label} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </View>
  );
}

const valueStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PURA.border,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PURA.claySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 15,
    color: PURA.ink,
  },
});

const btnStyles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnInk: {
    backgroundColor: PURA.ink,
  },
  btnPaper: {
    backgroundColor: PURA.paperRaised,
    borderWidth: 1.5,
    borderColor: PURA.borderStrong,
  },
  label: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 15,
    letterSpacing: 0.1,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PURA.paper,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    justifyContent: 'center',
  },
  readyChip: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: PURA.claySupport,
    marginBottom: 14,
  },
  readyChipLabel: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: PURA.terracottaPressed,
  },
  headline: {
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
  },
  lead: {
    marginTop: 14,
    textAlign: 'center',
    maxWidth: 360,
    alignSelf: 'center',
    color: PURA.body,
  },
  valueCard: {
    marginTop: 28,
    borderRadius: PURA_RADIUS.reveal,
    borderWidth: 1,
    borderColor: PURA.border,
    backgroundColor: PURA.paperRaised,
    overflow: 'hidden',
  },
  actions: {
    paddingHorizontal: 24,
    paddingTop: 14,
    gap: 10,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  privacyText: {
    fontFamily: PURA_FONT.sans,
    fontSize: 12.5,
    color: PURA.body,
  },
  signInRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 6,
  },
  signInLead: {
    fontFamily: PURA_FONT.sans,
    fontSize: 14,
    color: PURA.body,
  },
  signInAction: {
    fontFamily: PURA_FONT.sansSemi,
    color: PURA.ink,
  },
  guestRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 6,
  },
  guestLabel: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 13,
    color: PURA.muted,
    textDecorationLine: 'underline',
  },
});

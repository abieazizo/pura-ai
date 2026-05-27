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
import { useReduceMotion } from '@/hooks/useReduceMotion';
import {
  EditorialHeadline,
  BodyText,
  Eyebrow,
  SignalCard,
  PURA,
  PURA_FONT,
  PURA_RADIUS,
  PURA_SHADOW,
} from '@/components/onboarding/v2';
import { onboardingV2 } from '@/ai/onboardingAnalyticsV2';

export interface WelcomeV2Props {
  onStartFirstScan: () => void;
  onSignIn: () => void;
}

/**
 * v25 — Welcome.
 *
 * Sells the signature action (a private guided scan) and shows a credible
 * preview of the product loop. No fake skin score, no "Pura tells you why"
 * causal overclaim, no "Start my skin plan" abstract CTA.
 *
 * The preview card explicitly labels its content "FIRST SCAN PREVIEW" so
 * the user understands it isn't their own data yet.
 */
export function WelcomeV2({ onStartFirstScan, onSignIn }: WelcomeV2Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    onboardingV2.viewWelcome();
  }, []);

  const logoOp = useSharedValue(0);
  const headlineOp = useSharedValue(0);
  const headlineY = useSharedValue(reduceMotion ? 0 : 8);
  const bodyOp = useSharedValue(0);
  const cardOp = useSharedValue(0);
  const cardY = useSharedValue(reduceMotion ? 0 : 14);
  const trayOp = useSharedValue(0);
  const trayY = useSharedValue(reduceMotion ? 0 : 10);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    logoOp.value = withTiming(1, { duration: 280, easing: ease });
    headlineOp.value = withDelay(70, withTiming(1, { duration: 380, easing: ease }));
    headlineY.value = withDelay(70, withTiming(0, { duration: 380, easing: ease }));
    bodyOp.value = withDelay(140, withTiming(1, { duration: 380, easing: ease }));
    cardOp.value = withDelay(130, withTiming(1, { duration: 420, easing: ease }));
    cardY.value = withDelay(130, withTiming(0, { duration: 420, easing: ease }));
    trayOp.value = withDelay(190, withTiming(1, { duration: 350, easing: ease }));
    trayY.value = withDelay(190, withTiming(0, { duration: 350, easing: ease }));
  }, [logoOp, headlineOp, headlineY, bodyOp, cardOp, cardY, trayOp, trayY]);

  const logoStyle = useAnimatedStyle(() => ({ opacity: logoOp.value }));
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOp.value,
    transform: [{ translateY: headlineY.value }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({ opacity: bodyOp.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOp.value,
    transform: [{ translateY: cardY.value }],
  }));
  const trayStyle = useAnimatedStyle(() => ({
    opacity: trayOp.value,
    transform: [{ translateY: trayY.value }],
  }));

  const handleStart = () => {
    onboardingV2.tapFirstScan();
    onStartFirstScan();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      <Animated.View style={[styles.brandRow, logoStyle]}>
        <PuraMark variant="idle" size="sm" />
        <Text style={styles.wordmark}>PURA</Text>
      </Animated.View>

      <View style={styles.body}>
        <Animated.View style={headlineStyle}>
          <EditorialHeadline>
            {'See what your skin\nneeds tonight.'}
          </EditorialHeadline>
        </Animated.View>

        <Animated.View style={bodyStyle}>
          <BodyText style={styles.lead}>
            One private scan. One gentle plan.
          </BodyText>
        </Animated.View>

        <View style={styles.flex} />

        <Animated.View style={[styles.previewCard, cardStyle]}>
          <Eyebrow style={styles.previewLabel}>What you’ll get</Eyebrow>
          <View style={styles.previewRows}>
            <SignalCard
              label="01"
              value="One clear visible focus"
              style={styles.previewSignal}
            />
            <SignalCard
              label="02"
              value="A simple routine for tonight"
              style={styles.previewSignal}
            />
            <SignalCard
              label="03"
              value="Progress tracking only if you save"
              style={styles.previewSignal}
            />
          </View>
        </Animated.View>

        <View style={styles.flex} />

        <Animated.View
          style={[styles.trustStrip, trayStyle]}
          accessibilityLabel="Private scan, cosmetic guidance, delete anytime"
        >
          <ShieldCheck size={13} color={PURA.muted} weight="duotone" />
          <Text style={styles.trustText} maxFontSizeMultiplier={1.15}>
            Private scan  ·  Cosmetic guidance  ·  Delete anytime
          </Text>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.ctaWrap,
          { paddingBottom: Math.max(insets.bottom, 16) + 12 },
          trayStyle,
        ]}
      >
        <OnboardingPrimaryButton
          label="Take my first scan"
          onPress={handleStart}
          style={styles.ctaBtn}
        />
        <Pressable
          onPress={onSignIn}
          accessibilityRole="button"
          accessibilityLabel="Already have an account, sign in"
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
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PURA.paper },
  flex: { flex: 1 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 8,
  },
  wordmark: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 12,
    letterSpacing: 2.4,
    color: PURA.muted,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  lead: {
    marginTop: 14,
    maxWidth: 380,
  },
  previewCard: {
    padding: 18,
    borderRadius: PURA_RADIUS.reveal,
    backgroundColor: PURA.paperRaised,
    borderWidth: 1,
    borderColor: PURA.border,
    ...PURA_SHADOW.soft,
  },
  previewLabel: { marginBottom: 14 },
  previewRows: { gap: 10 },
  previewSignal: {
    backgroundColor: PURA.paper,
  },
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 14,
  },
  trustText: {
    fontFamily: PURA_FONT.sans,
    fontSize: 12,
    color: PURA.muted,
    letterSpacing: 0.1,
  },
  ctaWrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  ctaBtn: {
    marginHorizontal: 0,
    height: 56,
    borderRadius: 28,
  },
  signInRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
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
});

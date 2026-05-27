import React, { useEffect, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
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
  withTiming,
} from 'react-native-reanimated';
import {
  Camera,
  CheckCircle,
  ShieldCheck,
  Sparkle,
} from 'phosphor-react-native';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { PuraMark } from '@/components/PuraMark';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useAppStore } from '@/store/useAppStore';
import {
  deriveOnboardingProfile,
  snapshotFromState,
} from '@/state/onboardingProfile';
import { palette } from '@/theme';

export interface FirstScanInvitationProps {
  /** User accepted — open the scan modal flow. */
  onStartScan: () => void;
  /** User wants to defer the scan — drop into Home in baseline-pending state. */
  onSkip: () => void;
}

const TEXT_PRIMARY = '#101828';
const TEXT_SECONDARY = '#475467';
const TEXT_MUTED = '#98A2B3';
const SOFT_BLUE_SURFACE = '#F3F7FF';
const BLUE_BORDER = '#D6E4FF';
const PRIMARY_BLUE = '#3B82F6';

/**
 * v21.0 — First scan invitation.
 *
 * Last onboarding screen before the user enters the scan modal. Re-uses
 * the derived `scanFocusAreas` so the list of things Pura will check is
 * actually personalized to the user's profile (not a fixed marketing
 * list). The "Do this later" tail drops the user straight into Home in
 * a baseline-pending state — never into fake dashboard data.
 */
export function FirstScanInvitation({
  onStartScan,
  onSkip,
}: FirstScanInvitationProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  const goal = useAppStore((s) => s.goal);
  const concerns = useAppStore((s) => s.concerns);
  const skinType = useAppStore((s) => s.skinType);
  const sensitivity = useAppStore((s) => s.sensitivity);
  const effort = useAppStore((s) => s.effort);
  const sunExposure = useAppStore((s) => s.sunExposure);
  const routineTiming = useAppStore((s) => s.routineTiming);
  const patternContext = useAppStore((s) => s.patternContext);

  const scanFocus = useMemo(() => {
    const snap = snapshotFromState({
      goal,
      concerns,
      skinType,
      sensitivity,
      effort,
      sunExposure,
      routineTiming,
      patternContext,
    });
    return deriveOnboardingProfile(snap).scanFocusAreas;
  }, [
    goal,
    concerns,
    skinType,
    sensitivity,
    effort,
    sunExposure,
    routineTiming,
    patternContext,
  ]);

  // Entrance choreography.
  const markOp = useSharedValue(0);
  const headlineOp = useSharedValue(0);
  const headlineY = useSharedValue(reduceMotion ? 0 : 10);
  const cardOp = useSharedValue(0);
  const cardY = useSharedValue(reduceMotion ? 0 : 12);
  const noteOp = useSharedValue(0);

  useEffect(() => {
    const easeOut = Easing.out(Easing.cubic);
    markOp.value = withTiming(1, { duration: 320, easing: easeOut });
    headlineOp.value = withDelay(
      100,
      withTiming(1, { duration: 380, easing: easeOut }),
    );
    headlineY.value = withDelay(
      100,
      withTiming(0, { duration: 380, easing: easeOut }),
    );
    cardOp.value = withDelay(
      260,
      withTiming(1, { duration: 420, easing: easeOut }),
    );
    cardY.value = withDelay(
      260,
      withTiming(0, { duration: 420, easing: easeOut }),
    );
    noteOp.value = withDelay(
      460,
      withTiming(1, { duration: 420, easing: easeOut }),
    );
  }, [markOp, headlineOp, headlineY, cardOp, cardY, noteOp]);

  const markStyle = useAnimatedStyle(() => ({ opacity: markOp.value }));
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOp.value,
    transform: [{ translateY: headlineY.value }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOp.value,
    transform: [{ translateY: cardY.value }],
  }));
  const noteStyle = useAnimatedStyle(() => ({ opacity: noteOp.value }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: insets.bottom + 220,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.markRow, markStyle]}>
          <PuraMark variant="idle" size="sm" glow />
          <Text style={styles.markLabel} maxFontSizeMultiplier={1.1}>
            PURA
          </Text>
        </Animated.View>

        <Animated.Text
          style={[styles.headline, headlineStyle]}
          maxFontSizeMultiplier={1.15}
          accessibilityRole="header"
        >
          Ready for your first skin check?
        </Animated.Text>
        <Animated.Text
          style={[styles.sub, headlineStyle]}
          maxFontSizeMultiplier={1.25}
        >
          Your first scan creates a baseline so Pura can track what
          changes over time.
        </Animated.Text>

        <Animated.View style={[styles.checksCard, cardStyle]}>
          <View style={styles.checksHeader}>
            <Sparkle size={16} color={PRIMARY_BLUE} weight="fill" />
            <Text style={styles.checksTitle} maxFontSizeMultiplier={1.15}>
              Pura will check
            </Text>
          </View>
          <View style={styles.checksList}>
            {scanFocus.map((label) => (
              <View key={label} style={styles.checksRow}>
                <CheckCircle
                  size={16}
                  color={PRIMARY_BLUE}
                  weight="duotone"
                />
                <Text
                  style={styles.checksRowText}
                  maxFontSizeMultiplier={1.2}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[styles.privacyRow, noteStyle]}>
          <ShieldCheck size={14} color={TEXT_MUTED} weight="duotone" />
          <Text style={styles.privacyText} maxFontSizeMultiplier={1.2}>
            Your scan stays private. You can delete it anytime.
          </Text>
        </Animated.View>
      </ScrollView>

      <View
        style={[styles.ctaWrap, { paddingBottom: insets.bottom + 24 }]}
      >
        <OnboardingPrimaryButton
          label="Start first scan"
          onPress={onStartScan}
        />
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Do the scan later"
          hitSlop={8}
          style={({ pressed }) => [
            styles.skipWrap,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.skipLabel} maxFontSizeMultiplier={1.15}>
            Do this later
          </Text>
        </Pressable>
        <View style={styles.permissionHint}>
          <Camera size={12} color={TEXT_MUTED} weight="duotone" />
          <Text style={styles.permissionText} maxFontSizeMultiplier={1.15}>
            Pura needs camera access to scan visible skin patterns.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  markLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 2.4,
    color: TEXT_MUTED,
  },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: TEXT_PRIMARY,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14.5,
    lineHeight: 22,
    color: TEXT_SECONDARY,
    marginTop: 12,
  },
  checksCard: {
    marginTop: 26,
    padding: 18,
    borderRadius: 20,
    backgroundColor: SOFT_BLUE_SURFACE,
    borderWidth: 1,
    borderColor: BLUE_BORDER,
  },
  checksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checksTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.4,
    color: TEXT_PRIMARY,
    textTransform: 'uppercase',
  },
  checksList: {
    marginTop: 14,
    gap: 10,
  },
  checksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checksRowText: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 4,
  },
  privacyText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    color: TEXT_MUTED,
  },
  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 14,
    backgroundColor: palette.bg,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
  skipWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 4,
  },
  skipLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: TEXT_SECONDARY,
    textDecorationLine: 'underline',
  },
  permissionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  permissionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    color: TEXT_MUTED,
  },
});

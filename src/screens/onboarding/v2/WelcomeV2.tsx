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
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { PURA, PURA_FONT } from '@/components/onboarding/v2';
import { onboardingV2 } from '@/ai/onboardingAnalyticsV2';

export interface WelcomeV2Props {
  onStartFirstScan: () => void;
  onSignIn: () => void;
}

/**
 * v25.8 — Welcome (editorial rebuild, depth pass).
 *
 * The headline is the hero — Instrument Serif SemiBold at 46pt with the
 * final word italicised in terracotta. The "promise" block is bracketed
 * by warm hairlines so it reads as a single editorial unit, not a list
 * of features. A real radial gradient sits behind the upper third, soft
 * enough to feel like warm light from above. The CTA stack carries quiet
 * shadow and an italic-serif trust line so the closing rhythm matches
 * the opening rhythm (sans wordmark → serif headline → serif trust).
 */
export function WelcomeV2({ onStartFirstScan, onSignIn }: WelcomeV2Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    onboardingV2.viewWelcome();
  }, []);

  const brandOp = useSharedValue(0);
  const headlineOp = useSharedValue(0);
  const headlineY = useSharedValue(reduceMotion ? 0 : 10);
  const subOp = useSharedValue(0);
  const listOp = useSharedValue(0);
  const listY = useSharedValue(reduceMotion ? 0 : 14);
  const ctaOp = useSharedValue(0);
  const ctaY = useSharedValue(reduceMotion ? 0 : 8);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    brandOp.value = withTiming(1, { duration: 280, easing: ease });
    headlineOp.value = withDelay(80, withTiming(1, { duration: 460, easing: ease }));
    headlineY.value = withDelay(80, withTiming(0, { duration: 460, easing: ease }));
    subOp.value = withDelay(200, withTiming(1, { duration: 380, easing: ease }));
    listOp.value = withDelay(320, withTiming(1, { duration: 520, easing: ease }));
    listY.value = withDelay(320, withTiming(0, { duration: 520, easing: ease }));
    ctaOp.value = withDelay(460, withTiming(1, { duration: 380, easing: ease }));
    ctaY.value = withDelay(460, withTiming(0, { duration: 380, easing: ease }));
  }, [brandOp, headlineOp, headlineY, subOp, listOp, listY, ctaOp, ctaY]);

  const brandStyle = useAnimatedStyle(() => ({ opacity: brandOp.value }));
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOp.value,
    transform: [{ translateY: headlineY.value }],
  }));
  const subStyle = useAnimatedStyle(() => ({ opacity: subOp.value }));
  const listStyle = useAnimatedStyle(() => ({
    opacity: listOp.value,
    transform: [{ translateY: listY.value }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOp.value,
    transform: [{ translateY: ctaY.value }],
  }));

  const handleStart = () => {
    onboardingV2.tapFirstScan();
    onStartFirstScan();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Atmospheric blush — terracotta whisper at the top fading to
          paper. Two stacked gradients (linear + soft vignette) so it
          reads like warm directional light, not a colored band. */}
      <View style={styles.washWrap} pointerEvents="none">
        <LinearGradient
          colors={['#F4E0D7', '#F8ECE5', PURA.paper]}
          locations={[0, 0.45, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.washBase}
        />
        <LinearGradient
          colors={['rgba(198, 93, 72, 0.16)', 'rgba(198, 93, 72, 0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.washGlow}
        />
      </View>

      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.View
          style={[styles.brandRow, brandStyle]}
          accessible
          accessibilityRole="header"
          accessibilityLabel="Pura — a skin coach"
        >
          <Text style={styles.wordmark} importantForAccessibility="no-hide-descendants">
            PURA
          </Text>
          <View style={styles.brandRule} />
          <Text style={styles.brandTag} maxFontSizeMultiplier={1.1}>
            A SKIN COACH
          </Text>
        </Animated.View>

        <View style={styles.body}>
          <Animated.View style={headlineStyle}>
            <Text style={styles.headline} maxFontSizeMultiplier={1.15} accessibilityRole="header">
              See what your skin{'\n'}needs{' '}
              <Text style={styles.headlineItalic}>tonight</Text>
              <Text style={styles.headlineDot}>.</Text>
            </Text>
          </Animated.View>

          <Animated.View style={subStyle}>
            <Text style={styles.lead} maxFontSizeMultiplier={1.25}>
              One private scan. One gentle plan.
            </Text>
            <View style={styles.leadOrnament} />
          </Animated.View>

          <View style={styles.flex} />

          <Animated.View style={[styles.list, listStyle]} accessible>
            <View style={styles.listTopRule} />
            <Text style={styles.listEyebrow} maxFontSizeMultiplier={1.1}>
              The Pura promise
            </Text>

            <View style={styles.listRow}>
              <Text style={styles.numeral} maxFontSizeMultiplier={1.1}>i</Text>
              <View style={styles.listText}>
                <Text style={styles.listTitle} maxFontSizeMultiplier={1.2}>One clear focus</Text>
                <Text style={styles.listHelp} maxFontSizeMultiplier={1.25}>
                  What matters about your skin today.
                </Text>
              </View>
            </View>
            <View style={styles.divider} />

            <View style={styles.listRow}>
              <Text style={styles.numeral} maxFontSizeMultiplier={1.1}>ii</Text>
              <View style={styles.listText}>
                <Text style={styles.listTitle} maxFontSizeMultiplier={1.2}>A gentle plan for tonight</Text>
                <Text style={styles.listHelp} maxFontSizeMultiplier={1.25}>
                  Three steps. Nothing harsh.
                </Text>
              </View>
            </View>
            <View style={styles.divider} />

            <View style={styles.listRow}>
              <Text style={styles.numeral} maxFontSizeMultiplier={1.1}>iii</Text>
              <View style={styles.listText}>
                <Text style={styles.listTitle} maxFontSizeMultiplier={1.2}>Progress only if you save</Text>
                <Text style={styles.listHelp} maxFontSizeMultiplier={1.25}>
                  You stay in control of your data.
                </Text>
              </View>
            </View>
            <View style={styles.listBottomRule} />
          </Animated.View>

          <View style={styles.flex} />
        </View>

        <Animated.View
          style={[
            styles.ctaWrap,
            { paddingBottom: Math.max(insets.bottom, 16) + 14 },
            ctaStyle,
          ]}
        >
          <Text style={styles.trustItalic} maxFontSizeMultiplier={1.2}>
            Private · Cosmetic guidance · Delete anytime
          </Text>

          <View style={styles.ctaShadow}>
            <OnboardingPrimaryButton
              label="Begin your first scan"
              onPress={handleStart}
              style={styles.ctaBtn}
            />
          </View>
          <Pressable
            onPress={onSignIn}
            accessibilityRole="button"
            accessibilityLabel="Already have an account, sign in"
            hitSlop={10}
            style={({ pressed }) => [
              styles.signInRow,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.signInLead} maxFontSizeMultiplier={1.15}>
              Already with us?{' '}
              <Text style={styles.signInAction}>Sign in</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PURA.paper },
  safe: { flex: 1 },
  flex: { flex: 1 },

  // Stacked gradients — base wash + soft top glow for depth.
  washWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 480,
  },
  washBase: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  washGlow: {
    position: 'absolute',
    top: -40,
    left: -20,
    right: -20,
    height: 320,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 4,
  },
  wordmark: {
    fontFamily: PURA_FONT.sansBold,
    fontSize: 12,
    letterSpacing: 3.4,
    color: PURA.ink,
  },
  brandRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: PURA.borderStrong,
    maxWidth: 56,
    opacity: 0.7,
  },
  brandTag: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 10,
    letterSpacing: 1.9,
    color: PURA.muted,
  },

  body: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
  },
  headline: {
    fontFamily: PURA_FONT.serifSemi,
    fontSize: 46,
    lineHeight: 50,
    letterSpacing: -1.2,
    color: PURA.ink,
  },
  headlineItalic: {
    fontFamily: PURA_FONT.serifItalic,
    color: PURA.terracotta,
  },
  headlineDot: {
    fontFamily: PURA_FONT.serifSemi,
    color: PURA.terracotta,
  },
  lead: {
    fontFamily: PURA_FONT.serifItalic,
    fontSize: 18,
    lineHeight: 26,
    color: PURA.body,
    marginTop: 20,
    maxWidth: 320,
    letterSpacing: -0.1,
  },
  leadOrnament: {
    width: 22,
    height: 1,
    backgroundColor: PURA.terracotta,
    marginTop: 14,
    opacity: 0.7,
  },

  list: {
    marginHorizontal: 0,
  },
  listTopRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: PURA.borderStrong,
    marginBottom: 18,
    opacity: 0.6,
  },
  listBottomRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: PURA.borderStrong,
    marginTop: 6,
    opacity: 0.6,
  },
  listEyebrow: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 10,
    letterSpacing: 2.2,
    color: PURA.terracotta,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    gap: 20,
  },
  numeral: {
    fontFamily: PURA_FONT.serifItalic,
    fontSize: 26,
    lineHeight: 28,
    color: PURA.terracotta,
    width: 32,
    paddingTop: 0,
  },
  listText: { flex: 1 },
  listTitle: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 16,
    lineHeight: 22,
    color: PURA.ink,
    letterSpacing: -0.1,
  },
  listHelp: {
    fontFamily: PURA_FONT.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: PURA.body,
    marginTop: 3,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: PURA.border,
    marginLeft: 52,
  },

  ctaWrap: {
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  trustItalic: {
    textAlign: 'center',
    fontFamily: PURA_FONT.serifItalic,
    fontSize: 13.5,
    lineHeight: 19,
    color: PURA.muted,
    marginBottom: 16,
    letterSpacing: 0.05,
  },
  ctaShadow: {
    shadowColor: '#2A1F18',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    borderRadius: 28,
  },
  ctaBtn: {
    marginHorizontal: 0,
    height: 56,
    borderRadius: 28,
  },
  signInRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  signInLead: {
    fontFamily: PURA_FONT.sans,
    fontSize: 14,
    color: PURA.body,
  },
  signInAction: {
    fontFamily: PURA_FONT.sansSemi,
    color: PURA.terracotta,
  },
});

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { AuroraOrb } from '@/components/AuroraOrb';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { palette, dsAmbient, ds } from '@/theme';

export interface CameraPrimerProps {
  onContinue: () => void;
}

/**
 * Screen 3 — Pre-camera-permission (onboarding rebuild).
 *
 * The honest hand-off before the system prompt. A centered, editorial beat:
 * a small typographic Pura mark, the headline, and a privacy promise. No
 * fake iOS dialog mock (that pantomimed the system sheet), no progress bar.
 *
 *   ( ◍ )                                  ← the companion AuroraOrb (continuity)
 *
 *   Now, the scan.                         ← Instrument Serif headline
 *   Pura uses your camera to read your     ← Inter subhead, generous leading
 *   skin in detail — texture, tone,
 *   hydration, barrier health. Scans live
 *   on your device. Nothing leaves.
 *
 *   [ Continue ]                           ← Ink CTA → CameraPermission
 *
 * Continue fires the real system camera prompt on the next screen
 * (CameraPermission). This is the last beat before the camera, so the
 * companion ORB brands it (not a static "P" monogram) — the companion stays
 * continuous right up to the scan.
 */
export function CameraPrimer({ onContinue }: CameraPrimerProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  const glyphOp = useSharedValue(0);
  const glyphScale = useSharedValue(reduceMotion ? 1 : 0.92);
  const headOp = useSharedValue(0);
  const headY = useSharedValue(reduceMotion ? 0 : 12);
  const subOp = useSharedValue(0);
  const ctaOp = useSharedValue(0);
  const ctaY = useSharedValue(reduceMotion ? 0 : 10);

  useEffect(() => {
    const easeOut = Easing.out(Easing.cubic);
    if (reduceMotion) {
      glyphOp.value = 1;
      glyphScale.value = 1;
      headOp.value = 1;
      headY.value = 0;
      subOp.value = 1;
      ctaOp.value = 1;
      ctaY.value = 0;
      return;
    }
    glyphOp.value = withTiming(1, { duration: 360, easing: easeOut });
    glyphScale.value = withTiming(1, { duration: 360, easing: easeOut });
    headOp.value = withDelay(120, withTiming(1, { duration: 420, easing: easeOut }));
    headY.value = withDelay(120, withTiming(0, { duration: 420, easing: easeOut }));
    subOp.value = withDelay(240, withTiming(1, { duration: 420, easing: easeOut }));
    ctaOp.value = withDelay(420, withTiming(1, { duration: 420, easing: easeOut }));
    ctaY.value = withDelay(420, withTiming(0, { duration: 420, easing: easeOut }));
  }, [reduceMotion, glyphOp, glyphScale, headOp, headY, subOp, ctaOp, ctaY]);

  const glyphStyle = useAnimatedStyle(() => ({
    opacity: glyphOp.value,
    transform: [{ scale: glyphScale.value }],
  }));
  const headStyle = useAnimatedStyle(() => ({
    opacity: headOp.value,
    transform: [{ translateY: headY.value }],
  }));
  const subStyle = useAnimatedStyle(() => ({ opacity: subOp.value }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOp.value,
    transform: [{ translateY: ctaY.value }],
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Ambient porcelain sky — a calm top→bottom wash so the last beat before
          the camera carries gradient depth, not flat paper. Beneath content. */}
      <LinearGradient
        colors={dsAmbient.day.sky}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.body}>
        <Animated.View style={[styles.glyphWrap, glyphStyle]}>
          {/* Soft ambient halo so the companion orb sits in its own pool of
              light on the porcelain (the orb keeps its own aura; this is a
              faint surface bloom, not a second accent). */}
          <View style={styles.orbBloom} pointerEvents="none" />
          <AuroraOrb
            size={104}
            state="idle"
            reduceMotion={reduceMotion}
            auraTheme="blue-warm"
          />
        </Animated.View>

        <Animated.View style={[styles.eyebrowRow, headStyle]}>
          <View style={styles.eyebrowTick} />
          <Animated.Text style={styles.eyebrow} maxFontSizeMultiplier={1.2}>
            THE SCAN
          </Animated.Text>
        </Animated.View>

        <Animated.Text
          style={[styles.headline, headStyle]}
          maxFontSizeMultiplier={1.15}
          accessibilityRole="header"
        >
          Now,{'\n'}the scan.
        </Animated.Text>

        <Animated.Text style={[styles.sub, subStyle]} maxFontSizeMultiplier={1.25}>
          Pura uses your camera to read your skin in detail — texture, tone,
          hydration, barrier health. Scans live on your device. Nothing leaves.
        </Animated.Text>
      </View>

      <Animated.View
        style={[styles.ctaWrap, ctaStyle, { paddingBottom: insets.bottom + 24 }]}
      >
        <OnboardingPrimaryButton label="Continue" onPress={onContinue} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  // Editorial left-baseline composition — the display headline is the hero, the
  // orb its luminous mark, with confident whitespace above the CTA.
  body: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  glyphWrap: {
    marginBottom: 28,
    marginLeft: -4,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  // Faint surface bloom behind the orb — a low-alpha brand wash that grounds
  // the companion in light. Soft, premium, never a hard disc.
  orbBloom: {
    position: 'absolute',
    width: 184,
    height: 184,
    borderRadius: 92,
    left: -40,
    top: -40,
    backgroundColor: dsAmbient.day.glow,
  },
  // Eyebrow row — a short brand tick + tracked caps label, the editorial
  // section marker. The blue accent re-earns attention on the orb + ink CTA;
  // the tick is the only quiet brand note here.
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  eyebrowTick: {
    width: 22,
    height: 2,
    borderRadius: 1,
    backgroundColor: ds.accent,
    marginRight: 10,
  },
  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11.5,
    lineHeight: 14,
    letterSpacing: 2.4,
    color: ds.textTertiary,
    textAlign: 'left',
  },
  // Dramatic display-scale serif headline — cinematic, stacked, left-anchored.
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 64,
    lineHeight: 60,
    letterSpacing: -2.2,
    color: palette.ink,
    textAlign: 'left',
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 16.5,
    lineHeight: 26,
    letterSpacing: -0.1,
    color: palette.inkSecondary,
    textAlign: 'left',
    marginTop: 22,
    maxWidth: 340,
  },
  ctaWrap: {
    paddingTop: 8,
  },
});

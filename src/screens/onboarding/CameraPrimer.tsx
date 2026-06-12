import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck } from 'phosphor-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AuroraOrb } from '@/components/AuroraOrb';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import {
  palette,
  dsAmbient,
  ds,
  dsRadius,
  dsSpace,
  dsElevation,
} from '@/theme';

export interface CameraPrimerProps {
  onContinue: () => void;
}

/**
 * Screen 3 — Pre-camera-permission (onboarding rebuild · Cycle 12 imagery).
 *
 * The honest hand-off before the system prompt — now framed as the face-capture
 * MOMENT itself. The hero is an editorial portrait GUIDE FRAME (the shared
 * imagery language: ~4:5 ratio, generous rounded corners, a soft bottom scrim,
 * a hairline frame + elevation lift). No real scan exists yet during onboarding
 * (`scans` is empty), so rather than fake a face photo we present an honest,
 * premium PLACEHOLDER of the capture surface: viewfinder corner brackets, a
 * "position your face" guide ring with the companion orb glowing where the face
 * will land, and the privacy promise reading AA+ over the bottom scrim.
 *
 *   ┌                       ┐
 *      ( ◍ )   ← companion orb sits in the face guide ring (continuity)
 *      ·····   ← dashed face oval (where YOUR portrait will be)
 *    [ scrim ]
 *    Now, the scan.         ← Instrument Serif, over the scrim
 *   └  "Your photo is used to read your skin,
 *       then it's never stored or shared."   ┘  ← the canonical privacy line
 *
 *   [ Continue ]            ← Ink CTA → CameraPermission (fires system prompt)
 *
 * This previews EXACTLY what the scan will look like, so the camera step feels
 * premium and on-brand the instant it appears.
 */
export function CameraPrimer({ onContinue }: CameraPrimerProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();

  // Editorial portrait card — a true ~4:5 hero, sized to the viewport with
  // confident side margins so it dominates as the signature image.
  const frameW = Math.min(width - dsSpace.xl * 2, 360);
  const frameH = Math.round(frameW * 1.25); // 4:5 portrait
  const orbSize = Math.round(frameW * 0.4);

  const frameOp = useSharedValue(0);
  const frameScale = useSharedValue(reduceMotion ? 1 : 0.94);
  const headOp = useSharedValue(0);
  const headY = useSharedValue(reduceMotion ? 0 : 12);
  const subOp = useSharedValue(0);
  const ctaOp = useSharedValue(0);
  const ctaY = useSharedValue(reduceMotion ? 0 : 10);
  const sweep = useSharedValue(0); // viewfinder scan beam (looping)

  useEffect(() => {
    const easeOut = Easing.out(Easing.cubic);
    if (reduceMotion) {
      frameOp.value = 1;
      frameScale.value = 1;
      headOp.value = 1;
      headY.value = 0;
      subOp.value = 1;
      ctaOp.value = 1;
      ctaY.value = 0;
      return;
    }
    frameOp.value = withTiming(1, { duration: 460, easing: easeOut });
    frameScale.value = withTiming(1, { duration: 460, easing: easeOut });
    headOp.value = withDelay(200, withTiming(1, { duration: 420, easing: easeOut }));
    headY.value = withDelay(200, withTiming(0, { duration: 420, easing: easeOut }));
    subOp.value = withDelay(320, withTiming(1, { duration: 420, easing: easeOut }));
    ctaOp.value = withDelay(480, withTiming(1, { duration: 420, easing: easeOut }));
    ctaY.value = withDelay(480, withTiming(0, { duration: 420, easing: easeOut }));
    // A slow viewfinder sweep — "the camera is ready, looking for you."
    sweep.value = withDelay(
      640,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 0 }),
          withDelay(900, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      ),
    );
  }, [reduceMotion, frameOp, frameScale, headOp, headY, subOp, ctaOp, ctaY, sweep]);

  const frameStyle = useAnimatedStyle(() => ({
    opacity: frameOp.value,
    transform: [{ scale: frameScale.value }],
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
  // Scan beam glides down the guide frame, fading at both ends of the sweep.
  const beamStyle = useAnimatedStyle(() => {
    const p = sweep.value;
    const fade = p < 0.16 ? p / 0.16 : p > 0.84 ? (1 - p) / 0.16 : 1;
    return {
      opacity: Math.max(0, Math.min(1, fade)) * 0.9,
      transform: [{ translateY: p * (frameH - 4) }],
    };
  });

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
        {/* No eyebrow — "Now, the scan." owns the screen; a caps label saying
            THE SCAN directly above it was the headline twice. */}

        {/* HERO — the editorial face-capture guide frame (the shared portrait
            imagery language applied to an honest empty/locked state). */}
        <Animated.View
          style={[styles.frameWrap, { width: frameW, height: frameH }, frameStyle]}
        >
          {/* Soft brand bloom behind the card so it floats in its own light. */}
          <View
            style={[
              styles.frameBloom,
              { width: frameW + 64, height: frameH + 64, borderRadius: dsRadius.xxl + 20 },
            ]}
            pointerEvents="none"
          />

          <View style={[styles.frame, { borderRadius: dsRadius.xl }]}>
            {/* Capture-surface ground — a faint cool wash, like a live but
                un-pointed viewfinder (never a flat gray box). */}
            <LinearGradient
              colors={[ds.surface, ds.surfaceSunken, ds.pageDeep]}
              locations={[0, 0.5, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Face guide ring — a dashed portrait oval marking where the user's
                face (the future hero portrait) will land. Honest placeholder. */}
            <View style={styles.guideCenter} pointerEvents="none">
              <View
                style={[
                  styles.faceOval,
                  { width: frameW * 0.56, height: frameW * 0.56 * 1.28 },
                ]}
              />
              {/* The companion orb glows inside the guide — the continuous
                  presence, now sitting where the portrait will be. */}
              <View style={styles.orbInGuide}>
                <AuroraOrb
                  size={orbSize}
                  state="idle"
                  reduceMotion={reduceMotion}
                  auraTheme="blue-warm"
                />
              </View>
            </View>

            {/* Viewfinder corner brackets — the editorial framing cue. */}
            <View style={[styles.corner, styles.cornerTL]} pointerEvents="none" />
            <View style={[styles.corner, styles.cornerTR]} pointerEvents="none" />
            <View style={[styles.corner, styles.cornerBL]} pointerEvents="none" />
            <View style={[styles.corner, styles.cornerBR]} pointerEvents="none" />

            {/* Viewfinder scan beam — a thin brand sweep, "ready, looking." */}
            <Animated.View style={[styles.beam, beamStyle]} pointerEvents="none">
              <LinearGradient
                colors={['rgba(20,124,255,0)', ds.accent, 'rgba(20,124,255,0)']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.beamFill}
              />
            </Animated.View>

            {/* Bottom scrim — the shared imagery rule: a soft ds.scrim →
                transparent gradient so the overlaid headline + promise stay
                AA+ legible over any future portrait. */}
            <LinearGradient
              colors={['transparent', 'rgba(8,10,15,0.0)', 'rgba(8,10,15,0.62)']}
              locations={[0, 0.42, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.scrim}
              pointerEvents="none"
            />

            {/* Overlaid editorial copy — headline + privacy promise, on scrim. */}
            <View style={styles.overlay} pointerEvents="none">
              <Animated.Text
                style={[styles.headline, headStyle]}
                maxFontSizeMultiplier={1.1}
                accessibilityRole="header"
              >
                Now, the scan.
              </Animated.Text>
              <Animated.View style={[styles.promiseRow, subStyle]}>
                <ShieldCheck size={15} weight="fill" color={palette.bg} />
                <Animated.Text style={styles.promise} maxFontSizeMultiplier={1.2}>
                  Your photo is used to read your skin, then it’s never stored
                  or shared.
                </Animated.Text>
              </Animated.View>
            </View>
          </View>
        </Animated.View>

        {/* Supporting line beneath the hero — the detail, in calm ink. Half
            its former length: the hero + headline + promise carry the moment;
            this names only the real read dimensions. */}
        <Animated.Text style={[styles.sub, subStyle]} maxFontSizeMultiplier={1.25}>
          Texture, tone, hydration, barrier — from one portrait.
        </Animated.Text>
      </View>

      <Animated.View
        style={[styles.ctaWrap, ctaStyle, { paddingBottom: insets.bottom + 24 }]}
      >
        {/* The exact two words the orb was born under ("Let's look.") — the
            final tap reads as a kept promise, not a new ask. */}
        <OnboardingPrimaryButton label="Let’s look." onPress={onContinue} />
      </Animated.View>
    </SafeAreaView>
  );
}

const BRACKET = 24;
const BRACKET_W = 2.5;
const BRACKET_INSET = 14;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  // Centered editorial composition — the portrait guide frame is the hero,
  // crowned by the section eyebrow, with the detail line + CTA below.
  body: {
    flex: 1,
    paddingHorizontal: dsSpace.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The hero portrait frame wrapper (carries the elevation lift + bloom).
  frameWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    ...dsElevation.e3,
  },
  frameBloom: {
    position: 'absolute',
    backgroundColor: dsAmbient.day.glow,
  },
  // The capture card — generous radius, hairline frame, clipped contents.
  frame: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: ds.surface,
    borderWidth: 1,
    borderColor: ds.hairline,
  },
  guideCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dashed face oval — where the user's portrait (the recurring hero) will sit.
  faceOval: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(20,124,255,0.45)',
    borderStyle: 'dashed',
  },
  orbInGuide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Viewfinder corner brackets (two borders each → an "L").
  corner: {
    position: 'absolute',
    width: BRACKET,
    height: BRACKET,
    borderColor: 'rgba(252,253,255,0.92)',
  },
  cornerTL: {
    top: BRACKET_INSET,
    left: BRACKET_INSET,
    borderTopWidth: BRACKET_W,
    borderLeftWidth: BRACKET_W,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: BRACKET_INSET,
    right: BRACKET_INSET,
    borderTopWidth: BRACKET_W,
    borderRightWidth: BRACKET_W,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: BRACKET_INSET,
    left: BRACKET_INSET,
    borderBottomWidth: BRACKET_W,
    borderLeftWidth: BRACKET_W,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: BRACKET_INSET,
    right: BRACKET_INSET,
    borderBottomWidth: BRACKET_W,
    borderRightWidth: BRACKET_W,
    borderBottomRightRadius: 6,
  },
  beam: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 0,
    height: 3,
  },
  beamFill: {
    flex: 1,
    borderRadius: 2,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '52%',
  },
  // Copy overlaid on the scrim — bottom-anchored, editorial.
  overlay: {
    position: 'absolute',
    left: dsSpace.lg,
    right: dsSpace.lg,
    bottom: dsSpace.lg,
  },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1.4,
    color: palette.bg,
    textAlign: 'left',
  },
  promiseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: dsSpace.sm,
    gap: 7,
  },
  promise: {
    flex: 1, // the honest privacy line wraps to two lines over the scrim
    fontFamily: 'Inter-Medium',
    fontSize: 12.5,
    lineHeight: 16,
    letterSpacing: 0.1,
    color: 'rgba(252,253,255,0.92)',
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 15.5,
    lineHeight: 24,
    letterSpacing: -0.1,
    color: palette.inkSecondary,
    textAlign: 'center',
    marginTop: dsSpace.xl,
    maxWidth: 340,
  },
  ctaWrap: {
    paddingTop: dsSpace.sm,
  },
});

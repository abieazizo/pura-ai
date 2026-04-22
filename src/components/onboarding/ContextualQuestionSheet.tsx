import React, { useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '@/theme';

export interface ContextualQuestionSheetProps {
  visible: boolean;
  kicker: string;
  headline: string;
  subhead?: string;
  children?: React.ReactNode;
  /** Label on the bottom skip-link. Omit to hide the link entirely. */
  skipLabel?: string;
  onDismiss: () => void;
  /** Fired when the user taps the skip link. Defaults to `onDismiss`. */
  onSkip?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}

const SPRING = { damping: 22, stiffness: 140, mass: 1 };

/**
 * Reusable contextual question bottom sheet (§3.1). Not using
 * `@gorhom/bottom-sheet` because the content sizes to its children; gorhom's
 * snap-point model fights dynamic height. A hand-rolled Reanimated sheet is
 * simpler and keeps the spec's spring preset consistent with the rest of
 * onboarding.
 */
export function ContextualQuestionSheet({
  visible,
  kicker,
  headline,
  subhead,
  children,
  skipLabel = 'Skip for now',
  onDismiss,
  onSkip,
  contentStyle,
}: ContextualQuestionSheetProps) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(1); // 1 = fully below, 0 = at rest
  const backdrop = useSharedValue(0);
  const requested = useRef(false);

  // Drive the entrance / exit by prop. Keeping the Modal mounted for the
  // exit animation via a short close-delay before the parent nulls `visible`.
  useEffect(() => {
    if (visible) {
      requested.current = true;
      y.value = withSpring(0, SPRING);
      backdrop.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      y.value = withSpring(1, SPRING);
      backdrop.value = withTiming(0, {
        duration: 240,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [visible, y, backdrop]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: `${y.value * 100}%` }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  const close = () => {
    if (!requested.current) return;
    onDismiss();
  };

  const skip = () => {
    onSkip ? onSkip() : onDismiss();
  };

  // Pan down to dismiss. We let the user drag the sheet down; if they
  // release past 80px or with upward velocity, we bounce back; otherwise
  // we dismiss.
  const pan = Gesture.Pan()
    .onChange((e) => {
      if (e.translationY > 0) {
        y.value = Math.min(1, e.translationY / 400);
      }
    })
    .onEnd((e) => {
      if (e.translationY > 80 || e.velocityY > 900) {
        y.value = withTiming(
          1,
          { duration: 220, easing: Easing.in(Easing.cubic) },
          () => {
            // Jump back to JS to trigger the unmount.
          }
        );
        runOnJSWrapper(close);
      } else {
        y.value = withSpring(0, SPRING);
      }
    });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]}>
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={styles.backdropTouch}
          />
          <View style={styles.tint} pointerEvents="none" />
        </Animated.View>

        <View style={styles.sheetWrap} pointerEvents="box-none">
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[
                styles.sheet,
                {
                  paddingBottom: Math.max(insets.bottom, 16) + 24,
                },
                sheetStyle,
              ]}
            >
              <View style={styles.grabber} />
              <SafeAreaView edges={['bottom']} style={styles.inner}>
                <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
                  {kicker}
                </Text>
                <Text
                  style={styles.headline}
                  accessibilityRole="header"
                  maxFontSizeMultiplier={1.15}
                >
                  {headline}
                </Text>
                {subhead ? (
                  <Text style={styles.subhead} maxFontSizeMultiplier={1.2}>
                    {subhead}
                  </Text>
                ) : null}

                <View style={[styles.content, contentStyle]}>{children}</View>

                {skipLabel ? (
                  <Pressable
                    onPress={skip}
                    accessibilityRole="link"
                    hitSlop={8}
                    style={styles.skipBtn}
                  >
                    <Text style={styles.skipText}>{skipLabel}</Text>
                  </Pressable>
                ) : null}
              </SafeAreaView>
            </Animated.View>
          </GestureDetector>
        </View>
      </View>
    </Modal>
  );
}

/**
 * `runOnJS` wrapper — we need to call `close` from the Reanimated gesture
 * callback. Using a simple setTimeout(0) is safe here because the callback
 * already lives on the JS thread (Gesture.Pan() callbacks run on JS unless
 * configured otherwise).
 */
function runOnJSWrapper(fn: () => void) {
  setTimeout(fn, 180);
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdropTouch: { ...StyleSheet.absoluteFillObject },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,22,20,0.3)', // ink @ 30%
  },
  sheetWrap: {
    alignSelf: 'stretch',
    maxHeight: '60%',
  },
  sheet: {
    backgroundColor: palette.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // Warm layered shadow
    shadowColor: palette.ink,
    shadowOpacity: 0.15,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -16 },
    elevation: 12,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(26,22,20,0.15)',
    marginTop: 12,
    marginBottom: 4,
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(26,22,20,0.6)',
    marginBottom: 8,
  },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 24,
    lineHeight: 24 * 1.15,
    letterSpacing: -0.4,
    color: palette.ink,
  },
  subhead: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 15 * 1.35,
    color: 'rgba(26,22,20,0.7)',
    marginTop: 8,
  },
  content: {
    marginTop: 20,
    gap: 12,
  },
  skipBtn: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: 'rgba(26,22,20,0.6)',
  },
});

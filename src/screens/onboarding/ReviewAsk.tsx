import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import * as StoreReview from 'expo-store-review';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Star } from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { useAppStore } from '@/store/useAppStore';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

export interface ReviewAskProps {
  onDone: () => void;
}

const CARD_W = 320;
const STAR_COUNT = 5;

/**
 * Review ask (§3.12). Modal-style overlay: blurred warm backdrop, card
 * rising from bottom with spring. Star taps fire `StoreReview.requestReview`
 * and advance. "Not now" dismisses. Guarded by `hasAskedForReview` — auto-
 * advances if the user has already been asked once.
 */
export function ReviewAsk({ onDone }: ReviewAskProps) {
  const hasAskedForReview = useAppStore((s) => s.hasAskedForReview);
  const setHasAskedForReview = useAppStore((s) => s.setHasAskedForReview);
  const autoFiredRef = useRef(false);

  // Skip past the screen entirely if we've already asked.
  useEffect(() => {
    if (hasAskedForReview && !autoFiredRef.current) {
      autoFiredRef.current = true;
      onDone();
    }
  }, [hasAskedForReview, onDone]);

  // Entrance timeline
  const backdropOpacity = useSharedValue(0);
  const cardY = useSharedValue(40);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    backdropOpacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    cardY.value = withSpring(0, { damping: 22, stiffness: 140, mass: 1 });
    cardOpacity.value = withTiming(1, { duration: 300 });
  }, [backdropOpacity, cardY, cardOpacity]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));

  const dismiss = () => {
    setHasAskedForReview(true);
    onDone();
  };

  const tapStar = async () => {
    hapt.select();
    try {
      const available = await StoreReview.isAvailableAsync();
      if (available) {
        await StoreReview.requestReview();
      }
    } catch {
      // Non-fatal — still treat as asked.
    } finally {
      setHasAskedForReview(true);
      setTimeout(onDone, 600);
    }
  };

  if (hasAskedForReview) {
    return (
      <SafeAreaView style={styles.bgRoot} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]}>
        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.tint} />
      </Animated.View>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Animated.View style={[styles.card, cardStyle]}>
            <View style={styles.iconTile}>
              <PuraMark variant="idle" size="md" color={palette.bg} />
            </View>

            <View style={{ height: 16 }} />
            <Text style={styles.title} maxFontSizeMultiplier={1.15}>
              Enjoying Pura?
            </Text>

            <View style={{ height: 8 }} />
            <Text style={styles.body} maxFontSizeMultiplier={1.2}>
              Tap a star to rate on the App Store.
            </Text>

            <View style={styles.divider} />

            <View style={styles.stars}>
              {Array.from({ length: STAR_COUNT }).map((_, i) => (
                <Pressable
                  key={i}
                  onPress={tapStar}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${i + 1} of ${STAR_COUNT} stars`}
                >
                  <Star
                    size={40}
                    color={palette.clay}
                    weight="regular"
                  />
                </Pressable>
              ))}
            </View>

            <View style={{ height: 20 }} />
            <Pressable
              onPress={dismiss}
              accessibilityRole="button"
              accessibilityLabel="Not now"
              style={({ pressed }) => [
                styles.notNow,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.notNowLabel}>Not now</Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgRoot: { flex: 1, backgroundColor: palette.bg },
  root: { flex: 1, backgroundColor: 'transparent' },
  // v10.7 — scrim moved to cool ink; review-ask body + divider + notNow
  // button retired their v5 warm-sand / warm-ink rgbas in favor of
  // palette tokens.
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,18,32,0.22)',
  },
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: CARD_W,
    borderRadius: 24,
    backgroundColor: palette.bg,
    padding: 24,
    alignItems: 'center',
    // Warm layered shadow
    shadowColor: palette.ink,
    shadowOpacity: 0.15,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  iconTile: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: palette.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: palette.ink,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
    textAlign: 'center',
  },
  divider: {
    marginTop: 20,
    height: 1,
    alignSelf: 'stretch',
    backgroundColor: palette.hairline,
  },
  stars: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  notNow: {
    height: 44,
    alignSelf: 'stretch',
    borderRadius: 22,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notNowLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
});

import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '@/theme';

export interface FiltersStubSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Filter bottom sheet — STUB. Filter logic lands in a future PR (§5).
 * This exists so the SlidersHorizontal icon has a destination and nothing
 * in the catalog screen needs a runtime null check.
 */
export function FiltersStubSheet({ visible, onDismiss }: FiltersStubSheetProps) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(1);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    y.value = visible
      ? withSpring(0, { damping: 22, stiffness: 140, mass: 1 })
      : withSpring(1, { damping: 22, stiffness: 140, mass: 1 });
    backdrop.value = withTiming(visible ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, y, backdrop]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: `${y.value * 100}%` }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onDismiss} />
          <View style={styles.tint} pointerEvents="none" />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 24 },
            sheetStyle,
          ]}
        >
          <View style={styles.grabber} />
          <SafeAreaView edges={['bottom']} style={styles.inner}>
            <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
              FILTERS
            </Text>
            <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
              Filters coming soon.
            </Text>
            <Text style={styles.body} maxFontSizeMultiplier={1.2}>
              Soon you'll be able to narrow by price, brand, and skin fit.
            </Text>
            <Pressable
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,22,20,0.3)',
  },
  sheet: {
    backgroundColor: palette.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(26,22,20,0.6)',
    marginBottom: 8,
  },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 24,
    lineHeight: 28,
    color: palette.ink,
  },
  body: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(26,22,20,0.7)',
    marginTop: 8,
  },
  closeBtn: {
    marginTop: 20,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(212,165,116,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
});

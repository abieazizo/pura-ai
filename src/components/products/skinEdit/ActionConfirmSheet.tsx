/**
 * ActionConfirmSheet — restrained confirmation for "added to routine"
 * and "saved for later". No confetti; subtle haptic feedback only.
 *
 * Adapts copy by the action kind.
 */

import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';

export type ConfirmKind = 'added_tonight' | 'saved_for_later';

interface ActionConfirmSheetProps {
  visible: boolean;
  kind: ConfirmKind;
  productLabel: string;
  onPrimary: () => void;
  onSecondary?: () => void;
  onDismiss: () => void;
}

export function ActionConfirmSheet({
  visible,
  kind,
  productLabel,
  onPrimary,
  onSecondary,
  onDismiss,
}: ActionConfirmSheetProps) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(1);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) hapt.tap();
    y.value = visible
      ? withSpring(0, { damping: 22, stiffness: 140, mass: 1 })
      : withSpring(1, { damping: 22, stiffness: 140, mass: 1 });
    backdrop.value = withTiming(visible ? 1 : 0, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, y, backdrop]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: `${y.value * 100}%` }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  const isAdded = kind === 'added_tonight';
  const title = isAdded ? 'Added to tonight’s routine' : 'Saved for the marks phase';
  const body = isAdded
    ? 'Use twice this week after cleansing and before moisturizer.'
    : 'Pura will surface this again once active-looking areas begin to settle.';
  const safetyNote = isAdded
    ? 'Avoid combining with another exfoliating treatment tonight.'
    : null;
  const primaryLabel = isAdded ? 'View updated routine' : 'View product plan';
  const secondaryLabel = isAdded ? 'Done' : 'Done';

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
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
            sheetStyle,
          ]}
        >
          <View style={styles.grabber} />
          <SafeAreaView edges={['bottom']} style={styles.inner}>
            <View style={styles.confirmBadge}>
              <Check size={18} color={palette.inkInverse} weight="bold" />
            </View>
            <Text style={styles.title} maxFontSizeMultiplier={1.2}>
              {title}
            </Text>
            <Text style={styles.product} maxFontSizeMultiplier={1.2}>
              {productLabel}
            </Text>
            <Text style={styles.body} maxFontSizeMultiplier={1.3}>
              {body}
            </Text>
            {safetyNote ? (
              <View style={styles.safety}>
                <Text style={styles.safetyLabel} maxFontSizeMultiplier={1.1}>
                  SAFETY
                </Text>
                <Text style={styles.safetyBody} maxFontSizeMultiplier={1.2}>
                  {safetyNote}
                </Text>
              </View>
            ) : null}
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={primaryLabel}
                onPress={() => {
                  hapt.select();
                  onPrimary();
                }}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              >
                <Text style={styles.primaryLabel} maxFontSizeMultiplier={1.15}>
                  {primaryLabel}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={secondaryLabel}
                onPress={() => {
                  hapt.select();
                  onSecondary?.();
                  onDismiss();
                }}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
              >
                <Text style={styles.secondaryLabel} maxFontSizeMultiplier={1.15}>
                  {secondaryLabel}
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 26, 0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: palette.hairline,
    marginTop: 8,
    marginBottom: 8,
  },
  inner: {
    paddingTop: 8,
  },
  confirmBadge: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: palette.clay,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 8,
  },
  product: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    lineHeight: 18,
    color: palette.inkSecondary,
    marginBottom: 12,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: palette.ink,
    marginBottom: 14,
  },
  safety: {
    backgroundColor: palette.clayPaper,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  safetyLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    marginBottom: 4,
  },
  safetyBody: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    lineHeight: 17,
    color: palette.ink,
  },
  actions: {
    gap: 8,
    marginTop: 4,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: {
    backgroundColor: '#0A0C12',
  },
  primaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: palette.inkInverse,
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnPressed: {
    backgroundColor: palette.bgDeep,
  },
  secondaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
});

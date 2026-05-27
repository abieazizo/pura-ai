import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SectionEyebrow } from './SectionEyebrow';
import { dx, dRadius, dShadow } from '../decisionTokens';
import { APPLIED_CONFIRMATION } from '../decisionCopy';
import type { TonightDecision } from '@/state/tonightDecision';
import { hapt } from '@/utils/haptics';

interface Props {
  decision: TonightDecision;
  onViewRoutine: () => void;
  onUndo: () => void;
}

/**
 * Confirmation surface that drops in once the user taps "Apply
 * changes to tonight". Restates the held/prioritized items, scopes
 * the change to tonight, and offers an undo path.
 */
export function AppliedConfirmationPanel({
  decision,
  onViewRoutine,
  onUndo,
}: Props) {
  const op = useSharedValue(0);
  const ty = useSharedValue(8);

  useEffect(() => {
    op.value = withTiming(1, {
      duration: 360,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
    ty.value = withTiming(0, {
      duration: 360,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [op, ty]);

  const animated = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));

  const removed = decision.adjustments.filter(
    (a) => a.status === 'HELD_TONIGHT' || a.status === 'AVOID_UNTIL_RECHECK',
  );
  const prioritized = decision.adjustments.filter(
    (a) =>
      a.status === 'PRIORITIZED_TONIGHT' || a.status === 'USE_TONIGHT',
  );

  const title =
    decision.state === 'RESET_NIGHT'
      ? APPLIED_CONFIRMATION.titleReset
      : APPLIED_CONFIRMATION.titleRecovery;

  return (
    <Animated.View
      style={[styles.card, dShadow.card, animated]}
      accessibilityLiveRegion="polite"
      accessibilityRole="summary"
      accessibilityLabel={`${APPLIED_CONFIRMATION.eyebrow}. ${title}`}
    >
      <SectionEyebrow label={APPLIED_CONFIRMATION.eyebrow} tone="terracotta" />
      <Text style={styles.title} maxFontSizeMultiplier={1.2}>
        {title}
      </Text>

      {removed.length > 0 ? (
        <View style={styles.group}>
          <SectionEyebrow label={APPLIED_CONFIRMATION.removedLabel} />
          {removed.map((r) => (
            <Text
              key={`rm-${r.productName}`}
              style={styles.item}
              maxFontSizeMultiplier={1.25}
            >
              {r.productName}
            </Text>
          ))}
        </View>
      ) : null}

      {prioritized.length > 0 ? (
        <View style={styles.group}>
          <SectionEyebrow label={APPLIED_CONFIRMATION.prioritizedLabel} />
          {prioritized.map((r) => (
            <Text
              key={`pr-${r.productName}`}
              style={styles.item}
              maxFontSizeMultiplier={1.25}
            >
              {r.productName}
            </Text>
          ))}
        </View>
      ) : null}

      <Text style={styles.scope} maxFontSizeMultiplier={1.3}>
        {APPLIED_CONFIRMATION.scopeNote}
      </Text>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={APPLIED_CONFIRMATION.viewRoutine}
          onPress={() => {
            hapt.tap();
            onViewRoutine();
          }}
          style={({ pressed }) => [
            styles.primaryAction,
            pressed && { opacity: 0.92 },
          ]}
        >
          <Text style={styles.primaryText} maxFontSizeMultiplier={1.15}>
            {APPLIED_CONFIRMATION.viewRoutine}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={APPLIED_CONFIRMATION.undo}
          onPress={() => {
            hapt.warning();
            onUndo();
          }}
          style={({ pressed }) => [
            styles.undoAction,
            pressed && { opacity: 0.88 },
          ]}
        >
          <Text style={styles.undoText} maxFontSizeMultiplier={1.15}>
            {APPLIED_CONFIRMATION.undo}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: dx.clayHold,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: dx.terracottaTint,
    padding: 16,
    gap: 10,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 19,
    lineHeight: 23,
    letterSpacing: -0.3,
    color: dx.ink,
  },
  group: { gap: 4 },
  item: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    lineHeight: 17,
    color: dx.ink,
  },
  scope: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: dx.inkSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    alignItems: 'center',
  },
  primaryAction: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: dRadius.pill,
    backgroundColor: dx.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    color: dx.inkInverse,
    letterSpacing: 0.1,
  },
  undoAction: {
    height: 38,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  undoText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    color: dx.terracottaText,
    textDecorationLine: 'underline',
  },
});

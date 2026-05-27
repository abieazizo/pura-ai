import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Check } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { T, TYPE, RADIUS, SPACE } from './tokens';
import { SemanticBadge } from './SemanticBadge';
import { PrimaryButton, TextAction } from './Surfaces';
import type { RoutineStepV25 } from '@/state/v25/types';

/**
 * v25 — RoutineStepCard.
 *
 * Collapsed by default. Only one card may be expanded at a time
 * (the parent screen owns that exclusivity). Variants:
 *
 *   • Collapsed: number + title + priority badge + 1-line summary.
 *   • Expanded:  body + "WHY TONIGHT" rationale + appropriate action
 *                row depending on assigned-product / missing-product /
 *                no-treatment-tonight.
 *   • Completed: terracotta ring tick + de-emphasized title.
 *
 * Action row contract — there must NEVER be more than one primary
 * action on a single card. Secondary actions appear as TextAction.
 */

const PRESS_SPRING = { damping: 14, stiffness: 280, mass: 1 };

interface RoutineStepCardProps {
  step: RoutineStepV25;
  expanded: boolean;
  onExpand: () => void;
  onMarkComplete: () => void;
  onAlternativeComplete?: () => void;
  onAddOwnedProduct?: () => void;
  onFindMatch?: () => void;
  onAskWhy?: () => void;
}

export function RoutineStepCard({
  step,
  expanded,
  onExpand,
  onMarkComplete,
  onAlternativeComplete,
  onAddOwnedProduct,
  onFindMatch,
  onAskWhy,
}: RoutineStepCardProps) {
  const scale = useSharedValue(1);
  const expandAmt = useSharedValue(expanded ? 1 : 0);

  React.useEffect(() => {
    expandAmt.value = withTiming(expanded ? 1 : 0, {
      duration: 280,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
  }, [expanded, expandAmt]);

  const expandedStyle = useAnimatedStyle(() => ({
    opacity: expandAmt.value,
  }));
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (step.completed) return;
    hapt.select();
    scale.value = withSpring(0.99, PRESS_SPRING, () => {
      scale.value = withSpring(1, PRESS_SPRING);
    });
    onExpand();
  };

  const badgeVariant =
    step.priority === 'required'
      ? 'required'
      : step.priority === 'recommended'
      ? 'recommended'
      : 'optional';

  return (
    <Animated.View style={[s.card, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        disabled={step.completed && !expanded}
        accessibilityRole="button"
        accessibilityLabel={`${step.title}, ${step.priority}`}
        accessibilityState={{ expanded, selected: step.completed }}
        style={s.head}
      >
        <View style={s.numWrap}>
          {step.completed ? (
            <View style={s.checkOn}>
              <Check size={14} color="#FCFAF7" weight="bold" />
            </View>
          ) : (
            <Text style={s.num} maxFontSizeMultiplier={1.1}>
              {String(step.order).padStart(2, '0')}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.titleRow}>
            <Text
              style={[s.title, step.completed && s.titleDone]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
            >
              {step.title}
            </Text>
            {!step.completed ? (
              <SemanticBadge variant={badgeVariant} />
            ) : null}
          </View>
          {!expanded || step.completed ? (
            <Text style={s.summary} maxFontSizeMultiplier={1.25}>
              {step.completed ? 'Completed' : step.summary}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {expanded && !step.completed ? (
        <Animated.View style={[s.expanded, expandedStyle]}>
          <Text style={s.expandedBody} maxFontSizeMultiplier={1.25}>
            {step.expandedBody}
          </Text>

          <Text style={s.rationaleEyebrow} maxFontSizeMultiplier={1.15}>
            WHY TONIGHT
          </Text>
          <Text style={s.rationale} maxFontSizeMultiplier={1.25}>
            {step.rationale}
          </Text>

          {step.assignedProduct ? (
            <View style={s.assignedWrap}>
              <View style={s.assignedRow}>
                <View style={s.productThumb}>
                  <Text style={s.productInitial}>
                    {step.assignedProduct.name.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.productName} maxFontSizeMultiplier={1.2}>
                    {step.assignedProduct.name}
                  </Text>
                  <Text style={s.productMeta} maxFontSizeMultiplier={1.25}>
                    Barrier support · No conflicts detected
                  </Text>
                </View>
                <SemanticBadge variant="safe" />
              </View>
            </View>
          ) : step.noTreatmentTonight ? (
            <View style={s.calmInline}>
              <Text style={s.calmInlineText} maxFontSizeMultiplier={1.25}>
                No treatment needed tonight. Your cleanser and moisturizer are
                enough.
              </Text>
            </View>
          ) : step.missingProductMessage ? (
            <View style={s.missingInline}>
              <Text style={s.missingText} maxFontSizeMultiplier={1.25}>
                {step.missingProductMessage}
              </Text>
            </View>
          ) : null}

          <View style={s.actionsRow}>
            {step.assignedProduct ? (
              <PrimaryButton
                label="Mark complete"
                onPress={onMarkComplete}
                full
              />
            ) : step.noTreatmentTonight ? (
              <PrimaryButton label="Done" onPress={onMarkComplete} full />
            ) : (
              <PrimaryButton
                label="Add owned product"
                onPress={() => onAddOwnedProduct?.()}
                full
              />
            )}
          </View>

          {step.assignedProduct && onAskWhy ? (
            <TextAction
              label="Why this product tonight?"
              onPress={onAskWhy}
              style={{ alignSelf: 'flex-start', marginTop: 10 }}
            />
          ) : null}

          {!step.assignedProduct && !step.noTreatmentTonight && onFindMatch ? (
            <TextAction
              label={
                step.id === 'cleanse'
                  ? 'Find cleanser'
                  : 'Find a barrier-safe match'
              }
              onPress={onFindMatch}
              style={{ alignSelf: 'flex-start', marginTop: 10 }}
            />
          ) : null}

          {step.alternativeCompletion && onAlternativeComplete ? (
            <Pressable
              onPress={() => {
                hapt.tap();
                onAlternativeComplete();
              }}
              accessibilityRole="button"
              accessibilityLabel={step.alternativeCompletion}
              style={({ pressed }) => [
                s.altRow,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={s.altText} maxFontSizeMultiplier={1.2}>
                {step.alternativeCompletion}
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: T.surfaceRaised,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: T.line,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACE.cardPad,
    paddingVertical: 16,
    gap: 14,
  },
  numWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.terracottaMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontFamily: TYPE.sansSemi,
    fontSize: 12.5,
    letterSpacing: 0.4,
    color: T.terracottaDeep,
  },
  checkOn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontFamily: TYPE.sansSemi,
    fontSize: 16,
    lineHeight: 21,
    color: T.ink,
    flex: 1,
  },
  titleDone: { color: T.inkMuted, textDecorationLine: 'line-through' },
  summary: {
    fontFamily: TYPE.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: T.inkSecondary,
    marginTop: 4,
  },
  expanded: {
    paddingHorizontal: SPACE.cardPad,
    paddingBottom: 18,
    paddingTop: 2,
    gap: 0,
  },
  expandedBody: {
    fontFamily: TYPE.sans,
    fontSize: 14.5,
    lineHeight: 21,
    color: T.inkSecondary,
    marginBottom: 16,
  },
  rationaleEyebrow: {
    fontFamily: TYPE.sansSemi,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: T.inkMuted,
    marginBottom: 6,
  },
  rationale: {
    fontFamily: TYPE.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: T.inkSecondary,
    marginBottom: 14,
  },
  assignedWrap: {
    backgroundColor: T.terracottaMist,
    borderRadius: RADIUS.inset,
    paddingHorizontal: SPACE.insetPad,
    paddingVertical: 12,
    marginBottom: 12,
  },
  assignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productThumb: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: T.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.line,
  },
  productInitial: {
    fontFamily: TYPE.serif,
    fontSize: 18,
    color: T.ink,
  },
  productName: {
    fontFamily: TYPE.sansSemi,
    fontSize: 14,
    color: T.ink,
  },
  productMeta: {
    fontFamily: TYPE.sans,
    fontSize: 12.5,
    color: T.inkMuted,
    marginTop: 2,
  },
  missingInline: {
    backgroundColor: T.neutralSoft,
    borderRadius: RADIUS.inset,
    paddingHorizontal: SPACE.insetPad,
    paddingVertical: 12,
    marginBottom: 12,
  },
  missingText: {
    fontFamily: TYPE.sansMed,
    fontSize: 13.5,
    color: T.inkSecondary,
  },
  calmInline: {
    backgroundColor: T.sageSoft,
    borderRadius: RADIUS.inset,
    paddingHorizontal: SPACE.insetPad,
    paddingVertical: 12,
    marginBottom: 12,
  },
  calmInlineText: {
    fontFamily: TYPE.sansMed,
    fontSize: 13.5,
    color: T.sage,
  },
  actionsRow: {
    marginTop: 4,
  },
  altRow: {
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  altText: {
    fontFamily: TYPE.sansMed,
    fontSize: 13.5,
    color: T.inkMuted,
    textDecorationLine: 'underline',
  },
});

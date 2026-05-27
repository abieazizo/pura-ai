/**
 * StepRow — vertical step list row used by Review and Daily routine.
 *
 * Two visual variants:
 *   • review — full row with availability badge (Owned / Confirm / Find match)
 *   • daily — compact row with completion control and frequency
 *
 * The row never assumes ownership — it reflects the resolved
 * `ProductAvailability` from the store/selector.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  puraRoutineColors as C,
  puraRoutineRadius as R,
  puraRoutineSpace as SP,
  puraRoutineType as T,
} from '@/theme';
import type {
  ProductAvailability,
  RoutineStep,
} from '@/types/routine';
import { ProductThumb } from './ProductThumb';
import { StatusBadge, type StatusBadgeKind } from './primitives';

interface StepRowProps {
  step: RoutineStep;
  index: number;
  availability: ProductAvailability;
  variant: 'review' | 'daily';
  completed?: boolean;
  onPress?: () => void;
  onConfirm?: () => void;
  onFindMatch?: () => void;
  onMarkComplete?: () => void;
  /** Show the connecting timeline rail (daily variant). */
  withTimeline?: boolean;
  isLast?: boolean;
  style?: StyleProp<ViewStyle>;
}

function availabilityToBadge(av: ProductAvailability): StatusBadgeKind | null {
  switch (av) {
    case 'owned':
      return 'owned';
    case 'recommended':
    case 'needs_confirmation':
      return 'confirm';
    case 'missing':
      return 'match';
    case 'skipped':
      return 'skipped';
    case 'not_required':
      return 'optional';
    default:
      return null;
  }
}

function productLine(step: RoutineStep, availability: ProductAvailability): string {
  if (step.product) {
    if (availability === 'missing') return 'Product needed';
    if (availability === 'recommended' || availability === 'needs_confirmation') {
      return step.product.whyMatched ?? `${step.product.brand} ${step.product.name}`;
    }
    return `${step.product.brand} ${step.product.name}`;
  }
  switch (step.type) {
    case 'cleanse':
      return 'Cleanser required';
    case 'treat':
      return 'Treatment required';
    case 'hydrate':
      return 'Moisturizer required';
    case 'protect':
      return 'SPF required';
  }
}

export function StepRow({
  step,
  index,
  availability,
  variant,
  completed,
  onPress,
  onConfirm,
  onFindMatch,
  onMarkComplete,
  withTimeline,
  isLast,
  style,
}: StepRowProps) {
  const badgeKind = availabilityToBadge(availability);
  const product = step.product;

  const handlePress = () => {
    if (variant === 'review') {
      if (availability === 'missing') {
        onFindMatch?.();
      } else if (
        availability === 'recommended' ||
        availability === 'needs_confirmation'
      ) {
        onConfirm?.();
      } else {
        onPress?.();
      }
    } else {
      onPress?.();
    }
  };

  const isPressable =
    variant === 'review' &&
    (availability === 'missing' ||
      availability === 'recommended' ||
      availability === 'needs_confirmation' ||
      !!onPress);

  return (
    <View style={[styles.outer, style]}>
      {withTimeline ? (
        <View style={styles.railColumn}>
          <View
            style={[
              styles.railSegment,
              { backgroundColor: index === 0 ? 'transparent' : C.lineStrong },
            ]}
          />
          <View
            style={[
              styles.railDot,
              completed
                ? { backgroundColor: C.coralStrong, borderColor: C.coralStrong }
                : { backgroundColor: C.surface, borderColor: C.lineStrong },
            ]}
          >
            {completed ? (
              <Text style={styles.railDotCheck}>✓</Text>
            ) : (
              <Text style={styles.railDotNumber}>{index + 1}</Text>
            )}
          </View>
          <View
            style={[
              styles.railSegment,
              { backgroundColor: isLast ? 'transparent' : C.lineStrong },
            ]}
          />
        </View>
      ) : null}

      <Pressable
        accessibilityRole={isPressable ? 'button' : undefined}
        accessibilityLabel={`Step ${index + 1}, ${step.title}, ${productLine(step, availability)}`}
        disabled={!isPressable}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.row,
          pressed && isPressable ? { opacity: 0.85 } : null,
        ]}
      >
        {!withTimeline ? (
          <View style={styles.numberCircle}>
            <Text style={styles.numberText}>{step.order ?? index + 1}</Text>
          </View>
        ) : null}

        <ProductThumb
          product={product}
          fallbackType={step.type}
          size={variant === 'review' ? 48 : 52}
          style={styles.thumb}
        />

        <View style={styles.body}>
          <Text style={[T.stepTitle, { color: completed ? C.muted : C.ink }]} numberOfLines={1}>
            {step.title}
          </Text>
          <Text
            style={[T.productName, { color: C.body, marginTop: 2 }]}
            numberOfLines={1}
          >
            {productLine(step, availability)}
          </Text>
          {variant === 'daily' && step.frequency ? (
            <Text style={[T.meta, { marginTop: 2 }]} numberOfLines={1}>
              {step.frequency}
            </Text>
          ) : null}
        </View>

        {variant === 'review' && badgeKind ? (
          <StatusBadge kind={badgeKind} />
        ) : null}

        {variant === 'daily' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={completed ? 'Step completed' : 'Mark step complete'}
            onPress={(e) => {
              e.stopPropagation?.();
              onMarkComplete?.();
            }}
            hitSlop={10}
            style={[
              styles.completeDot,
              completed
                ? { backgroundColor: C.coralStrong, borderColor: C.coralStrong }
                : { backgroundColor: 'transparent', borderColor: C.lineStrong },
            ]}
          >
            {completed ? <Text style={styles.completeCheck}>✓</Text> : null}
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  railColumn: {
    width: 28,
    alignItems: 'center',
    paddingTop: 0,
  },
  railSegment: {
    flex: 1,
    width: 1.5,
  },
  railDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  railDotNumber: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: C.muted,
  },
  railDotCheck: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: C.white,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  numberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.surfaceSoft,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: C.body,
  },
  thumb: {},
  body: {
    flex: 1,
  },
  completeDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeCheck: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: C.white,
  },
});

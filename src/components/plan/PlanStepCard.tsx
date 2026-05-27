import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Check } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import type { Product } from '@/types';
import { ProductSlot } from './ProductSlot';
import { plan } from './tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type StepBadge =
  | 'Optional today'
  | 'Helpful'
  | 'Priority today'
  | 'Required'
  | 'Use with caution';

export interface PlanStepCardProps {
  /** 1-based step order. */
  stepNumber: number;
  /** Total step count for the slot (e.g. 4 → "Step 2 of 4"). */
  totalSteps: number;
  /** Step title, e.g. "Hydrate" or "SPF protection". */
  title: string;
  /** Priority chip. SPF gets warm "Required" with no loud red. */
  badge: StepBadge;
  /** One-sentence what-to-do. */
  instruction: string;
  /** One-line "why today" rationale, grounded in current state. */
  whyToday: string;
  /** Empty-state noun for the product slot. */
  emptyNoun: string;
  /** Attached product or null. */
  product: Product | null;
  /** Primary action: usually "Add {product}" or "Mark done" when product attached. */
  primaryLabel: string;
  onPrimary: () => void;
  /** Secondary action: "Skip today" / "Find match". Capped at one. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Completion state — drives the tick circle + card fade. */
  completed: boolean;
  onToggleComplete: () => void;
  /** When true, the card uses the warm SPF surface accent. */
  spfAccent?: boolean;
  /** Tap the product slot when filled. */
  onOpenProduct?: () => void;
}

/**
 * Compact, action-first plan step card.
 *
 * Header row:
 *   [tick circle]  STEP X OF Y                         [badge]
 *                  Title (serif)
 *
 * Body:
 *   instruction
 *   ── divider ──
 *   Why today: short rationale
 *   [product slot — empty or filled]
 *
 * Actions:
 *   primary CTA · optional secondary link
 *
 * Completed state: card calms (border softens, opacity 0.7), tick fills,
 * secondary CTA hides.
 */
export function PlanStepCard({
  stepNumber,
  totalSteps,
  title,
  badge,
  instruction,
  whyToday,
  emptyNoun,
  product,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  completed,
  onToggleComplete,
  spfAccent,
  onOpenProduct,
}: PlanStepCardProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(completed ? 0.72 : 1);

  useEffect(() => {
    opacity.value = withTiming(completed ? 0.72 : 1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [completed, opacity]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const onCardPress = () => {
    scale.value = withSpring(0.99, { damping: 18, stiffness: 320 });
    scale.value = withSpring(1, { damping: 18, stiffness: 320 });
    hapt.select();
    onToggleComplete();
  };

  return (
    <Animated.View
      style={[
        styles.card,
        spfAccent && styles.cardSpf,
        completed && styles.cardCompleted,
        cardStyle,
      ]}
    >
      <View style={styles.headerRow}>
        <CheckCircle completed={completed} onPress={onCardPress} />
        <View style={{ flex: 1 }}>
          <Text style={styles.stepKicker} maxFontSizeMultiplier={1.1}>
            {`STEP ${stepNumber} OF ${totalSteps}`}
          </Text>
          <Text
            style={[styles.title, completed && styles.titleCompleted]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
          >
            {title}
          </Text>
        </View>
        <BadgePill kind={badge} />
      </View>

      <Text style={styles.instruction} maxFontSizeMultiplier={1.25}>
        {instruction}
      </Text>

      <View style={styles.divider} />

      <View style={styles.whyRow}>
        <Text style={styles.whyKicker} maxFontSizeMultiplier={1.1}>
          WHY TODAY
        </Text>
        <Text style={styles.whyBody} maxFontSizeMultiplier={1.25}>
          {whyToday}
        </Text>
      </View>

      <View style={styles.productWrap}>
        <ProductSlot
          product={product}
          emptyNoun={emptyNoun}
          onAdd={onPrimary}
          onOpen={onOpenProduct}
        />
      </View>

      {!completed ? (
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => {
              hapt.tap();
              onPrimary();
            }}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
            style={({ pressed }) => [
              styles.primaryCta,
              pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
            ]}
          >
            <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
              {primaryLabel}
            </Text>
          </Pressable>
          {secondaryLabel && onSecondary ? (
            <Pressable
              onPress={() => {
                hapt.select();
                onSecondary();
              }}
              accessibilityRole="button"
              accessibilityLabel={secondaryLabel}
              hitSlop={6}
              style={({ pressed }) => [
                styles.secondaryCta,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text
                style={styles.secondaryCtaLabel}
                maxFontSizeMultiplier={1.15}
              >
                {secondaryLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

function CheckCircle({
  completed,
  onPress,
}: {
  completed: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed }}
      accessibilityLabel={completed ? 'Mark step incomplete' : 'Mark step done'}
      hitSlop={8}
      style={[
        styles.checkCircle,
        completed ? styles.checkCircleOn : styles.checkCircleOff,
      ]}
    >
      {completed ? (
        <Check size={14} color={plan.card} weight="bold" />
      ) : null}
    </AnimatedPressable>
  );
}

function BadgePill({ kind }: { kind: StepBadge }) {
  const map: Record<StepBadge, { bg: string; fg: string }> = {
    'Optional today': { bg: '#F1F5F9', fg: plan.inkMuted },
    Helpful: { bg: plan.softBlue, fg: plan.brand },
    'Priority today': { bg: plan.successSoft, fg: plan.success },
    Required: { bg: plan.warningSoft, fg: plan.warning },
    'Use with caution': { bg: '#FCEAEA', fg: plan.danger },
  };
  const c = map[kind];
  return (
    <View style={[badgeStyles.pill, { backgroundColor: c.bg }]}>
      <Text
        style={[badgeStyles.label, { color: c.fg }]}
        maxFontSizeMultiplier={1.1}
      >
        {kind}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: plan.card,
    borderWidth: 1,
    borderColor: plan.border,
  },
  cardSpf: {
    backgroundColor: plan.spfWarm,
  },
  cardCompleted: {
    borderColor: plan.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: plan.inkMuted,
  },
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: plan.ink,
    marginTop: 2,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: plan.inkSecondary,
  },
  instruction: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: plan.inkSecondary,
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: plan.border,
    marginVertical: 14,
  },
  whyRow: {
    gap: 4,
  },
  whyKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: plan.inkMuted,
  },
  whyBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: plan.inkSecondary,
  },
  productWrap: {
    marginTop: 14,
  },
  actionsRow: {
    marginTop: 14,
    gap: 4,
  },
  primaryCta: {
    height: 44,
    borderRadius: 999,
    backgroundColor: plan.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  secondaryCta: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: plan.inkSecondary,
    textDecorationLine: 'underline',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleOff: {
    borderWidth: 1.5,
    borderColor: plan.border,
    backgroundColor: plan.card,
  },
  checkCircleOn: {
    backgroundColor: plan.success,
    borderWidth: 0,
  },
});

const badgeStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});

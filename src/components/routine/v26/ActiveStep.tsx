import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Body,
  Eyebrow,
  PrimaryAction,
  SecondaryAction,
  StepTitle,
  Supporting,
  Surface,
  useReducedMotion,
} from './primitives';
import { V26, V26_MOTION, V26_RADIUS, V26_SPACE, V26_TYPE } from './tokens';
import { Text } from 'react-native';
import type { OwnedRoutineProduct, RoutineStep } from '@/state/v26/routineSession';

interface ActiveStepProps {
  step: RoutineStep;
  /** "STEP 1 OF 3", "STEP 2 OF 3", "FINAL STEP". */
  stepLabel: string;
  onDone: () => void;
  onSkip?: () => void;
  onChangeProduct?: () => void;
  onAddOwned?: () => void;
  onChooseAnotherProduct?: () => void;
  onCheckMyProducts?: () => void;
}

/**
 * v26 — Single active step view.
 *
 * Renders one step at a time during a guided routine. Completed steps
 * collapse into compact rows higher in the parent list; this card is
 * always the focus. No "Recommended" / "Required" pills.
 */
export function ActiveStep({
  step,
  stepLabel,
  onDone,
  onSkip,
  onChangeProduct,
  onAddOwned,
  onChooseAnotherProduct,
  onCheckMyProducts,
}: ActiveStepProps) {
  const reduced = useReducedMotion();

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.duration(280).delay(80)}
      exiting={reduced ? undefined : FadeOut.duration(160)}
    >
      <Surface tone="surface" hero elevated style={s.card}>
        <Eyebrow>{stepLabel}</Eyebrow>
        <StepTitle style={s.title}>{step.title}</StepTitle>
        <Body style={s.instruction}>{step.instruction}</Body>

        {step.focusTag ? (
          <View style={s.focusTag}>
            <Text style={s.focusTagText} maxFontSizeMultiplier={1.15}>
              {step.focusTag}
            </Text>
          </View>
        ) : null}

        <StepProductBlock
          step={step}
          onChangeProduct={onChangeProduct}
          onAddOwned={onAddOwned}
          onChooseAnotherProduct={onChooseAnotherProduct}
          onCheckMyProducts={onCheckMyProducts}
        />

        {step.guardrail ? (
          <Supporting style={s.guardrail}>{step.guardrail}</Supporting>
        ) : null}

        <PrimaryAction
          label={step.primaryCta ?? 'Done'}
          variant="ink"
          onPress={onDone}
          style={s.primary}
        />
        {onSkip ? (
          <SecondaryAction
            label="Skip"
            tone="muted"
            onPress={onSkip}
            style={s.skip}
          />
        ) : null}
      </Surface>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Product block — owned / missing / conflict
// ---------------------------------------------------------------------------

interface StepProductBlockProps {
  step: RoutineStep;
  onChangeProduct?: () => void;
  onAddOwned?: () => void;
  onChooseAnotherProduct?: () => void;
  onCheckMyProducts?: () => void;
}

function StepProductBlock({
  step,
  onChangeProduct,
  onAddOwned,
  onChooseAnotherProduct,
  onCheckMyProducts,
}: StepProductBlockProps) {
  // Signature step (avoid-actives) renders its own guardrail card.
  if (step.isSignatureStep || step.type === 'avoid-actives') {
    return (
      <View style={s.guardrailCard}>
        <Eyebrow style={s.guardrailEyebrow}>SKIP ON YOUR CHIN TONIGHT</Eyebrow>
        <Body style={s.guardrailLine}>
          {step.guardrail ?? 'Acids, retinoids, and scrubs.'}
        </Body>
        {onCheckMyProducts ? (
          <SecondaryAction
            label="Check one of my products"
            tone="terracotta"
            onPress={onCheckMyProducts}
            style={s.guardrailAction}
          />
        ) : null}
      </View>
    );
  }

  // Conflict — user owns a product that is incompatible tonight.
  if (step.product && step.product.compatibility === 'avoidTonight') {
    return (
      <View style={s.conflict}>
        <Eyebrow style={s.conflictEyebrow}>SKIP THIS PRODUCT TONIGHT</Eyebrow>
        <Body style={s.conflictLine}>
          {step.product.compatibilityReason ??
            'It contains an active ingredient that may irritate your chin area.'}
        </Body>
        {onChooseAnotherProduct ? (
          <SecondaryAction
            label="Choose another product"
            tone="terracotta"
            onPress={onChooseAnotherProduct}
            style={s.conflictAction}
          />
        ) : null}
      </View>
    );
  }

  // Compatible saved product.
  if (step.product) {
    return (
      <View style={s.owned}>
        <Text style={s.ownedEyebrow} maxFontSizeMultiplier={1.15}>
          Using tonight
        </Text>
        <Text style={s.ownedName} maxFontSizeMultiplier={1.2}>
          {step.product.name}
        </Text>
        <Text style={s.ownedReason} maxFontSizeMultiplier={1.2}>
          {step.product.compatibilityReason ?? 'Compatible with tonight’s plan'}
        </Text>
        {onChangeProduct ? (
          <SecondaryAction
            label="Change"
            tone="muted"
            onPress={onChangeProduct}
            style={s.ownedAction}
          />
        ) : null}
      </View>
    );
  }

  // No product — fall back to a generic, owned-first recommendation.
  return (
    <View style={s.missing}>
      <Body style={s.missingBody}>
        {productlessFallback(step)}
      </Body>
      {onAddOwned ? (
        <SecondaryAction
          label="Add one I own"
          tone="terracotta"
          onPress={onAddOwned}
          style={s.missingAction}
        />
      ) : null}
    </View>
  );
}

function productlessFallback(step: RoutineStep): string {
  if (step.type === 'cleanse') {
    return 'Use a gentle, non-exfoliating cleanser.';
  }
  if (step.type === 'moisturize') {
    return 'Use a plain, fragrance-free moisturizer.';
  }
  return 'Use what you already trust on your skin.';
}

// ---------------------------------------------------------------------------
// Compact completed row used by the parent flow
// ---------------------------------------------------------------------------

interface CompactCompletedRowProps {
  index: number;
  total: number;
  title: string;
  detail?: string;
}

export function CompactCompletedRow({
  index,
  total,
  title,
  detail,
}: CompactCompletedRowProps) {
  return (
    <View style={s.compactRow}>
      <View style={s.compactMark}>
        <Text style={s.compactMarkText} maxFontSizeMultiplier={1.1}>
          ✓
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.compactTitle} maxFontSizeMultiplier={1.2}>
          {title}
        </Text>
        {detail ? (
          <Text style={s.compactDetail} maxFontSizeMultiplier={1.2}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Text style={s.compactIndex} maxFontSizeMultiplier={1.1}>
        {index} / {total}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    gap: 0,
  },
  title: {
    marginTop: 12,
  },
  instruction: {
    marginTop: 10,
  },
  guardrail: {
    marginTop: 14,
  },
  primary: {
    marginTop: V26_SPACE.section,
  },
  skip: {
    marginTop: 6,
    alignSelf: 'center',
  },
  focusTag: {
    alignSelf: 'flex-start',
    backgroundColor: V26.clayMist,
    borderRadius: V26_RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 14,
  },
  focusTagText: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 11.5,
    letterSpacing: 0.3,
    color: V26.terracottaText,
  },

  owned: {
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: V26_RADIUS.small,
    backgroundColor: V26.clayMist,
  },
  ownedEyebrow: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: V26.terracottaText,
    textTransform: 'uppercase',
  },
  ownedName: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 16,
    color: V26.ink,
    marginTop: 6,
  },
  ownedReason: {
    fontFamily: V26_TYPE.sans,
    fontSize: 13,
    color: V26.inkMuted,
    marginTop: 4,
  },
  ownedAction: {
    marginTop: 8,
  },

  missing: {
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: V26_RADIUS.small,
    backgroundColor: V26.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: V26.border,
  },
  missingBody: {
    fontFamily: V26_TYPE.sans,
    fontSize: 14.5,
    lineHeight: 20,
    color: V26.inkSecondary,
  },
  missingAction: {
    marginTop: 6,
  },

  conflict: {
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: V26_RADIUS.small,
    backgroundColor: V26.guardrailSurface,
  },
  conflictEyebrow: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: V26.terracottaText,
    textTransform: 'uppercase',
  },
  conflictLine: {
    marginTop: 6,
  },
  conflictAction: {
    marginTop: 8,
  },

  guardrailCard: {
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: V26_RADIUS.small,
    backgroundColor: V26.guardrailSurface,
  },
  guardrailEyebrow: {
    color: V26.terracottaText,
  },
  guardrailLine: {
    marginTop: 6,
  },
  guardrailAction: {
    marginTop: 8,
  },

  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: V26_RADIUS.small,
    backgroundColor: V26.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: V26.border,
  },
  compactMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: V26.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactMarkText: {
    fontFamily: V26_TYPE.sansBold,
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 13,
  },
  compactTitle: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 14.5,
    color: V26.ink,
  },
  compactDetail: {
    fontFamily: V26_TYPE.sans,
    fontSize: 12.5,
    color: V26.inkMuted,
    marginTop: 2,
  },
  compactIndex: {
    fontFamily: V26_TYPE.sansMed,
    fontSize: 12,
    color: V26.inkMuted,
    letterSpacing: 0.4,
  },
});

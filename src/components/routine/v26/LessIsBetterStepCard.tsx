import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Prohibit } from 'phosphor-react-native';
import {
  Body,
  Eyebrow,
  HeroHeadline,
  PrimaryAction,
  Supporting,
  Surface,
} from './primitives';
import { QuietTextButton } from './QuietTextButton';
import {
  ProductCompatibilitySheet,
} from './ProductCompatibilitySheet';
import { V26, V26_RADIUS, V26_SPACE, V26_TYPE } from './tokens';

const AVOID_ITEMS = [
  'Acne spot treatments',
  'Exfoliating acids',
  'Retinoids or scrubs',
];

const DEMO_COMPATIBILITY_CANDIDATES = [
  {
    id: 'paulas-bha',
    brand: 'Paula’s Choice',
    name: '2% BHA Liquid Exfoliant',
    category: 'Treatment · Exfoliating acid',
    okTonight: false,
    reason: 'Contains salicylic acid.',
    advice: 'Save this for a night when your chin is calmer.',
  },
  {
    id: 'the-ordinary-niacinamide',
    brand: 'The Ordinary',
    name: 'Niacinamide 10% + Zinc 1%',
    category: 'Serum · Calming',
    okTonight: true,
    reason: 'No strong treatment ingredients detected in this product.',
  },
  {
    id: 'cerave-cleanser',
    brand: 'CeraVe',
    name: 'Hydrating Facial Cleanser',
    category: 'Cleanser · Gentle',
    okTonight: true,
    reason: 'A barrier-supporting cleanser without exfoliating acids.',
  },
];

interface LessIsBetterStepCardProps {
  onFinish: () => void;
  onSkip?: () => void;
}

/**
 * v26 — Step 3: Tonight, less is better.
 *
 * The signature step. Editorial serif headline, no clutter, a single
 * avoid card with quiet restriction icons, and a non-aggressive
 * product compatibility checker. The closing CTA is the emotional
 * commit — "Finish gently tonight."
 */
export function LessIsBetterStepCard({
  onFinish,
  onSkip,
}: LessIsBetterStepCardProps) {
  const [checkerOpen, setCheckerOpen] = useState(false);
  return (
    <Surface tone="surface" hero elevated style={s.card}>
      <Eyebrow>FINAL STEP</Eyebrow>
      <HeroHeadline style={s.title}>Tonight, less is better.</HeroHeadline>
      <Body style={s.body}>
        Your chin looks mildly active. Adding strong treatment may make it
        feel worse.
      </Body>

      <View style={s.avoidCard}>
        <Eyebrow style={s.avoidEyebrow}>SKIP ON YOUR CHIN TONIGHT</Eyebrow>
        <View style={s.avoidList}>
          {AVOID_ITEMS.map((item) => (
            <View key={item} style={s.avoidRow}>
              <View style={s.avoidGlyph}>
                <Prohibit size={14} color={V26.terracotta} weight="bold" />
              </View>
              <Text style={s.avoidLabel} maxFontSizeMultiplier={1.2}>
                {item}
              </Text>
            </View>
          ))}
        </View>
        <QuietTextButton
          label="Check a product before using it"
          tone="clay"
          onPress={() => setCheckerOpen(true)}
          style={s.avoidAction}
        />
      </View>

      <Supporting style={s.reassurance}>
        You have already done enough tonight.
      </Supporting>

      <PrimaryAction
        label="Finish gently tonight"
        variant="ink"
        onPress={onFinish}
        style={s.primary}
      />
      {onSkip ? (
        <QuietTextButton
          label="Skip step"
          tone="muted"
          withArrow={false}
          onPress={onSkip}
          style={s.skip}
        />
      ) : null}

      <ProductCompatibilitySheet
        visible={checkerOpen}
        onClose={() => setCheckerOpen(false)}
        candidates={DEMO_COMPATIBILITY_CANDIDATES}
      />
    </Surface>
  );
}

const s = StyleSheet.create({
  card: {
    gap: 0,
    paddingVertical: 30,
  },
  title: {
    marginTop: 14,
    fontSize: 30,
    lineHeight: 36,
  },
  body: {
    marginTop: 14,
  },
  avoidCard: {
    marginTop: V26_SPACE.section,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: V26_RADIUS.inset,
    backgroundColor: V26.guardrailSurface,
    gap: 8,
  },
  avoidEyebrow: {
    color: V26.terracottaText,
    marginBottom: 4,
  },
  avoidList: {
    gap: 4,
  },
  avoidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  avoidGlyph: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: V26.surface,
    borderWidth: 1,
    borderColor: V26.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avoidLabel: {
    fontFamily: V26_TYPE.sansMed,
    fontSize: 15,
    color: V26.ink,
    letterSpacing: -0.05,
  },
  avoidAction: {
    marginTop: 8,
  },
  reassurance: {
    marginTop: V26_SPACE.section,
    fontSize: 14.5,
    color: V26.terracottaText,
    fontFamily: V26_TYPE.sansSemi,
    letterSpacing: 0.02,
  },
  primary: {
    marginTop: 18,
  },
  skip: {
    marginTop: 4,
    alignSelf: 'center',
  },
});

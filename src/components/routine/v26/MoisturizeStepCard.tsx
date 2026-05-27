import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Body,
  Eyebrow,
  PrimaryAction,
  StepTitle,
  Supporting,
  Surface,
} from './primitives';
import { OwnedProductPreview } from './OwnedProductPreview';
import { QuietTextButton } from './QuietTextButton';
import { WhyProductSheet } from './WhyProductSheet';
import { V26, V26_SPACE } from './tokens';
import type { OwnedRoutineProduct } from '@/state/v26/routineSession';

interface MoisturizeStepCardProps {
  product: OwnedRoutineProduct;
  productImageUri?: string;
  productBrand?: string;
  onMarkComplete: () => void;
  onSkip: () => void;
  onChangeProduct?: () => void;
}

/**
 * v26 — Step 2: Moisturize.
 *
 * Owned-product hero. Why-this-product sheet for the calm rationale.
 * Skip is the only secondary action, always visible.
 */
export function MoisturizeStepCard({
  product,
  productImageUri,
  productBrand,
  onMarkComplete,
  onSkip,
  onChangeProduct,
}: MoisturizeStepCardProps) {
  const [whyOpen, setWhyOpen] = useState(false);
  return (
    <Surface tone="surface" hero elevated style={s.card}>
      <Eyebrow>STEP 2 OF 3</Eyebrow>
      <StepTitle style={s.title}>Moisturize</StepTitle>
      <Body style={s.body}>Support your skin barrier tonight.</Body>

      <View style={s.product}>
        <OwnedProductPreview
          eyebrow="USING TONIGHT"
          brand={productBrand}
          name={product.name}
          status={
            product.compatibilityReason ?? 'Good for tonight’s gentle plan'
          }
          imageUri={productImageUri}
        />
        <View style={s.productActions}>
          {onChangeProduct ? (
            <QuietTextButton
              label="Change"
              tone="muted"
              withArrow={false}
              onPress={onChangeProduct}
            />
          ) : null}
          <QuietTextButton
            label="Why this product?"
            tone="clay"
            onPress={() => setWhyOpen(true)}
          />
        </View>
      </View>

      <Supporting style={s.guidance}>
        Apply a thin layer. Be gentle around your chin.
      </Supporting>

      <PrimaryAction
        label="Mark moisturizer complete"
        variant="ink"
        onPress={onMarkComplete}
        style={s.primary}
      />
      <QuietTextButton
        label="Skip step"
        tone="muted"
        withArrow={false}
        onPress={onSkip}
        style={s.skip}
      />

      <WhyProductSheet
        visible={whyOpen}
        onClose={() => setWhyOpen(false)}
        onChange={onChangeProduct}
        productName={product.name}
      />
    </Surface>
  );
}

const s = StyleSheet.create({
  card: {
    gap: 0,
  },
  title: {
    marginTop: 12,
  },
  body: {
    marginTop: 10,
  },
  product: {
    marginTop: 18,
    gap: 4,
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
    marginLeft: 4,
  },
  guidance: {
    marginTop: 18,
  },
  primary: {
    marginTop: V26_SPACE.section,
  },
  skip: {
    marginTop: 4,
    alignSelf: 'center',
  },
});

void V26;

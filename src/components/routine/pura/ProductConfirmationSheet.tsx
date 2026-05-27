/**
 * ProductConfirmationSheet — premium bottom sheet for confirming
 * ownership of a recommended product (or routing to Shop / Skip).
 *
 * Shows the catalog match with its real packshot, brand, name, and
 * the matcher's "why" reason. The user has four actions:
 *   • I already own this   — saves explicit ownership
 *   • Choose from my shelf — opens shelf picker (or Shop if empty)
 *   • Find a product in Shop — routes to Shop's matching flow
 *   • Skip this step       — opt out (only when step is optional)
 */

import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  puraRoutineColors as C,
  puraRoutineRadius as R,
  puraRoutineShadows as S,
  puraRoutineSpace as SP,
  puraRoutineType as T,
} from '@/theme';
import type { RoutineStep } from '@/types/routine';
import { Body, EditorialHeading, PuraButton, QuietTextButton } from './primitives';
import { ProductThumb } from './ProductThumb';

interface ProductConfirmationSheetProps {
  visible: boolean;
  step: RoutineStep | null;
  onClose: () => void;
  onConfirmOwn: () => void;
  onPickFromShelf: () => void;
  onFindInShop: () => void;
  onSkip: () => void;
}

export function ProductConfirmationSheet({
  visible,
  step,
  onClose,
  onConfirmOwn,
  onPickFromShelf,
  onFindInShop,
  onSkip,
}: ProductConfirmationSheetProps) {
  const insets = useSafeAreaInsets();
  if (!step) return null;
  const product = step.product;
  const allowSkip = step.optional;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.scrim} />
      </TouchableWithoutFeedback>

      <View
        style={[
          styles.sheet,
          {
            paddingBottom: Math.max(insets.bottom, 18) + 12,
          },
        ]}
      >
        <View style={styles.handle} />
        <Text style={[T.eyebrowMuted, { marginBottom: 6 }]}>
          STEP {step.order}
        </Text>
        <EditorialHeading size="page">Confirm your product</EditorialHeading>
        <Body style={{ marginTop: 8 }}>
          Do you already have a product for this step?
        </Body>

        {product ? (
          <View style={styles.productCard}>
            <ProductThumb product={product} fallbackType={step.type} size={72} />
            <View style={styles.productInfo}>
              <Text style={[T.meta, { color: C.muted, marginBottom: 2 }]}>
                {product.brand.toUpperCase()}
              </Text>
              <Text style={T.stepTitle} numberOfLines={2}>
                {product.name}
              </Text>
              {product.whyMatched ? (
                <Text style={[T.body, { marginTop: 4, color: C.body }]}>
                  {product.whyMatched}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={[styles.productCard, { borderColor: C.line }]}>
            <ProductThumb fallbackType={step.type} size={72} />
            <View style={styles.productInfo}>
              <Text style={T.stepTitle}>No match yet</Text>
              <Text style={[T.body, { marginTop: 4 }]}>
                Pura needs a product for this step before you can start.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <PuraButton
            label="I already own this"
            variant="coral"
            size="md"
            onPress={onConfirmOwn}
          />
          <PuraButton
            label="Choose from my shelf"
            variant="soft"
            size="md"
            onPress={onPickFromShelf}
            style={{ marginTop: 10 }}
          />
          <PuraButton
            label="Find a product in Shop"
            variant="soft"
            size="md"
            onPress={onFindInShop}
            style={{ marginTop: 10 }}
          />
          {allowSkip ? (
            <QuietTextButton
              label="Skip this optional step"
              tone="muted"
              onPress={onSkip}
              style={{ marginTop: 10 }}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 22, 18, 0.42)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: SP.gutter,
    paddingTop: 14,
    ...S.hero,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.lineStrong,
    marginBottom: 14,
  },
  productCard: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    backgroundColor: C.surface,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: C.line,
    marginTop: 18,
  },
  productInfo: {
    flex: 1,
  },
  actions: {
    marginTop: 22,
  },
});

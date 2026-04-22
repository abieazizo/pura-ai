import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { DetailHeader } from '@/components/products/DetailHeader';
import { ProductHero } from '@/components/products/ProductHero';
import { BrandAndName } from '@/components/products/BrandAndName';
import { PriceAndRating } from '@/components/products/PriceAndRating';
import { FitTagsRow } from '@/components/products/FitTagsRow';
import { Accordion } from '@/components/products/Accordion';
import { IngredientsPanel } from '@/components/products/IngredientsPanel';
import { DetailsPanel } from '@/components/products/DetailsPanel';
import { PinnedCTA } from '@/components/products/PinnedCTA';
import {
  AddToRoutineSheet,
  routineTargetLabel,
  type AddToRoutineTarget,
} from '@/components/products/AddToRoutineSheet';
import { Toast } from '@/components/contextual/Toast';
import { seedProducts } from '@/data/seed';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { palette } from '@/theme';
import type { ProductTint } from '@/types';

type DetailRoute = RouteProp<
  { ProductDetail: { productId: string; tint?: ProductTint } },
  'ProductDetail'
>;

/**
 * v7.6 Product Detail. Composition is strict per §3.2:
 *   DetailHeader → ScrollView{
 *     ProductHero(tint) → BrandAndName → PriceAndRating → FitTagsRow
 *     → Accordion(description, open) → Accordion(ingredients, open)
 *     → Accordion(howToUse) → Accordion(details) → 140pt spacer
 *   } → PinnedCTA
 */
export function ProductDetailScreen() {
  const route = useRoute<DetailRoute>();
  const { productId } = route.params;
  const tint: ProductTint = route.params.tint ?? 'sand';

  const product = seedProducts.find((p) => p.id === productId);
  const user = useAppStore(
    useShallow((s) => ({
      skinType: s.skinType,
      concerns: s.concerns,
      sensitivity: s.sensitivity,
    }))
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!product) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <DetailHeader productId={productId} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Product not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleAdded = (target: AddToRoutineTarget) => {
    setToastMsg(`Added to ${routineTargetLabel(target)}.`);
  };

  const handleWhereToBuy = () => {
    // eslint-disable-next-line no-console
    console.log('[product] TODO: purchasing links coming soon');
    setToastMsg('Purchasing links coming soon.');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <DetailHeader productId={product.id} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ProductHero tint={tint} imageUrl={product.imageUrl ?? product.imageUri} />
        <BrandAndName brand={product.brand} name={product.name} />
        <PriceAndRating
          price={product.price}
          rating={product.rating}
          reviewCount={product.reviewCount}
        />
        <FitTagsRow product={product} user={user} />

        <Accordion id="description" title="Description" defaultOpen>
          <Text style={styles.bodyCopy} maxFontSizeMultiplier={1.2}>
            {product.description || 'No description available.'}
          </Text>
        </Accordion>

        <Accordion id="ingredients" title="Ingredients" defaultOpen>
          <IngredientsPanel product={product} user={user} />
        </Accordion>

        <Accordion id="howToUse" title="How to Use">
          {product.howToUse ? (
            <Text style={styles.bodyCopy} maxFontSizeMultiplier={1.2}>
              {product.howToUse}
            </Text>
          ) : null}
        </Accordion>

        <Accordion id="details" title="Details">
          <DetailsPanel product={product} />
        </Accordion>

        <View style={{ height: 140 }} />
      </ScrollView>

      <PinnedCTA
        onAddToRoutine={() => setSheetOpen(true)}
        onWhereToBuy={handleWhereToBuy}
      />

      <AddToRoutineSheet
        visible={sheetOpen}
        productId={product.id}
        productName={product.name}
        onDismiss={() => setSheetOpen(false)}
        onAdded={handleAdded}
      />

      {toastMsg ? (
        <Toast message={toastMsg} onFinished={() => setToastMsg(null)} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  scroll: { paddingBottom: 60 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    color: 'rgba(26,22,20,0.6)',
  },
  bodyCopy: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 16,
    lineHeight: 23,
    color: 'rgba(26,22,20,0.85)',
  },
});

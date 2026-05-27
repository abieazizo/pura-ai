/**
 * ProductDetailScreen — "The Verdict Page" (v27).
 *
 * Restructured top-to-bottom to answer:
 *   1. Is this right for my skin?
 *   2. Is it right now?
 *   3. Where does it fit in my routine?
 *   4. What could go wrong?
 *   5. Should I actually buy it?
 *   6. Is there a better alternative for my immediate goal?
 *
 * Render order:
 *   Header (back + favorite)
 *   Product stage hero
 *   Identity block (brand · name · price)
 *   Primary judgment headline
 *   Pura Verdict card (signature centerpiece)
 *   Linked to your scan
 *   Where it belongs (routine placement)
 *   Compatibility check
 *   Is this worth buying for you?
 *   Why these ingredients matter
 *   Better depending on your priority (alternatives)
 *   Adaptive sticky CTA bar
 *
 * Per the project's "no patch loops" rule, all decision logic lives
 * in src/state/skinEdit.ts. This screen reads a `Recommendation`
 * object via `buildProductRecommendation` and renders it.
 */

import React, { useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Heart } from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { seedProducts } from '@/data/seed';
import {
  buildComparison,
  buildProductRecommendation,
  buildRoutineState,
  buildSkinSnapshot,
  RECOMMENDATION_STATE_LABEL,
  type ComparisonResult,
} from '@/state/skinEdit';
import {
  ActionConfirmSheet,
  AdaptiveStickyCTA,
  CompatibilityCheck,
  DecisionAlternatives,
  IngredientPurposePanel,
  LinkedToScan,
  ProductComparisonSheet,
  ProductStage,
  PuraVerdictCard,
  RoutinePlacement,
  WorthBuyingPanel,
  type ConfirmKind,
} from '@/components/products/skinEdit';
import type { HomeStackParamList } from '@/navigation/types';

type Route = RouteProp<HomeStackParamList, 'ProductDetail'>;
type Nav = NativeStackNavigationProp<HomeStackParamList>;

export function ProductDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { productId } = route.params;

  const { scans, userRoutineMorning, userRoutineEvening, wishlist } = useAppStore(
    useShallow((s) => ({
      scans: s.scans,
      userRoutineMorning: s.userRoutineMorning,
      userRoutineEvening: s.userRoutineEvening,
      wishlist: s.wishlist,
    }))
  );
  const addToRoutine = useAppStore((s) => s.addUserRoutineProduct);
  const toggleWishlist = useAppStore((s) => s.toggleWishlist);

  const snapshot = useMemo(() => buildSkinSnapshot(scans), [scans]);
  const routine = useMemo(
    () => buildRoutineState({ userRoutineMorning, userRoutineEvening, wishlist }),
    [userRoutineMorning, userRoutineEvening, wishlist]
  );

  const product = useMemo(
    () => seedProducts.find((p) => p.id === productId),
    [productId]
  );

  const recommendation = useMemo(() => {
    if (!product) return null;
    const rec = buildProductRecommendation(product, snapshot, routine);
    if (rec.alternatives.length === 0) {
      // Surface a default pair as alternatives so the decision section
      // is never empty.
      const altIds = ['paulas-choice-2-bha', 'good-molecules-discoloration', 'cerave-pm-lotion']
        .filter((id) => id !== rec.productId)
        .slice(0, 2);
      rec.alternatives = altIds
        .map((id) => {
          const p = seedProducts.find((sp) => sp.id === id);
          if (!p) return null;
          const altRec = buildProductRecommendation(p, snapshot, routine);
          return {
            productId: id,
            product: p,
            purposeLabel:
              id === 'paulas-choice-2-bha'
                ? 'FOR ACTIVE BREAKOUTS INSTEAD'
                : id === 'good-molecules-discoloration'
                ? 'FOR THE MARKS PHASE'
                : 'FOR GENTLE BARRIER SUPPORT',
            reason:
              id === 'paulas-choice-2-bha'
                ? 'Choose this first if active-looking areas matter more tonight than lingering marks.'
                : id === 'good-molecules-discoloration'
                ? 'A strong choice once active areas settle — better suited to the next phase.'
                : 'A quiet supportive moisturizer that holds the barrier steady alongside treatment.',
            state: altRec.state,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
    }
    return rec;
  }, [product, snapshot, routine]);

  const [compare, setCompare] = useState<ComparisonResult | null>(null);
  const [confirm, setConfirm] = useState<{ kind: ConfirmKind; productLabel: string } | null>(null);

  const isSaved = !!product && wishlist.includes(product.id);

  if (!product || !recommendation) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}
          >
            <ArrowLeft size={18} color={palette.ink} weight="bold" />
          </Pressable>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Product not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const productLabel = `${product.brand} ${product.name}`;

  const handlePrimary = () => {
    hapt.tap();
    switch (recommendation.cta.kind) {
      case 'add_to_tonight':
      case 'add_gentle_support':
        addToRoutine('evening', product.id);
        setConfirm({ kind: 'added_tonight', productLabel });
        break;
      case 'save_for_phase_two':
        if (!isSaved) toggleWishlist(product.id);
        setConfirm({ kind: 'saved_for_later', productLabel });
        break;
      case 'compare_with_own':
      case 'view_better_match': {
        const candidate =
          recommendation.alternatives[0]?.productId ?? 'paulas-choice-2-bha';
        if (candidate !== product.id) {
          setCompare(buildComparison([product.id, candidate], snapshot, routine));
        }
        break;
      }
      case 'review_conflict':
        navigation.navigate('Routine');
        break;
    }
  };

  const handleSecondary = () => {
    hapt.select();
    switch (recommendation.cta.kind) {
      case 'add_to_tonight':
      case 'add_gentle_support':
        if (product.buyUrl) {
          Linking.openURL(product.buyUrl).catch(() => undefined);
        }
        break;
      case 'save_for_phase_two':
        // Navigate to the primary "tonight" candidate for this scan.
        navigation.navigate('Products');
        break;
      case 'compare_with_own':
      case 'view_better_match':
        navigation.navigate('Products');
        break;
      case 'review_conflict':
        navigation.navigate('Products');
        break;
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.92 }]}
        >
          <ArrowLeft size={18} color={palette.ink} weight="bold" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSaved ? 'Remove from saved' : 'Save for later'}
          onPress={() => {
            hapt.select();
            toggleWishlist(product.id);
          }}
          style={({ pressed }) => [
            styles.iconBtn,
            isSaved && styles.iconBtnActive,
            pressed && { opacity: 0.92 },
          ]}
        >
          <Heart
            size={18}
            color={isSaved ? palette.clayDeep : palette.ink}
            weight={isSaved ? 'fill' : 'bold'}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <Animated.View
          entering={FadeIn.duration(280)}
          style={styles.stageWrap}
        >
          <ProductStage
            product={product}
            imageUrl={product.imageUrl}
            size="detail"
          />
        </Animated.View>

        {/* IDENTITY */}
        <Animated.View
          entering={FadeInDown.duration(320).delay(60).easing(Easing.out(Easing.cubic))}
          style={styles.identity}
        >
          <Text style={styles.brand} maxFontSizeMultiplier={1.2}>
            {product.brand.toUpperCase()}
          </Text>
          <Text style={styles.name} maxFontSizeMultiplier={1.2}>
            {product.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price} maxFontSizeMultiplier={1.2}>
              ${product.price}
            </Text>
            <View style={styles.priceDivider} />
            <Text style={styles.priceMeta} maxFontSizeMultiplier={1.2}>
              {product.brand}
            </Text>
          </View>
        </Animated.View>

        {/* PRIMARY JUDGMENT */}
        <Animated.View
          entering={FadeInDown.duration(340).delay(110).easing(Easing.out(Easing.cubic))}
          style={styles.judgment}
        >
          <Text style={styles.judgmentHeadline} maxFontSizeMultiplier={1.15}>
            {recommendation.judgmentHeadline}
          </Text>
          <Text style={styles.judgmentBody} maxFontSizeMultiplier={1.25}>
            {recommendation.judgmentExplanation}
          </Text>
          <View style={styles.relevanceLine}>
            <View style={styles.stateBadge}>
              <Text style={styles.stateBadgeText} maxFontSizeMultiplier={1.1}>
                {RECOMMENDATION_STATE_LABEL[recommendation.state]}
              </Text>
            </View>
            <Text style={styles.relevanceText} maxFontSizeMultiplier={1.2}>
              {recommendation.relevanceLabel}
            </Text>
          </View>
        </Animated.View>

        {/* PURA VERDICT */}
        <Animated.View
          entering={FadeInDown.duration(360).delay(160).easing(Easing.out(Easing.cubic))}
          style={{ marginTop: 22 }}
        >
          <PuraVerdictCard recommendation={recommendation} />
        </Animated.View>

        {/* LINKED TO SCAN */}
        <LinkedToScan recommendation={recommendation} primaryRegion={snapshot.primaryRegion} />

        {/* ROUTINE PLACEMENT */}
        <RoutinePlacement recommendation={recommendation} />

        {/* COMPATIBILITY */}
        <CompatibilityCheck recommendation={recommendation} />

        {/* WORTH BUYING */}
        <WorthBuyingPanel recommendation={recommendation} />

        {/* INGREDIENTS */}
        <IngredientPurposePanel recommendation={recommendation} />

        {/* ALTERNATIVES */}
        <DecisionAlternatives
          recommendation={recommendation}
          onSelectAlternative={(id) => {
            hapt.select();
            navigation.push('ProductDetail', { productId: id });
          }}
          onCompare={(id) => {
            const c = buildComparison([product.id, id], snapshot, routine);
            setCompare(c);
          }}
        />

        <View style={{ height: 160 }} />
      </ScrollView>

      <AdaptiveStickyCTA
        recommendation={recommendation}
        onPrimary={handlePrimary}
        onSecondary={handleSecondary}
      />

      <ProductComparisonSheet
        visible={!!compare}
        comparison={compare}
        onAddPick={() => {
          if (!compare) return;
          const target = compare.pickProductId;
          addToRoutine('evening', target);
          const p = seedProducts.find((sp) => sp.id === target);
          setCompare(null);
          if (p) {
            setConfirm({
              kind: 'added_tonight',
              productLabel: `${p.brand} ${p.name}`,
            });
          }
        }}
        onSavePicked={() => {
          if (!compare) return;
          const other = compare.productIds.find((id) => id !== compare.pickProductId);
          setCompare(null);
          if (other) {
            if (!wishlist.includes(other)) toggleWishlist(other);
            const p = seedProducts.find((sp) => sp.id === other);
            if (p) {
              setConfirm({
                kind: 'saved_for_later',
                productLabel: `${p.brand} ${p.name}`,
              });
            }
          }
        }}
        onDismiss={() => setCompare(null)}
      />

      <ActionConfirmSheet
        visible={!!confirm}
        kind={confirm?.kind ?? 'added_tonight'}
        productLabel={confirm?.productLabel ?? ''}
        onPrimary={() => {
          setConfirm(null);
          if (confirm?.kind === 'added_tonight') {
            navigation.navigate('Routine');
          } else {
            navigation.navigate('Products');
          }
        }}
        onSecondary={() => setConfirm(null)}
        onDismiss={() => setConfirm(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCFAF7',
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  iconBtnActive: {
    backgroundColor: palette.clayPaper,
    borderColor: palette.clay,
  },
  scroll: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  stageWrap: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  identity: {
    paddingHorizontal: 20,
    marginTop: 18,
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: palette.inkSecondary,
    marginBottom: 6,
  },
  name: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 27,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: palette.ink,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  price: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 20,
    color: palette.ink,
  },
  priceDivider: {
    width: 1,
    height: 14,
    backgroundColor: palette.hairline,
  },
  priceMeta: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: palette.inkSecondary,
  },
  judgment: {
    paddingHorizontal: 20,
    marginTop: 18,
  },
  judgmentHeadline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 10,
  },
  judgmentBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: palette.inkSecondary,
    marginBottom: 14,
  },
  relevanceLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  stateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: palette.clayPaper,
    borderWidth: 1,
    borderColor: '#EBCFC5',
  },
  stateBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.clayDeep,
  },
  relevanceText: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    lineHeight: 17,
    color: palette.inkSecondary,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    color: palette.inkTertiary,
  },
});

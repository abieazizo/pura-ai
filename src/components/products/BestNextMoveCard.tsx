/**
 * BestNextMoveCard — the hero recommendation block on Products.
 *
 * Reads the canonical `insight.bestMove` (the same payload Routine
 * + Progress consume) and renders it as a single, decision-rich card:
 *
 *   • "YOUR BEST NEXT MOVE" kicker
 *   • Action headline (e.g. "Add hydration tonight")
 *   • Why this matters — short, grounded sentence
 *   • Resolved product preview when available (image + brand + name +
 *     PuraMatchBadge)
 *   • Primary CTA: Add to routine / View matched picks
 *   • Secondary CTA: View details / Browse all
 *
 * When `bestMove === null` (no scan or low confidence) renders nothing
 * — the parent must gate.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ArrowRight,
  CheckCircle,
  Sparkle,
} from 'phosphor-react-native';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import { ProductPlaceholderImage } from '@/components/products/ProductPlaceholderImage';
import { PuraMatchBadge, deriveMatchScore } from '@/components/products/PuraMatchBadge';
import type { InsightBestMove } from '@/state/progressRoutineInsight';
import type { Product, ProductCategory, ProductTint } from '@/types';

interface Props {
  bestMove: InsightBestMove;
  /** Optional resolved product (from liveProductsById or seed). */
  product: Product | null;
  onAddToRoutine: (product: Product, slot: 'morning' | 'evening') => void;
  onViewDetails: (product: Product) => void;
  /** Fallback when no product is resolved. */
  onBrowseMatches: () => void;
}

export function BestNextMoveCard({
  bestMove,
  product,
  onAddToRoutine,
  onViewDetails,
  onBrowseMatches,
}: Props) {
  const [added, setAdded] = useState(false);

  // Skin context for deriving the match score when product is present
  const userConcerns = useAppStore((s) => s.concerns);
  const skinType = useAppStore((s) => s.skinType);

  const onPrimary = () => {
    hapt.tap();
    if (product) {
      const slot = bestMove.slot === 'saved' ? 'evening' : bestMove.slot;
      onAddToRoutine(product, slot);
      setAdded(true);
      setTimeout(() => setAdded(false), 2400);
      return;
    }
    onBrowseMatches();
  };

  const onSecondary = () => {
    hapt.select();
    if (product) {
      onViewDetails(product);
      return;
    }
    onBrowseMatches();
  };

  const matchScore = product
    ? deriveMatchScore({
        candidateConcerns: product.tags ?? [],
        engineScore: typeof product.matchScore === 'number' ? product.matchScore : null,
        userConcerns,
        skinType,
      })
    : null;

  const slotLabel = bestMove.slot === 'morning' ? 'AM routine' : 'PM routine';

  return (
    <View style={styles.card}>
      <View style={styles.rail} pointerEvents="none" />

      <View style={styles.kickerRow}>
        <Sparkle size={11} color={palette.clayDeep} weight="fill" />
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          YOUR BEST NEXT MOVE
        </Text>
      </View>

      <Text
        style={styles.title}
        maxFontSizeMultiplier={1.15}
        numberOfLines={2}
      >
        {bestMove.title}
      </Text>

      <Text
        style={styles.body}
        maxFontSizeMultiplier={1.2}
        numberOfLines={3}
      >
        {bestMove.body}
      </Text>

      {product ? (
        <Pressable
          onPress={() => {
            hapt.select();
            onViewDetails(product);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${product.brand} ${product.name}, ${matchScore} percent match, open details`}
          style={({ pressed }) => [
            styles.productRow,
            pressed && { opacity: 0.96 },
          ]}
        >
          <View style={styles.productThumb}>
            <ProductPlaceholderImage
              product={product}
              silhouetteSize={54}
              showBrandWord={false}
              showMockupBadge={false}
            />
          </View>
          <View style={styles.productMeta}>
            <Text
              style={styles.brand}
              maxFontSizeMultiplier={1.1}
              numberOfLines={1}
            >
              {product.brand.toUpperCase()}
            </Text>
            <Text
              style={styles.name}
              maxFontSizeMultiplier={1.15}
              numberOfLines={2}
            >
              {product.name}
            </Text>
            <View style={styles.metaRow}>
              <PuraMatchBadge score={matchScore} size="sm" />
              <Text style={styles.slot} maxFontSizeMultiplier={1.1}>
                {slotLabel}
              </Text>
            </View>
          </View>
        </Pressable>
      ) : (
        <View style={styles.curatedRow}>
          <PuraMatchBadge score={null} size="sm" label="Curated picks" />
          <Text style={styles.curatedHint} maxFontSizeMultiplier={1.2}>
            Tap below to see Pura's top matches for this move.
          </Text>
        </View>
      )}

      <View style={styles.ctaRow}>
        <Pressable
          onPress={onPrimary}
          accessibilityRole="button"
          accessibilityLabel={
            added
              ? 'Added to routine'
              : product
              ? `Add to ${slotLabel}`
              : bestMove.ctaLabel
          }
          style={({ pressed }) => [
            styles.primaryCta,
            added && styles.primaryCtaAdded,
            pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
          ]}
        >
          {added ? (
            <>
              <CheckCircle size={14} color={palette.inkInverse} weight="fill" />
              <Text style={styles.primaryCtaText} maxFontSizeMultiplier={1.15}>
                {`Added to ${slotLabel}`}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.primaryCtaText} maxFontSizeMultiplier={1.15}>
                {product ? `Add to ${slotLabel}` : bestMove.ctaLabel}
              </Text>
              <ArrowRight size={14} color={palette.inkInverse} weight="bold" />
            </>
          )}
        </Pressable>
        <Pressable
          onPress={onSecondary}
          accessibilityRole="button"
          accessibilityLabel={
            product ? 'View product details' : 'Browse all matches'
          }
          style={({ pressed }) => [
            styles.secondaryCta,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.secondaryCtaText} maxFontSizeMultiplier={1.15}>
            {product ? 'View details' : 'Browse all'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    marginHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.clayLight,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: palette.clay,
    shadowOpacity: 0.10,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  rail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
    backgroundColor: palette.clay,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 6,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    marginBottom: 14,
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: palette.clayPaper,
    borderWidth: 1,
    borderColor: palette.clayLight,
    marginBottom: 14,
    alignItems: 'center',
  },
  productThumb: {
    width: 64,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: palette.bg,
  },
  productMeta: {
    flex: 1,
    paddingRight: 4,
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    marginBottom: 4,
  },
  name: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: palette.ink,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  slot: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.4,
    color: palette.inkSecondary,
  },
  curatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  curatedHint: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    color: palette.inkSecondary,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: palette.ink,
  },
  primaryCtaAdded: {
    backgroundColor: palette.mossDeep,
  },
  primaryCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
  secondaryCta: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  secondaryCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkSecondary,
  },
});

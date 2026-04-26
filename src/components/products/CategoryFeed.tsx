import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { ArrowRight, Drop } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import type { Product, ProductTint } from '@/types';
import {
  getBestForYou,
  getGoalBreakouts,
  getGoalDarkMarks,
  getGoalHydration,
  getGoalSensitive,
  getGoalTexture,
  getNatural,
} from '@/store/productSelectors';
import { type GoalKey } from './CategoryRail';
import type { ProductMatch } from '@/ai/ai-contracts';

export interface CategoryFeedProps {
  goal: GoalKey;
}

/**
 * v10.9 — unified product feed below the CategoryRail. Replaces the four
 * stacked horizontal ProductRows (best-overall / natural / new /
 * essentials) with a single 2-column grid whose contents update as the
 * user selects a category above.
 *
 * For `best-for-you` on a pre-scan user, the feed shows a premium
 * "locked" empty state promoting the scan. Every other goal is always
 * populated from `seedProducts` via the goal-specific selectors.
 *
 * Card treatment matches the v10.4 Home PICKED-FOR-YOU card: tinted
 * image tile with a moss match badge overlaid, brand kicker, serif
 * name, price. Compact enough for a 2-col grid; premium enough to feel
 * merchandised.
 */
export function CategoryFeed({ goal }: CategoryFeedProps) {
  const nav = useNavigation<any>();
  const { hasScanned, aiTopMatches } = useAppStore(
    useShallow((s) => ({
      hasScanned: s.scans.length > 0,
      aiTopMatches: s.aiTopMatches,
    }))
  );

  const products = useMemo(() => pickForGoal(goal), [goal]);
  const meta = GOAL_LABELS[goal];

  // v10.23 — build a quick id -> AI match lookup so each grid card
  // can show the AI-derived match score instead of the seeded one.
  // When the AI hasn't run yet, the badge falls back to a label-only
  // "MATCH" pill (no fake number).
  const aiMatchById = useMemo<Map<string, ProductMatch>>(() => {
    const m = new Map<string, ProductMatch>();
    for (const match of aiTopMatches) m.set(match.product_id, match);
    return m;
  }, [aiTopMatches]);

  if (goal === 'best-for-you' && !hasScanned) {
    return <BestForYouLocked onScan={() => nav.navigate('ScanModal')} />;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          {meta.kicker}
        </Text>
        <Text style={styles.count} maxFontSizeMultiplier={1.1}>
          {`${products.length} picks`}
        </Text>
      </View>

      <View style={styles.grid}>
        {products.map((p) => (
          <GridCard
            key={p.id}
            product={p}
            aiMatch={aiMatchById.get(p.id) ?? null}
            onPress={() => {
              hapt.select();
              nav.navigate('ProductDetail', { productId: p.id, tint: p.tint });
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Goal → products + header copy
// ---------------------------------------------------------------------------

const GOAL_LABELS: Record<GoalKey, { kicker: string }> = {
  'best-for-you': { kicker: 'MATCHED TO YOUR SKIN' },
  breakouts: { kicker: 'TARGETED FOR BREAKOUTS' },
  hydration: { kicker: 'FOR HYDRATION' },
  texture: { kicker: 'FOR SMOOTHER TEXTURE' },
  'dark-marks': { kicker: 'FOR DARK MARKS' },
  sensitive: { kicker: 'GENTLE FOR SENSITIVE SKIN' },
  natural: { kicker: 'NATURAL & CLEAN' },
};

function pickForGoal(goal: GoalKey): Product[] {
  switch (goal) {
    case 'best-for-you':
      return getBestForYou();
    case 'breakouts':
      return getGoalBreakouts();
    case 'hydration':
      return getGoalHydration();
    case 'texture':
      return getGoalTexture();
    case 'dark-marks':
      return getGoalDarkMarks();
    case 'sensitive':
      return getGoalSensitive();
    case 'natural':
      return getNatural();
  }
}

// ---------------------------------------------------------------------------
// Grid card
// ---------------------------------------------------------------------------

function GridCard({
  product,
  aiMatch,
  onPress,
}: {
  product: Product;
  aiMatch: ProductMatch | null;
  onPress: () => void;
}) {
  // v10.23 — match badge sourcing rule:
  //   • aiMatch present → show the AI score + "MATCH" label.
  //   • aiMatch absent → show "MATCH" label only, no number. The
  //     seeded matchScore is no longer surfaced as if the AI had
  //     ranked it; doing so was a fake-AI gap the production
  //     hardening pass closed.
  const showAiNumber = aiMatch !== null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        showAiNumber
          ? `${product.brand} ${product.name}, ${aiMatch!.match_score}% AI match`
          : `${product.brand} ${product.name}`
      }
      style={({ pressed }) => [
        styles.card,
        pressed && { opacity: 0.94 },
      ]}
    >
      <View
        style={[
          styles.imageTile,
          { backgroundColor: tintFor(product) },
        ]}
      >
        {product.imageUri ? (
          <Image
            source={{ uri: product.imageUri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        ) : (
          <Drop size={36} color={palette.ink} weight="duotone" />
        )}
        <View style={styles.matchBadge}>
          {showAiNumber ? (
            <Text style={styles.matchBadgeNum} maxFontSizeMultiplier={1.1}>
              {`${aiMatch!.match_score}%`}
            </Text>
          ) : null}
          <Text style={styles.matchBadgeLabel} maxFontSizeMultiplier={1.1}>
            MATCH
          </Text>
        </View>
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardBrand} numberOfLines={1} maxFontSizeMultiplier={1.1}>
          {product.brand.toUpperCase()}
        </Text>
        <Text
          style={styles.cardName}
          numberOfLines={2}
          maxFontSizeMultiplier={1.1}
        >
          {product.name}
        </Text>
        <Text style={styles.cardPrice} maxFontSizeMultiplier={1.1}>
          {`$${Number.isInteger(product.price) ? product.price : product.price.toFixed(2)}`}
        </Text>
      </View>
    </Pressable>
  );
}

function tintFor(p: Product): string {
  const tint: ProductTint = p.tint ?? 'sand';
  switch (tint) {
    case 'clay':
      return palette.clayPaper;
    case 'sand':
      return palette.sandPaper;
    case 'moss':
      return palette.mossLight;
    default:
      return palette.bgDeep;
  }
}

// ---------------------------------------------------------------------------
// Pre-scan locked state (only for best-for-you)
// ---------------------------------------------------------------------------

function BestForYouLocked({ onScan }: { onScan: () => void }) {
  return (
    <View style={lockedStyles.wrap}>
      <Text style={lockedStyles.kicker} maxFontSizeMultiplier={1.1}>
        MATCHED TO YOUR SKIN
      </Text>
      <Text
        style={lockedStyles.headline}
        maxFontSizeMultiplier={1.15}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.9}
      >
        Scan your face to unlock your best matches.
      </Text>
      <Text style={lockedStyles.body} maxFontSizeMultiplier={1.2}>
        One thirty-second scan, and this feed fills with products picked from everything we have.
      </Text>
      <Pressable
        onPress={() => {
          hapt.tap();
          onScan();
        }}
        accessibilityRole="button"
        accessibilityLabel="Take your first scan"
        style={({ pressed }) => [
          lockedStyles.cta,
          pressed && { opacity: 0.94, transform: [{ scale: 0.985 }] },
        ]}
      >
        <Text style={lockedStyles.ctaLabel} maxFontSizeMultiplier={1.15}>
          Take a scan
        </Text>
        <ArrowRight size={15} color={palette.inkInverse} weight="duotone" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 22,
    marginHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  count: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: palette.inkTertiary,
    fontVariant: ['tabular-nums'],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  card: {
    flexGrow: 1,
    flexBasis: '46%',
    maxWidth: '48%',
  },
  imageTile: {
    width: '100%',
    aspectRatio: 0.82,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: palette.moss,
    alignItems: 'center',
    minWidth: 46,
  },
  matchBadgeNum: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    lineHeight: 13,
    color: palette.inkInverse,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.1,
  },
  matchBadgeLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 7,
    letterSpacing: 1.1,
    color: 'rgba(248,250,252,0.78)',
  },
  cardText: {
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  cardBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.inkTertiary,
    marginBottom: 3,
  },
  cardName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: -0.2,
    color: palette.ink,
    marginBottom: 6,
    minHeight: 36,
  },
  cardPrice: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 15,
    letterSpacing: -0.2,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
});

const lockedStyles = StyleSheet.create({
  wrap: {
    marginTop: 22,
    marginHorizontal: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    alignItems: 'flex-start',
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clay,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 10,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    marginBottom: 18,
  },
  cta: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: 0.1,
    color: palette.inkInverse,
  },
});

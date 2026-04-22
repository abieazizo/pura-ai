import React, { useMemo, useState } from 'react';
import {
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ArrowRight, CaretDown, Plus } from 'phosphor-react-native';
import { useAppStore } from '@/store/useAppStore';
import { palette, statusColor } from '@/theme';
import { hapt } from '@/utils/haptics';
import {
  CATEGORY_LABEL,
  buildTonightFocus,
  getConcerns,
} from '@/utils/concerns';
import {
  computeSkinScore,
  formatDelta,
  sinceLastPhrase,
  tierLabel,
} from '@/utils/skinScore';
import { seedProducts } from '@/data/seed';
import type { Concern, ConcernCategory, Product, Severity } from '@/types';

/**
 * PlanScreen — v9.1 "What should I do now?" full page.
 *
 * The intelligence payoff of a scan. Five zones in one scroll:
 *
 *   1. SUMMARY — what the scan found, in one serif sentence
 *   2. TONIGHT — 2-3 imperative actions
 *   3. BEST PRODUCT — the single most-matched item with a short reason
 *   4. ALTERNATIVES — 3 more products, each one line, link to full catalog
 *   5. WHY (optional) — tap to expand, shows the concern rationale
 *
 * This page is reached from:
 *   • Scan result CTA ("What should I do now?")
 *   • Home command-center "Next action" module
 *
 * If no scans exist, we render a pre-scan empty state that promotes the
 * scan — the plan page shouldn't lie about findings it doesn't have.
 */

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function PlanScreen() {
  const nav = useNavigation<any>();
  const scans = useAppStore((s) => s.scans);
  const latest = scans[scans.length - 1];
  const previous = scans.length >= 2 ? scans[scans.length - 2] : undefined;

  const [whyOpen, setWhyOpen] = useState(false);

  const concerns = latest ? getConcerns(latest, previous) : [];
  const tonight = buildTonightFocus(concerns);
  const score = computeSkinScore(scans);

  const primary = concerns.find((c) => c.severity !== 'calm') ?? concerns[0];
  const rec = useMemo(
    () => pickProductForConcern(primary),
    [primary]
  );
  const alternatives = useMemo(
    () => pickAlternatives(primary, rec),
    [primary, rec]
  );

  const goBack = () => {
    hapt.select();
    nav.goBack();
  };

  const openProduct = (p: Product) => {
    hapt.select();
    nav.navigate('ProductDetail', { productId: p.id, tint: p.tint });
  };

  const openProducts = () => {
    hapt.select();
    nav.navigate('Products');
  };

  const toggleWhy = () => {
    hapt.select();
    LayoutAnimation.configureNext({
      duration: 240,
      update: { type: 'easeInEaseOut' },
    });
    setWhyOpen((v) => !v);
  };

  // ---- Empty state (no scans yet) -----------------------------------------
  if (!latest) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar style="dark" />
        <Header onBack={goBack} />
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyKicker}>NO PLAN YET</Text>
          <Text style={styles.emptyHeadline}>
            Start with a scan so I have something to go on.
          </Text>
          <Pressable
            onPress={() => {
              hapt.tap();
              nav.navigate('ScanModal');
            }}
            style={({ pressed }) => [
              styles.primaryCta,
              pressed && { opacity: 0.94, transform: [{ scale: 0.985 }] },
            ]}
          >
            <Text style={styles.primaryCtaLabel}>Take a scan</Text>
            <ArrowRight size={16} color={palette.inkInverse} weight="duotone" />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const headlineText = primary
    ? `${CATEGORY_LABEL[primary.category]} on your ${primary.region}.`
    : 'Your skin is settled today.';

  const secondaryConcern = concerns.find(
    (c) => c.severity !== 'calm' && c.category !== primary?.category
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <Header onBack={goBack} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Skin Score strip ── */}
        <View style={styles.scoreStrip}>
          <View style={styles.scoreStripLeft}>
            <Text style={styles.scoreStripKicker} maxFontSizeMultiplier={1.1}>
              SKIN SCORE
            </Text>
            <View style={styles.scoreStripValueRow}>
              <Text style={styles.scoreStripValue} maxFontSizeMultiplier={1.1}>
                {score.value}
              </Text>
              <Text style={styles.scoreStripTier} maxFontSizeMultiplier={1.1}>
                {tierLabel(score.tier)}
              </Text>
            </View>
          </View>
          {score.deltaSinceLast !== null ? (
            <View style={styles.scoreStripRight}>
              <Text style={styles.scoreStripDelta} maxFontSizeMultiplier={1.1}>
                {formatDelta(score.deltaSinceLast)}
              </Text>
              <Text style={styles.scoreStripSince} maxFontSizeMultiplier={1.1}>
                {sinceLastPhrase(score.latestAt, score.scanCount)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── SUMMARY ── */}
        <View style={styles.section}>
          <Text style={styles.summaryKicker} maxFontSizeMultiplier={1.1}>
            YOUR PLAN
          </Text>
          <Text
            style={styles.summaryHeadline}
            maxFontSizeMultiplier={1.15}
            numberOfLines={3}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {headlineText}
          </Text>
          {secondaryConcern ? (
            <Text style={styles.summarySecondary} maxFontSizeMultiplier={1.2}>
              Also watching {CATEGORY_LABEL[
                secondaryConcern.category
              ].toLowerCase()} on your {secondaryConcern.region}.
            </Text>
          ) : null}
        </View>

        {/* ── TONIGHT ── */}
        {tonight.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
              TONIGHT
            </Text>
            <View style={styles.tonightSteps}>
              {tonight.slice(0, 3).map((step, i) => (
                <View key={i} style={styles.tonightStep}>
                  <Text
                    style={styles.tonightStepNum}
                    maxFontSizeMultiplier={1.1}
                  >
                    {i + 1}
                  </Text>
                  <Text
                    style={styles.tonightStepText}
                    maxFontSizeMultiplier={1.2}
                    numberOfLines={3}
                  >
                    {compressStep(step)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── BEST PRODUCT ── */}
        {rec ? (
          <View style={styles.section}>
            <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
              BEST FOR THIS
            </Text>
            <Pressable
              onPress={() => openProduct(rec)}
              accessibilityRole="button"
              accessibilityLabel={`${rec.brand} ${rec.name}`}
              style={({ pressed }) => [
                styles.recCard,
                pressed && { opacity: 0.96 },
              ]}
            >
              <View
                style={[
                  styles.recImage,
                  { backgroundColor: tintForProduct(rec) },
                ]}
              >
                {rec.imageUri ? (
                  <Image
                    source={{ uri: rec.imageUri }}
                    style={styles.recImageInner}
                    resizeMode="cover"
                  />
                ) : null}
              </View>
              <View style={styles.recBody}>
                <Text style={styles.recBrand} maxFontSizeMultiplier={1.1}>
                  {rec.brand.toUpperCase()}
                </Text>
                <Text
                  style={styles.recName}
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.15}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {rec.name}
                </Text>
                <Text
                  style={styles.recReason}
                  maxFontSizeMultiplier={1.2}
                  numberOfLines={2}
                >
                  {buildRecReason(primary)}
                </Text>
                <View style={styles.recFoot}>
                  <Text style={styles.recPrice} maxFontSizeMultiplier={1.1}>
                    ${Number.isInteger(rec.price) ? rec.price : rec.price.toFixed(2)}
                  </Text>
                  <View style={styles.recAdd}>
                    <Plus size={13} color={palette.inkInverse} weight="bold" />
                    <Text style={styles.recAddLabel}>Add</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        ) : null}

        {/* ── ALTERNATIVES ── */}
        {alternatives.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.altHead}>
              <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
                ALTERNATIVES
              </Text>
              <Pressable
                onPress={openProducts}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="See all products"
              >
                <Text style={styles.altAllLink} maxFontSizeMultiplier={1.1}>
                  All products →
                </Text>
              </Pressable>
            </View>
            <View style={styles.altList}>
              {alternatives.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => openProduct(p)}
                  style={({ pressed }) => [
                    styles.altRow,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <View
                    style={[
                      styles.altImage,
                      { backgroundColor: tintForProduct(p) },
                    ]}
                  >
                    {p.imageUri ? (
                      <Image
                        source={{ uri: p.imageUri }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                      />
                    ) : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={styles.altBrand}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.1}
                    >
                      {p.brand.toUpperCase()}
                    </Text>
                    <Text
                      style={styles.altName}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.15}
                    >
                      {p.name}
                    </Text>
                  </View>
                  <Text style={styles.altPrice} maxFontSizeMultiplier={1.1}>
                    ${Number.isInteger(p.price) ? p.price : p.price.toFixed(2)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── WHY (collapsed by default) ── */}
        <View style={styles.section}>
          <Pressable
            onPress={toggleWhy}
            accessibilityRole="button"
            accessibilityState={{ expanded: whyOpen }}
            accessibilityLabel="Why these recommendations"
            style={({ pressed }) => [
              styles.whyRow,
              pressed && { opacity: 0.88 },
            ]}
          >
            <Text style={styles.whyLabel} maxFontSizeMultiplier={1.1}>
              Why these?
            </Text>
            <View
              style={[
                styles.whyCaret,
                whyOpen && { transform: [{ rotate: '180deg' }] },
              ]}
            >
              <CaretDown size={13} color={palette.inkTertiary} weight="bold" />
            </View>
          </Pressable>
          {whyOpen ? (
            <View style={styles.whyBody}>
              {concerns.slice(0, 3).map((c) => (
                <View key={c.category} style={styles.whyItem}>
                  <View
                    style={[
                      styles.whyDot,
                      { backgroundColor: colorFor(c.severity) },
                    ]}
                  />
                  <Text
                    style={styles.whyText}
                    maxFontSizeMultiplier={1.2}
                  >
                    <Text style={styles.whyTextStrong}>
                      {CATEGORY_LABEL[c.category]}
                    </Text>
                    {` · ${c.interpretation}`}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// Header
// ============================================================================

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [
          styles.backBtn,
          pressed && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={8}
      >
        <ArrowLeft size={18} weight="duotone" color={palette.ink} />
      </Pressable>
      <View style={{ width: 40 }} />
    </View>
  );
}

// ============================================================================
// Product selection
// ============================================================================

const CATEGORY_TO_PRODUCT_CATEGORY: Record<ConcernCategory, string[]> = {
  breakouts: ['spot', 'serum', 'toner', 'cleanser'],
  hydration: ['moisturizer', 'serum', 'toner'],
  texture: ['serum', 'mask', 'toner'],
  tone: ['serum', 'spf', 'treatment'],
};

function pickProductForConcern(concern: Concern | undefined): Product | null {
  if (!concern) return seedProducts[0] ?? null;
  const preferredCategories = CATEGORY_TO_PRODUCT_CATEGORY[concern.category];
  for (const cat of preferredCategories) {
    const match = seedProducts.find(
      (p) => p.category === cat
    );
    if (match) return match;
  }
  return seedProducts[0] ?? null;
}

function pickAlternatives(
  concern: Concern | undefined,
  primary: Product | null
): Product[] {
  if (!concern || !primary) return seedProducts.slice(0, 3);
  const preferredCategories = CATEGORY_TO_PRODUCT_CATEGORY[concern.category];
  const matches = seedProducts.filter(
    (p) =>
      p.id !== primary.id &&
      preferredCategories.includes(p.category)
  );
  if (matches.length >= 3) return matches.slice(0, 3);
  // Fill with any products
  const fillers = seedProducts.filter(
    (p) => p.id !== primary.id && !matches.includes(p)
  );
  return [...matches, ...fillers].slice(0, 3);
}

function buildRecReason(concern: Concern | undefined): string {
  if (!concern) return 'Matched to your skin profile.';
  switch (concern.category) {
    case 'breakouts':
      return `Targets the breakout on your ${concern.region}.`;
    case 'hydration':
      return `Restores moisture where your ${concern.region} are running dry.`;
    case 'texture':
      return `Smooths the texture showing on your ${concern.region}.`;
    case 'tone':
      return `Fades the dark marks on your ${concern.region}.`;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function compressStep(step: string): string {
  const s = step.toLowerCase();
  if (s.includes('calming gel')) return 'Calming gel on chin.';
  if (s.includes('skip actives') || s.includes('pause exfoliants'))
    return 'Skip actives tonight.';
  if (s.includes('humectant') || s.includes('hydrating serum'))
    return 'Layer a hydrating serum.';
  if (s.includes('moisturizer') && s.includes('finish'))
    return 'Finish with moisturizer.';
  if (s.includes('moisturizer')) return 'Add moisturizer.';
  if (s.includes('gentle exfoliant')) return 'Gentle exfoliant tonight.';
  if (s.includes('clay') || s.includes('pha')) return 'Clay or PHA mask.';
  if (s.includes('brightening')) return 'Brightening serum tonight.';
  if (s.includes('spf')) return 'SPF in the morning.';
  if (s.includes('barrier-repair')) return 'Barrier-repair only.';
  const first = step.split(/[.;]/)[0];
  return first.length <= 48 ? `${first}.` : `${first.slice(0, 45)}\u2026`;
}

function tintForProduct(p: Product): string {
  switch (p.tint) {
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

function colorFor(s: Severity): string {
  switch (s) {
    case 'calm':
      return statusColor.calm;
    case 'mild':
      return palette.inkTertiary;
    case 'moderate':
      return statusColor.monitor;
    case 'needs-attention':
      return statusColor.active;
  }
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },

  header: {
    height: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },

  // Score strip — anchors the page in the Skin Score just below the header.
  scoreStrip: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: palette.bgDeep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreStripLeft: {
    flex: 1,
  },
  scoreStripKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  scoreStripValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  scoreStripValue: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.8,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  scoreStripTier: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
    color: palette.inkSecondary,
  },
  scoreStripRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  scoreStripDelta: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    letterSpacing: 0.1,
    color: palette.clay,
    fontVariant: ['tabular-nums'],
  },
  scoreStripSince: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: palette.inkTertiary,
  },

  section: {
    marginTop: 28,
  },
  sectionKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  // SUMMARY
  summaryKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clay,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  summaryHeadline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: palette.ink,
  },
  summarySecondary: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 22,
    color: palette.inkSecondary,
    marginTop: 12,
  },

  // TONIGHT
  tonightSteps: {
    gap: 14,
  },
  tonightStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  tonightStepNum: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    color: palette.clay,
    width: 22,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  tonightStepText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: palette.ink,
    letterSpacing: -0.1,
    paddingTop: 3,
  },

  // REC
  recCard: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 4,
  },
  recImage: {
    width: 110,
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
  },
  recImageInner: {
    width: '100%',
    height: '100%',
  },
  recBody: {
    flex: 1,
  },
  recBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    marginBottom: 4,
  },
  recName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 8,
  },
  recReason: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
    marginBottom: 12,
  },
  recFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recPrice: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  recAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.ink,
  },
  recAddLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },

  // ALTERNATIVES
  altHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  altAllLink: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: palette.clay,
    letterSpacing: 0.2,
  },
  altList: {
    gap: 12,
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  altImage: {
    width: 48,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
  },
  altBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.inkTertiary,
    marginBottom: 2,
  },
  altName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  altPrice: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },

  // WHY
  whyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  whyLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.inkSecondary,
    letterSpacing: 0.1,
  },
  whyCaret: {
    width: 16,
    alignItems: 'center',
  },
  whyBody: {
    paddingTop: 6,
    paddingBottom: 4,
    gap: 12,
  },
  whyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  whyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  whyText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
  },
  whyTextStrong: {
    fontFamily: 'Inter-SemiBold',
    color: palette.ink,
  },

  // Empty
  emptyWrap: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    marginBottom: 12,
  },
  emptyHeadline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: palette.ink,
    textAlign: 'center',
    marginBottom: 32,
  },
  primaryCta: {
    height: 52,
    minWidth: 220,
    paddingHorizontal: 24,
    borderRadius: 26,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.1,
    color: palette.inkInverse,
  },
});

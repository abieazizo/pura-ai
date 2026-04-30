/**
 * ScanResultsFaceScreen — v12.0 redesigned post-scan experience.
 *
 * Replaces the v8.2 "giant photo with a 72 floating on it" layout.
 *
 * Structure (top-to-bottom):
 *
 *   1. Top bar — close (left), nothing else.
 *   2. Top module — small portrait thumbnail (96×96, top-left), with a
 *      separate score module beside it (premium dial + delta caption).
 *      No score overlay on the photo.
 *   3. Main takeaway — one strong serif headline + one short
 *      supporting sentence.
 *   4. Key findings — up to 4 concise rows. Each row carries label,
 *      zone, severity. Tap to expand for the longer interpretation.
 *   5. Image-quality note (only when relevant). One-line, soft.
 *   6. Tonight — 1–4 polished imperative steps from the AI (already
 *      humanized in translateAnalysis::humanizeRoutineString).
 *   7. Recommended for this scan — 1 primary product card +
 *      2–4 alternative cards, sourced from the AI's `aiTopMatches`
 *      ranking against the seed catalog. Real images, real brand
 *      links, real prices.
 *   8. Disclaimer — short, tasteful.
 *
 * The page auto-loads from analyzing — there is no "See your results"
 * step. ScanAnalyzing fires onComplete(scan.id) once both the dial
 * settles and the analysis is ready.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowRight,
  ArrowUpRight,
  CaretDown,
  X,
} from 'phosphor-react-native';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '@/store/useAppStore';
import { palette, statusColor } from '@/theme';
import { hapt } from '@/utils/haptics';
import {
  CATEGORY_LABEL,
  buildTonightFocus,
  getConcerns,
  severityLabel,
} from '@/utils/concerns';
import {
  computeSkinScore,
  formatDelta,
  tierLabel as tierLabelFor,
} from '@/utils/skinScore';
import { SkinScoreDial } from '@/components/SkinScoreDial';
import { AISourceBadge } from '@/components/dev/AISourceBadge';
import { ProductPlaceholderImage } from '@/components/products/ProductPlaceholderImage';
import { FaceSkinMap } from '@/screens/scan/components/FaceSkinMap';
import { localProductImageFor, seedProducts } from '@/data/seed';
import type { RootStackParamList } from '@/navigation/types';
import type {
  Concern,
  ConcernCategory,
  Product,
  Severity,
} from '@/types';
import type {
  FaceScanAnalysis,
  ProductMatch,
} from '@/ai/ai-contracts';

// Android — required for LayoutAnimation when expanding finding rows.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Dev-only loud "DEMO READING" banner. Hidden from consumer flow.
const DEV_BADGE_ENABLED =
  (process.env.EXPO_PUBLIC_PURA_AI_DEV_BADGE ?? '').trim() === '1';

export interface ScanResultsFaceScreenProps {
  scanId: string;
}

export function ScanResultsFaceScreen({ scanId }: ScanResultsFaceScreenProps) {
  const scans = useAppStore((s) => s.scans);
  const aiTopMatches = useAppStore((s) => s.aiTopMatches);
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();

  const scan = scans.find((s) => s.id === scanId) ?? scans[scans.length - 1];
  const previous = scan
    ? scans.filter((s) => s.capturedAt < scan.capturedAt).slice(-1)[0]
    : undefined;

  const concerns = scan ? getConcerns(scan, previous) : [];
  // v12.0 — show only the concerns the AI was confident enough about.
  // calm/mild rows already exist for completeness in `concerns`, but
  // the user-facing list focuses on what's actually noticeable.
  const visibleConcerns = useMemo(() => {
    const noticeable = concerns.filter((c) => c.severity !== 'calm');
    if (noticeable.length > 0) return noticeable.slice(0, 4);
    // Calm photo — show one row so the section isn't empty.
    return concerns.slice(0, 1);
  }, [concerns]);

  const headline = useMemo(() => buildHeadline(concerns, scan?.aiAnalysis), [
    concerns,
    scan?.aiAnalysis,
  ]);
  const support = useMemo(
    () => buildSupportLine(concerns, scan?.aiAnalysis),
    [concerns, scan?.aiAnalysis]
  );

  // v17.1 — `selectedMapCategory` drives which finding the
  // FaceSkinMap renders in isolation. Default `null` lets the
  // FaceSkinMap pick its own primary concern (highest severity).
  // Tapping a chip locks the user's choice. v17.1 ditched the
  // ALL-overlays-at-once view because it was visually noisy and
  // hid the story.
  const [selectedMapCategory, setSelectedMapCategory] =
    useState<ConcernCategory | null>(null);

  const tonight = useMemo(() => {
    if (!scan) return [] as string[];
    const aiTonight =
      scan.aiAnalysis?.next_focus.tonight.filter(
        (s) => s.trim().length > 0
      ) ?? [];
    if (aiTonight.length > 0) return aiTonight.slice(0, 4);
    // Fallback: use the deterministic tonight focus helper.
    return buildTonightFocus(concerns).slice(0, 4);
  }, [scan, concerns]);

  // v12.0 — recommended products: use the AI ranking when available,
  // otherwise use the deterministic top concern → category seed.
  const recommendations = useMemo(() => {
    return resolveRecommendations({ aiTopMatches, concerns });
  }, [aiTopMatches, concerns]);

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const revealHapticFired = useRef(false);
  const handleRevealComplete = React.useCallback(() => {
    if (revealHapticFired.current) return;
    revealHapticFired.current = true;
    hapt.success();
  }, []);

  if (!scan) return null;

  const score = computeSkinScore(scans);
  const previousScoreValue =
    scans.length >= 2 ? scans[scans.length - 2].overallScore : null;

  const close = () => {
    hapt.select();
    rootNav.goBack();
  };

  const toggleRow = (category: string) => {
    hapt.select();
    LayoutAnimation.configureNext({
      duration: 220,
      update: { type: 'easeInEaseOut' },
    });
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  const openProducts = () => {
    hapt.tap();
    rootNav.goBack();
    setTimeout(() => {
      // @ts-expect-error nested tab navigation
      rootNav.navigate?.('Tabs', { screen: 'ProductsTab' });
    }, 60);
  };

  // v12.0 — ProductDetail lives on the HomeStack, not the RootStack.
  // From inside the scan modal we can't navigate there directly; we
  // dismiss the scan modal and let the Tabs navigator route through
  // the Home stack, then push ProductDetail there.
  const openProductDetail = (id: string, tint: Product['tint']) => {
    hapt.select();
    rootNav.goBack();
    setTimeout(() => {
      // @ts-expect-error nested stack typing
      rootNav.navigate?.('Tabs', {
        screen: 'HomeTab',
        params: { screen: 'ProductDetail', params: { productId: id, tint } },
      });
    }, 60);
  };

  const openMerchant = (url: string) => {
    hapt.select();
    Linking.openURL(url).catch(() => {
      /* swallow — no toast chrome here */
    });
  };

  const lowQuality =
    scan.aiAnalysis &&
    (!scan.aiAnalysis.image_quality.usable ||
      scan.aiAnalysis.image_quality.confidence < 0.6 ||
      scan.aiAnalysis.image_quality.issues.length > 0);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <AISourceBadge feature="scan" />

      <View style={styles.header}>
        <Pressable
          onPress={close}
          style={({ pressed }) => [
            styles.closeBtn,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Close results"
          hitSlop={8}
        >
          <X size={18} weight="duotone" color={palette.ink} />
        </Pressable>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── v13.0 INFO HIERARCHY ──
            1. Compact identity (portrait + score, side-by-side, calm)
            2. Headline takeaway (one strong line)
            3. YOUR NEXT MOVE — hero recommendation comes BEFORE findings
               so the user knows what to do RIGHT NOW.
            4. Alternatives — secondary picks, lighter weight.
            5. WHAT'S VISIBLE — findings, supporting evidence.
            6. TONIGHT — routine guidance, compact.
            7. Image-quality note when relevant.
            8. Subtle disclaimer.
            The top sections drive action; the bottom sections drive
            understanding. */}

        {/* ── 1. Compact identity ──────────────────────────────────── */}
        {/* v15.0 — score module rebuilt as editorial layout. Big
             serif number is the hero; the dial drops to a small
             status accent below the kicker. Reads as "Skin Score 85
             · Good · +4 since last scan" — clearer hierarchy than
             the previous chart-first treatment. */}
        <View style={styles.topModule}>
          <View style={styles.portraitFrame}>
            <Image
              source={scan.photoUri}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              transition={200}
            />
          </View>
          <View style={styles.scoreModule}>
            <Text style={styles.scoreKicker} maxFontSizeMultiplier={1.1}>
              SKIN SCORE
            </Text>
            <View style={styles.scoreValueRow}>
              <Text
                style={styles.scoreValue}
                maxFontSizeMultiplier={1.1}
                allowFontScaling={false}
              >
                {score.value}
              </Text>
              <View style={styles.scoreDialMini}>
                <SkinScoreDial
                  value={score.value}
                  size={42}
                  showTier={false}
                  previousValue={previousScoreValue}
                  deltaCaption={null}
                  delay={120}
                  onRevealComplete={handleRevealComplete}
                />
              </View>
            </View>
            <Text style={styles.scoreTier} maxFontSizeMultiplier={1.15}>
              {tierLabelFor(score.tier)}
              {score.deltaSinceLast !== null
                ? `  ·  ${formatDelta(score.deltaSinceLast)} since last`
                : '  ·  First reading'}
            </Text>
          </View>
        </View>

        {/* DEV-only DEMO READING. Hidden from consumer flow. */}
        {DEV_BADGE_ENABLED && !scan.aiAnalysis ? <DemoReadingBanner /> : null}

        {/* ── 2. Headline takeaway ─────────────────────────────────── */}
        <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
          {headline}
        </Text>
        {support ? (
          <Text style={styles.support} maxFontSizeMultiplier={1.2}>
            {support}
          </Text>
        ) : null}

        {/* v17.1 — OPTION A layout
            1. Score + summary (above)
            2. Hero product / best next move
            3. Skin map (WHAT WE SAW)
            4. Visible findings
            5. Tonight
            6. Alternatives
            7. Image quality (only when relevant)
            8. Disclaimer
            Putting the hero product BEFORE the skin map ensures the
            user sees the actionable answer first; the skin map then
            backs that recommendation with photographic proof. */}

        {/* ── 3. YOUR NEXT MOVE — hero recommendation ──────────────── */}
        {recommendations.primary ? (
          <View style={styles.section}>
            <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
              {nextMoveKickerFor(concerns)}
            </Text>
            <PrimaryRecCard
              rec={recommendations.primary}
              onOpen={() =>
                openProductDetail(
                  recommendations.primary!.product.id,
                  recommendations.primary!.product.tint
                )
              }
              onShop={
                recommendations.primary.product.buyUrl
                  ? () =>
                      openMerchant(recommendations.primary!.product.buyUrl!)
                  : undefined
              }
            />
          </View>
        ) : null}

        {/* ── 4. WHAT WE SAW — image-anchored overlay ──────────────────
            Renders the actual captured photo with AI-supplied polygon
            + per-concern visual treatment overlaid. Default shows the
            primary concern in isolation; chips toggle which finding
            is highlighted. */}
        {scan.aiAnalysis ? (
          <View style={styles.skinMapBlock}>
            <View style={styles.skinMapHeader}>
              <Text
                style={styles.sectionKicker}
                maxFontSizeMultiplier={1.1}
              >
                WHAT WE SAW
              </Text>
            </View>
            {visibleConcerns.filter((c) => c.severity !== 'calm').length >
            1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.skinMapChipRow}
              >
                {visibleConcerns
                  .filter((c) => c.severity !== 'calm')
                  .map((c) => (
                    <SkinMapChip
                      key={c.category}
                      label={CATEGORY_LABEL[c.category]}
                      color={categoryChipColor(c.category)}
                      selected={selectedMapCategory === c.category}
                      onPress={() => {
                        hapt.select();
                        setSelectedMapCategory(c.category);
                      }}
                    />
                  ))}
              </ScrollView>
            ) : null}
            <FaceSkinMap
              photoUri={scan.photoUri}
              aiAnalysis={scan.aiAnalysis}
              selectedCategory={selectedMapCategory}
              width={Math.min(
                Dimensions.get('window').width - 40,
                460
              )}
            />
            <Text
              style={styles.skinMapCaption}
              maxFontSizeMultiplier={1.2}
              numberOfLines={2}
            >
              AI-detected zones on your captured photo. Tap a label
              to isolate that concern.
            </Text>
          </View>
        ) : null}

        {/* ── 5. What's visible — supporting findings ──────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
            WHAT’S VISIBLE
          </Text>
          <View style={styles.findings}>
            {visibleConcerns.map((concern, i) => (
              <FindingRow
                key={concern.category}
                concern={concern}
                expanded={expandedCategory === concern.category}
                onPress={() => toggleRow(concern.category)}
                showTopDivider={i > 0}
              />
            ))}
          </View>
        </View>

        {/* ── 6. Tonight ───────────────────────────────────────────── */}
        {tonight.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
              TONIGHT
            </Text>
            <View style={styles.tonightList}>
              {tonight.slice(0, 3).map((step, i) => (
                <View key={i} style={styles.tonightItem}>
                  <Text style={styles.tonightNum} maxFontSizeMultiplier={1.15}>
                    {i + 1}
                  </Text>
                  <Text
                    style={styles.tonightText}
                    maxFontSizeMultiplier={1.2}
                    numberOfLines={3}
                  >
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── 7a. Also matched (alternatives) ──────────────────────── */}
        {recommendations.alternatives.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.recHeader}>
              <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
                ALSO MATCHED
              </Text>
              <Pressable onPress={openProducts} hitSlop={8}>
                <Text style={styles.seeAllLink} maxFontSizeMultiplier={1.1}>
                  See all
                </Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.altRow}
            >
              {recommendations.alternatives.map((rec) => (
                <AltRecCard
                  key={rec.product.id}
                  rec={rec}
                  onOpen={() =>
                    openProductDetail(rec.product.id, rec.product.tint)
                  }
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* ── 7b. Image-quality note (only when relevant) ──────────── */}
        {lowQuality && scan.aiAnalysis ? (
          <View style={styles.qualityCard}>
            <View style={styles.qualityRail} />
            <Text style={styles.qualityKicker} maxFontSizeMultiplier={1.1}>
              IMAGE QUALITY
            </Text>
            <Text
              style={styles.qualityBody}
              maxFontSizeMultiplier={1.2}
              numberOfLines={3}
            >
              {qualityCopy(scan.aiAnalysis)}
            </Text>
          </View>
        ) : null}

        {/* ── 8. Disclaimer ────────────────────────────────────────── */}
        <Text style={styles.disclaimer} maxFontSizeMultiplier={1.2}>
          Based on visible signals. Not a medical diagnosis.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * v13.0 — dynamic kicker for the YOUR NEXT MOVE section.
 * Reads the user's top concern and returns a section title that
 * frames the recommendation as a direct answer to what was found.
 * Falls back to a calm default for low-signal scans.
 */
function nextMoveKickerFor(concerns: Concern[]): string {
  const top = concerns.find((c) => c.severity !== 'calm');
  if (!top) return 'A GENTLE DAILY ADDITION';
  switch (top.category) {
    case 'breakouts':
      return 'BEST FOR BREAKOUTS';
    case 'hydration':
      return 'BEST FOR HYDRATION';
    case 'texture':
      return 'BEST FOR TEXTURE';
    case 'tone':
      return 'BEST FOR TONE';
  }
}

// ============================================================================
// Helpers — copy, recommendations
// ============================================================================

function buildHeadline(
  concerns: Concern[],
  analysis: FaceScanAnalysis | undefined
): string {
  // v12.0 — prefer the AI's why_line (already concise and consumer-safe)
  // when present. Otherwise fall back to a calm, consumer-friendly
  // line derived from the top concern.
  if (analysis?.skin_score?.why_line) {
    return analysis.skin_score.why_line;
  }
  const top = concerns[0];
  if (!top || top.severity === 'calm') {
    return 'Your skin looks generally calm.';
  }
  if (top.severity === 'mild') {
    return `Mild ${CATEGORY_LABEL[top.category].toLowerCase()} on your ${top.region}.`;
  }
  return `${CATEGORY_LABEL[top.category]} on your ${top.region}.`;
}

function buildSupportLine(
  concerns: Concern[],
  analysis: FaceScanAnalysis | undefined
): string | null {
  if (analysis?.skin_score?.explanation) {
    return analysis.skin_score.explanation;
  }
  const top = concerns[0];
  if (!top || top.severity === 'calm') {
    return 'No concerns stand out in this reading.';
  }
  return null;
}

function qualityCopy(analysis: FaceScanAnalysis): string {
  const issues = analysis.image_quality.issues;
  if (issues.includes('blurry'))
    return 'This photo read as slightly blurry, so some readings may be softer than usual.';
  if (issues.includes('low_light'))
    return 'Light was a little low. A brighter photo will tighten future readings.';
  if (issues.includes('partial_face'))
    return 'Part of your face was cropped, so a few areas were harder to evaluate.';
  if (issues.includes('angled'))
    return 'The photo was slightly angled, so some areas were harder to evaluate.';
  if (issues.includes('occluded'))
    return 'Hair or hands covered part of the frame in this photo.';
  return 'Some areas were harder to read in this photo.';
}

interface ResolvedRec {
  product: Product;
  matchScore: number | null;
  matchBand: ProductMatch['match_band'] | null;
  reasons: string[];
}

interface ResolvedRecommendations {
  primary: ResolvedRec | null;
  alternatives: ResolvedRec[];
}

/**
 * Map the AI's `aiTopMatches` (or the deterministic top-concern
 * fallback) onto the seed catalog so we can surface real images,
 * names, and shop links.
 */
function resolveRecommendations({
  aiTopMatches,
  concerns,
}: {
  aiTopMatches: ProductMatch[];
  concerns: Concern[];
}): ResolvedRecommendations {
  const byId = new Map(seedProducts.map((p) => [p.id, p]));

  // Try AI-driven ranking first.
  if (aiTopMatches.length > 0) {
    const resolved: ResolvedRec[] = [];
    for (const m of aiTopMatches) {
      const product = byId.get(m.product_id);
      if (!product) continue;
      resolved.push({
        product,
        matchScore: m.match_score,
        matchBand: m.match_band,
        reasons: m.primary_reasons.slice(0, 2),
      });
      if (resolved.length >= 5) break;
    }
    if (resolved.length > 0) {
      return { primary: resolved[0], alternatives: resolved.slice(1, 5) };
    }
  }

  // Deterministic fallback — pick by concern category.
  const topConcern = concerns.find((c) => c.severity !== 'calm') ?? concerns[0];
  const preferredCategories = preferredCategoriesFor(topConcern?.category);
  const seen = new Set<string>();
  const picks: ResolvedRec[] = [];
  for (const cat of preferredCategories) {
    for (const product of seedProducts) {
      if (product.category !== cat) continue;
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      picks.push({
        product,
        matchScore: null,
        matchBand: null,
        reasons: [
          buildHomeRecReason(topConcern),
        ].filter((s) => s.length > 0),
      });
      if (picks.length >= 5) break;
    }
    if (picks.length >= 5) break;
  }
  if (picks.length === 0) return { primary: null, alternatives: [] };
  return { primary: picks[0], alternatives: picks.slice(1, 5) };
}

function preferredCategoriesFor(
  category: Concern['category'] | undefined
): Product['category'][] {
  switch (category) {
    case 'breakouts':
      return ['serum', 'toner', 'spf', 'cleanser'];
    case 'hydration':
      return ['moisturizer', 'serum', 'toner'];
    case 'texture':
      return ['serum', 'mask', 'cleanser'];
    case 'tone':
      return ['serum', 'spf', 'moisturizer'];
    default:
      return ['serum', 'moisturizer'];
  }
}

function buildHomeRecReason(concern: Concern | undefined): string {
  if (!concern) return 'Matched to your skin profile.';
  switch (concern.category) {
    case 'breakouts':
      return `Targets congestion on your ${concern.region}.`;
    case 'hydration':
      return `Restores moisture to your ${concern.region}.`;
    case 'texture':
      return `Smooths the texture on your ${concern.region}.`;
    case 'tone':
      return `Works on dark marks across your ${concern.region}.`;
  }
}

// ============================================================================
// Finding row
// ============================================================================

function FindingRow({
  concern,
  expanded,
  onPress,
  showTopDivider,
}: {
  concern: Concern;
  expanded: boolean;
  onPress: () => void;
  showTopDivider: boolean;
}) {
  const color = colorFor(concern.severity);
  const fillRatio = severityFillRatio(concern.severity);

  // v17.0 — visual proof now lives in the WHAT WE SAW section
  // above (FaceSkinMap on the actual photo). The finding rows
  // here read as compact text + severity bars; no inline diagram
  // duplicates the work of the photo overlay.

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${CATEGORY_LABEL[concern.category]}, ${
        concern.region
      }, ${severityLabel(concern.severity)}`}
      accessibilityState={{ expanded }}
      style={({ pressed }) => [
        styles.row,
        showTopDivider && styles.rowDivider,
        pressed && { opacity: 0.96 },
      ]}
    >
      <View style={styles.rowHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle} maxFontSizeMultiplier={1.15}>
            <Text style={styles.rowTitleStrong}>
              {CATEGORY_LABEL[concern.category]}
            </Text>
            <Text style={styles.rowTitleMid}>{`  ·  ${concern.region}`}</Text>
          </Text>
          <View style={styles.severityBarRail}>
            <View
              style={[
                styles.severityBarFill,
                {
                  backgroundColor: color,
                  width: `${Math.round(fillRatio * 100)}%`,
                },
              ]}
            />
          </View>
        </View>
        <Text
          style={[styles.rowSeverity, { color }]}
          maxFontSizeMultiplier={1.1}
        >
          {severityLabel(concern.severity)}
        </Text>
        <View
          style={[
            styles.rowCaret,
            expanded && { transform: [{ rotate: '180deg' }] },
          ]}
        >
          <CaretDown size={13} color={palette.inkTertiary} weight="bold" />
        </View>
      </View>

      {expanded ? (
        <View style={styles.rowDetail}>
          <Text style={styles.rowDetailFinding} maxFontSizeMultiplier={1.2}>
            {concern.finding}
          </Text>
          <View style={[styles.rowDetailBullet, { backgroundColor: color }]} />
          <Text style={styles.rowDetailNext} maxFontSizeMultiplier={1.2}>
            {concern.nextStep}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ============================================================================
// v17.0 — Skin map category chip
//
// Compact pill button. Tapping toggles which concern is highlighted
// on the FaceSkinMap above. Selected state takes the concern's
// category color; unselected stays calm/hairline.
// ============================================================================

function SkinMapChip({
  label,
  color,
  selected,
  onPress,
}: {
  label: string;
  /** Concern category color. Optional — "ALL" chip uses ink. */
  color?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const tint = color ?? palette.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}${selected ? ', selected' : ''}`}
      style={({ pressed }) => [
        styles.skinMapChip,
        selected && {
          borderColor: tint,
          backgroundColor: `${tint}15`,
        },
        pressed && { opacity: 0.92 },
      ]}
    >
      <Text
        style={[
          styles.skinMapChipLabel,
          selected && { color: tint },
        ]}
        maxFontSizeMultiplier={1.1}
      >
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

function categoryChipColor(category: ConcernCategory): string {
  switch (category) {
    case 'breakouts':
      return '#E66B5C';
    case 'hydration':
      return '#7CB0FF';
    case 'texture':
      return '#A8C7C0';
    case 'tone':
      return '#D9A75E';
  }
}

function severityFillRatio(s: Severity): number {
  switch (s) {
    case 'calm':
      return 0.1;
    case 'mild':
      return 0.35;
    case 'moderate':
      return 0.65;
    case 'needs-attention':
      return 1;
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
// Recommended product cards
// ============================================================================

function PrimaryRecCard({
  rec,
  onOpen,
  onShop,
}: {
  rec: ResolvedRec;
  onOpen: () => void;
  onShop?: () => void;
}) {
  const { product, matchScore, reasons } = rec;
  // v12.3 — real images. seedProducts.imageUri is empty; the actual
  // photos are bundled assets resolved via localProductImageFor(id).
  // When no real image is bundled, ProductPlaceholderImage renders a
  // premium silhouette + brand wordmark instead of an empty box.
  const localSrc = localProductImageFor(product.id);
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${product.brand} ${product.name}`}
      style={({ pressed }) => [
        styles.primaryCard,
        pressed && { opacity: 0.96 },
      ]}
    >
      <View style={styles.primaryImageWrap}>
        <ProductPlaceholderImage
          product={product}
          silhouetteSize={64}
          showBrandWord
          showMockupBadge={false}
        />
        {localSrc ? (
          <Image
            source={localSrc}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={180}
          />
        ) : null}
        {matchScore !== null ? (
          <View style={styles.matchPill}>
            <Text style={styles.matchPillNum} maxFontSizeMultiplier={1.1}>
              {`${matchScore}%`}
            </Text>
            <Text style={styles.matchPillLabel} maxFontSizeMultiplier={1.1}>
              MATCH
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.primaryText}>
        <Text style={styles.primaryBrand} maxFontSizeMultiplier={1.1}>
          {product.brand.toUpperCase()}
        </Text>
        <Text
          style={styles.primaryName}
          numberOfLines={2}
          maxFontSizeMultiplier={1.15}
        >
          {product.name}
        </Text>
        {reasons[0] ? (
          <Text
            style={styles.primaryReason}
            numberOfLines={2}
            maxFontSizeMultiplier={1.2}
          >
            {reasons[0]}
          </Text>
        ) : null}
        <View style={styles.primaryFoot}>
          {Number.isFinite(product.price) && product.price > 0 ? (
            <Text style={styles.primaryPrice} maxFontSizeMultiplier={1.1}>
              {formatPrice(product.price)}
            </Text>
          ) : (
            <View />
          )}
          <View style={{ flex: 1 }} />
          {onShop ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onShop();
              }}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Shop ${product.brand}`}
              style={({ pressed }) => [
                styles.shopBtn,
                pressed && { opacity: 0.92 },
              ]}
            >
              <Text style={styles.shopBtnLabel} maxFontSizeMultiplier={1.1}>
                Shop
              </Text>
              <ArrowUpRight
                size={12}
                weight="bold"
                color={palette.inkInverse}
              />
            </Pressable>
          ) : (
            <ArrowRight size={14} color={palette.inkTertiary} weight="bold" />
          )}
        </View>
      </View>
    </Pressable>
  );
}

function AltRecCard({
  rec,
  onOpen,
}: {
  rec: ResolvedRec;
  onOpen: () => void;
}) {
  const { product, matchScore } = rec;
  // v12.3 — see PrimaryRecCard. Real bundled photo when available;
  // otherwise the editorial silhouette placeholder.
  const localSrc = localProductImageFor(product.id);
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${product.brand} ${product.name}`}
      style={({ pressed }) => [
        styles.altCard,
        pressed && { opacity: 0.94 },
      ]}
    >
      <View style={styles.altImageWrap}>
        <ProductPlaceholderImage
          product={product}
          silhouetteSize={48}
          showBrandWord
          showMockupBadge={false}
        />
        {localSrc ? (
          <Image
            source={localSrc}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={180}
          />
        ) : null}
        {matchScore !== null ? (
          <View style={styles.altMatchBadge}>
            <Text style={styles.altMatchText} maxFontSizeMultiplier={1.1}>
              {`${matchScore}%`}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.altBrand} maxFontSizeMultiplier={1.1}>
        {product.brand.toUpperCase()}
      </Text>
      <Text
        style={styles.altName}
        numberOfLines={2}
        maxFontSizeMultiplier={1.15}
      >
        {product.name}
      </Text>
    </Pressable>
  );
}

function tintForProduct(p: { tint?: string | null }) {
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

function formatPrice(price: number): string {
  return Number.isInteger(price) ? `$${price}` : `$${price.toFixed(2)}`;
}

// ============================================================================
// Dev-only banner (kept for diagnostics)
// ============================================================================

function DemoReadingBanner() {
  return (
    <View style={demoBanner.wrap}>
      <View style={demoBanner.rail} />
      <Text style={demoBanner.kicker} maxFontSizeMultiplier={1.1}>
        DEMO READING
      </Text>
      <Text
        style={demoBanner.body}
        maxFontSizeMultiplier={1.2}
        numberOfLines={3}
      >
        Live AI isn’t connected — these findings are a demo response.
        Connect the proxy (see SETUP.md) to get a real, personalised
        reading.
      </Text>
    </View>
  );
}

const demoBanner = StyleSheet.create({
  wrap: {
    marginBottom: 22,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 14,
    borderRadius: 14,
    backgroundColor: palette.amber + '14',
    position: 'relative',
    overflow: 'hidden',
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: palette.amber,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.amber,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.ink,
  },
});

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },

  header: {
    height: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
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
    paddingBottom: 56,
  },

  // ── 2. Top module — portrait + score ─────────────────────────────
  topModule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 8,
    marginBottom: 28,
  },
  portraitFrame: {
    width: 96,
    height: 116,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
  },
  scoreModule: {
    flex: 1,
    alignItems: 'flex-start',
  },
  scoreKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  // v15.0 — editorial score-value row. Big serif number on the
  // left, small dial on the right as a secondary visual accent.
  scoreValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },
  scoreValue: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -2,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  scoreDialMini: {
    width: 42,
    height: 42,
  },
  scoreTier: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.4,
    color: palette.inkSecondary,
  },

  // v17.0 — WHAT WE SAW block. Sits between the headline and
  // YOUR NEXT MOVE so the user gets photo-anchored proof of the
  // findings before any recommendation. Tap a category chip to
  // isolate that concern on the photo.
  skinMapBlock: {
    marginBottom: 28,
  },
  skinMapHeader: {
    marginBottom: 10,
  },
  skinMapChipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
    paddingRight: 4,
  },
  skinMapChip: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skinMapChipLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.inkSecondary,
  },
  skinMapCaption: {
    marginTop: 12,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkTertiary,
    maxWidth: '94%',
  },

  // ── 3. Headline + support ────────────────────────────────────────
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: palette.ink,
    marginBottom: 8,
    maxWidth: '94%',
  },
  support: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
    marginBottom: 28,
    maxWidth: '94%',
  },

  // ── Sections ─────────────────────────────────────────────────────
  section: {
    marginBottom: 28,
  },
  sectionKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // ── 4. Findings ──────────────────────────────────────────────────
  findings: {},
  row: { paddingVertical: 16 },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  severityBarRail: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: palette.hairline,
    marginTop: 10,
    overflow: 'hidden',
  },
  severityBarFill: {
    height: 3,
    borderRadius: 1.5,
  },
  rowTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: palette.ink,
    letterSpacing: -0.1,
  },
  rowTitleStrong: { color: palette.ink },
  rowTitleMid: { color: palette.inkTertiary, fontFamily: 'Inter-Regular' },
  rowSeverity: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  rowCaret: { marginLeft: 8, width: 16, alignItems: 'center' },
  rowDetail: { marginTop: 12, paddingLeft: 18, position: 'relative' },
  rowDetailFinding: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSecondary,
    marginBottom: 10,
  },
  rowDetailBullet: {
    position: 'absolute',
    left: 0,
    top: 8,
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  rowDetailNext: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.ink,
  },

  // ── 5. Image quality ─────────────────────────────────────────────
  qualityCard: {
    marginBottom: 28,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 14,
    borderRadius: 14,
    backgroundColor: palette.amber + '14',
    position: 'relative',
    overflow: 'hidden',
  },
  qualityRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: palette.amber,
  },
  qualityKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.amber,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  qualityBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.ink,
  },

  // ── 6. Tonight ───────────────────────────────────────────────────
  tonightList: { gap: 12 },
  tonightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tonightNum: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: palette.clay,
    width: 22,
    fontVariant: ['tabular-nums'],
  },
  tonightText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.ink,
    paddingTop: 3,
  },

  // ── 7. Recommended products ──────────────────────────────────────
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  seeAllLink: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.clay,
  },
  // v13.0 — hero card. Increased visual weight via shadow + slightly
  // taller image. The card is the primary action surface on the
  // result screen now (above findings), so it earns more presence.
  primaryCard: {
    flexDirection: 'row',
    gap: 14,
    padding: 12,
    borderRadius: 20,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
    marginBottom: 16,
    shadowColor: palette.ink,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  primaryImageWrap: {
    width: 116,
    height: 148,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    position: 'relative',
  },
  matchPill: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: palette.moss,
    alignItems: 'center',
    minWidth: 52,
  },
  matchPillNum: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    lineHeight: 14,
    color: palette.inkInverse,
    fontVariant: ['tabular-nums'],
  },
  matchPillLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 8,
    letterSpacing: 1.2,
    color: 'rgba(248,250,252,0.78)',
    marginTop: 1,
  },
  primaryText: {
    flex: 1,
    justifyContent: 'space-between',
  },
  primaryBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    marginBottom: 4,
  },
  primaryName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 6,
  },
  primaryReason: {
    flex: 1,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
    marginBottom: 10,
  },
  primaryFoot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryPrice: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  // v13.0 — stronger Shop CTA. Premium pill with a subtle clay
  // accent so it reads as the primary action on the rec card.
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: palette.clay,
  },
  shopBtnLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.3,
    color: palette.inkInverse,
  },

  altRow: { gap: 10, paddingRight: 4 },
  altCard: {
    width: 132,
  },
  altImageWrap: {
    width: 132,
    height: 132,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: palette.bgDeep,
    marginBottom: 8,
  },
  altMatchBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(11,18,32,0.7)',
  },
  altMatchText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: palette.inkInverse,
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  altBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.2,
    color: palette.inkTertiary,
    marginBottom: 2,
  },
  altName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.2,
    color: palette.ink,
  },

  // ── 8. Disclaimer ────────────────────────────────────────────────
  disclaimer: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 12,
    lineHeight: 18,
    color: palette.inkTertiary,
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 24,
  },
});

import React, { useEffect, useMemo, useState } from 'react';
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
import Svg, {
  Defs as SvgDefs,
  RadialGradient as SvgRadialGradient,
  Rect as SvgRect,
  Stop as SvgStop,
} from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  ArrowRight,
  CaretDown,
  Plus,
  MoonStars,
  Sun,
  Drop,
  Sparkle,
  Shield,
  Leaf,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
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
import { LiveProductCard } from '@/components/products/LiveProductCard';
import { LiveProductsUnavailable } from '@/components/products/LiveProductsUnavailable';
import { lookupForScan } from '@/api/liveProducts';
import type { LiveProductCandidate } from '@/ai/ai-contracts';
import type { Concern, ConcernCategory, Severity } from '@/types';

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

  // v18.1 — live retrieval drives BEST FOR THIS + ALTERNATIVES.
  // Previously we walked seedProducts via pickProductForConcern /
  // pickAlternatives; now we ask the AI for real products tied to
  // the user's actual scan. Cached at the module layer so multiple
  // mounts hit cache.
  const [livePicks, setLivePicks] = useState<LiveProductCandidate[]>([]);
  const [liveLoading, setLiveLoading] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<boolean>(false);
  const [liveAttempt, setLiveAttempt] = useState<number>(0);
  useEffect(() => {
    if (!latest?.aiAnalysis) {
      setLivePicks([]);
      return;
    }
    let cancelled = false;
    setLiveLoading(true);
    setLiveError(false);
    lookupForScan(latest, { count: 6, fresh: liveAttempt > 0 })
      .then((picks) => {
        if (cancelled) return;
        setLivePicks(picks);
        setLiveError(picks.length === 0);
      })
      .catch(() => {
        if (cancelled) return;
        setLivePicks([]);
        setLiveError(true);
      })
      .finally(() => {
        if (cancelled) return;
        setLiveLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [latest?.id, latest?.aiAnalysis, liveAttempt]);
  const rec = livePicks[0] ?? null;
  const alternatives = livePicks.slice(1, 4);
  const retryLive = () => setLiveAttempt((n) => n + 1);

  const goBack = () => {
    hapt.select();
    nav.goBack();
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
        {/* ── HERO CONCERN CARD ── */}
        <HeroConcernCard primary={primary} secondary={secondaryConcern} />

        {/* Score chip — small contextual stamp below the hero, not a
            separate module. Keeps the score visible without stealing
            focus from the concern. */}
        <View style={styles.scoreStamp}>
          <Text style={styles.scoreStampKicker} maxFontSizeMultiplier={1.1}>
            SKIN SCORE
          </Text>
          <View style={styles.scoreStampValueRow}>
            <Text style={styles.scoreStampValue} maxFontSizeMultiplier={1.1}>
              {score.value}
            </Text>
            <Text style={styles.scoreStampTier} maxFontSizeMultiplier={1.1}>
              {tierLabel(score.tier)}
            </Text>
            {score.deltaSinceLast !== null ? (
              <>
                <View style={styles.scoreStampDivider} />
                <Text
                  style={styles.scoreStampDelta}
                  maxFontSizeMultiplier={1.1}
                >
                  {`${formatDelta(score.deltaSinceLast)} ${sinceLastPhrase(
                    score.latestAt,
                    score.scanCount
                  )}`}
                </Text>
              </>
            ) : null}
          </View>
        </View>

        {/* ── TONIGHT — action cards with icons ── */}
        {tonight.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
              TONIGHT
            </Text>
            <View style={styles.actionStack}>
              {tonight.slice(0, 3).map((step, i) => (
                <ActionCard
                  key={i}
                  step={compressStep(step)}
                  timeOfDay={inferTimeOfDay(step)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* ── BEST PRODUCT — v18.4 LIVE retrieval with empty UX ─────── */}
        <View style={styles.section}>
          <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
            BEST FOR THIS
          </Text>
          {rec ? (
            <LiveProductCard candidate={rec} variant="hero" />
          ) : liveLoading ? (
            <LiveProductsUnavailable
              variant="loading"
              scope="for your scan"
            />
          ) : (
            <LiveProductsUnavailable
              variant={liveError ? 'unavailable' : 'empty'}
              scope="for your scan"
              onRetry={retryLive}
            />
          )}
        </View>

        {/* ── ALTERNATIVES — v18.1 LIVE retrieval ──────────────────── */}
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.altScrollRow}
            >
              {alternatives.map((c) => (
                <LiveProductCard
                  key={c.id}
                  candidate={c}
                  variant="alt"
                />
              ))}
            </ScrollView>
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
// HeroConcernCard — the Plan page's dominant object
// ============================================================================

function HeroConcernCard({
  primary,
  secondary,
}: {
  primary: Concern | undefined;
  secondary: Concern | undefined;
}) {
  if (!primary) {
    return (
      <View style={hero.wrap}>
        <Text style={hero.kicker} maxFontSizeMultiplier={1.1}>
          YOUR PLAN
        </Text>
        <Text style={hero.headline} maxFontSizeMultiplier={1.15}>
          Your skin is settled.
        </Text>
        <Text style={hero.interpretation} maxFontSizeMultiplier={1.2}>
          Nothing new tonight. Keep your current routine.
        </Text>
      </View>
    );
  }

  const color = colorFor(primary.severity);
  const dots = dotCount(primary.severity);

  return (
    <View
      style={[
        hero.wrap,
        { backgroundColor: withAlpha(color, 0.11) },
      ]}
    >
      {/* v10.4 — upgraded hero treatment. The card now layers a radial
          tier glow behind the headline (keyed to severity color, 12% at
          center fading to 0 at the edges) so the card reads with depth
          rather than as a flat tinted rectangle. The 3pt top accent rail
          stays. Editorial composition: severity pill | dots | YOUR PLAN
          kicker sits above; headline + region + interpretation stack
          below. */}
      <View
        style={[hero.accentRail, { backgroundColor: color }]}
        pointerEvents="none"
      />
      <HeroTierGlow color={color} />
      <View style={hero.stampRow}>
        <View style={[hero.severityPill, { backgroundColor: color }]}>
          <Text style={hero.severityText} maxFontSizeMultiplier={1.1}>
            {severityToUpper(primary.severity)}
          </Text>
        </View>
        <View style={hero.dotStack}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View
              key={i}
              style={[
                hero.dot,
                { backgroundColor: i < dots ? color : 'rgba(11,18,32,0.12)' },
              ]}
            />
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <Text style={hero.kicker} maxFontSizeMultiplier={1.1}>
          YOUR PLAN
        </Text>
      </View>

      <Text
        style={hero.headline}
        maxFontSizeMultiplier={1.15}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {CATEGORY_LABEL[primary.category]}.
      </Text>
      <Text style={hero.region} maxFontSizeMultiplier={1.2}>
        on your {primary.region}
      </Text>
      <Text
        style={hero.interpretation}
        maxFontSizeMultiplier={1.2}
        numberOfLines={3}
      >
        {primary.interpretation}
      </Text>

      {secondary ? (
        <View style={hero.secondaryRow}>
          <View
            style={[
              hero.secondaryDot,
              { backgroundColor: colorFor(secondary.severity) },
            ]}
          />
          <Text
            style={hero.secondaryText}
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
          >
            Also watching {CATEGORY_LABEL[
              secondary.category
            ].toLowerCase()} on your {secondary.region}.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * v10.4 — tier glow. A radial gradient painted behind the card content
 * so the severity color feels atmospheric, not flat. Positioned toward
 * the upper-left where the eye reads first; fades fully to transparent
 * before it reaches the edge of the card.
 */
function HeroTierGlow({ color }: { color: string }) {
  const gradientId = React.useMemo(
    () => `plan-hero-glow-${Math.round(Math.random() * 1e6)}`,
    []
  );
  return (
    <Svg
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    >
      <SvgDefs>
        <SvgRadialGradient
          id={gradientId}
          cx="28%"
          cy="30%"
          r="70%"
        >
          <SvgStop offset="0" stopColor={color} stopOpacity={0.18} />
          <SvgStop offset="0.55" stopColor={color} stopOpacity={0.05} />
          <SvgStop offset="1" stopColor={color} stopOpacity={0} />
        </SvgRadialGradient>
      </SvgDefs>
      <SvgRect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
    </Svg>
  );
}

function severityToUpper(s: Severity): string {
  switch (s) {
    case 'calm':
      return 'CALM';
    case 'mild':
      return 'MILD';
    case 'moderate':
      return 'MODERATE';
    case 'needs-attention':
      return 'NEEDS ATTENTION';
  }
}

function dotCount(s: Severity): number {
  switch (s) {
    case 'calm':
      return 1;
    case 'mild':
      return 1;
    case 'moderate':
      return 2;
    case 'needs-attention':
      return 3;
  }
}

function withAlpha(hex: string, a: number): string {
  if (hex.length !== 7 || !hex.startsWith('#')) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// ============================================================================
// ActionCard — replaces the numbered tonight list
// ============================================================================

type TimeOfDay = 'morning' | 'night' | 'week';

function inferTimeOfDay(step: string): TimeOfDay {
  const s = step.toLowerCase();
  if (s.includes('spf') || s.includes('morning') || s.includes('am '))
    return 'morning';
  if (s.includes('once this week') || s.includes('this week'))
    return 'week';
  return 'night';
}

type ActionIcon = React.FC<PhosphorIconProps>;

function iconForStep(step: string): ActionIcon {
  const s = step.toLowerCase();
  if (s.includes('spf')) return Sun as ActionIcon;
  if (s.includes('calming') || s.includes('gel')) return Shield as ActionIcon;
  if (s.includes('hydrat') || s.includes('moistur')) return Drop as ActionIcon;
  if (s.includes('skip') || s.includes('barrier')) return Shield as ActionIcon;
  if (s.includes('exfoliant') || s.includes('pha') || s.includes('clay'))
    return Sparkle as ActionIcon;
  if (s.includes('brightening')) return Sparkle as ActionIcon;
  if (s.includes('natural') || s.includes('plant')) return Leaf as ActionIcon;
  return MoonStars as ActionIcon;
}

function ActionCard({
  step,
  timeOfDay,
}: {
  step: string;
  timeOfDay: TimeOfDay;
}) {
  const Icon = iconForStep(step);
  const tod = timeOfDayMeta(timeOfDay);
  return (
    <View style={action.card}>
      {/* v10.1 — left-edge color rail keyed to time-of-day. Three stacked
          action cards now read as a striped rhythm (amber / azure / moss)
          rather than three identical paper tiles. */}
      <View style={[action.edgeRail, { backgroundColor: tod.chipFg }]} pointerEvents="none" />
      <View style={[action.iconWrap, { backgroundColor: tod.iconBg }]}>
        <Icon size={18} color={tod.iconFg} weight="duotone" />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={action.title}
          maxFontSizeMultiplier={1.2}
          numberOfLines={2}
        >
          {step}
        </Text>
        <View style={[action.todChip, { backgroundColor: tod.chipBg }]}>
          <tod.ChipIcon size={10} color={tod.chipFg} weight="bold" />
          <Text
            style={[action.todChipText, { color: tod.chipFg }]}
            maxFontSizeMultiplier={1.1}
          >
            {tod.label}
          </Text>
        </View>
      </View>
    </View>
  );
}

function timeOfDayMeta(tod: TimeOfDay): {
  label: string;
  chipBg: string;
  chipFg: string;
  iconBg: string;
  iconFg: string;
  ChipIcon: ActionIcon;
} {
  switch (tod) {
    case 'morning':
      return {
        label: 'MORNING',
        chipBg: 'rgba(212,165,94,0.14)',
        chipFg: palette.amberDeep,
        iconBg: 'rgba(212,165,94,0.18)',
        iconFg: palette.amberDeep,
        ChipIcon: Sun as ActionIcon,
      };
    case 'week':
      return {
        label: 'THIS WEEK',
        chipBg: 'rgba(76,155,122,0.14)',
        chipFg: palette.mossDeep,
        iconBg: 'rgba(76,155,122,0.18)',
        iconFg: palette.mossDeep,
        ChipIcon: Sparkle as ActionIcon,
      };
    case 'night':
    default:
      return {
        label: 'TONIGHT',
        chipBg: 'rgba(43,127,255,0.12)',
        chipFg: palette.clayDeep,
        iconBg: 'rgba(43,127,255,0.14)',
        iconFg: palette.clay,
        ChipIcon: MoonStars as ActionIcon,
      };
  }
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

// v18.1 — Product selection helpers removed. Plan now reads its
// hero + alternatives from `lookupForScan(latest)`; LiveProductCard
// supplies its own matchReason so we don't need a deterministic
// copywriter here.

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

  // Skin Score stamp — small, just-below-hero. Reads as metadata, not a module.
  scoreStamp: {
    marginTop: 14,
    paddingHorizontal: 4,
  },
  scoreStampKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  scoreStampValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreStampValue: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    letterSpacing: -0.5,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  scoreStampTier: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
    color: palette.inkSecondary,
  },
  scoreStampDivider: {
    width: 1,
    height: 14,
    backgroundColor: palette.hairline,
  },
  scoreStampDelta: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: palette.inkTertiary,
    flex: 1,
  },

  // Action stack
  actionStack: {
    gap: 10,
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


  // REC — v9.5 heroed product card
  recCard: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 4,
  },
  recImage: {
    width: 132,
    height: 164,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    position: 'relative',
  },
  recImageInner: {
    width: '100%',
    height: '100%',
  },
  recImageFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recMatchBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: palette.moss,
    alignItems: 'center',
    minWidth: 54,
  },
  recMatchBadgeNum: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.inkInverse,
    letterSpacing: 0.1,
    lineHeight: 15,
    fontVariant: ['tabular-nums'],
  },
  recMatchBadgeLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 8,
    letterSpacing: 1.2,
    color: 'rgba(248,250,252,0.78)',
    marginTop: 1,
  },
  recReasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
  },
  recReasonBullet: {
    width: 2,
    alignSelf: 'stretch',
    borderRadius: 1,
    backgroundColor: palette.clay,
    marginTop: 2,
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
    flex: 1,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
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
  // v18.1 — altScrollRow drives the horizontal LiveProductCard
  // alternatives carousel under BEST FOR THIS.
  altScrollRow: {
    gap: 10,
    paddingRight: 4,
  },
  altList: {
    gap: 14,
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 6,
  },
  altImage: {
    width: 54,
    height: 66,
    borderRadius: 12,
    overflow: 'hidden',
  },
  altBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  altBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.inkTertiary,
  },
  altMatchPill: {
    paddingHorizontal: 6,
    height: 16,
    borderRadius: 8,
    backgroundColor: palette.mossLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  altMatchPillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 0.4,
    color: palette.mossDeep,
    fontVariant: ['tabular-nums'],
  },
  altName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  altPrice: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    letterSpacing: -0.2,
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

// ============================================================================
// Hero concern card + action card styles
// ============================================================================

const hero = StyleSheet.create({
  wrap: {
    marginTop: 12,
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: palette.bgDeep,
    overflow: 'hidden',
    position: 'relative',
  },
  // v10.1 — severity accent rail across the top of the hero card.
  accentRail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  stampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  severityPill: {
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.inkInverse,
  },
  dotStack: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -1.6,
    color: palette.ink,
  },
  region: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 18,
    lineHeight: 22,
    color: palette.inkSecondary,
    marginTop: 4,
  },
  interpretation: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.ink,
    marginTop: 18,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(11,18,32,0.08)',
  },
  secondaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  secondaryText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: palette.inkSecondary,
  },
});

const action = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingLeft: 19, // 16 base + 3 for the rail
    paddingRight: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    position: 'relative',
    overflow: 'hidden',
  },
  edgeRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  todChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  todChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.0,
  },
});

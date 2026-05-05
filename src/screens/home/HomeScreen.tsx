import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowRight,
  ScanSmiley,
  Drop as DropIcon,
  Sparkle as SparkleIcon,
  CaretRight,
  Moon as MoonIcon,
  GridNine as GridNineIcon,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { SkinScoreDial } from '@/components/SkinScoreDial';
import { useAppStore } from '@/store/useAppStore';
import { palette, statusColor } from '@/theme';
import { hapt } from '@/utils/haptics';
import { useShallow } from 'zustand/react/shallow';
import { CATEGORY_LABEL, getConcerns, severityLabel } from '@/utils/concerns';
import { AIStatusBanner } from '@/components/dev/AIStatusBanner';
import { computeSkinScore, deltaPhrase } from '@/utils/skinScore';
import { LiveProductCard } from '@/components/products/LiveProductCard';
import { LiveProductsUnavailable } from '@/components/products/LiveProductsUnavailable';
import { lookupForScan, lookupLiveProducts } from '@/api/liveProducts';
import type { LiveProductCandidate } from '@/ai/ai-contracts';
import type { Concern, Scan, Severity } from '@/types';

/**
 * Home — v9.1 daily command center.
 *
 * Six modules, each with a single purpose. No module duplicates any other.
 * No overlap with the Routine or Progress tabs. Home answers four
 * questions, in order:
 *
 *   A. What matters today?            → hero insight
 *   B. At a glance?                   → compact concern strip
 *   C. What should I do next?         → "open today's plan" row
 *   D. Am I improving?                → progress teaser
 *   E. One curated product?           → tight rec row (not a card)
 *   F. Where else can I go?           → quiet entry points (scan/products/assistant)
 *
 * The brand bar is larger than v8.2: 32pt drop mark + "Pura AI" wordmark
 * set in serif, live in the top-left exactly as requested.
 */

export function HomeScreen() {
  // ─────────────────────────────────────────────────────────────────
  // v11.14 — ALL hooks called unconditionally at the top of the
  // component, BEFORE any early return.
  //
  // Previous bug: an early return for `scans.length === 0` (Day 0)
  // sat between two groups of hooks. Day 0 path called 5 hooks; the
  // Day 1+ path that ran AFTER the early return called 2 more
  // (`useMemo` for recProduct + `useAppStore` for aiTopMatches),
  // for a total of 7. When the store transitioned from Day 0 to
  // Day 1+ on the same mounted instance (the user finishes their
  // first scan), React saw the hook count jump 5 → 7 and threw:
  //
  //   "Rendered more hooks than during the previous render"
  //
  // Fix: hoist every hook to the top. Plain-JS derivations
  // (`concerns`, `primary`, `score`, etc.) can stay below — they're
  // not hooks.
  // ─────────────────────────────────────────────────────────────────
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const scans = useAppStore((s) => s.scans);
  const user = useAppStore(
    useShallow((s) => ({
      name: s.name,
      initials: s.user?.initials ?? null,
    }))
  );
  const aiTopMatches = useAppStore((s) => s.aiTopMatches);

  const latest = scans[scans.length - 1];
  const previous = scans.length >= 2 ? scans[scans.length - 2] : undefined;
  const first = scans[0];

  const firstName = (user.name || '').split(/\s+/)[0] || null;
  const greeting = useMemo(() => buildGreeting(firstName), [firstName]);

  // v18.1 — Day 1+ product pick now sourced from LIVE retrieval.
  // The previous `pickRecProduct` walked seedProducts; that's gone.
  // We fire `lookupForScan(latestScan)` once per scan id and
  // surface candidates[0] as the PICKED FOR YOU card. The seed
  // catalog is no longer this screen's primary inventory.
  const [recCandidate, setRecCandidate] = useState<LiveProductCandidate | null>(
    null
  );
  const [recLoading, setRecLoading] = useState<boolean>(false);
  const [recError, setRecError] = useState<boolean>(false);
  const [recAttempt, setRecAttempt] = useState<number>(0);
  const latestScanForRec = scans.length > 0 ? scans[scans.length - 1] : null;
  useEffect(() => {
    if (!latestScanForRec) {
      setRecCandidate(null);
      return;
    }
    let cancelled = false;
    setRecLoading(true);
    setRecError(false);
    const run = async () => {
      try {
        const picks = latestScanForRec.aiAnalysis
          ? await lookupForScan(latestScanForRec, {
              count: 4,
              fresh: recAttempt > 0,
            })
          : [];
        if (cancelled) return;
        if (picks.length > 0) {
          setRecCandidate(picks[0]);
          setRecLoading(false);
          return;
        }
        // No scan-level AI context — fall back to a concern-shaped
        // free-text live retrieval so we never leave the user
        // looking at silence.
        const cs = getConcerns(
          latestScanForRec,
          scans.length >= 2 ? scans[scans.length - 2] : undefined
        );
        const primaryConcern = cs.find((c) => c.severity !== 'calm') ?? cs[0];
        const fallback = primaryConcern
          ? await lookupLiveProducts(
              `best ${primaryConcern.category} product`,
              { count: 3, fresh: recAttempt > 0 }
            )
          : [];
        if (cancelled) return;
        setRecCandidate(fallback[0] ?? null);
        setRecError(fallback.length === 0);
        setRecLoading(false);
      } catch {
        if (cancelled) return;
        setRecCandidate(null);
        setRecError(true);
        setRecLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [latestScanForRec?.id, scans, recAttempt]);
  const retryRec = () => setRecAttempt((n) => n + 1);
  // ─────────────────────────────────────────────────────────────────
  // End of hook block. Plain derivations from here on.
  // ─────────────────────────────────────────────────────────────────

  const handleScan = () => {
    hapt.tap();
    nav.navigate('ScanModal');
  };

  const handleOpenPlan = () => {
    hapt.tap();
    nav.navigate('Plan');
  };

  const handleOpenProgress = () => {
    hapt.select();
    const parent = nav.getParent?.();
    parent?.navigate?.('RoutineTab');
  };

  const handleOpenProducts = () => {
    hapt.select();
    const parent = nav.getParent?.();
    parent?.navigate?.('ProductsTab');
  };

  const handleOpenAssistant = () => {
    hapt.select();
    const parent = nav.getParent?.();
    parent?.navigate?.('AssistantTab');
  };

  const bottomClearance = insets.bottom + 120;

  // ---------- Day 0 ----------
  if (scans.length === 0) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar style="dark" />
        <BrandBar initials={user.initials ?? firstName?.[0]?.toUpperCase() ?? null} />
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomClearance }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.day0Wrap}>
            <Text style={styles.greeting} maxFontSizeMultiplier={1.2}>
              {greeting}
            </Text>
            <Text
              style={styles.day0Headline}
              maxFontSizeMultiplier={1.15}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.88}
            >
              Let{'\u2019'}s meet your skin.
            </Text>
            <View style={styles.day0Mark}>
              <PuraMark size={112} variant="idle" glow />
            </View>
            <PrimaryCta label="Start your first scan" onPress={handleScan} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------- Day 1+ ----------
  const concerns = latest ? getConcerns(latest, previous) : [];
  const primary = concerns.find((c) => c.severity !== 'calm') ?? concerns[0];

  // Skin Score is the spine — one source of truth across Home / Plan /
  // Progress. All score language on this page reads from `score`.
  const score = computeSkinScore(scans);
  const delta = score.deltaSinceLast ?? score.deltaSinceFirst ?? 0;
  const daysIn =
    first && latest
      ? Math.max(
          1,
          Math.round(
            (new Date(latest.capturedAt).getTime() -
              new Date(first.capturedAt).getTime()) /
              86400000
          )
        )
      : 1;

  // v18.1 — recProduct is now the LIVE retrieval result; the AI's
  // matchScore is already on the candidate so we don't need to
  // cross-reference aiTopMatches.

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <BrandBar initials={user.initials ?? firstName?.[0]?.toUpperCase() ?? null} />
      {/* v10.28 — dev-only AI proxy status banner. Hidden unless
          EXPO_PUBLIC_PURA_AI_DEV_BADGE=1. Renders only when the proxy
          is unreachable or unconfigured so the dev knows the live AI
          path isn't actually serving requests. */}
      <AIStatusBanner />

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomClearance }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── A. Hero — Skin Score dial is the iconic object. v10.1:
             redundant "SKIN SCORE" kicker dropped. The dial's internal
             tier label already carries the kicker semantics, so the
             composition now reads greeting → dial → headline as one
             coherent unit. ─────── */}
        <View style={styles.heroBlock}>
          <Text style={styles.greeting} maxFontSizeMultiplier={1.2}>
            {greeting}
          </Text>

          <View style={styles.dialWrap}>
            <SkinScoreDial
              value={score.value}
              size={204}
              showTier
              previousValue={previous?.overallScore ?? null}
              deltaCaption={deltaPhrase(score.deltaSinceLast).toLowerCase()}
            />
          </View>
          {/* v19.0 — clear semantics on the Home score. Reads as
              "Skin score · Based on visible signals" beneath the
              dial without competing with the existing headline. */}
          <View style={styles.scoreSemanticRow}>
            <Text
              style={styles.scoreSemanticLabel}
              maxFontSizeMultiplier={1.1}
            >
              SKIN SCORE
            </Text>
            <View style={styles.scoreSemanticDivider} />
            <Text
              style={styles.scoreSemanticHelper}
              maxFontSizeMultiplier={1.2}
              numberOfLines={1}
            >
              Based on visible signals
            </Text>
          </View>

          <Text
            style={styles.scoreHeadline}
            maxFontSizeMultiplier={1.15}
            numberOfLines={2}
          >
            {score.headline}
          </Text>
          {/* v19.2 — buildSkinScoreWhy line removed. The dial's
              delta caption + the new "SKIN SCORE · Based on visible
              signals" semantic row + the editorial headline already
              communicate the score's meaning. The whyline read as
              a fourth layer and made the home feel busier than
              the result screen. Removing it brings Home into
              parity with the result-screen score philosophy. */}
        </View>

        {/* ── B. What changed — 3 concise findings max ──────────────── */}
        <View style={styles.glanceBlock}>
          <Text style={styles.whatChangedKicker} maxFontSizeMultiplier={1.1}>
            WHAT CHANGED
          </Text>
          <GlanceStrip concerns={concerns} />
        </View>

        {/* ── C. Next best action ─────────────────────────────────────── */}
        <Pressable
          onPress={handleOpenPlan}
          accessibilityRole="button"
          accessibilityLabel="Open today's plan"
          style={({ pressed }) => [
            styles.nextActionRow,
            pressed && { opacity: 0.92 },
          ]}
        >
          <View style={styles.nextActionBadge}>
            <Text style={styles.nextActionBadgeText}>→</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nextActionKicker} maxFontSizeMultiplier={1.1}>
              YOUR PLAN
            </Text>
            <Text
              style={styles.nextActionLine}
              maxFontSizeMultiplier={1.2}
              numberOfLines={1}
            >
              What should I do tonight?
            </Text>
          </View>
          <CaretRight size={15} color={palette.inkTertiary} weight="bold" />
        </Pressable>

        {/* ── D. Progress teaser ──────────────────────────────────────── */}
        {/* v10.1 — teaser rebuilt so the delta is the hero, not buried in
            prose. The big serif delta reads at a glance; the caption
            gives it context; the whole row tappable. */}
        {first && latest && latest.id !== first.id ? (
          <Pressable
            onPress={handleOpenProgress}
            accessibilityRole="button"
            accessibilityLabel="Open progress"
            style={({ pressed }) => [
              styles.progressTeaser,
              pressed && { opacity: 0.92 },
            ]}
          >
            <View style={styles.progressTeaserLeft}>
              <Text style={styles.progressTeaserKicker} maxFontSizeMultiplier={1.1}>
                {`DAY ${daysIn} \u00B7 SINCE DAY 1`}
              </Text>
              <View style={styles.progressTeaserValueRow}>
                <Text
                  style={[
                    styles.progressTeaserDelta,
                    { color: progressTeaserColor(delta) },
                  ]}
                  maxFontSizeMultiplier={1.1}
                >
                  {progressTeaserLabel(delta)}
                </Text>
                <Text style={styles.progressTeaserUnit} maxFontSizeMultiplier={1.1}>
                  points
                </Text>
              </View>
              <Text
                style={styles.progressTeaserCaption}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
              >
                {progressTeaserCaption(delta, score.value)}
              </Text>
            </View>
            <CaretRight size={14} color={palette.inkTertiary} weight="bold" />
          </Pressable>
        ) : null}

        {/* ── E. Product teaser — v18.1 LIVE retrieval ──────────────
            The PICKED FOR YOU card is now backed by the live AI
            retrieval engine, not the seed catalog. We fire
            lookupForScan() once per scan and render the top candidate
            as a LiveProductCard hero. seedProducts no longer touches
            this screen. */}
        <View style={styles.recBlock}>
          <Text style={styles.recCardKicker} maxFontSizeMultiplier={1.1}>
            PICKED FOR YOU
          </Text>
          {recCandidate ? (
            <LiveProductCard candidate={recCandidate} variant="hero" />
          ) : recLoading ? (
            <LiveProductsUnavailable
              variant="loading"
              scope="for your skin"
            />
          ) : (
            <LiveProductsUnavailable
              variant={recError ? 'unavailable' : 'empty'}
              scope="for your skin"
              onRetry={retryRec}
            />
          )}
        </View>

        {/* ── F. Entry points ─────────────────────────────────────────── */}
        {/* v10 — launcher-style three-tile row is gone. A hero "Scan again"
            CTA carries the primary action weight; a tight two-row footer
            handles secondary navigation without faking its importance. */}
        <View style={styles.entryBlock}>
          <Pressable
            onPress={handleScan}
            accessibilityRole="button"
            accessibilityLabel="Scan again"
            style={({ pressed }) => [
              styles.entryPrimary,
              pressed && { opacity: 0.94, transform: [{ scale: 0.985 }] },
            ]}
          >
            <ScanSmiley size={18} color={palette.inkInverse} weight="duotone" />
            <Text style={styles.entryPrimaryLabel} maxFontSizeMultiplier={1.15}>
              Scan again
            </Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.entryPrimaryMeta} maxFontSizeMultiplier={1.1}>
              30s
            </Text>
            <ArrowRight size={14} color={palette.inkInverse} weight="bold" />
          </Pressable>

          <View style={styles.entrySecondaryWrap}>
            <EntryLinkRow
              Icon={DropIcon}
              label="Browse products"
              helper="Matched to your last scan"
              onPress={handleOpenProducts}
            />
            <View style={styles.entrySecondaryDivider} />
            <EntryLinkRow
              Icon={SparkleIcon}
              label="Ask about your skin"
              helper="Grounded in your last scan"
              onPress={handleOpenAssistant}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// Pieces
// ============================================================================

function BrandBar({ initials }: { initials: string | null }) {
  const nav = useNavigation<any>();

  const openProfile = () => {
    hapt.select();
    // ProfileSheet is registered on the RootStack; dispatch there so it
    // overlays the whole app (not just the Home stack).
    const parent = nav.getParent?.();
    // Walk up to the root navigator so we can open the profile sheet
    // regardless of how deep we are in the nested stacks.
    const root = parent?.getParent?.() ?? parent ?? nav;
    root.navigate('ProfileSheet');
  };

  return (
    <View style={styles.brandBar}>
      <View style={styles.brandLeft}>
        <PuraMark size={32} variant="idle" />
        <Text style={styles.brandWord} maxFontSizeMultiplier={1.1}>
          Pura AI
        </Text>
      </View>
      <View style={{ flex: 1 }} />
      {initials ? (
        <Pressable
          onPress={openProfile}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          hitSlop={10}
          style={({ pressed }) => [
            styles.avatarPill,
            pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Text style={styles.avatarInitials} maxFontSizeMultiplier={1.1}>
            {initials}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const CONCERN_ICON: Record<Concern['category'], React.FC<PhosphorIconProps>> = {
  breakouts: SparkleIcon as React.FC<PhosphorIconProps>,
  hydration: DropIcon as React.FC<PhosphorIconProps>,
  texture: GridNineIcon as React.FC<PhosphorIconProps>,
  tone: MoonIcon as React.FC<PhosphorIconProps>,
};

function GlanceStrip({ concerns }: { concerns: Concern[] }) {
  // v10.2 — editorial recomposition. Three equal concern cards are gone.
  // The top concern gets a larger treatment (the protagonist); the next
  // two render as tight hairline rows beneath. Same three items, actual
  // hierarchy. Reads as "this is the pattern this week, and here's what
  // else is on the radar."
  const nonCalm = concerns.filter((c) => c.severity !== 'calm');
  const ordered = nonCalm.length > 0 ? nonCalm : concerns;
  const hero = ordered[0];
  const secondaries = ordered.slice(1, 3);
  if (!hero) return null;

  const heroColor = colorFor(hero.severity);
  const HeroIcon = CONCERN_ICON[hero.category];

  return (
    <View>
      <View
        style={[
          styles.concernHero,
          { backgroundColor: withAlpha(heroColor, 0.1) },
        ]}
      >
        <View
          style={[styles.concernHeroRail, { backgroundColor: heroColor }]}
          pointerEvents="none"
        />
        <View
          style={[
            styles.concernHeroIcon,
            { backgroundColor: withAlpha(heroColor, 0.18) },
          ]}
        >
          <HeroIcon size={20} color={heroColor} weight="duotone" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.concernHeroLabel} maxFontSizeMultiplier={1.15} numberOfLines={1}>
            {CATEGORY_LABEL[hero.category]}
          </Text>
          <Text style={styles.concernHeroRegion} maxFontSizeMultiplier={1.15} numberOfLines={1}>
            {`on your ${hero.region}`}
          </Text>
        </View>
        <View
          style={[
            styles.concernHeroPill,
            { backgroundColor: heroColor },
          ]}
        >
          <Text style={styles.concernHeroPillText} maxFontSizeMultiplier={1.1}>
            {severityLabel(hero.severity)}
          </Text>
        </View>
      </View>

      {secondaries.length > 0 ? (
        <View style={styles.concernSecondaryWrap}>
          {secondaries.map((c, i) => {
            const color = colorFor(c.severity);
            const Icon = CONCERN_ICON[c.category];
            return (
              <View
                key={c.category}
                style={[
                  styles.concernSecondaryRow,
                  i > 0 && styles.concernSecondaryDivider,
                ]}
              >
                <View
                  style={[
                    styles.concernSecondaryIcon,
                    { backgroundColor: withAlpha(color, 0.14) },
                  ]}
                >
                  <Icon size={13} color={color} weight="duotone" />
                </View>
                <Text style={styles.concernSecondaryLabel} maxFontSizeMultiplier={1.1} numberOfLines={1}>
                  {CATEGORY_LABEL[c.category]}
                </Text>
                <Text style={styles.concernSecondaryRegion} maxFontSizeMultiplier={1.1} numberOfLines={1}>
                  {`\u00B7 ${c.region}`}
                </Text>
                <View style={{ flex: 1 }} />
                <Text
                  style={[styles.concernSecondarySeverity, { color }]}
                  maxFontSizeMultiplier={1.1}
                >
                  {severityLabel(c.severity)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function withAlpha(hex: string, a: number): string {
  if (hex.length !== 7 || !hex.startsWith('#')) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function PrimaryCta({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.cta,
        pressed && { opacity: 0.94, transform: [{ scale: 0.985 }] },
      ]}
    >
      <Text style={styles.ctaLabel} maxFontSizeMultiplier={1.15}>
        {label}
      </Text>
      <ArrowRight size={15} color={palette.inkInverse} weight="duotone" />
    </Pressable>
  );
}

/**
 * v10.5 — EntryLinkRow refined. The Scan CTA absorbed the primary
 * action weight (v10); the product pick absorbed the premium card
 * weight (v10.4). The two secondary link rows were the remaining weak
 * element on Home — reading as launcher chrome.
 *
 * Refinements:
 *   • Icon cell widened to 34×34 with a palette.bgDeep background so
 *     it reads as an icon stage, not a dot.
 *   • Label upgraded to InstrumentSerif-SemiBold 15pt so the two
 *     entries match Home's editorial voice (Plan / PICKED FOR YOU
 *     also use serif labels).
 *   • Helper stays Inter, dropped to 11.5pt with letterSpacing 0.1
 *     so it reads as a caption, not a subtitle.
 *   • ArrowRight replaces CaretRight at 14pt — the two secondary
 *     rows now rhyme with the Scan CTA's arrow iconography.
 */
function EntryLinkRow({
  Icon,
  label,
  helper,
  onPress,
}: {
  Icon: React.FC<any>;
  label: string;
  helper: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.entryLinkRow,
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={styles.entryLinkIconWrap}>
        <Icon size={17} color={palette.ink} weight="duotone" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.entryLinkLabel} maxFontSizeMultiplier={1.15}>
          {label}
        </Text>
        <Text style={styles.entryLinkHelper} maxFontSizeMultiplier={1.15}>
          {helper}
        </Text>
      </View>
      <ArrowRight size={14} color={palette.inkTertiary} weight="duotone" />
    </Pressable>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function buildGreeting(firstName: string | null): string {
  const h = new Date().getHours();
  const prefix =
    h < 5
      ? 'Late'
      : h < 12
      ? 'Good morning'
      : h < 18
      ? 'Good afternoon'
      : 'Good evening';
  return firstName ? `${prefix}, ${firstName}.` : `${prefix}.`;
}

/**
 * v10.1 — progress teaser helpers. The teaser renders a big serif delta
 * (e.g. "+12") in the tier-appropriate color, with a small caption below
 * that carries the score value + direction narrative. No more prose-only
 * row.
 */
function progressTeaserLabel(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '\u00B10';
}

function progressTeaserColor(delta: number): string {
  if (delta > 0) return palette.mossDeep;
  if (delta < 0) return palette.rust;
  return palette.inkSecondary;
}

function progressTeaserCaption(delta: number, scoreValue: number): string {
  if (delta > 0) return `Skin Score ${scoreValue} \u00B7 trending up.`;
  if (delta < 0) return `Skin Score ${scoreValue} \u00B7 below day 1.`;
  return `Skin Score ${scoreValue} \u00B7 holding steady.`;
}

/**
 * v10.4 — one-line "why" for the Home product pick, tied to the user's
 * current top concern. Falls back to a generic match line when the user
 * has no scan-derived concern yet.
 */
// v18.1 — `buildHomeRecReason`, `pickRecProduct`, and `tintForProduct`
// removed. The Home product pick now uses LiveProductCard which
// renders the AI's own matchReason and does not need a seed-tinted
// placeholder.

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

  // Brand bar — bigger drop + serif "Pura AI" wordmark
  brandBar: {
    height: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandWord: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    letterSpacing: -0.3,
    color: palette.ink,
  },
  avatarPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.3,
    color: palette.inkSecondary,
  },

  // A — Hero (Skin Score as the spine)
  heroBlock: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 4,
  },
  greeting: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    letterSpacing: 0.1,
    color: palette.inkSecondary,
    marginBottom: 18,
  },
  dialWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  // v19.0 — score semantics row sits between the dial and the
  // headline. "SKIN SCORE · Based on visible signals" — clarifies
  // what the number is without competing with the dial.
  scoreSemanticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  scoreSemanticLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  scoreSemanticDivider: {
    width: 1,
    height: 10,
    backgroundColor: palette.hairline,
  },
  scoreSemanticHelper: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 12.5,
    color: palette.inkTertiary,
  },
  // v10.1 — headline grew. With the redundant kicker gone, the headline
  // carries the whole post-dial beat. 26pt serif + tighter letter-
  // spacing + a bit more top gap lets the dial breathe and lets the
  // sentence land.
  scoreHeadline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: palette.ink,
    marginTop: 28,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // v10.13 — Skin Score why-line beneath the headline.
  scoreWhyLine: {
    marginTop: 8,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 21,
    color: palette.inkSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  whatChangedKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // B — Glance strip
  glanceBlock: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  // v10.2 — hero concern (protagonist) + secondary rows. Three equal
  // cards was a card stack; this is a pattern with consequence.
  concernHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingLeft: 19, // 16 base + 3 for the rail
    paddingRight: 14,
    borderRadius: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  concernHeroRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  concernHeroIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  concernHeroLabel: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: palette.ink,
  },
  concernHeroRegion: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    lineHeight: 18,
    color: palette.inkSecondary,
    marginTop: 2,
  },
  concernHeroPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  concernHeroPillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: palette.inkInverse,
  },
  concernSecondaryWrap: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    overflow: 'hidden',
  },
  concernSecondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  concernSecondaryDivider: {
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
  },
  concernSecondaryIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  concernSecondaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: -0.1,
    color: palette.ink,
  },
  concernSecondaryRegion: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.inkTertiary,
    marginLeft: 2,
  },
  concernSecondarySeverity: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  // C — Next action
  nextActionRow: {
    marginTop: 32,
    marginHorizontal: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  nextActionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,250,252,0.10)',
  },
  nextActionBadgeText: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    color: palette.inkInverse,
  },
  nextActionKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: 'rgba(248,250,252,0.55)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  nextActionLine: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: palette.inkInverse,
  },

  // D — Progress teaser (v10.1 editorial rebuild)
  progressTeaser: {
    marginTop: 18,
    marginHorizontal: 20,
    paddingVertical: 14,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTeaserLeft: {
    flex: 1,
  },
  progressTeaserKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  progressTeaserValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  progressTeaserDelta: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: -1.0,
    fontVariant: ['tabular-nums'],
  },
  progressTeaserUnit: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    color: palette.inkTertiary,
  },
  progressTeaserCaption: {
    marginTop: 4,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.inkSecondary,
  },
  sectionKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  // v18.1 — recBlock wraps the LiveProductCard hero with a kicker.
  recBlock: {
    marginTop: 22,
    marginHorizontal: 20,
    gap: 12,
  },
  recCardKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },

  // F — Entry block (v10). Primary ink CTA + two quieter link rows.
  // Replaces the three-flat-tile launcher pattern.
  entryBlock: {
    marginTop: 28,
    marginHorizontal: 20,
  },
  entryPrimary: {
    height: 58,
    borderRadius: 18,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 10,
  },
  entryPrimaryLabel: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    letterSpacing: -0.2,
    color: palette.inkInverse,
  },
  entryPrimaryMeta: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: 'rgba(248,250,252,0.55)',
    marginRight: 6,
  },
  entrySecondaryWrap: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    overflow: 'hidden',
  },
  entrySecondaryDivider: {
    height: 1,
    marginLeft: 58,
    backgroundColor: palette.hairline,
  },
  // v10.5 — entry link rows now carry editorial weight (serif label,
  // caption helper) so they rhyme with the Plan page and PICKED FOR
  // YOU card instead of reading as launcher chrome.
  entryLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  entryLinkIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryLinkLabel: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  entryLinkHelper: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    letterSpacing: 0.1,
    color: palette.inkTertiary,
    marginTop: 2,
  },

  // Day 0
  day0Wrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'stretch',
  },
  day0Headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.0,
    color: palette.ink,
    marginBottom: 20,
  },
  day0Mark: {
    alignItems: 'center',
    paddingVertical: 56,
  },

  // CTA
  cta: {
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.1,
    color: palette.inkInverse,
  },
});

import React, { useMemo } from 'react';
import {
  Image,
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
  ArrowUp,
  ArrowDown,
  Minus,
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
import {
  computeSkinScore,
  formatDelta,
  sinceLastPhrase,
} from '@/utils/skinScore';
import { seedProducts } from '@/data/seed';
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
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const scans = useAppStore((s) => s.scans);
  const user = useAppStore(
    useShallow((s) => ({
      name: s.name,
      initials: s.user?.initials ?? null,
    }))
  );

  const latest = scans[scans.length - 1];
  const previous = scans.length >= 2 ? scans[scans.length - 2] : undefined;
  const first = scans[0];

  const firstName = (user.name || '').split(/\s+/)[0] || null;
  const greeting = useMemo(() => buildGreeting(firstName), [firstName]);

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
    parent?.navigate?.('ProgressTab');
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

  // Product rec — pick one that matches the primary concern's category
  const recProduct = useMemo(
    () => pickRecProduct(primary?.category),
    [primary]
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <BrandBar initials={user.initials ?? firstName?.[0]?.toUpperCase() ?? null} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomClearance }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── A. Hero — Skin Score dial is the iconic object ─────── */}
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
              deltaCaption={
                score.deltaSinceLast !== null
                  ? `${formatDelta(
                      score.deltaSinceLast
                    )} since last scan`
                  : 'new reading'
              }
            />
          </View>

          <View style={styles.scoreKickerBlock}>
            <Text style={styles.scoreKicker} maxFontSizeMultiplier={1.1}>
              SKIN SCORE
            </Text>
          </View>

          <Text
            style={styles.scoreHeadline}
            maxFontSizeMultiplier={1.15}
            numberOfLines={2}
          >
            {score.headline}
          </Text>
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
        {first && latest && latest.id !== first.id ? (
          <Pressable
            onPress={handleOpenProgress}
            accessibilityRole="button"
            accessibilityLabel="Open progress"
            style={({ pressed }) => [
              styles.progressTeaser,
              pressed && { opacity: 0.9 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
                {`${daysIn} DAYS IN`}
              </Text>
              <Text
                style={styles.progressLine}
                maxFontSizeMultiplier={1.15}
                numberOfLines={2}
              >
                {buildProgressLine(score.deltaSinceFirst, score.value)}
              </Text>
            </View>
            <ProgressDelta delta={delta} />
          </Pressable>
        ) : null}

        {/* ── E. Product teaser (compact, single row) ─────────────────── */}
        {recProduct ? (
          <Pressable
            onPress={() => {
              hapt.select();
              nav.navigate('ProductDetail', {
                productId: recProduct.id,
                tint: recProduct.tint,
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={`${recProduct.brand} ${recProduct.name}`}
            style={({ pressed }) => [
              styles.recRow,
              pressed && { opacity: 0.92 },
            ]}
          >
            <View
              style={[
                styles.recImage,
                { backgroundColor: tintForProduct(recProduct) },
              ]}
            >
              {recProduct.imageUri ? (
                <Image
                  source={{ uri: recProduct.imageUri }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                />
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recKicker} maxFontSizeMultiplier={1.1}>
                PICKED FOR YOU
              </Text>
              <Text
                style={styles.recName}
                numberOfLines={1}
                maxFontSizeMultiplier={1.15}
                adjustsFontSizeToFit
                minimumFontScale={0.9}
              >
                {recProduct.name}
              </Text>
            </View>
            <Text style={styles.recPrice} maxFontSizeMultiplier={1.1}>
              {`$${Number.isInteger(recProduct.price) ? recProduct.price : recProduct.price.toFixed(2)}`}
            </Text>
          </Pressable>
        ) : null}

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
  // v9.5 — concern cards (was pills). Each card carries:
  //   • Leading Phosphor glyph in a severity-tinted square
  //   • Category label + region as a two-line stack
  //   • Trend chip on the right showing tier transition with arrow
  // Top 3 concerns prioritized by severity; calm fallback preserved.
  const nonCalm = concerns.filter((c) => c.severity !== 'calm');
  const top = (nonCalm.length > 0 ? nonCalm : concerns).slice(0, 3);
  return (
    <View style={styles.glanceStack}>
      {top.map((c) => {
        const color = colorFor(c.severity);
        const Icon = CONCERN_ICON[c.category];
        return (
          <View key={c.category} style={styles.concernCard}>
            <View
              style={[
                styles.concernIconWrap,
                { backgroundColor: withAlpha(color, 0.14) },
              ]}
            >
              <Icon size={16} color={color} weight="duotone" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={styles.concernCardLabel}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
              >
                {CATEGORY_LABEL[c.category]}
              </Text>
              <Text
                style={styles.concernCardRegion}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
              >
                {c.region}
              </Text>
            </View>
            <View
              style={[
                styles.concernCardPill,
                { backgroundColor: withAlpha(color, 0.12) },
              ]}
            >
              <Text
                style={[styles.concernCardPillText, { color }]}
                maxFontSizeMultiplier={1.1}
              >
                {severityLabel(c.severity)}
              </Text>
            </View>
          </View>
        );
      })}
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

/**
 * Tight chip for the delta next to the score hero. Green up / warm down /
 * neutral flat — visually echoes the Skin Score tier.
 */
function ScoreDeltaChip({ delta }: { delta: number }) {
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const bg =
    delta > 0
      ? palette.mossLight
      : delta < 0
      ? palette.rustLight
      : palette.bgDeep;
  const fg =
    delta > 0
      ? palette.mossDeep
      : delta < 0
      ? palette.rust
      : palette.inkSecondary;
  return (
    <View style={[styles.scoreDeltaChip, { backgroundColor: bg }]}>
      <Icon size={12} color={fg} weight="bold" />
      <Text
        style={[styles.scoreDeltaChipText, { color: fg }]}
        maxFontSizeMultiplier={1.1}
      >
        {formatDelta(delta)}
      </Text>
    </View>
  );
}

function ProgressDelta({ delta }: { delta: number }) {
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const color =
    delta > 0 ? palette.moss : delta < 0 ? palette.rust : palette.inkTertiary;
  const text = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '0';
  return (
    <View style={styles.progressDelta}>
      <Icon size={13} color={color} weight="duotone" />
      <Text
        style={[styles.progressDeltaLabel, { color }]}
        maxFontSizeMultiplier={1.15}
      >
        {text}
      </Text>
    </View>
  );
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
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={styles.entryLinkIconWrap}>
        <Icon size={16} color={palette.ink} weight="duotone" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.entryLinkLabel} maxFontSizeMultiplier={1.15}>
          {label}
        </Text>
        <Text style={styles.entryLinkHelper} maxFontSizeMultiplier={1.15}>
          {helper}
        </Text>
      </View>
      <CaretRight size={13} color={palette.inkTertiary} weight="bold" />
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
 * Progress teaser line — grounded in the Skin Score delta since day 1, not
 * abstract. "Up 12 since Day 1" is the default; score-specific narrative
 * is reserved for the Progress screen.
 */
function buildProgressLine(
  deltaSinceFirst: number | null,
  scoreValue: number,
): string {
  if (deltaSinceFirst === null || deltaSinceFirst === 0) {
    return `Skin Score ${scoreValue} — no change since day 1.`;
  }
  if (deltaSinceFirst > 0) {
    return `Skin Score ${scoreValue} — up ${deltaSinceFirst} since day 1.`;
  }
  return `Skin Score ${scoreValue} — down ${Math.abs(deltaSinceFirst)} since day 1.`;
}

function pickRecProduct(category: Concern['category'] | undefined) {
  const preferred: string[] =
    category === 'breakouts'
      ? ['spot', 'serum', 'toner']
      : category === 'hydration'
      ? ['moisturizer', 'serum']
      : category === 'texture'
      ? ['serum', 'mask']
      : category === 'tone'
      ? ['serum', 'spf']
      : ['serum'];
  for (const c of preferred) {
    const m = seedProducts.find((p) => p.category === c);
    if (m) return m;
  }
  return seedProducts[0] ?? null;
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
  scoreKickerBlock: {
    alignItems: 'center',
    marginTop: 4,
    gap: 10,
  },
  scoreKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  scoreDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreDeltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scoreDeltaChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.1,
    fontVariant: ['tabular-nums'],
  },
  scoreSinceLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.inkTertiary,
    flexShrink: 1,
  },
  scoreFirstLabel: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    color: palette.inkTertiary,
  },
  scoreHeadline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 16,
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
  glanceStack: {
    gap: 10,
  },
  concernCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
  },
  concernIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  concernCardLabel: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: -0.3,
    color: palette.ink,
  },
  concernCardRegion: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 15,
    color: palette.inkTertiary,
    marginTop: 2,
  },
  concernCardPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  concernCardPillText: {
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

  // D — Progress teaser
  progressTeaser: {
    marginTop: 16,
    marginHorizontal: 20,
    paddingVertical: 16,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sectionKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  progressLine: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  progressDelta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: palette.bgDeep,
  },
  progressDeltaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.1,
    fontVariant: ['tabular-nums'],
  },

  // E — Product rec row
  recRow: {
    marginTop: 14,
    marginHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  recImage: {
    width: 50,
    height: 58,
    borderRadius: 10,
    overflow: 'hidden',
  },
  recKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.clay,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  recName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  recPrice: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
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
  entryLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  entryLinkIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryLinkLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: -0.1,
    color: palette.ink,
  },
  entryLinkHelper: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.inkTertiary,
    marginTop: 1,
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

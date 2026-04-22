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
} from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { useAppStore } from '@/store/useAppStore';
import { palette, statusColor } from '@/theme';
import { hapt } from '@/utils/haptics';
import { useShallow } from 'zustand/react/shallow';
import { CATEGORY_LABEL, getConcerns, severityLabel } from '@/utils/concerns';
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
  const insightLine = buildInsightLine(concerns);

  const delta =
    first && latest && latest.id !== first.id
      ? latest.overallScore - first.overallScore
      : 0;
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
        {/* ── A. Hero insight ──────────────────────────────────────────── */}
        <View style={styles.heroBlock}>
          <Text style={styles.greeting} maxFontSizeMultiplier={1.2}>
            {greeting}
          </Text>
          <Text
            style={styles.insight}
            maxFontSizeMultiplier={1.15}
            numberOfLines={3}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {insightLine}
          </Text>
        </View>

        {/* ── B. At a glance ──────────────────────────────────────────── */}
        <View style={styles.glanceBlock}>
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
                {buildProgressLine(delta, concerns, previous, latest)}
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
        <View style={styles.entryRow}>
          <EntryTile
            Icon={ScanSmiley}
            label="Scan"
            onPress={handleScan}
            primary
          />
          <EntryTile
            Icon={DropIcon}
            label="Products"
            onPress={handleOpenProducts}
          />
          <EntryTile
            Icon={SparkleIcon}
            label="Assistant"
            onPress={handleOpenAssistant}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// Pieces
// ============================================================================

function BrandBar({ initials }: { initials: string | null }) {
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
        <View style={styles.avatarPill}>
          <Text style={styles.avatarInitials} maxFontSizeMultiplier={1.1}>
            {initials}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function GlanceStrip({ concerns }: { concerns: Concern[] }) {
  // Render four tight status pills (breakouts / hydration / texture / tone).
  // Each shows a label + a single-word severity. No numbers, no icons.
  const byCat = Object.fromEntries(concerns.map((c) => [c.category, c]));
  return (
    <View style={styles.glanceStrip}>
      {(['breakouts', 'hydration', 'texture', 'tone'] as const).map((cat) => {
        const c = byCat[cat];
        if (!c) return null;
        const color = colorFor(c.severity);
        return (
          <View key={cat} style={styles.glancePill}>
            <View style={[styles.glanceDot, { backgroundColor: color }]} />
            <Text style={styles.glanceLabel} maxFontSizeMultiplier={1.1}>
              {CATEGORY_LABEL[cat]}
            </Text>
            <Text
              style={[styles.glanceSeverity, { color }]}
              maxFontSizeMultiplier={1.1}
            >
              {severityLabel(c.severity)}
            </Text>
          </View>
        );
      })}
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

function EntryTile({
  Icon,
  label,
  onPress,
  primary = false,
}: {
  Icon: React.FC<any>;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.entryTile,
        primary && styles.entryTilePrimary,
        pressed && { opacity: 0.92 },
      ]}
    >
      <Icon
        size={20}
        color={primary ? palette.inkInverse : palette.ink}
        weight="duotone"
      />
      <Text
        style={[
          styles.entryLabel,
          { color: primary ? palette.inkInverse : palette.ink },
        ]}
        maxFontSizeMultiplier={1.15}
      >
        {label}
      </Text>
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

function buildInsightLine(concerns: Concern[]): string {
  const nonCalm = concerns.filter((c) => c.severity !== 'calm');
  if (nonCalm.length === 0) return 'Your skin is settled today.';
  const top = nonCalm[0];
  switch (top.category) {
    case 'breakouts':
      return `One active breakout on your ${top.region}.`;
    case 'hydration':
      return `Your ${top.region} are running a little dry.`;
    case 'texture':
      return `Texture is slightly uneven on your ${top.region}.`;
    case 'tone':
      return `Dark marks still visible on your ${top.region}.`;
  }
}

function buildProgressLine(
  delta: number,
  concerns: Concern[],
  previous: Scan | undefined,
  latest: Scan
): string {
  if (delta > 3) return 'Gaining ground across the board.';
  if (delta > 0) return 'Slight improvement since day 1.';
  if (delta < -3) return 'Something shifted. Worth a closer look.';
  if (delta < 0) return 'Down a touch from your starting point.';
  // Flat: pick a narrative from concerns
  const improved = concerns.find(
    (c) => c.severity === 'mild' || c.severity === 'calm'
  );
  if (improved) return `${CATEGORY_LABEL[improved.category]} is holding steady.`;
  return 'Steady progress, no sudden swings.';
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

  // A — Hero
  heroBlock: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 8,
  },
  greeting: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    letterSpacing: 0.1,
    color: palette.inkSecondary,
    marginBottom: 14,
  },
  insight: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -1.0,
    color: palette.ink,
  },

  // B — Glance strip
  glanceBlock: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  glanceStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  glancePill: {
    flexGrow: 1,
    flexBasis: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: palette.bgDeep,
  },
  glanceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  glanceLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: palette.ink,
    letterSpacing: -0.1,
  },
  glanceSeverity: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    textAlign: 'right',
    letterSpacing: 0.2,
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

  // F — Entry tiles
  entryRow: {
    marginTop: 28,
    marginHorizontal: 20,
    flexDirection: 'row',
    gap: 10,
  },
  entryTile: {
    flex: 1,
    height: 68,
    borderRadius: 16,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  entryTilePrimary: {
    backgroundColor: palette.ink,
  },
  entryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
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

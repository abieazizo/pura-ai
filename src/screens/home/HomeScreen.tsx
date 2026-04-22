import React, { useMemo } from 'react';
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
import { ArrowRight, ArrowUp, ArrowDown, Minus } from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { useAppStore } from '@/store/useAppStore';
import { palette, statusColor } from '@/theme';
import { hapt } from '@/utils/haptics';
import { useShallow } from 'zustand/react/shallow';
import { CATEGORY_LABEL, buildTonightFocus, getConcerns } from '@/utils/concerns';
import type { Concern, Scan } from '@/types';

/**
 * Home — v8.2 command-center rebuild.
 *
 * Product rule: "only what helps them act."
 *
 * The page answers three questions in order, one takeaway each:
 *   1. What is Pura?                            → mark in the brand bar
 *   2. What matters for me today?               → insight line
 *   3. What should I do tonight?                → numbered checklist
 *   4. Am I improving?                          → progress pill
 *   (0. Can I scan again?)                      → the scan CTA, always present
 *
 * No score panel. No concern cards. No rec card. No "today's focus / secondary
 * rows". No tonight-row + rec-card duplication. No progress-line + secondary-
 * inline-CTA stacking. Everything the AI knows still lives in the results
 * screen (behind a tap) and progress tab; the home shows only what drives a
 * decision in the next 60 seconds.
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

  const handleOpenProgress = () => {
    hapt.select();
    // jump to the Progress tab for the fuller before/after + metric bars
    const parent = nav.getParent?.();
    parent?.navigate?.('ProgressTab');
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
              <PuraMark size={96} variant="idle" glow />
            </View>
            <PrimaryCta label="Start your first scan" onPress={handleScan} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------- Day 1+ ----------
  const concerns = latest ? getConcerns(latest, previous) : [];
  const tonight = buildTonightFocus(concerns);
  const topConcern = concerns[0];
  const insightLine = buildInsightLine(concerns);

  const delta =
    first && latest && latest.id !== first.id
      ? latest.overallScore - first.overallScore
      : 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <BrandBar initials={user.initials ?? firstName?.[0]?.toUpperCase() ?? null} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomClearance }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Module 1: Greeting + insight ──────────────────────────────── */}
        <View style={styles.block}>
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

        {/* ── Module 2: Tonight ──────────────────────────────────────────── */}
        {tonight.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
              TONIGHT
            </Text>
            <View style={styles.tonightSteps}>
              {tonight.slice(0, 3).map((step, i) => (
                <View key={i} style={styles.tonightStep}>
                  <Text style={styles.tonightStepNum} maxFontSizeMultiplier={1.1}>
                    {i + 1}
                  </Text>
                  <Text
                    style={styles.tonightStepText}
                    maxFontSizeMultiplier={1.2}
                    numberOfLines={2}
                  >
                    {compressTonight(step, topConcern)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Module 3: Progress snapshot ─────────────────────────────────── */}
        {first && latest && latest.id !== first.id ? (
          <View style={styles.block}>
            <Pressable
              onPress={handleOpenProgress}
              style={({ pressed }) => [
                styles.progressRow,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open progress"
            >
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(12, latest.overallScore))}%`,
                      backgroundColor: palette.clay,
                    },
                  ]}
                />
              </View>
              <ProgressDelta delta={delta} />
            </Pressable>
          </View>
        ) : null}

        {/* ── Module 4: Scan CTA ──────────────────────────────────────────── */}
        <View style={[styles.block, { marginTop: 32 }]}>
          <PrimaryCta label="Take today’s scan" onPress={handleScan} />
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
      <PuraMark size={24} variant="idle" />
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

function ProgressDelta({ delta }: { delta: number }) {
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const color =
    delta > 0 ? palette.moss : delta < 0 ? palette.rust : palette.inkTertiary;
  const text =
    delta > 0
      ? `Up ${delta} from day 1`
      : delta < 0
      ? `Down ${Math.abs(delta)} from day 1`
      : 'Steady from day 1';
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
 * One short serif line. Reads as a single insight, not a sentence-long
 * summary. If all concerns are calm we reassure in one phrase.
 */
function buildInsightLine(concerns: Concern[]): string {
  const nonCalm = concerns.filter((c) => c.severity !== 'calm');
  if (nonCalm.length === 0) return 'Your skin is settled today.';
  const top = nonCalm[0];
  // Hand-picked short phrases per category — keeps the home glanceable.
  switch (top.category) {
    case 'breakouts':
      return `One active breakout on your ${top.region}.`;
    case 'hydration':
      return `Your ${top.region} are running a little dry.`;
    case 'texture':
      return `Texture is slightly uneven on your ${top.region}.`;
    case 'tone':
      return `A few dark marks still visible on your ${top.region}.`;
  }
}

/**
 * Turn each concern's verbose nextStep into a 3-5 word imperative for
 * the home's tonight list. Home is glanceable; the full sentence lives
 * in the results-screen tonight sheet.
 */
function compressTonight(step: string, topConcern: Concern | undefined): string {
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
  // Generic fallback
  if (topConcern?.category === 'hydration') return 'Double up on hydration.';
  if (topConcern?.category === 'texture') return 'Keep exfoliation gentle.';
  if (topConcern?.category === 'tone') return 'Continue SPF + brightening.';
  const first = step.split(/[.;]/)[0];
  return first.length <= 42 ? `${first}.` : `${first.slice(0, 40)}\u2026`;
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },

  // Brand bar — thin, just mark + avatar. No wordmark. No streak pill.
  brandBar: {
    height: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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

  // Generic vertical block — spacing is the container, not a card border.
  block: {
    paddingHorizontal: 20,
    marginTop: 28,
  },

  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 14,
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
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.9,
    color: palette.ink,
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

  // Tonight steps — no card, just numbered rows on paper.
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
    width: 24,
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

  // Progress — slim row with bar + delta, tappable.
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.bgDeep,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressDelta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressDeltaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.1,
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

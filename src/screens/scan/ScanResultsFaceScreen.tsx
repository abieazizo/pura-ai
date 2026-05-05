/**
 * ScanResultsFaceScreen — v19.0 Layer 1 Overview.
 *
 * Replaces the v18.x "everything in one scroll" architecture with
 * a tight executive summary. The skin map + per-concern detail
 * lives in the new Layer 2 ScanResultDetailScreen reachable via
 * a quiet "See full skin map" secondary action.
 *
 * Layout (top to bottom):
 *   1. Top chrome (close)
 *   2. ScoreSummaryCard — small thumbnail + serif score + band
 *      + premium delta phrase + "Based on visible signals"
 *   3. Strong headline + one supporting line
 *   4. Hero product module (HeroMatchCard) with full state
 *      machine: loading / success / unavailable + retry
 *   5. ResultSecondaryActions — See full skin map / What should I
 *      do tonight? / See alternatives
 *   6. TONIGHT (3 steps, compact)
 *   7. ALSO MATCHED (alt carousel)
 *   8. Image quality note (only when relevant)
 *   9. Disclaimer
 *
 * The screen feels like an executive summary, not a report dump.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { X } from 'phosphor-react-native';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import { buildTonightFocus, getConcerns } from '@/utils/concerns';
import { computeSkinScore } from '@/utils/skinScore';
import { LiveProductCard } from '@/components/products/LiveProductCard';
import { LiveProductsUnavailable } from '@/components/products/LiveProductsUnavailable';
import { ScoreSummaryCard } from '@/components/scan/ScoreSummaryCard';
import { ResultSecondaryActions } from '@/components/scan/ResultSecondaryActions';
import { lookupForScan } from '@/api/liveProducts';
import type { RootStackParamList } from '@/navigation/types';
import type { Concern } from '@/types';
import type {
  FaceScanAnalysis,
  LiveProductCandidate,
} from '@/ai/ai-contracts';

export interface ScanResultsFaceScreenProps {
  scanId: string;
}

export function ScanResultsFaceScreen({
  scanId,
}: ScanResultsFaceScreenProps) {
  const scans = useAppStore((s) => s.scans);
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const scanNav =
    useNavigation<{ navigate: (name: string, params?: unknown) => void }>();

  const scan = scans.find((s) => s.id === scanId) ?? scans[scans.length - 1];
  const previous = scan
    ? scans.filter((s) => s.capturedAt < scan.capturedAt).slice(-1)[0]
    : undefined;

  const concerns = scan ? getConcerns(scan, previous) : [];

  // Hero product retrieval state machine.
  const [liveCandidates, setLiveCandidates] = useState<
    LiveProductCandidate[]
  >([]);
  const [liveLoading, setLiveLoading] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<boolean>(false);
  const [liveAttempt, setLiveAttempt] = useState<number>(0);

  useEffect(() => {
    if (!scan?.aiAnalysis) return;
    let cancelled = false;
    setLiveLoading(true);
    setLiveError(false);
    lookupForScan(scan, { fresh: liveAttempt > 0 })
      .then((picks) => {
        if (cancelled) return;
        setLiveCandidates(picks);
        setLiveError(picks.length === 0);
      })
      .catch(() => {
        if (cancelled) return;
        setLiveCandidates([]);
        setLiveError(true);
      })
      .finally(() => {
        if (cancelled) return;
        setLiveLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scan?.id, scan?.aiAnalysis, liveAttempt]);

  const heroLive = liveCandidates[0] ?? null;
  const altLive = liveCandidates.slice(1, 6);
  const retryLive = () => setLiveAttempt((n) => n + 1);

  // v19.0 — premium headline + one supporting line.
  const headline = useMemo(
    () => buildPremiumHeadline(concerns, scan?.aiAnalysis),
    [concerns, scan?.aiAnalysis]
  );
  const support = useMemo(
    () => buildPremiumSupport(concerns, scan?.aiAnalysis),
    [concerns, scan?.aiAnalysis]
  );

  // Tonight steps — keep the AI's tonight focus when present.
  const tonight = useMemo(() => {
    if (!scan) return [] as string[];
    const aiTonight =
      scan.aiAnalysis?.next_focus.tonight.filter(
        (s) => s.trim().length > 0
      ) ?? [];
    if (aiTonight.length > 0) return aiTonight.slice(0, 3);
    return buildTonightFocus(concerns).slice(0, 3);
  }, [scan, concerns]);

  // Refs for "scroll to" secondary actions.
  const scrollRef = useRef<ScrollView>(null);
  const tonightYRef = useRef<number>(0);
  const altsYRef = useRef<number>(0);

  const score = computeSkinScore(scans);

  if (!scan) return null;

  const close = () => {
    hapt.select();
    rootNav.goBack();
  };

  // v19.0 — `LiveProductCard` handles its own tap-to-detail and
  // Shop-to-merchant navigation, so the screen no longer needs
  // local nav handlers for them. Keeping the screen focused on
  // overview composition.

  const lowQuality =
    scan.aiAnalysis &&
    (!scan.aiAnalysis.image_quality.usable ||
      scan.aiAnalysis.image_quality.confidence < 0.6 ||
      scan.aiAnalysis.image_quality.issues.length > 0);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

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
        {/* ── 1. Score summary card ─────────────────────────────── */}
        <ScoreSummaryCard
          photoUri={scan.photoUri}
          score={score}
          delta={score.deltaSinceLast}
        />

        {/* ── 2. Headline + supporting line ─────────────────────── */}
        <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
          {headline}
        </Text>
        {support ? (
          <Text style={styles.support} maxFontSizeMultiplier={1.2}>
            {support}
          </Text>
        ) : null}

        {/* ── 3. Hero product module ────────────────────────────── */}
        {/* v19.1 — deliberate hero framing. The kicker reads as a
            small editorial section header; a thin hairline beneath
            it visually frames the hero product as the page's
            primary action. */}
        <View style={styles.heroBlock}>
          <View style={styles.heroKickerRow}>
            <Text
              style={styles.heroKicker}
              maxFontSizeMultiplier={1.1}
            >
              BEST NEXT STEP TONIGHT
            </Text>
            <View style={styles.heroKickerRule} />
          </View>
          {heroLive ? (
            <LiveProductCard candidate={heroLive} variant="hero" />
          ) : liveLoading ? (
            <LiveProductsUnavailable variant="loading" scope="for your scan" />
          ) : (
            <LiveProductsUnavailable
              variant={liveError ? 'unavailable' : 'empty'}
              scope="for your scan"
              onRetry={retryLive}
            />
          )}
        </View>

        {/* ── 4. Secondary actions ──────────────────────────────── */}
        <ResultSecondaryActions
          onOpenSkinMap={() => {
            hapt.select();
            scanNav.navigate('ScanResultDetail', { scanId: scan.id });
          }}
          onOpenTonight={() => {
            hapt.select();
            scrollRef.current?.scrollTo({
              y: Math.max(0, tonightYRef.current - 12),
              animated: true,
            });
          }}
          onOpenAlternatives={() => {
            hapt.select();
            scrollRef.current?.scrollTo({
              y: Math.max(0, altsYRef.current - 12),
              animated: true,
            });
          }}
        />

        {/* ── 5. Tonight ────────────────────────────────────────── */}
        {tonight.length > 0 ? (
          <View
            style={styles.section}
            onLayout={(e) => {
              tonightYRef.current = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
              TONIGHT
            </Text>
            <View style={styles.tonightList}>
              {tonight.map((step, i) => (
                <View key={i} style={styles.tonightItem}>
                  <Text
                    style={styles.tonightNum}
                    maxFontSizeMultiplier={1.15}
                  >
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

        {/* ── 6. Also matched ───────────────────────────────────── */}
        {altLive.length > 0 ? (
          <View
            style={styles.section}
            onLayout={(e) => {
              altsYRef.current = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
              ALSO MATCHED
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.altRow}
            >
              {altLive.map((c) => (
                <LiveProductCard
                  key={c.id}
                  candidate={c}
                  variant="alt"
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* ── 7. Image quality note (only when relevant) ────────── */}
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

        {/* ── 8. Disclaimer ─────────────────────────────────────── */}
        <Text style={styles.disclaimer} maxFontSizeMultiplier={1.2}>
          Based on visible signals. Not a medical diagnosis.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Premium headline + supporting copy.
// ---------------------------------------------------------------------------

/**
 * v19.1 — premium headline + support generation.
 *
 * The previous version trusted the AI's why_line / explanation
 * verbatim if they were short enough. That gave inconsistent results
 * — sometimes elegant ("Breakouts calming, hydration steady"),
 * sometimes flat ("Skin looks generally calm with mild texture.").
 *
 * v19.1 always writes the headline DETERMINISTICALLY off the actual
 * top concern + region, so every result reads with the same calm
 * editorial voice. The AI's `explanation` is preserved as the
 * support sentence ONLY when it's well-formed; otherwise we write
 * a confident contextual one.
 */
function buildPremiumHeadline(
  concerns: Concern[],
  _analysis: FaceScanAnalysis | undefined
): string {
  const noticeable = concerns.filter((c) => c.severity !== 'calm');
  if (noticeable.length === 0) {
    return 'Your complexion looks balanced today.';
  }
  const top = noticeable[0];
  const region = headlineRegion(top.region);
  const sevWord = severityWord(top.severity);
  switch (top.category) {
    case 'breakouts':
      return noticeable.length === 1
        ? `Mostly calm skin with one ${sevWord} area on the ${region}.`
        : `One ${sevWord} area on the ${region} stands out most.`;
    case 'hydration':
      return `Mostly calm skin with ${sevWord} dryness on the ${region}.`;
    case 'texture':
      return `Mostly calm skin with ${sevWord} ${region} texture.`;
    case 'tone':
      return `Light tone unevenness across the ${region} is the strongest signal.`;
  }
}

function buildPremiumSupport(
  concerns: Concern[],
  analysis: FaceScanAnalysis | undefined
): string | null {
  // Trust the AI's explanation ONLY when it's a single tight
  // sentence (≤ 110 chars, ends with `.`). Otherwise rewrite.
  const ai = analysis?.skin_score?.explanation?.trim();
  if (ai && ai.length > 0 && ai.length <= 110 && /\.$/.test(ai)) {
    return ai;
  }
  const noticeable = concerns.filter((c) => c.severity !== 'calm');
  if (noticeable.length === 0) {
    return 'Stay the course with your usual gentle routine tonight.';
  }
  if (noticeable.length === 1) {
    return 'One area to watch — the rest reads calm.';
  }
  return 'A couple of subtle signals to address — nothing alarming.';
}

function headlineRegion(raw: string): string {
  const r = raw.trim().toLowerCase();
  if (!r || r === 'across the face' || r === 'the face') return 'face';
  if (r.includes('forehead')) return 'forehead';
  if (r.includes('cheek')) return 'cheeks';
  if (r.includes('chin')) return 'chin';
  if (r.includes('nose') || r.includes('t-zone') || r.includes('t zone'))
    return 'T-zone';
  if (r.includes('under') && r.includes('eye')) return 'under-eye area';
  return r;
}

function severityWord(s: Concern['severity']): string {
  switch (s) {
    case 'calm':
      return 'subtle';
    case 'mild':
      return 'mild';
    case 'moderate':
      return 'noticeable';
    case 'needs-attention':
      return 'pronounced';
  }
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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

  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: palette.ink,
    marginBottom: 8,
    maxWidth: '94%',
  },
  support: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
    marginBottom: 24,
    maxWidth: '94%',
  },

  heroBlock: {
    marginBottom: 0,
    gap: 14,
  },
  // v19.1 — editorial hero kicker. The hairline that follows the
  // label gives the section a deliberate, magazine-style header.
  heroKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.7,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  heroKickerRule: {
    flex: 1,
    height: 1,
    backgroundColor: palette.hairline,
  },

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

  altRow: { gap: 10, paddingRight: 4 },

  qualityCard: {
    marginBottom: 24,
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


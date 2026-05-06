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
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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
import { lookupForScan, lookupLiveProducts } from '@/api/liveProducts';
import { aiLog } from '@/ai/aiLog';
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

  // v19.7 — stable `concerns` ref. Was: `getConcerns(...)` called
  // inline every render, which returned a NEW array reference each
  // time. That alone wouldn't break anything — except the retrieval
  // effect below had `concerns` in its dep array, so EVERY render
  // re-ran the effect, cancelled the in-flight fetch, and started a
  // new one. The hero card sat in "Still finding your best match…"
  // forever because no `run()` ever completed without being
  // cancelled by the next render's cleanup. Memoising on the scan id
  // makes the ref stable across renders.
  const concerns = useMemo(
    () => (scan ? getConcerns(scan, previous) : []),
    [scan, previous]
  );

  // v19.2 — hero product retrieval state machine.
  // Adds a `slow` threshold: after 5 s of loading the UI escalates
  // from "Finding your best match…" to "Still finding your best
  // match… / Thanks for waiting — this can take a few more seconds."
  // so the screen never feels frozen.
  const [liveCandidates, setLiveCandidates] = useState<
    LiveProductCandidate[]
  >([]);
  const [liveLoading, setLiveLoading] = useState<boolean>(false);
  const [liveSlow, setLiveSlow] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<boolean>(false);
  const [liveAttempt, setLiveAttempt] = useState<number>(0);

  // v19.4 — actual product retrieval pipeline. The previous version
  // had a hard `if (!scan?.aiAnalysis) return;` early-return that
  // left scans without an AI analysis (deterministic-fallback
  // scans, partial-AI scans, or any scan from before the AI pipeline
  // ran successfully) STUCK on the empty state — the effect never
  // set `liveLoading`, never fired retrieval, and Retry just re-ran
  // the same dead path. v19.4 ALWAYS fires retrieval:
  //   • If scan.aiAnalysis is present → use lookupForScan, which
  //     scopes the query by the AI's primary_concern + region.
  //   • Otherwise → derive a free-text query from the scan's
  //     `concerns` array (which every scan has, even deterministic
  //     ones via deriveConcerns) and use lookupLiveProducts.
  // Structured aiLog signals at every step so failures are visible
  // in the dev console.
  useEffect(() => {
    if (!scan) return;
    let cancelled = false;
    setLiveLoading(true);
    setLiveSlow(false);
    setLiveError(false);
    const slowTimer = setTimeout(() => {
      if (!cancelled) setLiveSlow(true);
    }, 5000);
    // v19.5 — HARD CEILING. v19.4 fixed the early-return that left
    // no-AI scans stuck on "empty", but if lookupForScan itself
    // hangs (gateway timeout 40s × server retry = up to 80s real
    // wall-clock), the user sees "Still finding…" forever. The
    // 25s hard ceiling stops loading and flips to the unavailable
    // state with Retry. The in-flight fetch keeps running but
    // its result is ignored via the `cancelled` flag.
    const ceilingTimer = setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      clearTimeout(slowTimer);
      setLiveLoading(false);
      setLiveSlow(false);
      setLiveError(true);
      aiLog.warn('result.products', 'retrieval hard-ceiling fired (25s)', {
        scanId: scan.id,
      });
    }, 25000);

    const run = async (): Promise<LiveProductCandidate[]> => {
      if (scan.aiAnalysis) {
        aiLog.info('result.products', 'lookupForScan path', {
          scanId: scan.id,
          primary_concern: scan.aiAnalysis.primary_concern,
        });
        const picks = await lookupForScan(scan, {
          fresh: liveAttempt > 0,
        });
        if (picks.length > 0) return picks;
        // Fallback: scan-driven retrieval returned empty (rare but
        // possible). Try a free-text query so we never bottom out
        // on the empty state when there ARE concerns to act on.
        aiLog.warn(
          'result.products',
          'lookupForScan returned empty; trying free-text fallback'
        );
        return lookupLiveProducts(buildFreeTextQuery(concerns), {
          count: 6,
          fresh: liveAttempt > 0,
        });
      }
      // No AI analysis on this scan — derive a free-text query
      // from the deterministic concerns and use lookupLiveProducts.
      const query = buildFreeTextQuery(concerns);
      aiLog.info('result.products', 'free-text fallback path', {
        scanId: scan.id,
        query,
      });
      return lookupLiveProducts(query, {
        count: 6,
        fresh: liveAttempt > 0,
      });
    };

    run()
      .then((picks) => {
        if (cancelled) return;
        aiLog.info('result.products', 'retrieval resolved', {
          scanId: scan.id,
          n: picks.length,
        });
        setLiveCandidates(picks);
        setLiveError(picks.length === 0);
      })
      .catch((e) => {
        if (cancelled) return;
        aiLog.error('result.products', 'retrieval threw', {
          scanId: scan.id,
          error: e instanceof Error ? e.message : String(e),
        });
        setLiveCandidates([]);
        setLiveError(true);
      })
      .finally(() => {
        if (cancelled) return;
        clearTimeout(slowTimer);
        clearTimeout(ceilingTimer);
        setLiveLoading(false);
        setLiveSlow(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
      clearTimeout(ceilingTimer);
    };
    // v19.7 — deps DELIBERATELY scoped to scan id + aiAnalysis +
    // explicit retry counter. The previous version included
    // `concerns` and `scan` (full object), which churned on every
    // render because `getConcerns()` returned a new array ref each
    // call. That made the effect re-run every render, cancel the
    // in-flight fetch, and never let `run()` complete — the hero
    // sat in "Still finding your best match…" forever. The
    // `concerns` value used inside `run()` is captured fresh via
    // closure when the effect actually fires (on scan change /
    // retry), so we don't need it in the dep array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan?.id, scan?.aiAnalysis, liveAttempt]);

  const heroLive = liveCandidates[0] ?? null;
  const altLive = liveCandidates.slice(1, 6);
  const retryLive = () => setLiveAttempt((n) => n + 1);

  // v19.2 — hero product fade-in. When the LiveProductCard hero
  // lands (after loading), it fades in over 280ms so the screen
  // doesn't pop from "loading state" to "card" in a single frame.
  const heroOpacity = useSharedValue(0);
  useEffect(() => {
    heroOpacity.value = withTiming(heroLive ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [heroLive, heroOpacity]);
  const heroAnim = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
  }));

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

  // v19.3 — secondary "Browse products" path for the unavailable
  // hero state. Dismisses the scan modal and lands the user on
  // the Products tab so the screen always offers a forward
  // motion even when live retrieval fails.
  const openProducts = () => {
    hapt.tap();
    rootNav.goBack();
    setTimeout(() => {
      // @ts-expect-error nested tab navigation
      rootNav.navigate?.('Tabs', { screen: 'ProductsTab' });
    }, 60);
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
          interpretation={buildScoreInterpretation(concerns)}
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
        {/* v19.3 — hero product framed as a CONCLUSION, not a card
            from a state machine. The reason-to-believe line above
            the card explicitly ties the recommendation to the
            user's primary concern, so the card lands as an answer
            ("Because forehead texture is your top concern, this
            resurfacing serum should help most.") rather than a
            generic AI pick. */}
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
            <>
              <Text
                style={styles.heroReason}
                maxFontSizeMultiplier={1.2}
                numberOfLines={2}
              >
                {buildHeroReason(concerns, heroLive)}
              </Text>
              <Animated.View style={heroAnim}>
                <LiveProductCard candidate={heroLive} variant="hero" />
              </Animated.View>
            </>
          ) : liveLoading ? (
            <LiveProductsUnavailable
              variant={liveSlow ? 'slow' : 'loading'}
              scope="for your scan"
            />
          ) : (
            <LiveProductsUnavailable
              variant={liveError ? 'unavailable' : 'empty'}
              scope="for your scan"
              onRetry={retryLive}
              onBrowse={openProducts}
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
        {/* v19.2 — editorial tonight guidance. Replaces the dense
            numbered-list look with breathable rows: serif italic
            "I." / "II." / "III." numerals + concise step text +
            hairlines between rows. Reads like a calm magazine
            recipe, not a checklist app. */}
        {tonight.length > 0 ? (
          <View
            style={styles.section}
            onLayout={(e) => {
              tonightYRef.current = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.heroKickerRow}>
              <Text style={styles.heroKicker} maxFontSizeMultiplier={1.1}>
                TONIGHT
              </Text>
              <View style={styles.heroKickerRule} />
            </View>
            <View style={styles.tonightList}>
              {tonight.map((step, i) => (
                <View key={i}>
                  {i > 0 ? <View style={styles.tonightDivider} /> : null}
                  <View style={styles.tonightItem}>
                    <Text
                      style={styles.tonightNum}
                      maxFontSizeMultiplier={1.15}
                      allowFontScaling={false}
                    >
                      {ROMAN[i] ?? `${i + 1}`}
                    </Text>
                    <Text
                      style={styles.tonightText}
                      maxFontSizeMultiplier={1.2}
                      numberOfLines={3}
                    >
                      {step}
                    </Text>
                  </View>
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

/**
 * v19.4 — derive a free-text retrieval query from the scan's
 * `concerns` array. Used as the fallback path when scan.aiAnalysis
 * is missing (deterministic scan, AI proxy was down at scan time,
 * or aiAnalysis hasn't hydrated yet). Every scan has a non-empty
 * concerns array via translateAnalysisToScan / deriveConcerns, so
 * this always produces a usable query.
 *
 * The query is intentionally short and natural: it reads as a real
 * skincare-shopper sentence ("best gentle products for mild
 * forehead texture") rather than a structured payload.
 */
function buildFreeTextQuery(concerns: Concern[]): string {
  const noticeable = concerns.filter((c) => c.severity !== 'calm');
  if (noticeable.length === 0) {
    return 'best gentle daily skincare products for balanced skin';
  }
  const top = noticeable[0];
  const concernPhrase = (() => {
    switch (top.category) {
      case 'breakouts':
        return 'breakouts';
      case 'hydration':
        return 'dryness and hydration';
      case 'texture':
        return 'skin texture';
      case 'tone':
        return 'tone unevenness and dark marks';
    }
  })();
  const region = top.region.replace(/across the face/i, 'face');
  const sevWord =
    top.severity === 'mild'
      ? 'mild'
      : top.severity === 'moderate'
      ? 'moderate'
      : top.severity === 'needs-attention'
      ? 'pronounced'
      : '';
  return `best products for ${sevWord} ${concernPhrase} on the ${region}`.trim();
}

/**
 * v19.3 — score interpretation. Renders inside the ScoreSummaryCard
 * meta line so the user understands what the band actually means
 * in THIS scan, not in the abstract.
 */
function buildScoreInterpretation(concerns: Concern[]): string {
  const noticeable = concerns.filter((c) => c.severity !== 'calm');
  const high = noticeable.filter(
    (c) => c.severity === 'moderate' || c.severity === 'needs-attention'
  );
  if (noticeable.length === 0) {
    return 'Calm overall.';
  }
  if (noticeable.length === 1 && high.length === 0) {
    return 'Mostly settled, with one mild area to watch.';
  }
  if (noticeable.length <= 2 && high.length === 0) {
    return 'Mostly settled, with a couple of mild signals.';
  }
  if (high.length === 1) {
    return 'A few signals to address — one stands out.';
  }
  return 'A few signals to address.';
}

/**
 * v19.3 — reason-to-believe line above the hero product card.
 * Reads as a single elegant sentence that ties the recommendation
 * to the user's primary concern + the product's own match reason.
 * Frames the card as a conclusion, not a state-machine output.
 */
function buildHeroReason(
  concerns: Concern[],
  hero: LiveProductCandidate
): string {
  const top = concerns.find((c) => c.severity !== 'calm');
  const aiReason = (hero.matchReason ?? '').trim();
  if (!top) {
    // Calm scan → frame the recommendation as a daily addition.
    return aiReason.length > 0
      ? aiReason
      : 'A gentle daily addition that should sit comfortably in your routine.';
  }
  const concern = (() => {
    switch (top.category) {
      case 'breakouts':
        return 'breakouts';
      case 'hydration':
        return 'dryness';
      case 'texture':
        return 'texture';
      case 'tone':
        return 'tone unevenness';
    }
  })();
  // Prefer the AI's matchReason when it's tight + ends cleanly.
  if (
    aiReason.length > 0 &&
    aiReason.length <= 110 &&
    /[.!]$/.test(aiReason)
  ) {
    return aiReason;
  }
  return `Because ${concern} is your top signal in this scan, this should help most.`;
}

// v19.2 — Roman numerals for the tonight list. Reads more
// editorial than 1/2/3 and matches the calm Instrument Serif
// vocabulary the rest of the page uses.
const ROMAN = ['I.', 'II.', 'III.', 'IV.', 'V.'];

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
    gap: 12,
  },
  // v19.3 — reason-to-believe line above the hero card. Italic
  // serif gives it premium voice without competing with the card's
  // own typography.
  heroReason: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.1,
    color: palette.inkSecondary,
    maxWidth: '94%',
    marginBottom: 2,
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

  // v19.2 — editorial tonight rendering.
  tonightList: { paddingTop: 14 },
  tonightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 12,
  },
  tonightNum: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: palette.inkTertiary,
    width: 30,
    paddingTop: 1,
  },
  tonightText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14.5,
    lineHeight: 21,
    color: palette.ink,
    paddingTop: 1,
  },
  tonightDivider: {
    height: 1,
    backgroundColor: palette.hairline,
    marginLeft: 44,
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


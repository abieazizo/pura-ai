/**
 * PremiumScanResultsV34 — the premium scan-results experience.
 *
 * Three editorial slides, paged horizontally:
 *
 *   1. Skin Map          — real photo + backend overlays + chips
 *   2. Top Focus Areas   — 2-4 prioritized cards, each with localized
 *                          severity badge + observation + guidance
 *   3. Personalized      — 2-4 calm insight cards mapped from the scan
 *      Insights
 *
 * Every screen reads from the canonical ScanFlowViewModel (no raw AI
 * access). Motion is restrained: a 360ms fade+scale on mount, a 220ms
 * crossfade on overlay/finding selection, a per-chip stagger entrance.
 *
 * Premium palette:
 *   • warm ivory background
 *   • Instrument Serif headlines
 *   • Inter body
 *   • coral accent
 *   • soft hairlines, no harsh borders
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  CaretLeft,
  Drop,
  Heart,
  Leaf,
  Shield,
  ShieldCheck,
  Sparkle,
  Sun,
  WaveSine,
  X,
} from 'phosphor-react-native';
import type { ScanFlowFinding, ScanFlowInsight, ScanFlowViewModel } from '@/state/scanFlowV34';
import {
  SkinMapOverlayV34,
  concernColor,
  concernHaloColor,
} from './SkinMapOverlayV34';
import { hapt } from '@/utils/haptics';

// ---------------------------------------------------------------------------
// Local design tokens — premium ivory / blush / coral palette.
// ---------------------------------------------------------------------------

const C = {
  bg: '#FBF6EE',
  bgSoft: '#F5ECDD',
  card: '#FFFCF6',
  cardElevated: '#FFFFFF',
  ink: '#1F1B17',
  inkSoft: '#4A4239',
  muted: '#8A7F71',
  line: '#E9DCC8',
  lineStrong: '#D5C4A7',
  coral: '#C8654A',
  coralSoft: '#E68F73',
  coralWash: '#F4D3C2',
  coralBgVeil: '#F9E3D3',
  blush: '#F2D9C6',
  gold: '#A88656',
  sage: '#7C8866',
};

const T = {
  serifHeadline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: C.ink,
  } as const,
  serifLarge: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: C.ink,
  } as const,
  serifItalic: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 20,
    color: C.coral,
  } as const,
  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 2.4,
    color: C.coral,
    textTransform: 'uppercase' as const,
  } as const,
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: C.inkSoft,
  } as const,
  bodyStrong: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: C.ink,
  } as const,
  caption: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: C.muted,
  } as const,
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.4,
    color: C.ink,
    textTransform: 'uppercase' as const,
  } as const,
};

// ---------------------------------------------------------------------------
// Top-level pager
// ---------------------------------------------------------------------------

export interface PremiumScanResultsV34Props {
  vm: ScanFlowViewModel;
  onBuildRoutine(): void;
  onClose(): void;
  onRetake?(): void;
}

type SlideKey = 'skin_map' | 'focus_areas' | 'insights';

export function PremiumScanResultsV34({
  vm,
  onBuildRoutine,
  onClose,
  onRetake,
}: PremiumScanResultsV34Props) {
  const { width: vw } = useWindowDimensions();
  const listRef = useRef<FlatList<SlideKey>>(null);
  const [index, setIndex] = useState(0);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    null,
  );

  const slides = useMemo<SlideKey[]>(() => {
    const out: SlideKey[] = ['skin_map', 'focus_areas'];
    if (vm.insights.length > 0) out.push('insights');
    return out;
  }, [vm.insights.length]);

  const goNext = useCallback(() => {
    const next = Math.min(slides.length - 1, index + 1);
    if (next !== index) {
      hapt.select();
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    }
  }, [index, slides.length]);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / vw);
      if (next !== index) setIndex(next);
    },
    [index, vw],
  );

  const handleBack = useCallback(() => {
    if (index === 0) {
      onClose();
      return;
    }
    const prev = Math.max(0, index - 1);
    hapt.select();
    listRef.current?.scrollToIndex({ index: prev, animated: true });
    setIndex(prev);
  }, [index, onClose]);

  const renderItem = useCallback(
    ({ item }: { item: SlideKey }) => {
      switch (item) {
        case 'skin_map':
          return (
            <View style={{ width: vw }}>
              <SkinMapScreen
                vm={vm}
                selectedFindingId={selectedFindingId}
                onSelectFinding={setSelectedFindingId}
                onBack={handleBack}
                onContinue={goNext}
                onRetake={onRetake}
              />
            </View>
          );
        case 'focus_areas':
          return (
            <View style={{ width: vw }}>
              <FocusAreasScreen
                vm={vm}
                onBack={handleBack}
                onContinue={
                  slides.indexOf('focus_areas') === slides.length - 1
                    ? onBuildRoutine
                    : goNext
                }
              />
            </View>
          );
        case 'insights':
          return (
            <View style={{ width: vw }}>
              <InsightsScreen
                vm={vm}
                onBack={handleBack}
                onBuildRoutine={onBuildRoutine}
              />
            </View>
          );
      }
    },
    [
      vm,
      vw,
      selectedFindingId,
      handleBack,
      goNext,
      slides,
      onBuildRoutine,
      onRetake,
    ],
  );

  return (
    <View style={styles.pagerRoot}>
      <StatusBar style="dark" />
      <FlatList
        ref={listRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(k) => k}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, i) => ({ length: vw, offset: vw * i, index: i })}
      />
      <SlideIndicator total={slides.length} active={index} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Slide 1 — Skin Map
// ---------------------------------------------------------------------------

function SkinMapScreen({
  vm,
  selectedFindingId,
  onSelectFinding,
  onBack,
  onContinue,
  onRetake,
}: {
  vm: ScanFlowViewModel;
  selectedFindingId: string | null;
  onSelectFinding(id: string | null): void;
  onBack(): void;
  onContinue(): void;
  onRetake?: () => void;
}) {
  const { width: vw } = useWindowDimensions();
  const photoWidth = Math.min(310, vw - 48);
  const photoHeight = Math.round(photoWidth * (1.36));

  // Map from overlay → finding for chip + signal card.
  const findingsById = useMemo(() => {
    const m = new Map<string, ScanFlowFinding>();
    for (const f of vm.findings) m.set(f.id, f);
    return m;
  }, [vm.findings]);

  // The chip strip shows only the findings the user can see overlaid
  // (so chips and the photo agree).
  const chips = useMemo(() => {
    const seen = new Set<string>();
    const out: ScanFlowFinding[] = [];
    for (const o of vm.overlays) {
      const f = findingsById.get(o.findingId);
      if (!f) continue;
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      out.push(f);
    }
    return out.slice(0, 6);
  }, [vm.overlays, findingsById]);

  const selected =
    selectedFindingId != null ? findingsById.get(selectedFindingId) ?? null : null;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Header onBack={onBack} title="Skin Map" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {vm.quality.showLimitedBanner ? (
          <LimitedBanner reasons={vm.quality.reasons} onRetake={onRetake} />
        ) : null}

        <View style={styles.titleBlock}>
          <Text style={T.eyebrow}>YOUR SCAN · MAPPED</Text>
          <Text style={[T.serifHeadline, { marginTop: 8 }]}>Your Skin Map</Text>
          <Text style={[T.body, { marginTop: 8 }]}>
            We highlighted only what we can actually see in your photo. Tap a
            zone or chip to focus.
          </Text>
        </View>

        <View style={styles.chipRowWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {chips.map((f, i) => (
              <ChipReveal key={f.id} index={i}>
                <ConcernChip
                  finding={f}
                  active={f.id === selectedFindingId}
                  onPress={() =>
                    onSelectFinding(f.id === selectedFindingId ? null : f.id)
                  }
                />
              </ChipReveal>
            ))}
          </ScrollView>
        </View>

        <View style={styles.photoFrameWrap}>
          <SkinMapOverlayV34
            photoUri={vm.photoUri}
            width={photoWidth}
            height={photoHeight}
            overlays={vm.overlays.map((o) => ({
              zone: o.zone,
              concern: o.concern,
              style: o.style,
              opacity: o.opacity,
              findingId: o.findingId,
            }))}
            selectedFindingId={selectedFindingId}
            onZonePress={onSelectFinding}
          />
          <Text style={[T.caption, styles.disclaimer]}>
            Visible cues only · Not a medical diagnosis
          </Text>
        </View>

        <SignalCard finding={selected} fallback={vm.summary} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <ContinueButton label="See top focus areas" onPress={onContinue} />
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Slide 2 — Top Focus Areas
// ---------------------------------------------------------------------------

function FocusAreasScreen({
  vm,
  onBack,
  onContinue,
}: {
  vm: ScanFlowViewModel;
  onBack(): void;
  onContinue(): void;
}) {
  const focusAreas = vm.topFocusAreas.slice(0, 4);
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Header onBack={onBack} title="Top Focus Areas" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={T.eyebrow}>WHAT TO FOCUS ON</Text>
          <Text style={[T.serifHeadline, { marginTop: 8 }]}>
            {focusAreas.length === 1
              ? 'One area to focus on'
              : `${focusAreas.length} areas to focus on`}
          </Text>
          <Text style={[T.body, { marginTop: 8 }]}>
            Ordered by how much your routine should address them. {vm.summary}
          </Text>
        </View>

        <View style={styles.focusList}>
          {focusAreas.map((f, i) => (
            <CardReveal key={f.id} index={i}>
              <FocusAreaCard finding={f} rank={i + 1} />
            </CardReveal>
          ))}
        </View>
      </ScrollView>
      <View style={styles.bottomBar}>
        <ContinueButton label="See your insights" onPress={onContinue} />
      </View>
    </SafeAreaView>
  );
}

function FocusAreaCard({
  finding,
  rank,
}: {
  finding: ScanFlowFinding;
  rank: number;
}) {
  const swatchCore = concernColor(finding.concern);
  const swatchHalo = concernHaloColor(finding.concern);
  return (
    <View style={styles.focusCard}>
      <LinearGradient
        colors={[swatchHalo, '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.focusCardGradient}
      />
      <View style={styles.focusCardHeader}>
        <View
          style={[
            styles.focusCardSwatch,
            { backgroundColor: swatchCore },
          ]}
        />
        <View style={{ flex: 1 }}>
          <Text style={T.label}>
            FOCUS {rank} · {finding.zoneLabel.toUpperCase()}
          </Text>
          <Text style={[T.serifLarge, { marginTop: 4 }]}>{finding.title}</Text>
        </View>
        <SeverityBadge level={finding.severityLabel} />
      </View>
      <Text style={[T.body, { marginTop: 10 }]}>{finding.observation}</Text>
      <View style={styles.focusCardWhy}>
        <Heart size={14} color={C.coral} weight="duotone" />
        <Text style={[T.bodyStrong, { flex: 1 }]}>
          {finding.recommendation}
        </Text>
      </View>
      {finding.ingredientHints.length > 0 ? (
        <View style={styles.ingredientRow}>
          <Text style={T.caption}>Look for · </Text>
          {finding.ingredientHints.map((h, i) => (
            <View key={`${finding.id}-h-${i}`} style={styles.ingredientPill}>
              <Text style={styles.ingredientLabel}>{h}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SeverityBadge({
  level,
}: {
  level: 'Mild' | 'Moderate' | 'Pronounced';
}) {
  const palette =
    level === 'Pronounced'
      ? { bg: '#F5D8CC', fg: '#A03F25' }
      : level === 'Moderate'
      ? { bg: '#F3E2C7', fg: '#7C5719' }
      : { bg: '#E8E0CE', fg: '#5C4F2F' };
  return (
    <View style={[styles.severityBadge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.severityLabel, { color: palette.fg }]}>{level}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Slide 3 — Personalized Insights
// ---------------------------------------------------------------------------

function InsightsScreen({
  vm,
  onBack,
  onBuildRoutine,
}: {
  vm: ScanFlowViewModel;
  onBack(): void;
  onBuildRoutine(): void;
}) {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Header onBack={onBack} title="Personalized Insights" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={T.eyebrow}>YOUR INSIGHTS</Text>
          <Text style={[T.serifHeadline, { marginTop: 8 }]}>
            What this scan tells us
          </Text>
          <Text style={[T.body, { marginTop: 8 }]}>
            Premium guidance distilled from your scan — calm, specific, and
            tied to what we can see.
          </Text>
        </View>

        <View style={styles.insightList}>
          {vm.insights.map((insight, i) => (
            <CardReveal key={insight.id} index={i}>
              <InsightCard insight={insight} />
            </CardReveal>
          ))}
        </View>
      </ScrollView>
      <View style={styles.bottomBar}>
        <ContinueButton
          label="Build my routine"
          onPress={onBuildRoutine}
          tone="primary"
        />
      </View>
    </SafeAreaView>
  );
}

function InsightCard({ insight }: { insight: ScanFlowInsight }) {
  return (
    <View style={styles.insightCard}>
      <View style={styles.insightIconWrap}>
        <InsightIcon icon={insight.icon} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={T.label}>{insight.title.toUpperCase()}</Text>
        <Text style={[T.body, { marginTop: 6 }]}>{insight.body}</Text>
      </View>
    </View>
  );
}

function InsightIcon({ icon }: { icon: ScanFlowInsight['icon'] }) {
  const props = { size: 18, color: C.coral, weight: 'duotone' as const };
  switch (icon) {
    case 'barrier':
      return <Shield {...props} />;
    case 'hydration':
      return <Drop {...props} />;
    case 'clarity':
      return <Sparkle {...props} />;
    case 'tone':
      return <WaveSine {...props} />;
    case 'consistency':
      return <Heart {...props} />;
    case 'protection':
      return <Sun {...props} />;
    case 'gentle':
      return <Leaf {...props} />;
  }
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={styles.headerBtn}
        accessibilityLabel="Back"
      >
        <CaretLeft size={18} weight="bold" color={C.ink} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerBtn} />
    </View>
  );
}

function ConcernChip({
  finding,
  active,
  onPress,
}: {
  finding: ScanFlowFinding;
  active: boolean;
  onPress(): void;
}) {
  const swatchCore = concernColor(finding.concern);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && {
          backgroundColor: C.cardElevated,
          borderColor: swatchCore,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <View style={[styles.chipDot, { backgroundColor: swatchCore }]} />
      <Text style={[styles.chipLabel, active && { color: C.ink }]}>
        {finding.concernLabel}
      </Text>
    </Pressable>
  );
}

function SignalCard({
  finding,
  fallback,
}: {
  finding: ScanFlowFinding | null;
  fallback: string;
}) {
  // Crossfade body when selection changes.
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [finding?.id, opacity]);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const body = finding ? `${finding.observation} ${finding.recommendation}` : fallback;
  const kicker = finding
    ? `${finding.concernLabel.toUpperCase()} · ${finding.zoneLabel.toUpperCase()}`
    : 'OVERALL · WHAT WE SEE';
  return (
    <View style={styles.signalCard}>
      <Text style={T.label}>{kicker}</Text>
      <Animated.Text style={[T.body, { marginTop: 8 }, animStyle]}>
        {body}
      </Animated.Text>
    </View>
  );
}

function LimitedBanner({
  reasons,
  onRetake,
}: {
  reasons: string[];
  onRetake?: () => void;
}) {
  return (
    <View style={styles.limitedBanner}>
      <View style={styles.limitedBannerIcon}>
        <ShieldCheck size={14} weight="duotone" color={C.coral} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[T.bodyStrong, { color: C.ink }]}>
          Partial scan — limited results
        </Text>
        <Text style={[T.caption, { marginTop: 2 }]}>
          {reasons[0] ?? 'A clearer photo unlocks the full map.'}
        </Text>
      </View>
      {onRetake ? (
        <Pressable onPress={onRetake} hitSlop={8}>
          <Text style={styles.limitedBannerCta}>Retake</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ContinueButton({
  label,
  onPress,
  tone,
}: {
  label: string;
  onPress(): void;
  tone?: 'primary' | 'default';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.continueBtn,
        tone === 'primary' && { backgroundColor: C.coral },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.continueLabel,
          tone === 'primary' && { color: '#FFFFFF' },
        ]}
      >
        {label}
      </Text>
      <ArrowRight
        size={14}
        weight="bold"
        color={tone === 'primary' ? '#FFFFFF' : C.ink}
      />
    </Pressable>
  );
}

function SlideIndicator({ total, active }: { total: number; active: number }) {
  return (
    <View style={styles.indicator} pointerEvents="none">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.indicatorDot,
            i === active && styles.indicatorDotActive,
          ]}
        />
      ))}
    </View>
  );
}

// Reveal wrappers — slight fade + rise.
function ChipReveal({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const opacity = useSharedValue(0);
  const offsetY = useSharedValue(4);
  useEffect(() => {
    opacity.value = withDelay(
      index * 50,
      withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }),
    );
    offsetY.value = withDelay(
      index * 50,
      withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offsetY.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function CardReveal({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const opacity = useSharedValue(0);
  const offsetY = useSharedValue(10);
  useEffect(() => {
    opacity.value = withDelay(
      index * 80,
      withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }),
    );
    offsetY.value = withDelay(
      index * 80,
      withTiming(0, { duration: 440, easing: Easing.out(Easing.cubic) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offsetY.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  pagerRoot: {
    flex: 1,
    backgroundColor: C.bg,
  },
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.cardElevated,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: C.ink,
    letterSpacing: 0.5,
  },
  titleBlock: {
    marginTop: 6,
    marginBottom: 18,
  },
  chipRowWrap: {
    marginBottom: 18,
  },
  chipRow: {
    paddingVertical: 4,
    paddingRight: 24,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12.5,
    color: C.inkSoft,
  },
  photoFrameWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  disclaimer: {
    marginTop: 10,
    textAlign: 'center',
  },
  signalCard: {
    marginTop: 18,
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.line,
    padding: 18,
  },

  // Focus
  focusList: {
    gap: 14,
  },
  focusCard: {
    overflow: 'hidden',
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.line,
    padding: 18,
  },
  focusCardGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
  },
  focusCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  focusCardSwatch: {
    width: 8,
    alignSelf: 'stretch',
    borderRadius: 4,
    marginTop: 4,
  },
  focusCardWhy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  ingredientPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.bgSoft,
    borderWidth: 1,
    borderColor: C.line,
  },
  ingredientLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: C.ink,
    letterSpacing: 0.2,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  severityLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // Insights
  insightList: {
    gap: 12,
  },
  insightCard: {
    flexDirection: 'row',
    gap: 14,
    padding: 18,
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.line,
  },
  insightIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.coralBgVeil,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 24,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: C.cardElevated,
    borderWidth: 1,
    borderColor: C.line,
  },
  continueLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: C.ink,
    letterSpacing: -0.1,
  },

  // Limited banner
  limitedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: C.coralBgVeil,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.coralWash,
    marginBottom: 14,
  },
  limitedBannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitedBannerCta: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: C.coral,
  },

  // Indicator
  indicator: {
    position: 'absolute',
    bottom: 92,
    left: 0,
    right: 0,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.lineStrong,
    opacity: 0.5,
  },
  indicatorDotActive: {
    width: 14,
    backgroundColor: C.coral,
    opacity: 1,
  },
});

export const premiumPalette = C;
export const premiumType = T;

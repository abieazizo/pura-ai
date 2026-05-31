/**
 * ScanResultsV2Screen — the new editorial scan-results layout.
 *
 * Reads `Scan.v2Analysis` (a strict 3-to-6 findings ScanResultV2). The
 * V2 analysis is guaranteed to be populated for any scan run after
 * v32 — the server proxy enforces minItems 3 in the schema, retries
 * once on validation failure, and falls back to a deterministic
 * minimum-viable result. The "Nothing specific stood out" path is
 * dead.
 *
 * Layout (top → bottom):
 *   1. Score arc (SkinScoreDial) animating 0 → overall_score (1.2s easeOut).
 *   2. ScoreBreakdownBars — five thin horizontal bars per dimension.
 *   3. Headline (Instrument Serif 22) + summary (Inter 14).
 *   4. SkinMapV2 — stylized SVG face outline + pulsing severity dots.
 *   5. SkinMapLegend — Mild / Moderate / Pronounced.
 *   6. Findings list — one FindingCardV2 per finding.
 *   7. Primary CTA — "Build my routine" (terracotta).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Pressable } from 'react-native';
import type { Scan } from '@/types';
import type { RootStackParamList } from '@/navigation/types';
import { useAppStore } from '@/store/useAppStore';
import { SkinScoreDial } from '@/components/SkinScoreDial';
import { SkinMapV2, SkinMapLegend } from '@/components/scan-results/SkinMapV2';
import { ScoreBreakdownBars } from '@/components/scan-results/ScoreBreakdownBars';
import { FindingCardV2 } from '@/components/scan-results/FindingCardV2';
import type { ScanFindingV2, ScanResultV2 } from '@/types/scanResultV2';
import { useRoutineStore } from '@/state/routine/routineStore';
import { hapt } from '@/utils/haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';

declare const __DEV__: boolean | undefined;

type SeverityFilter = 'all' | 'pronounced' | 'moderate' | 'mild';

export interface ScanResultsV2ScreenProps {
  scanId: string;
  /** Called when the user taps the close (✕) button. Falls back to
   *  rootNav.goBack() when omitted — callers that need session cleanup
   *  (ScanResultsFaceScreen) should always pass this. */
  onClose?: () => void;
}

export function ScanResultsV2Screen({ scanId, onClose }: ScanResultsV2ScreenProps) {
  const scans = useAppStore((s) => s.scans);
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const scan: Scan | undefined =
    scans.find((s) => s.id === scanId) ?? scans[scans.length - 1];

  const v2: ScanResultV2 | null = scan?.v2Analysis ?? null;
  const { width: vw } = useWindowDimensions();
  const mapWidth = Math.min(280, vw - 48);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Prevents the "Build my routine" CTA from firing twice if the user
  // double-taps before the navigation animation completes.
  const routineBusy = useRef(false);

  const sortedFindings = useMemo<ScanFindingV2[]>(() => {
    if (!v2) return [];
    return [...v2.findings].sort((a, b) => b.severity - a.severity);
  }, [v2]);

  // ── Score delta (scan-to-scan comparison) ────────────────────────────────
  // Walk backwards through scans to find the most recent one that has a v2
  // score. Used to populate the comparison notch on the arc + delta caption.
  const prevScan = useMemo(() => {
    const idx = scans.findIndex((s) => s.id === (scan?.id ?? ''));
    if (idx <= 0) return null;
    for (let i = idx - 1; i >= 0; i--) {
      if (typeof scans[i].v2Analysis?.overall_score === 'number') return scans[i];
    }
    return null;
  }, [scans, scan?.id]);

  const prevScore: number | null =
    typeof prevScan?.v2Analysis?.overall_score === 'number'
      ? prevScan.v2Analysis.overall_score
      : null;

  const deltaCaption = useMemo<string | null>(() => {
    if (prevScore === null || !v2) return null;
    const delta = Math.round(v2.overall_score) - Math.round(prevScore);
    if (Math.abs(delta) < 1) return 'Same as last scan';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta} since last scan`;
  }, [prevScore, v2]);
  // ── End score delta ───────────────────────────────────────────────────────

  // ── Severity filter ───────────────────────────────────────────────────────
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');

  const filteredFindings = useMemo<ScanFindingV2[]>(() => {
    if (severityFilter === 'all') return sortedFindings;
    switch (severityFilter) {
      case 'pronounced': return sortedFindings.filter((f) => f.severity >= 4);
      case 'moderate':   return sortedFindings.filter((f) => f.severity === 3);
      case 'mild':       return sortedFindings.filter((f) => f.severity <= 2);
    }
  }, [sortedFindings, severityFilter]);

  // Sync selection + expansion state to the active filter — deselect items
  // that are no longer visible so the map + card focus stays coherent.
  useEffect(() => {
    if (selectedId && !filteredFindings.find((f) => f.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filteredFindings, selectedId]);
  useEffect(() => {
    if (expandedId && !filteredFindings.find((f) => f.id === expandedId)) {
      setExpandedId(null);
    }
  }, [filteredFindings, expandedId]);
  // ── End severity filter ───────────────────────────────────────────────────

  const handleSelect = useCallback(
    (id: string | null) => {
      hapt.select();
      setSelectedId(id);
      if (id) setExpandedId(id);
    },
    [],
  );

  const handleCardTap = useCallback(
    (id: string) => {
      hapt.select();
      setExpandedId((prev) => (prev === id ? null : id));
      setSelectedId(id);
    },
    [],
  );

  // Fires once when the score arc settles — lands the "your result arrived"
  // moment with a success haptic so the animation has a physical endpoint.
  const handleRevealComplete = useCallback(() => {
    hapt.success();
  }, []);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      rootNav.goBack();
    }
  }, [onClose, rootNav]);

  const handleBuildRoutine = useCallback(() => {
    if (routineBusy.current || !scan?.id) return;
    routineBusy.current = true;
    hapt.tap();
    useRoutineStore.getState().startBuild(scan.id);
    rootNav.goBack();
    setTimeout(() => {
      // @ts-expect-error nested tab nav — existing pattern in the app.
      rootNav.navigate?.('Tabs', { screen: 'RoutineTab' });
    }, 60);
  }, [scan?.id, rootNav]);

  // ── Staged entrance choreography ─────────────────────────────────────────
  // Each shared value starts at 0 (invisible) and is driven to 1 with a
  // staggered delay. Sections arrive in the order the eye reads them:
  // gauge → bars → headline → skin map → CTA.
  // Finding cards manage their own stagger via the entranceDelay prop.
  const t0 = useSharedValue(0); // gauge + bars (simultaneous)
  const t1 = useSharedValue(0); // headline
  const t2 = useSharedValue(0); // skin map + legend
  const ctaIn = useSharedValue(0); // CTA slides up from the bottom
  const ctaScale = useSharedValue(1); // tracks spring press state
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      t0.value = 1; t1.value = 1; t2.value = 1; ctaIn.value = 1;
      return;
    }
    const ease = Easing.out(Easing.cubic);
    t0.value = withDelay(80,   withTiming(1, { duration: 340, easing: ease }));
    t1.value = withDelay(680,  withTiming(1, { duration: 300, easing: ease }));
    t2.value = withDelay(880,  withTiming(1, { duration: 300, easing: ease }));
    ctaIn.value = withDelay(1200, withTiming(1, { duration: 320, easing: ease }));
  }, [reduceMotion, t0, t1, t2, ctaIn]);

  const sectionGauge = useAnimatedStyle(() => ({
    opacity: t0.value,
    transform: [{ translateY: (1 - t0.value) * 12 }],
  }));
  const sectionBars = useAnimatedStyle(() => ({
    opacity: t0.value,
    transform: [{ translateY: (1 - t0.value) * 8 }],
  }));
  const sectionHeadline = useAnimatedStyle(() => ({
    opacity: t1.value,
    transform: [{ translateY: (1 - t1.value) * 10 }],
  }));
  const sectionMap = useAnimatedStyle(() => ({
    opacity: t2.value,
    transform: [{ translateY: (1 - t2.value) * 10 }],
  }));
  const sectionCtaEntrance = useAnimatedStyle(() => ({
    opacity: ctaIn.value,
    transform: [{ translateY: (1 - ctaIn.value) * 16 }],
  }));
  const sectionCtaPress = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));
  // ── End entrance choreography ─────────────────────────────────────────────

  if (!scan || !v2) {
    return <View style={styles.blank} />;
  }

  // Defensive: a stale persisted scan from before v32 may have a
  // partial v2 shape. Treat any missing-required-field as "no v2 yet"
  // and fall back to the blank canvas instead of letting a child
  // component crash on `undefined.cx` or `undefined.slice`.
  if (
    typeof v2.overall_score !== 'number' ||
    !v2.score_breakdown ||
    !Array.isArray(v2.findings) ||
    v2.findings.length === 0 ||
    typeof v2.headline !== 'string' ||
    typeof v2.summary !== 'string'
  ) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[Pura Scan V2] malformed v2Analysis on scan',
        scan.id,
        '— rendering blank fallback',
      );
    }
    return <View style={styles.blank} />;
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      {/* Close button — always visible so users are never trapped */}
      <View style={styles.navRow} pointerEvents="box-none">
        <Pressable
          onPress={handleClose}
          style={styles.closeBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close scan results"
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Arc gauge */}
        <Animated.View style={sectionGauge}>
          <View
            style={styles.gaugeWrap}
            accessible
            accessibilityLabel={`Skin score: ${v2.overall_score} out of 100`}
          >
            <SkinScoreDial
              value={v2.overall_score}
              size={200}
              showTier
              delay={120}
              previousValue={prevScore}
              deltaCaption={deltaCaption}
              onRevealComplete={handleRevealComplete}
            />
          </View>
        </Animated.View>

        {/* 2. Score breakdown bars */}
        <Animated.View style={sectionBars}>
          <View style={styles.breakdownBlock}>
            <ScoreBreakdownBars breakdown={v2.score_breakdown} />
          </View>
        </Animated.View>

        {/* 3. Headline + summary */}
        <Animated.View style={sectionHeadline}>
          <View style={styles.headlineBlock}>
            <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
              {v2.headline}
            </Text>
            <Text style={styles.summary} maxFontSizeMultiplier={1.2}>
              {v2.summary}
            </Text>
          </View>
        </Animated.View>

        {/* 4. Skin map */}
        <Animated.View style={sectionMap}>
          <View style={styles.mapBlock}>
            <Text style={styles.mapSectionLabel} maxFontSizeMultiplier={1.1}>
              Where we found it
            </Text>
            <SkinMapV2
              findings={sortedFindings}
              selectedFindingId={selectedId}
              onSelect={handleSelect}
              width={mapWidth}
            />
            <SkinMapLegend />
          </View>
        </Animated.View>

        {/* 5. Findings list — filter row + staggered cards */}
        <View style={styles.findingsBlock}>
          <FilterRow
            value={severityFilter}
            onChange={(v) => { hapt.select(); setSeverityFilter(v); }}
          />
          {filteredFindings.length === 0 ? (
            <View style={styles.filterEmpty}>
              <Text style={styles.filterEmptyText}>
                {`No ${severityFilter} findings in this scan.`}
              </Text>
            </View>
          ) : null}
          {filteredFindings.map((f, i) => (
            <FindingCardV2
              key={f.id}
              finding={f}
              expanded={expandedId === f.id}
              selected={selectedId === f.id}
              onPress={() => handleCardTap(f.id)}
              entranceDelay={severityFilter === 'all' ? 1080 + i * 60 : i * 50}
            />
          ))}
        </View>

        <View style={{ height: 96 }} />
      </ScrollView>

      {/* 6. CTA — slides up on entrance, springs on press */}
      <Animated.View style={[styles.ctaWrap, sectionCtaEntrance]} pointerEvents="box-none">
        <Animated.View style={sectionCtaPress}>
          <Pressable
            onPress={handleBuildRoutine}
            onPressIn={() => {
              ctaScale.value = withSpring(0.965, { mass: 0.5, damping: 18, stiffness: 280 });
            }}
            onPressOut={() => {
              ctaScale.value = withSpring(1, { mass: 0.5, damping: 18, stiffness: 280 });
            }}
            style={styles.cta}
            accessibilityRole="button"
            accessibilityLabel="Build my routine"
          >
            <Text style={styles.ctaLabel} maxFontSizeMultiplier={1.1}>
              Build my routine
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

// ── FilterRow ───────────────────────────────────────────────────────────────

// Ordered low → high to match the SkinMapLegend below the face map,
// so the visual language stays consistent across both surfaces.
const FILTER_OPTIONS: { key: SeverityFilter; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'mild',       label: 'Mild' },
  { key: 'moderate',   label: 'Moderate' },
  { key: 'pronounced', label: 'Pronounced' },
];

function FilterRow({
  value,
  onChange,
}: {
  value: SeverityFilter;
  onChange: (v: SeverityFilter) => void;
}) {
  return (
    <View style={filterStyles.row}>
      {FILTER_OPTIONS.map(({ key, label }) => {
        const active = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[filterStyles.chip, active && filterStyles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Show ${label} findings`}
            hitSlop={4}
          >
            <Text
              style={[filterStyles.chipText, active && filterStyles.chipTextActive]}
              maxFontSizeMultiplier={1.15}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const filterStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(8,22,56,0.18)',
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#05070B',
    borderColor: '#05070B',
  },
  chipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#5D6673',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FCFDFF',
  },
  blank: {
    flex: 1,
    backgroundColor: '#FCFDFF',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 0,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(8,22,56,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: '#5D6673',
    lineHeight: 18,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  gaugeWrap: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 22,
  },
  breakdownBlock: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  headlineBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: '#05070B',
    textAlign: 'center',
    letterSpacing: -0.2,
    maxWidth: 320,
  },
  summary: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#5D6673',
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 340,
  },
  mapBlock: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  mapSectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.1,
    color: 'rgba(8,22,56,0.45)',
    textTransform: 'uppercase',
    marginBottom: 16,
    alignSelf: 'center',
  },
  findingsBlock: {
    marginTop: 12,
  },
  filterEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  filterEmptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: 'rgba(8,22,56,0.45)',
    textAlign: 'center',
  },
  ctaWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 22,
  },
  cta: {
    height: 56,
    borderRadius: 99,
    backgroundColor: '#147CFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#147CFF',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  ctaLabel: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

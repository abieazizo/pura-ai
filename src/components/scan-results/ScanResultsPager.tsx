/**
 * ScanResultsPager — horizontally paged carousel that owns slides 2-N
 * (Skin Map, Top Focus Areas, optionally Personalized Insights).
 *
 * Slide assembly is content-aware:
 *   • Skin Map and Top Focus Areas always render when there is at least
 *     one supported finding (this pager's invariant — the parent must
 *     route elsewhere when there are zero).
 *   • Personalized Insights ONLY renders when there is at least one
 *     supported insight. When skipped, the routine CTA moves to the
 *     last visible slide.
 *
 * Swipe + arrow continue + tap-back. No tab bar interferes because
 * scan-results routes are mounted in the ScanModalStack which lives
 * outside the floating dock.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type {
  FaceLandmarkResult,
  ScanAnalysisResponse,
  ScanInsight,
  VisibleFinding,
} from '@/types/scanResults';
import { SkinMapSlide } from './SkinMapSlide';
import { TopFocusAreasSlide } from './TopFocusAreasSlide';
import { PersonalizedInsightsSlide } from './PersonalizedInsightsSlide';

export interface ScanResultsPagerProps {
  photoUri: string;
  analysis: ScanAnalysisResponse;
  visibleFindings: VisibleFinding[];
  supportedInsights: ScanInsight[];
  geometry: FaceLandmarkResult | null;
  /** Pager's first visible slide index (0 = first available slide). */
  initialSlide?: number;
  /** Banner shown on every slide when the scan is partial. */
  limitedScan: boolean;
  selectedFindingId: string | null;
  onSelectFinding(id: string | null): void;
  /** Caller for the "Build custom routine" CTA. */
  onBuildRoutine(): void;
  /** Caller for retake — when partial scan blocks routine eligibility. */
  onRetake(): void;
  /** Caller when the user presses back on the first result slide. */
  onExit(): void;
  /** Notified whenever the visible slide index changes. */
  onSlideChange?(index: number): void;
}

type SlideKey = 'skin_map' | 'focus_areas' | 'insights';

export function ScanResultsPager(props: ScanResultsPagerProps) {
  const {
    photoUri,
    analysis,
    visibleFindings,
    supportedInsights,
    geometry,
    initialSlide = 0,
    limitedScan,
    selectedFindingId,
    onSelectFinding,
    onBuildRoutine,
    onRetake,
    onExit,
    onSlideChange,
  } = props;

  // Build the slide list from real content. The Insights slide is
  // dropped entirely when there are no supported insights.
  const slides = useMemo<SlideKey[]>(() => {
    const out: SlideKey[] = ['skin_map', 'focus_areas'];
    if (supportedInsights.length > 0) out.push('insights');
    return out;
  }, [supportedInsights.length]);

  const { width: vw } = useWindowDimensions();
  const listRef = useRef<FlatList<SlideKey>>(null);
  const [index, setIndex] = useState(Math.min(initialSlide, slides.length - 1));

  // Reset to a valid index if the slide list shrinks (e.g. supported
  // insights vanished from a state change).
  useEffect(() => {
    if (index > slides.length - 1) {
      const clamped = slides.length - 1;
      listRef.current?.scrollToIndex({ index: clamped, animated: false });
      setIndex(clamped);
    }
  }, [index, slides.length]);

  const scrollToIndex = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(slides.length - 1, next));
      listRef.current?.scrollToIndex({ index: clamped, animated: true });
      setIndex(clamped);
      onSlideChange?.(clamped);
    },
    [onSlideChange, slides.length]
  );

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / vw);
      if (next !== index) {
        setIndex(next);
        onSlideChange?.(next);
      }
    },
    [index, vw, onSlideChange]
  );

  const handleBack = useCallback(() => {
    if (index === 0) {
      onExit();
    } else {
      scrollToIndex(index - 1);
    }
  }, [index, scrollToIndex, onExit]);

  const isLastSlide = (key: SlideKey): boolean =>
    slides.indexOf(key) === slides.length - 1;

  // When the Insights slide is absent, the "continue from focus areas"
  // tap needs to fire the routine CTA instead of advancing the pager.
  const handleAdvanceFromFocusAreas = useCallback(() => {
    if (isLastSlide('focus_areas')) {
      // Insights slide is skipped — use the same gated CTA the Insights
      // slide would have called.
      onBuildRoutine();
      return;
    }
    scrollToIndex(slides.indexOf('focus_areas') + 1);
  }, [onBuildRoutine, scrollToIndex, slides]);

  const renderItem = useCallback(
    ({ item }: { item: SlideKey }) => {
      switch (item) {
        case 'skin_map':
          return (
            <View style={{ width: vw }}>
              <SkinMapSlide
                photoUri={photoUri}
                geometry={geometry}
                visibleFindings={visibleFindings}
                selectedFindingId={selectedFindingId}
                onSelectFinding={onSelectFinding}
                onBack={handleBack}
                onContinue={() => scrollToIndex(slides.indexOf('skin_map') + 1)}
                limitedScan={limitedScan}
              />
            </View>
          );
        case 'focus_areas':
          return (
            <View style={{ width: vw }}>
              <TopFocusAreasSlide
                photoUri={photoUri}
                geometry={geometry}
                visibleFindings={visibleFindings}
                summary={analysis.summary}
                onBack={handleBack}
                onContinue={handleAdvanceFromFocusAreas}
                limitedScan={limitedScan}
              />
            </View>
          );
        case 'insights':
          return (
            <View style={{ width: vw }}>
              <PersonalizedInsightsSlide
                analysis={analysis}
                visibleFindings={visibleFindings}
                supportedInsights={supportedInsights}
                limitedScan={limitedScan}
                onBack={handleBack}
                onBuildRoutine={onBuildRoutine}
                onRetake={onRetake}
              />
            </View>
          );
      }
    },
    [
      vw,
      photoUri,
      geometry,
      visibleFindings,
      supportedInsights,
      selectedFindingId,
      onSelectFinding,
      handleBack,
      handleAdvanceFromFocusAreas,
      scrollToIndex,
      slides,
      limitedScan,
      analysis,
      onBuildRoutine,
      onRetake,
    ]
  );

  const keyExtractor = useCallback((k: SlideKey) => k, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<SlideKey> | null | undefined, i: number) => ({
      length: vw,
      offset: vw * i,
      index: i,
    }),
    [vw]
  );

  // Entry transition — fade + a 0.985→1 scale-in for a premium handoff.
  const enterOpacity = useSharedValue(0);
  const enterScale = useSharedValue(0.985);
  useEffect(() => {
    enterOpacity.value = withTiming(1, {
      duration: 360,
      easing: Easing.out(Easing.cubic),
    });
    enterScale.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [enterOpacity, enterScale]);
  const enterStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ scale: enterScale.value }],
  }));

  return (
    <Animated.View style={[styles.root, enterStyle]}>
      <FlatList
        ref={listRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        initialScrollIndex={Math.min(initialSlide, slides.length - 1)}
        getItemLayout={getItemLayout}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

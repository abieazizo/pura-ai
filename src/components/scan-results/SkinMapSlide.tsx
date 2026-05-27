/**
 * SkinMapSlide — slide 2 of 4.
 *
 * v30.4 — premium final.
 *   • Tap-on-face concern selection (taps the actual photo, not just chips)
 *   • Chip strip enters with staggered fade-rise
 *   • Signal card body crossfades when the selected concern changes
 *   • Overlays reveal in priority order with 80ms stagger (handled in
 *     `FaceOverlayCanvas`)
 */

import React, { useEffect, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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
import {
  concernVisuals,
  scanColors,
  scanLayout,
  scanRadius,
  scanShadows,
  scanType,
} from '@/theme/scanResultsTokens';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'phosphor-react-native';
import type {
  FaceLandmarkResult,
  VisibleFinding,
} from '@/types/scanResults';
import { ResultsHeaderBar } from './ResultsHeaderBar';
import { CapturedFaceFrame } from './CapturedFaceFrame';
import { ConcernChip } from './ConcernChip';
import { ResultsContinueButton } from './ResultsContinueButton';
import { LimitedScanBanner } from './LimitedScanBanner';
import { hapt } from '@/utils/haptics';

export interface SkinMapSlideProps {
  photoUri: string;
  geometry: FaceLandmarkResult | null;
  visibleFindings: VisibleFinding[];
  selectedFindingId: string | null;
  onSelectFinding(id: string | null): void;
  onBack(): void;
  onContinue(): void;
  limitedScan: boolean;
}

export function SkinMapSlide({
  photoUri,
  geometry,
  visibleFindings,
  selectedFindingId,
  onSelectFinding,
  onBack,
  onContinue,
  limitedScan,
}: SkinMapSlideProps) {
  const { width: vw } = useWindowDimensions();
  const photoWidth = Math.min(
    scanLayout.photoMaxWidth + 12,
    Math.max(scanLayout.photoMinWidth, vw - scanLayout.pageHorizontalPadding * 2 - 28)
  );
  const photoHeight = Math.round(photoWidth * (380 / 285));

  const selected = useMemo(
    () => visibleFindings.find((f) => f.id === selectedFindingId) ?? null,
    [visibleFindings, selectedFindingId]
  );

  // Truth-first: overlays only render when we have usable face
  // geometry. When the AI did not return a face_overlay, we still
  // surface findings textually but the photo stays clean.
  const overlaysSupported = geometry?.usableForOverlay ?? false;

  const bodyText = selected
    ? `${selected.shortFinding} ${selected.recommendedDirection}`
    : !overlaysSupported
      ? `Pura mapped ${
          visibleFindings.length === 1
            ? 'one visible signal'
            : `${visibleFindings.length} visible signals`
        }. A clearer scan unlocks mapped visualization.`
      : visibleFindings.length === 1
        ? 'Pura highlighted one area. Tap it on the photo to read more.'
        : `Pura highlighted ${visibleFindings.length} areas. Tap any zone on the face to focus.`;

  // Crossfade the body text when it changes.
  const bodyOpacity = useSharedValue(0);
  useEffect(() => {
    bodyOpacity.value = 0;
    bodyOpacity.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [bodyText, bodyOpacity]);
  const bodyStyle = useAnimatedStyle(() => ({ opacity: bodyOpacity.value }));

  // Truth-first defensive: this slide must not render when there are
  // no supported findings. The parent should never route here in that
  // case; if it slips through, render nothing rather than fake content.
  if (visibleFindings.length === 0) return null;

  const handleZoneTap = (findingId: string | null) => {
    if (findingId === null) {
      if (selectedFindingId !== null) {
        hapt.select();
        onSelectFinding(null);
      }
      return;
    }
    if (findingId !== selectedFindingId) {
      hapt.select();
      onSelectFinding(findingId);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.page}>
        <ResultsHeaderBar current={1} onBack={onBack} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <LimitedScanBanner
            visible={limitedScan}
            supportedCount={visibleFindings.length}
          />

          <View style={styles.titleBlock}>
            <Text style={scanType.editorialHeading} maxFontSizeMultiplier={1.1}>
              Your Skin Map
            </Text>
            <Text style={[scanType.body, styles.subtext]} maxFontSizeMultiplier={1.2}>
              Only supported visible signals are highlighted.
            </Text>
          </View>

          <View style={styles.chipRowWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {visibleFindings.map((f, i) => (
                <ChipReveal key={f.id} index={i}>
                  <ConcernChip
                    type={f.type}
                    label={f.displayName}
                    active={f.id === selectedFindingId}
                    onPress={() =>
                      onSelectFinding(f.id === selectedFindingId ? null : f.id)
                    }
                  />
                </ChipReveal>
              ))}
            </ScrollView>
            <LinearGradient
              colors={[scanColors.background, 'rgba(255,253,249,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fadeLeft}
              pointerEvents="none"
            />
            <LinearGradient
              colors={['rgba(255,253,249,0)', scanColors.background]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fadeRight}
              pointerEvents="none"
            />
          </View>

          {/* Inline selected callout — sits just above the photo so the
              user reads which zone is active without leaving the photo. */}
          {selected ? (
            <View style={styles.calloutWrap}>
              <View
                style={[
                  styles.callout,
                  { borderColor: concernVisuals[selected.type].border },
                ]}
              >
                <View
                  style={[
                    styles.calloutDot,
                    { backgroundColor: concernVisuals[selected.type].tint },
                  ]}
                />
                <Text style={styles.calloutLabel} maxFontSizeMultiplier={1.1}>
                  {selected.displayName}
                </Text>
                <Pressable
                  onPress={() => {
                    hapt.select();
                    onSelectFinding(null);
                  }}
                  hitSlop={8}
                  style={styles.calloutClose}
                  accessibilityRole="button"
                  accessibilityLabel="Deselect"
                >
                  <X size={11} weight="bold" color={scanColors.muted} />
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.photoBlock}>
            <CapturedFaceFrame
              photoUri={photoUri}
              width={photoWidth}
              height={photoHeight}
              geometry={geometry}
              visibleFindings={visibleFindings}
              selectedFindingId={selectedFindingId}
              onZonePress={handleZoneTap}
            />
          </View>

          <View style={styles.signalCard}>
            <Text style={styles.signalKicker} maxFontSizeMultiplier={1.1}>
              {selected
                ? `${selected.displayName.toUpperCase()} · ${zonePhraseFor(selected)}`
                : 'VISIBLE SCAN SIGNALS'}
            </Text>
            <Animated.Text
              style={[styles.signalBody, bodyStyle]}
              maxFontSizeMultiplier={1.2}
            >
              {bodyText}
            </Animated.Text>
            <Text style={styles.disclaimer} maxFontSizeMultiplier={1.2}>
              Visible signals only · Not a medical diagnosis
            </Text>
          </View>
        </ScrollView>

        <View style={styles.continueRow}>
          <ResultsContinueButton onPress={onContinue} accessibilityLabel="Continue to focus areas" />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Small descriptive zone phrase used by the signal card kicker.
// Mirrors the language in translateAnalysis.describeZones so the chip
// label, callout, and detail copy stay in lockstep.
// ---------------------------------------------------------------------------

function zonePhraseFor(finding: VisibleFinding): string {
  const zones = finding.zones;
  if (zones.length === 0) return 'FOCUS AREA';
  if (zones.includes('under_eye_left') || zones.includes('under_eye_right')) {
    return 'UNDER EYES';
  }
  if (zones.includes('left_cheek') && zones.includes('right_cheek')) {
    return 'BOTH CHEEKS';
  }
  if (zones.includes('left_cheek')) return 'LEFT CHEEK';
  if (zones.includes('right_cheek')) return 'RIGHT CHEEK';
  if (zones.includes('forehead') && zones.includes('nose')) return 'T-ZONE';
  if (zones.includes('forehead')) return 'FOREHEAD';
  if (zones.includes('chin')) return 'CHIN';
  if (zones.includes('nose')) return 'NOSE';
  return 'FOCUS AREA';
}

// ---------------------------------------------------------------------------
// ChipReveal — small wrapper that fades + rises a chip on mount with
// per-index stagger. Pure presentational concern.
// ---------------------------------------------------------------------------

function ChipReveal({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const opacity = useSharedValue(0);
  const offsetY = useSharedValue(6);
  useEffect(() => {
    opacity.value = withDelay(
      index * 60,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })
    );
    offsetY.value = withDelay(
      index * 60,
      withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) })
    );
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offsetY.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: scanColors.background,
  },
  page: {
    flex: 1,
    paddingHorizontal: scanLayout.pageHorizontalPadding,
    paddingTop: scanLayout.pageTopGutter,
  },
  scroll: {
    paddingBottom: 80,
  },
  titleBlock: {
    marginTop: 10,
    marginBottom: 14,
  },
  subtext: {
    marginTop: 8,
    maxWidth: 320,
  },
  chipRowWrap: {
    position: 'relative',
  },
  chipRow: {
    paddingVertical: 4,
    paddingRight: 24,
    paddingLeft: 4,
    gap: 8,
  },
  fadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 14,
  },
  fadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 22,
  },
  calloutWrap: {
    alignItems: 'center',
    marginTop: 12,
  },
  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    backgroundColor: scanColors.card,
    borderRadius: scanRadius.pill,
    borderWidth: 1,
    ...scanShadows.softLift,
  },
  calloutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calloutLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: scanColors.ink,
  },
  calloutClose: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: scanColors.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  photoBlock: {
    alignItems: 'center',
    marginTop: 16,
  },
  signalCard: {
    marginTop: 22,
    backgroundColor: scanColors.card,
    borderRadius: scanRadius.largeCard,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: scanColors.line,
    ...scanShadows.softLift,
  },
  signalKicker: {
    ...scanType.eyebrow,
    marginBottom: 6,
  },
  signalBody: {
    ...scanType.body,
    color: scanColors.inkSoft,
    fontFamily: 'Inter-Medium',
  },
  disclaimer: {
    ...scanType.caption,
    marginTop: 12,
  },
  continueRow: {
    position: 'absolute',
    right: scanLayout.pageHorizontalPadding,
    bottom: 18,
  },
});

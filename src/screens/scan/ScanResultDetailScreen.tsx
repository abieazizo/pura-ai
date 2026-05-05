/**
 * ScanResultDetailScreen — v19.0 Layer 2.
 *
 * The "See full skin map" detail screen. Reached from the Layer 1
 * Overview via a quiet secondary action. Owns the heavyweight visual
 * the Overview no longer carries:
 *
 *   • face-focused photo crop (face fills the analysis area)
 *   • concern chip bar — Texture / Redness / Breakouts / Tone /
 *     Under-eye — one active at a time
 *   • premium overlay rendered through FaceSkinMap (already landmark-
 *     anchored from v17.2; v19 just feeds it confidence-aware props)
 *   • concise insight panel: short label + short explanation +
 *     one practical action
 *   • confidence-aware behavior: when a concern's region confidence
 *     is weak (low AI confidence, hairline interference, low photo
 *     quality), the overlay is SUPPRESSED and the panel reads as a
 *     calm general summary rather than fake-precise localization
 *
 * No debug ribbon, no diagnostic text, no machine-vision framing.
 */

import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, CaretRight, ShieldCheck } from 'phosphor-react-native';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import { CATEGORY_LABEL, getConcerns } from '@/utils/concerns';
import { FaceSkinMap } from '@/screens/scan/components/FaceSkinMap';
import type { Concern, ConcernCategory } from '@/types';

export interface ScanResultDetailScreenProps {
  scanId: string;
}

const CHIP_COLOR: Record<ConcernCategory, string> = {
  breakouts: '#E66B5C',
  hydration: '#7CB0FF',
  texture: '#A8C7C0',
  tone: '#D9A75E',
};

const NEXT_STEP_FOR: Record<ConcernCategory, string> = {
  breakouts:
    'Spot care only on a new blemish, then keep the rest of the routine gentle.',
  hydration:
    'Layer a hydrating serum tonight before moisturizer.',
  texture:
    'A gentle chemical exfoliant once or twice this week — never with retinol.',
  tone: 'Daily SPF + a niacinamide or vitamin-C serum in the morning.',
};

export function ScanResultDetailScreen({
  scanId,
}: ScanResultDetailScreenProps) {
  const nav = useNavigation<{ goBack: () => void }>();
  const scans = useAppStore((s) => s.scans);
  const scan = scans.find((s) => s.id === scanId) ?? scans[scans.length - 1];
  const previous = scan
    ? scans.filter((s) => s.capturedAt < scan.capturedAt).slice(-1)[0]
    : undefined;
  const concerns = scan ? getConcerns(scan, previous) : [];

  // Noticeable concerns drive the chip bar.
  const noticeable = useMemo(
    () => concerns.filter((c) => c.severity !== 'calm').slice(0, 5),
    [concerns]
  );

  const [activeCategory, setActiveCategory] = useState<ConcernCategory | null>(
    () => noticeable[0]?.category ?? null
  );

  const activeConcern = useMemo<Concern | null>(() => {
    if (!activeCategory) return null;
    return (
      noticeable.find((c) => c.category === activeCategory) ??
      noticeable[0] ??
      null
    );
  }, [activeCategory, noticeable]);

  if (!scan) return null;

  // Confidence-aware suppression. If the AI's image_quality is poor
  // OR the active finding's confidence is low, we render the photo
  // without the localized overlay and explain calmly that the map
  // softened for this scan.
  const lowQuality =
    scan.aiAnalysis &&
    (!scan.aiAnalysis.image_quality.usable ||
      scan.aiAnalysis.image_quality.confidence < 0.55 ||
      scan.aiAnalysis.image_quality.issues.length > 0);
  const activeFindingConfidence =
    scan.aiAnalysis?.findings.find((f) => {
      const cat = f.concern;
      // Match on concern → category mapping subset that overlaps
      // the chip set.
      switch (cat) {
        case 'breakouts':
        case 'redness':
        case 'oiliness':
          return activeCategory === 'breakouts';
        case 'texture':
        case 'pores':
          return activeCategory === 'texture';
        case 'dark_marks':
          return activeCategory === 'tone';
        case 'hydration':
        case 'sensitivity':
          return activeCategory === 'hydration';
        default:
          return false;
      }
    })?.confidence ?? null;
  const lowConfidence =
    activeFindingConfidence !== null && activeFindingConfidence < 0.5;
  const overlaySuppressed = !!lowQuality || lowConfidence;

  const close = () => {
    hapt.select();
    nav.goBack();
  };

  const screenW = Dimensions.get('window').width;
  const mapWidth = Math.min(screenW - 40, 460);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable
          onPress={close}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <ArrowLeft size={18} color={palette.ink} weight="bold" />
        </Pressable>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.15}>
          Skin map
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Concern chips ─────────────────────────────────────── */}
        {noticeable.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {noticeable.map((c) => {
              const selected = activeCategory === c.category;
              const tint = CHIP_COLOR[c.category];
              return (
                <Pressable
                  key={c.category}
                  onPress={() => {
                    hapt.select();
                    setActiveCategory(c.category);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.chip,
                    selected && {
                      borderColor: tint,
                      backgroundColor: `${tint}1F`,
                    },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text
                    style={[styles.chipLabel, selected && { color: tint }]}
                    maxFontSizeMultiplier={1.1}
                  >
                    {CATEGORY_LABEL[c.category].toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyChips}>
            <Text style={styles.emptyChipsText} maxFontSizeMultiplier={1.2}>
              Your skin reads as calm in this scan.
            </Text>
          </View>
        )}

        {/* ── Face-focused image + overlay ─────────────────────── */}
        {scan.aiAnalysis && !overlaySuppressed ? (
          <View style={styles.mapBlock}>
            <FaceSkinMap
              photoUri={scan.photoUri}
              aiAnalysis={scan.aiAnalysis}
              selectedCategory={activeCategory}
              width={mapWidth}
            />
          </View>
        ) : (
          <View
            style={[styles.mapBlock, styles.suppressedFrame, { width: mapWidth }]}
          >
            <View style={styles.suppressedInner}>
              <ShieldCheck
                size={22}
                color={palette.inkSecondary}
                weight="duotone"
              />
              <Text
                style={styles.suppressedHeadline}
                maxFontSizeMultiplier={1.2}
                numberOfLines={2}
              >
                {scan.aiAnalysis
                  ? 'We softened the map for this scan.'
                  : 'Skin map unavailable for this scan.'}
              </Text>
              <Text
                style={styles.suppressedBody}
                maxFontSizeMultiplier={1.2}
                numberOfLines={3}
              >
                {scan.aiAnalysis
                  ? 'Lighting or angle made precise zone localization unreliable. The summary below still applies.'
                  : 'Run a fresh scan in even light to unlock the zone-level map.'}
              </Text>
            </View>
          </View>
        )}

        {/* ── Insight panel ─────────────────────────────────────── */}
        {activeConcern ? (
          <View style={styles.insightPanel}>
            <Text style={styles.insightKicker} maxFontSizeMultiplier={1.1}>
              {CATEGORY_LABEL[activeConcern.category].toUpperCase()}
            </Text>
            <Text
              style={styles.insightHeadline}
              maxFontSizeMultiplier={1.15}
              numberOfLines={3}
            >
              {activeConcern.finding}
            </Text>
            <Text
              style={styles.insightBody}
              maxFontSizeMultiplier={1.2}
              numberOfLines={3}
            >
              {activeConcern.interpretation}
            </Text>
            <View
              style={[
                styles.actionRow,
                {
                  borderColor: CHIP_COLOR[activeConcern.category],
                  backgroundColor: `${CHIP_COLOR[activeConcern.category]}10`,
                },
              ]}
            >
              <View
                style={[
                  styles.actionDot,
                  { backgroundColor: CHIP_COLOR[activeConcern.category] },
                ]}
              />
              <Text
                style={styles.actionText}
                maxFontSizeMultiplier={1.2}
                numberOfLines={3}
              >
                {NEXT_STEP_FOR[activeConcern.category] ??
                  activeConcern.nextStep}
              </Text>
              <CaretRight
                size={13}
                color={palette.inkTertiary}
                weight="bold"
              />
            </View>
          </View>
        ) : (
          <View style={styles.calmPanel}>
            <Text style={styles.calmText} maxFontSizeMultiplier={1.2}>
              Nothing stands out tonight. Stay the course.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },

  header: {
    height: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    color: palette.ink,
    letterSpacing: -0.2,
  },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 56,
  },

  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 16,
    paddingRight: 4,
  },
  chip: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: palette.inkSecondary,
  },
  emptyChips: {
    paddingVertical: 16,
  },
  emptyChipsText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    color: palette.inkTertiary,
  },

  mapBlock: {
    marginBottom: 20,
    alignSelf: 'center',
  },
  suppressedFrame: {
    aspectRatio: 4 / 5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  suppressedInner: {
    alignItems: 'center',
    gap: 10,
    maxWidth: 280,
  },
  suppressedHeadline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: palette.ink,
    textAlign: 'center',
  },
  suppressedBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    textAlign: 'center',
  },

  insightPanel: {
    marginTop: 4,
    gap: 8,
  },
  insightKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  insightHeadline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
  },
  insightBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
  },
  actionRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionText: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.1,
    color: palette.ink,
  },
  calmPanel: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  calmText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSecondary,
  },
});

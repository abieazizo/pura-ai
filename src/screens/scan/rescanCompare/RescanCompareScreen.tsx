/**
 * RescanCompareScreen — the REAL before/after (habit step 4).
 *
 * Dark theater. The Day-1 photo and today's photo sit side by side under the
 * persistent orb; below them, the changes — WINS FIRST, each a plain sentence
 * with a quiet kind-pill. A steady result is presented as working, never as
 * nothing. One CTA keeps the routine going; a single quiet restock line
 * appears ONLY when something actually improved (earned, never urgent).
 *
 * Presentational + prop-driven (the container/showcase feeds it a built
 * RescanCompareModel) — per CLAUDE.md it never reads stores or raw AI.
 * Photos render defensively: a captured photoUri can be a dead blob: on web
 * after a reload, so each side falls back to a quiet porcelain tile with an
 * honest note instead of a broken image.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ResultsOrb } from '@/components/ResultsOrb';
import { FilmGrain } from '@/components/FilmGrain';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { ChangeKind, RescanCompareModel } from './model';

const BG = '#0A0B12';
const BG_LIFT = '#16182A';
const INK = '#EAF0FA';
const MUTED = 'rgba(214, 224, 240, 0.78)';
const FAINT = 'rgba(214, 224, 240, 0.45)';
const BLUE = '#147CFF';

const PILL: Record<ChangeKind, { word: string; bg: string; ink: string }> = {
  win: { word: 'calmer', bg: 'rgba(20, 124, 255, 0.18)', ink: '#9CC5FF' },
  steady: { word: 'steady', bg: 'rgba(214, 224, 240, 0.10)', ink: MUTED },
  watch: { word: 'today', bg: 'rgba(214, 224, 240, 0.07)', ink: FAINT },
};

export interface RescanCompareScreenProps {
  model: RescanCompareModel;
  onKeepGoing: () => void;
  onRestock?: () => void;
  onClose?: () => void;
}

export function RescanCompareScreen({
  model,
  onKeepGoing,
  onRestock,
  onClose,
}: RescanCompareScreenProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();
  const photoW = Math.min(168, (width - 24 * 2 - 14) / 2);
  const photoH = Math.round(photoW * 1.25);

  const enter = (order: number) =>
    reduceMotion ? undefined : FadeInDown.delay(120 * order).springify().damping(18).stiffness(140);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Defs>
          <RadialGradient id="rc-bg" cx="50%" cy="12%" r="85%">
            <Stop offset="0" stopColor={BG_LIFT} />
            <Stop offset="1" stopColor={BG} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#rc-bg)" />
      </Svg>

      <ScrollView
        style={styles.fill}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 36,
          paddingHorizontal: 24,
        }}
      >
        {onClose ? (
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            style={styles.close}
          >
            <Text style={[styles.uiSm, { color: FAINT }]}>Close</Text>
          </Pressable>
        ) : null}

        {/* The constant — off-axis, calm, quietly proud. */}
        <View style={styles.orbRow}>
          <ResultsOrb state="responding" size={64} scanTone="balanced" />
        </View>

        <Animated.View entering={enter(0)}>
          <Text style={styles.headline} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
            {model.headline}
          </Text>
          {model.daysBetween > 0 ? (
            <Text style={[styles.uiSm, { color: FAINT, marginTop: 6 }]} maxFontSizeMultiplier={1.6}>
              {model.daysBetween} days of small steps, side by side.
            </Text>
          ) : null}
        </Animated.View>

        {/* The pair — same face, two moments. Never altered, never retouched. */}
        <Animated.View entering={enter(1)} style={styles.pairRow}>
          <PhotoTile uri={model.photos.day1} label="Day 1" w={photoW} h={photoH} />
          <PhotoTile uri={model.photos.today} label="Today" w={photoW} h={photoH} />
        </Animated.View>

        {/* Wins first, steady second, watch last — the model guarantees it. */}
        <View
          style={styles.rows}
          accessible
          accessibilityLabel={`Changes since Day 1: ${model.changes.map((c) => c.line).join(' ')}`}
        >
          {model.changes.map((c, i) => (
            <Animated.View key={`${c.key}-${i}`} entering={enter(2 + i)} style={styles.row}>
              <View style={[styles.pill, { backgroundColor: PILL[c.kind].bg }]}>
                <Text style={[styles.pillText, { color: PILL[c.kind].ink }]} maxFontSizeMultiplier={1.3}>
                  {PILL[c.kind].word}
                </Text>
              </View>
              <Text style={[styles.rowLine, { color: c.kind === 'watch' ? FAINT : MUTED }]} maxFontSizeMultiplier={1.6}>
                {c.line}
              </Text>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={enter(2 + model.changes.length)}>
          <Text style={[styles.closing, { color: MUTED }]} maxFontSizeMultiplier={1.6}>
            {model.closingLine}
          </Text>

          <Pressable
            onPress={onKeepGoing}
            accessibilityRole="button"
            accessibilityLabel="Keep the routine going"
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.ctaText} maxFontSizeMultiplier={1.3}>
              Keep the routine going
            </Text>
          </Pressable>

          {model.reorderHint && onRestock ? (
            <Pressable
              onPress={onRestock}
              accessibilityRole="button"
              accessibilityLabel="Restock"
              hitSlop={10}
              style={({ pressed }) => [styles.quiet, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.uiSm, { color: FAINT }]} maxFontSizeMultiplier={1.4}>
                {model.reorderHint}
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </ScrollView>

      <FilmGrain />
    </View>
  );
}

/** One side of the pair. A dead/absent URI degrades to an honest quiet tile. */
function PhotoTile({ uri, label, w, h }: { uri: string | null; label: string; w: number; h: number }) {
  const [failed, setFailed] = useState(false);
  const showImage = !!uri && !failed;
  return (
    <View style={{ width: w }}>
      <View style={[styles.tile, { width: w, height: h }]}>
        {showImage ? (
          <Image
            source={{ uri: uri! }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            onError={() => setFailed(true)}
            accessibilityLabel={`${label} photo`}
          />
        ) : (
          <View style={styles.tileEmpty}>
            <Text style={[styles.uiSm, { color: FAINT, textAlign: 'center' }]} maxFontSizeMultiplier={1.4}>
              {label === 'Day 1' ? 'Day 1 photo isn’t on this device anymore.' : 'Photo unavailable.'}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.tileLabel, { color: FAINT }]} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  fill: { flex: 1 },
  close: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' },
  orbRow: { alignItems: 'flex-start', marginBottom: 14 },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 44,
    lineHeight: 50,
    color: INK,
  },
  pairRow: { flexDirection: 'row', gap: 14, marginTop: 24 },
  tile: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(214, 224, 240, 0.06)',
    boxShadow: [
      { offsetX: 0, offsetY: 2, blurRadius: 10, spreadDistance: 0, color: 'rgba(0,0,0,0.45)' },
      { offsetX: 0, offsetY: 14, blurRadius: 34, spreadDistance: 0, color: 'rgba(0,0,0,0.30)' },
    ],
  } as object,
  tileEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 14 },
  tileLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    letterSpacing: 0.3,
    marginTop: 8,
  },
  rows: { marginTop: 28, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 1,
  },
  pillText: { fontFamily: 'Inter-SemiBold', fontSize: 11, letterSpacing: 0.4 },
  rowLine: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 15, lineHeight: 22 },
  closing: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 20,
    lineHeight: 27,
    marginTop: 30,
  },
  cta: {
    marginTop: 22,
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    alignSelf: 'flex-start',
  },
  ctaText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#FFFFFF' },
  quiet: { marginTop: 16, minHeight: 44, justifyContent: 'center' },
  uiSm: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 18 },
});

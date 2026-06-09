/**
 * ScanTimelineSection — vertical scan history, canonical-insight driven.
 *
 * Replaces the horizontal `PhotoTimelineStrip` carousel called out in the
 * audit as "looks like loading skeletons" and "fourth card is clipped".
 *
 * Each row carries:
 *   • Thumbnail (real photo OR designed gradient fallback — never a
 *     blank gray box, never a skeleton-looking placeholder)
 *   • Day · score
 *   • Status pill (color + word, never color-only)
 *   • 2-5 word insight line
 *
 * Reads only `insight.timeline` — never `scans` directly — so this
 * component cannot drift from Today's Skin Read or Key Changes.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUp, ArrowDown, Minus, Sparkle, Camera } from 'phosphor-react-native';
import { palette, ds, dsElevation, dsRadius } from '@/theme';
import type {
  InsightTimelineItem,
  ProgressRoutineInsight,
} from '@/state/progressRoutineInsight';

interface Props {
  timeline: ProgressRoutineInsight['timeline'];
  /** When provided, the row becomes tappable and reports its scan id. */
  onPressItem?: (scanId: string) => void;
}

export function ScanTimelineSection({ timeline, onPressItem }: Props) {
  if (timeline.length === 0) return null;

  // Render newest first (top of the list) so the user lands on today.
  const ordered = [...timeline].reverse();

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        SCAN TIMELINE
      </Text>
      <View style={styles.list}>
        {ordered.map((item, idx) => (
          <TimelineRow
            key={item.scanId}
            item={item}
            isLatest={idx === 0}
            onPress={onPressItem}
          />
        ))}
      </View>
    </View>
  );
}

function TimelineRow({
  item,
  isLatest,
  onPress,
}: {
  item: InsightTimelineItem;
  isLatest: boolean;
  onPress?: (scanId: string) => void;
}) {
  const Inner = (
    <View style={styles.row}>
      <Thumbnail item={item} />
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Text style={styles.day} maxFontSizeMultiplier={1.15}>
            {item.dayLabel}
          </Text>
          {typeof item.score === 'number' ? (
            <Text style={styles.score} maxFontSizeMultiplier={1.1}>
              {item.score}
            </Text>
          ) : null}
          {isLatest ? (
            <View style={styles.latestPill}>
              <Sparkle size={9} color={palette.clayDeep} weight="fill" />
              <Text style={styles.latestText} maxFontSizeMultiplier={1.1}>
                LATEST
              </Text>
            </View>
          ) : null}
        </View>
        <StatusChip label={item.statusLabel} tone={item.statusTone} />
        <Text style={styles.insight} maxFontSizeMultiplier={1.2} numberOfLines={2}>
          {item.insightLabel}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => onPress(item.scanId)}
        accessibilityRole="button"
        accessibilityLabel={`${item.dayLabel}, score ${
          item.score ?? 'unknown'
        }, ${item.statusLabel}, ${item.insightLabel}`}
        style={({ pressed }) => [styles.pressable, pressed && { opacity: 0.94 }]}
      >
        {Inner}
      </Pressable>
    );
  }
  return <View style={styles.pressable}>{Inner}</View>;
}

function Thumbnail({ item }: { item: InsightTimelineItem }) {
  const dayNum = item.dayLabel.replace(/^Day\s+/i, '');

  if (item.imageUri) {
    // Cycle 12 — a framed editorial film-frame: the real scan photo with a
    // soft bottom scrim so the burned-in day number stays AA+ legible, plus a
    // brand hairline so it reads as a framed portrait, never a raw thumbnail.
    return (
      <View style={styles.thumbFrame}>
        <Image
          source={item.imageUri}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={200}
          accessibilityLabel={`${item.dayLabel} scan photo`}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(8,10,15,0)', 'rgba(8,10,15,0.62)']}
          locations={[0.45, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={styles.thumbDay} maxFontSizeMultiplier={1.1}>
          {dayNum}
        </Text>
        <View pointerEvents="none" style={styles.thumbInnerFrame} />
      </View>
    );
  }
  // Designed fallback — soft clay→ice wash, day number in serif + a faint
  // camera glyph so a missing photo reads as an intentional frame, never a
  // loading skeleton or a gray box.
  return (
    <View style={[styles.thumbFrame, styles.thumbFallback]}>
      <LinearGradient
        pointerEvents="none"
        colors={[palette.clayPaper, palette.bgDeep]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Text style={styles.thumbFallbackText} maxFontSizeMultiplier={1.1}>
        {dayNum}
      </Text>
      <Camera size={12} color={palette.clayDeep} weight="duotone" style={styles.thumbFallbackIcon} />
    </View>
  );
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: 'good' | 'warning' | 'neutral';
}) {
  const palette$ = toneFor(tone);
  const Icon =
    tone === 'good' ? ArrowUp : tone === 'warning' ? ArrowDown : Minus;
  return (
    <View style={[styles.statusPill, { backgroundColor: palette$.bg }]}>
      <Icon size={10} color={palette$.fg} weight="bold" />
      <Text
        style={[styles.statusText, { color: palette$.fg }]}
        maxFontSizeMultiplier={1.1}
      >
        {label}
      </Text>
    </View>
  );
}

function toneFor(tone: 'good' | 'warning' | 'neutral') {
  switch (tone) {
    case 'good':
      return { bg: palette.mossLight, fg: palette.mossDeep };
    case 'warning':
      return { bg: palette.rustLight, fg: palette.rust };
    case 'neutral':
      return { bg: palette.bgDeep, fg: palette.inkSecondary };
  }
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  list: {
    gap: 10,
  },
  pressable: {
    borderRadius: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: ds.surface,
    borderWidth: 1,
    borderColor: palette.hairline,
    ...dsElevation.e1,
  },
  thumbFrame: {
    // Cycle 12 — a slightly larger 4:5 editorial film-frame with brand radius +
    // a hairline so every timeline photo reads as a framed portrait.
    width: 60,
    height: 76,
    borderRadius: dsRadius.md,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  thumbInnerFrame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: dsRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  // Day number burned into the bottom-left of a real photo frame.
  thumbDay: {
    position: 'absolute',
    left: 6,
    bottom: 5,
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 19,
    letterSpacing: -0.3,
    color: palette.inkInverse,
    fontVariant: ['tabular-nums'],
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    // Soft brand-tinted fallback so a missing photo never reads as a
    // loading skeleton.
    borderColor: palette.clay,
  },
  thumbFallbackText: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    letterSpacing: -0.4,
    color: palette.clayDeep,
  },
  thumbFallbackIcon: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    opacity: 0.7,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  day: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  score: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.inkSecondary,
    fontVariant: ['tabular-nums'],
  },
  latestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: palette.clayPaper,
  },
  latestText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.0,
    color: palette.clayDeep,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  insight: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    color: palette.inkSecondary,
  },
});

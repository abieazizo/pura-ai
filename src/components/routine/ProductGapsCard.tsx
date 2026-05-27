/**
 * ProductGapsCard — v23.3 "Build from what you already own" surface.
 *
 * Lives inside the Routine tab when the user has unassigned product
 * slots. The card answers two trust questions at once:
 *
 *   • What is my shelf missing?
 *   • What's the priority order to fix it?
 *
 * Gaps are prioritized server-side by `buildProductGaps` so the screen
 * never sorts on its own. Three CTAs at the bottom let the user
 * scan/search/let Pura recommend without ever feeling pushed to buy.
 *
 * Honest copy: never claims "We'll find perfect products for you" —
 * we say "Pura will organize them into safe morning and evening steps
 * before recommending anything new."
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Barcode, MagnifyingGlass, Sparkle } from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import type { GapPriority, RoutineGap } from '@/state/routinePlan';

interface Props {
  gaps: RoutineGap[];
  onScanProduct: () => void;
  onSearchProduct: () => void;
  onLetPuraRecommend: () => void;
}

export function ProductGapsCard({
  gaps,
  onScanProduct,
  onSearchProduct,
  onLetPuraRecommend,
}: Props) {
  if (gaps.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        SHELF SETUP
      </Text>
      <Text style={styles.title} maxFontSizeMultiplier={1.15}>
        Build from what you already own
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.2}>
        Add the products on your shelf. Pura will organize them into safe
        morning and evening steps before recommending anything new.
      </Text>

      <View style={styles.gapList}>
        <Text style={styles.gapKicker} maxFontSizeMultiplier={1.1}>
          ROUTINE GAPS
        </Text>
        {gaps.map((g) => (
          <View key={g.id} style={styles.gapRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.gapLabel} maxFontSizeMultiplier={1.15}>
                {g.label}
              </Text>
              <Text
                style={styles.gapNudge}
                maxFontSizeMultiplier={1.2}
                numberOfLines={2}
              >
                {g.nudge}
              </Text>
            </View>
            <View style={[styles.priorityPill, priorityPillTone(g.priority)]}>
              <Text
                style={[
                  styles.priorityPillText,
                  priorityPillTextTone(g.priority),
                ]}
                maxFontSizeMultiplier={1.1}
                numberOfLines={1}
              >
                {g.priorityLabel}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.ctaRow}>
        <Pressable
          onPress={() => {
            hapt.tap();
            onScanProduct();
          }}
          accessibilityRole="button"
          accessibilityLabel="Scan product"
          style={({ pressed }) => [
            styles.primaryCta,
            pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
          ]}
        >
          <Barcode size={13} color={palette.inkInverse} weight="duotone" />
          <Text style={styles.primaryCtaText} maxFontSizeMultiplier={1.15}>
            Scan product
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            hapt.select();
            onSearchProduct();
          }}
          accessibilityRole="button"
          accessibilityLabel="Search product"
          style={({ pressed }) => [
            styles.secondaryCta,
            pressed && { opacity: 0.85 },
          ]}
        >
          <MagnifyingGlass
            size={12}
            color={palette.inkSecondary}
            weight="duotone"
          />
          <Text style={styles.secondaryCtaText} maxFontSizeMultiplier={1.15}>
            Search
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            hapt.select();
            onLetPuraRecommend();
          }}
          accessibilityRole="button"
          accessibilityLabel="Let Pura recommend"
          style={({ pressed }) => [
            styles.secondaryCta,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Sparkle size={12} color={palette.clayDeep} weight="fill" />
          <Text style={styles.secondaryCtaText} maxFontSizeMultiplier={1.15}>
            Let Pura recommend
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function priorityPillTone(priority: GapPriority) {
  switch (priority) {
    case 'highest':
      return { backgroundColor: palette.rustLight };
    case 'high':
      return { backgroundColor: palette.amberLight };
    case 'medium':
      return { backgroundColor: palette.clayPaper };
    case 'optional':
      return { backgroundColor: palette.bgDeep };
  }
}

function priorityPillTextTone(priority: GapPriority) {
  switch (priority) {
    case 'highest':
      return { color: palette.rust };
    case 'high':
      return { color: palette.amberDeep };
    case 'medium':
      return { color: palette.clayDeep };
    case 'optional':
      return { color: palette.inkSecondary };
  }
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 24,
    marginHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 6,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    marginBottom: 16,
  },
  gapList: {
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: palette.bgDeep,
    marginBottom: 16,
  },
  gapKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
  },
  gapLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: -0.1,
    color: palette.ink,
    marginBottom: 2,
  },
  gapNudge: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    lineHeight: 15,
    color: palette.inkSecondary,
  },
  priorityPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    maxWidth: 120,
  },
  priorityPillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: palette.ink,
  },
  primaryCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  secondaryCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkSecondary,
  },
});

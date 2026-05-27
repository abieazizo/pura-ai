/**
 * AIAdjustmentCard — "Why Pura changed today's routine" reasoning card.
 *
 * v23.3 — rebuilt as the explainability surface for today's routine.
 * The card consumes a structured `RoutineReasoning` payload (built in
 * `state/routinePlan.ts`) and renders:
 *
 *   • Kicker: WHY PURA CHANGED TODAY'S ROUTINE
 *   • Title: "Pura made today's routine conservative for a few reasons."
 *   • 2–3 numbered reason rows, each (title, body)
 *   • Footer: routine confidence label + footnote
 *
 * The card is the difference between "passive checklist" and "intelligent
 * coach." It must explain in plain words why this routine, today.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sparkle } from 'phosphor-react-native';
import { palette } from '@/theme';
import type {
  RoutineAdjustmentCopy,
  RoutineReasoning,
} from '@/state/routinePlan';

interface Props {
  /** Adjustment copy for the active slot (kept for back-compat). */
  adjustment: RoutineAdjustmentCopy;
  /** Structured reasoning. When provided, replaces the bullet body. */
  reasoning?: RoutineReasoning;
  /** Optional small status chip on the right, e.g. "Gentle mode". */
  statusChip?: string | null;
}

export function AIAdjustmentCard({ adjustment, reasoning, statusChip }: Props) {
  // v23.3 — structured reasoning wins when present. The legacy bullet
  // path stays as a fallback for any caller that hasn't moved over.
  if (reasoning) {
    return (
      <View style={styles.wrap}>
        <View style={styles.headRow}>
          <View style={styles.kickerRow}>
            <Sparkle size={11} color={palette.clayDeep} weight="fill" />
            <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
              WHY PURA CHANGED TODAY’S ROUTINE
            </Text>
          </View>
          {statusChip ? (
            <View style={styles.chip}>
              <Text style={styles.chipText} maxFontSizeMultiplier={1.1}>
                {statusChip}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.title} maxFontSizeMultiplier={1.15}>
          {adjustment.title}
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={1.2} numberOfLines={4}>
          {adjustment.body}
        </Text>

        <View style={styles.reasonList}>
          {reasoning.reasons.map((r, idx) => (
            <View key={`${idx}-${r.title}`} style={styles.reasonRow}>
              <View style={styles.reasonNum}>
                <Text
                  style={styles.reasonNumText}
                  maxFontSizeMultiplier={1.1}
                >
                  {idx + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={styles.reasonTitle}
                  maxFontSizeMultiplier={1.15}
                  numberOfLines={2}
                >
                  {r.title}
                </Text>
                <Text
                  style={styles.reasonBody}
                  maxFontSizeMultiplier={1.2}
                  numberOfLines={3}
                >
                  {r.body}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.confidenceRow}>
          <Text
            style={styles.confidenceLabel}
            maxFontSizeMultiplier={1.1}
          >
            {reasoning.confidenceLabel}
          </Text>
          <Text
            style={styles.confidenceFootnote}
            maxFontSizeMultiplier={1.2}
            numberOfLines={2}
          >
            {reasoning.confidenceFootnote}
          </Text>
        </View>
      </View>
    );
  }

  // Legacy fallback — bullet body. Kept so we don't break older callers.
  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <View style={styles.kickerRow}>
          <Sparkle size={11} color={palette.clayDeep} weight="fill" />
          <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
            PURA AI ADJUSTMENT
          </Text>
        </View>
        {statusChip ? (
          <View style={styles.chip}>
            <Text style={styles.chipText} maxFontSizeMultiplier={1.1}>
              {statusChip}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.title} maxFontSizeMultiplier={1.15}>
        {adjustment.title}
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.2} numberOfLines={4}>
        {adjustment.body}
      </Text>

      <View style={styles.bulletList}>
        {adjustment.bullets.map((b, i) => (
          <View key={i} style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text
              style={styles.bulletText}
              maxFontSizeMultiplier={1.2}
              numberOfLines={2}
            >
              {b}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    marginHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.clayLight,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.clayDeep,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: palette.clayPaper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.clayLight,
  },
  chipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.4,
    color: palette.clayDeep,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 6,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    marginBottom: 14,
  },
  // v23.3 — numbered reason rows. Each row is a structured (title, body)
  // pair so the explainability reads as a real list of reasons, not
  // generic bullets.
  reasonList: {
    gap: 12,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  reasonNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.clayPaper,
    borderWidth: 1,
    borderColor: palette.clayLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  reasonNumText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
    color: palette.clayDeep,
    fontVariant: ['tabular-nums'],
  },
  reasonTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    lineHeight: 18,
    letterSpacing: -0.05,
    color: palette.ink,
    marginBottom: 2,
  },
  reasonBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: palette.inkSecondary,
  },
  confidenceRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.clayLight,
    gap: 4,
  },
  confidenceLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.1,
    color: palette.clayDeep,
  },
  confidenceFootnote: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    lineHeight: 16,
    color: palette.inkTertiary,
  },
  // Legacy fallback styles
  bulletList: {
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: palette.clay,
  },
  bulletText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.ink,
  },
});

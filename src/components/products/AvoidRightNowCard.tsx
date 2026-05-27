/**
 * AvoidRightNowCard — trust-building "skip these for now" card.
 *
 * Sits below the product feed. Lists 3-4 ingredient/behavior cautions
 * derived from the canonical insight (low confidence → safer set;
 * hydration low → avoid acids; redness flagged → avoid fragrance).
 *
 * Calm tone, never alarmist.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShieldCheck } from 'phosphor-react-native';
import { palette } from '@/theme';
import type { ProgressRoutineInsight } from '@/state/progressRoutineInsight';

interface Props {
  insight: ProgressRoutineInsight;
}

export function AvoidRightNowCard({ insight }: Props) {
  const items = buildAvoidList(insight);
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <View style={styles.iconWrap}>
          <ShieldCheck size={16} color={palette.amberDeep} weight="duotone" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
            AVOID RIGHT NOW
          </Text>
          <Text
            style={styles.title}
            maxFontSizeMultiplier={1.15}
            numberOfLines={2}
          >
            Pura suggests skipping these while your skin settles.
          </Text>
        </View>
      </View>

      <View style={styles.list}>
        {items.map((item) => (
          <View key={item.label} style={styles.row}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <Text
                style={styles.itemLabel}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              {item.reason ? (
                <Text
                  style={styles.itemReason}
                  maxFontSizeMultiplier={1.2}
                  numberOfLines={2}
                >
                  {item.reason}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.footnote} maxFontSizeMultiplier={1.2}>
        Not medical advice. For painful, cystic, or persistent skin issues,
        consider seeing a dermatologist.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Avoid-list builder
// ---------------------------------------------------------------------------

function buildAvoidList(
  insight: ProgressRoutineInsight
): Array<{ label: string; reason?: string }> {
  // Low confidence → safest-possible avoid set.
  if (insight.confidenceCaveat) {
    return [
      {
        label: 'New active ingredients',
        reason: 'Wait until your next sharper scan before introducing a new one.',
      },
      {
        label: 'Strong exfoliating acids',
        reason: 'Hold off until image quality is high enough for a confident read.',
      },
      {
        label: 'Heavy fragranced formulas',
        reason: 'Reduce variables while we confirm what your skin actually needs.',
      },
    ];
  }

  // Build from the chips + concerns the canonical adapter surfaced.
  const out: Array<{ label: string; reason?: string }> = [];
  const labels = insight.chips.map((c) => c.label.toLowerCase());

  const hydrationLow =
    labels.some((l) => l.includes('hydration') && (l.includes('active') || l.includes('low'))) ||
    insight.metrics.some(
      (m) => m.label.toLowerCase().includes('hydration') && m.status === 'Needs support'
    );
  if (hydrationLow) {
    out.push({
      label: 'Strong exfoliating acids',
      reason: 'Hydration is slightly low — acids can compound dryness right now.',
    });
  }

  const breakoutsActive =
    labels.some((l) => l.includes('breakout') && (l.includes('active') || l.includes('flare'))) ||
    insight.metrics.some(
      (m) => m.label.toLowerCase().includes('breakout') && m.status === 'Needs support'
    );
  if (breakoutsActive) {
    out.push({
      label: 'Heavy occlusive moisturizers',
      reason: 'Lightweight formulas are safer while clogged spots settle.',
    });
    out.push({
      label: 'Stacking multiple acne treatments',
      reason: 'Pick one targeted treatment and run it consistently first.',
    });
  }

  const rednessActive =
    labels.some((l) => l.includes('redness') && l.includes('active')) ||
    insight.metrics.some(
      (m) => m.label.toLowerCase().includes('redness') && m.status === 'Needs support'
    );
  if (rednessActive) {
    out.push({
      label: 'Fragrance-heavy formulas',
      reason: 'Fragrance is a common irritation trigger when skin is reactive.',
    });
  }

  const darkMarksImproving = insight.metrics.some(
    (m) => m.label.toLowerCase().includes('mark') && m.status === 'Improved'
  );
  if (darkMarksImproving) {
    out.push({
      label: 'Skipping morning SPF',
      reason: 'SPF protects the fading progress on your dark marks.',
    });
  }

  // Default safe set when nothing fired above.
  if (out.length === 0) {
    out.push(
      {
        label: 'Trying more than one new active this week',
        reason: 'Adjust one variable at a time so your skin can speak clearly.',
      },
      {
        label: 'Harsh physical scrubs',
        reason: 'They cause invisible micro-irritation that compounds over time.',
      },
      {
        label: 'High-strength acids when irritated',
        reason: 'Wait until your barrier feels calm before re-introducing them.',
      }
    );
  }

  return out.slice(0, 4);
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 28,
    marginHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  headRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.amberDeep,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  list: {
    gap: 8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: palette.amber,
    marginTop: 8,
  },
  itemLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: -0.1,
    color: palette.ink,
    marginBottom: 2,
  },
  itemReason: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    color: palette.inkSecondary,
  },
  footnote: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 11,
    lineHeight: 16,
    color: palette.inkTertiary,
  },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  ArrowDownRight,
  MoonStars,
  CalendarBlank,
} from 'phosphor-react-native';
import { palette } from '@/theme';

/**
 * v20.0 — Welcome value-preview card.
 *
 * Replaces the empty phone-frame droplet on the Welcome screen with a
 * realistic, designed preview of the product surface the user will land
 * in: a Skin Score dial, a "trending down" delta, a tonight focus, and
 * a small 84-day plan badge.
 *
 * Static by design — no live data, no animation loops. It exists only
 * to set expectations for what the app will look like after the first
 * scan; using fake or live data here would violate the "no fake/demo
 * products" rule.
 */
export function ValuePreviewCard() {
  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Preview: skin score 78, breakouts trending down, tonight's focus is a barrier reset, with an 84-day plan badge"
    >
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>PURA</Text>
        <View style={styles.planBadge}>
          <CalendarBlank size={11} color={palette.clay} weight="bold" />
          <Text style={styles.planBadgeText}>84-day plan</Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <ScoreDial value={78} />
        <View style={styles.scoreText}>
          <Text style={styles.scoreKicker}>SKIN SCORE</Text>
          <Text style={styles.scoreLabel}>Looking calmer</Text>
          <View style={styles.deltaRow}>
            <ArrowDownRight size={12} color={palette.moss} weight="bold" />
            <Text style={styles.deltaText}>Breakouts trending down</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.focusRow}>
        <View style={styles.focusIcon}>
          <MoonStars size={16} color={palette.clay} weight="duotone" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.focusKicker}>TONIGHT</Text>
          <Text style={styles.focusTitle}>Barrier reset routine</Text>
        </View>
      </View>
    </View>
  );
}

function ScoreDial({ value }: { value: number }) {
  const size = 72;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / 100));
  const dash = c * pct;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={palette.hairline}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={palette.clay}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.dialCenter}>
        <Text style={styles.dialNumber}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    marginHorizontal: 24,
    backgroundColor: palette.bg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: palette.ink,
    shadowOpacity: 0.06,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 2,
    color: palette.inkTertiary,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: palette.clayPaper,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  planBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: palette.clay,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  scoreText: {
    flex: 1,
  },
  scoreKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
  },
  scoreLabel: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: palette.ink,
    marginTop: 4,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  deltaText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.inkSecondary,
  },
  dialCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialNumber: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    color: palette.ink,
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: palette.divider,
    marginTop: 18,
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  focusIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: palette.clayPaper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
  },
  focusTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: palette.ink,
    marginTop: 2,
  },
});

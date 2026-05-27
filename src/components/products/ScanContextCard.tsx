/**
 * ScanContextCard — premium "Based on your latest scan" card.
 *
 * Sits near the top of Products so every product card below it reads
 * as grounded in real skin data, not a generic catalog. Three states:
 *
 *   • fresh   — scan in the last few days, full chips + scan-date freshness
 *   • stale   — last scan > 7 days ago, soft warning + retake CTA
 *   • absent  — no scans, "Scan your skin to unlock personalized matches"
 *
 * Reads ONLY from the canonical insight payload. Never invents copy.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, Sparkle } from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import type { ProgressRoutineInsight } from '@/state/progressRoutineInsight';

interface Props {
  insight: ProgressRoutineInsight;
  /** Open the scan camera. */
  onScan: () => void;
}

export function ScanContextCard({ insight, onScan }: Props) {
  if (!insight.hasScanned) {
    return <NoScanState onScan={onScan} />;
  }

  // Detect "stale" by inspecting the freshness label — the adapter
  // already formats it as "Day N · Last scan N days ago".
  const stale = /over a week ago|\b(?:[3-9]|[1-9]\d+) days ago/i.test(
    insight.freshnessLabel
  );

  return (
    <View style={[styles.wrap, stale && styles.wrapStale]}>
      <View style={styles.rail} pointerEvents="none" />
      <View style={styles.headRow}>
        <View style={styles.kickerRow}>
          <Sparkle size={11} color={palette.clayDeep} weight="fill" />
          <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
            BASED ON YOUR LATEST SCAN
          </Text>
        </View>
        <Text style={styles.freshness} maxFontSizeMultiplier={1.15}>
          {insight.freshnessLabel.replace(/^Day\s+\d+\s*·\s*/, '')}
        </Text>
      </View>

      <Text style={styles.summary} maxFontSizeMultiplier={1.2} numberOfLines={2}>
        {insight.heroReason}
      </Text>

      {insight.chips.length > 0 ? (
        <View style={styles.chipRow}>
          {insight.chips.slice(0, 4).map((c) => (
            <View
              key={c.label}
              style={[
                styles.chip,
                c.tone === 'good'
                  ? { backgroundColor: palette.mossLight, borderColor: palette.moss }
                  : c.tone === 'warning'
                  ? { backgroundColor: palette.amberLight, borderColor: palette.amber }
                  : { backgroundColor: palette.bgDeep, borderColor: palette.hairline },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color:
                      c.tone === 'good'
                        ? palette.mossDeep
                        : c.tone === 'warning'
                        ? palette.amberDeep
                        : palette.inkSecondary,
                  },
                ]}
                maxFontSizeMultiplier={1.1}
                numberOfLines={1}
              >
                {c.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {stale ? (
        <Pressable
          onPress={() => {
            hapt.tap();
            onScan();
          }}
          accessibilityRole="button"
          accessibilityLabel="Scan again for better recommendations"
          style={({ pressed }) => [
            styles.staleCta,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Camera size={12} color={palette.amberDeep} weight="duotone" />
          <Text style={styles.staleCtaText} maxFontSizeMultiplier={1.15}>
            Your last scan may be outdated. Scan again for better recommendations.
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function NoScanState({ onScan }: { onScan: () => void }) {
  return (
    <View style={[styles.wrap, styles.wrapAbsent]}>
      <View style={styles.kickerRow}>
        <Sparkle size={11} color={palette.clayDeep} weight="fill" />
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          UNLOCK PERSONALIZED MATCHES
        </Text>
      </View>
      <Text
        style={styles.absentTitle}
        maxFontSizeMultiplier={1.15}
        numberOfLines={2}
      >
        Scan your skin to unlock personalized matches.
      </Text>
      <Text
        style={styles.absentBody}
        maxFontSizeMultiplier={1.2}
        numberOfLines={2}
      >
        One scan tunes every recommendation here to your skin's current state.
        Until then, browse the curated catalog below.
      </Text>
      <Pressable
        onPress={() => {
          hapt.tap();
          onScan();
        }}
        accessibilityRole="button"
        accessibilityLabel="Start your first scan"
        style={({ pressed }) => [
          styles.scanCta,
          pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
        ]}
      >
        <Camera size={14} color={palette.inkInverse} weight="duotone" />
        <Text style={styles.scanCtaText} maxFontSizeMultiplier={1.15}>
          Scan your skin
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    marginHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: palette.clayPaper,
    borderWidth: 1,
    borderColor: palette.clayLight,
    overflow: 'hidden',
    position: 'relative',
  },
  wrapStale: {
    backgroundColor: palette.amberLight,
    borderColor: palette.amber,
  },
  wrapAbsent: {
    backgroundColor: palette.bg,
    borderColor: palette.hairline,
  },
  rail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
    backgroundColor: palette.clay,
  },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    textTransform: 'uppercase',
  },
  freshness: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.4,
    color: palette.inkSecondary,
    textAlign: 'right',
    flexShrink: 1,
  },
  summary: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.1,
  },
  staleCta: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.amber,
  },
  staleCtaText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    color: palette.amberDeep,
  },
  absentTitle: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 8,
  },
  absentBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
    marginBottom: 16,
  },
  scanCta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: palette.ink,
  },
  scanCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
});

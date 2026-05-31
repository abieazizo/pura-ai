/**
 * StatusSentence — the single editorial line that replaced the shop's
 * three competing filter rows (skin-trait pills, concern chips, and the
 * match-accuracy progress bar + Improve button).
 *
 * It is a SENTENCE, not a control surface. That distinction is the whole
 * correction:
 *   • Pre-scan there is no "your skin" yet, so the line is an INVITATION
 *     to scan — never a 0%-match status that reads as broken.
 *   • Post-scan it NAMES the user (their concern + skin type) and states
 *     how complete their personalization signal is, with a quiet inline
 *     "Improve" link.
 *
 * Deliberately absent, because they were the conceptual collapse: chips,
 * a progress bar, a bordered button. The traits are prose, not controls.
 *
 * Pura Blue appears exactly once on this line — on the single action that
 * matters (scan, pre-scan; improve, post-scan).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { puraShop, puraShopLayout } from '@/theme';

export interface StatusSentenceProps {
  hasScan: boolean;
  /** Lowercased for mid-sentence use, e.g. "active breakouts". */
  concernLabel: string;
  /** Lowercased for mid-sentence use, e.g. "combination". */
  skinTypeLabel: string;
  /** 0..100 — how much personalization signal we hold. */
  matchedPct: number;
  /** Pre-scan: the scan invitation. Post-scan: the Improve link. Both
   *  route to the scan flow — the highest-impact way to tighten fit. */
  onScan: () => void;
}

export function StatusSentence({
  hasScan,
  concernLabel,
  skinTypeLabel,
  matchedPct,
  onScan,
}: StatusSentenceProps) {
  // ----- PRE-SCAN — an invitation, not a status. -----
  // `matchedPct <= 0` is folded in with `!hasScan` deliberately: the
  // post-scan line must NEVER render "0% matched" (a hard product rule).
  // The view model already guarantees matchedPct >= 25 whenever hasScan
  // is true, so this is belt-and-suspenders against a future scoring tweak.
  if (!hasScan || matchedPct <= 0) {
    return (
      <Pressable
        onPress={onScan}
        accessibilityRole="button"
        accessibilityLabel="Scan your skin to personalize your shop"
        hitSlop={6}
        style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      >
        <Text style={styles.line} maxFontSizeMultiplier={1.3}>
          <Text style={styles.lead}>Curated by Pura.  </Text>
          <Text style={styles.link}>Scan to personalize →</Text>
        </Text>
      </Pressable>
    );
  }

  // ----- POST-SCAN — names the user + ambient match state. -----
  const showImprove = matchedPct < 100;
  return (
    <View style={styles.wrap}>
      <Text style={styles.line} maxFontSizeMultiplier={1.3}>
        <Text style={styles.identity}>
          For your skin — {concernLabel}, {skinTypeLabel}.
        </Text>
        <Text style={styles.matched}>{`  ${matchedPct}% matched`}</Text>
        {showImprove ? (
          <Text style={styles.matched}>
            {'  ·  '}
            <Text
              style={styles.link}
              onPress={onScan}
              suppressHighlighting
              accessibilityRole="button"
              accessibilityLabel="Improve your match by scanning again"
            >
              Improve →
            </Text>
          </Text>
        ) : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    // Sits quietly under the search field; gives the hero room below.
    marginBottom: 22,
  },
  pressed: {
    opacity: 0.6,
  },
  line: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  // Pre-scan editorial lead.
  lead: {
    color: puraShop.inkSecondary,
    fontFamily: 'Inter-Regular',
  },
  // Post-scan identity clause — the prose that used to be trait chips.
  identity: {
    color: puraShop.ink,
    fontFamily: 'Inter-Medium',
  },
  // Ambient match state — the number that used to be a progress bar.
  matched: {
    color: puraShop.inkMuted,
    fontFamily: 'Inter-Regular',
  },
  // The one Pura Blue accent on this screen's status line.
  link: {
    color: puraShop.coral,
    fontFamily: 'Inter-SemiBold',
  },
});

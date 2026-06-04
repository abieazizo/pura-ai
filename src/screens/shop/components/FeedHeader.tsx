/**
 * FeedHeader — the consultant's letterhead at the top of the Pura Shop home
 * feed (Step 6). It is the page's VOICE, the beat before the card stack:
 *
 *   • A personal salute — "For Alex" when we know the name, "For your skin"
 *     when we don't. We NEVER invent a name (canonical-state law): the salute
 *     degrades to the skin, not to a fabricated identity.
 *   • A scan-freshness stamp — "Scanned 2 days ago" — the "when I last saw
 *     you" signal, sitting quietly opposite the salute. Absent pre-scan.
 *   • The acknowledgment line — the consultant's spoken thought for tonight,
 *     set large in the editorial serif. This is the emotional center; the copy
 *     itself is resolved upstream in the model, never composed here.
 *   • A re-scan banner — shown ONLY when the last scan has gone stale
 *     (`showRescanBanner`). A gentle nudge, not an error: the picks below lean
 *     on the scan, so a fresh read keeps them honest.
 *
 * Every datum (name, freshness, acknowledgment, staleness) arrives already
 * resolved on the `ShopHomeModel`. This component reads that contract and adds
 * only presentation — no store, no raw AI output, no recomposed state.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Scan } from 'phosphor-react-native';

import { puraShop, puraShopHome, puraShopLayout, puraShopType } from '@/theme';
import type {
  AcknowledgmentLine,
  ScanFreshness,
  ShopHomeState,
} from '../shopStackModel';

export interface FeedHeaderProps {
  state: ShopHomeState;
  /** The user's name, or null. NEVER fabricated when null. */
  greetingName: string | null;
  /** The consultant's editorial line for tonight (resolved in the model). */
  acknowledgment: AcknowledgmentLine;
  /** "Scanned 2 days ago" + staleness. Null pre-scan. */
  scanFreshness: ScanFreshness | null;
  /** True only when the scan has gone stale (model-decided). */
  showRescanBanner: boolean;
  /** Routes to the scan flow — the re-scan nudge's action. */
  onRescan: () => void;
}

export function FeedHeader({
  greetingName,
  acknowledgment,
  scanFreshness,
  showRescanBanner,
  onRescan,
}: FeedHeaderProps) {
  // Honest salute: the person when we know them, the skin when we don't.
  const salute = greetingName ? `For ${greetingName}` : 'For your skin';

  return (
    <View style={styles.wrap}>
      {/* Letterhead row — salute (left) opposite the freshness stamp (right). */}
      <View style={styles.metaRow}>
        <View style={styles.saluteRow}>
          <View style={styles.saluteTick} />
          <Text style={styles.salute} numberOfLines={1}>
            {salute}
          </Text>
        </View>

        {scanFreshness ? (
          <View style={styles.freshRow}>
            <View style={styles.freshDot} />
            <Text style={styles.fresh} numberOfLines={1}>
              {scanFreshness.label}
            </Text>
          </View>
        ) : null}
      </View>

      {/* The consultant's voice for tonight — the editorial center. */}
      <Text style={styles.hero} maxFontSizeMultiplier={1.4}>
        {acknowledgment.text}
      </Text>

      {/* Re-scan nudge — only when the scan has aged out. The whole card is one
          tap target (no nested buttons), so the web build stays a single
          <button>. */}
      {showRescanBanner && scanFreshness ? (
        <Pressable
          onPress={onRescan}
          style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
          accessibilityRole="button"
          accessibilityLabel="Re-scan your skin"
          accessibilityHint={`${scanFreshness.label}. A fresh scan keeps tonight's picks accurate.`}
        >
          <View style={styles.bannerIcon}>
            <Scan size={18} weight="bold" color={puraShopHome.treatAccent} />
          </View>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle} numberOfLines={1}>
              A fresh scan sharpens tonight’s edit
            </Text>
            <Text style={styles.bannerSub} numberOfLines={1}>
              {scanFreshness.label} — these picks lean on it.
            </Text>
          </View>
          <View style={styles.bannerCta} pointerEvents="none">
            <Text style={styles.bannerCtaText}>Re-scan</Text>
            <ArrowRight size={14} weight="bold" color={puraShopHome.treatAccent} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    paddingTop: 6,
    paddingBottom: 18,
  },

  // ----- Letterhead meta row -----
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  saluteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  // The single Pura Blue accent in the header — a small editorial tick that
  // ties the letterhead to the card eyebrows below.
  saluteTick: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: puraShopHome.treatAccent,
    marginRight: 8,
  },
  salute: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
    color: puraShopHome.ink,
    flexShrink: 1,
  },
  freshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: 12,
  },
  freshDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: puraShopHome.quietInk,
    marginRight: 6,
  },
  fresh: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    letterSpacing: 0.1,
    color: puraShopHome.quietInk,
  },

  // ----- The acknowledgment — editorial serif hero -----
  hero: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.4,
    color: puraShopHome.ink,
  },

  // ----- Re-scan banner -----
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: 18,
    backgroundColor: puraShopHome.canvasDeep,
    borderWidth: 1,
    borderColor: puraShopHome.cardEdge,
  },
  bannerPressed: {
    opacity: 0.7,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: puraShopHome.treatHalo,
    marginRight: 12,
  },
  bannerTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  bannerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    letterSpacing: -0.1,
    color: puraShopHome.ink,
    marginBottom: 2,
  },
  bannerSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    letterSpacing: -0.05,
    color: puraShop.inkSecondary,
  },
  bannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  bannerCtaText: {
    ...puraShopType.viewAll,
    color: puraShopHome.treatAccent,
  },
});

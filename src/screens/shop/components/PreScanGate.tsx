/**
 * PreScanGate — STATE A, the pre-scan home (Step 9).
 *
 * Before there's a scan, the feed has no honest matches to stack — so instead
 * of faking personalization it shows a few editor's picks as a TEASER behind a
 * single, clear invitation to scan. The picks are real catalog products with
 * honest "Editor's pick" eyebrows and NO match number (the model marks them
 * `locked`, matchPercent null), so nothing here pretends to know the user yet.
 *
 * The teaser row is decorative and non-interactive (`pointerEvents="none"`):
 * the gate has exactly ONE action — scan — so the value exchange is
 * unmistakable. "Here's the kind of thing I'd pick; give me one scan and I'll
 * make it about you."
 *
 * Reads `preScanPicks` off the model and nothing else.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Scan } from 'phosphor-react-native';

import {
  puraShop,
  puraShopHome,
  puraShopLayout,
  puraShopShadow,
} from '@/theme';
import type { StackCard } from '../shopStackModel';
import { EditorialProductCard } from './EditorialProductCard';

export interface PreScanGateProps {
  picks: StackCard[];
  onScan: () => void;
}

export function PreScanGate({ picks, onScan }: PreScanGateProps) {
  return (
    <View style={styles.wrap}>
      {picks.length > 0 ? (
        // Purely a visual glimpse of the deck a scan unlocks — non-interactive
        // and hidden from the screen reader, which is taken straight to the one
        // action that matters (the scan button below).
        <View
          style={styles.teaserDeck}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
        >
          {buildTeaserSlots(picks).map((slot) => (
            <View key={slot.card.key} style={[styles.teaserCard, slot.style]}>
              <EditorialProductCard card={slot.card} width={148} />
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.cta}>
        <View style={styles.iconDisc}>
          <Scan size={22} weight="bold" color={puraShopHome.treatAccent} />
        </View>
        <Text style={styles.headline}>Your feed is one scan away</Text>
        <Text style={styles.sub}>
          These are editor’s picks. Scan your skin and I’ll rebuild this feed
          around what I actually see — matched, ranked, and explained.
        </Text>
        <Pressable
          onPress={onScan}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Scan your skin to personalize your feed"
        >
          <Text style={styles.buttonText}>Scan your skin</Text>
          <ArrowRight size={16} weight="bold" color={puraShopHome.white} />
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Order the picks as a centered deck preview: the top pick upright on top,
 * the next two peeking behind it, left and right. Returned back-to-front so
 * DOM paint order places the front pick last (on top). This is the swipe deck
 * the user unlocks — shown here at rest, waiting on a scan.
 */
function buildTeaserSlots(
  picks: StackCard[],
): { card: StackCard; style: object }[] {
  const out: { card: StackCard; style: object }[] = [];
  if (picks[1]) out.push({ card: picks[1], style: styles.slotLeft });
  if (picks[2]) out.push({ card: picks[2], style: styles.slotRight });
  if (picks[0]) out.push({ card: picks[0], style: styles.slotFront });
  return out;
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: puraShopLayout.horizontalPadding,
    marginBottom: 24,
    borderRadius: 28,
    backgroundColor: puraShopHome.canvasDeep,
    borderWidth: 1,
    borderColor: puraShopHome.cardEdge,
    overflow: 'hidden',
    paddingTop: 24,
    paddingBottom: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  // The teaser picks sit as a centered deck — the front pick upright, two
  // peeking behind it — a glimpse of the swipeable edit a scan unlocks.
  teaserDeck: {
    height: 264,
    alignSelf: 'stretch',
    position: 'relative',
    marginBottom: 20,
  },
  teaserCard: {
    position: 'absolute',
    top: 6,
    left: '50%',
    width: 148,
    marginLeft: -74,
    ...puraShopShadow.card,
  },
  slotFront: {
    zIndex: 3,
  },
  slotLeft: {
    transform: [{ translateX: -42 }, { rotate: '-8deg' }, { scale: 0.9 }],
    opacity: 0.5,
    zIndex: 1,
  },
  slotRight: {
    transform: [{ translateX: 42 }, { rotate: '8deg' }, { scale: 0.9 }],
    opacity: 0.5,
    zIndex: 2,
  },
  cta: {
    alignItems: 'center',
  },
  iconDisc: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: puraShopHome.treatHalo,
    marginBottom: 16,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 25,
    lineHeight: 29,
    letterSpacing: -0.5,
    color: puraShopHome.ink,
    textAlign: 'center',
    marginBottom: 10,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    letterSpacing: -0.1,
    color: puraShop.inkSecondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: puraShopHome.treatAccent,
    ...puraShopShadow.plus,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: -0.2,
    color: puraShopHome.white,
  },
});

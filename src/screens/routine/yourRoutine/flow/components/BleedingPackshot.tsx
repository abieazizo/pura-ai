/**
 * BleedingPackshot — the REAL product photo as an OBJECT spilling off the plan.
 *
 * The 10/10 hinge of the overview: the curated pick's actual bundled packshot,
 * rendered OVERSIZED and right-anchored so the object visibly BREAKS THE CARD'S
 * RIGHT EDGE by 12–20px — a real bottle/tube spilling off the typeset plan, not
 * a flat in-bounds thumbnail or a chip.
 *
 * THE OVERHANG (why it clears the CARD, not just the slot): the object renders at
 * `size + bleed` but is pinned to the RIGHT of a `size`-wide slot whose own right
 * margin is pulled out by `bleed`. So the object's right edge sits `bleed` past
 * the slot, and the slot's edge sits `bleed` past where the text column ended.
 * The row card carries paddingRight `cardInset` (the gutter the object must also
 * clear); the caller sizes `bleed` to cover that gutter PLUS the spec's 12–20px,
 * so the silhouette genuinely overhangs the white card boundary — not merely the
 * invisible slot. Bottom-anchored so a tall bottle and a wide tube both ground on
 * the same baseline regardless of the photo's aspect.
 *
 * Resolution is the shared `resolvePackshot(pick.id)` (catalog bundle → carried
 * asset → remote url). When nothing resolves it renders NOTHING (returns null) —
 * a product-free routine has no empty box, no shadow ghost, no reserved gap; the
 * row's text simply fills the space. Presentation only: NO press target (zero
 * commerce — never a "see my pick" / buy invite) and hidden from VoiceOver (the
 * row speaks the product name once).
 *
 * NO contact shadow is painted: the only shadow token available to this flow is
 * `overviewTone.cardShadow` — a CARD shadow (a tall 0px/14px ambient drop) that,
 * under a flat ellipse, lands well below the object and reads as a detached
 * floating smudge. A wrong contact shadow is worse than none (the object would
 * read as hovering, the exact failure this aspect must avoid), and a real one
 * needs a dedicated near-zero-offset token only the foundation owner may add (see
 * integration notes). Until then the object rests on the white card field on its
 * own — honest and calm — rather than floating over a smudge. No hardcoded hex.
 *
 * MOTION: none of its own. The row's `useSetDown` carries the object in. The
 * earlier ±3px front-plane parallax is removed: it needed a `scrollY` the locked
 * contracts deliberately never thread, so it could only ever be identity — dead
 * motion dressed as a feature. No setTimeout, no Animated API.
 */

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { resolvePackshot, type PackshotRef } from '../../components/Packshot';

interface BleedingPackshotProps {
  pick: PackshotRef;
  /** The visual diameter of the slot the object occupies on the card. */
  size: number;
  /** How far the object overhangs PAST the card edge — sized by the caller to
   *  cover the card's right padding plus the spec's 12–20px true overhang. */
  bleed: number;
}

export function BleedingPackshot({ pick, size, bleed }: BleedingPackshotProps) {
  const source = resolvePackshot(pick);
  // Product-free / unresolved id: render cleanly with no image and no gap.
  if (!source) return null;

  // The object is oversized relative to its slot and right-anchored, so its right
  // edge sits `bleed` past the slot — and the slot's pulled-out right margin
  // pushes that past the card boundary. Net: a real 12–20px overhang of the card.
  const objectSize = size + bleed;

  return (
    <View
      style={[styles.slot, { width: size, height: size, marginRight: -bleed }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Image
        source={source}
        resizeMode="contain"
        // Right- and bottom-anchored: the silhouette spills off the card's right
        // edge and grounds on a stable baseline for any packshot aspect ratio.
        style={[styles.object, { width: objectSize, height: objectSize }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    // Anchor the oversized object to the slot's right & bottom so it overhangs
    // the CARD edge (not just centers inside the slot) and grounds consistently.
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    // The object is allowed to overhang the slot (and the card) in every axis.
    overflow: 'visible',
  },
  object: {
    // Spill rightward past the slot edge so the object clears the card boundary.
    marginRight: -1,
  },
});

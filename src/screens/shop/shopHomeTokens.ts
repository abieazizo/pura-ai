/**
 * Pura Shop — home-feed structural mapping layer.
 *
 * The atmospheric HEX lives in `theme/tokens.ts::puraShopHome` (per CLAUDE.md,
 * the only legitimate home for color literals). This module is the SHOP-DOMAIN
 * composition over those tokens:
 *
 *   • `ShopPillar` — the four routine pillars a product can belong to.
 *   • `pillarForCategory()` — maps a catalog `ShopCategory` onto a pillar.
 *   • `PILLAR_THEME` — composes the per-pillar atmospheric tokens into the
 *     tuples the gradient backdrop + product halo consume, so a component
 *     reads one object (`PILLAR_THEME[pillar]`) instead of six token keys.
 *   • `shopHomeMotion` — pure timing/threshold constants for the breathing
 *     idle loop + the swipe mechanic. No hex.
 *
 * Nothing here reads the store or AI output — it is static product taxonomy.
 */

import { puraShopHome } from '@/theme';
import type { ShopCategory } from './shopCatalog';

export type ShopPillar = 'cleanse' | 'treat' | 'moisturize' | 'protect';

export interface PillarTheme {
  pillar: ShopPillar;
  /** Editorial pillar label — "Cleanse", "Treat", … */
  label: string;
  /** Page backdrop gradient, light top-left → deep bottom. */
  corners: readonly [string, string];
  /** Radial wash bloomed directly behind the floating product. */
  halo: string;
  /** The pillar's line accent (eyebrow tick, progress hairline). */
  accent: string;
}

/**
 * The user-facing verb for each pillar. Kept here (not in copy files) because
 * it is taxonomy, not microcopy — it never changes per surface.
 */
export const PILLAR_THEME: Record<ShopPillar, PillarTheme> = {
  cleanse: {
    pillar: 'cleanse',
    label: 'Cleanse',
    corners: [puraShopHome.cleanseLight, puraShopHome.cleanseDeep],
    halo: puraShopHome.cleanseHalo,
    accent: puraShopHome.cleanseAccent,
  },
  treat: {
    pillar: 'treat',
    label: 'Treat',
    corners: [puraShopHome.treatLight, puraShopHome.treatDeep],
    halo: puraShopHome.treatHalo,
    accent: puraShopHome.treatAccent,
  },
  moisturize: {
    pillar: 'moisturize',
    label: 'Moisturize',
    corners: [puraShopHome.moisturizeLight, puraShopHome.moisturizeDeep],
    halo: puraShopHome.moisturizeHalo,
    accent: puraShopHome.moisturizeAccent,
  },
  protect: {
    pillar: 'protect',
    label: 'Protect',
    corners: [puraShopHome.protectLight, puraShopHome.protectDeep],
    halo: puraShopHome.protectHalo,
    accent: puraShopHome.protectAccent,
  },
};

/**
 * Map a coarse storefront category onto a routine pillar. Four pillars, each
 * with a distinct atmospheric hue, so the backdrop visibly shifts as the user
 * swipes between steps:
 *   cleanser           → cleanse
 *   toner/serum/treatment/mask → treat   (all "active" steps)
 *   moisturizer        → moisturize
 *   spf                → protect
 */
export function pillarForCategory(category: ShopCategory): ShopPillar {
  switch (category) {
    case 'cleanser':
      return 'cleanse';
    case 'toner':
    case 'serum':
    case 'treatment':
    case 'mask':
      return 'treat';
    case 'moisturizer':
      return 'moisturize';
    case 'spf':
      return 'protect';
  }
}

export function themeForCategory(category: ShopCategory): PillarTheme {
  return PILLAR_THEME[pillarForCategory(category)];
}

/**
 * Pure motion constants for the card stack. Timings in ms, thresholds as
 * fractions / px. The breathing loop is gated by `useReduceMotion()` at the
 * component layer — these values describe the FULL-motion variant.
 */
export const shopHomeMotion = {
  /** One inhale+exhale of the resting top card. */
  breathePeriodMs: 4200,
  /** Resting card scale oscillation, ±fraction. ~1.2%. */
  breatheScale: 0.012,
  /** Resting card vertical drift, ±px. */
  breatheDriftPx: 3,
  /** Fraction of card width a horizontal drag must cross to commit. */
  swipeCommitFraction: 0.32,
  /** Velocity (px/s) that commits a swipe regardless of distance. */
  swipeVelocityCommit: 720,
  /** Vertical px of the next card peeking below the top card. v40: 14→26 so
   *  the deck visibly reads as a STACK, not a single floating card. */
  peekOffsetPx: 26,
  /** Scale step applied to each card deeper in the stack. v40: 0.04→0.055. */
  peekScaleStep: 0.055,
  /** Resting tilt (deg) each peek card fans by — the deck looks "dealt" at
   *  rest, not perfectly squared. Eases to 0 as a card rises to the top. */
  restingTiltDeg: 2,
  /** How far a card flies off-screen on commit, as a width multiple. */
  flyoutFraction: 1.25,
  /** Rotation (deg) at full horizontal drag — the "dealt card" tilt.
   *  v40: 8→15 so a committed swipe reads as DEALT, not slid. */
  maxTiltDeg: 15,
} as const;

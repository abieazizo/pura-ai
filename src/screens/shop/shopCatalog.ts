/**
 * Curated shop catalog — every product surfaced to the storefront
 * carries a verified clean catalog packshot. No raw/handheld scans,
 * no SVG silhouettes, no initials artwork.
 *
 * Asset gate: each entry below has been opened during development and
 * visually confirmed as a clean, centered, professionally framed
 * product photograph appropriate for a luxury skincare commerce
 * surface. Adding a product without verifying its asset is a
 * regression — the storefront refuses to render anything without a
 * `catalogPackshot` reference.
 *
 * Assets live in `assets/shop-packshots/<id>.{png|jpg}` and are
 * bundled via Metro require().
 */

import type { ImageSourcePropType } from 'react-native';
import type { PackshotTone } from './components/ProductPackshot';

export type ShopBadgeTone = 'sage' | 'honey' | 'coral' | 'ocean' | 'bestseller' | 'viral';

export interface ShopCatalogProduct {
  id: string;
  brand: string;
  name: string;
  shortName?: string;
  /** Clean catalog packshot. Required — there is no fallback path. */
  catalogPackshot: ImageSourcePropType;
  /** Backdrop tone for the packshot stage. */
  packshotTone: PackshotTone;
  price: number;
  compareAtPrice?: number;
  rating?: number;
  reviewCount?: number;
  benefitLine: string;
  usageLine?: string;
  badge?: { label: string; tone: ShopBadgeTone };
  matchScore?: number;
  concernTags: ConcernKey[];
  /** Coarse category — drives search + suggestion chips. */
  category: ShopCategory;
  /** True for products the engine can promote as the night's #1 pick. */
  eligibleHero?: boolean;
  /** Higher = ranked first when concern matches. */
  affinityHint?: number;
}

export type ConcernKey = 'breakouts' | 'hydration' | 'marks' | 'barrier' | 'bright';

/**
 * Coarse storefront category.
 */
export type ShopCategory =
  | 'cleanser'
  | 'toner'
  | 'serum'
  | 'moisturizer'
  | 'spf'
  | 'treatment'
  | 'mask';

// ---------------------------------------------------------------------------
// Asset bindings — explicit require() calls so Metro bundles every
// referenced packshot. If any of these fail at build time, the build
// fails (preferable to a silently broken card at runtime).
// ---------------------------------------------------------------------------

const PACKSHOT = {
  paulasChoice2Bha: require('../../../assets/shop-packshots/paulas-choice-2-bha.png'),
  ceraveHydratingCleanser: require('../../../assets/shop-packshots/cerave-hydrating-cleanser.jpg'),
  theOrdinaryNiacinamide: require('../../../assets/shop-packshots/the-ordinary-niacinamide.png'),
  theOrdinaryLacticAcid: require('../../../assets/products/the-ordinary-lactic-acid.jpg'),
  laRochePosayEffaclar: require('../../../assets/shop-packshots/la-roche-posay-effaclar.jpg'),
  beautyOfJoseonRelief: require('../../../assets/shop-packshots/beauty-of-joseon-relief-sun.jpg'),
  anuaHeartleaf: require('../../../assets/shop-packshots/anua-heartleaf.jpg'),
  supergoopUnseen: require('../../../assets/products/supergoop-unseen.jpg'),
};

// ---------------------------------------------------------------------------
// Catalog — every product here has been verified to load a clean asset.
// ---------------------------------------------------------------------------

export const SHOP_CATALOG: ShopCatalogProduct[] = [
  {
    id: 'paulas-choice-2-bha',
    brand: "Paula's Choice",
    name: 'Skin Perfecting 2% BHA Liquid Exfoliant',
    shortName: '2% BHA Liquid Exfoliant',
    catalogPackshot: PACKSHOT.paulasChoice2Bha,
    packshotTone: 'peach',
    category: 'treatment',
    price: 35,
    rating: 4.8,
    reviewCount: 12400,
    benefitLine: 'For active breakouts & clogged pores',
    usageLine: 'PM · 3× per week',
    matchScore: 98,
    concernTags: ['breakouts', 'marks'],
    eligibleHero: true,
    affinityHint: 100,
  },
  {
    id: 'cerave-hydrating-cleanser',
    brand: 'CeraVe',
    name: 'Hydrating Facial Cleanser',
    shortName: 'Hydrating Cleanser',
    catalogPackshot: PACKSHOT.ceraveHydratingCleanser,
    packshotTone: 'mist',
    category: 'cleanser',
    price: 16,
    rating: 4.8,
    reviewCount: 38600,
    benefitLine: 'Non-stripping daily cleanse',
    usageLine: 'AM / PM · Daily',
    badge: { label: 'Gentle cleanse', tone: 'sage' },
    matchScore: 92,
    concernTags: ['hydration', 'barrier'],
    affinityHint: 88,
  },
  {
    id: 'the-ordinary-niacinamide',
    brand: 'The Ordinary',
    name: 'Niacinamide 10% + Zinc 1%',
    shortName: 'Niacinamide 10%',
    catalogPackshot: PACKSHOT.theOrdinaryNiacinamide,
    packshotTone: 'ivory',
    category: 'serum',
    price: 8.8,
    rating: 4.7,
    reviewCount: 24000,
    benefitLine: 'Visible pores & sebum control',
    usageLine: 'AM or PM',
    badge: { label: 'Oil control', tone: 'honey' },
    matchScore: 90,
    concernTags: ['breakouts', 'marks'],
    affinityHint: 92,
  },
  {
    id: 'la-roche-posay-effaclar',
    brand: 'La Roche-Posay',
    name: 'Effaclar Targeted Breakout Corrector',
    shortName: 'Effaclar Corrector',
    catalogPackshot: PACKSHOT.laRochePosayEffaclar,
    packshotTone: 'ivory',
    category: 'treatment',
    price: 19.99,
    rating: 4.6,
    reviewCount: 3400,
    benefitLine: 'Targeted spot treatment',
    usageLine: 'PM · spot apply',
    badge: { label: 'Targeted care', tone: 'ocean' },
    concernTags: ['breakouts', 'marks'],
    affinityHint: 78,
  },
  {
    id: 'beauty-of-joseon-relief-sun',
    brand: 'Beauty of Joseon',
    name: 'Relief Sun: Rice + Probiotics SPF50+',
    shortName: 'Relief Sun SPF50+',
    catalogPackshot: PACKSHOT.beautyOfJoseonRelief,
    packshotTone: 'cream',
    category: 'spf',
    price: 18,
    rating: 4.9,
    reviewCount: 27800,
    benefitLine: 'Daily UV without white cast',
    usageLine: 'AM · last step',
    badge: { label: 'Bestseller', tone: 'bestseller' },
    concernTags: ['bright', 'hydration'],
    affinityHint: 85,
  },
  {
    id: 'anua-heartleaf',
    brand: 'Anua',
    name: 'Heartleaf Quercetinol Pore Deep Cleansing Foam',
    shortName: 'Heartleaf Cleanser',
    catalogPackshot: PACKSHOT.anuaHeartleaf,
    packshotTone: 'sage',
    category: 'cleanser',
    price: 22,
    rating: 4.8,
    reviewCount: 18600,
    benefitLine: 'Calms redness & soothes',
    usageLine: 'AM / PM',
    badge: { label: 'Viral', tone: 'viral' },
    concernTags: ['barrier', 'hydration'],
    affinityHint: 80,
  },
  {
    id: 'the-ordinary-lactic-acid',
    brand: 'The Ordinary',
    name: 'Lactic Acid 10% + HA',
    shortName: 'Lactic Acid 10%',
    catalogPackshot: PACKSHOT.theOrdinaryLacticAcid,
    packshotTone: 'blush',
    category: 'treatment',
    price: 9,
    rating: 4.6,
    reviewCount: 11200,
    benefitLine: 'Gentle surface resurfacing',
    usageLine: 'PM · 2× per week',
    concernTags: ['marks', 'bright'],
    affinityHint: 70,
  },
  {
    id: 'supergoop-unseen',
    brand: 'Supergoop!',
    name: 'Unseen Sunscreen SPF40',
    shortName: 'Unseen SPF40',
    catalogPackshot: PACKSHOT.supergoopUnseen,
    packshotTone: 'peach',
    category: 'spf',
    price: 42,
    rating: 4.7,
    reviewCount: 9600,
    benefitLine: 'Invisible daily SPF + primer',
    usageLine: 'AM · last step',
    badge: { label: 'Bestseller', tone: 'bestseller' },
    concernTags: ['bright', 'hydration'],
    affinityHint: 76,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function findShopProduct(id: string): ShopCatalogProduct | undefined {
  return SHOP_CATALOG.find((p) => p.id === id);
}

export function scoreForConcern(p: ShopCatalogProduct, concern: ConcernKey | 'all'): number {
  if (concern === 'all') return p.affinityHint ?? 0;
  if (!p.concernTags.includes(concern)) return 0;
  return (p.affinityHint ?? 0) + 20;
}

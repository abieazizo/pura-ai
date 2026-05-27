/**
 * Today's Plan — canonical state machine.
 *
 * A single derivation that classifies the user into one of five plan
 * states and bundles every flag the new Today / Progress / Shelf tabs
 * need to render without re-asking the store.
 *
 *   noScan            scans.length === 0
 *   baselineCreated   scans.length === 1
 *   personalized      scans.length 2–4
 *   calibrating       scans.length 5–13
 *   highConfidence    scans.length ≥ 14
 *
 * Every visible label in the Plan UI (status pill, confidence chip, hero
 * copy, lock state) flows from this object. If a screen wants a fact
 * the state can express, the state should express it — UI must never
 * reach back into the store for confidence-aware copy.
 */

import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { hydrate } from '@/screens/routine/lib';
import type { Product, ProductCategory } from '@/types';
import type { Scan } from '@/types';

export type PlanStage =
  | 'noScan'
  | 'baselineCreated'
  | 'personalized'
  | 'calibrating'
  | 'highConfidence';

export type ConfidenceLabel =
  | 'Scan needed'
  | 'Baseline created'
  | 'Personalized'
  | 'Calibrating'
  | 'High confidence';

/** Shelf categories the Plan UI tracks for "Missing essentials". */
export const SHELF_CATEGORIES: ReadonlyArray<{
  key: ProductCategory;
  label: string;
}> = [
  { key: 'cleanser', label: 'Cleanser' },
  { key: 'serum', label: 'Hydration' },
  { key: 'moisturizer', label: 'Moisturizer' },
  { key: 'spf', label: 'SPF' },
];

export interface ShelfSlot {
  category: ProductCategory;
  label: string;
  /** First product the user owns in this category, or null. */
  product: Product | null;
  /** True when at least one product in this category is in any slot. */
  filled: boolean;
}

export interface PlanState {
  stage: PlanStage;
  confidenceLabel: ConfidenceLabel;

  scans: Scan[];
  scanCount: number;
  firstScan: Scan | undefined;
  latestScan: Scan | undefined;

  morningProducts: Product[];
  eveningProducts: Product[];
  savedProducts: Product[];

  ownedProductCount: number;
  hasAnyProducts: boolean;

  /** True when the user owns or has saved a product in this category. */
  hasCategory: Record<ProductCategory, boolean>;

  /** Per-shelf-category slot used by the Shelf tab + Missing Essentials. */
  shelfSlots: ShelfSlot[];

  /** True only after enough scans to render trend curves (≥ 2). */
  canShowTrend: boolean;

  /** True only after enough scans to show "improved / needs care" claims (≥ 2). */
  canShowChange: boolean;

  /** True only at calibrating or higher — when the AI can speak with weight. */
  canShowAIClaims: boolean;
}

const CATEGORY_TO_SLOT_KEY: Record<ProductCategory, ProductCategory> = {
  cleanser: 'cleanser',
  toner: 'serum', // toner counts as hydration
  serum: 'serum',
  moisturizer: 'moisturizer',
  spf: 'spf',
  treatment: 'treatment',
  mask: 'treatment',
};

/** Pure builder — easy to unit test, no store reads. */
export function buildPlanState(args: {
  scans: Scan[];
  morningIds: string[];
  eveningIds: string[];
  savedIds: string[];
}): PlanState {
  const { scans, morningIds, eveningIds, savedIds } = args;

  const morningProducts = hydrate(morningIds);
  const eveningProducts = hydrate(eveningIds);
  const savedProducts = hydrate(savedIds);

  const scanCount = scans.length;
  const stage: PlanStage =
    scanCount === 0
      ? 'noScan'
      : scanCount === 1
      ? 'baselineCreated'
      : scanCount <= 4
      ? 'personalized'
      : scanCount <= 13
      ? 'calibrating'
      : 'highConfidence';

  const confidenceLabel: ConfidenceLabel =
    stage === 'noScan'
      ? 'Scan needed'
      : stage === 'baselineCreated'
      ? 'Baseline created'
      : stage === 'personalized'
      ? 'Personalized'
      : stage === 'calibrating'
      ? 'Calibrating'
      : 'High confidence';

  // Build per-category ownership from the union of all slots.
  const allOwned = [...morningProducts, ...eveningProducts, ...savedProducts];
  const hasCategory: Record<ProductCategory, boolean> = {
    cleanser: false,
    toner: false,
    serum: false,
    moisturizer: false,
    spf: false,
    treatment: false,
    mask: false,
  };
  for (const p of allOwned) {
    hasCategory[p.category] = true;
    // Cross-map toner → serum (hydration) and mask → treatment so the
    // Shelf tab respects category aliases.
    const aliased = CATEGORY_TO_SLOT_KEY[p.category];
    if (aliased) hasCategory[aliased] = true;
  }

  const shelfSlots: ShelfSlot[] = SHELF_CATEGORIES.map((c) => {
    const productInMain = allOwned.find(
      (p) => CATEGORY_TO_SLOT_KEY[p.category] === c.key
    );
    return {
      category: c.key,
      label: c.label,
      product: productInMain ?? null,
      filled: !!productInMain,
    };
  });

  const ownedProductCount = new Set(allOwned.map((p) => p.id)).size;
  const hasAnyProducts = ownedProductCount > 0;

  return {
    stage,
    confidenceLabel,
    scans,
    scanCount,
    firstScan: scans[0],
    latestScan: scans[scans.length - 1],
    morningProducts,
    eveningProducts,
    savedProducts,
    ownedProductCount,
    hasAnyProducts,
    hasCategory,
    shelfSlots,
    canShowTrend: scanCount >= 2,
    canShowChange: scanCount >= 2,
    canShowAIClaims: scanCount >= 5,
  };
}

/**
 * React hook the Plan screen (and its tabs) call. Subscribed to the
 * minimum store slices so unrelated state changes don't re-derive.
 */
export function usePlanState(): PlanState {
  const scans = useAppStore((s) => s.scans);
  const morning = useAppStore((s) => s.userRoutineMorning);
  const evening = useAppStore((s) => s.userRoutineEvening);
  const wishlist = useAppStore((s) => s.wishlist);

  return useMemo(
    () =>
      buildPlanState({
        scans,
        morningIds: morning,
        eveningIds: evening,
        savedIds: wishlist,
      }),
    [scans, morning, evening, wishlist]
  );
}

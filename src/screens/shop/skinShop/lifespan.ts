/**
 * lifespan — typical days a product lasts at normal daily use.
 *
 * Honest approximations by routine step, with per-product overrides for known
 * outliers (small dropper bottles run out faster; big tubs last longer). This
 * is REAL product knowledge, not a guess about THIS user — it only ever feeds a
 * restock estimate when the user has actually confirmed when they got the item
 * (see engine.ts; without a confirmed date there is no restock signal at all).
 *
 * Kept in this module rather than baked into the catalog so the curated SKU list
 * (src/commerce/catalog.ts) and its money-engine verifier stay untouched.
 */

import type { CommerceSku, RoutineStepKind } from '@/commerce/types';

const BY_STEP: Record<RoutineStepKind, number> = {
  cleanse: 90, // a bottle of cleanser ~3 months
  treat: 60, // serum / active, smaller, ~2 months
  moisturize: 75, // ~2.5 months
  protect: 60, // SPF used generously every AM, ~2 months
};

// Per-id overrides for sizes that diverge from the step default.
const OVERRIDE: Record<string, number> = {
  // The Ordinary / Inkey 30ml dropper bottles empty faster.
  'to-niacinamide-10': 45,
  'to-azelaic-10': 45,
  'to-lactic-10': 45,
  'to-retinal-02': 45,
  'inkey-hyaluronic': 45,
  'goodmolecules-discoloration': 45,
  // Big tubs / large lotions last longer.
  'cerave-cream': 120,
  'cerave-daily-lotion': 120,
  'cetaphil-gentle-cleanser': 120,
  // Small SPF tubes get used up quickly at a proper application amount.
  'canmake-mermaid': 40,
  'isntree-watery-sun': 45,
};

export function typicalLifespanDays(sku: Pick<CommerceSku, 'id' | 'step'>): number {
  return OVERRIDE[sku.id] ?? BY_STEP[sku.step];
}

export function lifespanForStep(step: RoutineStepKind): number {
  return BY_STEP[step];
}

export const lifespanOverrides = OVERRIDE;

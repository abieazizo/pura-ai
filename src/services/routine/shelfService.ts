/**
 * Pura Routine — shelf service.
 *
 * Returns the products the user already owns, normalized into the
 * routine `RoutineProduct` shape. Owned products are sourced from
 * the existing `userRoutineMorning` / `userRoutineEvening` arrays in
 * `useAppStore` plus the routine store's per-routine confirmations.
 *
 * Never invents ownership — a product is owned only when the user
 * has explicitly added it to their routine or confirmed it.
 */

import { useAppStore } from '@/store/useAppStore';
import { useRoutineStore } from '@/state/routine/routineStore';
import { SHOP_CATALOG, type ShopCatalogProduct } from '@/screens/shop/shopCatalog';
import type { RoutineProduct, RoutineStepType } from '@/types/routine';

/**
 * Stable product-id → routine step type mapping. Keyed by id so the
 * mapping stays explicit even when catalog fields change. Anything
 * not listed defaults to 'treat'.
 */
const PRODUCT_ID_TO_STEP_TYPE: Record<string, RoutineStepType> = {
  'paulas-choice-2-bha': 'treat',
  'cerave-hydrating-cleanser': 'cleanse',
  'the-ordinary-niacinamide': 'treat',
  'la-roche-posay-effaclar': 'treat',
  'beauty-of-joseon-relief-sun': 'protect',
  'anua-heartleaf': 'cleanse',
  'the-ordinary-lactic-acid': 'treat',
  'supergoop-unseen': 'protect',
};

export function stepTypeForCatalogProduct(p: ShopCatalogProduct): RoutineStepType {
  return PRODUCT_ID_TO_STEP_TYPE[p.id] ?? 'treat';
}

export function catalogProductToRoutineProduct(
  p: ShopCatalogProduct,
  availability: RoutineProduct['availability'],
  whyMatched?: string,
): RoutineProduct {
  return {
    id: p.id,
    brand: p.brand,
    name: p.name,
    imageUrl: undefined,
    imageAsset: undefined,
    productType: stepTypeForCatalogProduct(p),
    availability,
    whyMatched,
  };
}

/**
 * The user's shelf — products explicitly added to morning or evening
 * routines anywhere in the app, plus products the routine store has
 * received an explicit ownership confirmation for.
 */
export function getShelfProductIds(): string[] {
  const state = useAppStore.getState();
  const confirmed = useRoutineStore.getState().confirmedOwnedProductIds;
  const ids = new Set<string>([
    ...state.userRoutineMorning,
    ...state.userRoutineEvening,
    ...Object.keys(confirmed),
  ]);
  return Array.from(ids);
}

export function getShelfProducts(): RoutineProduct[] {
  const ids = getShelfProductIds();
  return ids
    .map((id) => SHOP_CATALOG.find((p) => p.id === id))
    .filter((p): p is ShopCatalogProduct => !!p)
    .map((p) => catalogProductToRoutineProduct(p, 'owned'));
}

/**
 * Check whether the user has a shelf product compatible with a step
 * type. Returns the strongest match, if any.
 */
export function findOwnedProductForStep(
  type: RoutineStepType,
): RoutineProduct | undefined {
  const owned = getShelfProducts();
  return owned.find((p) => p.productType === type);
}

/**
 * useSkinShop — the real personalization + replenishment engine behind the Shop.
 * Functionality only; the screen redesign binds to this model next.
 */

export { useSkinShop } from './useSkinShop';
export { buildSkinShop, type BuildSkinShopInput } from './engine';
export { resolveProduct, skuToShopProduct, amazonSearch } from './catalogBridge';
export { typicalLifespanDays, lifespanForStep } from './lifespan';
export {
  concernLabel,
  concernMetric,
  concernTags,
  concernTint,
  concernTintHex,
  severityStrength,
  severityWeight,
} from './concernMap';
export type {
  SkinShopModel,
  SkinShopStatus,
  ShopProduct,
  ConcernPick,
  PickLabel,
  CollectionItem,
  RestockState,
  ConcernFilterOption,
  FindingEcho,
  HonestyFlags,
} from './types';

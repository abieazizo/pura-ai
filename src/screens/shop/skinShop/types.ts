/**
 * useSkinShop — the data contract the Shop tab renders from.
 *
 * One reactive model, derived ENTIRELY from (a) the canonical last-scan findings
 * (`SkinState.topConcerns`), (b) the user's KEPT routine (the product ids they
 * placed in morning/evening), and (c) — only if it exists — a confirmed "I got
 * this" date. Nothing here is a generic catalog: every product is tied to a
 * finding, a concern, or the user's own routine.
 *
 * HONESTY, encoded in the types:
 *   • `restock.isReal` gates every restock claim. With no confirmed-got date it
 *     is false, `restockSoon` is false, and `daysLeft` is null — a plain reorder,
 *     never fake urgency (Pura cannot see Amazon purchases).
 *   • picks are ranked by FIT to the finding; price/commission never order them.
 *   • dead/discontinued links are filtered out before they ever reach this model.
 */

import type { ImageSourcePropType } from 'react-native';
import type { ConcernType } from '@/ai/ai-contracts';
import type { MetricKind } from '@/types/skinRead';
import type { ConcernTag, PriceTier, RoutineStepKind } from '@/commerce/types';

// ── Unified product (bridges the commerce + shop catalogs) ──────────────────

export interface ShopProduct {
  id: string;
  brand: string;
  name: string;
  /** require()'d packshot or null (brand-tile fallback). Never a vector. */
  image: ImageSourcePropType | null;
  /** Affiliate handoff target — always present (a tagged Amazon search if the
   *  SKU has no explicit URL). */
  affiliateUrl: string;
  step: RoutineStepKind | null;
  /** Catalog concern axes (metric space) this SKU addresses. */
  concerns: ConcernTag[];
  priceUsd: number | null;
  priceTier: PriceTier | null;
  blurb: string | null;
  typicalLifespanDays: number | null;
  source: 'commerce' | 'shop';
}

// ── Finding echo (the on-skin glow data the UI re-renders) ──────────────────

export interface FindingEcho {
  /** Stable id for the finding within this read (`<concern>-<index>`). */
  findingId: string;
  concern: ConcernType;
  /** Scan-language label, e.g. "Redness", "Dryness" (the user's own words). */
  label: string;
  /** Tint family — the SAME one the scan glow uses. */
  metric: MetricKind;
  /** Theme-agnostic anchor hex for the glow echo. */
  tintHex: string;
  /** 0..1 — severity-derived; drives glow opacity. */
  strength: number;
  /** 0..1 model confidence in the finding. */
  confidence: number;
  /** Movement vs the previous scan (drives "less needed now"). */
  direction: 'better' | 'same' | 'worse' | 'new' | null;
}

// ── Concern picks ───────────────────────────────────────────────────────────

export type PickLabel = 'good_match' | 'optional' | 'skippable';

export interface ConcernPick {
  product: ShopProduct;
  /** The finding this pick answers. */
  forFindingId: string;
  echo: FindingEcho;
  /** ONE plain sentence tying the product to THAT finding. */
  whyLine: string;
  priceUsd: number | null;
  /** good match / optional / "you can skip this for now". */
  label: PickLabel;
  /** Honest cheaper path for the same job, or null when the pick is budget. */
  budgetAlternative: ShopProduct | null;
  /** Evolution: the finding improved on a newer scan → dial this back. */
  lessNeededNow: boolean;
  /** Fit-to-finding score (transparency/debug). NEVER price or commission. */
  fitScore: number;
}

// ── The collection (reorder source = kept routine) ──────────────────────────

export interface RestockState {
  /** True ONLY when a confirmed-got date AND a typical lifespan both exist. */
  isReal: boolean;
  /** Never true without `isReal`. */
  restockSoon: boolean;
  /** Estimated days of product left; null unless `isReal`. */
  daysLeft: number | null;
  confirmedGotAt: string | null;
  typicalLifespanDays: number | null;
  /** Plain explanation of why this is/ isn't a real restock estimate. */
  reason: string;
}

export interface CollectionItem {
  product: ShopProduct;
  slot: 'morning' | 'evening' | 'both';
  /** Affiliate reorder handoff. */
  reorderUrl: string;
  restock: RestockState;
}

// ── Concern filter ──────────────────────────────────────────────────────────

export interface ConcernFilterOption {
  concern: ConcernType;
  label: string;
  metric: MetricKind;
  tintHex: string;
  /** How many picks address this concern. */
  count: number;
}

// ── Honesty flags (always present, always true) ─────────────────────────────

export interface HonestyFlags {
  /** The promise that the plan works with what they own. */
  worksWithoutBuying: string;
  /** Affiliate disclosure. */
  affiliateDisclosure: string;
  /** Why "running low" can't be real without a confirmation. */
  restockHonesty: string;
}

// ── The model ───────────────────────────────────────────────────────────────

export type SkinShopStatus = 'notScanned' | 'ready';

export interface SkinShopModel {
  status: SkinShopStatus;
  honesty: HonestyFlags;
  /** Kept-routine products to reorder. Empty pre-scan. */
  collection: CollectionItem[];
  /** The single most-due item — null unless a REAL restock estimate exists. */
  featuredRestock: CollectionItem | null;
  /** The user's actual concerns in scan language (drives the filter chips). */
  concerns: ConcernFilterOption[];
  /** Tight, fit-ranked picks tied to findings. Empty pre-scan. */
  picks: ConcernPick[];
  /** Returns the picks for one concern, or all of them. */
  filterPicksByConcern: (concern: ConcernType | 'all') => ConcernPick[];
}

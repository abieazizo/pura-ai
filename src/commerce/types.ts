/**
 * Commerce types — the money flow's data contract.
 *
 * CORE PRINCIPLE (blueprint §1): the recommendation IS the routine. There is no
 * abstract routine that gets products bolted on — each routine slot is a real
 * product pick, and the routine LOCKS at Confirm together with the purchase
 * decision.
 *
 * The engine that fills these types is RULES-BASED (engine.ts) — deterministic,
 * auditable, testable. An LLM may write ONLY the short "why this is for you"
 * line (and a deterministic template always stands in for it).
 */

import type { MetricKind, ReadLevel } from '@/types/skinRead';

// ── Catalog ────────────────────────────────────────────────────────────────

export type RoutineStepKind = 'cleanse' | 'treat' | 'moisturize' | 'protect';
export type PriceTier = 'budget' | 'mid' | 'premium';
export type TimeOfDay = 'AM' | 'PM' | 'both';

/** Concern axes a SKU addresses. Mirrors the scan metrics + general support. */
export type ConcernTag = Exclude<MetricKind, 'positive'> | 'sensitive' | 'all_skin';

export interface CommerceSku {
  id: string;
  brand: string;
  /** Full product name — NEVER truncated in UI. */
  name: string;
  step: RoutineStepKind;
  time: TimeOfDay;
  priceTier: PriceTier;
  priceUsd: number;
  concerns: ConcernTag[];
  /**
   * 'none'    — no actives (cleanser, bland moisturizer, SPF)
   * 'gentle'  — mild actives (niacinamide, azelaic, PHA)
   * 'active'  — real actives (BHA/AHA, retinoids, vitamin C) — the beginner
   *             cap counts THESE: a beginner routine carries at most one.
   */
  activeStrength: 'none' | 'gentle' | 'active';
  /** Safe as a first product of its kind with no ramp-up advice. */
  beginnerSafe: boolean;
  /**
   * Purchase handoff target (affiliate now, owned checkout later — the Buy
   * button's backend is swappable; this is just the product intent).
   */
  affiliateUrl: string;
  /** Transparent/usable packshot via require(), or null (brand-tile fallback). */
  image: number | null;
  /** One plain sentence about what it is. No jargon. */
  blurb: string;
}

// ── Engine input ───────────────────────────────────────────────────────────

/** What the tailoring screen collects — two quick taps, never a quiz. */
export interface TailoringInput {
  /** Q1 "How much do you want to take on?" */
  depth: 'essentials' | 'full' | 'choose';
  /** Q2 "Anything you already use and love?" — steps the user already owns. */
  ownedSteps: RoutineStepKind[];
}

/** The slice of a SkinReadFinding the engine needs (kept narrow on purpose). */
export interface EngineFinding {
  id: string;
  metric: MetricKind;
  level: ReadLevel;
  /** Plain region phrase for why-lines, e.g. "your cheeks" (may be ''). */
  regionPhrase: string;
}

export interface EngineInput {
  findings: EngineFinding[];
  tailoring: TailoringInput;
  /** First-routine user → the one-active cap applies. Defaults true. */
  beginner?: boolean;
}

// ── Engine output (the schema every money screen reads) ───────────────────

export type PickLabel = 'good_match' | 'optional' | 'skippable';

export interface RoutinePick {
  sku: CommerceSku;
  /**
   * Deterministic plain-language tie to the finding, e.g.
   * "Treat — for the redness on your cheeks". The optional LLM polish may
   * rephrase TONE only; this string is always present and never blocks on AI.
   */
  whyLine: string;
  /** Finding ids this pick addresses (ties the card to the scan). */
  findingIds: string[];
}

export interface RoutineSlot {
  step: RoutineStepKind;
  time: TimeOfDay;
  /** The fit-ranked pick. Null only when the slot is skipped-as-owned. */
  pick: RoutinePick | null;
  /**
   * The honest budget path: the best budget-tier candidate for this slot.
   * Null ONLY when the pick itself is already budget tier.
   */
  budgetAlternative: RoutinePick | null;
  label: PickLabel;
  /** True → "you've got a cleanser, so we skipped it." Not in the basket. */
  skippedBecauseOwned: boolean;
  /** Essentials are pre-selected (the lazy path is zero work). */
  essential: boolean;
}

export interface RecommendationSet {
  slots: RoutineSlot[];
  /** AM/PM orderings of the same slots (a slot with time 'both' appears in each). */
  am: RoutineSlot[];
  pm: RoutineSlot[];
  /** Finding ids the set was built from (provenance). */
  basisFindingIds: string[];
  tailoring: TailoringInput;
  /** Honest count of actives across picks (beginner cap audit). */
  activeCount: number;
}

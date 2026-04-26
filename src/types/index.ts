import type { AvatarColor } from '@/theme';
import type { FaceScanAnalysis } from '@/ai/ai-contracts';

export interface User {
  id: string;
  name: string;
  initials: string;
  avatarColor: AvatarColor;
  joinedAt: string; // ISO
}

export type SkinZoneKey =
  | 'chin'
  | 'forehead'
  | 'tZone'
  | 'cheeks'
  | 'nose'
  | 'jawline';

export type ZoneStatus = 'active' | 'monitor' | 'calm';
export type ZoneTrend = 'improving' | 'stable' | 'worsening';

export interface ZoneGlow {
  x: number; // 0..1 (relative within photo)
  y: number; // 0..1
  radius: number; // 0..1 (relative to min(width, height))
  intensity: number; // 0..1
}

export interface SkinZone {
  key: SkinZoneKey;
  label: string;
  status: ZoneStatus;
  trend: ZoneTrend;
  score: number; // 0..100
  shortInsight: string;
  glow?: ZoneGlow[];
}

export interface Scan {
  id: string;
  capturedAt: string;
  dayNumber: number;
  photoUri: string;
  overallScore: number;
  zones: SkinZone[];
  summaryHeadline: string;
  summaryBody: string;
  /**
   * Concern-centric surface model (v8.1). Every scan returns exactly 4
   * concerns ranked 1→4 by what to tackle first. Zones remain for overlay
   * geometry + backward-compat; the UI surfaces concerns.
   */
  concerns?: Concern[];
  /**
   * v10.22 — full structured AI analysis. Set when the scan was
   * processed through `aiGateway.analyzeFaceScan`; null when the
   * deterministic fallback ran (no API key / no proxy / network
   * failure). Helpers like `buildSkinScoreWhy`, `buildTonightFocus`,
   * and `buildSummaryHeadline` prefer values from this object when
   * present and fall back to deterministic templates otherwise — so
   * every UI consumer of those helpers transparently upgrades to AI
   * voice without rewiring.
   */
  aiAnalysis?: FaceScanAnalysis;
}

// ---------- Concern model (v8.1) ----------
// The scan result is expressed to the user as 4 concerns, not 4 zone scores.
// Each concern is a complete micro-story: what I see → what it means → what
// to do tonight. Regions are named in plain English ("chin", "nose and
// center forehead"). Severity is a closed 4-tier set; there's no raw score
// surfaced to the user per concern — only tiers.

export type ConcernCategory = 'breakouts' | 'hydration' | 'texture' | 'tone';

export type Severity = 'calm' | 'mild' | 'moderate' | 'needs-attention';

export type ConcernTrend = 'new' | 'improved' | 'unchanged' | 'worsened';

export interface ConcernHotspot {
  /** Normalized 0-1 within the photo box. */
  x: number;
  y: number;
}

export interface Concern {
  category: ConcernCategory;
  severity: Severity;
  /** 1..4, ordered by priority ("what to tackle first"). */
  rank: number;
  /** Plain-English region phrase: "chin", "left cheek", "across the face". */
  region: string;
  /** 1-3 hotspots overlaid on the photo. */
  hotspots: ConcernHotspot[];
  /** What I see — one sentence. */
  finding: string;
  /** What it means — one sentence. */
  interpretation: string;
  /** What to do tonight — one actionable sentence. */
  nextStep: string;
  trend: ConcernTrend;
}

// ---------- v7.7 scan analyzing additions (additive, coexists with Scan) ----------
// ScanResult is the shape the cinematic analyzing screen renders from. The
// existing `Scan` type continues to power history + the results screens; a
// ScanResult is derived from a Scan in `useAppStore.setScanResult`.

export type FindingType =
  | 'dryness'
  | 'texture'
  | 'barrier'
  | 'hydration'
  | 'redness'
  | 'clarity';

export type ScanZoneKey = 'forehead' | 'tZone' | 'chin' | 'cheeks';

export interface ScanFinding {
  type: FindingType;
  zone: ScanZoneKey;
  /** Normalized coordinates inside the photo box, 0-1 each axis. */
  position: { x: number; y: number };
  /** Single-word italic label shown in Beat 4. */
  label: string;
}

export interface ScanResult {
  photoUri: string;
  /** Set after Beat 6 by the view-shot composite capture (optional). */
  compositePhotoUri?: string;
  overallScore: number;
  zoneScores: Record<ScanZoneKey, number>;
  /** Always exactly 4 in order [dryness, texture, barrier, hydration]. */
  findings: ScanFinding[];
  aiReadout: string;
  timestamp: string;
  /** 1-indexed; used for beat-timing compression on repeat scans. */
  scanCount: number;
  /** Id of the underlying Scan record so results screens can deep-link. */
  scanId?: string;
}

export interface InFlightScan {
  photoUri: string;
  startedAt: number;
}

export type ProductCategory =
  | 'cleanser'
  | 'toner'
  | 'serum'
  | 'moisturizer'
  | 'spf'
  | 'treatment'
  | 'mask';

export type ProductTint = 'sand' | 'clay' | 'moss';

export type ProductTag =
  | 'natural'
  | 'sensitive-safe'
  | 'fragrance-free'
  | 'clean'
  | 'dermatologist-tested';

export interface IngredientDetail {
  name: string;
  purpose: string;
}

export interface Product {
  id: string;
  brand: string;
  name: string; // NEVER truncate this in UI
  category: ProductCategory;
  imageUri: string;
  ingredients: string[];
  keyIngredients: string[];
  priceUsd?: number;
  description: string;

  // v7.6 — Products + Product Detail rebuild. All added additively so
  // screens that read the older fields (e.g. the scan-result mock) keep
  // compiling.
  tint: ProductTint; // deterministic hash(id) % 3 of the 3 warm tones
  rating: number; // 0..5, one decimal
  reviewCount: number;
  matchScore: number; // 0..100 vs the signed-in user
  tags: ProductTag[];
  addedDate: string; // ISO
  price: number; // canonical numeric price used by new Products UI
  /** Optional structured ingredients list used by IngredientsPanel. Falls
   *  back to `ingredients[]` when absent. */
  ingredientList?: IngredientDetail[];
  howToUse?: string;
  formulation?: string;
  skinTypes?: string[];
  goodFor?: string[];
  /** `'Both'` is remapped to `'Morning & Evening'` at render time. */
  timeOfUse?: 'Morning' | 'Evening' | 'Both';
  contraindications?: string;
  /** Preferred high-res detail image. Falls back to `imageUri` when absent. */
  imageUrl?: string;
}

export interface ProductMatch {
  productId: string;
  matchPercent: number; // 0..100
  reasonsWhy: string[]; // max 4
  flags?: string[]; // warnings
}

// v10.14 — RoutineSlot / RoutineStepType / RoutineStep types removed.
// They described the legacy AI-generated `RoutineStep[]` shape which no
// longer ships. The v10.13 Routine sub-tab works off
// `userRoutineMorning: string[]` + `userRoutineEvening: string[]` of
// product ids, so the richer step / instruction / whyThisProduct
// fields have no consumer. If a future feature re-introduces an
// AI-generated rich routine, author a fresh type alongside the new
// shape rather than resurrecting the prior design.

export type AssistantRole = 'user' | 'assistant';

export interface AssistantMessage {
  id: string;
  role: AssistantRole;
  text: string;
  attachedProductIds?: string[];
  createdAt: string;
  /**
   * v10.26 — when the assistant reply came from the AI gateway with a
   * grounded AssistantContext, the API wrapper stamps the surfaces it
   * referenced ("scan", "routine", "matches", "active product") so
   * the chat UI can render a small attribution line under the bubble.
   * Absent on user messages and on deterministic-fallback replies.
   */
  groundedFrom?: string[];
}

// SKIN_CYCLE_DAYS lives in theme/tokens.ts so it sits alongside other
// layout constants. Re-exported here for backwards compatibility.
export { SKIN_CYCLE_DAYS } from '@/theme/tokens';

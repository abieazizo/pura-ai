/**
 * scanInsights — type contracts for the breakthrough Scan features.
 *
 * These types are ARCHITECTURE ONLY. They define the shape of the
 * data the rebuilt Scan flow can carry forward when the matching
 * backend / model capability lands. Surfacing fake data through
 * these types is forbidden — every consumer must check whether the
 * field is actually populated before rendering it.
 *
 * The Scan page itself reads only the fields that are real today
 * (Skin Score, concerns, hero product) and treats every breakthrough
 * field as optional. When a feature finally ships, the field becomes
 * populated and the UI lights up.
 *
 * Mapping to the spec:
 *   • SkinZoneInsight        — §34 AR Skin Map with Layered Explanations
 *   • RoutineDelta           — §33 Routine Autopilot with "Why tonight changed"
 *   • ConflictInsight        — §31 Ingredient Conflict Radar
 *   • ProductShelfItem       — §35 Product Shelf Memory
 *   • ForecastPoint          — §29 Skin Time Machine
 *   • SkinPatternCohort      — §30 Skin Twin Simulator
 *   • EnvironmentalContext   — §32 Skin Weather Shield
 *   • SkinEvent + PatternInsight — §36 Skin Event Journal
 *   • DermReportData         — §37 Dermatologist Handoff
 *   • CoachMode              — §38 Skin Confidence Coach
 */

// ---------------------------------------------------------------------------
// Shared atoms
// ---------------------------------------------------------------------------

export type SkinZone =
  | 'forehead'
  | 'leftCheek'
  | 'rightCheek'
  | 'nose'
  | 'chin'
  | 'jawline'
  | 'underEye';

/** 0..1 normalized signal per skin axis. Higher is better (more
 *  hydration, less texture, less redness, etc.). */
export interface SkinSignal {
  hydration?: number;
  texture?: number;
  redness?: number;
  breakout?: number;
  oiliness?: number;
  tone?: number;
  barrier?: number;
}

export interface SkinZoneInsight {
  zone: SkinZone;
  signals: SkinSignal;
  /** 0..1 — how much trust the UI should place in this row. */
  confidence: number;
  /** Plain-English one-line explanation. Optional. */
  explanation?: string;
  /** Plain-English one-line action. Optional. */
  recommendation?: string;
}

// ---------------------------------------------------------------------------
// Routine Autopilot — "Why tonight changed"
// ---------------------------------------------------------------------------

export type RoutineChangeAction = 'add' | 'remove' | 'keep' | 'replace';

export interface RoutineChange {
  action: RoutineChangeAction;
  productOrStep: string;
  /** Plain-English single-sentence reason. */
  reason: string;
  /** Optional pointer to the source signal so consumers can deep link. */
  drivingZone?: SkinZone;
  drivingSignal?: keyof SkinSignal;
}

export interface RoutineDelta {
  /** True when this scan changed at least one step in the active routine. */
  changed: boolean;
  changes: RoutineChange[];
  /** Optional one-line headline ("Tonight: hydrate, skip exfoliant."). */
  summary?: string;
}

// ---------------------------------------------------------------------------
// Ingredient Conflict Radar
// ---------------------------------------------------------------------------

export type ConflictSeverity = 'safe' | 'caution' | 'avoid';

export interface ConflictInsight {
  severity: ConflictSeverity;
  /** Product names / step labels involved. */
  products: string[];
  /** Plain-English single-sentence "why this conflicts". */
  reason: string;
  /** Plain-English single-sentence recommended action. */
  recommendedAction: string;
}

// ---------------------------------------------------------------------------
// Product Shelf Memory
// ---------------------------------------------------------------------------

export type ShelfStatus =
  | 'inRoutine'
  | 'considering'
  | 'stopped'
  | 'reaction'
  | 'wishlist';

export interface ProductShelfItem {
  productId: string;
  name: string;
  brand?: string;
  status: ShelfStatus;
  /** ISO 8601. */
  startDate?: string;
  /** ISO 8601. */
  stopDate?: string;
  /** Free-form ("nightly", "AM only", "2x per week"). */
  usageFrequency?: string;
  reactionNotes?: string;
  ingredients?: string[];
  actives?: string[];
}

// ---------------------------------------------------------------------------
// Skin Time Machine
// ---------------------------------------------------------------------------

export type ForecastHorizon = '7d' | '30d' | '90d' | '1y';

/**
 * Forecasted skin score at a future horizon. Confidence MUST be
 * surfaced so the UI never frames a forecast as a guarantee.
 */
export interface ForecastPoint {
  horizon: ForecastHorizon;
  projectedScore: number;
  /** 0..1 — drives whether the UI shows a band vs a point estimate. */
  confidence: number;
  likelyImprovement?: string;
  risk?: string;
}

// ---------------------------------------------------------------------------
// Skin Twin Simulator
// ---------------------------------------------------------------------------

export interface SkinPatternCohort {
  cohortName: string;
  minCohortSize: number;
  insight: string;
  recommendedActions: string[];
  confidence: number;
}

// ---------------------------------------------------------------------------
// Skin Weather Shield
// ---------------------------------------------------------------------------

export interface EnvironmentalContext {
  uvIndex?: number;
  humidity?: number;
  temperature?: number;
  airQuality?: number;
  /** Plain-English flags ("low humidity", "high UV"). */
  riskFlags?: string[];
}

// ---------------------------------------------------------------------------
// Skin Event Journal
// ---------------------------------------------------------------------------

export type SkinEventType =
  | 'sleep'
  | 'stress'
  | 'travel'
  | 'productChange'
  | 'routineSkip'
  | 'weather'
  | 'sun'
  | 'makeup'
  | 'custom';

export interface SkinEvent {
  type: SkinEventType;
  /** ISO 8601. */
  date: string;
  label: string;
  notes?: string;
}

export interface PatternInsight {
  title: string;
  description: string;
  /** 0..1 — drives whether the UI uses "may", "often", or "consistently". */
  confidence: number;
  relatedEvents: string[];
}

// ---------------------------------------------------------------------------
// Dermatologist Handoff Mode
// ---------------------------------------------------------------------------

export interface DermReportData {
  dateRange: { start: string; end: string };
  includePhotos: boolean;
  includeRoutine: boolean;
  includeProducts: boolean;
  includeNotes: boolean;
  summary?: string;
}

// ---------------------------------------------------------------------------
// Skin Confidence Coach
// ---------------------------------------------------------------------------

export type CoachMode = 'gentle' | 'direct' | 'science' | 'motivation' | 'minimal';

// ---------------------------------------------------------------------------
// Scan result envelope
//
// The Scan flow can emit a fully-shaped ScanResultInsights object
// that bundles every breakthrough field. The current pipeline
// populates only the fields it can prove — every consumer is
// expected to render against optional fields.
// ---------------------------------------------------------------------------

export type ScanResultStatus =
  | 'excellent'
  | 'good'
  | 'improving'
  | 'stable'
  | 'needsAttention';

export interface ScanResultInsights {
  id: string;
  /** ISO 8601. */
  createdAt: string;
  mode: 'face';
  skinScore?: number;
  previousScore?: number;
  status?: ScanResultStatus;
  zones?: SkinZoneInsight[];
  routineDelta?: RoutineDelta;
  forecast?: ForecastPoint[];
  cohort?: SkinPatternCohort;
  conflicts?: ConflictInsight[];
  environment?: EnvironmentalContext;
  patternInsights?: PatternInsight[];
  /** 0..1 — composite confidence the scan was usable. */
  confidence?: number;
  /** Plain-English privacy note used by the result UI. */
  privacyNote?: string;
}

export interface ProductScanResultInsights {
  id: string;
  createdAt: string;
  mode: 'product' | 'barcode';
  productName?: string;
  brand?: string;
  barcode?: string;
  ingredients?: string[];
  actives?: string[];
  matchScore?: number;
  flags?: ReadonlyArray<{
    type: 'helpful' | 'caution' | 'avoid';
    title: string;
    reason: string;
  }>;
  conflictInsights?: ConflictInsight[];
}

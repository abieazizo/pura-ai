/**
 * skinRead — the canonical, UI-ready contract for the SCAN-RESULTS FIRST READ.
 *
 * WHY A NEW CONTRACT (decide-and-justify): CLAUDE.md law forbids screens from
 * reading scattered raw AI output — they read canonical, validated, UI-ready
 * state. The First-Finding screen is a NEW, earlier, plain-language emotional
 * beat (the "opening line + the one located finding") whose data shape — an
 * opening line, strength-weighted located spots, a photo self-check, plain
 * confidence words — is genuinely different from the paged-reveal contract in
 * `scanResults.ts` (skin score, multiple VisibleFindings, insights, routine
 * eligibility). Forcing it into that type would distort both. So `SkinRead` is
 * the canonical sub-contract for THIS experience. It REUSES the semantic-zone
 * idea (regions, never pixels) via `FaceRegionKey`, so the geometry layer stays
 * shared in spirit with `faceGeometry`.
 *
 * The raw GPT-4V JSON is NEVER handed to the screen. `normalizeSkinRead`
 * (sibling module) validates + maps the raw response into this type, enforcing
 * the plain-language and "derive-nothing-the-model-didn't-say" rules. The screen
 * consumes only `SkinRead` (or a pending / bad-photo / error outcome).
 */

// ---------------------------------------------------------------------------
// Face regions — the FIXED plain-language place list the model may name. A
// superset of `SemanticFaceZone` (scanResults.ts) covering the brief's exact
// vocabulary. The geometry layer (faceRegions.ts) owns the polygon per key.
// ---------------------------------------------------------------------------

export type FaceRegionKey =
  | 'forehead'
  | 'between_brows'
  | 'nose'
  | 'around_nose'
  | 'left_cheek'
  | 'right_cheek'
  | 'under_eyes'
  | 'around_mouth'
  | 'chin'
  | 'jaw';

/** Human, plain label for each region (chips + VoiceOver). "Left"/"Right" are
 *  the PERSON's own sides, matching how the model speaks. */
export const REGION_LABEL: Record<FaceRegionKey, string> = {
  forehead: 'Forehead',
  between_brows: 'Between your eyebrows',
  nose: 'Nose',
  around_nose: 'Around your nose',
  left_cheek: 'Left cheek',
  right_cheek: 'Right cheek',
  under_eyes: 'Under your eyes',
  around_mouth: 'Around your mouth',
  chin: 'Chin',
  jaw: 'Jaw',
};

/** Short chip label (kept tight for the on-photo chip). */
export const REGION_CHIP: Record<FaceRegionKey, string> = {
  forehead: 'Forehead',
  between_brows: 'Brows',
  nose: 'Nose',
  around_nose: 'Around nose',
  left_cheek: 'Left cheek',
  right_cheek: 'Right cheek',
  under_eyes: 'Under eyes',
  around_mouth: 'Mouth',
  chin: 'Chin',
  jaw: 'Jaw',
};

// ---------------------------------------------------------------------------
// Metric family — picks ONE tint per finding (no rainbow). Pura Blue is RUI,
// never a concern, so it is deliberately absent here.
// ---------------------------------------------------------------------------

export type MetricKind =
  | 'redness'
  | 'dryness'
  | 'dark_marks'
  | 'breakouts'
  | 'oil'
  | 'positive' // a "keep it up" / good-things wash
  | 'neutral'; // a located finding with no strong tint family

// ---------------------------------------------------------------------------
// Plain-language enums — used VERBATIM in the UI (the model's own words).
// ---------------------------------------------------------------------------

export type ReadLevel = 'a little' | 'some' | 'a lot';

export type ReadConfidence =
  | 'pretty sure'
  | 'fairly sure'
  | 'not totally sure in this light';

// ---------------------------------------------------------------------------
// A located spot — a region + its strength (0..1). `place` is the plain label
// the chip/VoiceOver use; `region` is the geometry key.
// ---------------------------------------------------------------------------

export interface SkinReadSpot {
  region: FaceRegionKey;
  /** Plain label (defaults to REGION_CHIP[region]; the model may refine). */
  place: string;
  /** 0..1 — drives glow opacity (alpha-capped) + which side blooms brighter. */
  strength: number;
}

// ---------------------------------------------------------------------------
// A finding — plain words only.
// ---------------------------------------------------------------------------

export interface SkinReadFinding {
  id: string;
  /** Plain name, e.g. "A little redness". */
  name: string;
  metric: MetricKind;
  /** "What I see" — the model's plain observation (>= ~5 words, validated). */
  whatISee: string;
  level: ReadLevel;
  /** Located spots, sorted strongest-first by the normalizer. */
  spots: SkinReadSpot[];
  /** Plain "what it means". */
  whatItMeans: string;
  /** One easy thing for tonight, no product knowledge needed. */
  doThis: string;
  howSure: ReadConfidence;
  /** Derived: howSure === 'not totally sure in this light'. The screen halves
   *  glow alpha + reads tentative when true. */
  lowConfidence: boolean;
  /** Derived: the region key of the strongest spot (blooms brighter + sooner),
   *  or null when there are no located spots (e.g. a positive note). */
  strongestRegion: FaceRegionKey | null;
}

// ---------------------------------------------------------------------------
// The photo self-check — drives the honest "bad photo" path.
// ---------------------------------------------------------------------------

export interface SkinReadPhotoCheck {
  light: 'good' | 'low' | 'harsh' | 'uneven';
  clear: boolean;
  wholeFaceShown: boolean;
  makeupOn: boolean;
  /** The single field the screen branches the honest path on. */
  betterPhotoWouldHelp: boolean;
}

// ---------------------------------------------------------------------------
// A routine-focus move — the "Your Skin" (screen 2) plan unit. The model groups
// the findings into 2–3 GENTLE moves so the plan arrives ALREADY SET (the user
// follows a finished plan, they don't assemble one). Each move is doable with
// what the person already owns — NO product is named here. `addresses` are the
// finding NAMES the model says the move solves; the screen-2 plan normalizer
// resolves those onto `addressesIds` (the matching `SkinReadFinding.id`s) so the
// consolidation animation + the finding↔move grouping can be exact.
// ---------------------------------------------------------------------------

export interface RoutineFocusMove {
  id: string;
  /** Plain, supportive title, e.g. "Be gentle for a few days". */
  title: string;
  /** One plain line tying the move to what was seen. */
  why: string;
  /** The finding NAMES this move solves (verbatim from the model). */
  addresses: string[];
  /** Derived by `normalizeRoutineFocus`: the `SkinReadFinding.id`s in `findings`
   *  that `addresses` maps to (matched by name). Empty entries are dropped. */
  addressesIds: string[];
}

// ---------------------------------------------------------------------------
// The canonical read.
// ---------------------------------------------------------------------------

export interface SkinRead {
  /** Leads with one true strength, then names the ONE located thing. */
  openingLine: string;
  /** Most-important-first. The screen shows findings[0] ALONE. */
  findings: SkinReadFinding[];
  goodThings: string[];
  photoCheck: SkinReadPhotoCheck;
  sureLevel: ReadConfidence;
  /** Derived: there is at least one genuine concern finding. When false the
   *  screen shows a positive wash + a "keep it up" note instead of a worry. */
  hasRealConcerns: boolean;

  // ── "Your Skin" (screen 2) additions — OPTIONAL so the First-Finding screen,
  //    which only needs openingLine + findings[0], is byte-for-byte unaffected.
  //    These come from the SAME GPT-4V call (see the system-prompt addendum in
  //    api/skinRead.ts) and are validated by `normalizeRoutineFocus`. ──────────

  /** ONE warm, plain, TRUE gestalt sentence summing up the whole picture and
   *  referencing the person's GOAL. Leads positive; never a score, never scary. */
  skinSummaryLine?: string;
  /** ONE bounded, HONEST, calibrated forward-look tied to the plan. Uses
   *  "should/likely", NEVER "will". The screen never lands on a flaw — it
   *  closes on this hopeful horizon. */
  horizonLine?: string;
  /** 2–3 gentle moves grouping the findings into a short, already-set plan. */
  routineFocus?: RoutineFocusMove[];
}

// ---------------------------------------------------------------------------
// The outcome the screen consumes (network-decoupled, like SeenIntoFocus).
// ---------------------------------------------------------------------------

export type SkinReadOutcome =
  /** Analysis still in flight — the screen loops the analyzing sequence. */
  | { status: 'pending' }
  /** A usable read with at least the opening line + findings[0]. */
  | { status: 'ready'; read: SkinRead }
  /** photo_check says a clearer photo would help — honest, calm choice. The
   *  `read` is present only if the user chose "show me anyway" (hedged). */
  | { status: 'bad_photo'; read: SkinRead | null }
  /** The service failed / timed out — never a fake result. */
  | { status: 'service_error'; message: string };

/** The first renderable finding (the screen only ever shows this one here). */
export function primaryFinding(read: SkinRead): SkinReadFinding | null {
  return read.findings.length > 0 ? read.findings[0] : null;
}

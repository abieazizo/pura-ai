/**
 * normalizeSkinRead — the gate between raw GPT-4V JSON and the canonical
 * `SkinRead` the screen consumes. CLAUDE.md law: the screen never reads raw AI
 * output. This module validates + maps, and flags `needsRegen` so the API layer
 * can "reject + regenerate once" per the brief's client rules:
 *
 *   • reject any finding with empty spots,
 *   • a `what_i_see` under ~5 words,
 *   • any banned (jargon) word,
 *   • the "stranger test": findings[0] must be specific + located (not a line
 *     that could fit a random person).
 *
 * It derives NOTHING the model didn't say — it only maps the model's own words
 * onto the typed contract (plain enums passed through verbatim).
 */

import {
  type FaceRegionKey,
  type MetricKind,
  type ReadConfidence,
  type ReadLevel,
  type SkinRead,
  type SkinReadFinding,
  type SkinReadPhotoCheck,
  type SkinReadSpot,
  REGION_CHIP,
} from '@/types/skinRead';
import { placeToRegion } from './faceRegions';

// ---------------------------------------------------------------------------
// Raw shape — intentionally loose; this is the only place we touch it.
// ---------------------------------------------------------------------------

export interface RawSpot {
  place?: string;
  strength?: number;
}
export interface RawFinding {
  name?: string;
  what_i_see?: string;
  level?: string;
  spots?: RawSpot[];
  what_it_means?: string;
  do_this?: string;
  how_sure?: string;
}
export interface RawSkinRead {
  opening_line?: string;
  findings?: RawFinding[];
  good_things?: string[];
  photo_check?: {
    light?: string;
    clear?: boolean;
    whole_face_shown?: boolean;
    makeup_on?: boolean;
    better_photo_would_help?: boolean;
  };
  sure_level?: string;
}

export interface NormalizeResult {
  read: SkinRead | null;
  /** True when the caller should regenerate ONCE (then accept best-effort). */
  needsRegen: boolean;
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Banned jargon — never allowed in the model output OR the UI.
// ---------------------------------------------------------------------------

const BANNED = [
  't-zone', 't zone', 'glabella', 'perioral', 'periorbital', 'barrier',
  'sebum', 'erythema', 'hyperpigmentation', 'texture irregularities',
  'actives', 'exfoliant', 'exfoliants', 'comedone', 'comedones',
  'desquamation', 'keratin', 'melanin deposition',
];

function hasBanned(s: string | undefined): string | null {
  if (!s) return null;
  const l = s.toLowerCase();
  for (const w of BANNED) if (l.includes(w)) return w;
  return null;
}

function wordCount(s: string | undefined): number {
  if (!s) return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Plain-enum coercion (pass through the model's words; clamp to the union).
// ---------------------------------------------------------------------------

function coerceLevel(s: string | undefined): ReadLevel {
  const l = (s ?? '').toLowerCase().trim();
  if (l === 'a lot' || l.includes('lot')) return 'a lot';
  if (l === 'some') return 'some';
  return 'a little';
}

function coerceConfidence(s: string | undefined): ReadConfidence {
  const l = (s ?? '').toLowerCase();
  if (l.includes('not') || l.includes('light')) return 'not totally sure in this light';
  if (l.includes('fairly')) return 'fairly sure';
  return 'pretty sure';
}

function coercePhotoLight(s: string | undefined): SkinReadPhotoCheck['light'] {
  const l = (s ?? '').toLowerCase();
  if (l.includes('low') || l.includes('dark') || l.includes('dim')) return 'low';
  if (l.includes('harsh') || l.includes('bright')) return 'harsh';
  if (l.includes('uneven') || l.includes('mixed')) return 'uneven';
  return 'good';
}

// ---------------------------------------------------------------------------
// Metric family inference from the model's plain words (ONE per finding).
// ---------------------------------------------------------------------------

function inferMetric(f: RawFinding): MetricKind {
  const t = `${f.name ?? ''} ${f.what_i_see ?? ''} ${f.what_it_means ?? ''}`.toLowerCase();
  if (/(red|redness|flush|irritat|pink)/.test(t)) return 'redness';
  if (/(dry|dryness|flak|tight|rough|dehydr)/.test(t)) return 'dryness';
  if (/(dark mark|dark spot|spot|uneven tone|mark|patch)/.test(t)) return 'dark_marks';
  if (/(breakout|pimple|blemish|bump|spot.*chin|acne|whitehead)/.test(t)) return 'breakouts';
  if (/(oil|oily|shine|shiny|greas)/.test(t)) return 'oil';
  if (/(even|smooth|healthy|bright|glow|clear|good|hydrat)/.test(t) && !/(not|isn|less)/.test(t)) {
    return 'positive';
  }
  return 'neutral';
}

// A "positive"-metric finding is a good-thing, not a concern.
function isConcern(metric: MetricKind): boolean {
  return metric !== 'positive';
}

// ---------------------------------------------------------------------------
// Spot mapping.
// ---------------------------------------------------------------------------

function mapSpots(raw: RawSpot[] | undefined): SkinReadSpot[] {
  if (!Array.isArray(raw)) return [];
  const out: SkinReadSpot[] = [];
  for (const r of raw) {
    const region = placeToRegion(r.place ?? '');
    if (!region) continue; // derive nothing — drop unmappable spots
    const strength = clamp01(typeof r.strength === 'number' ? r.strength : 0.5);
    out.push({
      region,
      place: (r.place && r.place.trim()) || REGION_CHIP[region],
      strength,
    });
  }
  // Strongest first → the screen blooms the stronger side brighter + sooner.
  out.sort((a, b) => b.strength - a.strength);
  return out;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// ---------------------------------------------------------------------------
// The normalizer.
// ---------------------------------------------------------------------------

export function normalizeSkinRead(raw: RawSkinRead): NormalizeResult {
  const reasons: string[] = [];
  let needsRegen = false;

  if (!raw || typeof raw !== 'object') {
    return { read: null, needsRegen: true, reasons: ['empty response'] };
  }

  // Banned words anywhere → regenerate.
  const banScan = [
    raw.opening_line,
    ...(raw.findings ?? []).flatMap((f) => [
      f.name, f.what_i_see, f.what_it_means, f.do_this,
    ]),
    ...(raw.good_things ?? []),
  ];
  for (const s of banScan) {
    const hit = hasBanned(s ?? undefined);
    if (hit) {
      needsRegen = true;
      reasons.push(`banned word "${hit}"`);
      break;
    }
  }

  const rawFindings = Array.isArray(raw.findings) ? raw.findings : [];

  const findings: SkinReadFinding[] = rawFindings.map((f, i) => {
    const metric = inferMetric(f);
    const spots = mapSpots(f.spots);
    const howSure = coerceConfidence(f.how_sure);
    return {
      id: `read-finding-${i}`,
      name: (f.name && f.name.trim()) || 'Something to look at',
      metric,
      whatISee: (f.what_i_see && f.what_i_see.trim()) || '',
      level: coerceLevel(f.level),
      spots,
      whatItMeans: (f.what_it_means && f.what_it_means.trim()) || '',
      doThis: (f.do_this && f.do_this.trim()) || '',
      howSure,
      lowConfidence: howSure === 'not totally sure in this light',
      strongestRegion: spots.length > 0 ? spots[0].region : null,
    };
  });

  // ── The "stranger test" + specificity gates on findings[0] (the hero). ──
  const f0 = findings[0];
  const concern0 = f0 && isConcern(f0.metric);
  if (concern0) {
    if (f0.spots.length === 0) {
      needsRegen = true;
      reasons.push('findings[0] has no located spots');
    }
    if (wordCount(f0.whatISee) < 5) {
      needsRegen = true;
      reasons.push('findings[0].what_i_see too short');
    }
    if (!isSpecific(f0.whatISee)) {
      needsRegen = true;
      reasons.push('findings[0] fails the stranger test');
    }
  }

  const photoRaw = raw.photo_check ?? {};
  const photoCheck: SkinReadPhotoCheck = {
    light: coercePhotoLight(photoRaw.light),
    clear: photoRaw.clear !== false,
    wholeFaceShown: photoRaw.whole_face_shown !== false,
    makeupOn: !!photoRaw.makeup_on,
    betterPhotoWouldHelp: !!photoRaw.better_photo_would_help,
  };

  const hasRealConcerns = findings.some((f) => isConcern(f.metric) && f.spots.length > 0);

  const read: SkinRead = {
    openingLine: (raw.opening_line && raw.opening_line.trim()) || '',
    findings,
    goodThings: (raw.good_things ?? []).filter((g) => typeof g === 'string'),
    photoCheck,
    sureLevel: coerceConfidence(raw.sure_level),
    hasRealConcerns,
  };

  // A totally empty hero (no opening line AND no findings) is unusable.
  if (!read.openingLine && read.findings.length === 0) {
    return { read: null, needsRegen: true, reasons: [...reasons, 'no opening line or findings'] };
  }

  return { read, needsRegen, reasons };
}

/**
 * The "stranger test" heuristic: a specific, located observation names a place
 * or a side, or describes something concrete. A line that could fit anyone
 * ("your skin looks fine", "there is some unevenness") fails. Cheap proxy:
 * mentions a place noun OR a side OR a comparative ("more on", "a bit").
 */
function isSpecific(whatISee: string): boolean {
  const t = whatISee.toLowerCase();
  const placey = /(forehead|cheek|nose|chin|jaw|eye|brow|mouth|lip)/.test(t);
  const sided = /(left|right|one side|more on|brighter|stronger)/.test(t);
  return placey || sided;
}

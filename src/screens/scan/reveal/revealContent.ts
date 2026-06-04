/**
 * revealContent — pure, presentation-facing derivations for the post-scan
 * reveal arc (screens 2–6). Every function here reads the canonical
 * `SkinState` and shapes it for the UI. No store reads, no side effects, no
 * fake precision: copy is qualitative (no invented numbers) and every concern
 * shown is one the SkinState actually carries.
 */

import type { ConcernType } from '@/ai/ai-contracts';
import type { SkinConcernSummary, SkinState } from '@/types/canonical';
import type { PillarKey } from '@/types/routine';
import { puraReveal } from '@/theme/tokens';

// ---------------------------------------------------------------------------
// Concern → display mapping. The reference reveal uses five concern tags
// (Texture / Oil / Redness / Dark Circles / Spots), each with a zone color.
// We map the canonical ConcernType axes onto that visual language so the
// chips and face overlays stay on-brand regardless of which concerns a real
// scan surfaces.
// ---------------------------------------------------------------------------

export interface ConcernDisplay {
  label: string;
  /** Chip text + zone stroke. */
  color: string;
  /** Chip fill. */
  soft: string;
  /** Translucent face-overlay fill. */
  wash: string;
}

export const CONCERN_DISPLAY: Record<ConcernType, ConcernDisplay> = {
  texture: {
    label: 'Texture',
    color: puraReveal.texture,
    soft: puraReveal.textureSoft,
    wash: puraReveal.textureWash,
  },
  oiliness: {
    label: 'Oil',
    color: puraReveal.oil,
    soft: puraReveal.oilSoft,
    wash: puraReveal.oilWash,
  },
  redness: {
    label: 'Redness',
    color: puraReveal.redness,
    soft: puraReveal.rednessSoft,
    wash: puraReveal.rednessWash,
  },
  dark_marks: {
    label: 'Dark Circles',
    color: puraReveal.darkCircles,
    soft: puraReveal.darkCirclesSoft,
    wash: puraReveal.darkCirclesWash,
  },
  breakouts: {
    label: 'Spots',
    color: puraReveal.spots,
    soft: puraReveal.spotsSoft,
    wash: puraReveal.spotsWash,
  },
  hydration: {
    label: 'Hydration',
    color: puraReveal.texture,
    soft: puraReveal.textureSoft,
    wash: puraReveal.textureWash,
  },
  sensitivity: {
    label: 'Sensitivity',
    color: puraReveal.redness,
    soft: puraReveal.rednessSoft,
    wash: puraReveal.rednessWash,
  },
  pores: {
    label: 'Pores',
    color: puraReveal.oil,
    soft: puraReveal.oilSoft,
    wash: puraReveal.oilWash,
  },
};

export function concernDisplay(concern: ConcernType): ConcernDisplay {
  return CONCERN_DISPLAY[concern] ?? CONCERN_DISPLAY.texture;
}

// ---------------------------------------------------------------------------
// Concern tag chips (Skin Map). Up to five, ranked.
// ---------------------------------------------------------------------------

export interface ConcernChip {
  key: string;
  label: string;
  color: string;
  soft: string;
}

/**
 * Stable visual order for the concern chips — independent of priority rank
 * (which drives Focus Areas). Detected concerns render in this order; absent
 * ones are skipped.
 */
const CHIP_ORDER: ConcernType[] = [
  'texture',
  'oiliness',
  'redness',
  'dark_marks',
  'breakouts',
  'hydration',
  'sensitivity',
  'pores',
];

export function concernChips(skin: SkinState, max = 5): ConcernChip[] {
  const present = new Set(skin.topConcerns.map((c) => c.concern));
  return CHIP_ORDER.filter((c) => present.has(c))
    .slice(0, max)
    .map((concern) => {
      const d = concernDisplay(concern);
      return { key: concern, label: d.label, color: d.color, soft: d.soft };
    });
}

// ---------------------------------------------------------------------------
// Priority (Top Focus Areas). Rank is the canonical "what to tackle first"
// ordering, so it maps cleanly to a priority pill.
// ---------------------------------------------------------------------------

export type Priority = 'High' | 'Medium' | 'Low';

export interface PriorityTone {
  color: string;
  bg: string;
}

export function priorityForConcern(c: SkinConcernSummary): Priority {
  if (c.rank === 1) return 'High';
  if (c.rank === 2) return 'Medium';
  return 'Low';
}

export function priorityTone(priority: Priority): PriorityTone {
  switch (priority) {
    case 'High':
      return { color: puraReveal.priorityHigh, bg: puraReveal.priorityHighBg };
    case 'Medium':
      return { color: puraReveal.priorityMedium, bg: puraReveal.priorityMediumBg };
    case 'Low':
      return { color: puraReveal.priorityLow, bg: puraReveal.priorityLowBg };
  }
}

export interface FocusArea {
  key: string;
  concern: ConcernType;
  name: string;
  priority: Priority;
  /** One editorial line (Instrument Serif) — taken from the concern summary. */
  phrase: string;
  /** Region label, e.g. "forehead", for the close-up crop. */
  region: string;
}

export function deriveFocusAreas(skin: SkinState, max = 3): FocusArea[] {
  return skin.topConcerns.slice(0, max).map((c) => {
    const d = concernDisplay(c.concern);
    return {
      key: c.concern,
      concern: c.concern,
      name: d.label,
      priority: priorityForConcern(c),
      phrase: c.summary,
      region: c.regions[0] ?? 'overall',
    };
  });
}

// ---------------------------------------------------------------------------
// Personalized Insights. Three editorial cards. The copy is qualitative and
// grounded in which concern axes the scan surfaced — it never fabricates a
// measurement. Each card's prominence (and the small "focus" tail line) keys
// off whether its concern is actually present in topConcerns.
// ---------------------------------------------------------------------------

export type InsightIcon = 'barrier' | 'oil' | 'clarity';

export interface InsightCard {
  key: InsightIcon;
  icon: InsightIcon;
  iconColor: string;
  title: string;
  body: string;
}

function hasConcern(skin: SkinState, ...concerns: ConcernType[]): boolean {
  return skin.topConcerns.some((c) => concerns.includes(c.concern));
}

export function deriveInsights(skin: SkinState): InsightCard[] {
  const oily = hasConcern(skin, 'oiliness', 'pores');
  const sensitive = hasConcern(skin, 'sensitivity', 'redness');
  const clarity = hasConcern(skin, 'texture', 'dark_marks', 'breakouts');

  return [
    {
      key: 'barrier',
      icon: 'barrier',
      iconColor: puraReveal.insightBarrier,
      title: 'Barrier Support',
      body: sensitive
        ? 'Your skin reads a little reactive right now. Steady hydration and a calm, low-ingredient routine give the barrier room to settle instead of flaring.'
        : 'Your barrier is mostly holding. A consistent dose of hydration keeps the occasional tight, flaky moment from tipping into sensitivity.',
    },
    {
      key: 'oil',
      icon: 'oil',
      iconColor: puraReveal.insightOil,
      title: 'Oil Balance',
      body: oily
        ? 'Oil builds across the forehead and cheeks through the day. The aim is not to strip it — it is to slow it down so the skin stops overcompensating.'
        : 'Oil sits in a comfortable range. Keep it there with light, non-stripping cleansing so your skin never has to rebound.',
    },
    {
      key: 'clarity',
      icon: 'clarity',
      iconColor: puraReveal.insightClarity,
      title: 'Clarity Boost',
      body: clarity
        ? 'Texture and a few lingering marks are the last things between you and an even surface. Gentle, regular resurfacing does this better than anything aggressive.'
        : 'Your surface is already even. A light, occasional resurfacing step keeps it that way without overworking the skin.',
    },
  ];
}

// ---------------------------------------------------------------------------
// Skin Plan pillars (screen 5). Four fixed pillars; the Treat line keys off
// the user's primary concern so the plan reads as theirs.
// ---------------------------------------------------------------------------

export interface Pillar {
  key: PillarKey;
  name: string;
  desc: string;
}

export function derivePillars(skin: SkinState): Pillar[] {
  const primary = skin.topConcerns[0];
  const primaryLabel = primary ? concernDisplay(primary.concern).label.toLowerCase() : 'your concerns';
  return [
    {
      key: 'cleanse',
      name: 'Cleanse',
      desc: 'Lift the day off without stripping your barrier.',
    },
    {
      key: 'treat',
      name: 'Treat',
      desc: `Target ${primaryLabel} while your skin is most receptive.`,
    },
    {
      key: 'moisturize',
      name: 'Moisturize',
      desc: 'Lock in water so oil has less to compensate for.',
    },
    {
      key: 'protect',
      name: 'Protect',
      desc: 'Daylight is where most visible damage happens — shield it each morning.',
    },
  ];
}

// ---------------------------------------------------------------------------
// Face-zone layout for the Skin Map overlay. Normalised 0..1 within the
// portrait frame; ellipse center + radii. Free-form zone strings from
// SkinZoneFinding are matched against these keys with sensible fallbacks.
// ---------------------------------------------------------------------------

export interface ZoneBlob {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

const ZONE_LAYOUT: Record<string, ZoneBlob> = {
  forehead: { cx: 0.5, cy: 0.2, rx: 0.26, ry: 0.1 },
  left_cheek: { cx: 0.29, cy: 0.55, rx: 0.15, ry: 0.13 },
  right_cheek: { cx: 0.71, cy: 0.55, rx: 0.15, ry: 0.13 },
  cheeks: { cx: 0.5, cy: 0.55, rx: 0.34, ry: 0.13 },
  nose: { cx: 0.5, cy: 0.5, rx: 0.09, ry: 0.16 },
  chin: { cx: 0.5, cy: 0.82, rx: 0.16, ry: 0.1 },
  under_eyes: { cx: 0.5, cy: 0.42, rx: 0.3, ry: 0.05 },
  left_undereye: { cx: 0.33, cy: 0.42, rx: 0.12, ry: 0.045 },
  right_undereye: { cx: 0.67, cy: 0.42, rx: 0.12, ry: 0.045 },
  jaw: { cx: 0.5, cy: 0.75, rx: 0.3, ry: 0.08 },
  t_zone: { cx: 0.5, cy: 0.35, rx: 0.12, ry: 0.3 },
};

const FALLBACK_BLOB: ZoneBlob = { cx: 0.5, cy: 0.5, rx: 0.18, ry: 0.14 };

export function zoneBlob(zone: string): ZoneBlob {
  const key = zone.toLowerCase().replace(/\s+/g, '_');
  return ZONE_LAYOUT[key] ?? FALLBACK_BLOB;
}

export interface MapOverlay {
  key: string;
  blob: ZoneBlob;
  wash: string;
  color: string;
}

export function deriveMapOverlays(skin: SkinState): MapOverlay[] {
  return skin.zoneFindings.map((f, i) => {
    const d = concernDisplay(f.concern);
    return {
      key: `${f.zone}-${f.concern}-${i}`,
      blob: zoneBlob(f.zone),
      wash: d.wash,
      color: d.color,
    };
  });
}

/** Contentposition for an expo-image crop that frames a given region. */
export function regionFocus(region: string): { top?: string | number; left?: string | number } {
  const key = region.toLowerCase().replace(/\s+/g, '_');
  switch (key) {
    case 'forehead':
      return { top: '12%', left: '50%' };
    case 'nose':
      return { top: '50%', left: '50%' };
    case 'chin':
      return { top: '82%', left: '50%' };
    case 'left_cheek':
      return { top: '55%', left: '28%' };
    case 'right_cheek':
      return { top: '55%', left: '72%' };
    case 'under_eyes':
    case 'left_undereye':
    case 'right_undereye':
      return { top: '40%', left: '50%' };
    default:
      return { top: '50%', left: '50%' };
  }
}

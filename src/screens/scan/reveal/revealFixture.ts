/**
 * Fixture SkinState for previewing the reveal arc in isolation (dev gallery
 * + screenshots). Mirrors the reference defaults: Texture (High) / Dark
 * Circles (Medium) / Redness (Low) as the top focus areas, with Oil and Spots
 * also detected so the Skin Map shows all five concern tags and the reference
 * zone overlays (forehead+cheeks sage, under-eyes lavender, nose pink-coral,
 * chin peach). Dev-only; never imported by production flows.
 */

import type { SkinState } from '@/types/canonical';

export const REVEAL_FIXTURE: SkinState = {
  scanId: 'fixture-reveal',
  createdAt: new Date().toISOString(),
  imageQuality: { usable: true, confidence: 0.86, issues: [] },

  score: 72,
  scoreBand: 'good',
  scoreDelta: 3,

  summaryHeadline: 'Your skin is in good shape',
  summaryBody:
    'Your skin is healthy overall, with a few areas worth a little attention. Uneven texture on the forehead and some under-eye fatigue are the main things to watch — nothing here needs anything aggressive.',

  topConcerns: [
    {
      concern: 'texture',
      severity: 'moderate',
      rank: 1,
      confidence: 0.82,
      regions: ['forehead'],
      summary: 'Uneven texture on forehead',
      direction: 'same',
    },
    {
      concern: 'dark_marks',
      severity: 'mild',
      rank: 2,
      confidence: 0.74,
      regions: ['under_eyes'],
      summary: 'Visible fatigue under eyes',
      direction: 'same',
    },
    {
      concern: 'redness',
      severity: 'low',
      rank: 3,
      confidence: 0.68,
      regions: ['nose'],
      summary: 'Mild redness around nose',
      direction: 'better',
    },
    {
      concern: 'oiliness',
      severity: 'moderate',
      rank: 0,
      confidence: 0.71,
      regions: ['t_zone'],
      summary: 'Oil builds through the T-zone by midday',
      direction: 'same',
    },
    {
      concern: 'breakouts',
      severity: 'low',
      rank: 0,
      confidence: 0.6,
      regions: ['chin'],
      summary: 'Occasional spots along the chin',
      direction: 'better',
    },
  ],

  severityByConcern: {
    texture: 'moderate',
    dark_marks: 'mild',
    redness: 'low',
    oiliness: 'moderate',
    breakouts: 'low',
  },

  zoneFindings: [
    { zone: 'forehead', concern: 'oiliness', severity: 'moderate', confidence: 0.71 },
    { zone: 'left_cheek', concern: 'oiliness', severity: 'mild', confidence: 0.64 },
    { zone: 'right_cheek', concern: 'oiliness', severity: 'mild', confidence: 0.64 },
    { zone: 'under_eyes', concern: 'dark_marks', severity: 'mild', confidence: 0.74 },
    { zone: 'nose', concern: 'redness', severity: 'low', confidence: 0.68 },
    { zone: 'chin', concern: 'breakouts', severity: 'low', confidence: 0.6 },
  ],

  confidenceByConcern: {
    texture: 0.82,
    dark_marks: 0.74,
    redness: 0.68,
    oiliness: 0.71,
    breakouts: 0.6,
  },

  trendSummary: { direction: 'improving', deltaSinceFirst: 3 },

  nextStepCategory: 'serum',
  routineHints: ['Keep evenings simple', 'Hydrate before you treat'],
  riskFlags: [],

  overallConfidence: 'high',
  source: 'ai',
};

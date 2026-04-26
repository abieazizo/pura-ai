/**
 * Concern derivation + copy library.
 *
 * A scan's raw output is zone-based (forehead / tZone / chin / cheeks), but
 * the user-facing surfaces are concern-based (breakouts / hydration /
 * texture / tone). This module maps one to the other and carries the copy
 * templates for every concern × severity combination we surface.
 *
 * All copy is written as a *guide* talking to the user, not a diagnostic
 * readout. No internal jargon, no medicalisms.
 */

import type {
  Concern,
  ConcernCategory,
  ConcernHotspot,
  ConcernTrend,
  Scan,
  Severity,
  SkinZone,
  SkinZoneKey,
} from '@/types';

// ---------- Region labels (plain English, no "T-zone") ----------

const ZONE_REGION: Record<SkinZoneKey, string> = {
  forehead: 'forehead',
  tZone: 'nose and center forehead',
  chin: 'chin',
  cheeks: 'cheeks',
  nose: 'nose',
  jawline: 'jawline',
};

// ---------- Hotspot canonical positions (normalized within photo box) ----------
// These feed the overlay markers on the results screen. Coordinates echo
// the scan-analyzing layout, so the "same face" feels mapped consistently
// across the two screens.

const HOTSPOT_BY_ZONE: Record<SkinZoneKey, ConcernHotspot[]> = {
  forehead: [{ x: 0.50, y: 0.32 }],
  tZone: [{ x: 0.50, y: 0.48 }],
  chin: [{ x: 0.50, y: 0.82 }],
  cheeks: [
    { x: 0.28, y: 0.58 },
    { x: 0.72, y: 0.58 },
  ],
  nose: [{ x: 0.50, y: 0.54 }],
  jawline: [{ x: 0.50, y: 0.86 }],
};

// ---------- Severity mapping from raw score ----------

function severityFromScore(score: number): Severity {
  if (score >= 82) return 'calm';
  if (score >= 65) return 'mild';
  if (score >= 45) return 'moderate';
  return 'needs-attention';
}

export function severityLabel(s: Severity): string {
  switch (s) {
    case 'calm':
      return 'calm';
    case 'mild':
      return 'mild';
    case 'moderate':
      return 'moderate';
    case 'needs-attention':
      return 'needs attention';
  }
}

export function severityDotCount(s: Severity): number {
  switch (s) {
    case 'calm':
      return 1;
    case 'mild':
      return 1;
    case 'moderate':
      return 2;
    case 'needs-attention':
      return 3;
  }
}

/**
 * Priority rank for ordering concerns 1→4 on the results screen.
 * Lower number = tackle first. Severity dominates; ties broken by category
 * priority (breakouts > hydration > texture > tone).
 */
function severityRank(s: Severity): number {
  switch (s) {
    case 'needs-attention':
      return 0;
    case 'moderate':
      return 1;
    case 'mild':
      return 2;
    case 'calm':
      return 3;
  }
}

const CATEGORY_PRIORITY: Record<ConcernCategory, number> = {
  breakouts: 0,
  hydration: 1,
  texture: 2,
  tone: 3,
};

// ---------- Copy library ----------
// One hand-crafted micro-script per (category × severity). Region is
// filled in at derivation time. These are the templates the mock analyze
// function reads from; a real AI pipeline would replace this with an LLM
// but the SHAPE of the copy (finding / interpretation / next step) stays.

type CopyTemplate = {
  finding: (region: string) => string;
  interpretation: string;
  nextStep: string;
};

const COPY: Record<ConcernCategory, Record<Severity, CopyTemplate>> = {
  breakouts: {
    calm: {
      finding: (r) => `No new breakouts across the ${r}.`,
      interpretation: 'Your skin is settled today.',
      nextStep: 'Keep your routine simple — no changes needed tonight.',
    },
    mild: {
      finding: (r) => `One or two small clogged bumps on the ${r}.`,
      interpretation: 'Early signs of congestion, not inflamed.',
      nextStep: 'A gentle exfoliant tonight can help clear them before they develop.',
    },
    moderate: {
      finding: (r) => `A visible inflamed breakout on the ${r}, with one or two smaller bumps nearby.`,
      interpretation: 'This is your clearest issue today.',
      nextStep: 'Skip actives tonight. Apply your calming gel directly to the spot.',
    },
    'needs-attention': {
      finding: (r) => `Multiple active breakouts across the ${r}, some deeper than others.`,
      interpretation: 'Your skin is reactive right now and needs to calm before anything new.',
      nextStep: 'Pause exfoliants and retinoids for 48 hours. Focus on barrier-repair only.',
    },
  },
  hydration: {
    calm: {
      finding: (r) => `Hydration across the ${r} reads balanced.`,
      interpretation: 'Your barrier is doing its job.',
      nextStep: 'Continue with your current moisturizer tonight.',
    },
    mild: {
      finding: (r) => `The ${r} is reading slightly low on moisture.`,
      interpretation: 'A minor dip, nothing your routine can\u2019t handle.',
      nextStep: 'Add one layer of hydrating serum under your night cream.',
    },
    moderate: {
      finding: (r) => `The ${r} is visibly dehydrated, with subtle flaking starting.`,
      interpretation: 'Dehydration will amplify every other issue if left alone.',
      nextStep: 'Layer a humectant serum before moisturizer tonight and tomorrow morning.',
    },
    'needs-attention': {
      finding: (r) => `The ${r} reads significantly dehydrated with visible tightness.`,
      interpretation: 'Your barrier is struggling — other concerns will be harder to treat until this improves.',
      nextStep: 'Barrier-repair only tonight: hydrating serum, rich moisturizer, skip everything else.',
    },
  },
  texture: {
    calm: {
      finding: (r) => `Texture across the ${r} is smooth.`,
      interpretation: 'No work to do here today.',
      nextStep: 'Your routine is keeping texture in check — stay the course.',
    },
    mild: {
      finding: (r) => `The ${r} shows mild unevenness — slightly rougher than neighboring areas.`,
      interpretation: 'Cell turnover is a little behind; common and reversible.',
      nextStep: 'A low-strength exfoliant 2-3 nights a week should smooth this over.',
    },
    moderate: {
      finding: (r) => `Noticeable bumpy texture and pores that are more visible across the ${r}.`,
      interpretation: 'Congestion is building up; address it before it turns into breakouts.',
      nextStep: 'Clay or PHA mask once this week, plus your usual exfoliant.',
    },
    'needs-attention': {
      finding: (r) => `Rough, uneven texture across the ${r} with pores reading enlarged.`,
      interpretation: 'This often signals barrier stress on top of congestion.',
      nextStep: 'Repair barrier first (1 week), then reintroduce exfoliation gradually.',
    },
  },
  tone: {
    calm: {
      finding: (r) => `Tone across the ${r} is even.`,
      interpretation: 'No dark marks standing out in this scan.',
      nextStep: 'Keep wearing SPF daily — tone is easier to maintain than repair.',
    },
    mild: {
      finding: (r) => `A few faint marks still visible on the ${r}.`,
      interpretation: 'Dark marks are fading, but slowly.',
      nextStep: 'Consistency matters more than strength: daily SPF + vitamin C morning.',
    },
    moderate: {
      finding: (r) => `Dark marks are still visible on the ${r}, mostly from older breakouts.`,
      interpretation: 'These take weeks to fade; patience is the treatment.',
      nextStep: 'Add a targeted brightening serum tonight. SPF in the morning is non-negotiable.',
    },
    'needs-attention': {
      finding: (r) => `Several dark marks across the ${r}, with uneven patchiness.`,
      interpretation: 'Combination of post-breakout marks and sun exposure.',
      nextStep: 'Professional review is worth considering. Meanwhile: daily SPF is the priority.',
    },
  },
};

// ---------- Zone → concern mapping ----------
// Each zone contributes to one or more concern categories. This is the mock
// mapping — a real analysis engine would produce concerns directly from
// vision output. The mapping ensures every concern has a realistic region.

function breakoutsCategoryFromZones(zones: SkinZone[]): {
  severity: Severity;
  region: string;
  hotspots: ConcernHotspot[];
} {
  // Breakouts source primarily from chin + forehead activity.
  const chin = zones.find((z) => z.key === 'chin');
  const forehead = zones.find((z) => z.key === 'forehead');
  const worst = pickWorst([chin, forehead]);
  const src = worst ?? chin ?? forehead;
  return {
    severity: severityFromScore(src?.score ?? 70),
    region: src ? ZONE_REGION[src.key] : 'face',
    hotspots: src ? HOTSPOT_BY_ZONE[src.key] : [{ x: 0.5, y: 0.8 }],
  };
}

function hydrationCategoryFromZones(zones: SkinZone[]): {
  severity: Severity;
  region: string;
  hotspots: ConcernHotspot[];
} {
  // Hydration reads from cheeks.
  const cheeks = zones.find((z) => z.key === 'cheeks');
  return {
    severity: severityFromScore(cheeks?.score ?? 70),
    region: 'cheeks',
    hotspots: HOTSPOT_BY_ZONE.cheeks,
  };
}

function textureCategoryFromZones(zones: SkinZone[]): {
  severity: Severity;
  region: string;
  hotspots: ConcernHotspot[];
} {
  // Texture reads from forehead + tZone.
  const forehead = zones.find((z) => z.key === 'forehead');
  const tZone = zones.find((z) => z.key === 'tZone');
  const worst = pickWorst([forehead, tZone]);
  const src = worst ?? forehead ?? tZone;
  return {
    severity: severityFromScore(src?.score ?? 70),
    region: src?.key === 'tZone' ? 'nose and center forehead' : 'forehead',
    hotspots: src ? HOTSPOT_BY_ZONE[src.key] : HOTSPOT_BY_ZONE.forehead,
  };
}

function toneCategoryFromZones(zones: SkinZone[]): {
  severity: Severity;
  region: string;
  hotspots: ConcernHotspot[];
} {
  // Tone is synthesized — take the average of cheeks + chin; in a real pipeline
  // this would come from segmentation of dark marks.
  const cheeks = zones.find((z) => z.key === 'cheeks');
  const chin = zones.find((z) => z.key === 'chin');
  const avg =
    cheeks && chin
      ? (cheeks.score + chin.score) / 2
      : cheeks?.score ?? chin?.score ?? 75;
  return {
    severity: severityFromScore(avg + 6), // tone tends to read calmer than breakouts
    region: cheeks && cheeks.score < 70 ? 'cheeks' : 'across the face',
    hotspots: cheeks?.glow
      ? [{ x: 0.28, y: 0.58 }]
      : [{ x: 0.72, y: 0.60 }],
  };
}

function pickWorst(zones: Array<SkinZone | undefined>): SkinZone | undefined {
  const defined = zones.filter((z): z is SkinZone => !!z);
  if (defined.length === 0) return undefined;
  return defined.reduce((min, z) => (z.score < min.score ? z : min));
}

// ---------- Trend vs. previous ----------

function trendFor(severity: Severity, prev?: Severity): ConcernTrend {
  if (!prev) return 'new';
  const curr = severityRank(severity);
  const past = severityRank(prev);
  if (curr < past) return 'worsened'; // rank 0 = needs-attention (worst)
  if (curr > past) return 'improved';
  return 'unchanged';
}

export function trendLabel(t: ConcernTrend): string {
  switch (t) {
    case 'new':
      return 'first scan';
    case 'improved':
      return 'improved';
    case 'unchanged':
      return 'unchanged since last scan';
    case 'worsened':
      return 'worth watching';
  }
}

// ---------- Main derivation ----------

export function deriveConcerns(scan: Scan, previous?: Scan): Concern[] {
  const bk = breakoutsCategoryFromZones(scan.zones);
  const hy = hydrationCategoryFromZones(scan.zones);
  const tx = textureCategoryFromZones(scan.zones);
  const tn = toneCategoryFromZones(scan.zones);

  const raw: Array<Omit<Concern, 'rank' | 'trend'> & { prevSeverity?: Severity }> = [
    {
      category: 'breakouts',
      severity: bk.severity,
      region: bk.region,
      hotspots: bk.hotspots,
      finding: COPY.breakouts[bk.severity].finding(bk.region),
      interpretation: COPY.breakouts[bk.severity].interpretation,
      nextStep: COPY.breakouts[bk.severity].nextStep,
      prevSeverity: previous
        ? concernByCategory(previous, 'breakouts')?.severity
        : undefined,
    },
    {
      category: 'hydration',
      severity: hy.severity,
      region: hy.region,
      hotspots: hy.hotspots,
      finding: COPY.hydration[hy.severity].finding(hy.region),
      interpretation: COPY.hydration[hy.severity].interpretation,
      nextStep: COPY.hydration[hy.severity].nextStep,
      prevSeverity: previous
        ? concernByCategory(previous, 'hydration')?.severity
        : undefined,
    },
    {
      category: 'texture',
      severity: tx.severity,
      region: tx.region,
      hotspots: tx.hotspots,
      finding: COPY.texture[tx.severity].finding(tx.region),
      interpretation: COPY.texture[tx.severity].interpretation,
      nextStep: COPY.texture[tx.severity].nextStep,
      prevSeverity: previous
        ? concernByCategory(previous, 'texture')?.severity
        : undefined,
    },
    {
      category: 'tone',
      severity: tn.severity,
      region: tn.region,
      hotspots: tn.hotspots,
      finding: COPY.tone[tn.severity].finding(tn.region),
      interpretation: COPY.tone[tn.severity].interpretation,
      nextStep: COPY.tone[tn.severity].nextStep,
      prevSeverity: previous
        ? concernByCategory(previous, 'tone')?.severity
        : undefined,
    },
  ];

  // Rank by severity desc, then by category priority.
  const sorted = [...raw].sort((a, b) => {
    const s = severityRank(a.severity) - severityRank(b.severity);
    if (s !== 0) return s;
    return CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category];
  });

  return sorted.map((c, i) => ({
    category: c.category,
    severity: c.severity,
    rank: i + 1,
    region: c.region,
    hotspots: c.hotspots,
    finding: c.finding,
    interpretation: c.interpretation,
    nextStep: c.nextStep,
    trend: trendFor(c.severity, c.prevSeverity),
  }));
}

export function concernByCategory(
  scan: Scan,
  category: ConcernCategory
): Concern | undefined {
  return getConcerns(scan).find((c) => c.category === category);
}

/**
 * Lazy accessor — returns `scan.concerns` if present, else derives from zones.
 * Use this everywhere at read-time so older persisted scans without the new
 * field render correctly.
 */
export function getConcerns(scan: Scan, previous?: Scan): Concern[] {
  if (scan.concerns && scan.concerns.length > 0) return scan.concerns;
  return deriveConcerns(scan, previous);
}

// ---------- Category labels (plain English for the UI) ----------

export const CATEGORY_LABEL: Record<ConcernCategory, string> = {
  breakouts: 'Breakouts',
  hydration: 'Hydration',
  texture: 'Texture',
  tone: 'Dark marks',
};

// ---------- Summary builder ----------
// One-sentence headline for the top of the results screen and the home
// intelligence block. Picks the top 1-2 concerns and phrases them as a
// recommendation.
//
// v10.22 — accepts an optional `scan` so the helper can prefer the
// AI's structured `skin_score.explanation` when it's attached. Every
// existing caller that passes only `concerns` keeps working; new
// callers who have the Scan in hand get the AI voice automatically.

export function buildSummaryHeadline(
  concerns: Concern[],
  scan?: Scan
): string {
  // v10.22 — AI-driven headline wins when present.
  if (scan?.aiAnalysis?.skin_score.explanation) {
    return scan.aiAnalysis.skin_score.explanation;
  }
  if (concerns.length === 0) return 'Your reading is ready.';
  const top = concerns[0];
  const second = concerns[1];
  const topLabel = CATEGORY_LABEL[top.category].toLowerCase();
  if (!second || second.severity === 'calm') {
    return `Your main focus today is ${focusPhrase(top)}.`;
  }
  return `Your main focus today is ${focusPhrase(top)} and ${focusPhraseSecondary(second)}.`;
}

function focusPhrase(c: Concern): string {
  switch (c.category) {
    case 'breakouts':
      if (c.severity === 'needs-attention') return `calming your skin and pausing actives`;
      return `a ${severityLabel(c.severity)} breakout on the ${c.region}`;
    case 'hydration':
      if (c.severity === 'needs-attention') return 'restoring your barrier';
      return `restoring hydration on the ${c.region}`;
    case 'texture':
      return `smoothing texture on the ${c.region}`;
    case 'tone':
      return `fading dark marks on the ${c.region}`;
  }
}

function focusPhraseSecondary(c: Concern): string {
  switch (c.category) {
    case 'breakouts':
      return `clearing small bumps on the ${c.region}`;
    case 'hydration':
      return `topping up hydration on the ${c.region}`;
    case 'texture':
      return `evening out texture`;
    case 'tone':
      return `continuing to fade dark marks`;
  }
}

// ---------- Tonight's focus (consolidated action plan) ----------
//
// v10.22 — accepts an optional `scan` and prefers the AI's
// `next_focus.tonight` array when present. The Routine sub-tab's
// TODAY focus card and the result screen's TonightSheet both call
// this helper, so they upgrade transparently.

export function buildTonightFocus(
  concerns: Concern[],
  scan?: Scan
): string[] {
  if (scan?.aiAnalysis && scan.aiAnalysis.next_focus.tonight.length > 0) {
    // De-dupe in case the model repeats a step word-for-word.
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of scan.aiAnalysis.next_focus.tonight) {
      const key = t.slice(0, 24).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
    return out;
  }
  // Return the top 2-3 concerns' next steps, de-duplicated and concise.
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const c of concerns.slice(0, 3)) {
    const key = c.nextStep.slice(0, 24).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(c.nextStep);
  }
  if (unique.length === 0) {
    unique.push('Keep your routine as-is. Your skin looks settled today.');
  }
  return unique;
}
